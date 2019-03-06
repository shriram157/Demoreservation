sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.Reservation", {

		onInit: function () {
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		},

		onRouteMatched: function (oEvent) {
			
		},
		getReservationData: function () {
			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
				sPath = "reservationList",
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
						ReservationListSet: oData
					});
					that.getView().setModel(oJSONModel);
					that.getView().byId("tabRservation").setModel(oJSONModel);
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
		onReservationInfoPress: function (oEvent) {
			if (!this.dlgSGroup) {
				this.dlgSGroup = sap.ui.xmlfragment("reservationInfoFragment",
					"ca.toyota.demoreservation.demoreservation.view.fragments.ReservationInfo",
					this
				);
				this.getView().addDependent(this.dlgSGroup);
			}
			this.dlgSGroup.open();
		},
		
		onApprovePress: function (oEvent) {
			if (!this.dlgSGroup2) {
				this.dlgSGroup2 = sap.ui.xmlfragment("adminSectionFragment",
					"ca.toyota.demoreservation.demoreservation.view.fragments.AdminSection",
					this
				);
				this.getView().addDependent(this.dlgSGroup2);
			}
			this.dlgSGroup2.open();
		},


		onCloseDialog: function (oEvent) {
			oEvent.getSource().getParent().close();
		}

	});

});