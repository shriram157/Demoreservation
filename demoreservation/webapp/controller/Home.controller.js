sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController",
	"sap/ui/model/Filter"
], function (BaseController, Filter) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.Home", {

		onInit: function () {
			this.populateYear();
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
		//	var Zrstat = new sap.ui.model.Filter("Zrstat", sap.ui.model.FilterOperator.EQ, resStatusFilter);
			var ModelYear = new sap.ui.model.Filter("ModelYear", sap.ui.model.FilterOperator.EQ, yearFilter);
			var VehicleIdentificationNumber = new sap.ui.model.Filter("VehicleIdentificationNumber", sap.ui.model.FilterOperator.EQ, vinFilter);
			aFilters = [
				Zone1,
				ModelSeriesNo,
				VehicleModel,
		//		Zrstat,
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

		},
		
		populateYear: function(){
			var yearFilter = new sap.ui.model.json.JSONModel();
			var today = new Date();
			var currYear = today.getFullYear();
			currYear = currYear -2;
			var a_moreFilter =[];
			for (var i = 0; i < 10; i++) {
				var oNewFilter = {
					dkey: currYear,
					dtext: currYear
				};
				a_moreFilter.push(oNewFilter);
				currYear++;
			}
			yearFilter.setData(a_moreFilter);
			this.getView().byId("yearFilter").setModel(yearFilter,"YearModel");
		},
		
		handleModelValueHelp : function (oEvent) {
			var sInputValue = oEvent.getSource().getValue();

			this.inputId = oEvent.getSource().getId();
			// create value help dialog
			if (!this._valueHelpDialog) {
				this._valueHelpDialog = sap.ui.xmlfragment(
					"ca.toyota.demoreservation.demoreservation.fragments.ModelSearch",
					this
				);
				this.getView().addDependent(this._valueHelpDialog);
			}

			// create a filter for the binding
			this._valueHelpDialog.getBinding("items").filter([new Filter(
				"ModelDescriptionEN",
				sap.ui.model.FilterOperator.Contains, sInputValue
			)]);

			// open value help dialog filtered by the input value
			this._valueHelpDialog.open(sInputValue);
		},
		
		_handleValueHelpSearch : function (evt) {
			var sValue = evt.getParameter("value");
			var oFilter = new Filter(
				"ModelDescriptionEN",
				sap.ui.model.FilterOperator.Contains, sValue
			);
			evt.getSource().getBinding("items").filter([oFilter]);
		},

		_handleValueHelpClose : function (evt) {
			var oSelectedItem = evt.getParameter("selectedItem");
			if (oSelectedItem) {
				var modelInput = this.byId(this.inputId),
				//	oText = this.byId('selectedKey'),
					sDescription = oSelectedItem.getDescription();

				modelInput.setSelectedKey(sDescription);
			//	oText.setText(sDescription);
			}
			evt.getSource().getBinding("items").filter([]);
		},

		suggestionItemSelected: function (evt) {

			var oItem = evt.getParameter('selectedItem'),
			//	oText = this.byId('selectedKey'),
				sKey = oItem ? oItem.getKey() : '';

		//	oText.setText(sKey);
		}


	});

});