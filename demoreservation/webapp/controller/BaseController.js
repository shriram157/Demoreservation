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
		}
	});
});