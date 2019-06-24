/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

var dynamicRoutingUtils = require("@sap/approuter/lib/utils/dynamic-routing-utils");
var logoutProvider = require("@sap/approuter/lib/middleware/logout-provider");

module.exports = function (req, res, next) {
	if (req.method === 'GET' && req.routerConfig.appConfig.logout && req.routerConfig.appConfig.logout.logoutEndpoint && dynamicRoutingUtils.getCoreUrl(
			req).split("?").shift() === "/custom" + req.routerConfig.appConfig.logout.logoutEndpoint) {
		var app = req.app;
		var session = Object.assign({
			id: req.session.id
		}, req.session);

		// Default is to redirect to UAA
		var uaaRedirect = true;
		if (req.query["uaa-redirect"] === "false") {
			uaaRedirect = false;
		}

		logoutProvider.callBackendLogoutPaths(req, app.get("mainRouterConfig"), session);
		logoutProvider.callServiceLogoutPaths(session);
		app.approuter.emit("logout", session);
		req.session.destroy();
		res.removeHeader("set-cookie");

		// Clear SMADSESSION cookie, which is used by SiteMinder Federation to keep track of session, as a workaround to
		// invalidating SAML session without SAML SLO. The assumption is that the cookie is always named SMADESSION, and
		// that it is assigned to the .toyota.ca domain so that this code, which runs at the .scp.toyota.ca custom
		// domain, can overwrite it. If the app is in the default *.ondemand.com domain, this will NOT work!
		res.setHeader("Set-Cookie", "SMADSESSION=LOGGEDOFF; path=/; HttpOnly; domain=.toyota.ca; expires=Thu, 01 Jan 1970 00:00:00 GMT");

		if (uaaRedirect) {
			logoutProvider.triggerUAARedirect(req, res, function (err) {
				if (err) {
					throw err;
				}
			});
		} else {
			// Skip UAA logout + redirect and return simple 200 response instead
			res.writeHead(200);
			res.end();
		}
	} else {
		next();
	}
}