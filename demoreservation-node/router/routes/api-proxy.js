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
const INTERNAL_SERVER_ERROR_NAME = "InternalServerError";
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
const SEC_SENSITIVE_HEADERS = [
  "authorization",
  "proxy-authorization",
  "sap-connectivity-authentication",
  "x-csrf-token",
  "x-ibm-client-id",
  "x-ibm-client-secret"
];
const VALIDATION_ERROR_NAME = "ValidationError";

let router = null;
let apiProxySecJson = null;
let roleMappingsJson = null;
let apimService = null;
let connectivityService = null;
let cachedTokenResp = null;

function createInternalServerError(message) {
  let error = new Error(message);
  error.name = INTERNAL_SERVER_ERROR_NAME;
  return error;
}

function createValidationError(message) {
  let error = new Error(message);
  error.name = VALIDATION_ERROR_NAME;
  return error;
}

function getFilteredApiProxySecJson(authInfo, method, url) {
  let filteredApiProxySecJson = JSON.parse(JSON.stringify(apiProxySecJson));
  let roleName = utils.getRoleName(roleMappingsJson, authInfo);
  filteredApiProxySecJson.services = filteredApiProxySecJson.services
    .map((service, index) => {
      service.index = index;
      return service;
    })
    .filter(service => url.startsWith("/" + service.name + "/"));
  filteredApiProxySecJson.services.forEach(service => {
    let servicePrefix = "/" + service.name;
    service.resources = service.resources
      .map((resource, index) => {
        resource.index = index;
        if (resource.methods === undefined) {
          resource.methods = ["*"];
        }
        return resource;
      })
      .filter(resource => {
        let resourcePath = decodeURI(url.substring(servicePrefix.length + 1));
        let resourcePathRegExp = new RegExp(resource.path);
        return (
          !!resourcePath.match(resourcePathRegExp) &&
          (resource.methods.includes("*") || resource.methods.includes(method))
        );
      });
    service.resources.forEach(resource => {
      if (resource.validations === undefined) {
        resource.validations = [];
      }
      resource.validations = resource.validations
        .map((validation, index) => {
          validation.index = index;
          if (validation.appliesToRoles === undefined) {
            validation.appliesToRoles = ["*"];
          }
          return validation;
        })
        .filter(
          validation =>
            roleName &&
            (validation.appliesToRoles.includes("*") ||
              validation.appliesToRoles.includes(roleName))
        );
    });
  });
  return filteredApiProxySecJson;
}

function getProxyAccessToken() {
  return new Promise((resolve, reject) => {
    let oauth2 = new ClientOauth2({
      clientId: connectivityService.clientid,
      clientSecret: connectivityService.clientsecret,
      accessTokenUri: connectivityService.token_service_url + "/oauth/token"
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

function getRouter(aApiProxySecJson, aRoleMappingsJson) {
  if (!router) {
    router = express.Router();
    apiProxySecJson = aApiProxySecJson;
    roleMappingsJson = aRoleMappingsJson;
    apimService = utils.getService({
      // Get UPS name from env var UPS_NAME
      name: process.env.UPS_NAME
    });
    apimService.sapOdataUrl = utils.normalizeUrl(apimService.sapOdataUrl);
    apimService.apicUrl = utils.normalizeUrl(apimService.apicUrl);
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
              let errorMessage =
                "Could not parse HTTP request operation info in batch part " +
                batchPartIndex +
                ".";
              batchPartReject(createValidationError(errorMessage));
              return;
            }
            let body = null;
            if (batchPartData.indexOf("\r\n\r\n") !== -1) {
              body = batchPartData.toString(
                DEFAULT_ENCODING,
                batchPartData.indexOf("\r\n\r\n") + 4
              );
            } else {
              let errorMessage =
                "Could not parse body in batch part " + batchPartIndex + ".";
              batchPartReject(createValidationError(errorMessage));
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
              .then(validateRes => {
                batchPartResolve(validateRes);
              })
              .catch(error => {
                if (isValidationError(error)) {
                  let errorMessage =
                    "Request for batch part " +
                    batchPartIndex +
                    " failed validation with the following error: " +
                    error.message;
                  batchPartReject(createValidationError(errorMessage));
                } else {
                  let errorMessage =
                    "Request for batch part " +
                    batchPartIndex +
                    " failed with the following internal server error: " +
                    (error.message ? error.message : error);
                  batchPartReject(createInternalServerError(errorMessage));
                }
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
              .then(validateRes => {
                batchPartResolve(validateRes);
              })
              .catch(error => {
                batchPartReject(error);
              });
          });
        } else {
          // Data event handling is required, otherwise Dicer will hang and throw UnhandledPromiseRejectionWarning
          batchPartStream.on("data", () => {
            let errorMessage =
              "Invalid headers in batch part " + batchPartIndex + ".";
            batchPartReject(createValidationError(errorMessage));
          });
        }
      });
      batchPartStream.on("error", error => {
        let errorMessage =
          "Error parsing batch part" +
          batchPartIndex +
          ": " +
          (error.message ? error.message : error);
        batchPartReject(createValidationError(errorMessage));
      });
    });
    batchPartPromises.push(batchPartPromise);
  });
  batchDicer.on("finish", () => {
    Promise.all(batchPartPromises)
      .then(validateResList => {
        // headersSent check is needed since "finish" event will always fire even after an "error"
        if (!res.headersSent) {
          let validateRes = validateResList.every(e => e);
          handleProxiedRequest(logger, tracer, req, res, next, validateRes);
        }
      })
      .catch(error => {
        if (!res.headersSent) {
          res
            .status(isValidationError(error) ? 400 : 500)
            .send(error.message ? error.message : error);
        }
      });
  });
  batchDicer.on("error", error => {
    if (!res.headersSent) {
      res.status(400).send("Error parsing batch request: " + error.message);
    }
  });

  // Instead of piping the req object, need to pass body instead so that the req stream is not consumed
  let bodyReadable = new stream.Readable();
  bodyReadable._read = () => {}; // Noop
  bodyReadable.push(req.body);
  bodyReadable.pipe(batchDicer);
}

function handleNonBatchRequest(logger, tracer, req, res, next) {
  let authInfo = req.authInfo;
  let method = req.method;
  let url = req.originalUrl.substring(
    req.originalUrl.indexOf(req.baseUrl) + req.baseUrl.length
  );
  let body = req.body;
  validateRequest(logger, tracer, authInfo, method, url, body)
    .then(validateRes => {
      handleProxiedRequest(logger, tracer, req, res, next, validateRes);
    })
    .catch(error => {
      res
        .status(isValidationError(error) ? 400 : 500)
        .send(error.message ? error.message : error);
    });
}

// There could be unhandled errors in this function
function handleProxiedRequest(logger, tracer, req, res, next, validateRes) {
  getProxyAccessToken()
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
        let proxiedUrl = apimService.apicUrl + req.url;
        proxiedReqHeaders["x-ibm-client-id"] = apimService.apicClientId;
        proxiedReqHeaders["x-ibm-client-secret"] = apimService.apicClientSecret;

        // Redact security-sensitive header values before writing to trace log
        let traceProxiedReqHeaders = JSON.parse(
          JSON.stringify(proxiedReqHeaders)
        );
        Object.keys(traceProxiedReqHeaders).forEach(key => {
          if (SEC_SENSITIVE_HEADERS.includes(key.toLowerCase())) {
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
        let sapOdataUrl = apimService.sapOdataUrl;
        let proxiedUrl = sapOdataUrl + "/sap/opu/odata/sap" + req.url;

        // Add/update sap-client query parameter with UPS value in the proxied URL
        let proxiedUrlObj = new urlLib.URL(proxiedUrl);
        proxiedUrlObj.searchParams.delete("sap-client");
        proxiedUrlObj.searchParams.set(
          "sap-client",
          apimService.sapOdataClient
        );

        // Need to add default port back as URL() removes defualt port
        if (sapOdataUrl.startsWith("http://") && sapOdataUrl.endsWith(":80")) {
          proxiedUrl = proxiedUrlObj.href.replace(
            sapOdataUrl.replace(":80", ""),
            sapOdataUrl
          );
        } else if (
          sapOdataUrl.startsWith("https://") &&
          sapOdataUrl.endsWith(":443")
        ) {
          proxiedUrl = proxiedUrlObj.href.replace(
            sapOdataUrl.replace(":443", ""),
            sapOdataUrl
          );
        }

        proxiedReqHeaders.Authorization =
          "Basic " +
          Buffer.from(
            apimService.sapOdataUser + ":" + apimService.sapOdataPassword
          ).toString("base64");

        // Pass through x-csrf-token from request to proxied request to S4/HANA
        // This requires manual handling of CSRF tokens from the front-end
        // Note: req.get() will get header in a case-insensitive manner
        let csrfTokenHeaderValue = req.get("X-Csrf-Token");
        proxiedReqHeaders["X-Csrf-Token"] = csrfTokenHeaderValue;

        // Redact security-sensitive header values before writing to trace log
        let traceProxiedReqHeaders = JSON.parse(
          JSON.stringify(proxiedReqHeaders)
        );
        Object.keys(traceProxiedReqHeaders).forEach(key => {
          if (SEC_SENSITIVE_HEADERS.includes(key.toLowerCase())) {
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

        // Disable gzip encoding if response needs to be validated
        if (validateRes) {
          proxiedReqHeaders["accept-encoding"] = null;
        }

        let proxiedReqOptions = {
          headers: proxiedReqHeaders,
          method: proxiedMethod,
          proxy:
            "http://" +
            connectivityService.onpremise_proxy_host +
            ":" +
            connectivityService.onpremise_proxy_http_port,
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

            // Read and validate response body
            if (validateRes) {
              if (
                proxiedRes.headers["content-type"].startsWith(
                  "application/json"
                )
              ) {
                let chunks = [];
                proxiedRes.on("data", chunk => {
                  chunks.push(chunk);
                });
                proxiedRes.on("end", () => {
                  let resBody = Buffer.concat(chunks).toString("utf8");
                  validateResponse(
                    logger,
                    tracer,
                    req.authInfo,
                    req.method,
                    req.url,
                    resBody
                  )
                    .then(() => {
                      Object.keys(proxiedRes.headers).forEach(key => {
                        res.setHeader(key, proxiedRes.headers[key]);
                      });
                      res.status(proxiedRes.statusCode).send(resBody);
                    })
                    .catch(error => {
                      res
                        .status(isValidationError(error) ? 400 : 500)
                        .send(error.message ? error.message : error);
                    });
                });
              } else {
                proxiedReq.pipe(res);
              }
            } else {
              // Oddly, if I pipe proxiedRes instead of proxiedReq to res, it will not inherit the response headers
              proxiedReq.pipe(res);
            }
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

function isValidationError(error) {
  return error && error.name === VALIDATION_ERROR_NAME;
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
                  let errorMessage =
                    "Could not parse HTTP request operation info in changeset part " +
                    changeSetPartIndex +
                    " in batch part " +
                    batchPartIndex +
                    ".";
                  changeSetPartReject(createValidationError(errorMessage));
                  return;
                }
                let body = null;
                if (changeSetPartData.indexOf("\r\n\r\n") !== -1) {
                  body = changeSetPartData.toString(
                    DEFAULT_ENCODING,
                    changeSetPartData.indexOf("\r\n\r\n") + 4
                  );
                } else {
                  let errorMessage =
                    "Could not parse body in changeset part " +
                    changeSetPartIndex +
                    " in batch part " +
                    batchPartIndex +
                    ".";
                  changeSetPartReject(createValidationError(errorMessage));
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
                  .then(validateRes => {
                    changeSetPartResolve(validateRes);
                  })
                  .catch(error => {
                    if (isValidationError(error)) {
                      let errorMessage =
                        "Request for changepart part " +
                        changeSetPartIndex +
                        " in batch part " +
                        batchPartIndex +
                        " failed validation with the following error: " +
                        error.message;
                      changeSetPartReject(createValidationError(errorMessage));
                    } else {
                      let errorMessage =
                        "Request for changepart part " +
                        changeSetPartIndex +
                        " in batch part " +
                        batchPartIndex +
                        " failed with the following internal server error: " +
                        (error.message ? error.message : error);
                      changeSetPartReject(
                        createInternalServerError(errorMessage)
                      );
                    }
                  });
              });
            } else {
              // Data event handling is required, otherwise Dicer will hang and throw UnhandledPromiseRejectionWarning
              changeSetPartStream.on("data", () => {
                let errorMessage =
                  "Invalid headers in changeset part " +
                  changeSetPartIndex +
                  " in batch part " +
                  batchPartIndex +
                  ".";
                changeSetPartReject(createValidationError(errorMessage));
              });
            }
          });
          changeSetPartStream.on("error", error => {
            let errorMessage =
              "Error parsing changeset part " +
              changeSetPartIndex +
              " in batch part " +
              batchPartIndex +
              ": " +
              (error.message ? error.message : error);
            changeSetPartReject(createValidationError(errorMessage));
          });
        }
      );
      changeSetPromises.push(changeSetPromise);
    });
    changeSetDicer.on("finish", () => {
      Promise.all(changeSetPromises)
        .then(validateResList => {
          resolve(validateResList.every(e => e));
        })
        .catch(error => {
          reject(error);
        });
    });
    changeSetDicer.on("error", error => {
      let errorMessage =
        "Error parsing changeset in batch part " +
        batchPartIndex +
        ": " +
        (error.message ? error.message : error);
      reject(createValidationError(errorMessage));
    });
    changeSetDicer.write(changeSetData.toString());
    changeSetDicer.end();
  });
}

function validateRequest(logger, tracer, authInfo, method, url, body) {
  return new Promise((resolve, reject) => {
    let filteredApiProxySecJson = getFilteredApiProxySecJson(
      authInfo,
      method,
      url
    );
    let validateRes = filteredApiProxySecJson.services.some(service =>
      service.resources.some(resource =>
        resource.validations.some(validation =>
          validation.mode.startsWith("res")
        )
      )
    );

    // Handle no service match scenario
    if (filteredApiProxySecJson.services.length === 0) {
      if (filteredApiProxySecJson.allowNoMatch) {
        resolve(validateRes);
      } else {
        let errorMessage = "Request failed service access validation.";
        reject(createValidationError(errorMessage));
      }
      return;
    }

    let parsedUrl = urlLib.parse(url, true);
    let pathName = parsedUrl.pathname;
    let query = parsedUrl.query;
    let failedValidationRules = [];

    // Assertion: if there is a service match, it will be only one match
    let service = filteredApiProxySecJson.services[0];
    let servicePrefix = "/" + service.name;

    // Allow GET and HEAD service root by default
    if (
      (method === "GET" || method === "HEAD") &&
      (pathName === servicePrefix || pathName === servicePrefix + "/")
    ) {
      resolve(validateRes);
      return;
    }

    // Allow GET $metadata by default
    if (method === "GET" && pathName === servicePrefix + "/$metadata") {
      resolve(validateRes);
      return;
    }

    // Handle no resource match scenario
    if (service.resources.length === 0) {
      if (service.allowNoMatch) {
        resolve(validateRes);
      } else {
        let errorMessage =
          "Request failed resource access validation at rule [ " +
          service.index +
          " ].";
        reject(createValidationError(errorMessage));
      }
      return;
    }

    let resourcePath = decodeURI(url.substring(servicePrefix.length + 1));
    let valid = true;
    service.resources.forEach(resource => {
      let resourcePathRegExp = new RegExp(resource.path);
      let match = resourcePath.match(resourcePathRegExp);
      resource.validations.forEach(validation => {
        if (validation.mode === "filterParam") {
          let filter = query.$filter;
          if (filter) {
            let filterAst = odataParser.parse("$filter=" + filter);
            if (
              filterAst.error ||
              !utils.hasEqFilter(
                filterAst.$filter,
                validation.mode,
                utils.replaceVars(
                  validation.value,
                  authInfo,
                  validation.caseSensitive !== false
                )
              )
            ) {
              failedValidationRules.push(
                service.index + "-" + resource.index + "-" + validation.index
              );
              valid = false;
            }
          } else {
            failedValidationRules.push(
              service.index + "-" + resource.index + "-" + validation.index
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
              service.index + "-" + resource.index + "-" + validation.index
            );
            valid = false;
          }
        } else if (validation.mode === "namedAndUnnamedParam") {
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
                paramKey === validation.mode &&
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
                service.index + "-" + resource.index + "-" + service.index
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
                service.index + "-" + resource.index + "-" + service.index
              );
              valid = false;
            }
          }
        }
      });
    });
    if (valid) {
      resolve(validateRes);
    } else {
      let errorMessage =
        "Request failed validation at rule" +
        (failedValidationRules.length > 1 ? "s" : "") +
        " [ " +
        failedValidationRules.toString().replace(",", ", ") +
        " ].";
      reject(createValidationError(errorMessage));
    }
  });
}

function validateResponse(logger, tracer, authInfo, method, url, body) {
  return new Promise((resolve, reject) => {
    let filteredApiProxySecJson = getFilteredApiProxySecJson(
      authInfo,
      method,
      url
    );
    let service = filteredApiProxySecJson.services[0];
    service.resources = service.resources.filter(
      resource =>
        resource.validations.length > 0 &&
        resource.validations.some(validation =>
          validation.mode.startsWith("res")
        )
    );
    service.resources.forEach(resource => {
      resource.validations = resource.validations.filter(validation =>
        validation.mode.startsWith("res")
      );
    });
    let failedValidationRules = [];
    let valid = true;
    service.resources.forEach(resource => {
      let validations = resource.validations;
      validations.forEach(validation => {
        if (validation.mode === "resJsonBody") {
          let jsonBody =
            typeof body === "string" || body instanceof String
              ? JSON.parse(body)
              : body.toJSON();
          let jpResult = jsonPathPlus.JSONPath({
            path: utils.replaceVars(validation.jsonPath, authInfo),
            json: jsonBody,
            wrap: false
          });
          if (jpResult === undefined) {
            failedValidationRules.push(
              service.index + "-" + resource.index + "-" + validation.index
            );
            valid = false;
          }
        }
      });
    });
    if (valid) {
      resolve();
    } else {
      let errorMessage =
        "Request failed validation at rule" +
        (failedValidationRules.length > 1 ? "s" : "") +
        " [ " +
        failedValidationRules.toString().replace(",", ", ") +
        " ].";
      reject(createValidationError(errorMessage));
    }
  });
}

module.exports = (aApiProxySecJson, aRoleMappingsJson) =>
  getRouter(aApiProxySecJson, aRoleMappingsJson);
