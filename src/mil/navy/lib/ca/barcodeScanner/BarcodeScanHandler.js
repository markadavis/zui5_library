sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/resource/ResourceModel"
], function(UI5Object, ResourceModel) {
	"use strict";

	return UI5Object.extend("mil.navy.lib.ca.barcodeScanner.BarcodeScanHandler", {

		/**
		 * Handles application scanning by automatically attaching the appropriate API.
		 * @class
		 * @alias mil.navy.lib.ca.barcodeScanner.BarcodeScanHandler
		 * 
		 * @public
		 * @param {sap.ui.core.UIComponent} oComponent reference to the app's component
		 * @param {String} sProfile the Data Wedge 'scan profile' to be used.
		 */
		constructor: function(oComponent, sProfile) {
			this._oComponent = oComponent;
			this._sAppID = this._oComponent.getManifestEntry ? this._oComponent.getManifestEntry("sap.app").id : this._oComponent.getMetadata().getName();
			this._oResourceModel = new ResourceModel({
				bundleName: "mil.navy.lib.ca.barcodeScanner.i18n"
			});
			this._oResourceBundle = this._oResourceModel.getResourceBundle();
			this._bHasHardwareScanner = this._registerBarcodeHardware(sProfile);
			this._bHasCameraScanner = !this._bHasHardwareScanner &&
				window.cordova &&
				window.cordova.hasOwnProperty("plugins") &&
				window.cordova.plugins.hasOwnProperty("barcodeScanner") ? true : false;
		},



		/* =========================================================== */
		/* begin: event handler methods                                */
		/* =========================================================== */

		/**
		 * Activate the Camera Scanner.
		 * The hardware scanner has an event listener which is bound to an
		 * external API via a cordova plugin and is activated by a hardware
		 * event. The camera scanner, however, will need to be triggered by
		 * some software event bound to the UI (ie. A buttonpress event).
		 * @public
		 */
		onCameraScanner: function() {
			this.startCameraScanner();
		},



		/* =========================================================== */
		/* begin: public methods                                       */
		/* =========================================================== */

		/**
		 * Report the status of the Camera Scanner cordova plugin.
		 * @return {Boolean} true if the camera scanner cordova plugin exists.
		 * @public
		 */
		hasCameraScanner: function() {
			return this._bHasCameraScanner;
		},

		/**
		 * Report the status of the hardware scanner cordova plugin.
		 * @return {Boolean} true if the hardware scanner cordova plugin exists.
		 * @public
		 */
		hasHardwareScanner: function() {
			return this._bHasHardwareScanner;
		},

		/**
		 * Set the Datawedge Scan Profile ID to use for scaned event handling.  If an ID
		 * is not passed in, the default value currently set will be used.
		 * @param {String} sID the name of the configured Datawedge profile to be used.
		 * @return {Object} 'this' for function chaining.
		 * @public
		 */
		sDefaultProfile: "Fiori",
		_sCurrentProfile: "",
		setScanProfile: function(sId) {
			if (sId) {
				this._sCurrentProfile = sId;
			} else if (!this._sCurrentProfile) {
				this._sCurrentProfile = this.sDefaultProfile;
			}
			if (window.datawedge) {
				window.datawedge.switchProfile(this._sCurrentProfile);
			}
			return this;
		},

		/**
		 * Set the input compomponent ID to use for scaned input.
		 * @param {String} sID the DOM ID of the element to receive the scanned input.
		 * @return {Object} 'this' for function chaining.
		 * @public
		 */
		_sScanId: "",
		setScanId: function(sId) {
			this._sScanId = sId;
			return this;
		},

		/**
		 * Get the input compomponent ID to use for scaned input.
		 * @returns {String} The DOM ID of the element to receive the scanned input.
		 * @public
		 */
		getScanId: function() {
			return this._sScanId;
		},

		/**
		 * Set the hardware scan input recipient.
		 * @param {Object} oListener object to receive the scaned value.
		 * @return {Object} 'this' for function chaining.
		 * @public
		 */
		_oScanListeners: {},
		registerScanListener: function(oListener) {
			this._oScanListeners[oListener.id] = oListener;
			return this;
		},

		/**
		 * Start the Camera Scanner (cordova plugin) and capture the barcode.
		 * @public
		 */
		startCameraScanner: function() {
			if (this._bHasCameraScanner && this._sScanId) {
				window.cordova.plugins.barcodeScanner.scan(
					function(oData) { // Success
						if (!oData.cancelled) {
							if (this._oScanListeners.hasOwnProperty(this._sScanId) && this._oScanListeners[this._sScanId]) {
								var oListener = this._oScanListeners[this._sScanId];
								if (oListener.hasOwnProperty("onScan")) {
									oListener.onScan(oData.text);
								} else {
									jQuery.sap.log.warning("Barcode scanner: No 'onScan' event found for registered handler (Scan ID) '" + this._sScanId + "'", this._sAppID);
								}
							} else {
								jQuery.sap.log.warning("Barcode scanner: No handler method registered for Scan ID '" + this._sScanId + "'" , this._sAppID);
							}
						}
					}.bind(this),
					function(oError) { // Fail
						jQuery.sap.log.error("Barcode scanning failed: " + JSON.stringify(oError), "", this._sAppID);
					}
				);
			} else {
				if (this._bHasCameraScanner) {
					jQuery.sap.log.warning("No listener bound to camera barcode scan function.", "", this._sAppID);
				} else {
					jQuery.sap.log.warning("Barcode scanner: The camera scanner was called, but the plugin was not found.", "", this._sAppID);
				}
			}
		},



		/* =========================================================== */
		/* begin: private methods                                      */
		/* =========================================================== */

		/**
		 * Register the callback for any hardware barcode scanning API's found (installed).
		 * @param {String} sProfile the Data Wedge 'scan profile' to be used.
		 * @return {Boolean} set to true if a hardware scanner API was succesfully registered.
		 * @private
		 */
		_registerBarcodeHardware: function(sProfile) {
			var bHaveHardwareScanner = false;

			// Loop through all known hardware scanner API's to find the first installed handler.
			[this._registerForDataWedge].filter(function(fnRegister) {
				if (!bHaveHardwareScanner) {
					bHaveHardwareScanner = fnRegister(this.listener, this.profile);
				}
			}, {
				listener: this,
				profile: sProfile
			});

			// Create a log entry if no hardware scanner is installed.
			if (!bHaveHardwareScanner) {
				if (this._bHasCameraScanner) {
					jQuery.sap.log.warning("No hardware barcode scanner available. Camera Scanning has been activated.", "", this._sAppID);
				} else {
					jQuery.sap.log.warning("No barcode scanning functionality available.", "", this._sAppID);
				}
			}

			return bHaveHardwareScanner;
		},

		/**
		 * Register the callback for the DataWedge Hardware Scanner API.
		 * @param {Object} oListener the 'this' object to bind to the registration event handler.
		 * @param {String} sProfile the DataWedge 'scan profile' to be used.
		 * @return {Boolean} set to true if the DataWedge plugin was successfully registered.
		 * @private
		 */
		_registerForDataWedge: function(oListener, sProfile) {
			var bHaveDataWedge = false;
			if (window.datawedge) {
				oListener.setScanProfile(sProfile);
				bHaveDataWedge = true;
				window.datawedge.registerForBarcode(function(oData) {
					if (this._sScanId) {
						if (this._oScanListeners.hasOwnProperty(this._sScanId) && this._oScanListeners[this._sScanId]) {
							var oScanListener = this._oScanListeners[this._sScanId];
							if (oScanListener.hasOwnProperty("onScan")) {
								if (oScanListener.hasOwnProperty("controller")) {
									oScanListener.onScan.call(oScanListener.controller, oData.barcode);
								} else {
									oScanListener.onScan(oData.barcode);
								}
							} else {
								jQuery.sap.log.warning("Barcode scanner: No onScan event bound for Scan ID " + this._sScanId, "", this._sAppID);
							}
						}
					} else {
						jQuery.sap.log.warning("Barcode scanner:  NO INPUT for Type " + oData.type + ", Code " + oData.barcode, "", this._sAppID);
					}
				}.bind(oListener));
			}
			return bHaveDataWedge;
		}

	});

});