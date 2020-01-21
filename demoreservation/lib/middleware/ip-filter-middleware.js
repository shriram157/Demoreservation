/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

const ip = require("ip");

const ERR_RESP_CODE = 401;

let ipFilterBlacklist = [];
let ipFilterWhitelist = [];

// Format is comma-separated list of individual IPv4 addresses or IPv4 CIDR adddresses
// For the latter, see https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing
if (process.env.IP_FILTER_BLACKLIST) {
  ipFilterBlacklist = process.env.IP_FILTER_BLACKLIST.split(",").map(e =>
    e.trim()
  );
}
if (process.env.IP_FILTER_WHITELIST) {
  ipFilterWhitelist = process.env.IP_FILTER_WHITELIST.split(",").map(e =>
    e.trim()
  );
}

module.exports = (req, res, next) => {
  // Actual client IP is typically the first entry of x-forwarded-for header (from CF gorouter)
  let remoteAddr = req.headers["x-forwarded-for"]
    ? req.headers["x-forwarded-for"].split(",")[0].trim()
    : req.connection.remoteAddress;

  // Check whether IP is in blacklist and if so return error resp
  if (ipFilterBlacklist.some(e => ipMatches(e, remoteAddr))) {
    res.writeHead(ERR_RESP_CODE);
    res.end();
    return;
  }

  // Check whether IP is in whitelist and if not return error resp
  if (
    ipFilterWhitelist.length > 0 &&
    !ipFilterWhitelist.some(e => ipMatches(e, remoteAddr))
  ) {
    res.writeHead(ERR_RESP_CODE);
    res.end();
    return;
  }

  // IP is allowed, pass along to next middleware
  next();
};

function ipMatches(filter, ipAddress) {
  if (ip.isV4Format(filter)) {
    return ipAddress === filter;
  }
  try {
    return ip.cidrSubnet(filter).contains(ipAddress);
  } catch (err) {
    return false;
  }
}
