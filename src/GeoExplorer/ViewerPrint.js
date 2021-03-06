/**
 * Copyright (c) 2009-2010 The Open Planning Project
 *
 * @requires GeoExplorer.js
 */

/** api: (define)
 *  module = GeoExplorer
 *  class = Embed
 *  base_link = GeoExplorer
 */
Ext.namespace("gxp");

/** api: constructor
 *  ..class:: GeoExplorer.Viewer(config)
 *
 *  Create a GeoExplorer application suitable for embedding in larger pages.
 */
GeoExplorer.ViewerPrint = Ext.extend(GeoExplorer.Viewer, {
    
    /** api: config[useCapabilities]
     *  ``Boolean`` If set to false, no Capabilities document will be loaded.
     */
    
    /** api: config[useToolbar]
     *  ``Boolean`` If set to false, no top toolbar will be rendered.
     */

	
    initMapPanel: function() {
        this.mapItems = [];

        OpenLayers.IMAGE_RELOAD_ATTEMPTS = 5;
        OpenLayers.Util.onImageLoadErrorColor = "transparent";

        GeoExplorer.superclass.initMapPanel.apply(this, arguments);
    },	
	
    /** private: method[initPortal]
     * Create the various parts that compose the layout.
     */
    initPortal: function() {

        // TODO: make a proper component out of this



            this.toolbar = new Ext.Toolbar({
                xtype: "toolbar",
                region: "north",
                autoHeight: true,
                disabled: true,
                id: "paneltbar",
                items: this.createTools()
            });
            this.on("ready", function() {
                if (this.useToolbar)
                    this.toolbar.enable();
                else
                    this.toolbar.hide();
            }, this);


        this.mapPanelContainer = new Ext.Panel({
            layout: "card",
            region: "center",
            ref: "../main",
            tbar: this.toolbar,
            defaults: {
                border: false
            },
            items: [
                this.mapPanel
            ],
            ref: "../main",
            activeItem: 0
        });
        if (window.google && google.earth) {
            this.mapPanelContainer.add(
                new gxp.GoogleEarthPanel({
                    mapPanel: this.mapPanel,
                    listeners: {
                        beforeadd: function(record) {
                            return record.get("group") !== "background";
                        }
                    }
                })
            );
        }
        
        this.portalItems = [
            this.mapPanelContainer
        ];
        
        
        function processResult(btn){
        	if (btn =="ok")
        		{
        			window.print();
        		}
        };
        
        
        var printMsg = "Press OK to print this page as is.  " +
		 "If you would like to adjust the map extent, press Cancel," +
		 " then use your browser's print button when you are ready";
        
        this.on("portalready", function() {
            Ext.Msg.show({
            	title: 'Print Map',
            	msg: printMsg,
        		buttons: Ext.Msg.OKCANCEL,
        		fn: processResult
            });
        });
        
        GeoExplorer.superclass.initPortal.apply(this, arguments);



    }
        
    
});
