/* eslint new-cap: 0, no-console: 0, no-use-before-define: ["error", { "functions": false } ] */
/* eslint-env es6, node */

"use strict";

const express = require("express");
const utils = require("../../utils");

let router = null;
let apimService = null;

function getRouter() {
  if (!router) {
    router = express.Router({
      strict: true
    });
    apimService = utils.getService({
      // Get UPS name from env var UPS_NAME
      name: process.env.UPS_NAME
    });
    if (apimService.host.endsWith("/")) {
      apimService.host.slice(0, -1);
    }
    router.get("/", handleAppConfigRequest);
  }
  return router;
}

function handleAppConfigRequest(req, res, next) {
  if (req.originalUrl.slice(-1) === "/") {
    next();
  } else {
    res
      .type("application/json")
      .status(200)
      .send(JSON.stringify(apimService.appConfig || {}));
  }
}

module.exports = () => {
  return getRouter();
};
