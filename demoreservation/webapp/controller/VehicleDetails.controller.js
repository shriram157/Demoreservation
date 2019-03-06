sap.ui.define(["ca/toyota/demoreservation/demoreservation/controller/BaseController"], function (BaseController) {
	"use strict";
	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.VehicleDetails", {
		onInit: function () {
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		},
		onRouteMatched: function (oEvent) {
			var oArgs;
			oArgs = oEvent.getParameter("arguments");
			this.getVehicleData(oArgs.vguid);
		},
		onNavButtonPress: function (oEvent) {
			this.doRoute("Home");
		},
		_onEditPress: function (oEvent) {
			//	this.doRoute("RequestDetail");
			var vhvin = this.getView().getModel().getData().VehicleDetailSet.VHVIN;
			var Zresreq = this.getView().getModel().getData().VehicleDetailSet.ZRESREQ;
			if(Zresreq===""){
				// msg
			}else{
			this.doReqRoute("RequestDetail",vhvin,Zresreq);
			}

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
		_onCreatePress: function (oEvent) {
			var vhvin = this.getView().getModel().getData().VehicleDetailSet.VHVIN;
			this.doReqRoute("RequestDetail",vhvin,"C");
			// this.getOwnerComponent().getRouter().navTo("RequestDetail", {
			// 	vhvin: vhvin,
			// 	action: "C"
			// });
		}

	});
});