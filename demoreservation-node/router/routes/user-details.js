/* eslint new-cap: 0, no-console: 0, no-use-before-define: ["error", { "functions": false } ] */
/* eslint-env es6, node */

"use strict";

const express = require("express");
const utils = require("../../utils");

let router = null;
let mockRoleMappingsJson = null;
let roleMappingsJson = null;
let apimService = null;
let mockUserMode = false;
let mockUserOrigin = null;
let mockRoleName = null;

function getRouter(aMockRoleMappingsJson, aRoleMappingsJson) {
  if (!router) {
    router = express.Router();
    mockRoleMappingsJson = aMockRoleMappingsJson;
    roleMappingsJson = aRoleMappingsJson;
    apimService = utils.getService({
      // Get UPS name from env var UPS_NAME
      name: process.env.UPS_NAME
    });
    if (apimService.host.endsWith("/")) {
      apimService.host.slice(0, -1);
    }
    mockUserMode =
      process.env.MOCK_USER_MODE &&
      process.env.MOCK_USER_MODE.toLowerCase() === "true";
    mockUserOrigin = process.env.MOCK_USER_ORIGIN;
    mockRoleName = process.env.MOCK_ROLE_NAME;

    router.get("/attributes", handleAttributesRequest);
    router.get("/currentScopesForUser", handleCurrentScopesForUserRequest);
  }
  return router;
}

function handleAttributesRequest(req, res, next) {
  let logger = req.loggingContext.getLogger(
    "/Application/Route/UserDetails/Attributes"
  );
  let tracer = req.loggingContext.getTracer(__filename);

  let userProfile = req.authInfo.userInfo;
  let userAttributes = req.authInfo.userAttributes;
  tracer.debug("User profile from JWT: %s", JSON.stringify(userProfile));
  tracer.debug("User attributes from JWT: %s", JSON.stringify(userAttributes));

  // If there is no user type, it is most probably a call from Neo, in which case we can fake the data as TCI user
  if (mockUserMode && mockUserOrigin === req.authInfo.origin) {
    let mockRole = mockRoleMappingsJson.mockRoles.find(
      e => e.name === mockRoleName
    );
    userAttributes = mockRole ? mockRole.mockData.attributes : {};
    Object.keys(userAttributes).forEach(key => {
      userAttributes[key] = utils.replaceVars(
        userAttributes[key],
        req.authInfo
      );
    });
    tracer.debug(
      "Mock user mode is enabled and JWT is from origin %s, switch to mock user attributes: %s",
      req.authInfo.origin,
      JSON.stringify(userAttributes)
    );
  }
  let resBody = {
    userProfile: userProfile,
    samlAttributes: userAttributes
  };
  tracer.debug("Response body: %s", JSON.stringify(resBody));
  return res
    .type("application/json")
    .status(200)
    .send(resBody);
}

function handleCurrentScopesForUserRequest(req, res, next) {
  let logger = req.loggingContext.getLogger(
    "/Application/Route/UserDetails/CurrentScopesForUser"
  );
  let tracer = req.loggingContext.getTracer(__filename);

  let roleName = null;

  // If there is no user type, it is most probably a call from Neo, in which case we can fake the data as TCI user
  if (mockUserMode && mockUserOrigin === req.authInfo.origin) {
    tracer.debug(
      "Mock user mode is enabled and JWT is from origin %s, switch to mock user type.",
      req.authInfo.origin
    );
    let mockRole = mockRoleMappingsJson.mockRoles.find(
      e => e.name === mockRoleName
    );
    if (mockRole) {
      roleName = mockRole.mockData.name;
    }
  } else {
    roleName = utils.getRoleName(roleMappingsJson, req.authInfo);
  }
  return res
    .type("application/json")
    .status(200)
    .send(
      JSON.stringify({
        loggedUserType: [roleName ? roleName : utils.UNKNOWN_ROLE_NAME]
      })
    );
}

module.exports = (aMockRoleMappingsJson, aRoleMappingsJson) => {
  return getRouter(aMockRoleMappingsJson, aRoleMappingsJson);
};