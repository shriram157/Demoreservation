/* eslint new-cap: 0, no-console: 0, no-use-before-define: ["error", { "functions": false } ] */
/* eslint-env es6, node */

"use strict";

const bodyParser = require("body-parser");
const ClientOauth2 = require("client-oauth2");
// See https://www.npmjs.com/package/dicer
const dicer = require("dicer");
const express = require("express");
const jsonPathPlus = require("jsonpath-plus");
const odataParser = require("odata-parser");
const request = require("request");
const stream = require("stream");
const urlLib = require("url");
const utils = require("../../utils");

const DEFAULT_ENCODING = "utf-8";
const LOGGER_NAME = "/Application/Route/APIProxy";
const PROXIED_REQ_HEADER_EXCLUDES = [
  "authorization",
  "b3",
  "cookie",
  "host",
  "referer",
  "user-agent",
  "x-b3-.+",
  "x-cf-.+",
  "x-correlationid",
  "x-forwarded-.+",
  "x-ibm-client-*",
  "x-request-.+",
  "x-scp-.+",
  "x-vcap-.+"
];
const REGEX_PARAM = /([A-Za-z_][0-9A-Za-z_]*)=([^',]+|'(([^']|'')+)')(,?)/g;

let router = null;
let apiProxySecJson = null;
let roleMappingsJson = null;
let apimService = null;
let connectivityService = null;
let cachedTokenResp = null;

function getRouter(aApiProxySecJson, aRoleMappingsJson) {
  if (!router) {
    router = express.Router();
    apiProxySecJson = aApiProxySecJson;
    roleMappingsJson = aRoleMappingsJson;
    apimService = utils.getService({
      // Get UPS name from env var UPS_NAME
      name: process.env.UPS_NAME
    });
    if (apimService.host.endsWith("/")) {
      apimService.host.slice(0, -1);
    }

    connectivityService = utils.getService({
      tag: "connectivity"
    });

    // TODO measure memory usage for body parsing and see if there is room for further tuning
    router.all(
      "/*",
      bodyParser.raw({
        type: "*/*"
      }),
      handleRequest
    );
  }
  return router;
}

function handleRequest(req, res, next) {
  let logger = req.loggingContext.getLogger(LOGGER_NAME);
  let tracer = req.loggingContext.getTracer(__filename);
  if (req.path.endsWith("$batch")) {
    handleBatchRequest(logger, tracer, req, res, next);
  } else {
    handleNonBatchRequest(logger, tracer, req, res, next);
  }
}

function handleBatchRequest(logger, tracer, req, res, next) {
  if (req.method !== "POST") {
    res.status(400).send("Invalid HTTP method.");
    return;
  }
  let nextSlashIndex = req.path.indexOf("/", 1);
  if (nextSlashIndex === -1) {
    res.status(400).send("Invalid URL.");
    return;
  }
  let servicePathPrefix = req.path.substring(0, nextSlashIndex);
  let batchBoundary = utils.parseBoundary(req.get("content-type"));
  let batchDicer = new dicer({ boundary: batchBoundary });
  let batchPartPromises = [];
  let batchPartCount = 0;
  batchDicer.on("part", batchPartStream => {
    let batchPartPromise = new Promise((batchPartResolve, batchPartReject) => {
      let batchPartIndex = ++batchPartCount;
      batchPartStream.on("header", batchPartHeaders => {
        if (utils.headersValidForOp(batchPartHeaders)) {
          batchPartStream.on("data", batchPartData => {
            let reqOpStr = batchPartData.toString(
              DEFAULT_ENCODING,
              0,
              batchPartData.indexOf("\r\n")
            );
            let reqOp = utils.parseReqOp(reqOpStr);
            if (!reqOp) {
              batchPartReject({
                httpCode: 400,
                message:
                  "Could not parse HTTP request operation info in batch part " +
                  batchPartIndex +
                  "."
              });
              return;
            }
            let body = null;
            if (batchPartData.indexOf("\r\n\r\n") !== -1) {
              body = batchPartData.toString(
                DEFAULT_ENCODING,
                batchPartData.indexOf("\r\n\r\n") + 4
              );
            } else {
              batchPartReject({
                httpCode: 400,
                message:
                  "Could not parse body in batch part " + batchPartIndex + "."
              });
              return;
            }

            validateRequest(
              logger,
              tracer,
              req.authInfo,
              reqOp.method,
              servicePathPrefix + "/" + reqOp.path,
              body
            )
              .then(() => {
                batchPartResolve();
              })
              .catch(error => {
                batchPartReject({
                  httpCode: 400,
                  message:
                    "Request for batch part " +
                    batchPartIndex +
                    " failed validation with the following error: " +
                    error
                });
              });
          });
        } else if (utils.headersValidForChangeSet(batchPartHeaders)) {
          batchPartStream.on("data", batchPartData => {
            let changeSetBoundary = utils.parseBoundary(
              batchPartHeaders["content-type"]
            );
            validateChangeSet(
              logger,
              tracer,
              req.authInfo,
              batchPartIndex,
              servicePathPrefix,
              batchPartData,
              changeSetBoundary
            )
              .then(() => {
                batchPartResolve();
              })
              .catch(error => {
                batchPartReject(error);
              });
          });
        } else {
          // Data event handling is required, otherwise Dicer will hang and throw UnhandledPromiseRejectionWarning
          batchPartStream.on("data", () => {
            batchPartReject({
              httpCode: 400,
              message: "Invalid headers in batch part " + batchPartIndex + "."
            });
          });
        }
      });
      batchPartStream.on("error", error => {
        batchPartReject({
          httpCode: 400,
          message:
            "Error parsing batch part" + batchPartIndex + ": " + error.message
        });
      });
    });
    batchPartPromises.push(batchPartPromise);
  });
  batchDicer.on("finish", () => {
    Promise.all(batchPartPromises)
      .then(() => {
        // headersSent check is needed since "finish" event will always fire even after an "error"
        if (!res.headersSent) {
          handleProxiedRequest(logger, tracer, req, res, next);
        }
      })
      .catch(error => {
        // TODO find a better way to handle errors from handleProxiedRequest()
        if (!res.headersSent) {
          res
            .status(error.httpCode || 500)
            .send(
              error.message !== null && error.message !== undefined
                ? error.message
                : error
            );
        }
      });
  });
  batchDicer.on("error", error => {
    if (!res.headersSent) {
      res.status(400).send({
        httpCode: 400,
        message: "Error parsing batch request: " + error.message
      });
    }
  });

  // Instead of piping the req object, need to pass body instead so that the req stream is not consumed
  let bodyReadable = new stream.Readable();
  bodyReadable._read = () => {}; // Noop
  bodyReadable.push(req.body);
  bodyReadable.pipe(batchDicer);
}

function handleNonBatchRequest(logger, tracer, req, res, next) {
  // TODO Need to distinguish validation errors from 500 errors here
  validateRequest(
    logger,
    tracer,
    req.authInfo,
    req.method,
    req.originalUrl.substring(
      req.originalUrl.indexOf(req.baseUrl) + req.baseUrl.length
    ),
    req.body
  )
    .then(() => {
      handleProxiedRequest(logger, tracer, req, res, next);
    })
    .catch(error => {
      res
        .status(500)
        .send(
          error.message !== null && error.message !== undefined
            ? error.message
            : error
        );
    });
}

function getAccessTokenForProxy() {
  return new Promise((resolve, reject) => {
    let oauth2 = new ClientOauth2({
      clientId: connectivityService.clientid,
      clientSecret: connectivityService.clientsecret,
      accessTokenUri: connectivityService.url + "/oauth/token"
    });
    if (cachedTokenResp !== null && !cachedTokenResp.expired()) {
      resolve(cachedTokenResp.accessToken);
    } else {
      oauth2.credentials
        .getToken()
        .then(tokenResp => {
          // Check cached token response again in case of async update
          if (cachedTokenResp === null || cachedTokenResp.expired()) {
            cachedTokenResp = tokenResp;
          }
          resolve(cachedTokenResp.accessToken);
        })
        .catch(error => {
          reject(error);
        });
    }
  });
}

// There could be unhandled errors in this function
function handleProxiedRequest(logger, tracer, req, res, next) {
  getAccessTokenForProxy()
    .then(accessToken => {
      let proxiedMethod = req.method;
      let proxiedReqHeaders = {
        "Content-Type": req.get("Content-Type"),
        "Proxy-Authorization": "Bearer " + accessToken,
        "SAP-Connectivity-Authentication": "Bearer " + req.authInfo.token
      };

      // Add non-excluded headers from original request to proxied request
      Object.keys(req.headers).forEach(key => {
        if (
          proxiedReqHeaders[key] === undefined &&
          !utils.isHeaderExcluded(PROXIED_REQ_HEADER_EXCLUDES, key)
        ) {
          proxiedReqHeaders[key] = req.headers[key];
        }
      });

      // Proxied call is to IBM APIC
      if (req.url.startsWith("/tci/internal")) {
        let proxiedUrl = "https://apic:443" + req.url;
        proxiedReqHeaders["x-ibm-client-id"] = apimService.apicClientId;
        proxiedReqHeaders["x-ibm-client-secret"] = apimService.apicClientSecret;

        // Redact security-sensitive header values before writing to trace log
        let traceProxiedReqHeaders = JSON.parse(
          JSON.stringify(proxiedReqHeaders)
        );
        let secSensitiveHeaderNames = [
          "authorization",
          "proxy-authorization",
          "sap-connectivity-authentication",
          "x-csrf-token",
          "x-ibm-client-id",
          "x-ibm-client-secret"
        ];
        Object.keys(traceProxiedReqHeaders).forEach(key => {
          if (secSensitiveHeaderNames.includes(key.toLowerCase())) {
            traceProxiedReqHeaders[key] = "REDACTED";
          }
        });

        tracer.debug("Proxied Method: %s", proxiedMethod);
        tracer.debug(
          "Proxied request headers: %s",
          JSON.stringify(traceProxiedReqHeaders)
        );
        tracer.debug("Proxied URL: %s", proxiedUrl);

        let proxiedReqOptions = {
          headers: proxiedReqHeaders,
          method: proxiedMethod,
          proxy:
            "http://" +
            connectivityService.onpremise_proxy_host +
            ":" +
            connectivityService.onpremise_proxy_port,
          tunnel: false,
          url: proxiedUrl
        };
        if (req.body && req.body.length > 0) {
          proxiedReqOptions.body = req.body;
        }
        let proxiedReq = request(proxiedReqOptions);
        proxiedReq
          .on("response", proxiedRes => {
            tracer.info(
              "Proxied call %s %s successful.",
              proxiedMethod,
              proxiedUrl
            );
            delete proxiedRes.headers.cookie;

            // Oddly, if I pipe proxiedRes instead of proxiedReq to res, it will not inherit the response headers
            proxiedReq.pipe(res);
          })
          .on("error", error => {
            logger.error(
              "Proxied call %s %s FAILED: %s",
              proxiedMethod,
              proxiedUrl,
              error
            );
            next(error);
          });
      }

      // Proxied call is to S4/HANA
      else {
        let proxiedUrl = "https://gw:443/sap/opu/odata/sap" + req.url;

        // Add/update sap-client query parameter with UPS value in the proxied URL
        let proxiedUrlObj = new urlLib.URL(proxiedUrl);
        proxiedUrlObj.searchParams.delete("sap-client");
        proxiedUrlObj.searchParams.set("sap-client", apimService.client);
        // Need to add port back as URL() removes defualt port
        proxiedUrl = proxiedUrlObj.href.replace(
          "https://gw/",
          "https://gw:443/"
        );

        proxiedReqHeaders.Authorization =
          "Basic " +
          new Buffer(apimService.user + ":" + apimService.password).toString(
            "base64"
          );

        // Pass through x-csrf-token from request to proxied request to S4/HANA
        // This requires manual handling of CSRF tokens from the front-end
        // Note: req.get() will get header in a case-insensitive manner
        let csrfTokenHeaderValue = req.get("X-Csrf-Token");
        proxiedReqHeaders["X-Csrf-Token"] = csrfTokenHeaderValue;

        // Redact security-sensitive header values before writing to trace log
        let traceProxiedReqHeaders = JSON.parse(
          JSON.stringify(proxiedReqHeaders)
        );
        let secSensitiveHeaderNames = [
          "authorization",
          "proxy-authorization",
          "sap-connectivity-authentication",
          "x-csrf-token"
        ];
        Object.keys(traceProxiedReqHeaders).forEach(key => {
          if (secSensitiveHeaderNames.includes(key.toLowerCase())) {
            traceProxiedReqHeaders[key] = "REDACTED";
          }
        });

        tracer.debug("Proxied Method: %s", proxiedMethod);
        tracer.debug(
          "Proxied request headers: %s",
          JSON.stringify(traceProxiedReqHeaders)
        );
        tracer.debug("Proxied URL: %s", proxiedUrl);

        // Remove MYSAPSSO2 cookie before making the proxied request, so that it does not override basic auth when APIM
        // proxies the request to SAP Gateway
        if ("cookie" in req.headers) {
          tracer.debug("Original cookies: %s", req.headers.cookie);
          let cookies = req.headers.cookie.split(";");
          let filteredCookies = "";
          cookies.forEach(cookie => {
            let sepIndex = cookie.indexOf("=");
            let cookieName = cookie.substring(0, sepIndex).trim();
            let cookieValue = cookie.substring(sepIndex + 1).trim();
            if (cookieName !== "MYSAPSSO2") {
              filteredCookies +=
                (filteredCookies.length > 0 ? "; " : "") +
                cookieName +
                "=" +
                cookieValue;
            }
          });
          tracer.debug("Filtered cookies: %s", filteredCookies);
          proxiedReqHeaders.Cookie = filteredCookies;
        }

        let proxiedReqOptions = {
          headers: proxiedReqHeaders,
          method: proxiedMethod,
          proxy:
            "http://" +
            connectivityService.onpremise_proxy_host +
            ":" +
            connectivityService.onpremise_proxy_port,
          tunnel: false,
          url: proxiedUrl
        };
        if (req.body && req.body.length > 0) {
          proxiedReqOptions.body = req.body;
        }
        let proxiedReq = request(proxiedReqOptions);
        proxiedReq
          .on("response", proxiedRes => {
            tracer.debug(
              "Proxied call %s %s successful.",
              proxiedMethod,
              proxiedUrl
            );
            delete proxiedRes.headers.cookie;

            // Oddly, if I pipe proxiedRes instead of proxiedReq to res, it will not inherit the response headers
            proxiedReq.pipe(res);
          })
          .on("error", error => {
            logger.error(
              "Proxied call %s %s FAILED: %s",
              proxiedMethod,
              proxiedUrl,
              error
            );
            next(error);
          });
      }
    })
    .catch(error => {
      next(error);
    });
}

function validateChangeSet(
  logger,
  tracer,
  authInfo,
  batchPartIndex,
  servicePathPrefix,
  changeSetData,
  changeSetBoundary
) {
  return new Promise((resolve, reject) => {
    let changeSetDicer = new dicer({
      boundary: changeSetBoundary
    });
    let changeSetPromises = [];
    let changeSetPartCount = 0;
    changeSetDicer.on("part", changeSetPartStream => {
      let changeSetPartIndex = ++changeSetPartCount;
      let changeSetPromise = new Promise(
        (changeSetPartResolve, changeSetPartReject) => {
          changeSetPartStream.on("header", changeSetPartHeaders => {
            if (utils.headersValidForOp(changeSetPartHeaders)) {
              changeSetPartStream.on("data", changeSetPartData => {
                let reqOpStr = changeSetPartData.toString(
                  DEFAULT_ENCODING,
                  0,
                  changeSetPartData.indexOf("\r\n")
                );
                let reqOp = utils.parseReqOp(reqOpStr);
                if (!reqOp) {
                  changeSetPartReject({
                    httpCode: 400,
                    message:
                      "Could not parse HTTP request operation info in changeset part " +
                      changeSetPartIndex +
                      " in batch part " +
                      batchPartIndex +
                      "."
                  });
                  return;
                }
                let body = null;
                if (changeSetPartData.indexOf("\r\n\r\n") !== -1) {
                  body = changeSetPartData.toString(
                    DEFAULT_ENCODING,
                    changeSetPartData.indexOf("\r\n\r\n") + 4
                  );
                } else {
                  changeSetPartReject({
                    httpCode: 400,
                    message:
                      "Could not parse body in changeset part " +
                      changeSetPartIndex +
                      " in batch part " +
                      batchPartIndex +
                      "."
                  });
                  return;
                }

                validateRequest(
                  logger,
                  tracer,
                  authInfo,
                  reqOp.method,
                  servicePathPrefix + "/" + reqOp.path,
                  body
                )
                  .then(() => {
                    changeSetPartResolve();
                  })
                  .catch(error => {
                    changeSetPartReject({
                      httpCode: 400,
                      message:
                        "Request for changepart part " +
                        changeSetPartIndex +
                        " in batch part " +
                        batchPartIndex +
                        " failed validation with the following error: " +
                        error
                    });
                  });
              });
            } else {
              // Data event handling is required, otherwise Dicer will hang and throw UnhandledPromiseRejectionWarning
              changeSetPartStream.on("data", () => {
                changeSetPartReject({
                  httpCode: 400,
                  message:
                    "Invalid headers in changeset part " +
                    changeSetPartIndex +
                    " in batch part " +
                    batchPartIndex +
                    "."
                });
              });
            }
          });
          changeSetPartStream.on("error", error => {
            changeSetPartReject({
              httpCode: 400,
              message:
                "Error parsing changeset part " +
                changeSetPartIndex +
                " in batch part " +
                batchPartIndex +
                ": " +
                error.message
            });
          });
        }
      );
      changeSetPromises.push(changeSetPromise);
    });
    changeSetDicer.on("finish", () => {
      Promise.all(changeSetPromises)
        .then(() => {
          resolve("Valid");
        })
        .catch(error => {
          reject(error);
        });
    });
    changeSetDicer.on("error", error => {
      reject({
        httpCode: 400,
        message:
          "Error parsing changeset in batch part " +
          batchPartIndex +
          ": " +
          error.message
      });
    });
    changeSetDicer.write(changeSetData.toString());
    changeSetDicer.end();
  });
}

function validateRequest(logger, tracer, authInfo, method, url, body) {
  return new Promise((resolve, reject) => {
    let query = urlLib.parse(url, true).query;

    // TODO see if it makes sense to pass if there are no matching filter
    let valid = true;
    let failedValidationRules = [];
    for (let i = 0; i < apiProxySecJson.services.length; i++) {
      let service = apiProxySecJson.services[i];
      let servicePrefix = "/" + service.name + "/";
      if (url.startsWith(servicePrefix)) {
        let resourcePath = decodeURI(url.substring(servicePrefix.length));
        for (let j = 0; j < service.resources.length; j++) {
          let resource = service.resources[j];
          let resourcePathRegExp = new RegExp(resource.path);
          let match = resourcePath.match(resourcePathRegExp);
          if (!!match && method === resource.method) {
            for (let k = 0; k < resource.validations.length; k++) {
              let validation = resource.validations[k];
              let roleName = utils.getRoleName(roleMappingsJson, authInfo);
              if (!roleName || validation.userType !== roleName) {
                continue;
              }
              if (validation.mode === "namedAndUnnamedParam") {
                let paramsRegExp = new RegExp(REGEX_PARAM);
                let paramKeyValuePair = paramsRegExp.exec(
                  match[validation.regExpGroup]
                );
                if (paramKeyValuePair) {
                  let hasValidNamedParam = false;
                  while (paramKeyValuePair) {
                    let caseSensitive = validation.caseSensitive !== false;
                    let paramKey = paramKeyValuePair[1];
                    let paramValue = paramKeyValuePair[2];
                    if (
                      paramKey === validation.name &&
                      ((caseSensitive &&
                        paramValue ===
                          utils.replaceVars(validation.value, authInfo)) ||
                        (!caseSensitive &&
                          paramValue.toLowerCase() ===
                            utils
                              .replaceVars(validation.value, authInfo)
                              .toLowerCase()))
                    ) {
                      hasValidNamedParam = true;
                      break;
                    }
                    paramKeyValuePair = paramsRegExp.exec(
                      match[validation.regExpGroup]
                    );
                  }
                  if (!hasValidNamedParam) {
                    failedValidationRules.push(
                      i + 1 + "-" + (j + 1) + "-" + (k + 1)
                    );
                    valid = false;
                  }
                } else {
                  let caseSensitive = validation.caseSensitive !== false;
                  if (
                    (caseSensitive &&
                      match[validation.regExpGroup] !== validation.value) ||
                    (!caseSensitive &&
                      match[validation.regExpGroup].toLowerCase() !==
                        validation.value.toLowerCase())
                  ) {
                    failedValidationRules.push(
                      i + 1 + "-" + (j + 1) + "-" + (k + 1)
                    );
                    valid = false;
                  }
                }
              } else if (validation.mode === "filterParam") {
                let filter = query.$filter;
                if (filter) {
                  let filterAst = odataParser.parse("$filter=" + filter);
                  if (
                    filterAst.error ||
                    !utils.hasEqFilter(
                      filterAst.$filter,
                      validation.name,
                      utils.replaceVars(
                        validation.value,
                        authInfo,
                        validation.caseSensitive !== false
                      )
                    )
                  ) {
                    failedValidationRules.push(
                      i + 1 + "-" + (j + 1) + "-" + (k + 1)
                    );
                    valid = false;
                  }
                } else {
                  failedValidationRules.push(
                    i + 1 + "-" + (j + 1) + "-" + (k + 1)
                  );
                  valid = false;
                }
              } else if (validation.mode === "jsonBody") {
                let jsonBody =
                  typeof body === "string" || body instanceof String
                    ? JSON.parse(body)
                    : body.toJSON();

                // Need to wrap the body JSON with an array to get JSONPath to work properly (it cannot match root elements)
                let bodyWrapperJson = [jsonBody];

                let jpResult = jsonPathPlus.JSONPath(
                  utils.replaceVars(validation.jsonPath, authInfo),
                  bodyWrapperJson
                );
                if (jpResult.length === 0) {
                  failedValidationRules.push(
                    i + 1 + "-" + (j + 1) + "-" + (k + 1)
                  );
                  valid = false;
                }
              } else {
                failedValidationRules.push(
                  i + 1 + "-" + (j + 1) + "-" + (k + 1)
                );
                valid = false;
              }
            }
          }
        }
      }
    }
    if (valid) {
      resolve();
    } else {
      let failedValidationText =
        "Request failed validation at rule" +
        (failedValidationRules.length > 1 ? "s" : "") +
        " [ " +
        failedValidationRules.toString().replace(",", ", ") +
        " ].";
      reject(failedValidationText);
    }
  });
}

module.exports = (aApiProxySecJson, aRoleMappingsJson) => {
  return getRouter(aApiProxySecJson, aRoleMappingsJson);
};
