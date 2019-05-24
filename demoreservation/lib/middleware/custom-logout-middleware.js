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
		var uaaRedirect = req.query["uaa-redirect"] === "true" || false;
		logoutProvider.callBackendLogoutPaths(req, app.get("mainRouterConfig"), session);
		logoutProvider.callServiceLogoutPaths(session);
		app.approuter.emit("logout", session);
		req.session.destroy();
		res.removeHeader("set-cookie");
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