/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

const apiProxy = require("./routes/api-proxy");
const appConfig = require("./routes/app-config");
const userDetails = require("./routes/user-details");

module.exports = (app, apiProxySecJson, roleMappingsJson) => {
  app.use("/node", apiProxy(apiProxySecJson, roleMappingsJson));
  app.use("/appConfig", appConfig());
  app.use("/userDetails", userDetails());
};