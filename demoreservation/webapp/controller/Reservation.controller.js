sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter"
], function (BaseController, Filter, Sorter) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.Reservation", {

		onInit: function () {
			this.populateYear();
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		},

		onRouteMatched: function (oEvent) {
			
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
				asynch: false,
				success: function (oData, oResponse) {
					var oJSONModel = new sap.ui.model.json.JSONModel();
					oJSONModel.setData(oData);
					that.getView().setModel(oJSONModel,"VehicleInfo");
					// release busy indicator
					oBusyDialog.close();
					that.dlgSGroup.open();
				},
				error: function (oError) {
					//alert("Error!");
					// release busy indicator
					oBusyDialog.close();
				}
			});
		},
		onReservationInfoPress: function (oEvent) {
			var path = oEvent.getSource().getParent().getBindingContextPath(),
				vhvin = path.substr(21,17);
			if (!this.dlgSGroup) {
				this.dlgSGroup = sap.ui.xmlfragment("reservationInfoFragment",
					"ca.toyota.demoreservation.demoreservation.view.fragments.ReservationInfo",
					this
				);
				this.getView().addDependent(this.dlgSGroup);
			//	this.getVehicleData(vhvin);
			}
				this.getVehicleData(vhvin);
		//	this.dlgSGroup.open();
			
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
			this.APP_REJ="ZRRA";
		},

		onRejectPress: function (oEvent) {
			if (!this.dlgSGroup2) {
				this.dlgSGroup2 = sap.ui.xmlfragment("adminSectionFragment",
					"ca.toyota.demoreservation.demoreservation.view.fragments.AdminSection",
					this
				);
				this.getView().addDependent(this.dlgSGroup2);
			}
			this.dlgSGroup2.open();
			this.APP_REJ="ZRRD";
		},
		
		onCloseDialog: function (oEvent) {
			oEvent.getSource().getParent().close();
		},
		onNavButtonPress: function (oEvent) {
			this.doRoute("Home");
		},
		onAppRejPress: function (oEvent) {
			var that = this;
			// var headerModel = this.getView().getModel("Header");
			// var localModel = this.getView().getModel("localDataModel");
			// var delIndictator ="";
			// if(action === "D"){
			// 	delIndictator = "X";
			// }else{
			// 	delIndictator = "";
			// }
			//	this.evt = revertEvent;
			var data = {
				// sample data
				"Zresreq": headerModel.getProperty("/VehicleDetailSet/ZRESREQ"),
				"ZSERIES": headerModel.getProperty("/VehicleDetailSet/ZZSERIES"),
				"ZREQTYP": that.byId("reqtype").getSelectedKey(),
				"ZINFO_ID": that.byId("onBehalf").getValue(),
				"ZREQ_NAME": that.byId("idFirstName").getValue(),
				"ZREQ_LNAME": that.byId("idLastName").getValue(),
				"ZDEPT": that.byId("idDeptName").getSelectedKey(),
				"ZEMAIL": that.byId("idEmail").getValue(),
				"ZOTHERS": "",
				"ZPURTYP": that.byId("purtype").getSelectedKey(),
				"ZPUR_NAME": that.byId("idPurName").getValue(),
				"ZPURDT": that.byId("idPurchDate").getValue(),
				"ZUDEL": delIndictator, // X in case of delete
				"ZANOTES": that.byId("idNotes").getValue(),
				//	  "ZCHERQ" : that.byId("idCheckReq").getValue(),
				"ZCHERQ": "",
				// x in case selected
				"ZCSUDT": that.byId("idDueDate").getValue(),
				"ZCREDT": that.byId("idCheqDate").getValue(),
				"ZCREATED_BY": "",
				"ZCREATED_ON": "",
				"Vehicleaction": "",
				"Vehiclenumber": headerModel.getProperty("/VehicleDetailSet/Vehiclenumber"),
				"Vehicleidentnumb": headerModel.getProperty("/VehicleDetailSet/VHVIN")
			};
			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
				sPath = "zc_demo_reservationSet",
				oModifyModel = new sap.ui.model.odata.ODataModel(uri, true);
				
				var oBusyDialog = new sap.m.BusyDialog();
				oBusyDialog.open();  // Set busy indicator

				oModifyModel.create(sPath, data, {
				method: "POST",
				async: false,
				success: function (oData, oResponse) {
					var result = oData.MessageType;
					var msg, icon, title;
					if (result === "S") {
						msg = oData.Message +" : "+ oData.Zresreq;
						icon = sap.m.MessageBox.Icon.SUCCESS;
						title = "Success";
					} else {
						msg = oData.Message;
						icon = sap.m.MessageBox.Icon.ERROR;
						title = "Error";
					}
					sap.m.MessageBox.show(msg, {
						icon: icon,
						title: title,
						actions: [sap.m.MessageBox.Action.OK],
						onClose: function (oAction) {
							//	method to be called 
						}
					});
					// release busy indicator
					oBusyDialog.close();
				},
				error: function (e) {
					sap.m.MessageBox.show("Reservation request update failed", {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "Error",
						actions: [sap.m.MessageBox.Action.OK],
						details: e.response.body,
						onClose: function (oAction) {}
					});
					// release busy indicator
					oBusyDialog.close();
				}
			});
		},
		
		onSearch: function (oEvent){
		//	var zoneFilter = this.getView().byId("zoneFilter").getSelectedKey();
		//	var seriesFilter = this.getView().byId("seriesFilter").getSelectedKey();
			var modelFilter = this.getView().byId("modelFilter").getSelectedKey();
			var yearFilter = this.getView().byId("yearFilter").getValue();
			var vinFilter = this.getView().byId("vinFilter").getValue();
			var inpStatus = this.getView().byId("inpStatus").getValue();
			
			// if(inpStatus ==="All"){ // If Status selected All, send blank value in filter
			// 	inpStatus="";
			// }

			var aFilters = [];
	//		var ZZZONE = new sap.ui.model.Filter("ZZZONE", sap.ui.model.FilterOperator.EQ, zoneFilter);
	//		var ZZSERIES = new sap.ui.model.Filter("ZZSERIES", sap.ui.model.FilterOperator.EQ, seriesFilter);
			var MATNR = new sap.ui.model.Filter("MATNR", sap.ui.model.FilterOperator.EQ, modelFilter);
			var ZZMOYR = new sap.ui.model.Filter("ZZMOYR", sap.ui.model.FilterOperator.EQ, yearFilter);
			var VHVIN = new sap.ui.model.Filter("VHVIN", sap.ui.model.FilterOperator.Contains, vinFilter);
			var StatusCode = new sap.ui.model.Filter("StatusCode", sap.ui.model.FilterOperator.EQ, inpStatus);
			aFilters = [
			//	ZZZONE,
			//	ZZSERIES,
				MATNR,
				ZZMOYR,
				VHVIN,
				StatusCode
			];
			var finalFilter = new sap.ui.model.Filter({
				filters: aFilters,
				and: true
			});
			// // update list binding
			var list = this.getView().byId("tabRservation");
			var binding = list.getBinding("items");
			binding.filter(finalFilter, "Application");

		},

	});

});