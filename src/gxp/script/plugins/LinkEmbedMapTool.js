/**
 * @requires widgets/LinkEmbedMapDialog.js
 */

/** api: constructor
 *  .. class:: LinkEmbedMapDialog(config)
 *
 *    This plugin provides an interface to display
 *    LinkEmbedMapDialog widget
 */
gxp.plugins.LinkEmbedMapTool = Ext.extend(gxp.plugins.Tool, {

    /** api: ptype = gxp_linkembedmaptool */
    ptype: "gxp_linkembedmaptool",

    text: "Link to Map",

    iconCls: null,

    linkEmbedTitle: "Link to Map",

    infoActionTip: "Click to link to or embed this map",

    /** api: method[addActions]
     */
    addActions: function() {

        var tool = this;
        var actions = gxp.plugins.StreetViewTool.superclass.addActions.call(this, [
            {
                tooltip: this.infoActionTip,
                iconCls: this.iconCls,
                text: this.text,
                id: this.id,
                pressed: false,
                allowDepress: true,
                handler: this.showEmbedDialog,
                scope: this
            }
        ]);
    },

    showEmbedDialog: function() {
        var mapConfig = this.target.getState();
        var treeConfig = [];
        for (x = 0,max = this.target.layerTree.overlayRoot.childNodes.length; x < max; x++) {
            node = this.target.layerTree.overlayRoot.childNodes[x];
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
                                linkUrl: this.target.rest + (this.target.about["urlsuffix"] ? this.target.about["urlsuffix"] : this.target.id) + '/' + encodedSnapshotId,
                                linkMessage: '<span style="font-size:10pt;">Paste link in email or IM:</span>',
                                publishMessage: '<span style="font-size:10pt;">Paste HTML to embed in website:</span>',
                                url: this.target.rest + (this.target.about["urlsuffix"] ? this.target.about["urlsuffix"] : this.target.id) + '/' + encodedSnapshotId + "/embed"
                            }
                        ]
                    }).show();
                }
            },
            failure: function(response, options) {
                return false;
                Ext.Msg.alert('Error', response.responseText);
            },
            scope: this
        });
    }

});

Ext.preg(gxp.plugins.LinkEmbedMapTool.prototype.ptype, gxp.plugins.LinkEmbedMapTool);