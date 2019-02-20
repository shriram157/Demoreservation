sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.VehicleDetails", {

		onInit: function () {
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		},
		
		onRouteMatched: function (oEvent) {
			
			var oArgs, oView, sPath;
			oArgs = oEvent.getParameter("arguments");
			oView = this.getView();
			sPath = "/ZCDS_DEMO_RESERVATION?$filter=VehicleIdentificationNumber eq '" + oArgs.vguid + "')";
			oView.bindElement({
				path: sPath,
				events: {
					dataRequested: function() {
						oView.setBusy(true);
					},
					dataReceived: function() {
						oView.setBusy(false);
					}
				}
			});
			
		},
		
		onNavButtonPress: function (oEvent) {
			this.doRoute("Home");
		}

	});

});