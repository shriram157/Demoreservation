/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

module.exports = function (appContext) {
	var express = require("express");
	var request = require("request");
	var {
		URL
	} = require("url");
	var xsenv = require("@sap/xsenv");

	var router = express.Router();

	// Get UPS name from env var UPS_NAME
	var apimServiceName = process.env.UPS_NAME;
	var options = {};
	options = Object.assign(options, xsenv.getServices({
		apim: {
			name: apimServiceName
		}
	}));

	var apimUrl = options.apim.host;
	if (apimUrl.endsWith("/")) {
		apimUrl = apimUrl.slice(0, -1);
	}
	var APIKey = options.apim.APIKey;
	var s4Client = options.apim.client;
	var s4User = options.apim.user;
	var s4Password = options.apim.password;
	var apicClientId = options.apim.apicClientId;
	var apicClientSecret = options.apim.apicClientSecret;

	router.all("/*", function (req, res, next) {
		var logger = req.loggingContext.getLogger("/Application/Route/APIProxy");
		var tracer = req.loggingContext.getTracer(__filename);
		var proxiedMethod = req.method;
		var proxiedReqHeaders = {
			"APIKey": APIKey,
			"Content-Type": req.get("Content-Type")
		};
		var proxiedUrl = apimUrl + req.url;

		// Proxied call is to IBM APIC
		if (req.url.startsWith("/tci/internal")) {
			proxiedReqHeaders["x-ibm-client-id"] = apicClientId;
			proxiedReqHeaders["x-ibm-client-secret"] = apicClientSecret;

			// Redact security-sensitive header values before writing to trace log
			var traceProxiedReqHeaders = JSON.parse(JSON.stringify(proxiedReqHeaders));
			var secSensitiveHeaderNames = ["authorization", "apikey", "x-csrf-token", "x-ibm-client-id", "x-ibm-client-secret"];
			Object.keys(traceProxiedReqHeaders).forEach(key => {
				if (secSensitiveHeaderNames.includes(key.toLowerCase())) {
					traceProxiedReqHeaders[key] = "REDACTED";
				}
			});

			tracer.debug("Proxied Method: %s", proxiedMethod);
			tracer.debug("Proxied request headers: %s", JSON.stringify(traceProxiedReqHeaders));
			tracer.debug("Proxied URL: %s", proxiedUrl);

			let proxiedReq = request({
				headers: proxiedReqHeaders,
				method: proxiedMethod,
				url: proxiedUrl
			});
			req.pipe(proxiedReq);
			proxiedReq.on("response", proxiedRes => {
				tracer.info("Proxied call %s %s successful.", proxiedMethod, proxiedUrl);
				delete proxiedRes.headers.cookie;
				proxiedReq.pipe(res);
			}).on("error", error => {
				logger.error("Proxied call %s %s FAILED: %s", proxiedMethod, proxiedUrl, error);
				next(error);
			});
		}

		// Proxied call is to S4/HANA
		else {
			// Add/update sap-client query parameter with UPS value in the proxied URL
			var proxiedUrlObj = new URL(proxiedUrl);
			proxiedUrlObj.searchParams.delete("sap-client");
			proxiedUrlObj.searchParams.set("sap-client", s4Client);
			proxiedUrl = proxiedUrlObj.href;

			proxiedReqHeaders.Authorization = "Basic " + new Buffer(s4User + ":" + s4Password).toString("base64");

			// Pass through x-csrf-token from request to proxied request to S4/HANA
			// This requires manual handling of CSRF tokens from the front-end
			// Note: req.get() will get header in a case-insensitive manner 
			var csrfTokenHeaderValue = req.get("X-Csrf-Token");
			proxiedReqHeaders["X-Csrf-Token"] = csrfTokenHeaderValue;

			// Redact security-sensitive header values before writing to trace log
			var traceProxiedReqHeaders = JSON.parse(JSON.stringify(proxiedReqHeaders));
			var secSensitiveHeaderNames = ["authorization", "apikey", "x-csrf-token"];
			Object.keys(traceProxiedReqHeaders).forEach(key => {
				if (secSensitiveHeaderNames.includes(key.toLowerCase())) {
					traceProxiedReqHeaders[key] = "REDACTED";
				}
			});

			tracer.debug("Proxied Method: %s", proxiedMethod);
			tracer.debug("Proxied request headers: %s", JSON.stringify(traceProxiedReqHeaders));
			tracer.debug("Proxied URL: %s", proxiedUrl);

			let proxiedReq = request({
				headers: proxiedReqHeaders,
				method: proxiedMethod,
				url: proxiedUrl
			});
			req.pipe(proxiedReq);
			proxiedReq.on("response", proxiedRes => {
				tracer.info("Proxied call %s %s successful.", proxiedMethod, proxiedUrl);
				delete proxiedRes.headers.cookie;

				proxiedReq.pipe(res);
			}).on("error", error => {
				logger.error("Proxied call %s %s FAILED: %s", proxiedMethod, proxiedUrl, error);
				next(error);
			});
		}
	});

	return router;
};