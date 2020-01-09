/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

module.exports = function () {
	var express = require("express");
	var request = require("request");
	var xsenv = require("@sap/xsenv");

	var router = express.Router();

	var mockUserMode = false;
	if (process.env.MOCK_USER_MODE === "true" || process.env.MOCK_USER_MODE === "TRUE") {
		mockUserMode = true;
	}
	var mockUserOrigin = process.env.MOCK_USER_ORIGIN;

	// Get UPS name from env var UPS_NAME
	var apimServiceName = process.env.UPS_NAME;
	var options = {};
	options = Object.assign(options, xsenv.getServices({
		apim: {
			name: apimServiceName
		}
	}));

	var xsuaaService = xsenv.getServices({
		xsuaa: {
			tag: "xsuaa"
		}
	}).xsuaa;

	var url = options.apim.host;
	var APIKey = options.apim.APIKey;
	var s4Client = options.apim.client;
	var s4User = options.apim.user;
	var s4Password = options.apim.password;

	router.get("/attributes", (req, res) => {
		var logger = req.loggingContext.getLogger("/Application/Route/UserDetails/Attributes");
		var tracer = req.loggingContext.getTracer(__filename);
		var userProfile = req.user;
		var userAttributes = req.authInfo.userAttributes;
		tracer.debug("User profile from JWT: %s", JSON.stringify(userProfile));
		tracer.debug("User attributes from JWT: %s", JSON.stringify(userAttributes));

		// If there is no user type, it is most probably a call from Neo, in which case we can fake the data as TCI user
		if (mockUserMode && mockUserOrigin === req.authInfo.origin) {
			userAttributes = {
				Language: ["English"],
				UserType: ["National"]
			};
			tracer.debug("Mock user mode is enabled and JWT is from origin %s, switch to mock user attributes: %s", req.authInfo.origin, JSON.stringify(
				userAttributes));
		}

		var resBody = {
			"userProfile": userProfile,
			"samlAttributes": userAttributes
		};

		tracer.debug("Response body: %s", JSON.stringify(resBody));
		return res.type("application/json").status(200).send(resBody);
	});

	router.get("/currentScopesForUser", (req, res) => {
		var logger = req.loggingContext.getLogger("/Application/Route/UserDetails/CurrentScopesForUser");
		var tracer = req.loggingContext.getTracer(__filename);
		var xsAppName = xsuaaService.xsappname;
		var scopes = req.authInfo.scopes;
		var userAttributes = req.authInfo.userAttributes;

		tracer.debug("Scopes from JWT: %s", JSON.stringify(scopes));
		tracer.debug("User attributes from JWT: %s", JSON.stringify(userAttributes));

		// If there is no user type, it is most probably a call from Neo, in which case we can fake the data as TCI user
		if (mockUserMode && mockUserOrigin === req.authInfo.origin) {
			tracer.debug("Mock user mode is enabled and JWT is from origin %s, switch to mock user type.", req.authInfo.origin);
			return res.type("application/json").status(200).send(JSON.stringify({
				loggedUserType: ["TCI_User"]
			}));
		}

		var role = "Unknown";
		var approveReservations = false;
		var manageReservations = false;

		for (var i = 0; i < scopes.length; i++) {
			if (scopes[i] === xsAppName + ".Approve_Reservations") {
				approveReservations = true;
			} else if (scopes[i] === xsAppName + ".Manage_Reservations") {
				manageReservations = true;
			} else {
				tracer.warning("Unrecognized scope: %s", scopes[i]);
			}
		}

		var scopeLogMessage = "approveReservations: " + approveReservations + "\n";
		scopeLogMessage += "manageReservations: " + manageReservations + "\n";
		tracer.debug(scopeLogMessage);

		if (approveReservations && manageReservations) {
			role = "TCI_Admin";
		} else if (!approveReservations && manageReservations) {
			role = "TCI_User";
		}
		tracer.debug("role: %s", role);

		return res.type("application/json").status(200).send(JSON.stringify({
			loggedUserType: [
				role
			]
		}));
	});

	return router;
};