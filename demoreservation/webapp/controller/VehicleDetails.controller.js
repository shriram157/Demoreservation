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
			sPath = "VehicleDetailSet(VHVIN='" + VHVIN + "',Email='anubha_pandey@toyota.ca')?$expand=NAVFACOPTION,NAVDEALEROPTION",
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
					if(oData.ZRESREQ ===""){
						// Reservation request not exists for this vehicle, so enable "Reserve" button
						that.byId("btnReserve").setVisible(true);
						that.byId("btnEdit").setVisible(false);
						// no reservation exists
						that.byId("pageReservation").setVisible(false);
						that.byId("pageReservation").setTitle("No reservation exists");
					}else{
						// Reservation request exists for this vehicle, so enable "Edit" button
						that.byId("btnReserve").setVisible(false);
						that.byId("btnEdit").setVisible(true);
						that.byId("pageReservation").setVisible(true);
						that.byId("pageReservation").setTitle("Reservation Details");
					}
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