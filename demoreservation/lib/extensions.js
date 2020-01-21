/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

const customLogoutMiddleware = require("./middleware/custom-logout-middleware.js");
const ipFilterMiddleware = require("./middleware/ip-filter-middleware.js");

module.exports = {
  insertMiddleware: {
    first: [
      {
        handler: ipFilterMiddleware
      }
    ],
    beforeRequestHandler: [
      {
        handler: customLogoutMiddleware
      }
    ]
  }
};
