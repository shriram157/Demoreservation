/* eslint new-cap: 0, no-console: 0, no-use-before-define: ["error", { "functions": false } ] */
/* eslint-env es6, node */

"use strict";

const apiProxy = require("./routes/api-proxy");
const appConfig = require("./routes/app-config");
const userDetails = require("./routes/user-details");

module.exports = (app, apiProxySecJson, mockRoleMappingsJson, roleMappingsJson) => {
  app.use("/node", apiProxy(apiProxySecJson, roleMappingsJson));
  app.use("/appConfig", appConfig());
  app.use("/userDetails", userDetails(mockRoleMappingsJson, roleMappingsJson));
};
