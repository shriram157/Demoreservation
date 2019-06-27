sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter"
], function (BaseController, Filter, Sorter) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.Home", {

		onInit: function () {
			// debugger;
			this.populateYear();
			//	this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
			this.initialFilter();
			this.initSecurity();
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("Home").attachMatched(this.onRouteMatched, this);

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
			this.getView().byId("zoneFilter").setSelectedKey("3000");
		},
		onRouteMatched: function (oEvent) {
			//	this.getView().byId("idMyReservationsTable").getModel().refresh(true);
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
			this.onSearch(oEvent);
		},
		onReset: function (oEvent) {
			this.getView().byId("seriesFilter").setSelectedKey();
			this.getView().byId("suffixFilter").setValue();
			this.getView().byId("modelFilter").setValue();
			this.getView().byId("yearFilter").setValue();
			this.getView().byId("vinFilter").setValue();
			this.getView().byId("inpStatus").setValue();
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
			var seriesFilter = this.getView().byId("seriesFilter").getSelectedKey();
			var suffixFilter = this.getView().byId("suffixFilter").getValue();
			var modelFilter = this.getView().byId("modelFilter").getValue();
			var yearFilter = this.getView().byId("yearFilter").getValue();
			var vinFilter = this.getView().byId("vinFilter").getValue().toUpperCase();
			var inpStatus = this.getView().byId("inpStatus").getValue();
			var ReserverFilter = this.getView().byId("ReserverFilter").getValue().toUpperCase();

			if (inpStatus === "All") { // If Status selected All, send blank value in filter
				inpStatus = "";
			}

			var aFilters = [];
			var ZZZONE = new sap.ui.model.Filter("ZZZONE", sap.ui.model.FilterOperator.EQ, zoneFilter, true);
			var ZZSERIES = new sap.ui.model.Filter("ZZSERIES", sap.ui.model.FilterOperator.EQ, seriesFilter, true);
			var MATNR = new sap.ui.model.Filter("MATNR", sap.ui.model.FilterOperator.EQ, modelFilter, true);
			var ZZMOYR = new sap.ui.model.Filter("ZZMOYR", sap.ui.model.FilterOperator.EQ, yearFilter, true);
			var VHVIN = new sap.ui.model.Filter("VHVIN", sap.ui.model.FilterOperator.Contains, vinFilter, true);
			var Status = new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, inpStatus, true);
			var ZZSUFFIX = new sap.ui.model.Filter("ZZSUFFIX", sap.ui.model.FilterOperator.EQ, suffixFilter, true);
			var Reserver = new sap.ui.model.Filter("Reserver", sap.ui.model.FilterOperator.EQ, ReserverFilter, true);
			aFilters = [
				ZZZONE,
				ZZSERIES,
				MATNR,
				ZZMOYR,
				VHVIN,
				Status,
				ZZSUFFIX,
				Reserver
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

		initSecurity: function () {
			this.UserData = new sap.ui.model.json.JSONModel();
			this.getView().setModel(this.UserData, "UserDataModel");
			sap.ui.getCore().setModel(this.UserData, "UserDataModel");
			var that = this;
			$.ajax({
				dataType: "json",
				url: "/demoreservation-node/userDetails/attributes",
				type: "GET",
				success: function (userAttributes) {
					that.UserData.setProperty("/FirstName", userAttributes.samlAttributes.FirstName);
					that.UserData.setProperty("/LastName", userAttributes.samlAttributes.LastName);
					that.UserData.setProperty("/Email", userAttributes.samlAttributes.Email);
					that.UserData.setProperty("/Userid", userAttributes.userProfile.id);
					//	sap.ui.core.BusyIndicator.hide();
					that.UserData.updateBindings(true);
					that.UserData.refresh(true);
				},
				error: function (oError) {
					console.log("Error in fetching user details from LDAP", oError);
				}
			});

			// Current user scope
			$.ajax({
				dataType: "json",
				url: "/demoreservation-node/userDetails/currentScopesForUser",
				type: "GET",
				success: function (scopesData) {
					var type = scopesData.loggedUserType[0];
					// testing
					//	type="TCI_Admin";
					that.UserData.setProperty("/Type", type);
					if (type === "TCI_Admin") {
						that.UserData.setProperty("/AdminVisible", true);
					} else {
						that.UserData.setProperty("/AdminVisible", false);
					}
					// that.UserData.setProperty("/Type", "TCI_User"); //remove once local testing done
					var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/";
					var sPath;

					if (that.UserData.getProperty("/Type") == "TCI_User") {
						sPath = "/vehicleListSet?$filter=Emp eq 'E'";
					} else {
						sPath = "/vehicleListSet?$filter=Emp eq ''";
					}
					$.ajax({
						dataType: "json",
						url: uri + sPath,
						type: "GET",
						success: function (vehicleData) {
							console.log("vehicleData", vehicleData);
							that.DemoModel = new sap.ui.model.json.JSONModel();
							that.getView().setModel(that.DemoModel, "DemoModel");
							var obj = {
								vehicleListSet: []
							};
							obj.vehicleListSet = vehicleData.d.results;
							// .filter(function (val) {
							// 	return val.ZZZONE == "3000";
							// });
							// that.getView().byId("zoneFilter").setSelectedKey("3000");
							console.log(vehicleData.d.results);
							that.DemoModel.setData(obj);
							that.DemoModel.updateBindings(true);
							console.log(that.DemoModel)
						},
						error: function (oError) {}
					});
				},
				error: function (oError) {
					console.log("Error in fetching user details from LDAP", oError);
					that.UserData.setProperty("/Type", "TCI_User");
					that.UserData.setProperty("/AdminVisible", false);
				}
			});
		},
		onExit: function () {
			this.destroy();
		}
	});

});