/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

module.exports = function (appContext) {
	var express = require("express");
	var request = require("request");
	var xsenv = require("@sap/xsenv");

	var router = express.Router();
	var routerTracer = appContext.createLogContext().getTracer(__filename);

	// TODO: provide service name via environment variable instead
	var apimServiceName = "DEMO_RESERVATION_APIM_CUPS";
	var options = {};
	options = Object.assign(options, xsenv.getServices({
		apim: {
			name: apimServiceName
		}
	}));
	routerTracer.debug("Properties of APIM user-provided service '%s' : %s", apimServiceName, JSON.stringify(options));

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

		// If there is no user type, it is most probably a call from Neo, in which case we can fake the data as a dealer with code 42120
		if (!userAttributes.UserType) {
			userAttributes = {
				DealerCode: ["42120"],
				Language: ["English"],
				UserType: ["National"]
			};
			tracer.debug("JWT likely refers to a development user from Neo, switch to mock user attributes: %s", JSON.stringify(userAttributes));
		}

		var resBody = {
			"attributes": [],
			"userProfile": userProfile,
			"samlAttributes": userAttributes,
			legacyDealer: "",
			legacyDealerName: ""
		};

		var userType = userAttributes.UserType[0];
		var dealerCode = null;
		var zone = null;
		var bpZone = null;
		var bpReqUrl = null;

		// Dealer user
		if (userType === "Dealer") {
			dealerCode = userAttributes.DealerCode[0];
			bpReqUrl = url + "/API_BUSINESS_PARTNER/A_BusinessPartner?sap-client=" + s4Client + "&$format=json&$filter=SearchTerm2 eq '" +
				dealerCode + "'&$expand=to_Customer";
		}

		// Zone user
		else if (userType === "Zone") {
			zone = userAttributes.Zone[0];
			if (zone === "1") {
				bpZone = "1000";
			} else if (zone === "2") {
				bpZone = "2000";
			} else if (zone === "3") {
				bpZone = "3000";
			} else if (zone === "4") {
				bpZone = "5000";
			} else if (zone === "5") {
				bpZone = "4000";
			} else if (zone === "7") {
				bpZone = "9000";
			} else {
				logger.warning("Unrecognized zone ID: %s", zone);
				return res.type("plain/text").status(500).send("Unknown zone ID.");
			}

			bpReqUrl = url + "/API_BUSINESS_PARTNER/A_BusinessPartner?sap-client=" + s4Client + "&$format=json" +
				"&$expand=to_Customer/to_CustomerSalesArea&$filter=BusinessPartnerType eq 'Z001' and zstatus ne 'X'" +
				"&$orderby=BusinessPartner asc";
		}

		// National user (TCI user)
		else {
			bpReqUrl = url + "/API_BUSINESS_PARTNER/A_BusinessPartner?sap-client=" + s4Client + "&$format=json" +
				"&$expand=to_Customer&$filter=BusinessPartnerType eq 'Z001' and zstatus ne 'X'&$orderby=BusinessPartner asc";
		}

		tracer.debug("BP URL: %s", bpReqUrl);
		var bpReqHeaders = {
			"APIKey": APIKey,
			"Authorization": "Basic " + new Buffer(s4User + ":" + s4Password).toString("base64"),
			"Content-Type": "application/json"
		};
		request({
			url: bpReqUrl,
			headers: bpReqHeaders
		}, function (bpErr, bpRes, bpResBodyStr) {
			var toCustomerAttr1 = null;
			var bpAttributes = null;

			tracer.debug("Response body from proxied BP call: %s", bpResBodyStr);

			if (!bpErr && bpRes.statusCode === 200) {
				var bpResBody = JSON.parse(bpResBodyStr);
				var bpResults = bpResBody.d.results;

				// Filter BP results by sales area for zone user
				if (userType === "Zone") {
					bpResults = bpResults.filter(o => {
						if (!o.to_Customer) {
							return false;
						}
						var customerSalesArea = o.to_Customer.to_CustomerSalesArea;
						if (!customerSalesArea) {
							return false;
						}
						for (var i = 0; i < customerSalesArea.results.length; i++) {
							if (customerSalesArea.results[i].SalesOffice === bpZone) {
								return true;
							}
						}
						return false;
					});
				}

				for (var i = 0; i < bpResults.length; i++) {
					var bpLength = bpResults[i].BusinessPartner.length;
					bpAttributes = {
						BusinessPartnerName: bpResults[i].OrganizationBPName1,
						BusinessPartnerKey: bpResults[i].BusinessPartner,
						BusinessPartner: bpResults[i].BusinessPartner.substring(5, bpLength),
						BusinessPartnerType: bpResults[i].BusinessPartnerType,
						SearchTerm2: bpResults[i].SearchTerm2
					};
					try {
						toCustomerAttr1 = bpResults[i].to_Customer.Attribute1;
					} catch (e) {
						logger.error("The Data is sent without Attribute value for the BP: %s", bpResults[i].BusinessPartner);
					}

					if (toCustomerAttr1 === "01") {
						// Toyota dealer
						bpAttributes.Division = "10";
						bpAttributes.Attribute = "01";
					} else if (toCustomerAttr1 === "02") {
						// Lexus dealer
						bpAttributes.Division = "20";
						bpAttributes.Attribute = "02";
					} else if (toCustomerAttr1 === "03") {
						// Dual (Toyota + Lexus) dealer
						bpAttributes.Division = "Dual";
						bpAttributes.Attribute = "03";
					} else if (toCustomerAttr1 === "04") {
						bpAttributes.Division = "10";
						bpAttributes.Attribute = "04";
					} else if (toCustomerAttr1 === "05") {
						bpAttributes.Division = "Dual";
						bpAttributes.Attribute = "05";
					} else {
						// Set as Toyota dealer as fallback
						bpAttributes.Division = "10";
						bpAttributes.Attribute = "01";
					}

					if (userType === "Dealer") {
						if (bpAttributes.BusinessPartner === dealerCode || bpAttributes.SearchTerm2 === dealerCode) {
							resBody.legacyDealer = bpAttributes.BusinessPartner;
							resBody.legacyDealerName = bpAttributes.BusinessPartnerName;
							resBody.attributes.push(bpAttributes);

							// Dealer should only return one BP result anyway, but break here just in case
							break;
						}
					} else {
						resBody.attributes.push(bpAttributes);
					}
				}
				tracer.debug("Response body: %s", JSON.stringify(resBody));
				return res.type("application/json").status(200).send(resBody);
			} else {
				logger.error("Proxied BP call %s FAILED: %s", bpReqUrl, bpErr);
				return res.type("application/json").status(400).send(bpResBody);
			}
		});
	});

	router.get("/currentScopesForUser", (req, res) => {
		var logger = req.loggingContext.getLogger("/Application/Route/UserDetails/CurrentScopesForUser");
		var tracer = req.loggingContext.getTracer(__filename);
		var xsAppName = xsuaaService.xsappname;
		var scopes = req.authInfo.scopes;
		var userAttributes = req.authInfo.userAttributes;

		tracer.debug("Scopes from JWT: %s", JSON.stringify(scopes));
		tracer.debug("User attributes from JWT: %s", JSON.stringify(userAttributes));

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