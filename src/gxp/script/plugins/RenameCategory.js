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
gxp.plugins.RenameCategory = Ext.extend(gxp.plugins.Tool, {
    /** api: ptype = gxp_addcategory */
    ptype:"gxp_renamecategory",

    /** api: config[renameCategoryMenuText]
     *  ``String``
     *  Text for rename Category menu item (i18n).
     */
    renameCategoryActionText:"Rename Category",

    /** api: config[renameCategoryTip]
     *  ``String``
     *  Text for rename category action tooltip (i18n).
     */
    renameCategoryActionTipText:"Rename category",

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

        var renameNode = function (node) {
            Ext.MessageBox.prompt('Rename Category', 'New name for \"' + node.text + '\"', function (btn, text) {
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

        var actions = gxp.plugins.RenameCategory.superclass.addActions.apply(this, [
            {
                menuText:this.renameCategoryActionText,
                iconCls:"icon-layerproperties",
                disabled:false,
                folderAction: true,
                tooltip:this.renameCategoryActionTipText,
                handler:function (action) {
                    if (action.selectedNode.parentNode.isRoot) {
                        Ext.Msg.alert(this.layerContainerText, "This category cannot be renamed");
                        return false;
                    }
                    renameNode(action.selectedNode);
                },
                scope:this
            }
        ]);

        return actions[0];
    }
});

Ext.preg(gxp.plugins.RenameCategory.prototype.ptype, gxp.plugins.RenameCategory);
