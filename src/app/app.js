/**
 * Add all your dependencies here.
 *
 * @require widgets/Viewer.js
 * @require plugins/LayerTree.js
 * @require plugins/OLSource.js
 * @require plugins/OSMSource.js
 * @require plugins/WMSCSource.js
 * @require plugins/ZoomToExtent.js
 * @require plugins/NavigationHistory.js
 * @require plugins/Zoom.js
 * @require plugins/AddLayers.js
 * @require plugins/RemoveLayer.js
 * @require RowExpander.js
 * @require OpenLayers/Request.js
 * @require plugins/MapBoxSource.js
 * @require plugins/MapQuestSource.js
 * @require plugins/BingSource.js
 * @require overrides/override-ext-ajax.js
 * @require widgets/EmbedMapDialog.js
 * @require plugins/FeatureManager.js
 * @require plugins/FeatureEditor.js
 */

Ext.ns("WorldMap");

WorldMap.Viewer = Ext.extend(gxp.Viewer, {

    constructor: function(config) {
        config = config || {};

        // Starting with this.authorizedRoles being undefined, which means no
        // authentication service is available
        if (config.authStatus === 401) {
            // user has not authenticated or is not authorized
            this.authorizedRoles = [];
        } else if (config.authStatus !== 404) {
            // user has authenticated
            this.authorizedRoles = ["ROLE_ADMINISTRATOR"];
        }
        // should not be persisted or accessed again
        delete config.authStatus;

        config.portalConfig = {
            layout: "border",
            region: "center",
        
            // by configuring items here, we don't need to configure portalItems
            // and save a wrapping container
            items: [{
                id: "centerpanel",
                xtype: "panel",
                layout: "fit",
                region: "center",
                border: false,
                items: ["mymap"]
            }, {
                id: "westpanel",
                xtype: "container",
                layout: "fit",
                region: "west",
                width: 200
            }],
            bbar: {id: "mybbar"}
        };
        if (config.portalItems) {
            config.portalConfig.items = config.portalConfig.items.concat(config.portalItems);
        }
    
        // configuration of all tool plugins for this application
        config.tools = [{
            ptype: 'gn_xhrtrouble'
        }, {
            ptype: 'gn_save'
        }, {
            ptype: "gxp_layertree",
            outputConfig: {
                id: "tree",
                border: true,
                tbar: [] // we will add buttons to "tree.bbar" later
            },
            outputTarget: "westpanel"
        }, {
            ptype: "gxp_addlayers",
            actionTarget: "tree.tbar"
        }, {
            ptype: "gn_layerinfo",
            actionTarget: ["tree.contextMenu"]
        }, {
            ptype: "gxp_removelayer",
            actionTarget: ["tree.tbar", "tree.contextMenu"]
        }, {
            ptype: "gxp_zoomtoextent",
            actionTarget: "map.tbar"
        }, {
            ptype: "gxp_zoom",
            actionTarget: "map.tbar"
        }, {
            ptype: "gxp_navigationhistory",
            actionTarget: "map.tbar"
        }, {
            ptype: "gxp_featuremanager",
            id: "featuremanager",
            listeners: {
                layerchange: function(mgr, layer, schema) {
                    this.checkLayerPermissions(layer, 'tree');
                },
                scope: this
            },
            maxFeatures: 20,
            paging: false
        }, {
            ptype: "gxp_featureeditor",
            featureManager: "featuremanager",
            autoLoadFeature: true
        }, {
            actions: ['->']
        }, {
            ptype: 'gn_savehyperlink'
        }];
    
        // layer sources
        if (!config.sources) {
            config.sources = {
                local: {
                    ptype: "gxp_wmscsource",
                    url: "/geoserver/wms",
                    version: "1.1.1"
                },
                osm: {
                    ptype: "gxp_osmsource"
                }
            };
        }
    
        // map and layers
        if (!config.map) {
            config.map = {
                id: "mymap", // id needed to reference map in portalConfig above
                title: "Map",
                projection: "EPSG:900913",
                center: [-10764594.758211, 4523072.3184791],
                zoom: 3,
                layers: [{
                    source: "osm",
                    name: "mapnik",
                    group: "background"
                }, {
                    source: "local",
                    name: "usa:states",
                    selected: true
                }],
                items: [{
                    xtype: "gx_zoomslider",
                    vertical: true,
                    height: 100
                }]
            };
        } else {
            config.map.id = "mymap";
            var items = config.map.items || [];
            items.push({
                xtype: "gx_zoomslider",
                vertical: true,
                height: 100
            });
            config.map.items = items;
        }
        WorldMap.Viewer.superclass.constructor.apply(this, [config]);
    }

});

// mixin
Ext.override(WorldMap.Viewer, GeoNode.ComposerMixin);
