/**
 * Copyright (c) 2008-2011 The Open Planning Project
 *
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * requires plugins/Tool.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = AddCategory
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: RemoveLayer(config)
 *
 *    Plugin for removing a selected layer from the map.
 *    TODO Make this plural - selected layers
 */
gxp.plugins.RemoveCategory = Ext.extend(gxp.plugins.Tool, {
    /** api: ptype = gxp_addcategory */
    ptype:"gxp_removecategory",

    /** api: config[removeCategoryMenuText]
     *  ``String``
     *  Text for remove Category menu item (i18n).
     */
    removeCategoryActionText:"Remove Category",

    /** api: config[removeCategoryTip]
     *  ``String``
     *  Text for remove category action tooltip (i18n).
     */
    removeCategoryActionTipText:"Remove category",

    /** api: method[addActions]
     */
    addActions:function () {

        var getRecordFromNode = function(node) {
            var record;
            if (node && node.layer) {
                var layer = node.layer;
                var store = node.layerStore;
                record = store.getAt(store.findBy(function(r) {
                    return r.getLayer() === layer;
                }));
            }
            return record;
        };


        var removeNode = function (node) {
            Ext.MessageBox.prompt('Remove Category', 'New name for \"' + node.text + '\"', function (btn, text) {
                if (btn == 'ok') {
                    this.modified |= 1;
                    var a = node;
                    node.setText(text);
                    node.attributes.group = text;
                    node.group = text;
                    node.loader.filter = function (record) {

                        return record.get("group") == text &&
                            record.getLayer().displayInLayerSwitcher == true;
                    };

                    node.eachChild(function (n) {

                        var record = getRecordFromNode(n);
                        if (record) {
                            record.set("group", text);
                        }
                    });


                    node.ownerTree.fireEvent('beforechildrenrendered', node.parentNode);
                }
            });
        };

        var actions = gxp.plugins.RemoveCategory.superclass.addActions.apply(this, [
            {
                menuText:this.removeCategoryActionText,
                iconCls: "gxp-icon-removelayers",
                disabled:false,
                folderAction: true,
                tooltip:this.removeCategoryActionTipText,
                handler: function(action) {
                    var node = action.selectedNode;
                    if (node.parentNode.isRoot) {
                        Ext.Msg.alert(this.layerContainerText, "This category cannot be removed");
                        return false;
                    }
                    if (node) {
                        while (node.childNodes.length > 0) {
                            var record = getRecordFromNode(node.childNodes[0]);
                            if (record) {
                                this.target.removeFromSelectControl(record);
                                this.target.mapPanel.layers.remove(record, true);
                            }
                        }

                        var parentNode = node.parentNode;
                        parentNode.removeChild(node, true);
                    }
                },
                scope:this
            }
        ]);

        return actions[0];
    }
});

Ext.preg(gxp.plugins.RemoveCategory.prototype.ptype, gxp.plugins.RemoveCategory);