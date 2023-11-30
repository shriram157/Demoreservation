sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"sap/ui/model/json/JSONModel"
], function (BaseController, Filter, Sorter, JSONModel) {
	"use strict";
	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.Home", {

		onInit: function () {
			
			this.getOwnerComponent().getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		},

		getAllVehicleData: function (callback) {
			var that = this;
			var skip = 0;
			var results = [];

			function processPages(retItems) {
				if (!retItems || retItems.length <= 0) {
					callback(results);
				} else {
					results = results.concat(retItems);
					that.getVehiclesStream(results.length, processPages);
				}
			}

			that.getVehiclesStream(skip, processPages);
		},
		getVehiclesStream: function (skip, callback) {
			var that = this,
				uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02",
				sPath;

			if (that.UserData.getProperty("/Type") == "TCI_User") {
				sPath = "/vehicleListSet?$filter=Emp eq 'E'";
			} else {
				sPath = "/vehicleListSet?$filter=Emp eq ''";
			}
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			var oDetailModel = new sap.ui.model.odata.ODataModel(uri, true);
			oDetailModel.read(sPath, {
				urlParameters: {
					"$skip": skip,
					"$top": 10
				},
				success: function (oData, oResponse) {
					oBusyDialog.close();
					if (!!oData && !!oData.results) {
						callback(oData.results);
					} else {
						callback([]);
					}
				},
				error: function (err) {
					oBusyDialog.close();
					callback([]);
				}
			});
		},
		amountFormatter: function (val) {
			if (val !== "" && val !== null && val != undefined) {
				val = val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
				return "$" + val;
			} else {
				return "";
			}
		},
		initialFilter: function () {
		//	this.getView().byId("zoneFilter").setSelectedKey("3000");
		},
		onRouteMatched: function (oEvent) {
		
		
			this.populateYear();
			//	this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
			this.initialFilter();
			this.initAppConfig();
			this.initSecurity();
			//changes by Swetha for testing.
			var that = this,
				uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02",
				sPath;
			if (that.UserData.getProperty("/Type") == "TCI_User") {
				sPath = "/RegionSet;
			} else {
				sPath = "/RegionSet;
			}
			var oTestModel = new sap.ui.model.odata.ODataModel(uri, true);
			oTestModel.read(sPath, {
				
				success: function (oData, oResponse) {
					
					if (!!oData && !!oData.results) {
						callback(oData.results);
					} else {
						callback([]);
					}
				},
				error: function (err) {
					
					callback([]);
				}
			});
			//changes by Swetha for testing
		},

		onListItemPress: function (oEvent) {
			var listItemContext = oEvent.getSource().getBindingContext("DemoModel");
			var selectedvin = listItemContext.getProperty("VHVIN");
			this.getView().getModel("localDataModel").setProperty("/Screen1", {
				"VHVIN": selectedvin
			});
			//	this.doRoute("VehicleDetails",selectedvin);
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("VehicleDetails", {
				vguid: selectedvin
			});
		},

		onMyReservationPress: function (oEvent) {
			//	this.doReserveRoute("Reservation",false);
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("Reservation", {
				admin: false
			});
		},
		onAllReservationPress: function (oEvent) {
			//	this.doReserveRoute("Reservation",true);
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("Reservation", {
				admin: true
				
				
			});
		},
		onUpdateFinished: function (oEvent) {
			// count and display number of nominations in Table Header title
			var sTitle, oTable = this.getView().byId("idMyReservationsTable");
			var title = this.getView().byId("tabTitle");
			sTitle = "Vehicle List";
			var lengthTotal = oTable.getBinding("items").getLength();
			title.setText(sTitle + " (" + lengthTotal + ")");
		},

		onSelectChange: function (oEvent) {
			// debugger;
			if (oEvent.getParameters().newValue != "") {
				this.onSearch(oEvent);
			} else {
				this.onReset(oEvent);
			}
		},
		onReset: function (oEvent) {
			this.getView().byId("seriesFilter").setSelectedKey();
			this.getView().byId("suffixFilter").setValue();
			this.getView().byId("modelFilter").setValue();
			this.getView().byId("yearFilter").setValue();
			this.getView().byId("vinFilter").setValue();
			this.getView().byId("inpStatus").setValue();
			this.getView().byId("ReserverFilter").setValue();
		    this.getView().byId("ReserverFilter").setValue();
			var aFilters = [];
			aFilters = new sap.ui.model.Filter(aFilters, true);
			// // update list binding
			var list = this.getView().byId("idMyReservationsTable");
			var binding = list.getBinding("items");
			binding.filter(aFilters, "Application");
		},
		onSearch: function (oEvent) {
			var zoneFilter = this.getView().byId("zoneFilter").getSelectedKey();
			var regionFilter = this.getView().byId("regionFilter").getSelectedKey();           //changes by swetha for DMND0004168 on 1st Nov, 2023
			var seriesFilter = this.getView().byId("seriesFilter").getSelectedKey();
			var suffixFilter = this.getView().byId("suffixFilter").getValue();
			var modelFilter = this.getView().byId("modelFilter").getValue();
			var yearFilter = this.getView().byId("yearFilter").getValue();
			var vinFilter = this.getView().byId("vinFilter").getValue().toUpperCase();
			var inpStatus = this.getView().byId("inpStatus").getValue();
			var ReserverFilter = this.getView().byId("ReserverFilter").getValue().toUpperCase();
			///////Added by Pradeep Sharma
			var DriverFilter = this.getView().byId("DriverFilter").getValue().toUpperCase();
			//////

			if (inpStatus === "All") { // If Status selected All, send blank value in filter
				inpStatus = "";
			}

			var aFilters = [];
			var ZZZONE = new sap.ui.model.Filter("ZZZONE", sap.ui.model.FilterOperator.EQ, zoneFilter, true);
			var Regio = new sap.ui.model.Filter("Regio", sap.ui.model.FilterOperator.Contains, regionFilter, true); //changes by swetha for DMND0004168 on 1st Nov, 2023
			var ZZSERIES = new sap.ui.model.Filter("ZZSERIES", sap.ui.model.FilterOperator.EQ, seriesFilter, true);
			var MATNR = new sap.ui.model.Filter("MATNR", sap.ui.model.FilterOperator.EQ, modelFilter, true);
			var ZZMOYR = new sap.ui.model.Filter("ZZMOYR", sap.ui.model.FilterOperator.EQ, yearFilter, true);
			var VHVIN = new sap.ui.model.Filter("VHVIN", sap.ui.model.FilterOperator.Contains, vinFilter, true);
			var Status = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, inpStatus, true);
			var ZZSUFFIX = new sap.ui.model.Filter("ZZSUFFIX", sap.ui.model.FilterOperator.EQ, suffixFilter, true);
			var Reserver = new sap.ui.model.Filter("Reserver", sap.ui.model.FilterOperator.EQ, ReserverFilter, true);
			var Driver = new sap.ui.model.Filter("Driver", sap.ui.model.FilterOperator.Contains, DriverFilter, true);
			aFilters = [
				ZZZONE,
				Regio,             //changes by swetha for DMND0004168 on 1st Nov, 2023
				ZZSERIES,
				MATNR,
				ZZMOYR,
				VHVIN,
				Status,
				ZZSUFFIX,
				Reserver,
				Driver
			];
			// $.each(aFilters, function (key, value) {
			aFilters = aFilters.filter(function (val) {
				return val.oValue1 !== "";
			});

			// });
			aFilters = new sap.ui.model.Filter(aFilters, true);
			// // update list binding
			var list = this.getView().byId("idMyReservationsTable");
			var binding = list.getBinding("items");
			binding.filter(aFilters, "Application");
		},

		populateYear: function () {
			var yearFilter = new sap.ui.model.json.JSONModel();
			var today = new Date();
			var currYear = today.getFullYear();
			currYear = currYear - 1;
			var a_moreFilter = [];
			for (var i = 0; i < 3; i++) {
				var oNewFilter = {
					dkey: currYear,
					dtext: currYear
				};
				a_moreFilter.push(oNewFilter);
				currYear++;
			}
			yearFilter.setData(a_moreFilter);
			this.getView().byId("yearFilter").setModel(yearFilter, "YearModel");
		},

		handleSuffixValueHelp: function (oEvent) {
			var sInputValue = oEvent.getSource().getValue();

			this.inputId = oEvent.getSource().getId();
			// create value help dialog
			if (!this._valueHelpDialogSuf) {
				this._valueHelpDialogSuf = sap.ui.xmlfragment(
					"ca.toyota.demoreservation.demoreservation.fragments.SuffixSearch",
					this
				);
				this.getView().addDependent(this._valueHelpDialogSuf);
			}
			// create a filter for the binding
			var aFilters = [];
			var series = new sap.ui.model.Filter("tci_series", sap.ui.model.FilterOperator.EQ, this.getView().byId("seriesFilter").getSelectedKey());
			var year = new sap.ui.model.Filter("model_year", sap.ui.model.FilterOperator.EQ, this.getView().byId("yearFilter").getValue());
			var model = new sap.ui.model.Filter("model", sap.ui.model.FilterOperator.EQ, this.getView().byId("modelFilter").getValue());
			aFilters = [
				series,
				year,
				model
			];
			var finalFilter = new sap.ui.model.Filter({
				filters: aFilters,
				and: true
			});
			this._valueHelpDialogSuf.getBinding("items").filter(finalFilter, "Application");

			// open value help dialog filtered by the input value
			this._valueHelpDialogSuf.open(sInputValue);
		},
		_handleValueHelpSearchSuf: function (evt) {
			var sValue = evt.getParameter("value");
			var oFilter = new Filter(
				"suffix",
				sap.ui.model.FilterOperator.Contains, sValue
			);
			evt.getSource().getBinding("items").filter([oFilter]);
		},

		_handleValueHelpCloseSuf: function (evt) {
			var oSelectedItem = evt.getParameter("selectedItem");
			if (oSelectedItem) {
				var suffixInput = this.byId(this.inputId),
					sDescription = oSelectedItem.getDescription();
				suffixInput.setValue(sDescription);
			}
			evt.getSource().getBinding("items").filter([]);
			// this.destroy();
		},

		handleModelValueHelp: function (oEvent) {
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
			var aFilters = [];
			var series = new sap.ui.model.Filter("tci_series", sap.ui.model.FilterOperator.EQ, this.getView().byId("seriesFilter").getSelectedKey());
			var year = new sap.ui.model.Filter("model_year", sap.ui.model.FilterOperator.EQ, this.getView().byId("yearFilter").getValue());
			aFilters = [
				series,
				year
			];
			var finalFilter = new sap.ui.model.Filter({
				filters: aFilters,
				and: true
			});
			this._valueHelpDialog.getBinding("items").filter(finalFilter, "Application");

			// open value help dialog filtered by the input value
			this._valueHelpDialog.open(sInputValue);
		},

		_handleValueHelpSearch: function (evt) {
			var sValue = evt.getParameter("value");
			var oFilter = new Filter(
				"model",
				sap.ui.model.FilterOperator.Contains, sValue
			);
			evt.getSource().getBinding("items").filter([oFilter]);
		},

		_handleValueHelpClose: function (evt) {
			var oSelectedItem = evt.getParameter("selectedItem");
			if (oSelectedItem) {
				var modelInput = this.byId(this.inputId),
					sDescription = oSelectedItem.getDescription();
				modelInput.setValue(sDescription);
			}
			evt.getSource().getBinding("items").filter([]);
			// this.destroy();
		},

		suggestionItemSelected: function (evt) {
			var oItem = evt.getParameter('selectedItem'),
				sKey = oItem ? oItem.getKey() : '';
			// this.onSearch(evt);
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
		},
		formatRepair: function (value) {
			if (value === "N") {
				value = "No";
			} else {
				value = "Yes";
			}
			return value;
		},
		
		handleExcelPressed: function (oEvent) {
			var sUrl = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/vehicleListSet?$format=xlsx";
			var encodeUrl = encodeURI(sUrl);
			window.open(encodeUrl);
		},
		
		
		onExit: function () {
			this.destroy();
		}
	});

});