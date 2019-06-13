sap.ui.define(["ca/toyota/demoreservation/demoreservation/controller/BaseController"], function (BaseController) {
	"use strict";
	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.VehicleDetails", {
		onInit: function () {
			//	this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("VehicleDetails").attachMatched(this.onRouteMatched, this);

		},
		onRouteMatched: function (oEvent) {
			var oArgs;
			oArgs = oEvent.getParameter("arguments");
			var oLocalModel = new sap.ui.model.json.JSONModel({
				enableEditBtn: false
			});
			this.getView().setModel(oLocalModel, "LocalModel");
			this.getVehicleData(oArgs.vguid);
		},
		onNavButtonPress: function (oEvent) {
			//	this.doRoute("Home");
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("Home");
		},
		_onEditPress: function (oEvent) {
			//	this.doRoute("RequestDetail");
			var vhvin = this.getView().getModel().getData().VehicleDetailSet.VHVIN;
			var Zresreq = this.getView().getModel().getData().VehicleDetailSet.ZRESREQ;
			if (Zresreq === "") {
				// msg
			} else {
				//	this.doReqRoute("RequestDetail",vhvin,Zresreq);
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("RequestDetail", {
					vhvin: vhvin,
					Zresreq: Zresreq
				});
			}

		},
		getVehicleData: function (VHVIN) {
			var email = sap.ui.getCore().getModel("UserDataModel").getData().Email;
			//testing
			//		email = "anubha_pandey@toyota.ca";
			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/";
			var that = this,
				sPath = "/VehicleDetailSet(VHVIN='" + VHVIN + "',Email='" + email + "')?$expand=NAVFACOPTION,NAVDEALEROPTION",
				//	var OrderChangeModel = that.getOwnerComponent().getModel("DemoOdataModel");
				oDetailModel = new sap.ui.model.odata.ODataModel(uri, true);
			//	oDetailModel = 	that.getOwnerComponent().getModel("DemoOdataModel");
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			// read OData model data into local JSON model 
			oDetailModel.read(sPath, {
				method: "GET",
				success: function (oData, oResponse) {
					var oJSONModel = new sap.ui.model.json.JSONModel();
					if (oData.No_edit != "X") {
						that.getView().getModel("LocalModel").setProperty("enableEditBtn", true);
					} else {
						that.getView().getModel("LocalModel").setProperty("enableEditBtn", false);
					}

					// extract Requestor type text
					var mod = that.getOwnerComponent().getModel("vehicles"),
						i,
						objR = mod.getContext("/FilterData/RequestorType").getObject();
					for (i = 0; i < objR.length; i++) {
						if (objR[i].key === oData.ZZREQTYP) {
							oData.ZZREQTYPTXT = objR[i].name;
						}
					}

					// extract Purchaser type text
					var objP = mod.getContext("/FilterData/PurchaserType").getObject();
					for (i = 0; i < objP.length; i++) {
						if (objP[i].key === oData.ZZPURTYP) {
							oData.ZZPURTYPTXT = objP[i].name;
						}
					}

					oJSONModel.setData({
						VehicleDetailSet: oData
					});
					if (oData.ZRESREQ === "") {
						// Reservation request not exists for this vehicle, so enable "Reserve" button
						that.byId("btnReserve").setVisible(true);
						that.byId("btnEdit").setVisible(false);
						// no reservation exists
						that.byId("pageReservation").setVisible(false);
						that.byId("pageReservation").setTitle("No reservation exists");
					} else {
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
			//	this.doReqRoute("RequestDetail",vhvin,"C");
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("RequestDetail", {
				vhvin: vhvin,
				Zresreq: "C"
			});

		}
	});
});