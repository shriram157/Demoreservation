function initModel() {
	var sUrl = "/demoreservation-node/node/Z_VEHICLE_DEMO_RESERVATION_SRV_02/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}