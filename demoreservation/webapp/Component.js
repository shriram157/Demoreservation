sap.ui.define([
	"sap/base/i18n/ResourceBundle",
	"sap/m/Dialog",
	"sap/m/Text",
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"ca/toyota/demoreservation/demoreservation/model/models"
], function (ResourceBundle, Dialog, Text, UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("ca.toyota.demoreservation.demoreservation.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			// Get resource bundle
			var locale = jQuery.sap.getUriParameters().get('Language');
			var bundle = !locale ? ResourceBundle.create({
				url: './i18n/i18n.properties'
			}) : ResourceBundle.create({
				url: './i18n/i18n.properties',
				locale: locale
			});

			// Attach XHR event handler to detect 401 error responses for handling as timeout
			var sessionExpDialog = new Dialog({
				title: bundle.getText('SESSION_EXP_TITLE'),
				type: 'Message',
				state: 'Warning',
				content: new Text({
					text: bundle.getText('SESSION_EXP_TEXT')
				})
			});
			var origOpen = XMLHttpRequest.prototype.open;
			XMLHttpRequest.prototype.open = function () {
				this.addEventListener('load', function (event) {
					// TODO Compare host name in URLs to ensure only app resources are checked
					if (event.target.status === 401) {
						if (!sessionExpDialog.isOpen()) {
							sessionExpDialog.open();
						}
					}
				});
				origOpen.apply(this, arguments);
			};

			this._initUserDataModel();
		},

		_initUserDataModel: function () {
			this.UserData = new sap.ui.model.json.JSONModel();
			sap.ui.getCore().setModel(this.UserData, "UserDataModel");
			var that = this;
			$.ajax({
				dataType: "json",
				url: "/demoreservation-node/userDetails/attributes",
				type: "GET",
				async: false,
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
					// console.log("Error in fetching user details from LDAP", oError);
				}
			});

			// Current user scope
			$.ajax({
				dataType: "json",
				url: "/demoreservation-node/userDetails/currentScopesForUser",
				type: "GET",
				async: false,
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
				},
				error: function (oError) {
					console.log("Error in fetching user details from LDAP", oError);
					that.UserData.setProperty("/Type", "TCI_User");
					that.UserData.setProperty("/AdminVisible", false);
				}
			});
		}
	});
});