sap.ui.define(["ca/toyota/demoreservation/demoreservation/controller/BaseController"], function (BaseController) {
	"use strict";
	return BaseController.extend("ca.toyota.demoreservation.demoreservation.controller.VehicleDetails", {
		onInit: function () {
			this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		//	this.initSecurity();
		},
		onRouteMatched: function (oEvent) {
			var oArgs;
			oArgs = oEvent.getParameter("arguments");
			this.getVehicleData(oArgs.vguid);
		},
		onNavButtonPress: function (oEvent) {
			this.doRoute("Home");
		},
		_onEditPress: function (oEvent) {
			//	this.doRoute("RequestDetail");
			var vhvin = this.getView().getModel().getData().VehicleDetailSet.VHVIN;
			var Zresreq = this.getView().getModel().getData().VehicleDetailSet.ZRESREQ;
			if(Zresreq===""){
				// msg
			}else{
			this.doReqRoute("RequestDetail",vhvin,Zresreq);
			}

		},
		getVehicleData: function (VHVIN) {
			var email = sap.ui.getCore().getModel("UserDataModel").getData().Email;
			//testing
		//	email = "anubha_pandey@toyota.ca";
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
					if(oData.ZRESREQ ===""){
						// Reservation request not exists for this vehicle, so enable "Reserve" button
						that.byId("btnReserve").setVisible(true);
						that.byId("btnEdit").setVisible(false);
						// no reservation exists
						that.byId("pageReservation").setVisible(false);
						that.byId("pageReservation").setTitle("No reservation exists");
					}else{
						// Reservation request exists for this vehicle, so enable "Edit" button
						that.byId("btnReserve").setVisible(false);
						that.byId("btnEdit").setVisible(true);
						that.byId("pageReservation").setVisible(true);
						that.byId("pageReservation").setTitle("Reservation Details");
					}
					that.getView().setModel(oJSONModel);
					that.getView().byId("listFacOption").setModel(oJSONModel);
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
		/**
		 *@memberOf ca.toyota.demoreservation.demoreservation.controller.VehicleDetails
		 */
		_onCreatePress: function (oEvent) {
			var vhvin = this.getView().getModel().getData().VehicleDetailSet.VHVIN;
			this.doReqRoute("RequestDetail",vhvin,"C");
			// this.getOwnerComponent().getRouter().navTo("RequestDetail", {
			// 	vhvin: vhvin,
			// 	action: "C"
			// });
		},
		initSecurity:function(){
			this.UserData = new sap.ui.model.json.JSONModel();
			this.getView().setModel(this.UserData, "UserDataModel");
			sap.ui.getCore().setModel(this.UserData, "UserDataModel");
			var that = this;

			//	sap.ui.core.BusyIndicator.show();
				$.ajax({
				dataType: "json",
				url: "/demoreservation-node/userDetails/attributes",
				type: "GET",
				success: function (userAttributes) {
		//			sap.ui.core.BusyIndicator.hide();
					console.log("User Attributes", userAttributes);
					var data ={
					"FirstName": userAttributes.samlAttributes.FirstName,
					"LastName": userAttributes.samlAttributes.LastName,
					"Email": userAttributes.samlAttributes.Email
					};
					that.UserData.setData(data);
					sap.ui.core.BusyIndicator.hide();
					that.UserData.updateBindings(true);
					that.UserData.refresh(true);
				},
				error: function (oError) {
		//			sap.ui.core.BusyIndicator.hide();
				}
			});
			
			// Current user scope
				$.ajax({
				dataType: "json",
				url: "/demoreservation-node/userDetails/currentScopesForUser",
				type: "GET",
				success: function (scopesData) {
					console.log("currentScopesForUser", scopesData);
					var type = scopesData.loggedUserType;
					that.UserData.setProperty("/Type",type);
					
					if(type === "TCI_Admin"){
						that.UserData.setProperty("/AdminVisible",true);
					}else{
						that.UserData.setProperty("/AdminVisible",false);
					}
				},
				error: function (oError) {}
			});
		}
	});
});