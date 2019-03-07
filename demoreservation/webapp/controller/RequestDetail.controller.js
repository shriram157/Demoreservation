sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.RequestDetail", {

		
		onInit: function () {
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
			this.action ="";
			this.Zresreq = "";
			this.vhvin="";
		},
		
		onRouteMatched: function (oEvent) {
			this.initPage();
			var oArgs,oView,sPath,that=this;
			oArgs = oEvent.getParameter("arguments");
			this.Zresreq = oArgs.Zresreq;
			this.vhvin = oArgs.vhvin;
			oView = this.getView();
			this.vhvin = oArgs.vhvin;
			if(oArgs.Zresreq ==="E"){
			// 	sPath = "zc_demo_reservationSet('0000000001')";
			// //	sPath = "zc_demo_reservationSet('" + oArgs.Zresreq + "')";
			// 	oView.bindElement({
			// 		path: sPath,
			// 		events: {
			// 			dataRequested: function () {
			// 				oView.setBusy(true);
			// 			},
			// 			dataReceived: function () {
			// 				oView.setBusy(false);
			// 			}
			// 		}
			// 	});
				that.getReservationData(oArgs.Zresreq);
			}
			this.getVehicleData(oArgs.vhvin);
		},
		
		initPage: function(){
			this.byId("h_onbehalf").setVisible(true);
			this.byId("h_department").setVisible(true);
		},
		
		getVehicleData: function (VHVIN) {
			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
				sPath = "VehicleDetailSet(VHVIN='" + VHVIN + "')?$expand=NAVFACOPTION,NAVDEALEROPTION",
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
						VehicleDetailSet: oData
					});
					that.getView().setModel(oJSONModel,"Header");
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
		getReservationData: function (resreq) {
			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
				sPath = "zc_demo_reservationSet('0000000001')",
				oDetailModel = new sap.ui.model.odata.ODataModel(uri, true),
				that = this;
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			// read OData model data into local JSON model 
			oDetailModel.read(sPath, {
				method: "GET",
				success: function (oData, oResponse) {
					var oJSONModel = new sap.ui.model.json.JSONModel();
					oJSONModel.setData(oData);
					that.getView().setModel(oJSONModel,"Reservation");
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
		getDepartmentData: function () {
			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
				sPath = "ZC_DEPT",
				oDetailModel = new sap.ui.model.odata.ODataModel(uri, true),
				that = this;
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			// read OData model data into local JSON model 
			oDetailModel.read(sPath, {
				method: "GET",
				success: function (oData, oResponse) {
	//				var oJSONModel = new sap.ui.model.json.JSONModel();
					var oJSONModel = that.getOwnerComponent().getModel("localDataModel");
					oJSONModel.setData({Department: oData.results});
		//			that.getView().setModel(oJSONModel,"LocalDataModel");
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
		getEmployeeData: function () {
			var curr_datetime = this.getCurrentDate();
			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
				sPath = "ZC_EMP_DETAILS(datetime'" + curr_datetime +"')/Set",
				oDetailModel = new sap.ui.model.odata.ODataModel(uri, true),
				that = this;
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			// read OData model data into local JSON model 
			oDetailModel.read(sPath, {
				method: "GET",
				success: function (oData, oResponse) {
					var oJSONModel = that.getOwnerComponent().getModel("localDataModel");
					oJSONModel.setData({Employee: oData.results});
		//			that.getView().setModel(oJSONModel,"LocalDataModel");
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
		suggestionItemSelected: function (evt) {
			//Get Selected Row
			var obj = evt.getParameter("selectedRow").getBindingContext("localDataModel").getObject();
			var data = { 
						"fstName" : obj.nchmc,
						"lstName" : obj.vnamc,
						"email" : obj.usrid_long,
						"userid" : obj.usrid
					};
			this.InputModel = new sap.ui.model.json.JSONModel();		
			this.InputModel.setData({InputSet : data});
			this.getView().setModel(this.InputModel,"InpuModel");
			
			this.byId("idFirstName").setValue(obj.nchmc);
			this.byId("idLastName").setValue(obj.vnamc);
			this.byId("onBehalf").setValue(obj.usrid);
			this.byId("idEmail").setValue(obj.usrid_long);
		},
		handleInputSuggest: function (oEvent) {
			var sValue = oEvent.getParameter("suggestValue");
			var filters = new sap.ui.model.Filter([
				new sap.ui.model.Filter("usrid",
					sap.ui.model.FilterOperator.StartsWith,
					sValue),
				new sap.ui.model.Filter("nchmc",
					sap.ui.model.FilterOperator.StartsWith,
					sValue),
				new sap.ui.model.Filter("vnamc",
					sap.ui.model.FilterOperator.StartsWith,
					sValue)
			], false);

			oEvent.getSource().getBinding("suggestionRows").filter(
				[filters]);
			oEvent.getSource().setFilterSuggests(false);
		},
		onSelectReqTypeChange: function(oEvent){
			var that = this;
			var reqtype = this.byId("reqtype").getSelectedKey();     
			if(reqtype ==="E"){
				this.byId("h_onbehalf").setVisible(true);
				this.byId("h_department").setVisible(false);
				that.getEmployeeData();
			}else{
				this.byId("h_onbehalf").setVisible(false);
				this.byId("h_department").setVisible(true);
				that.getDepartmentData();
				//reset employee selection values
			this.byId("idFirstName").setValue("");
			this.byId("idLastName").setValue("");
			this.byId("onBehalf").setValue("");
			this.byId("idEmail").setValue("");

			}
		},
		
		onSubmitPress: function (oEvent) {
			var that = this;
			if(this.action ==="U"){
				that._saveData("U");
			}else{
				that._createData();
			}
		},
		_saveData: function(action){
			var that = this;
		//	this.evt = revertEvent;
			var data = this.getView().getModel().getData();
			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
				sPath = "zc_demo_reservationSet",
				oModifyModel = new sap.ui.model.odata.ODataModel(uri, true);
				oModifyModel.modify(sPath, data, {
					method: "POST",
					async: false,
					success: function (oData, oResponse) {
					var result = oData.ReturnFlag;
					var msg,icon,title;
					if(result==="E"){
						msg = oData.Message;
						icon = sap.m.MessageBox.Icon.ERROR;
						title = "Error";
					}else if(result==="W"){
						msg = oData.Message;
						icon = sap.m.MessageBox.Icon.WARNING;
						title = "Warning";
					}else{
						msg = oData.Message;
						icon = sap.m.MessageBox.Icon.SUCCESS;
						title = "Success";
					}
					sap.m.MessageBox.show(msg, {
						icon: icon,
						title: title,
						actions: [sap.m.MessageBox.Action.OK],
						onClose: function (oAction) {
							//	method to be called 
						}
						});
					},
					error: function (e) {
						sap.m.MessageBox.show("Reservation request update failed", {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "Error",
							actions: [sap.m.MessageBox.Action.OK],
							details: e.response.body,
							onClose: function (oAction) {  }				
						});
					}
				});
		},
		_createData: function(){
			var that = this;
		//	this.evt = revertEvent;
	//		var data = this.getView().getModel().getData();
				var data = {								// sample data
					// "Confirmation": "",
					// "Endcustomer": "2400085006",
					// "MATNR": "SIENNA XLE V6 7-PASS 8XXX",
					// "Vehicle_id_type": "",
					// "Vehicleaction": "ZRRA",
					// "Vehicleidentnumb": "VIN00000000601815",
					// "Vehiclenumber": "",
					// "Vehicleusage": "IA",
					// "ZANOTES": "",
					// "ZCHERQ": "",
					// "ZCREATED_BY": "",
					// "ZCREATED_ON": "",
					// "ZCREDT": "",
					// "ZCSUDT": "",
					// "ZDEPT": "",
					// "ZEMAIL": "xxxxxx@yahoo.com",
					// "ZINFO_ID": "",
					// "ZOTHERS": "",
					// "ZPURDT": "",
					// "ZPURTYP": "",
					// "ZPUR_NAME": "",
					// "ZREQTYP": "",
					// "ZREQ_LNAME": "Battey",
					// "ZREQ_NAME": "John",
					// "ZRSTAT": "",
					// "ZSERIES": "SIE",
					// "ZUDEL": "",
					// "Zresreq": "",
					"Zresreq" : "",
					  "ZSERIES" : "SIE",
					  "ZREQTYP" : "E",
					  "ZREQ_NAME" : "ANUBHA",
					  "ZREQ_LNAME" : "PANDEY",
					  "ZDEPT" : "00000072",
					  "ZEMAIL" : "ANUBHA_PANDEY@TOYOTA.CA",
					  "ZOTHERS" : "",
					  "ZPURTYP" : "",
					  "ZPUR_NAME" : "",
					  "ZPURDT" : "20190505",
					  "ZUDEL" : "",
					  "ZANOTES" : "",
					  "ZCHERQ" : "",
					  "ZCSUDT" : "",
					  "ZCREDT" : "",
					  "ZCREATED_BY" : "",
					  "ZCREATED_ON" : "",
					  "Vehicleaction" : "",
					  "Vehiclenumber" : "0000017031",
					  "Vehicleidentnumb" : "VIN00000000561894"
				};

			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
				sPath = "zc_demo_reservationSet",
				oModifyModel = new sap.ui.model.odata.ODataModel(uri, true);
				oModifyModel.create(sPath, data, {
					method: "POST",
					async: false,
					success: function (oData, oResponse) {
					var result = oData.ReturnFlag;
					var msg,icon,title;
					if(result==="E"){
						msg = oData.Message;
						icon = sap.m.MessageBox.Icon.ERROR;
						title = "Error";
					}else if(result==="W"){
						msg = oData.Message;
						icon = sap.m.MessageBox.Icon.WARNING;
						title = "Warning";
					}else{
						msg = oData.Message;
						icon = sap.m.MessageBox.Icon.SUCCESS;
						title = "Success";
					}
					sap.m.MessageBox.show(msg, {
						icon: icon,
						title: title,
						actions: [sap.m.MessageBox.Action.OK],
						onClose: function (oAction) {
							//	method to be called 
						}
						});
					},
					error: function (e) {
						sap.m.MessageBox.show("Reservation request creation failed", {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "Error",
							actions: [sap.m.MessageBox.Action.OK],
							details: e.response.body,
							onClose: function (oAction) {  }				
						});
					}
				});	
		},
		onDeletePress: function (oEvent) {
			this._saveData("D");
		},
		onNavButtonPress: function (oEvent) {
			this.doRoute("Home");
		},
		getCurrentDate: function () {
			var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-dd"
			});
			var todaydate = dateFormat.format(new Date());
			var date = todaydate + "T00:00:00";
			return date;
		},

	});

});