sap.ui.define(["ca/toyota/demoreservation/demoreservation/controller/BaseController","sap/m/MessageBox"], function (BaseController,MessageBox) {
	"use strict";
	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.RequestDetail", {
		onInit: function () {
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
			this.action = "";
			this.Zresreq = "";
			this.vhvin = "";
		},
		onRouteMatched: function (oEvent) {
			this.initPage();
			var oArgs, oView, sPath, that = this;
			oArgs = oEvent.getParameter("arguments");
			this.Zresreq = oArgs.Zresreq;
			this.vhvin = oArgs.vhvin;
			oView = this.getView();
			this.vhvin = oArgs.vhvin;
			if(oArgs.Zresreq === undefined){
				that.action="";
			}else if (oArgs.Zresreq !== "C") {		// Edit Reservation
				that.getReservationData(oArgs.Zresreq);
				that.action="U";
				// Make Delete button visible
				that.byId("btnDelete").setVisible(true);
			}
			this.getVehicleData(oArgs.vhvin);
			
			// On employee login, fill details
			var type = sap.ui.getCore().getModel("UserDataModel").getData().Type;
			
			if(type ==="TCI_User"){
				that.byId("reqtype").setSelectedKey("E");
				that.byId("reqtype").setEnabled(false);
				that.byId("onBehalf").setEnabled(false);
				that.byId("idFirstName").setValue(sap.ui.getCore().getModel("UserDataModel").getData().FirstName);
				that.byId("idLastName").setValue(sap.ui.getCore().getModel("UserDataModel").getData().LastName);
				that.byId("idEmail").setValue(sap.ui.getCore().getModel("UserDataModel").getData().Email);
				that.byId("h_department").setVisible(false);
			}
		},
		initPage: function () {
			this.byId("h_onbehalf").setVisible(true);
			this.byId("h_department").setVisible(true);
		},
		getVehicleData: function (VHVIN) {
			var email = sap.ui.getCore().getModel("UserDataModel").getData().Email;
						//testing
	//		email = "anubha_pandey@toyota.ca";

			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
			sPath = "VehicleDetailSet(VHVIN='" + VHVIN + "',Email='" + email + "')?$expand=NAVFACOPTION,NAVDEALEROPTION",
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
					that.getView().setModel(oJSONModel, "Header");
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
				sPath = "zc_demo_reservationSet('"+ resreq +"')",
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
					that.getView().setModel(oJSONModel, "Reservation");
						if (oData.ZREQTYP === "E" || oData.ZREQTYP === "C") {
							that.byId("h_onbehalf").setVisible(true);
							that.byId("h_department").setVisible(false);
						} else {
							that.byId("h_onbehalf").setVisible(false);
							that.byId("h_department").setVisible(true);
						}
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
					oJSONModel.setData({
						Department: oData.results
					});
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
		getEmployeeData: function (reqtype) {
			var persg;
			if (reqtype === "E") {
				persg = "1";
			} else {
				persg = "2";
			}
			var curr_datetime = this.getCurrentDate();
			var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/",
				sPath = "ZC_EMP_DETAILS(datetime'" + curr_datetime + "')/Set",
				oDetailModel = new sap.ui.model.odata.ODataModel(uri, true),
				that = this;
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			// read OData model data into local JSON model 
			oDetailModel.read(sPath, {
				method: "GET",
				success: function (oData, oResponse) {
					var i, filterResult = [],
						j = 0,
						odata = oData.results;
					for (i = 0; i < odata.length; i++) {
						if (oData.results[i].persg === persg) {
							filterResult[j] = oData.results[i];
							j++;
						}
					}
					var oJSONModel = that.getOwnerComponent().getModel("localDataModel");
					oJSONModel.setData({
						Employee: filterResult
					});
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
				"fstName": obj.nchmc,
				"lstName": obj.vnamc,
				"email": obj.usrid_long,
				"userid": obj.usrid
			};
			this.InputModel = new sap.ui.model.json.JSONModel();
			this.InputModel.setData({
				InputSet: data
			});
			this.getView().setModel(this.InputModel, "InpuModel");
			this.byId("idFirstName").setValue(obj.nchmc);
			this.byId("idLastName").setValue(obj.vnamc);
			this.byId("onBehalf").setValue(obj.usrid);
			this.byId("idEmail").setValue(obj.usrid_long);
		},
		handleInputSuggest: function (oEvent) {
			var sValue = oEvent.getParameter("suggestValue");
			var filters = new sap.ui.model.Filter([
				new sap.ui.model.Filter("usrid", sap.ui.model.FilterOperator.StartsWith, sValue),
				new sap.ui.model.Filter("nchmc", sap.ui.model.FilterOperator.StartsWith, sValue),
				new sap.ui.model.Filter("vnamc", sap.ui.model.FilterOperator.StartsWith, sValue)
			], false);
			oEvent.getSource().getBinding("suggestionRows").filter([filters]);
			oEvent.getSource().setFilterSuggests(false);
		},
		onSelectReqTypeChange: function (oEvent) {
			var that = this;
			var reqtype = this.byId("reqtype").getSelectedKey();
			if (reqtype === "E" || reqtype === "C") {
				this.byId("h_onbehalf").setVisible(true);
				this.byId("h_department").setVisible(false);
				that.byId("idDeptName").setSelectedKey("");
				that.getEmployeeData(reqtype);
			} else {
				this.byId("h_onbehalf").setVisible(false);
				this.byId("h_department").setVisible(true);
				that.getDepartmentData();
			}
			//reset employee selection values
			this.byId("idFirstName").setValue("");
			this.byId("idLastName").setValue("");
			this.byId("onBehalf").setValue("");
			this.byId("idEmail").setValue("");
		},
		onSubmitPress: function (oEvent) {
			var that = this;
			if (this.action === "U") {
				that._saveData("U");
			} else {
				that._createData();
			}
		},
		_saveData: function (action) {
			var that = this;
			var headerModel = this.getView().getModel("Header");
			var localModel = this.getView().getModel("localDataModel");
			var delIndictator ="";
			if(action === "D"){
				delIndictator = "X";
			}else{
				delIndictator = "";
			}
			//	this.evt = revertEvent;
			var data = {
				// sample data
				"Zresreq": headerModel.getProperty("/VehicleDetailSet/ZRESREQ"),
				"ZSERIES": headerModel.getProperty("/VehicleDetailSet/ZZSERIES"),
				"MATNR": headerModel.getProperty("/VehicleDetailSet/Model"),
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
				sPath = "/zc_demo_reservationSet('"+ headerModel.getProperty("/VehicleDetailSet/ZRESREQ") +"')",
				oModifyModel = new sap.ui.model.odata.ODataModel(uri, true);
				
				var oBusyDialog = new sap.m.BusyDialog();
				oBusyDialog.open();  // Set busy indicator

//				oModifyModel.update(sPath, data, {
				this.getView().getModel().update(sPath, data, {
				// method: "PATCH",
				// async: false,
				success: function (oData, oResponse) {
					// var result = oData.MessageType;
					// var msg, icon, title;
					// if (result === "S") {
					// 	msg = oData.Message +" : "+ oData.Zresreq;
					// 	icon = sap.m.MessageBox.Icon.SUCCESS;
					// 	title = "Success";
					// } else {
					// 	msg = oData.Message;
					// 	icon = sap.m.MessageBox.Icon.ERROR;
					// 	title = "Error";
					// }
					// sap.m.MessageBox.show(msg, {
					// 	icon: icon,
					// 	title: title,
					// 	actions: [sap.m.MessageBox.Action.OK],
					// 	onClose: function (oAction) {
					// 		//	method to be called 
					// 		that.navigateBack();
					// 	}
					// });
					// release busy indicator
					sap.m.MessageBox.show("Reservation request updated", {
						icon: sap.m.MessageBox.Icon.SUCCESS,
						title: "Success",
						actions: [sap.m.MessageBox.Action.OK],
						onClose: function (oAction) {
							that.navigateBack();
						}
					});
					oBusyDialog.close();
				},
				error: function (e) {
					sap.m.MessageBox.show("Reservation request update failed", {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "Error",
						actions: [sap.m.MessageBox.Action.OK],
						onClose: function (oAction) {
							that.navigateBack();
						}
					});
					// release busy indicator
					oBusyDialog.close();
				}
			});
		},
		_createData: function () {
			var that = this;
			var headerModel = this.getView().getModel("Header");
			var localModel = this.getView().getModel("localDataModel");
			var data = {
				// sample data
				"Zresreq": "",
				"ZSERIES": headerModel.getProperty("/VehicleDetailSet/ZZSERIES"),
				"MATNR": headerModel.getProperty("/VehicleDetailSet/Model"),
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
							that.navigateBack();
						}
					});
					// release busy indicator
					oBusyDialog.close();
				},
				error: function (e) {
					sap.m.MessageBox.show("Reservation request creation failed", {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "Error",
						actions: [sap.m.MessageBox.Action.OK],
						details: e.response.body,
						onClose: function (oAction) {
							that.navigateBack();
						}
					});
					// release busy indicator
					oBusyDialog.close();
				}
			});
		},
		onDeletePress: function (oEvent) {
			this._saveData("D");
		},
		onNavButtonPress: function (oEvent) {
			// this.doRoute("Home");
			// this.clearScreen();
			this.navigateBack();
		},
		onCancelPress: function (oEvent) {
			// var headerModel = this.getView().getModel("Header");
			// this.doRoute("VehicleDetails",headerModel.getProperty("/VehicleDetailSet/VHVIN"));
			// 	this.clearScreen();
			this.navigateBack();
		},
		getCurrentDate: function () {
			var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "yyyy-MM-dd"
			});
			var todaydate = dateFormat.format(new Date());
			var date = todaydate + "T00:00:00";
			return date;
		},
		/**
		 *@memberOf ca.toyota.demoreservation.demoreservation.controller.RequestDetail
		 */
		onBehalfValueChange: function (oEvent) {
			//This code was generated by the layout editor.
			//reset employee selection values
			if (this.byId("onBehalf").getValue() === "") {
				this.byId("idFirstName").setValue("");
				this.byId("idLastName").setValue("");
				this.byId("idEmail").setValue("");
			}
		},
		/**
		 *@memberOf ca.toyota.demoreservation.demoreservation.controller.RequestDetail
		 */
		onSelectDepartment: function (oEvent) {
			//This code was generated by the layout editor.
		},
		clearScreen: function(){
			var that = this;
			that.byId("reqtype").setSelectedKey("");
			that.byId("onBehalf").setValue("");
			that.byId("idFirstName").setValue("");
			that.byId("idLastName").setValue("");
			that.byId("idDeptName").setSelectedKey("");
			 that.byId("idEmail").setValue("");
			that.byId("purtype").setSelectedKey("");
			that.byId("idPurName").setValue("");
			that.byId("idPurchDate").setValue("");
		},
		navigateBack: function(){
			var headerModel = this.getView().getModel("Header");
			this.doRoute("VehicleDetails",headerModel.getProperty("/VehicleDetailSet/VHVIN"));
			this.clearScreen();
		}
	});
});