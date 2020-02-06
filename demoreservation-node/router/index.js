/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

var apiProxy = require("./routes/api-proxy");
var appConfig = require("./routes/app-config");
var userDetails = require("./routes/user-details");

module.exports = (app, appContext) => {
  app.use("/node", apiProxy(appContext));
  app.use("/appConfig", appConfig());
  app.use("/userDetails", userDetails(appContext));
};
