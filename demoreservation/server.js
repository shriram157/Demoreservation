/*eslint new-cap: 0, no-console: 0, no-shadow: 0, no-unused-vars: 0*/
/*eslint-env es6, node*/

"use strict";

const approuter = require("@sap/approuter");

let instance = approuter();

let logNetwork = process.env.XS_LOG_NETWORK === "true";
instance.first.use((req, res, next) => {
	if (logNetwork && req.loggingContext) {
		req.loggingContext.enableNetworkLog(res);
	}
	console.log("Headers Before"+ JSON.stringify(req.headers));
	if(req.headers["accept-encoding"] && req.headers["accept-encoding"].includes(", br"))
	{
		req.headers["accept-encoding"] = req.headers["accept-encoding"].replace(", br","");
	}
	console.log("Headers After"+ JSON.stringify(req.headers));
	next();
});

instance.start({
	extensions: [require("./lib/extensions.js")]
});
