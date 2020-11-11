sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent",
	"sap/ui/model/json/JSONModel"
], function (Controller, UIComponent, JSONModel) {
	"use strict";

	return Controller.extend("ca.toyota.demoreservation.demoreservation.controller.BaseController", {

		onInit: function () {
			this.initSecurity();
		},
		/* 
		 * Abstract Method - Will be implemented in SubClasses 
		 */
		onRouteMatched: function () {

		},

		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */

		getRouter: function () {
			this._oRouter = UIComponent.getRouterFor(this);
			if (this._oRouter === undefined) {
				this._oRouter = UIComponent.getRouterFor(sap.ui.getCore().byId("rootView"));
			}
			return this._oRouter;
		},

		/**
		 * Convenience method for route navigation by passing router name as an argument.
		 * @public
		 * @param {string} [routerName] router name
		 * @returns {undefined}
		 */

		doRoute: function (routerName, param) {
			this._oRouter = this.getRouter();
			this._oRouter.navTo(routerName, {
				vguid: param
			});
			//	this._oRouter.navTo(routerName,param);
		},
		doReqRoute: function (routerName, param1, param2) {
			this._oRouter = this.getRouter();
			this._oRouter.navTo(routerName, {
				vhvin: param1,
				Zresreq: param2
			});
		},
		doReserveRoute: function (routerName, param) {
			this._oRouter = this.getRouter();
			this._oRouter.navTo(routerName, {
				admin: param
			});
			//	this._oRouter.navTo(routerName,param);
		},
		initAppConfig: function() {
			this.AppConfig = new sap.ui.model.json.JSONModel();
			sap.ui.getCore().setModel(this.AppConfig, "AppConfig");
			var that = this;
			$.ajax({
				dataType: "json",
				url: "/demoreservation-node/appConfig",
				type: "GET",
				success: function (responseData) {
					that.AppConfig.setData(responseData);
					that.AppConfig.updateBindings(true);
					that.AppConfig.refresh(true);
				},
				error: function (oError) {
					// console.log("Error in fetching user details from LDAP", oError);
				}
			});
		},

		initSecurity: function () {
			this.UserData = new sap.ui.model.json.JSONModel();
			this.getView().setModel(this.UserData, "UserDataModel");
			sap.ui.getCore().setModel(this.UserData, "UserDataModel");
			var that = this;
			var oBusyDialog = new sap.m.BusyDialog();
			oBusyDialog.open();
			$.ajax({
				dataType: "json",
				url: "/demoreservation-node/userDetails/attributes",
				type: "GET",
				success: function (userAttributes) {
					that.UserData.setProperty("/FirstName", userAttributes.samlAttributes.FirstName[0]);
					that.UserData.setProperty("/LastName", userAttributes.samlAttributes.LastName[0]);
					that.UserData.setProperty("/Email", userAttributes.samlAttributes.Email[0]);
					that.UserData.setProperty("/Userid", userAttributes.userProfile.id);
					//	sap.ui.core.BusyIndicator.hide();
					that.UserData.updateBindings(true);
					that.UserData.refresh(true);
				},
				error: function (oError) {
					oBusyDialog.close();
					// console.log("Error in fetching user details from LDAP", oError);
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
					// var type="TCI_Admin";
					that.UserData.setProperty("/Type", type);
					if (type === "TCI_Admin") {
						that.UserData.setProperty("/AdminVisible", true);
					} else {
						that.UserData.setProperty("/AdminVisible", false);
					}
					var DemoModel = new JSONModel();
					that.getView().setModel(DemoModel, "DemoModel");

					// that.getAllVehicleData(function (rItems) {
					// 	DemoModel.setProperty("/vehicleListSet", rItems);
					// 	DemoModel.updateBindings(true);
					// });
					// that.UserData.setProperty("/Type", "TCI_User"); //remove once local testing done
					var uri = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02";
					var sPath;

					if (that.UserData.getProperty("/Type") == "TCI_User") {
						sPath = "/vehicleListSet?$format=json&$filter=Emp eq 'E'";
					} else {
						sPath = "/vehicleListSet?$format=json&$filter=Emp eq ''";
					}
					$.ajax({
						dataType: "json",
						url: uri + sPath,
						type: "GET",
						success: function (vehicleData) {
							that.DemoModel = new sap.ui.model.json.JSONModel();
							that.getView().setModel(that.DemoModel, "DemoModel");
							var obj = {
								vehicleListSet: []
							};
							obj.vehicleListSet = vehicleData.d.results;
							that.DemoModel.setData(obj);
							that.DemoModel.updateBindings(true);
							oBusyDialog.close();
						},
						error: function (oError) {
							oBusyDialog.close();
						}
					});
				},
				error: function (oError) {
					console.log("Error in fetching user details from LDAP", oError);
					that.UserData.setProperty("/Type", "TCI_User");
					that.UserData.setProperty("/AdminVisible", false);
					oBusyDialog.close();
				}
			});
		}
	});
});