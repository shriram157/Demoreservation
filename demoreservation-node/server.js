/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

var cors = require("cors");
var express = require("express");
var https = require("https");
var logging = require("@sap/logging");
var passport = require("passport");
var xsenv = require("@sap/xsenv");
var xssec = require("@sap/xssec");

var server = require("http").createServer();
var port = process.env.PORT || 3000;

// Initialize Express app and set up middleware
var app = express();

// Logging
var appContext = logging.createAppContext();
app.use(logging.middleware({
	appContext: appContext,
	logNetwork: true
}));
var logger = appContext.createLogContext().getLogger("/Application/Server");

// XSUAA
passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
	uaa: {
		tag: "xsuaa"
	}
}).uaa));
app.use(passport.initialize());
app.use(passport.authenticate("JWT", {
	session: false
}));

// CORS
app.use(cors());

// Router
var router = require("./router")(app, appContext);

// Start server
server.on("request", app);
server.listen(port, function () {
	logger.info("Server is listening on port %d", port);
});