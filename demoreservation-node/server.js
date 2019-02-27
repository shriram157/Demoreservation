/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

var cors = require("cors");
var express = require("express");
var https = require("https");
var log = require("cf-nodejs-logging-support");
var passport = require("passport");
var xsenv = require("@sap/xsenv");
var xssec = require("@sap/xssec");

var server = require("http").createServer();
var port = process.env.PORT || 3000;

// Initialize Express app and set up middleware
var app = express();

// Logging
log.setLoggingLevel(process.env.LOG_LEVEL || "info");
app.use(log.logNetwork);

// XSUAA
passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
	uaa: {
		tag: "xsuaa"
	}
}).uaa));
// TODO: enable when security is implemented in UI
/*
app.use(passport.initialize());
app.use(passport.authenticate("JWT", {
	session: false
}));
*/

// CORS
app.use(cors());

// Router
var router = require("./router")(app, log);

// Start server
server.on("request", app);
server.listen(port, function () {
	log.logMessage("info", "Server is listening on port %d", port);
});