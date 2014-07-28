/** FILE: GeoNode/GeoNode-GeoExplorer.js **/
/**
 * Copyright (c) 2009-2010 The Open Planning Project
 *
 * @requires GeoExplorer.js
 * @requires Composer.js
 */

Ext.ns("GeoNode.plugins");

/** api: constructor
 *  .. class:: Save(config)
 *
 *    Plugin for saving maps. Will provide a Save button as an action if not
 *    configured with an empty actions array.
 */
GeoNode.plugins.Save = Ext.extend(gxp.plugins.Tool, {

    // i18n
    metadataFormCancelText : "UT:Cancel",
    metadataFormSaveAsCopyText : "UT:Save as Copy",
    metadataFormSaveText : "UT:Save",
    metaDataHeader: 'UT:About this Map',
    metaDataMapAbstract: 'UT:Abstract',
    metaDataMapTitle: 'UT:Title',
    // end i18n

    /** api: ptype = gn_save */
    ptype: 'gn_save',

    /** private: method[init]
     *  :arg target: ``Object`` The object initializing this plugin.
     */
    init: function(target) {
        GeoNode.plugins.Save.superclass.init.apply(this, arguments);
        this.target.on("beforesave", function(requestConfig, callback) {
            if (this._doSave === true) {
                delete this._doSave;
                if (this.target.id) {
                    requestConfig.url = this.target.rest + this.target.id + "/data";
                } else {
                    requestConfig.url = this.target.rest + "new/data";
                }
                return true;
            } else {
                this.showMetadataForm(callback);
                return false;
            }
        }, this);
        this.target.on("beforehashchange", function(hash) {
            return false;
        });
    },

    /** api: method[addActions]
     *  :returns: ``Array`` The actions added.
     */
    addActions: function() {
        var actions = this.actions || [{
            text: 'Save',
            handler: function() {
                this.target.doAuthorized(["ROLE_ADMINISTRATOR"], function() {
                    this.target.save(this.target.showEmbedWindow);
                }, this);
            },
            scope: this
        }];
        return GeoNode.plugins.Save.superclass.addActions.apply(this, actions);
    },

    /** private: method[initMetadataForm]
     *
     * Initialize metadata entry form.
     */
    initMetadataForm: function(callback){

        var titleField = new Ext.form.TextField({
            width: '95%',
            fieldLabel: this.metaDataMapTitle,
            value: this.target.about.title,
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

        var abstractField = new Ext.form.TextArea({
            width: '95%',
            height: 50,
            fieldLabel: this.target.metaDataMapAbstract,
            value: this.target.about["abstract"]
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
                    url: "/maps/checkurl/",
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
            fieldLabel: this.target.metaDataMapUrl + "<br/><span style='font-style:italic;'>http://" + document.location.hostname + "/maps/</span>",
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
        
        var introTextField = new Ext.form.TextArea({
            width: 550,
            height: 200,
            fieldLabel: this.target.metaDataMapIntroText,
            id: "intro_text_area",
            value: this.target.about["introtext"]
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

        var saveAsButton = new Ext.Button({
            text: this.metadataFormSaveAsCopyText,
            disabled: !this.target.about.title,
            handler: function(e){
                delete this.target.id;
                
                this.target.about.title = titleField.getValue();
                this.target.about["abstract"] = abstractField.getValue();
                this.target.about["urlsuffix"] = urlField.getValue();
                this.target.about["introtext"] = nicEditors.findEditor('intro_text_area').getContent();                
                
                var treeConfig = [];
                for (x = 0,max = this.target.layerTree.overlayRoot.childNodes.length; x < max; x++) {
                    node = this.target.layerTree.overlayRoot.childNodes[x];
                    treeConfig.push({group : node.text, expanded:  node.expanded.toString()  });
                }
                this.target.map["groups"] = treeConfig;
                
                this.metadataForm.hide();
                this._doSave = true;
                this.target.save(this.metadataForm.saveCallback);
            },
            scope: this
        });
        var saveButton = new Ext.Button({
            text: this.metadataFormSaveText,
            disabled: !this.target.about.title,
            handler: function(e){
                this.target.about.title = titleField.getValue();
                this.target.about["abstract"] = abstractField.getValue();
                this.target.about["urlsuffix"] = urlField.getValue();
                this.target.about["introtext"] = nicEditors.findEditor('intro_text_area').getContent();      
                
                var treeConfig = [];
                for (x = 0,max = this.target.layerTree.overlayRoot.childNodes.length; x < max; x++) {
                    node = this.target.layerTree.overlayRoot.childNodes[x];
                    treeConfig.push({group : node.text, expanded:  node.expanded.toString()  });
                }
                this.target.map["groups"] = treeConfig;                
                
                this.metadataForm.hide();
                this._doSave = true;
                this.target.save(this.metadataForm.saveCallback);
            },
            scope: this
        });

        this.metadataForm = new Ext.Window({
            title: this.metaDataHeader,
            closeAction: 'hide',
            saveCallback: callback,
            items: metaDataPanel,
            modal: true,
            width: 600,
            autoHeight: true,
            bbar: [
                "->",
                saveAsButton,
                saveButton,
                new Ext.Button({
                    text: this.metadataFormCancelText,
                    handler: function() {
                        titleField.setValue(this.target.about.title);
                        abstractField.setValue(this.target.about["abstract"]);
                        urlField.setValue(this.about["urlsuffix"]);
                        introTextField.setValue(this.about["introtext"]);
                        this.metadataForm.hide();
                    },
                    scope: this
                })
            ]
        });
    },
    


    /** private: method[showMetadataForm]
     *  Shows the window with a metadata form
     */
    showMetadataForm: function(callback) {
        if(!this.metadataForm) {
            this.initMetadataForm(callback);
        } else {
            this.metadataForm.saveCallback = callback;
        }
        this.metadataForm.show();
        var metaNicEditor = new nicEditor({fullPanel : true,  maxHeight: 200, iconsPath: nicEditIconsPath}).panelInstance('intro_text_area')
    }

});

Ext.preg(GeoNode.plugins.Save.prototype.ptype, GeoNode.plugins.Save);

/** api: constructor
 *  .. class:: SaveHyperlink(config)
 *
 *    Plugin for showing hyperlinks for going to the list of maps as well as
 *    going to the current saved map.
 */
GeoNode.plugins.SaveHyperlink = Ext.extend(gxp.plugins.Tool, {

    /** api: ptype = gn_savehyperlink */
    ptype: 'gn_savehyperlink',

    /** private: method[init]
     *  :arg target: ``Object`` The object initializing this plugin.
     */
    init: function(target) {
        GeoNode.plugins.SaveHyperlink.superclass.init.apply(this, arguments);
        this.titleTemplate = new Ext.Template("<a class='maplist' href='" + 
            this.target.rest + "'>Maps</a> / <strong>{title}");
        this.target.on("save", function(id) {
            this.actions[0].update(this.getMapTitle());
        }, this);
    },

    /** api: method[addActions]
     *  :returns: ``Array`` The actions added.
     */
    addActions: function() {
        return GeoNode.plugins.SaveHyperlink.superclass.addActions.apply(this, [
            new Ext.Container({cls: "map-title-header", html: this.getMapTitle()})
        ]);
    },

    /** private: method[getPermalink]
     *  :return: ``String``
     *
     *  Get the permalink for the current map.
     */
    getPermalink: function() {
        permalinkTemplate = new Ext.Template("{protocol}//{host}/maps/{id}");
        return permalinkTemplate.apply({
            protocol: window.location.protocol,
            host: window.location.host,
            id: this.target.id
        });
    },

    /** private: getMapTitle
     *  :return: ``String``
     *
     *  Get the HTML to use in the map title container which is shown in the
     *  top right of the panel top toolbar.
     */
    getMapTitle: function() {
        var title;
        if (this.target.id) {
            title = '<a class="link" href="' + this.getPermalink() + '">' + this.target.about.title + '</a>';
        } else {
            title = "This map is currently unsaved";
        }
        return this.titleTemplate.apply({title: title});
    }

});

Ext.preg(GeoNode.plugins.SaveHyperlink.prototype.ptype, GeoNode.plugins.SaveHyperlink);

GeoNode.plugins.XHRTrouble = Ext.extend(gxp.plugins.Tool, {

    /** api: ptype = gn_xhrtrouble */
    ptype: 'gn_xhrtrouble',

    // i18n
    connErrorTitleText: "UT:Connection Error",
    connErrorText: "UT:The server returned an error",
    connErrorDetailsText: "UT:Details...",
    // end i18n

    /** private: method[init]
     *  :arg target: ``Object`` The object initializing this plugin.
     */
    init: function(target) {
        // global request proxy and error handling
        OpenLayers.Request.events.on({
            "failure": function(evt) {
                this.displayXHRTrouble(evt.request);
            },
            scope: this
        });
        Ext.util.Observable.observeClass(Ext.data.Connection);
        Ext.data.Connection.on({
            "requestexception": function(conn, response, options) {
                if(!options.failure) {
                    var url = options.url;
                    if (response.status === 401 && url.indexOf("http" !== 0) &&
                                            url.indexOf(this.proxy) === -1) {
                        this.authenticate(options);
                    } else if (response.status != 405 && url != "/geoserver/rest/styles") {
                        // 405 from /rest/styles is ok because we use it to
                        // test whether we're authenticated or not
                        this.displayXHRTrouble(response);
                    }
                }
            },
            scope: this
        });
        GeoNode.plugins.XHRTrouble.superclass.init.apply(this, arguments);
    },

    /** private method[displayXHRTrouble]
     *  :arg respoonse: ``Object`` The XHR response object.
     *
     *  If something goes wrong with an AJAX request, show an error dialog
     *  with a button to view the details (Django error).
     */
    displayXHRTrouble: function(response) {
        response.status && Ext.Msg.show({
            title: this.connErrorTitleText,
            msg: this.connErrorText +
                ": " + response.status + " " + response.statusText,
            icon: Ext.MessageBox.ERROR,
            buttons: {ok: this.connErrorDetailsText, cancel: true},
            fn: function(result) {
                if(result == "ok") {
                    var details = new Ext.Window({
                        title: response.status + " " + response.statusText,
                        width: 400,
                        height: 300,
                        items: {
                            xtype: "container",
                            cls: "error-details",
                            html: response.responseText
                        },
                        autoScroll: true,
                        buttons: [{
                            text: "OK",
                            handler: function() { details.close(); }
                        }]
                    });
                    details.show();
                }
            }
        });
    }

});

Ext.preg(GeoNode.plugins.XHRTrouble.prototype.ptype, GeoNode.plugins.XHRTrouble);

/** api: constructor
 *  .. class:: LayerInfo(config)
 *
 *    Plugin for navigating to the GeoNode layer info page.
 *    Will only be enabled for local layers.
 */
GeoNode.plugins.LayerInfo = Ext.extend(gxp.plugins.Tool, {

    /** api: ptype = gn_layerinfo */
    ptype: "gn_layerinfo",

    /** api: config[menuText]
     *  ``String``
     *  i18n text to use on the menu item.
     */
    menuText: "Layer Info",

    /** api: config[iconCls]
     *  ``String``
     *  iconCls to use on the menu item.
     */
    iconCls: "gxp-icon-layerproperties",

    /** api: config[linkPrefix]
     *  ``String``
     *  URL to prefix onto layer service_typename for info URL.
     */
    linkPrefix: "/layers/",

    /** api: method[addActions]
     *  :returns: ``Array`` The actions added.
     */
    addActions: function() {
        var actions = GeoNode.plugins.LayerInfo.superclass.addActions.apply(this, [{
            menuText: this.menuText,
            iconCls: this.iconCls,
            disabled: true,
            handler: function() {
                window.open(this.url);
            },
            scope: this
        }]);
        var layerInfoAction = actions[0];

        this.target.on("layerselectionchange", function(record) {
            var remote=null;
            if (record){
                if (record.get("source_params")) {
                    remote = record.get("source_params").name;
                }
                else {
                    var store = this.target.sources[record.get("source")];
                    if (store && store["name"]){
                        remote = store["name"];
                    }
                }
            }

            layerInfoAction.setDisabled(
                !record || !record.get("properties") || (!remote &&
                    record.getLayer().url.replace(
                            this.target.urlPortRegEx, "$1/").indexOf(
                            this.target.localGeoServerBaseUrl.replace(
                                this.urlPortRegEx, "$1/")) !== 0)
            );
            if (!layerInfoAction.isDisabled()) {
                var layerid = record.getLayer().params.LAYERS;
                if (record.getLayer() instanceof OpenLayers.Layer.ArcGIS93Rest) {
                    layerid = layerid.replace("show:","");
                }

                this.url = this.linkPrefix + (remote? remote + ":" : "") + layerid;
            }
        }, this);
        return actions;
    }
});

Ext.preg(GeoNode.plugins.LayerInfo.prototype.ptype, GeoNode.plugins.LayerInfo);

/** api: constructor
 *  .. class:: Composer(config)
 *   
 *    The GeoNode Composer application class.
 *    Changes compared to out-of-the-box GeoExplorer:
 *    - before saving a map, show a metadata form
 *    - add a tool that will show the map title and that will have a clickable
 *      link.
 *    - a generic XHRTrouble dialog that gives easier access to underlying
 *      Django errors.
 *    - adds catalogue search through the GeoNode search api
 *    - only enable editing if user has the right permissions
 *    - integrate with GeoNode AJAX login
 *    - publish map will show the iframe text directly, and not a wizard
 *      like interface that GeoExplorer has
 *    - when saving a map, do not set window.location.hash
 *    - use different urls for saving a new map and updating an existing map
 *      than GeoExplorer does.
 */
GeoNode.Composer = window.GeoExplorer && Ext.extend(GeoExplorer.Composer, {

    ajaxLoginUrl: null,

    /** private: method[showUrl]
     *  Do not show the url after map save.
     */
    showUrl: Ext.emptyFn,

    /** api: method[loadConfig]
     *  :arg config: ``Object`` The config object passed to the constructor.
     *
     *  Subclasses that load config asynchronously can override this to load
     *  any configuration before applyConfig is called.
     */
    loadConfig: function(config) {
        // find out what the key of the local source is
        var catalogSourceKey, key;
        for (key in config.sources) {
            var source = config.sources[key];
            if (source.ptype === "gxp_gnsource" && source.restUrl) {
                catalogSourceKey = key;
                break;
            }
        }
        for (var i=0, ii=config.tools.length; i<ii; i++) {
            if (config.tools[i].ptype === "gxp_styler") {
                config.tools[i].rasterStyling = true;
            }
            if (config.tools[i].ptype === "gxp_addlayers") {
                config.tools[i].search = true;
                config.tools[i].catalogSourceKey = catalogSourceKey;
                config.tools[i].feeds = true;
            }
            if (config.tools[i].ptype === "gxp_printpage") {
                config.tools[i].includeLegend = true;
            }
        }
        // add catalog source
        config.sources['search'] = {
            ptype: "gxp_geonodecataloguesource",
            restUrl: "/gs/rest",
            url: "/search/api"
        };
        config.tools.push({
            ptype: 'gn_xhrtrouble'
        },  {
            ptype: 'gn_save',
            actions: []
        }, {
            ptype: "gn_layerinfo",
            actionTarget: ["layers.contextMenu"]
        }, {
            ptype: "gxp_getfeedfeatureinfo"
        });
        GeoNode.Composer.superclass.loadConfig.apply(this, arguments);
        for (key in this.tools) {
            var tool = this.tools[key];
            if (tool.id === "featuremanager") {
                tool.on("layerchange", function(mgr, layer, schema) {
                    this.checkLayerPermissions(layer, 'layers');
                }, this);
                break;
            }
        }
    }

});

if (GeoNode.Composer) {
    Ext.override(GeoNode.Composer, GeoNode.ComposerMixin);
}
