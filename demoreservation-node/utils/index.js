/* eslint new-cap: 0, no-console: 0, no-use-before-define: ["error", { "functions": false } ] */
/* eslint-env es6, node */

"use strict";

const xsenv = require("@sap/xsenv");

const RE_BOUNDARY = /^multipart\/.+?(?:;[ ]?boundary=(?:(?:"(.+)")|(?:([^\s]+))))$/i;
const RE_REPL_VAR = /\${(userInfo|userAttributes)\.([^{}]+)}/g;
const RE_REQ_OP = /^(GET|HEAD|POST|PUT|DELETE|CONNECT|OPTIONS|TRACE|PATCH) (.+) (HTTP\/[1-9](.[0-9]+)?)$/i;

exports.UNKNOWN_ROLE_NAME = "Unknown";

exports.getRoleName = (roleMappingsJson, authInfo) => {
  let authInfoScopes = authInfo.scopes.filter(e =>
    e.startsWith(authInfo.xsappname + ".")
  );
  let authInfoAttributes = authInfo.userAttributes;
  for (let i = 0; i < roleMappingsJson.roles.length; i++) {
    let role = roleMappingsJson.roles[i];
    let attributes = role.attributes || {};
    let scopes = role.scopes || [];
    scopes = scopes
      .filter(e => e.startsWith("$XSAPPNAME."))
      .map(e => e.replace("$XSAPPNAME.", authInfo.xsappname + "."));
    let hasAllScopes =
      authInfoScopes.length === scopes.length &&
      scopes.every(e => authInfoScopes.includes(e));
    let hasAllAttributes = Object.keys(attributes).every(
      key =>
        key in authInfoAttributes &&
        authInfoAttributes[key].length > 0 &&
        authInfoAttributes[key][0] === attributes[key]
    );
    if (hasAllScopes && hasAllAttributes) {
      return role.name;
    }
  }
  return null;
};

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

exports.headersValidForChangeSet = headers => {
  return (
    headers["content-type"] &&
    headers["content-type"][0].startsWith("multipart/mixed")
  );
};

exports.headersValidForOp = headers => {
  return (
    headers["content-type"] &&
    headers["content-type"][0] === "application/http" &&
    headers["content-transfer-encoding"] &&
    headers["content-transfer-encoding"][0] === "binary"
  );
};

exports.hasEqFilter = (ast, name, value, caseSensitive = false) => {
  if (ast.type === "eq") {
    // Value comparison is loose to account for data type differences
    return (
      ast.left.type === "property" &&
      ast.left.name === name &&
      ast.right.type === "literal" &&
      (caseSensitive
        ? String(ast.right.value).toLowerCase() === String(value).toLowerCase()
        : String(ast.right.value) === String(value))
    );
  } else if (ast.type === "and") {
    return (
      this.hasEqFilter(ast.left, name, value, caseSensitive) ||
      this.hasEqFilter(ast.right, name, value, caseSensitive)
    );
  }
  return false;
};

exports.isHeaderExcluded = (excludes, name) => {
  for (let i = 0; i < excludes.length; i++) {
    let exclude = excludes[i];
    if (name === exclude || new RegExp("^" + exclude + "$").test(name)) {
      return true;
    }
  }
  return false;
};

exports.parseBoundary = contentType => {
  let result = RE_BOUNDARY.exec(contentType);
  return result ? result[1] || result[2] : null;
};

exports.parseReqOp = reqOp => {
  let result = RE_REQ_OP.exec(reqOp);
  return result
    ? {
        method: result[1],
        path: result[2],
        version: result[3]
      }
    : null;
};

exports.replaceVars = (str, authInfo) => {
  let replacedStr = str;
  let regExp = new RegExp(RE_REPL_VAR);
  let matches = [];
  let match;
  while ((match = regExp.exec(str)) !== null) {
    // Add in reverse so we can replace from end to front without worrying about index shifts
    matches.unshift(match);
  }
  matches.forEach(e => {
    let varLength = e[0].length;
    let type = e[1];
    let name = e[2];
    let index = e.index;
    let value = null;
    if (type === "userInfo") {
      value = authInfo.userInfo[name];
    } else if (type === "userAttributes") {
      let values = authInfo.userAttributes[name];
      if (values !== null && values !== undefined && values.length > 0) {
        value = values[0];
      }
    }
    if (value !== null && value !== undefined) {
      replacedStr =
        replacedStr.substring(0, index) +
        value +
        replacedStr.substring(index + varLength, replacedStr.length);
    }
  });
  return replacedStr;
};
