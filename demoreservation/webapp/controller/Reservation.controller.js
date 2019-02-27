sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.Reservation", {

		onInit: function () {
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		},

		onRouteMatched: function (oEvent) {},

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