/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

var customLogoutMiddleware = require("./middleware/custom-logout-middleware.js");

module.exports = {
	insertMiddleware: {
		beforeRequestHandler: [{
			handler: customLogoutMiddleware
		}]
	}
};