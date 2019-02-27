sap.ui.define(["ca/toyota/demoreservation/demoreservation/controller/BaseController"], function (BaseController) {
	"use strict";
	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.VehicleDetails", {
		onInit: function () {
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		},
		onRouteMatched: function (oEvent) {
			var oArgs, oView, sPath;
			oArgs = oEvent.getParameter("arguments");
			oView = this.getView();
			//	sPath = "/vehicleListSet('2T3DFREV7JW698726')";
			sPath = "VehicleDetailSet(VHVIN='" + oArgs.vguid + "')?$expand=NAVFACOPTION,NAVDEALEROPTION";
			oView.bindElement({
				path: sPath,
				events: {
					dataRequested: function () {
						oView.setBusy(true);
					},
					dataReceived: function () {
						oView.setBusy(false);
					}
				}
			});
			this.getVehicleData(oArgs.vguid);
		},
		onNavButtonPress: function (oEvent) {
			this.doRoute("Home");
		},
		_onButtonPress: function (oEvent) {
			this.doRoute("RequestDetail");
		},
		getVehicleData: function (VHVIN) {
			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
				sPath = "VehicleDetailSet(VHVIN='" + VHVIN + "')?$expand=NAVFACOPTION,NAVDEALEROPTION",
				oDetailModel = new sap.ui.model.odata.ODataModel(uri, true),
				that = this;
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			// read OData model data into local JSON model 
			oDetailModel.read(sPath, {
				method: "GET",
				success: function (oData, oResponse) {
					var oJSONModel = new sap.ui.model.json.JSONModel();
					oJSONModel.setData({
						VehicleDetailSet: oData
					});
					that.getView().setModel(oJSONModel);
					that.getView().byId("listFacOption").setModel(oJSONModel);
					// release busy indicator
					oBusyDialog.close();
				},
				error: function (oError) {
					//alert("Error!");
					// release busy indicator
					oBusyDialog.close();
				}
			});
		},
		/**
		 *@memberOf ca.toyota.demoreservation.demoreservation.controller.VehicleDetails
		 */
		action: function (oEvent) {
			this.doRoute("RequestDetail");
		}
	});
});