/* eslint new-cap: 0, no-console: 0, no-use-before-define: ["error", { "functions": false } ] */
/* eslint-env es6, node */

"use strict";

const xsenv = require("@sap/xsenv");
exports.getService = query => {
  let options = {};
  options = Object.assign(
    options,
    xsenv.getServices({
      service: query
    })
  );
  return options.service;
};
