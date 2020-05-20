sap.ui.define([
	"ca/toyota/demoreservation/demoreservation/controller/BaseController",
	"sap/m/MessageBox",
	"sap/ui/core/routing/History",
	"sap/m/Dialog",
	"sap/m/Button",
	'sap/m/Label',
	'sap/m/Text'
], function (BaseController, MessageBox, History, Dialog, Button, Label, Text) {
	"use strict";
	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.RequestDetail", {
		onInit: function () {
			//	this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.getRoute("RequestDetail").attachMatched(this.onRouteMatched, this);

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
			if (oArgs.Zresreq === undefined) {
				that.action = "";
			} else if (oArgs.Zresreq !== "C") {
				// Edit Reservation
				that.getReservationData(oArgs.Zresreq);
				that.action = "U";
				// Make Delete button visible
				that.byId("btnDelete").setVisible(true);
			} else if (oArgs.Zresreq === "C") {
				that.action = "C";
				that.byId("idHboxCheqDate").setVisible(false);
			}
			this.getVehicleData(oArgs.vhvin);

			var oLocalModel = new sap.ui.model.json.JSONModel({
				enableSubmitBtn: true
			});
			this.getView().setModel(oLocalModel, "LocalModel");

			// On employee login, fill details
			var type = sap.ui.getCore().getModel("UserDataModel").getData().Type;
			var userid = sap.ui.getCore().getModel("UserDataModel").getData().Userid;
			if (type === "TCI_User") {
				that.getView().byId("reqtype").removeItem(2);
				that.byId("onBehalf").setEnabled(false);
				that.byId("onBehalf").setValue(userid);
				that.byId("idFirstName").setValue(sap.ui.getCore().getModel("UserDataModel").getData().FirstName);
				that.byId("idLastName").setValue(sap.ui.getCore().getModel("UserDataModel").getData().LastName);
				that.byId("idEmail").setValue(sap.ui.getCore().getModel("UserDataModel").getData().Email);
				that.byId("h_department").setVisible(false);
				that.byId("idHboxCheqDate").setVisible(false);
				var dept = that.getEmployeeData("E", "")[0];
				that.byId("idDept").setValue(dept);
			}
		},
		initPage: function () {
			this.byId("h_onbehalf").setVisible(true);
			this.byId("h_department").setVisible(true);
		},

		validateEmail: function (oEmailVal) {
			// var mailregex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
			// var mailregex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
			// var mailregex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
			// if (mailregex.test(oEmailVal) == false) {
			// 	MessageBox.show("Please enter valid Email address", MessageBox.Icon.ERROR, "Error",
			// 		MessageBox.Action.OK, null, null);
			// 	this.getView().getModel("LocalModel").setProperty("/enableSubmitBtn", false);
			// } else {
			// 	this.getView().getModel("LocalModel").setProperty("/enableSubmitBtn", true);
			// }
		},
		getVehicleData: function (VHVIN) {
			var that = this,
				sPath = "/vehicleListSet('" + VHVIN + "')",
				oDetailModel = that.getOwnerComponent().getModel("DemoOdataModel");
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
			var sPath = "/zc_demo_reservationSet('" + resreq + "')",
				that = this,
				oDetailModel = that.getOwnerComponent().getModel("DemoOdataModel");
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			// read OData model data into local JSON model 
			oDetailModel.read(sPath, {
				method: "GET",
				success: function (oData, oResponse) {
					var oJSONModel = new sap.ui.model.json.JSONModel();
					oJSONModel.setData(oData);
					that.getView().setModel(oJSONModel, "Reservation");
					if (oData.ZREQTYP === "E" || oData.ZREQTYP === "C" || oData.ZREQTYP === "R" || oData.ZREQTYP === "T") {
						that.byId("h_onbehalf").setVisible(true);
						that.byId("h_department").setVisible(false);
						that.getEmployeeData(oData.ZREQTYP, "");
					} else {
						that.byId("h_onbehalf").setVisible(false);
						that.byId("h_department").setVisible(true);
					}
					// If requested for others, purchase type and name visible	
					if (oData.ZOTHERS) {
						that.byId("h_purchtype").setVisible(true);
						that.byId("h_purchname").setVisible(true);
					} else {
						that.byId("h_purchtype").setVisible(false);
						that.byId("h_purchname").setVisible(false);
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
			var sPath = "/ZC_DEPT",
				that = this,
				oDetailModel = that.getOwnerComponent().getModel("DemoOdataModel");
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			// read OData model data into local JSON model 
			oDetailModel.read(sPath, {
				method: "GET",
				success: function (oData, oResponse) {
					var oJSONModel = that.getOwnerComponent().getModel("localDataModel");
					oJSONModel.setData({
						Department: oData.results
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
		getEmployeeData: function (reqtype, userid) {
			var persg;
			var that = this;
			var email = sap.ui.getCore().getModel("UserDataModel").getData().Email;
			this.logiEmpDept = "";
			this.logiEmpDeptText = "";
			var retData = [];
			if (reqtype === "E") {
				persg = "1";
			} else {
				persg = "2";
			}
			var curr_datetime = this.getCurrentDate();
			var sPath = "/ZC_EMP_DETAILS(datetime'" + encodeURIComponent(curr_datetime) + "')/Set",
				oDetailModel = that.getOwnerComponent().getModel("DemoOdataModel");
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
						if (oData.results[i].usrid_long === email) {
							that.logiEmpDept = oData.results[i].orgeh;
							that.logiEmpDeptText = oData.results[i].orgtx;
							retData[0] = that.logiEmpDeptText;
							retData[1] = oData.results[i].usrid_long;
						}
						if (userid !== "") {
							if (oData.results[i].usrid === userid) {
								that.logiEmpDept = oData.results[i].orgeh;
								that.logiEmpDeptText = oData.results[i].orgtx;
								retData[0] = that.logiEmpDeptText;
								retData[1] = oData.results[i].usrid_long;
							}
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
			return retData;
		},
		suggestionItemSelected: function (evt) {
			//Get Selected Row
			var obj = evt.getParameter("selectedRow").getBindingContext("localDataModel").getObject();
			var data = {
				"fstName": obj.nchmc,
				"lstName": obj.vnamc,
				"email": obj.usrid_long,
				"dept": obj.orgeh,
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
			this.byId("idDept").setValue(obj.orgtx);
			this.logiEmpDept = obj.orgeh;
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
			var type = sap.ui.getCore().getModel("UserDataModel").getData().Type;
			if (type !== "TCI_User") {
				var reqtype = this.byId("reqtype").getSelectedKey();
				if (reqtype === "E" || reqtype === "C" || reqtype === "R" || reqtype === "T") {
					this.byId("h_onbehalf").setVisible(true);
					this.byId("h_department").setVisible(false);
					that.byId("idDeptName").setSelectedKey("");
					that.getEmployeeData(reqtype, "");
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
				this.byId("idDept").setValue("");
			}
		},
		onSubmitPress: function (oEvent) {
			var headerModel = this.getView().getModel("Header");
			var oWaitList = headerModel.getProperty("/VehicleDetailSet/WaitList");

			var that = this;
			if (this.isValidateTrue() && this.onSelectDate()) {
				var oVerb;
				var resrv;
				if (oWaitList > 0) {
					if(oWaitList == 1){
						oVerb = "is";
						resrv = "reservation";
					}else{
						oVerb = "are";
						resrv = "reservations";
					}
					var dialog = new Dialog({
						title: "Pending Reservations",
						type: "Message",
						content: new Text({
							text: "Please note there "+oVerb+" currently "+ oWaitList +" pending "+resrv+" for this vehicle. Do you still wish to submit?"
						}),

						buttons: [
							new Button({
								text: "Yes",
								press: $.proxy(function () {
									if (this.action === "U") {
										that._saveData("U");
									} else {
										that._createData();
									}
									dialog.close();
								}, this)
							}),
							new Button({
								text: "No",
								press: $.proxy(function () {

									dialog.close();
								}, this)
							})

						],

						afterClose: function () {
							dialog.destroy();
						}
					});

					dialog.open();
				} else {
					if (this.action === "U") {
						that._saveData("U");
					} else {
						that._createData();
					}
				}

			}
		},
		_saveData: function (action) {
			var that = this;
			var headerModel = this.getView().getModel("Header");

			var localModel = this.getView().getModel("localDataModel");
			var resModel = this.getView().getModel("Reservation");
			var delIndictator = "";
			var dept = "";
			if (that.byId("reqtype").getSelectedKey() === "D") {
				dept = that.byId("idDeptName").getSelectedKey();
			} else {
				dept = that.logiEmpDept;
			}
			if (action === "D") {
				delIndictator = "X";
			} else {
				delIndictator = "";
			}
			//	this.evt = revertEvent;
			var data = {
				// sample data
				"Zresreq": resModel.getProperty("/Zresreq"),
				"ZSERIES": headerModel.getProperty("/VehicleDetailSet/ZZSERIES"),
				"MATNR": headerModel.getProperty("/VehicleDetailSet/MATNR"),
				"ZZMOYR": headerModel.getProperty("/VehicleDetailSet/ZZMOYR"),
				"ModelDesc": headerModel.getProperty("/VehicleDetailSet/ModelDesc"),
				"EndDate": headerModel.getProperty("/VehicleDetailSet/EndDate"),
				"ColorDesc": headerModel.getProperty("/VehicleDetailSet/ColorDesc"),
				"Driver": headerModel.getProperty("/VehicleDetailSet/Driver"),
				"ZREQTYP": that.byId("reqtype").getSelectedKey(),
				"ZINFO_ID": that.byId("onBehalf").getValue(),
				"ZREQ_NAME": that.byId("idFirstName").getValue(),
				"ZREQ_LNAME": that.byId("idLastName").getValue(),
				"ZDEPT": dept,
				"ZEMAIL": that.byId("idEmail").getValue(),
				"ZOTHERS": that.byId("ipOthers").getSelected(),
				"ZPURTYP": that.byId("purtype").getSelectedKey(),
				"ZPUR_NAME": that.byId("idPurName").getValue(),
				"ZPURDT": that.byId("idPurchDate").getValue(),
				"ZUDEL": delIndictator,
				// X in case of delete
				"ZANOTES": that.byId("idNotes").getValue(),
				"ZCHERQ": "",
				// x in case selected
				"ZCSUDT": that.byId("idDueDate").getValue(),
				"ZCREDT": that.byId("idCheqRecDate").getValue(),
				"ZCREATED_BY": "",
				"ZCREATED_ON": "",
				"Vehicleaction": "",
				"Vehiclenumber": headerModel.getProperty("/VehicleDetailSet/Vehiclenumber"),
				"Vehicleidentnumb": headerModel.getProperty("/VehicleDetailSet/VHVIN")
			};
			var sPath = "/zc_demo_reservationSet('" + resModel.getProperty("/Zresreq") + "')",
				oModifyModel = that.getOwnerComponent().getModel("DemoOdataModel");
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			// Set busy indicator
			oModifyModel.update(sPath, data, {
				success: function (oData, oResponse) {
					// release busy indicator
					sap.m.MessageBox.show("Reservation request updated -" + resModel.getProperty("/Zresreq"), {
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
					var obj = JSON.parse(e.responseText),
						errMsg = obj.error.message.value;
					sap.m.MessageBox.show("Reservation request update failed. " + errMsg, {
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
			var dept = "";
			if (that.byId("reqtype").getSelectedKey() === "D") {
				dept = that.byId("idDeptName").getSelectedKey();
			} else {
				dept = that.logiEmpDept;
			}
			var data = {
				// sample data
				"Zresreq": "",
				"ZSERIES": headerModel.getProperty("/VehicleDetailSet/ZZSERIES"),
				"MATNR": headerModel.getProperty("/VehicleDetailSet/MATNR"),
				"ZZMOYR": headerModel.getProperty("/VehicleDetailSet/ZZMOYR"),
				"ModelDesc": headerModel.getProperty("/VehicleDetailSet/ModelDesc"),
				"EndDate": headerModel.getProperty("/VehicleDetailSet/EndDate"),
				"ColorDesc": headerModel.getProperty("/VehicleDetailSet/ColorDesc"),
				"Driver": headerModel.getProperty("/VehicleDetailSet/Driver"),
				"ZREQTYP": that.byId("reqtype").getSelectedKey(),
				"ZINFO_ID": that.byId("onBehalf").getValue(),
				"ZREQ_NAME": that.byId("idFirstName").getValue(),
				"ZREQ_LNAME": that.byId("idLastName").getValue(),
				"ZDEPT": dept,
				"ZEMAIL": that.byId("idEmail").getValue(),
				"ZOTHERS": that.byId("ipOthers").getSelected(),
				"ZPURTYP": that.byId("purtype").getSelectedKey(),
				"ZPUR_NAME": that.byId("idPurName").getValue(),
				"ZPURDT": that.byId("idPurchDate").getValue(),
				"ZCREATED_BY": "",
				"ZCREATED_ON": "",
				"Vehicleaction": "",
				"Vehiclenumber": headerModel.getProperty("/VehicleDetailSet/Vehiclenumber"),
				"Vehicleidentnumb": headerModel.getProperty("/VehicleDetailSet/VHVIN")
			};
			var sPath = "/zc_demo_reservationSet",
				oModifyModel = that.getOwnerComponent().getModel("DemoOdataModel");

			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			// Set busy indicator
			oModifyModel.create(sPath, data, {
				method: "POST",
				async: false,
				success: function (oData, oResponse) {
					var result = oData.MessageType;
					var msg, icon, title;
					if (result === "S") {
						msg = oData.Message + " : " + oData.Zresreq;
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
					var obj = JSON.parse(e.responseText),
						errMsg = obj.error.message.value;
					sap.m.MessageBox.show("Reservation request creation failed. " + errMsg, {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "Error",
						actions: [sap.m.MessageBox.Action.OK],
						//	details: e.response.body,
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
			this.navigateBack();
		},
		onCancelPress: function (oEvent) {
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
				this.byId("idDept").setValue("");
			}
		},
		/**
		 *@memberOf ca.toyota.demoreservation.demoreservation.controller.RequestDetail
		 */
		onSelectDepartment: function (oEvent) {
			//This code was generated by the layout editor.
		},
		clearScreen: function () {
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
			this.byId("idDept").setValue("");

			that.byId("ipOthers").setSelected(false);
			that.byId("h_purchtype").setVisible(false);
			that.byId("h_purchname").setVisible(false);
			that.byId("noteOthers").setVisible(false);

			that.byId("reqtype").setValueState(sap.ui.core.ValueState.None);
			that.byId("idDeptName").setValueState(sap.ui.core.ValueState.None);
			that.byId("onBehalf").setValueState(sap.ui.core.ValueState.None);
			that.byId("idPurchDate").setValueState(sap.ui.core.ValueState.None);
			that.byId("purtype").setValueState(sap.ui.core.ValueState.None);
			that.byId("idPurName").setValueState(sap.ui.core.ValueState.None);

		},
		navigateBack: function () {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("Reservation", {
					admin: true
				});
			}

			// var headerModel = this.getView().getModel("Header");
			// this.doRoute("VehicleDetails", headerModel.getProperty("/VehicleDetailSet/VHVIN"));
			this.clearScreen();
		},
		isValidateTrue: function () {
			var that = this;
			var type = sap.ui.getCore().getModel("UserDataModel").getData().Type;
			var msg;
			var oBundle = this.getView().getModel("i18n").getResourceBundle();
			var ZOTHERS = that.byId("ipOthers").getSelected();
			var ZPURTYP = that.byId("purtype").getSelectedKey();
			var ZPUR_NAME = that.byId("idPurName").getValue();
			var ZPURDT = that.byId("idPurchDate").getValue();
			if (that.byId("reqtype").getSelectedKey() === "") {
				// Requestor type can not be blank
				msg = oBundle.getText("errReqTypeBlankValidation");
				that.byId("reqtype").setValueState(sap.ui.core.ValueState.Error);
				that.byId("reqtype").setValueStateText(msg);
				return false;
			} else {
				that.byId("reqtype").setValueState(sap.ui.core.ValueState.None);
			}
			if (type !== "TCI_User") {
				// If Admin 
				if (that.byId("reqtype").getSelectedKey() === "D") {
					// select Department not blank validation
					var dept = that.byId("idDeptName").getSelectedKey();
					if (dept === "") {
						msg = oBundle.getText("errDeptBlankValidation");
						that.byId("idDeptName").setValueState(sap.ui.core.ValueState.Error);
						that.byId("idDeptName").setValueStateText(msg);
						return false;
					} else {
						that.byId("idDeptName").setValueState(sap.ui.core.ValueState.None);
					}
				} else {
					var emp = that.byId("onBehalf").getValue();
					// select Employee/Contractor not blank validation
					if (emp === "") {
						msg = oBundle.getText("errEmpBlankValidation");
						that.byId("onBehalf").setValueState(sap.ui.core.ValueState.Error);
						that.byId("onBehalf").setValueStateText(msg);
						return false;
					} else {
						that.byId("onBehalf").setValueState(sap.ui.core.ValueState.None);
					}

					var email = that.byId("idEmail").getValue();
					if (email === "") {
						msg = oBundle.getText("errEmpEmailBlankValidation");
						that.byId("idEmail").setValueState(sap.ui.core.ValueState.Error);
						that.byId("idEmail").setValueStateText(msg);
						return false;
					} else {
						that.byId("idEmail").setValueState(sap.ui.core.ValueState.None);
					}
				}
			} else {
				var email = that.byId("idEmail").getValue();
				if (email === "") {
					msg = oBundle.getText("errEmpEmailBlankValidation");
					that.byId("idEmail").setValueState(sap.ui.core.ValueState.Error);
					that.byId("idEmail").setValueStateText(msg);
					return false;
				} else {
					that.byId("idEmail").setValueState(sap.ui.core.ValueState.None);
				}
			}
			// if (ZPURDT === "") {     // Ideal Purchase date is not mandatory - UAT
			// 	// // Purchase date can't be blank
			// 	msg = oBundle.getText("errCheckPurDateValidation");
			// 	that.byId("idPurchDate").setValueState(sap.ui.core.ValueState.Error);
			// 	that.byId("idPurchDate").setValueStateText(msg);
			// 	return false;
			// } else {
			// 	that.byId("idPurchDate").setValueState(sap.ui.core.ValueState.None);
			// }
			if (ZOTHERS) {
				// If Request for Others checkbox is checked
				if (ZPURTYP === "") {
					// Purchase type can't be blank
					msg = oBundle.getText("errCheckPurTypeValidation");
					that.byId("purtype").setValueState(sap.ui.core.ValueState.Error);
					that.byId("purtype").setValueStateText(msg);
					return false;
				} else {
					that.byId("purtype").setValueState(sap.ui.core.ValueState.None);
				}
				if (ZPUR_NAME === "") {
					// Purchase name can't be blank
					msg = oBundle.getText("errCheckPurNameValidation");
					that.byId("idPurName").setValueState(sap.ui.core.ValueState.Error);
					that.byId("idPurName").setValueStateText(msg);
					return false;
				} else {
					that.byId("idPurName").setValueState(sap.ui.core.ValueState.None);
				}
				return true;
			} else {
				that.byId("purtype").setValueState(sap.ui.core.ValueState.None);
				that.byId("idPurName").setValueState(sap.ui.core.ValueState.None);
				return true;
			}
		},
		/**
		 *@memberOf ca.toyota.demoreservation.demoreservation.controller.RequestDetail
		 */
		selectRequestOther: function (oEvent) {
			var selected = oEvent.getParameter("selected");
			// If requested for others, purchase type and name visible	
			if (selected) {
				this.byId("h_purchtype").setVisible(true);
				this.byId("h_purchname").setVisible(true);
			} else {
				this.byId("h_purchtype").setVisible(false);
				this.byId("h_purchname").setVisible(false);
				this.byId("purtype").setSelectedKey("");
				this.byId("idPurName").setValue("");
			}
		},
		onSelectPurTypeChange: function (oEvent) {
			var purtype = this.byId("purtype").getSelectedKey();
			if (purtype === "O") {
				this.byId("noteOthers").setVisible(true);
			} else {
				this.byId("noteOthers").setVisible(false);
			}
		},
		onEventfillUserInfo: function (oEvent) {
			var that = this;
			var inputuser = "";
			inputuser = that.byId("onBehalf").getValue();
			if (inputuser === "") {

			} else {
				var reqData = {
					"uid": inputuser
				};
				$.ajax({
					dataType: "json",
					url: "/demoreservation-node/node/tci/internal/api/v1.0/security/ldap/rest/getUserByUID",
					type: "POST",
					data: JSON.stringify(reqData),
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json'
					},
					success: function (respdata) {
						if (respdata.errorCode === "ERROR_USER_NOT_FOUND") {
							that.byId("idFirstName").setValue("");
							that.byId("idLastName").setValue("");

							sap.m.MessageBox.show(respdata.errorMessage, {
								icon: sap.m.MessageBox.Icon.ERROR,
								title: "Error",
								actions: [sap.m.MessageBox.Action.OK],
								onClose: function (oAction) {}
							});
						} else {
							var firstName = respdata.tciUser.firstName;
							var lastName = respdata.tciUser.lastName;
							that.byId("idFirstName").setValue(firstName);
							that.byId("idLastName").setValue(lastName);
							that.byId("idDept").setValue(that.getEmployeeData("", inputuser)[0]);
							that.byId("idEmail").setValue(that.getEmployeeData("", inputuser)[1]);
						}
					},
					error: function (oError) {

						sap.m.MessageBox.show("Error is fetching user data from LDAP.", {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "Error",
							actions: [sap.m.MessageBox.Action.OK],
							details: oError.response.body,
							onClose: function (oAction) {}
						});
					}
				});
			}
		},

		onSelectDate: function (oEvent) {
			var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
				pattern: "yyyyMMdd"
			});
			var msg, that = this,
				oBundle = this.getView().getModel("i18n").getResourceBundle();
			var today = dateFormat.format(new Date()),
				selectedPurchaseDate;

			if (this.byId("idPurchDate").getDateValue() !== "" && this.byId("idPurchDate").getDateValue() !== null) {
				selectedPurchaseDate = dateFormat.format(this.byId("idPurchDate").getDateValue());
				if (selectedPurchaseDate < today) {
					// error
					msg = oBundle.getText("errBackdateValidation");
					that.byId("idPurchDate").setValueState(sap.ui.core.ValueState.Error);
					that.byId("idPurchDate").setValueStateText(msg);
					return false;
				} else {
					that.byId("idPurchDate").setValueState(sap.ui.core.ValueState.None);
				}
			}
			if (this.byId("idCheqRecDate").getDateValue() !== "" && this.byId("idCheqRecDate").getDateValue() !== null) {
				selectedPurchaseDate = dateFormat.format(this.byId("idCheqRecDate").getDateValue());
				if (selectedPurchaseDate < today) {
					// error
					msg = oBundle.getText("errBackdateValidation");
					that.byId("idCheqRecDate").setValueState(sap.ui.core.ValueState.Error);
					that.byId("idCheqRecDate").setValueStateText(msg);
					return false;
				} else {
					that.byId("idCheqRecDate").setValueState(sap.ui.core.ValueState.None);
				}
			}
			return true;
		},

		onExit: function () {
			this.destroy();
		}
	});
});