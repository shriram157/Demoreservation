sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"sap/ui/export/Spreadsheet",
	"sap/ui/core/Fragment",
	"sap/m/MessageBox"
], function (BaseController, Filter, Sorter,Spreadsheet,Fragment,MessageBox) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.Reservation", {

		onInit: function () {
			this.populateYear();
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		},

		onRouteMatched: function (oEvent) {
			var	oArgs = oEvent.getParameter("arguments");
			var allClicked = oArgs.admin;
			var email = sap.ui.getCore().getModel("UserDataModel").getData().Email;
			var admin = sap.ui.getCore().getModel("UserDataModel").getData().AdminVisible;
			//testing
		//		email = "anubha_pandey@toyota.ca";

			var a = false;
			if(admin === false){   // Employee Login
				a = false;
				this.filterReservationListAdmin(a,email);
			}else{					// Admin Login
				a = true;
				if(allClicked === "true"){
					this.filterReservationListAdmin(a,"");
				}else{
					this.filterReservationListAdmin(false,email);
				}
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
				"model",
				sap.ui.model.FilterOperator.Contains, sInputValue
			)]);

			// open value help dialog filtered by the input value
			this._valueHelpDialog.open(sInputValue);
		},
		
		_handleValueHelpSearch : function (evt) {
			var sValue = evt.getParameter("value");
			var oFilter = new Filter(
				"model",
				sap.ui.model.FilterOperator.Contains, sValue
			);
			evt.getSource().getBinding("items").filter([oFilter]);
		},

		_handleValueHelpClose : function (evt) {
			var oSelectedItem = evt.getParameter("selectedItem");
			if (oSelectedItem) {
				var modelInput = this.byId(this.inputId),
				sDescription = oSelectedItem.getDescription();
				modelInput.setValue(sDescription);
			}
			evt.getSource().getBinding("items").filter([]);
		},

		suggestionItemSelected: function (evt) {
			var oItem = evt.getParameter('selectedItem'),
				sKey = oItem ? oItem.getKey() : '';
		},

		getVehicleData: function (VHVIN,dialogType,requestorEmail) {
			var email = sap.ui.getCore().getModel("UserDataModel").getData().Email;
			//testing
	//		email = "anubha_pandey@toyota.ca";

			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
			sPath = "VehicleDetailSet(VHVIN='" + VHVIN + "',Email='" + requestorEmail + "')?$expand=NAVFACOPTION,NAVDEALEROPTION",
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
					
					// extract Requestor type text
					var mod = that.getOwnerComponent().getModel("vehicles"),
						i,
						objR = mod.getContext("/FilterData/RequestorType").getObject();
						for(i=0 ;i< objR.length;i++){ 
							if(objR[i].key === oData.ZZREQTYP) { 
								oData.ZZREQTYPTXT =  objR[i].name;
							}     
						}

					// extract Purchaser type text
					var	objP = mod.getContext("/FilterData/PurchaserType").getObject();
						for(i=0 ;i< objP.length;i++){ 
							if(objP[i].key === oData.ZZPURTYP) { 
								oData.ZZPURTYPTXT =  objP[i].name;
							}     
						}

					oJSONModel.setData(oData);
					that.getView().setModel(oJSONModel,"VehicleInfo");
					// release busy indicator
					oBusyDialog.close();
					if(dialogType ==="INFO"){
						that.dlgReservation.open();
					}else{
						that.dlgAppRej.open();
					}
				},
				error: function (oError) {
					// release busy indicator
					oBusyDialog.close();
					// Message - error in accessing vehicle data
						sap.m.MessageBox.show("Error in accessing vehicle data", {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "Error",
						actions: [sap.m.MessageBox.Action.OK],
						details: oError.response.body
					});
				}
			});
		},
		onReservationInfoPress: function (oEvent) {
			var path = oEvent.getSource().getParent().getBindingContextPath(),
			//	vhvin = path.substr(21,16);
			vhvin = this.getView().byId("tabRservation").getModel().getData(path).VHVIN,
			requestorEmail = this.getView().byId("tabRservation").getModel().getData(path).Email;
			this._selectedPath = oEvent.getSource().getParent().getBindingContextPath();
			this._selectedObject = this.byId("tabRservation").getModel().getProperty(this._selectedPath);
			if (!this.dlgReservation) {
				this.dlgReservation = sap.ui.xmlfragment("reservationInfoFragment",
					"ca.toyota.demoreservation.demoreservation.view.fragments.ReservationInfo",
					this
				);
				this.getView().addDependent(this.dlgReservation);
			}
			this.getVehicleData(vhvin,"INFO",requestorEmail);
		},
		
		onApprovePress: function (oEvent) {
			if (!this.dlgAppRej) {
				this.dlgAppRej = sap.ui.xmlfragment("adminSectionFragment",
					"ca.toyota.demoreservation.demoreservation.view.fragments.AdminSection",
					this
				);
				this.getView().addDependent(this.dlgAppRej);
			}
			this.APP_REJ="ZRRA";
			this._selectedPath = oEvent.getSource().getParent().getBindingContextPath();
			this._selectedObject = this.byId("tabRservation").getModel().getProperty(this._selectedPath);
			var vhvin = this.getView().byId("tabRservation").getModel().getData(this._selectedPath).VHVIN,
			requestorEmail = this.getView().byId("tabRservation").getModel().getData(this._selectedPath).Email;
			this.getVehicleData(vhvin,"APRJ",requestorEmail);
		},

		onRejectPress: function (oEvent) {
			if (!this.dlgAppRej) {
				this.dlgAppRej = sap.ui.xmlfragment("adminSectionFragment",
					"ca.toyota.demoreservation.demoreservation.view.fragments.AdminSection",
					this
				);
				this.getView().addDependent(this.dlgAppRej);
			}
			this.APP_REJ="ZRRD";
			this._selectedPath = oEvent.getSource().getParent().getBindingContextPath();
			this._selectedObject = this.byId("tabRservation").getModel().getProperty(this._selectedPath);
			var vhvin = this.getView().byId("tabRservation").getModel().getData(this._selectedPath).VHVIN,
			requestorEmail = this.getView().byId("tabRservation").getModel().getData(this._selectedPath).Email;
			this.getVehicleData(vhvin,"APRJ",requestorEmail);
		},
		
		onCloseDialog: function (oEvent) {
			this.dlgReservation.close();
		},
		onCloseAdmin: function (oEvent) {
			this.dlgAppRej.close();
			Fragment.byId("adminSectionFragment", "ipDateDue").setValue("");
			Fragment.byId("adminSectionFragment", "ipDateRec").setValue("");
			Fragment.byId("adminSectionFragment", "ipNotes").setValue("");

		},
		onNavButtonPress: function (oEvent) {
			this.doRoute("Home");
		},
		isValidateTrue: function(){
			var that = this;
			var msg;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var ZCSUDT = Fragment.byId("adminSectionFragment", "ipDateDue").getValue();
			var ZCREDT = Fragment.byId("adminSectionFragment", "ipDateRec").getValue();
			var chk = Fragment.byId("adminSectionFragment", "ipCheck").getSelected();
			
			if(chk){
				if(ZCSUDT ===""){
					msg = oBundle.getText("errCheckDueValidation");
					Fragment.byId("adminSectionFragment", "ipDateDue").setValueState(sap.ui.core.ValueState.Error);
					Fragment.byId("adminSectionFragment", "ipDateDue").setValueStateText(msg);
					return false;
				}else{
					Fragment.byId("adminSectionFragment", "ipDateDue").setValueState(sap.ui.core.ValueState.None);
				}
				
				if(ZCREDT ===""){
					msg = oBundle.getText("errCheckRecValidation");
					Fragment.byId("adminSectionFragment", "ipDateRec").setValueState(sap.ui.core.ValueState.Error);
					Fragment.byId("adminSectionFragment", "ipDateRec").setValueStateText(msg);
					return false;
				}else{
					Fragment.byId("adminSectionFragment", "ipDateRec").setValueState(sap.ui.core.ValueState.None);
				}
				return true;
			}else{
				Fragment.byId("adminSectionFragment", "ipDateDue").setValueState(sap.ui.core.ValueState.None);
				Fragment.byId("adminSectionFragment", "ipDateRec").setValueState(sap.ui.core.ValueState.None);
				return true;
			}
		},
		onAppRejPress: function (oEvent) {
			var that = this;
			var chk ="";
			
			var vehicleModel = this.getView().getModel("VehicleInfo");
			var ZCSUDT = Fragment.byId("adminSectionFragment", "ipDateDue").getValue();
			var ZCREDT = Fragment.byId("adminSectionFragment", "ipDateRec").getValue();
			
			if(Fragment.byId("adminSectionFragment", "ipCheck").getSelected()){
				chk ="X";
			}
			
			if(this.isValidateTrue()){
				var data = {
					// sample data
					"ZANOTES": Fragment.byId("adminSectionFragment", "ipNotes").getValue(),
					"ZCHERQ": chk, 	// x in case selected
					"ZCSUDT": ZCSUDT,
					"ZCREDT": ZCREDT,
					"Vehicleaction": this.APP_REJ,
					"Vehiclenumber": vehicleModel.getProperty("/Vehiclenumber"),
					"Vehicleidentnumb": vehicleModel.getProperty("/VHVIN"),
					"Zresreq": vehicleModel.getProperty("/ZRESREQ")
				};
				var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
					sPath = "/zc_demo_reservationSet('"+ vehicleModel.getProperty("/ZRESREQ") +"')",
					oModifyModel = new sap.ui.model.odata.ODataModel(uri, true);
					
					var oBusyDialog = new sap.m.BusyDialog();
					oBusyDialog.open();  // Set busy indicator
	
					this.getView().getModel().update(sPath, data, {
				
					// method: "PATCH",
					// async: false,
					success: function (oData, oResponse) {
						sap.m.MessageBox.show("Reservation request updated", {
						icon: sap.m.MessageBox.Icon.SUCCESS,
						title: "Success",
						actions: [sap.m.MessageBox.Action.OK],
						onClose: function (oAction) {
							that.dlgAppRej.close();
							Fragment.byId("adminSectionFragment", "ipDateDue").setValue("");
							Fragment.byId("adminSectionFragment", "ipDateRec").setValue("");
							Fragment.byId("adminSectionFragment", "ipNotes").setValue("");
							that.getView().getModel().refresh();
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
							onClose: function (oAction) {
								that.dlgAppRej.close();
								Fragment.byId("adminSectionFragment", "ipDateDue").setValue("");
								Fragment.byId("adminSectionFragment", "ipDateRec").setValue("");
								Fragment.byId("adminSectionFragment", "ipNotes").setValue("");

							}
						});
						// release busy indicator
						oBusyDialog.close();
					}
				});
			}
		},
		
		onSearch: function (oEvent){
			var email = sap.ui.getCore().getModel("UserDataModel").getData().Email;
						//testing
	//		email = "anubha_pandey@toyota.ca";

			var admin = sap.ui.getCore().getModel("UserDataModel").getData().AdminVisible;                         ;
			
			if(admin){
				email = "";
			}    
			var modelFilter = this.getView().byId("modelFilter").getValue();
			var yearFilter = this.getView().byId("yearFilter").getValue();
			var vinFilter = this.getView().byId("vinFilter").getValue();
			var inpStatus = this.getView().byId("inpStatus").getSelectedKey();
			var ReserverFilter = this.getView().byId("ReserverFilter").getValue();
			
			
			var aFilters = [];
			var MATNR = new sap.ui.model.Filter("MATNR", sap.ui.model.FilterOperator.EQ, modelFilter);
			var ZZMOYR = new sap.ui.model.Filter("ZZMOYR", sap.ui.model.FilterOperator.EQ, yearFilter);
			var VHVIN = new sap.ui.model.Filter("VHVIN", sap.ui.model.FilterOperator.Contains, vinFilter);
			var StatusCode = new sap.ui.model.Filter("StatusCode", sap.ui.model.FilterOperator.EQ, inpStatus);
	//		var Admin = new sap.ui.model.Filter("Admin", sap.ui.model.FilterOperator.EQ, admin);
			var Email = new sap.ui.model.Filter("Email", sap.ui.model.FilterOperator.EQ, email);
			var Reserver = new sap.ui.model.Filter("Reserver", sap.ui.model.FilterOperator.EQ, ReserverFilter);

			aFilters = [
				MATNR,
				ZZMOYR,
				VHVIN,
				StatusCode,
		//		Admin,
				Email,
				Reserver
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
		 },
		 
		 filterReservationListAdmin: function(admin,email){
		 	if(admin){
				email = "";
			}  
		  	var aFilters = [];
			var Email = new sap.ui.model.Filter("Email", sap.ui.model.FilterOperator.EQ, email);
				aFilters = [
				Email
			];
			var finalFilter = new sap.ui.model.Filter({
				filters: aFilters,
				and: true
			});
			this.getView().byId("tabRservation").getBinding("items").filter(finalFilter, "Application");
		 },
		 _onEditPress: function (oEvent) {
			var vhvin = this.getView().byId("tabRservation").getModel().getData(this._selectedPath).VHVIN;
			var Zresreq = this.getView().byId("tabRservation").getModel().getData(this._selectedPath).ZRESREQ;
			if(Zresreq===""){
				// msg
			}else{
				this.doReqRoute("RequestDetail",vhvin,Zresreq);
			}

		}
	});

});