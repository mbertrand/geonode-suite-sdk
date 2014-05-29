/** FILE: GeoExplorer/Composer.js **/
/**
 * Copyright (c) 2009-2010 The Open Planning Project
 *
 * @requires GeoExplorer.js
 * @requires BoundingBoxWidget.js
 * @requires DataCart.js
 * @requires DataCartStore.js
 * @requires DataCartOps.js
 * @requires DataGrid.js
 * @requires SearchTable.js
 * @requires SearchTableRowExpander.js
 * @requires CapabilitiesRowExpander.js
 */

/** api: (define)
 *  module = GeoExplorer
 *  class = GeoExplorer.Composer(config)
 *  extends = GeoExplorer
 */

/** api: constructor
 *  .. class:: GeoExplorer.Composer(config)
 *
 *      Create a GeoExplorer application intended for full-screen display.
 */
GeoExplorer.Composer = Ext.extend(GeoExplorer, {

    /** api: config[cookieParamName]
     *  ``String`` The name of the cookie parameter to use for storing the
     *  logged in user.
     */
    cookieParamName: 'geoexplorer-user',

    // Begin i18n.
    addLayersButtonText: "Add Layers",
    mapText: "Map",
    saveMapText: "Save map",
    exportMapText: "Export map",
    toolsTitle: "Choose tools to include in the toolbar:",
    previewText: "Preview",
    backText: "Back",
    nextText: "Next",
    loginText: "Login",
    logoutText: "Logout, {user}",
    loginErrorText: "Invalid username or password.",
    userFieldText: "User",
    passwordFieldText: "Password",
    tableText: "Table",
    queryText: "Query",
    logoutConfirmTitle: "Warning",
    logoutConfirmMessage: "Logging out will undo any unsaved changes, remove any layers you may have added, and reset the map composition. Do you want to save your composition first?",
    // End i18n.

    constructor: function(config) {
        this.config = config;
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

        this.topicCategories =  config.topicCategories ? config.topicCategories :
            [
                ['farming', 'Farming'],
                ['biota', 'Biota'],
                ['boundaries', 'Boundaries'],
                ['climatologyMeteorologyAtmosphere', 'Climatology/Meteorology/Atmosphere'],
                ['economy', 'Economy'],
                ['elevation', 'Elevation'],
                ['environment', 'Environment'],
                ['geoscientificinformation', 'Geoscientific Information'],
                ['health', 'Health'],
                ['imageryBaseMapsEarthCover', 'Imagery/Base Maps/Earth Cover'],
                ['intelligenceMilitary', 'Intelligence/Military'],
                ['inlandWaters', 'Inland Waters'],
                ['location', 'Location'],
                ['oceans', 'Oceans'],
                ['planningCadastre', 'Planning Cadastre'],
                ['society', 'Society'],
                ['structure', 'Structure'],
                ['transportation', 'Transportation'],
                ['utilitiesCommunications', 'Utilities/Communications']
            ];


        config.tools = [
            {
                ptype: "gxp_layermanager",
                outputConfig: {
                    id: "layers",
                    tbar: [],
                    autoScroll: true
                },
                outputTarget: "tree"
            },
            {
                ptype: "gxp_addcategory",
                actionTarget: ["layers.contextMenu"]
            },{
                ptype: "gxp_renamecategory",
                actionTarget: ["layers.contextMenu"]
            },{
                ptype: "gxp_removecategory",
                actionTarget: ["layers.contextMenu"]
            },
            {
                ptype: "gxp_removelayer",
                actionTarget: ["layers.contextMenu"]
            }, {
                ptype: "gxp_layerproperties",
                id: "layerproperties",
                outputConfig: {defaults: {autoScroll: true}, width: 320},
                actionTarget: ["layers.contextMenu"],
                outputTarget: "tree"
            }, {
                ptype: "gxp_styler",
                id: "styler",
                outputConfig: {autoScroll: true, width: 320},
                actionTarget: ["layers.contextMenu"],
                outputTarget: "tree"
            }, {
                ptype: "gxp_zoomtolayerextent",
                actionTarget: {target: "layers.contextMenu", index: 0}
            }
        ];

        GeoExplorer.Composer.superclass.constructor.apply(this, arguments);
    },

    loadConfig: function(config) {
        GeoExplorer.Composer.superclass.loadConfig.apply(this, arguments);

        var query = Ext.urlDecode(document.location.search.substr(1));
        if (query && query.styler) {
            for (var i=config.map.layers.length-1; i>=0; --i) {
                delete config.map.layers[i].selected;
            }
            config.map.layers.push({
                source: "local",
                name: query.styler,
                selected: true,
                bbox: query.lazy && query.bbox ? query.bbox.split(",") : undefined
            });
            this.on('layerselectionchange', function(rec) {
                var styler = this.tools.styler,
                    layer = rec.getLayer(),
                    extent = layer.maxExtent;
                if (extent && !query.bbox) {
                    this.mapPanel.map.zoomToExtent(extent);
                }
                this.doAuthorized(styler.roles, styler.addOutput, styler);
            }, this, {single: true});
        }

        var allTools = config.viewerTools || this.viewerTools;
        var tools = [];
        var toolConfig;
        for (var i=0, len=allTools.length; i<len; i++) {
            var tool = allTools[i];
            if (tool.checked === true) {
                var properties = ['checked', 'iconCls', 'id', 'leaf', 'loader', 'text'];
                for (var key in properties) {
                    delete tool[properties[key]];
                }
                toolConfig = Ext.applyIf({
                    actionTarget: "paneltbar"
                }, tool);
                tools.push(toolConfig);
            }
        }
        config.tools = tools;
    },

    /** private: method[setCookieValue]
     *  Set the value for a cookie parameter
     */
    setCookieValue: function(param, value) {
        document.cookie = param + '=' + escape(value);
    },

    /** private: method[clearCookieValue]
     *  Clear a certain cookie parameter.
     */
    clearCookieValue: function(param) {
        document.cookie = param + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    },

    /** private: method[getCookieValue]
     *  Get the value of a certain cookie parameter. Returns null if not found.
     */
    getCookieValue: function(param) {
        var i, x, y, cookies = document.cookie.split(";");
        for (i=0; i < cookies.length; i++) {
            x = cookies[i].substr(0, cookies[i].indexOf("="));
            y = cookies[i].substr(cookies[i].indexOf("=")+1);
            x=x.replace(/^\s+|\s+$/g,"");
            if (x==param) {
                return unescape(y);
            }
        }
        return null;
    },

    /** private: method[logout]
     *  Log out the current user from the application.
     */
    logout: function() {
        var callback = function() {
            this.clearCookieValue("JSESSIONID");
            this.clearCookieValue(this.cookieParamName);
            this.setAuthorizedRoles([]);
            window.location.reload();
        };
        Ext.Msg.show({
            title: this.logoutConfirmTitle,
            msg: this.logoutConfirmMessage,
            buttons: Ext.Msg.YESNOCANCEL,
            icon: Ext.MessageBox.WARNING,
            fn: function(btn) {
                if (btn === 'yes') {
                    this.save(callback, this);
                } else if (btn === 'no') {
                    callback.call(this);
                }
            },
            scope: this
        });
    },

    /** private: method[authenticate]
     * Show the login dialog for the user to login.
     */
    authenticate: function() {
        var panel = new Ext.FormPanel({
            url: "../login/",
            frame: true,
            labelWidth: 60,
            defaultType: "textfield",
            errorReader: {
                read: function(response) {
                    var success = false;
                    var records = [];
                    if (response.status === 200) {
                        success = true;
                    } else {
                        records = [
                            {data: {id: "username", msg: this.loginErrorText}},
                            {data: {id: "password", msg: this.loginErrorText}}
                        ];
                    }
                    return {
                        success: success,
                        records: records
                    };
                }
            },
            items: [{
                fieldLabel: this.userFieldText,
                name: "username",
                width: 137,
                allowBlank: false,
                listeners: {
                    render: function() {
                        this.focus(true, 100);
                    }
                }
            }, {
                fieldLabel: this.passwordFieldText,
                name: "password",
                width: 137,
                inputType: "password",
                allowBlank: false
            }],
            buttons: [{
                text: this.loginText,
                formBind: true,
                handler: submitLogin,
                scope: this
            }],
            keys: [{
                key: [Ext.EventObject.ENTER],
                handler: submitLogin,
                scope: this
            }]
        });

        function submitLogin() {
            panel.buttons[0].disable();
            panel.getForm().submit({
                success: function(form, action) {
                    Ext.getCmp('paneltbar').items.each(function(tool) {
                        if (tool.needsAuthorization === true) {
                            tool.enable();
                        }
                    });
                    var user = form.findField('username').getValue();
                    this.setCookieValue(this.cookieParamName, user);
                    this.setAuthorizedRoles(["ROLE_ADMINISTRATOR"]);
                    this.showLogout(user);
                    win.un("beforedestroy", this.cancelAuthentication, this);
                    win.close();
                },
                failure: function(form, action) {
                    this.authorizedRoles = [];
                    panel.buttons[0].enable();
                    form.markInvalid({
                        "username": this.loginErrorText,
                        "password": this.loginErrorText
                    });
                },
                scope: this
            });
        }

        var win = new Ext.Window({
            title: this.loginText,
            layout: "fit",
            width: 235,
            height: 130,
            plain: true,
            border: false,
            modal: true,
            items: [panel],
            listeners: {
                beforedestroy: this.cancelAuthentication,
                scope: this
            }
        });
        win.show();
    },

    /**
     * private: method[applyLoginState]
     * Attach a handler to the login button and set its text.
     */
    applyLoginState: function(iconCls, text, handler, scope) {
        var loginButton = Ext.getCmp("loginbutton");
        loginButton.setIconClass(iconCls);
        loginButton.setText(text);
        loginButton.setHandler(handler, scope);
    },

    /** private: method[showLogin]
     *  Show the login button.
     */
    showLogin: function() {
        var text = this.loginText;
        var handler = this.authenticate;
        this.applyLoginState('login', text, handler, this);
    },

    /** private: method[showLogout]
     *  Show the logout button.
     */
    showLogout: function(user) {
        var text = new Ext.Template(this.logoutText).applyTemplate({user: user});
        var handler = this.logout;
        this.applyLoginState('logout', text, handler, this);
    },

    /** private: method[initPortal]
     * Create the various parts that compose the layout.
     */
    initPortal: function() {

        var westPanel = new gxp.CrumbPanel({
            id: "tree",
            region: "west",
            width: 320,
            split: true,
            collapsible: true,
            collapseMode: "mini",
            hideCollapseTool: true,
            header: false
        });
        var southPanel = new Ext.Panel({
            region: "south",
            id: "south",
            height: 220,
            border: false,
            split: true,
            collapsible: true,
            collapseMode: "mini",
            collapsed: true,
            hideCollapseTool: true,
            header: false,
            layout: "border",
            items: [{
                region: "center",
                id: "table",
                title: this.tableText,
                layout: "fit"
            }, {
                region: "west",
                width: 320,
                id: "query",
                title: this.queryText,
                split: true,
                collapsible: true,
                collapseMode: "mini",
                collapsed: true,
                hideCollapseTool: true,
                layout: "fit"
            }],
            listeners: {
                'expand': function() {
                    var queryManager = Ext.getCmp("querymanager");
                    var featuregrid = Ext.getCmp("featuregrid");
                    if (queryManager) {
                        querymanager.activate();
                        if (featuregrid) {
                            queryManager.showLayer(featuregrid.id, featuregrid.displayMode);
                        }
                    }
                },
                'collapse': function() {
                    var queryManager = Ext.getCmp("querymanager");
                    var featuregrid = Ext.getCmp("featuregrid");
                    if (queryManager) {
                        querymanager.deactivate();
                        if (featuregrid) {
                            queryManager.hideLayer(featuregrid.id);
                        }
                    }
                }
            }
        });

        var gridWinPanel = new Ext.Panel({
            id: 'gridWinPanel',
            collapseMode: "mini",
            title: 'Identify Results',
            region: "west",
            autoScroll: true,
            split: true,
            items: [],
            width:200
        });

        var gridResultsPanel = new Ext.Panel({
            id: 'gridResultsPanel',
            title: 'Feature Details',
            region: "center",
            collapseMode: "mini",
            autoScroll: true,
            split: true,
            items: [],
            width: 400
        });


        var identifyWindow = new Ext.Window({
            id: 'queryPanel',
            layout: "border",
            closeAction: "hide",
            items: [gridWinPanel, gridResultsPanel],
            width: 600,
            height: 400
        });

        var toolbar = new Ext.Toolbar({
            disabled: true,
            id: 'paneltbar',
            items: []
        });
        this.on("ready", function() {

            // enable only those items that were not specifically disabled
            var disabled = toolbar.items.filterBy(function(item) {
                return item.initialConfig && item.initialConfig.disabled;
            });
            toolbar.enable();
            disabled.each(function(item) {
                item.disable();
            });
        });

        var googleEarthPanel = new gxp.GoogleEarthPanel({
            mapPanel: this.mapPanel,
            id: "globe",
            tbar: [],
            listeners: {
                beforeadd: function(record) {
                    return record.get("group") !== "background";
                }
            }
        });

        // TODO: continue making this Google Earth Panel more independent
        // Currently, it's too tightly tied into the viewer.
        // In the meantime, we keep track of all items that the were already
        // disabled when the panel is shown.
        var preGoogleDisabled = [];

        googleEarthPanel.on("show", function() {
            preGoogleDisabled.length = 0;
            toolbar.items.each(function(item) {
                if (item.disabled) {
                    preGoogleDisabled.push(item);
                }
            });
            toolbar.disable();
            // loop over all the tools and remove their output
            for (var key in this.tools) {
                var tool = this.tools[key];
                if (tool.outputTarget === "map") {
                    tool.removeOutput();
                }
            }
            var layersContainer = Ext.getCmp("tree");
            var layersToolbar = layersContainer && layersContainer.getTopToolbar();
            if (layersToolbar) {
                layersToolbar.items.each(function(item) {
                    if (item.disabled) {
                        preGoogleDisabled.push(item);
                    }
                });
                layersToolbar.disable();
            }
        }, this);

        googleEarthPanel.on("hide", function() {
            // re-enable all tools
            toolbar.enable();

            var layersContainer = Ext.getCmp("tree");
            var layersToolbar = layersContainer && layersContainer.getTopToolbar();
            if (layersToolbar) {
                layersToolbar.enable();
            }
            // now go back and disable all things that were disabled previously
            for (var i=0, ii=preGoogleDisabled.length; i<ii; ++i) {
                preGoogleDisabled[i].disable();
            }

        }, this);

        this.mapPanelContainer = new Ext.Panel({
            layout: "card",
            region: "center",
            defaults: {
                border: false
            },
            items: [
                this.mapPanel,
                googleEarthPanel
            ],
            activeItem: 0
        });

        this.portalItems = [{
            region: "center",
            layout: "border",
            tbar: toolbar,
            items: [
                this.mapPanelContainer,
                westPanel,
                southPanel
            ]
        }];



        this.on("ready", function() {

            //If there are feeds on the map, there will be a SelectFeature control.
            //Activate it now.
            if (this.selectControl)
                this.selectControl.activate();

            var startSourceId = null;
            for (var id in this.layerSources) {
                source = this.layerSources[id];
                if (source instanceof gxp.plugins.CatalogueSource)  {
                    startSourceId = id;
                }
            }

            var addLayers = null;
            for (var key in this.tools) {
                var tool = this.tools[key];
                if (tool.ptype === "gxp_addlayers") {
                    addLayers = tool;
                    addLayers.startSourceId = startSourceId;
                    addLayers.catalogSourceKey = startSourceId;
                } else if (tool.ptype == "gxp_layermanager") {
                    this.layerTree = tool;
                    this.fireEvent("setLayerTree");
                    this.addInfo();
                }
            }
            if (addLayers !== null) {
                addLayers.layerTree = this.layerTree;
                if (!this.fromLayer && !this.id) {
                    addLayers.showCapabilitiesGrid();
                }
            }
        }, this);
        GeoExplorer.Composer.superclass.initPortal.apply(this, arguments);
    },

    /**
     * api: method[createTools]
     * Create the toolbar configuration for the main view.
     */
    createTools: function() {
        GeoExplorer.Composer.superclass.createTools.apply(this, arguments);

        new Ext.Button({id: "loginbutton"});

        if (this.authorizedRoles) {
            // unauthorized, show login button
            if (this.authorizedRoles.length === 0) {
                this.showLogin();
            } else {
                var user = this.getCookieValue(this.cookieParamName);
                if (user === null) {
                    user = "unknown";
                }
                this.showLogout(user);
            }
        }

        new Ext.Button({
            id: "addlayersbutton",
            tooltip : this.addLayersButtonText,
            disabled: false,
            text: '<span class="x-btn-text">' + this.addLayersButtonText + '</span>',
            handler : this.showSearchWindow,
            scope: this
        });


        new Ext.Button({
            id: "mapmenu",
            text: this.saveMapText,
            iconCls: null,
            handler: function() {
                this.doAuthorized(["ROLE_ADMINISTRATOR"], function() {
                    this.save(this.showUrl);
                }, this)
            },
            scope: this
        });
    },

    /** private: method[openPreview]
     */
    openPreview: function(embedMap) {
        var preview = new Ext.Window({
            title: this.previewText,
            layout: "fit",
            resizable: false,
            items: [{border: false, html: embedMap.getIframeHTML()}]
        });
        preview.show();
        var body = preview.items.get(0).body;
        var iframe = body.dom.firstChild;
        var loading = new Ext.LoadMask(body);
        loading.show();
        Ext.get(iframe).on('load', function() { loading.hide(); });
    },



    reloadWorldMapSource : function(layerRecords) {
        var geoEx = this;
        if (this.worldMapSourceKey == null)
            this.setWorldMapSourceKey();

        geoEx.addWorldMapLayers(layerRecords);

    },

    setWorldMapSourceKey : function() {
        for (var id in this.layerSources) {
            source = this.layerSources[id];
            if (source && source.url && source.url.replace(this.urlPortRegEx, "$1/").indexOf(
                this.localGeoServerBaseUrl.replace(
                    this.urlPortRegEx, "$1/")) === 0) {
                this.worldMapSourceKey = id;
                break;
            }
        }

    },

    setHGLSourceKey : function() {
        for (var id in this.layerSources) {
            source = this.layerSources[id];
            if (source instanceof gxp.plugins.HGLSource) {
                this.hglSourceKey = id;
            }
        }
        if (this.hglSourceKey == null)
        {
            var hglSource = this.addLayerSource({"config":{"url":"http://hgl.harvard.edu/cgi-bin/tilecache/tilecache.cgi?", "ptype":"gxp_hglsource"}});
            this.hglSourceKey = hglSource.id;
        }

    },

    addWorldMapLayers: function(records) {
        if (this.worldMapSourceKey == null)
            this.setWorldMapSourceKey();
        var wmSource = this.layerSources[this.worldMapSourceKey];
        if (wmSource) {
            this.addLayerAjax(wmSource, this.worldMapSourceKey, records);
        }
    },


    /** private: method[makeExportDialog]
     *
     * Create a dialog providing the HTML snippet to use for embedding the
     * (persisted) map, etc.
     */
    makeExportDialog: function() {

        var mapConfig = this.getState();
        var treeConfig = [];
        for (x = 0,max = this.layerTree.overlayRoot.childNodes.length; x < max; x++) {
            node = this.layerTree.overlayRoot.childNodes[x];
            treeConfig.push({group : node.text, expanded:  node.expanded.toString()  });
        }


        mapConfig.map['groups'] = treeConfig;


        Ext.Ajax.request({
            url: "/maps/snapshot/create",
            method: 'POST',
            jsonData: mapConfig,
            success: function(response, options) {
                var encodedSnapshotId = response.responseText;
                if (encodedSnapshotId != null) {
                    new Ext.Window({
                        title: this.publishActionText,
                        layout: "fit",
                        width: 380,
                        autoHeight: true,
                        items: [
                            {
                                xtype: "gx_linkembedmapdialog",
                                linkUrl: this.rest + (this.about["urlsuffix"] ? this.about["urlsuffix"] : this.id) + '/' + encodedSnapshotId,
                                linkMessage: '<span style="font-size:10pt;">Paste link in email or IM:</span>',
                                publishMessage: '<span style="font-size:10pt;">Paste HTML to embed in website:</span>',
                                url: this.rest + (this.about["urlsuffix"] ? this.about["urlsuffix"] : this.id) + '/' + encodedSnapshotId + "/embed"
                            }
                        ]
                    }).show();
                }
            },
            failure: function(response, options) {
                return false;
                Ext.Msg.alert('Error', response.responseText, this.showMetadataForm);
            },
            scope: this
        });
    },

    showHistory: function() {
        historyWindow = new GeoExplorer.MapSnapshotGrid(this.id);
    },

    /** private: method[initMetadataForm]
     *
     * Initialize metadata entry form.
     */
    initMetadataForm: function() {

        var geoEx = this;

        var titleField = new Ext.form.TextField({
            width: '95%',
            fieldLabel: this.metaDataMapTitle,
            value: this.about.title,
            allowBlank: false,
            enableKeyEvents: true,
            listeners: {
                "valid": function() {
                    if (urlField.isValid()) {
                        //saveAsButton.enable();
                        saveButton.enable();
                    }
                },
                "invalid": function() {
                    //saveAsButton.disable();
                    saveButton.disable();
                }
            }
        });

        //Make sure URL is not taken; if it is, show list of taken url's that start with field value
        Ext.apply(Ext.form.VTypes, {
            UniqueMapId : this.target.id,
            UniqueUrl: function(value, field) {

                var allowedChars = value.match(/^(\w+[-]*)+$/g);
                if (!allowedChars) {
                    this.UniqueUrlText = "URL's can only contain letters, numbers, dashes & underscores."
                    return false;
                }

                Ext.Ajax.request({
                    url: "/maputils/checkurl/",
                    method: 'POST',
                    params : {query:value, mapid: this.UniqueMapId},
                    success: function(response, options) {
                        var urlcount = Ext.decode(response.responseText).count;
                        if (urlcount > 0) {
                            this.UniqueUrlText = "The following URL's are already taken:";
                            var urls = Ext.decode(response.responseText).urls;
                            var isValid = true;
                            for (var u in urls) {
                                if (urls[u].url != undefined && urls[u].url != null)
                                    this.UniqueUrlText += "<br/>" + urls[u].url;
                                if (urls[u].url == value) {
                                    isValid = false;
                                }

                            }
                            if (!isValid)
                                field.markInvalid(this.UniqueUrlText);
                        }
                    },
                    failure: function(response, options) {
                        return false;
                        Ext.Msg.alert('Error', response.responseText, this.showMetadataForm);
                    },
                    scope: this
                });
                return true;
            },

            UniqueUrlText: "The following URL's are already taken, please choose another"
        });

        var urlField = new Ext.form.TextField({
            width:'30%',
            fieldLabel: this.metaDataMapUrl + "<br/><span style='font-style:italic;'>http://" + document.location.hostname + "/maps/</span>",
            labelSeparator:'',
            enableKeyEvents: true,
            validationEvent: 'onblur',
            vtype: 'UniqueUrl',
            itemCls:'x-form-field-inline',
            ctCls:'x-form-field-inline',
            value: this.target.about["urlsuffix"],
            listeners: {
                "valid": function() {
                    if (titleField.isValid()) {
                        //saveAsButton.enable();
                        saveButton.enable();
                    }
                },
                "invalid": function() {
                    //saveAsButton.disable();
                    saveButton.disable();
                }
            }
        });

        var checkUrlBeforeSave = function(as) {
            Ext.getCmp('gx_saveButton').disable();
            //Ext.getCmp('gx_saveAsButton').disable();

            Ext.Ajax.request({
                url: "/maputils/checkurl/",
                method: 'POST',
                params : {query:urlField.getValue(), mapid: geoEx.id},
                success: function(response, options) {
                    var urlcount = Ext.decode(response.responseText).count;
                    var rt = "";
                    var isValid = true;
                    if (urlcount > 0) {
                        rt = "The following URL's are already taken:";
                        var urls = Ext.decode(response.responseText).urls;

                        for (var u in urls) {
                            if (urls[u].url != undefined && urls[u].url != null)
                                rt += "<br/>" + urls[u].url;
                            if (urls[u].url == urlField.getValue()) {
                                isValid = false;
                            }

                        }
                        if (!isValid) {
                            urlField.markInvalid(rt);
                            Ext.getCmp('gx_saveButton').enable();
                            //Ext.getCmp('gx_saveAsButton').enable();
                            return false;
                        }

                    }
                    if (isValid) {
                        geoEx.about.title = titleField.getValue();
                        geoEx.about["abstract"] = abstractField.getValue();
                        geoEx.about["urlsuffix"] = urlField.getValue();
                        geoEx.about["introtext"] = nicEditors.findEditor('intro_text_area').getContent();
                        geoEx.saveMap(as);
                        geoEx.initInfoTextWindow();
                    }
                },
                failure: function(response, options) {
                    Ext.getCmp('gx_saveButton').enable();
                    //Ext.getCmp('gx_saveAsButton').enable();
                    return false;
                    //Ext.Msg.alert('Error', response.responseText, geoEx.showMetadataForm);
                },
                scope: this
            });
        };

        var abstractField = new Ext.form.TextArea({
            width: '95%',
            height: 50,
            fieldLabel: this.metaDataMapAbstract,
            value: this.about["abstract"]
        });


        var introTextField = new Ext.form.TextArea({
            width: 550,
            height: 200,
            fieldLabel: this.metaDataMapIntroText,
            id: "intro_text_area",
            value: this.about["introtext"]
        });


        var metaDataPanel = new Ext.FormPanel({
            bodyStyle: {padding: "5px"},
            labelAlign: "top",
            items: [
                titleField,
                urlField,
                abstractField,
                introTextField
            ]
        });

        metaDataPanel.enable();

        var saveButton = new Ext.Button({
            id: 'gx_saveButton',
            text: this.metadataFormSaveText,
            cls:'x-btn-text',
            disabled: !this.about.title,
            handler: function(e) {
                checkUrlBeforeSave(false);
            },
            scope: this
        });

        this.metadataForm = new Ext.Window({
            title: this.metaDataHeader,
            closeAction: 'hide',
            items: metaDataPanel,
            modal: true,
            width: 600,
            autoHeight: true,
            bbar: [
                "->",
                //saveAsButton,
                saveButton,
                new Ext.Button({
                    text: this.metadataFormCancelText,
                    cls:'x-btn-text',
                    handler: function() {
                        titleField.setValue(this.about.title);
                        abstractField.setValue(this.about["abstract"]);
                        urlField.setValue(this.about["urlsuffix"]);
                        introTextField.setValue(this.about["introtext"]);
                        this.metadataForm.hide();
                    },
                    scope: this
                })
            ]
        });

    },

    initInfoTextWindow: function() {
        this.infoTextPanel = new Ext.FormPanel({
            bodyStyle: {padding: "5px"},
            labelAlign: "top",
            preventBodyReset: true,
            autoScroll:false,
            html: this.about['introtext']
        });

        this.infoTextPanel.enable();


        this.infoTextWindow = new Ext.Window({
            title: this.about.title,
            closeAction: 'hide',
            items: this.infoTextPanel,
            modal: true,
            width: 500,
            height:400,
            autoScroll: true
        });
    },


    initHelpTextWindow: function() {
        this.helpTextPanel = new Ext.FormPanel({
            bodyStyle: {padding: "5px"},
            labelAlign: "top",
            preventBodyReset: true,
            autoScroll:false,
            autoHeight:true,
            autoLoad:{url:'/maphelp',scripts:true}
        });

        this.helpTextPanel.enable();

        this.helpTextWindow = new Ext.Window({
            title: this.helpLabel,
            closeAction: 'hide',
            items: this.helpTextPanel,
            modal: true,
            width: 1000,
            height:500,
            autoScroll: true
        });
    },


    initUploadPanel: function() {
        this.uploadPanel = new Ext.Panel({
            id: 'worldmap_update_panel',
            title: 'Upload Layer',
            header: false,
            autoLoad: {url: '/upload/tab', scripts: true},
            listeners:{
                activate : function(panel){
                    panel.getUpdater().refresh();
                }
            },
            renderTo: 'uploadDiv'
        });

    },

    initCreatePanel: function() {
        this.createPanel = new Ext.Panel({
            id: 'worldmap_create_panel',
            title: 'Create Layer',
            header: false,
            autoLoad: {url: '/layers/create_pg_layer/?tab=true', scripts: true},
            listeners:{
                activate : function(panel) {
                    panel.getUpdater().refresh();
                }
            },
            renderTo: 'createDiv',
            autoScroll: true
        });

    },

    initWarperPanel: function() {
        this.warperPanel = new Ext.Panel({
            id: 'worldmap_warper_panel',
            title: 'Rectify Layer',
            header: false,
            contentEl: 'warpDiv',
            autoScroll: true
        });
    },



    initTabPanel: function() {
//       var feedSourceTab = new gxp.FeedSourceDialog({
//           target: this,
//           title: "Feeds",
//           renderTo: "feedDiv"
//       });


        this.dataTabPanel = new Ext.TabPanel({

            activeTab: 0,
            region:'center',
            items: [
                {contentEl: 'searchDiv', title: 'WorldMap Data', autoScroll: true},
                this.capGrid
            ]
        });
        if (Ext.get("uploadDiv")) {
            this.dataTabPanel.add(this.uploadPanel);
            if (false && this.config["db_datastore"]) {
                this.dataTabPanel.add(this.createPanel);
            }
        }
        this.dataTabPanel.add(this.warperPanel);

    },




    /*  Set up a simplified map config with just background layers and
     the current map extent, to be used on the data search map */
    getBoundingBoxConfig: function() {
        // start with what was originally given
        var state = this.getState();
        state.tools = [];
        // update anything that can change
        var center = this.mapPanel.map.getCenter();
        Ext.apply(state.map, {
            center: [center.lon, center.lat],
            zoom: this.mapPanel.map.zoom,
            layers: []
        });

        // include all layer config (and add new sources)
        this.mapPanel.layers.each(function(record) {
            if (record.get("group") === "background") {
                var layer = record.getLayer();
                if (layer.displayInLayerSwitcher && layer.getVisibility() === true) {
                    var id = record.get("source");
                    var source = this.layerSources[id];
                    if (!source) {
                        throw new Error("Could not find source for layer '" + record.get("name") + "'");
                    }
                    // add layer
                    state.map.layers.push(source.getConfigForRecord(record));
                    if (!state.sources[id]) {
                        state.sources[id] = Ext.apply({}, source.initialConfig);
                    }
                }
            }
        }, this);

        return state;
    },

    /**
     * Method: initCapGrid
     * Constructs a window with a capabilities grid.
     */
    initCapGrid: function() {
        var geoEx = this;
        var initialSourceId, source, data = [];
        for (var id in this.layerSources) {
            source = this.layerSources[id];
            if (source instanceof gxp.plugins.GeoNodeSource && source.url.replace(this.urlPortRegEx, "$1/").indexOf(this.localGeoServerBaseUrl.replace(this.urlPortRegEx, "$1/")) === 0) {
                //do nothing
            } else {
                if (source.store) {
                    data.push([id, this.layerSources[id].title || id]);
                }
            }
        }

        if (data[0] && data[0][0])
            initialSourceId = data[0][0];


        var sources = new Ext.data.ArrayStore({
            fields: ["id", "title"],
            data: data
        });

        var expander = new GeoExplorer.CapabilitiesRowExpander({
            ows: this.localGeoServerBaseUrl + "ows"
        });


        var addLocalLayers = function() {
            if (!this.id) {
                Ext.Msg.alert("Save your Map View", "You must save this map view before uploading your data");
            }
            else
                document.location.href = "/layers/upload?map=" + this.id;
        };


        var addLayers = function() {
            var key = sourceComboBox.getValue();
            var layerStore = this.mapPanel.layers;
            var source = this.layerSources[key];
            var records = capGridPanel.getSelectionModel().getSelections();
            this.addLayerAjax(source, key, records);
        };

        var source = null;

        if (initialSourceId) {
            source = this.layerSources[initialSourceId];
            source.store.filterBy(function(r) {
                return !!source.getProjection(r);
            }, this);
        }

        var capGridPanel = new Ext.grid.GridPanel({
            store: source != null ? source.store : [],
            height:300,
            region:'center',
            autoScroll: true,
            autoExpandColumn: "title",
            plugins: [expander],
            colModel: new Ext.grid.ColumnModel([
                expander,
                {id: "title", header: "Title", dataIndex: "title", sortable: true}
            ]),
            listeners: {
                rowdblclick: addLayers,
                scope: this
            }
        });

        var sourceComboBox = new Ext.form.ComboBox({
            store: sources,
            valueField: "id",
            displayField: "title",
            triggerAction: "all",
            editable: false,
            allowBlank: false,
            forceSelection: true,
            mode: "local",
            value: initialSourceId,
            listeners: {
                select: function(combo, record, index) {
                    var source = this.layerSources[record.get("id")];
                    var store = source.store;
                    store.setDefaultSort('title', 'asc');
                    store.filterBy(function(r) {
                        return !!source.getProjection(r);
                    }, this);
                    expander.ows = store.url;
                    capGridPanel.reconfigure(store, capGridPanel.getColumnModel());
                    // TODO: remove the following when this Ext issue is addressed
                    // http://www.extjs.com/forum/showthread.php?100345-GridPanel-reconfigure-should-refocus-view-to-correct-scroller-height&p=471843
                    capGridPanel.getView().focusRow(0);
                },
                scope: this
            }
        });

        var newSourceDialog = {
            xtype: "gxp_newsourcedialog",
            header: false,
            listeners: {
                "hide": function(cmp) {
                    if (!this.outputTarget) {
                        cmp.ownerCt.hide();
                    }
                },
                "urlselected": function(newSourceDialog, url, type) {
                    newSourceDialog.setLoading();
                    var ptype;
                    switch (type) {
                        case 'TMS':
                            ptype = "gxp_tmssource";
                            break;
                        case 'REST':
                            ptype = 'gxp_arcrestsource';
                            break;
                        default:
                            ptype = 'gxp_wmscsource';
                    }
                    app.addLayerSource({
                        config: {url: url, ptype: ptype, forceLoad: true},
                        callback: function(id) {
                            // add to combo and select
                            var record = new sources.recordType({
                                id: id,
                                title: app.layerSources[id].title || "Untitled" // TODO: titles
                            });
                            sources.insert(0, [record]);
                            sourceComboBox.onSelect(record, 0);
                            newSourceDialog.hide();
                            Ext.Ajax.request({
                                url: "/services/registerbytype/",
                                method: 'POST',
                                params: {url: url, type: type},
                                failure: function(response, options) {
                                    //do nothing, silent fail
                                }
                            });
                        },
                        fallback: function(source,msg) {
                            // TODO: wire up success/failure
                            newSourceDialog.setError(
                                new Ext.Template(newSourceDialog.addLayerSourceErrorText).apply({type: type, msg: msg})
                            );
                            app.busyMask.hide();
                        },
                        scope: app
                    });
                },
                scope: app
            }
        };


        var addWmsButton = new Ext.Button({
            text: this.layerAdditionLabel,
            iconCls: 'icon-add',
            cls: 'x-btn-link-medium x-btn-text',
            handler: function() {
                new Ext.Window({
                    title: gxp.NewSourceDialog.prototype.title,
                    modal: true,
                    hideBorders: true,
                    width: 300,
                    items: newSourceDialog
                }).show();
            }
        });

        var addFeedButton = new Ext.Button({
            text: this.feedAdditionLabel,
            iconCls: 'icon-add',
            cls:  'x-btn-link-medium x-btn-text',
            handler: function() {
                this.showFeedDialog();
                this.searchWindow.hide();
                newSourceWindow.hide();

            },
            scope: this
        });

        var app = this;
        var newSourceWindow = new gxp.NewSourceWindow({
            modal: true,
            listeners: {
                "server-added": function(url, type) {
                    newSourceWindow.setLoading();
                    app.addLayerSource({
                        config: {url: url, ptype: type},
                        callback: function(id) {
                            // add to combo and select
                            var record = new sources.recordType({
                                id: id,
                                title: app.layerSources[id].title || "Untitled" // TODO: titles
                            });
                            sources.insert(0, [record]);
                            sourceComboBox.onSelect(record, 0);
                            newSourceWindow.hide();
                        },
                        failure: function() {
                            // TODO: wire up success/failure
                            newSourceWindow.setError("Error contacting server.\nPlease check the url and try again.");
                        },
                        scope: app
                    });
                }
            },
            // hack to get the busy mask so we can close it in case of a
            // communication failure
            addSource: function(url, success, failure, scope) {
                app.busyMask = scope.loadMask;
            }
        });


        var addLayerButton = new Ext.Button({
            text: "Add Layers",
            iconCls: "gxp-icon-addlayers",
            handler: addLayers,
            scope : this
        });


        var sourceAdditionLabel = { xtype: 'box', autoEl: { tag: 'span',  html: this.layerSelectionLabel }};

        var sourceForm = new Ext.Panel({
            frame:false,
            border: false,
            region: 'north',
            height:40,
            layout: new Ext.layout.HBoxLayout({
                defaultMargins: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 0
                }
            }),
            items: [sourceAdditionLabel, sourceComboBox, {xtype: 'spacer', width:20 }, addWmsButton, addFeedButton]
        });


        var addLayerForm = new Ext.Panel({
            frame:false,
            border: false,
            region: 'south',
            layout: new Ext.layout.HBoxLayout({
                defaultMargins: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 0
                }
            }),
            items: [addLayerButton]
        });

        this.capGrid = new Ext.Panel({
            autoScroll: true,
            title: 'External Data',
            header: false,
            layout: 'border',
            border: false,
            renderTo: 'externalDiv',
            padding:'2 0 0 20',
            items: [sourceForm, capGridPanel, addLayerForm],
            listeners: {
                hide: function(win) {
                    capGridPanel.getSelectionModel().clearSelections();
                }
            }
        });
    },

    /**
     * Method: showCapabilitiesGrid
     * Shows the window with a capabilities grid.
     */
    showCapabilitiesGrid: function() {
        if (!this.capGrid) {
            this.initCapGrid();
        }
        this.capGrid.show();
    },





    initSearchWindow: function() {

        var mapBounds = this.mapPanel.map.getExtent();
        var llbounds = mapBounds.transform(
            new OpenLayers.Projection(this.mapPanel.map.projection),
            new OpenLayers.Projection("EPSG:4326"));
        this.bbox = new GeoNode.BoundingBoxWidget({
            proxy: "/proxy/?url=",
            viewerConfig:this.getBoundingBoxConfig(),
            renderTo: 'refine',
            height: 275,
            isEnabled: true,
            useGxpViewer: true
        });

        this.searchTable = new GeoNode.SearchTable({
            renderTo: 'search_results',
            trackSelection: true,
            permalinkURL: '/search/api/data',
            searchURL: '/search/api/data',
            constraints: [this.bbox],
            searchParams: {'limit':10, 'bbox': llbounds.toBBOX(), 'type': 'layer'},
            searchOnLoad: false
        });

        this.searchTable.hookupSearchButtons('refine');

        var dataCart = new GeoNode.DataCart({
            store: this.searchTable.dataCart,
            renderTo: 'data_cart',
            addToMapButtonFunction: this.addWorldMapLayers,
            addToMapButtonTarget: this
        });


        if (!this.capGrid) {
            this.initCapGrid();
        }

        if (!this.uploadPanel && Ext.get("uploadDiv")) {
            this.initUploadPanel();
        }

        if (false && !this.createPanel && this.config["db_datastore"] === true) {
            this.initCreatePanel();
        }

        if (!this.warperPanel) {
            this.initWarperPanel();
        }

        if (!this.dataTabPanel) {
            this.initTabPanel();
        }


        this.searchWindow = new Ext.Window({
            id: 'ge_searchWindow',
            title: "Add Layers",
            closeAction: 'hide',
            layout: 'fit',
            width: 850,
            height:600,
            items: [this.dataTabPanel],
            modal: true,
            autoScroll: true,
            bodyStyle: 'background-color:#FFF'
        });

    },

    showFeedDialog:function (selectedOption) {
        if (!this.feedDialog) {
            this.feedDialog = new gxp.FeedSourceDialog({
                title:"Add a GeoRSS Feed",
                closeAction:"hide",
                target:this,
                listeners:{
                    "feed-added":function (ptype, config) {

                        var sourceConfig = {"config":{"ptype":ptype}};
                        if (config.url) {
                            sourceConfig.config["url"] = config.url;
                        }
                        var source = this.addLayerSource(sourceConfig);
                        config.source = source.id;
                        var feedRecord = source.createLayerRecord(config);



                        this.layerTree.addCategoryFolder({"group":feedRecord.get("group")}, true);
                        this.mapPanel.layers.add([feedRecord]);
                        var layer = feedRecord.getLayer();
                        this.layerTree.overlayRoot.findDescendant("layer", layer).select();

                    }, scope:this
                }, scope:this
            });
        }
        this.feedDialog.show();
        this.feedDialog.alignTo(document, 't-t');
        if (selectedOption) {
            this.feedDialog.sourceTypeRadioList.setValue(selectedOption);
        }
    },


    /** private: method[showInfoWindow]
     *  Shows the search window
     */
    showSearchWindow: function() {

        if (!this.searchWindow) {
            this.initSearchWindow();
        }
        this.searchWindow.show();
        this.searchWindow.alignTo(document, 'tl-tl');
        this.searchTable.doSearch();

        // Don't show the window if >70 layers on map (due to z-index issue with OpenLayers maps)
        if (this.mapPanel.layers.data.items.length > this.maxMapLayers) {
            Ext.Msg.alert(this.maxLayersTitle, this.maxLayersText.replace('%n', this.mapPanel.layers.data.items.length).replace("%max", this.maxMapLayers));
        }

    },




    /** private: method[showInfoWindow]
     *  Shows the window with intro text
     */
    showInfoWindow: function() {
        if (!this.infoTextWindow) {
            this.initInfoTextWindow();
        }
        this.infoTextWindow.show();
        this.infoTextWindow.alignTo(document, 't-t');
    },


    /** private: method[showMetadataForm]
     *  Shows the window with a metadata form
     */
    saver: function() {
        if (!this.metadataForm) {
            this.initMetadataForm();
            this.metadataForm.show();
            var metaNicEditor = new nicEditor({fullPanel : true,  maxHeight: 200, iconsPath: nicEditIconsPath}).panelInstance('intro_text_area')

        } else
            this.metadataForm.show();

        this.metadataForm.alignTo(document, 't-t');
        //Ext.getCmp('gx_saveButton').enable();
        //Ext.getCmp('gx_saveAsButton').enable();
    },

    updateURL: function() {
        /* PUT to this url to update an existing map */
        return this.rest + this.id + '/data';
    },



    addInfo : function() {
        var queryableLayers = this.mapPanel.layers.queryBy(function(x) {
            return x.get("queryable");
        });
        var geoEx = this;


        queryableLayers.each(function(x) {
            var dl = x.getLayer();
            if (dl.name != "HighlightWMS" && !dl.attributes) {
                var category = x.get("group") != "" && x.get("group") != undefined && x.get("group") ? x.get("group") : "General";
                x.set("group", category);
                this.layerTree.addCategoryFolder(category);
            }
        }, this);

    },

    getCategoryTitle: function(record){
        var subject = this.defaultTopic || "General";
        try {
            subject = record.get("category");
        } catch (ex) {
            return subject;
        }
        for (var c = 0; c < this.topicCategories.length; c++)
        {
            if (this.topicCategories[c][0] === subject) {
                return this.topicCategories[c][1];
            }
        }
        return subject;

    },

    addLayerAjax: function (dataSource, dataKey, dataRecords) {
        var geoEx = this;
        var key = dataKey;
        var records = dataRecords;
        var source = dataSource;

        var layerStore = this.mapPanel.layers;
        var isLocal = source && source.url &&
            source.url.replace(this.urlPortRegEx, "$1/").indexOf(
                this.localGeoServerBaseUrl.replace(
                    this.urlPortRegEx, "$1/")) === 0;
        for (var i = 0, ii = records.length; i < ii; ++i) {
            var thisRecord = records[i];
            if (isLocal) {
                Ext.Ajax.request({
                    url: "/maps/addgeonodelayer/",
                    method: "POST",
                    params: {layername:thisRecord.get("name")},

                    success: function(result, request) {
                        var jsonData = Ext.util.JSON.decode(result.responseText);
                        layer = jsonData.layer;
                        var local = layer.url.indexOf(
                            geoEx.localGeoServerBaseUrl.replace(
                                this.urlPortRegEx, "$1/")) === 0;
                        if (!local) {
                            //Need to create a new source
                            source = geoEx.addLayerSource({"config":layer.source_params});
                            key = source.id;
                        }

                        layer.source = key;

                        var record = source.createLayerRecord(layer);
                        record.selected = true;
                        //console.log('Created record');
                        ////console.log('GROUP:' + record.get("group"));
                        if (record) {
                            if (record.get("group") === "background") {
                                var pos = layerStore.queryBy(
                                    function(rec) {
                                        return rec.get("group") === "background"
                                    }).getCount();
                                layerStore.insert(pos, [record]);

                            } else {
                                layer.buffer = 0;
                                layer.tiled = true;
                                category = record.get("group");
                                if (!category || category == '')
                                    record.set("group", "General");

                                geoEx.layerTree.addCategoryFolder({"group":record.get("group")}, true);
                                layerStore.add([record]);


                                //geoEx.reorderNodes(record.getLayer());
                                geoEx.layerTree.overlayRoot.findDescendant("layer", record.getLayer()).select();
                            }


                        }
                    },
                    failure: function(result, request) {
                        //No permission to view
                    }

                });
            } else {
                //Not a local GeoNode layer, use source's standard method for creating the layer.
                var layer = records[i].get("name");
                var record = source.createLayerRecord({
                    name: layer,
                    source: key,
                    buffer: 0
                });
                //alert(layer + " created after FAIL");
                if (record) {
                    if (record.get("group") === "background") {
                        var pos = layerStore.queryBy(
                            function(rec) {
                                return rec.get("group") === "background"
                            }).getCount();
                        layerStore.insert(pos, [record]);
                    } else {
                        category = "General";
                        record.set("group", category);

                        geoEx.layerTree.addCategoryFolder({"group":record.get("group")}, true);
                        layerStore.add([record]);
                    }
                }
            }
            this.searchWindow.hide();


        }
    },

    /** private: method[save]
     *
     * Saves the map config and displays the URL in a window.
     */
    save: function(callback, scope) {
        var configStr = Ext.util.JSON.encode(this.getState());
        var method, url;
        if (this.id) {
            method = "PUT";
            url = "../maputils/" + this.id;
        } else {
            method = "POST";
            url = "../maputils/";
        }
        var requestConfig = {
            method: method,
            url: url,
            data: configStr
        };
        if (this.fireEvent("beforesave", requestConfig, callback) !== false) {
            OpenLayers.Request.issue(Ext.apply(requestConfig, {
                callback: function(request) {
                    this.handleSave(request);
                    if (callback) {
                        callback.call(scope || this);
                    }
                },
                scope: this
            }));
        }
    },


    /** api: method[save]
     *  :arg as: ''Boolean'' True if map should be "Saved as..."
     *
     *  Subclasses that load config asynchronously can override this to load
     *  any configuration before applyConfig is called.
     */
    saveMap: function(as) {
        var config = this.getState();

        var treeConfig = [];
        for (x = 0,max = this.layerTree.overlayRoot.childNodes.length; x < max; x++) {
            node = this.layerTree.overlayRoot.childNodes[x];
            treeConfig.push({group : node.text, expanded:  node.expanded.toString()  });
        }


        config.map.groups = treeConfig;

        if (!this.id) {
            /* create a new map */
            Ext.Ajax.request({
                url: "/maps/new/data",
                method: 'POST',
                jsonData: config,
                success: function(response, options) {
                    var config = Ext.util.JSON.decode(response.responseText);
                    var id = config.id;
                    this.fireEvent("saved", id);
                    this.metadataForm.hide();
                    Ext.Msg.wait('Saving Map', "Your new map is being saved...");

                    window.location = response.getResponseHeader("Location");
                },
                failure: function(response, options) {
                    if (response.status === 401)
                        this.showLoginWindow(options);
                    else
                        Ext.Msg.alert('Error', response.responseText);

                    Ext.getCmp('gx_saveButton').enable();
                    //Ext.getCmp('gx_saveAsButton').enable();
                },
                scope: this
            });
        }
        else {
            /* save an existing map */
            Ext.Ajax.request({
                url: "/maps/" + this.id,
                method: 'PUT',
                jsonData: config,
                success: function(response, options) {
                    /* nothing for now */
                    this.fireEvent("saved", this.id);
                    this.metadataForm.hide();
                    Ext.getCmp('gx_saveButton').enable();
                    //Ext.getCmp('gx_saveAsButton').enable();
                },
                failure: function(response, options) {
                    if (response.status === 401)
                        this.showLoginWindow(options);
                    else {
                        Ext.Msg.alert('Error', response.responseText);
                        Ext.getCmp('gx_saveButton').enable();
                        //Ext.getCmp('gx_saveAsButton').enable();
                    }
                },
                scope: this
            });
        }
    },


    addHGL: function(layerTitle, layerName) {
        Ext.Ajax.request({
            url: "/hglServiceStarter/" + layerName,
            method: 'POST',
            success: function(response, options) {
//        layerName = "sde:SDE.CAMCONTOUR";
                if (this.hglSourceKey == null)
                    this.setHGLSourceKey();
                var hglSource = this.layerSources[this.hglSourceKey];
                if (hglSource)
                {
                    var layerConfig = {
                        "title": layerTitle,
                        "name": layerName,
                        "source": this.hglSourceKey,
                        "url": hglSource.url,
                        "group": "Harvard Geospatial Library",
                        "properties": "gxp_wmslayerpanel",
                        "fixed": true,
                        "selected": false,
                        "queryable": true,
                        "disabled": false,
                        "abstract": '',
                        "styles": [],
                        "format": "image/png"
                    }



                    var record = hglSource.createLayerRecord(layerConfig);
                    this.layerTree.addCategoryFolder(record.get("group"), true);

                    this.mapPanel.layers.add([record]);
                    this.layerTree.overlayRoot.findDescendant("layer", record.getLayer()).select();
                }
            },
            failure: function(response, options) {
                Ext.Msg.alert('Restricted', "Access to this layer is restricted");
            },
            scope: this
        });
    }

});