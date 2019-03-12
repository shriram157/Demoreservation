sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"sap/ui/export/Spreadsheet",
	"sap/ui/core/Fragment"
], function (BaseController, Filter, Sorter,Spreadsheet,Fragment) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.Reservation", {

		onInit: function () {
			this.populateYear();
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		},

		onRouteMatched: function (oEvent) {
			var	oArgs = oEvent.getParameter("arguments");
			var admin = oArgs.admin;
			var a = false;
			if(admin ==="false"){
				a = false;
			}else{
				a = true;
			}
			
			var userModel = new sap.ui.model.json.JSONModel();
			var data ={
				"admin": a
			};
			userModel.setData(data);
			this.getView().setModel(userModel,"UserModel");
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
			this._selectedPath = oEvent.getSource().getParent().getBindingContextPath();
			this._selectedObject = this.byId("tabRservation").getModel().getProperty(this._selectedPath);
			if (!this.dlgReservation) {
				this.dlgReservation = sap.ui.xmlfragment("reservationInfoFragment",
					"ca.toyota.demoreservation.demoreservation.view.fragments.ReservationInfo",
					this
				);
				this.getView().addDependent(this.dlgReservation);
				this.getVehicleData(vhvin);
			}
		//	this.getVehicleData(vhvin);
			this.dlgReservation.open();
			
		},
		
		onApprovePress: function (oEvent) {
			if (!this.dlgAppRej) {
				this.dlgAppRej = sap.ui.xmlfragment("adminSectionFragment",
					"ca.toyota.demoreservation.demoreservation.view.fragments.AdminSection",
					this
				);
				this.getView().addDependent(this.dlgAppRej);
			}
			this.dlgAppRej.open();
			this.APP_REJ="ZRRA";
			this._selectedPath = oEvent.getSource().getParent().getBindingContextPath();
			this._selectedObject = this.byId("tabRservation").getModel().getProperty(this._selectedPath);
			var vhvin = this._selectedPath.substr(21,17);
			this.getVehicleData(vhvin);
		},

		onRejectPress: function (oEvent) {
			if (!this.dlgAppRej) {
				this.dlgAppRej = sap.ui.xmlfragment("adminSectionFragment",
					"ca.toyota.demoreservation.demoreservation.view.fragments.AdminSection",
					this
				);
				this.getView().addDependent(this.dlgAppRej);
			}
			this.dlgAppRej.open();
			this.APP_REJ="ZRRD";
			this._selectedPath = oEvent.getSource().getParent().getBindingContextPath();
			this._selectedObject = this.byId("tabRservation").getModel().getProperty(this._selectedPath);
			var vhvin = this._selectedPath.substr(21,17);
			this.getVehicleData(vhvin);
		},
		
		onCloseDialog: function (oEvent) {
		//	oEvent.getSource().getParent().close();
			this.dlgReservation.close();
		},
		onCloseAdmin: function (oEvent) {
		//	oEvent.getSource().getParent().close();
			this.dlgAppRej.close();
		},
		onNavButtonPress: function (oEvent) {
			this.doRoute("Home");
		},
		onAppRejPress: function (oEvent) {
			var that = this;
			var chk ="";
			var vehicleModel = this.getView().getModel("VehicleInfo");
			if(Fragment.byId("adminSectionFragment", "ipCheck").getSelected()){
				chk ="X";
			}
			var data = {
				// sample data
				"Zresreq": vehicleModel.getProperty("/ZRESREQ"),
				"ZSERIES": vehicleModel.getProperty("/ZZSERIES"),
				"ZREQTYP": vehicleModel.getProperty("/ZZREQTYP"),
				// "ZINFO_ID": that.byId("onBehalf").getValue(),
				// "ZREQ_NAME": vehicleModel.getProperty("/VHVIN"),
				// "ZREQ_LNAME": vehicleModel.getProperty("/VHVIN"),
				// "ZDEPT": vehicleModel.getProperty("/VHVIN"),
				// "ZEMAIL": vehicleModel.getProperty("/VHVIN"),
				// "ZOTHERS": "",
				// "ZPURTYP": vehicleModel.getProperty("/VHVIN"),
				// "ZPUR_NAME": vehicleModel.getProperty("/VHVIN"),
				// "ZPURDT": vehicleModel.getProperty("/VHVIN"),
				"ZANOTES": Fragment.byId("adminSectionFragment", "ipNotes").getValue(),
				//	  "ZCHERQ" : that.byId("idCheckReq").getValue(),
				"ZCHERQ": chk,
				// x in case selected
				"ZCSUDT": Fragment.byId("adminSectionFragment", "ipDateDue").getValue(),
				"ZCREDT": Fragment.byId("adminSectionFragment", "ipDateRec").getValue(),
				"ZCREATED_BY": "",
				"ZCREATED_ON": "",
				"Vehicleaction": this.APP_REJ,
				"Vehiclenumber": vehicleModel.getProperty("/Vehiclenumber"),
				"Vehicleidentnumb": vehicleModel.getProperty("/VHVIN")
			};
			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
				sPath = "zc_demo_reservationSet('"+ vehicleModel.getProperty("/ZRESREQ") +"')",
				oModifyModel = new sap.ui.model.odata.ODataModel(uri, true);
				
				var oBusyDialog = new sap.m.BusyDialog();
				oBusyDialog.open();  // Set busy indicator

				oModifyModel.update(sPath, data, {
				method: "PATCH",
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
			var modelFilter = this.getView().byId("modelFilter").getSelectedKey();
			var yearFilter = this.getView().byId("yearFilter").getValue();
			var vinFilter = this.getView().byId("vinFilter").getValue();
			var inpStatus = this.getView().byId("inpStatus").getValue();
			var aFilters = [];
			var MATNR = new sap.ui.model.Filter("MATNR", sap.ui.model.FilterOperator.EQ, modelFilter);
			var ZZMOYR = new sap.ui.model.Filter("ZZMOYR", sap.ui.model.FilterOperator.EQ, yearFilter);
			var VHVIN = new sap.ui.model.Filter("VHVIN", sap.ui.model.FilterOperator.Contains, vinFilter);
			var StatusCode = new sap.ui.model.Filter("StatusCode", sap.ui.model.FilterOperator.EQ, inpStatus);
			aFilters = [
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
		handleExcelPressed: function (oEvent){
		  var sUrl = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/reservationListSet?$format=xlsx";
          var encodeUrl = encodeURI(sUrl);
          window.open(encodeUrl);
	    },
	    
	    onUpdateFinished: function(oEvent) {
			// count and display number of nominations in Table Header title
			var sTitle, oTable = this.getView().byId("tabRservation");
			var title = this.getView().byId("tabTitle");
			sTitle = "Reservation List";
			var lengthTotal = oTable.getBinding("items").getLength();
			title.setText(sTitle + " ("+lengthTotal+")");
		}

	});

});