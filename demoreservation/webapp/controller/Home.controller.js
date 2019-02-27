sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
], function (BaseController, Filter, Sorter) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.Home", {

		onInit: function () {
			this.populateYear();
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
			this.initialFilter();
		},
		initialFilter: function () {
			this.getView().byId("zoneFilter").setSelectedKey("3000");
/*			var ZZZONE = new sap.ui.model.Filter("ZZZONE", sap.ui.model.FilterOperator.EQ, "3000");
			var finalFilter = new sap.ui.model.Filter({
				filters: ZZZONE,
				and: false
			});
			// // update list binding
			var list = this.getView().byId("idMyReservationsTable");
			var binding = list.getBinding("items");
			binding.filter(finalFilter, "Application");
*/		},
		onRouteMatched: function (oEvent) {
			// var idMyReservationsTable = this.byId("idMyReservationsTable");
			// var idAllReservationsTable = this.byId("idAllReservationsTable");
			// idMyReservationsTable.setVisible(true);
			// idAllReservationsTable.setVisible(false);
		},

		onListItemPress: function (oEvent) {
			var listItemContext = oEvent.getSource().getBindingContext();
			var selectedvguid = listItemContext.getProperty("VHVIN");
			this.doRoute("VehicleDetails",selectedvguid);
		},
		
		onReservationPress: function (oEvent){
			this.doRoute("Reservation");
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
		onUpdateFinished: function(oEvent) {
			// count and display number of nominations in Table Header title
			var sTitle, oTable = this.getView().byId("idMyReservationsTable");
			var title = this.getView().byId("tabTitle");
			sTitle = "Vehicle List";
			var lengthTotal = oTable.getBinding("items").getLength();
			title.setText(sTitle + " ("+lengthTotal+")");

		},
		onSearch: function (oEvent){
			var zoneFilter = this.getView().byId("zoneFilter").getSelectedKey();
			var seriesFilter = this.getView().byId("seriesFilter").getSelectedKey();
			var modelFilter = this.getView().byId("modelFilter").getSelectedKey();
			var yearFilter = this.getView().byId("yearFilter").getValue();
			var vinFilter = this.getView().byId("vinFilter").getValue();
			var inpStatus = this.getView().byId("inpStatus").getValue();

			var aFilters = [];
			var ZZZONE = new sap.ui.model.Filter("ZZZONE", sap.ui.model.FilterOperator.EQ, zoneFilter);
			var ZZSERIES = new sap.ui.model.Filter("ZZSERIES", sap.ui.model.FilterOperator.EQ, seriesFilter);
			var MATNR = new sap.ui.model.Filter("MATNR", sap.ui.model.FilterOperator.EQ, modelFilter);
			var ZZMOYR = new sap.ui.model.Filter("ZZMOYR", sap.ui.model.FilterOperator.EQ, yearFilter);
			var VHVIN = new sap.ui.model.Filter("VHVIN", sap.ui.model.FilterOperator.Contains, vinFilter);
			var Status = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.Contains, inpStatus);
			aFilters = [
				ZZZONE,
				ZZSERIES,
				MATNR,
				ZZMOYR,
				VHVIN,
				Status
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
			currYear = currYear -1;
			var a_moreFilter =[];
			for (var i = 0; i < 3; i++) {
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
				"Model",
				sap.ui.model.FilterOperator.Contains, sInputValue
			)]);

			// open value help dialog filtered by the input value
			this._valueHelpDialog.open(sInputValue);
		},
		
		_handleValueHelpSearch : function (evt) {
			var sValue = evt.getParameter("value");
			var oFilter = new Filter(
				"Model",
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
		},
		
		handleSortButtonPressed: function () {
			if (!this._sortDialog) {
				this._sortDialog = sap.ui.xmlfragment(
					"ca.toyota.demoreservation.demoreservation.fragments.SortDialog",
					this
				);
				this.getView().addDependent(this._sortDialog);
			}
			// open value help dialog filtered by the input value
			this._sortDialog.open();
			
	//		this.createViewSettingsDialog("ca.toyota.demoreservation.demoreservation.fragments.SortDialog").open();
		},
		handleSortDialogConfirm: function (oEvent) {
			var oTable = this.byId("idMyReservationsTable"),
				mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				sPath,
				bDescending,
				aSorters = [];

			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));

			// apply the selected sort and group settings
			oBinding.sort(aSorters);
		}

	});

});