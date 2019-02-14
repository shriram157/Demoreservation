/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

module.exports = function () {
	var express = require("express");
	var log = require("cf-nodejs-logging-support");
	var request = require("request");
	var xsenv = require("@sap/xsenv");

	var router = express.Router();

	// TODO: provide service name via environment variable instead
	var apimServiceName = "DEMO_RESERVATION_APIM_CUPS";
	var options = {};
	options = Object.assign(options, xsenv.getServices({
		apim: {
			name: apimServiceName
		}
	}));
	log.logMessage("debug", "Properties of APIM user-provided service '%s' : %s", apimServiceName, JSON.stringify(options));

	var url = options.apim.host;
	if (url.endsWith("/")) {
		url = url.slice(0, -1);
	}
	var APIKey = options.apim.APIKey;
	var s4Client = options.apim.client;
	var s4User = options.apim.user;
	var s4Password = options.apim.password;

	router.all("/*", function (req, res, next) {
		var proxiedMethod = req.method;
		var proxiedReqHeaders = {
			"APIKey": APIKey,
			"Content-Type": req.get("Content-Type")
		};
		var proxiedUrl = url + req.url;

		// Proxied call is to S4/HANA
		proxiedReqHeaders.Authorization = "Basic " + new Buffer(s4User + ":" + s4Password).toString("base64");

		// Pass through x-csrf-token from request to proxied request to S4/HANA
		// This requires manual handling of CSRF tokens from the front-end
		// Note: req.get() will get header in a case-insensitive manner 
		var csrfTokenHeaderValue = req.get("X-Csrf-Token");
		proxiedReqHeaders["X-Csrf-Token"] = csrfTokenHeaderValue;

		req.logMessage("debug", "Proxied Method: %s", proxiedMethod);
		req.logMessage("debug", "Proxied request headers: %s", JSON.stringify(proxiedReqHeaders));
		req.logMessage("debug", "Proxied URL: %s", proxiedUrl);

		let proxiedReq = request({
			headers: proxiedReqHeaders,
			method: proxiedMethod,
			url: proxiedUrl
		});
		req.pipe(proxiedReq);
		proxiedReq.on("response", proxiedRes => {
			req.logMessage("verbose", "Proxied call %s %s successful.", proxiedMethod, proxiedUrl);
			delete proxiedRes.headers.cookie;

			proxiedReq.pipe(res);
		}).on("error", error => {
			req.logMessage("error", "Proxied call %s %s FAILED: %s", proxiedMethod, proxiedUrl, error);
			next(error);
		});
	});

	return router;
};