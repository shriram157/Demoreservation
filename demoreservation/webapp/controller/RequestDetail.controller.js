sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.RequestDetail", {

		
		onInit: function () {
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		},
		
		onRouteMatched: function (oEvent) {
		},

		onNavButtonPress: function (oEvent) {
			this.doRoute("Home");
		}

	});

});