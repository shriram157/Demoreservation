/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"ca/toyota/demoreservation/demoreservation/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});