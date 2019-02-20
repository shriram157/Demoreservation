sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.Home", {

		onInit: function () {
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		},

		onRouteMatched: function (oEvent) {
			// var idMyReservationsTable = this.byId("idMyReservationsTable");
			// var idAllReservationsTable = this.byId("idAllReservationsTable");
			// idMyReservationsTable.setVisible(true);
			// idAllReservationsTable.setVisible(false);
		},

		onListItemPress: function (oEvent) {
			var listItemContext = oEvent.getSource().getBindingContext();
			var selectedvguid = listItemContext.getProperty("VehicleIdentificationNumber");
			this.doRoute("VehicleDetails",selectedvguid);
		},

		onSegmentedButtonPress: function (oEvent) {
			var pressedButtonKey = oEvent.getSource().getSelectedKey();
			var idMyReservationsTable = this.byId("idMyReservationsTable");
			var idAllReservationsTable = this.byId("idAllReservationsTable");
			if (pressedButtonKey === "myReservations") {
				idMyReservationsTable.setVisible(true);
				idAllReservationsTable.setVisible(false);
			} else if (pressedButtonKey === "allReservations") {
				idMyReservationsTable.setVisible(false);
				idAllReservationsTable.setVisible(true);
			}
		},
		
		onSearch: function (oEvent){
			var zoneFilter = this.getView().byId("zoneFilter").getSelectedKey();
			var seriesFilter = this.getView().byId("seriesFilter").getSelectedKey();
			var modelFilter = this.getView().byId("modelFilter").getSelectedKey();
			var resStatusFilter = this.getView().byId("resStatusFilter").getSelectedKey();
			var yearFilter = this.getView().byId("yearFilter").getValue();
			var vinFilter = this.getView().byId("vinFilter").getValue();

			var aFilters = [];
			var Zone1 = new sap.ui.model.Filter("Zone1", sap.ui.model.FilterOperator.EQ, zoneFilter);
			var ModelSeriesNo = new sap.ui.model.Filter("ModelSeriesNo", sap.ui.model.FilterOperator.EQ, seriesFilter);
			var VehicleModel = new sap.ui.model.Filter("VehicleModel", sap.ui.model.FilterOperator.EQ, modelFilter);
			var Zrstat = new sap.ui.model.Filter("Zrstat", sap.ui.model.FilterOperator.EQ, resStatusFilter);
			var ModelYear = new sap.ui.model.Filter("ModelYear", sap.ui.model.FilterOperator.EQ, yearFilter);
			var VehicleIdentificationNumber = new sap.ui.model.Filter("VehicleIdentificationNumber", sap.ui.model.FilterOperator.EQ, vinFilter);
			aFilters = [
				Zone1,
				ModelSeriesNo,
				VehicleModel,
				Zrstat,
				ModelYear,
				VehicleIdentificationNumber
			];
			var finalFilter = new sap.ui.model.Filter({
				filters: aFilters,
				and: true
			});
			// // update list binding
			var list = this.getView().byId("idMyReservationsTable");
			var binding = list.getBinding("items");
			binding.filter(finalFilter, "Application");

		}

	});

});