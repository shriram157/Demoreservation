/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

const cors = require("cors");
const express = require("express");
const fs = require("fs");
const http = require("http");
const logging = require("@sap/logging");
const passport = require("passport");
const path = require("path");
const xsenv = require("@sap/xsenv");
const xssec = require("@sap/xssec");

const DEFAULT_ENCODING = "utf-8";

const router = require("./router");

const server = http.createServer();
let port = process.env.PORT || 3000;

// Initialize Express app and set up middleware
let app = express();

// Logging
let appContext = logging.createAppContext();
app.use(
  logging.middleware({
    appContext: appContext,
    logNetwork: process.env.XS_LOG_NETWORK === "true"
  })
);
let logger = appContext.createLogContext().getLogger("/Application/Server");

// XSUAA
passport.use(
  "JWT",
  new xssec.JWTStrategy(
    xsenv.getServices({
      uaa: {
        tag: "xsuaa"
      }
    }).uaa
  )
);
app.use(passport.initialize());
app.use(
  passport.authenticate("JWT", {
    session: false
  })
);

// CORS
app.use(cors());

// Load configuration files
let apiProxySecJson = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "api-proxy-security.json"),
    DEFAULT_ENCODING
  )
);

let roleMappingsJson = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "role-mappings.json"),
    DEFAULT_ENCODING
  )
);

// Router
router(app, apiProxySecJson, roleMappingsJson);

// Start server
server.on("request", app);
server.listen(port, function() {
  logger.info("Server is listening on port %d", port);
});