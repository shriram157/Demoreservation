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
	var routerTracer = appContext.createLogContext().getTracer(__filename);

	// Get UPS name from env var UPS_NAME
	var apimServiceName = process.env.UPS_NAME;
	var options = {};
	options = Object.assign(options, xsenv.getServices({
		apim: {
			name: apimServiceName
		}
	}));
	routerTracer.debug("Properties of APIM user-provided service '%s' : %s", apimServiceName, JSON.stringify(options));

	var apimUrl = options.apim.host;
	if (apimUrl.endsWith("/")) {
		apimUrl = apimUrl.slice(0, -1);
	}
	var APIKey = options.apim.APIKey;
	var s4Client = options.apim.client;
	var s4User = options.apim.user;
	var s4Password = options.apim.password;

	router.all("/*", function (req, res, next) {
		var logger = req.loggingContext.getLogger("/Application/Route/APIProxy");
		var tracer = req.loggingContext.getTracer(__filename);
		var proxiedMethod = req.method;
		var proxiedReqHeaders = {
			"APIKey": APIKey,
			"Content-Type": req.get("Content-Type")
		};
		var proxiedUrl = apimUrl + req.url;

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

		tracer.debug("Proxied Method: %s", proxiedMethod);
		tracer.debug("Proxied request headers: %s", JSON.stringify(proxiedReqHeaders));
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
	});

	return router;
};