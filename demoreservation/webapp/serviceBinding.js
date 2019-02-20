function initModel() {
	var sUrl = "/demoreservation-node/node/ZCDS_DEMO_RESERVATION_CDS/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}