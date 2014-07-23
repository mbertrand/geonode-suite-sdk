Ext.namespace("GeoNode"); 

GeoNode.SearchTable = Ext.extend(Ext.util.Observable, {
    selectHeaderText: 'UT: Select',
    nameHeaderText: 'UT: Name',
    titleHeaderText: 'UT: Title',
    selectText: 'UT: Select:',
    selectAllText: 'UT: All',
    selectNoneText: 'UT: None',
    previousText: 'UT: Prev',
    nextText: 'UT: Next',
    ofText: 'UT: of',
    noResultsText: 'UT: Your search did not match any items.',
    searchLabelText: 'UT: Search Data',
    searchButtonText: 'UT: Search',
    showingText: 'UT: Showing',
    loadingText: 'UT: Loading',
    permalinkText: 'UT: permalink',
    unviewableTooltip: 'UT: Unviewable Data',
    remoteTooltip: 'UT: Remote Data',

    searchOnLoad: true,
    linkableTitle: true,

    constructor: function(config) {
        this.addEvents('load'); 
        Ext.apply(this, config);
        this.initFromQuery();
        this.loadData();
    },
    
    loadData: function() {
    
        this.searchStore = new Ext.data.JsonStore({
            proxy : new Ext.data.HttpProxy({
                method: 'GET',
                url: this.searchURL
            }),
            root: 'objects',
            idProperty: 'oid',
            remoteSort: true,
            totalProperty: 'meta.total_count',
            fields: [
                {name: 'category', type: 'string'},
                {name: 'rating', type: 'float'},
                {name: 'type', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'service_typename', type: 'string'},
                {name: 'title', type: 'string'},
                {name: 'description', type: 'string'},
                {name: 'detail_url', type: 'string'},
                {name: 'oid', type: 'string'},
                {name: 'keywords'},
                {name: 'modified', type: 'date'},
                {name: 'bbox_bottom'},
                {name: 'bbox_left'},
                {name: 'bbox_top'},
                {name: 'bbox_right'},
                {name: 'owner', type: 'string'},
                {name: 'subtype', type: 'string'}
            ]
        });
        this.searchStore.on('load', function() {
            this.updateControls();
            if (this.dataCart) {
                this.dataCart.reselect();
            }
            this.fireEvent('load', this);
        }, this);
        
        this.doLayout();

        if (this.searchOnLoad)
            this.doSearch();
    },

    initFromQuery: function() {
        if (!this.searchParams) {
            this.searchParams = {};
        }
        if (!this.searchParams.offset) {
            this.searchParams.offset = 0;
        }
        if (!this.searchParams.limit) {
            this.searchParams.limit = 25;
        }
        
        if (this.constraints) {
            for (var i = 0; i < this.constraints.length; i++) {
                this.constraints[i].initFromQuery(this, this.searchParams);
            }
        }
    },
    
    doSearch: function() {
        /* updates parameters from constraints and 
           permforms a new search */
        this.searchParams.offset = 0;
        if (this.constraints) {
            for (var i = 0; i < this.constraints.length; i++) {
                this.constraints[i].applyConstraint(this.searchParams);
            }
        }
        this._search(this.searchParams);
    },
    
    
    _search: function(params) {
       /* search with given parameters */  
        this.disableControls();
        this.searchStore.load({params: params});
        this.updatePermalink(params);
    },

    loadNextBatch: function() {
        this.searchParams.offset += this.searchParams.limit;
        this._search(this.searchParams);
    },
    
    loadPrevBatch: function() {
        this.searchParams.offset -= this.searchParams.limit;
        if (this.searchParams.offset < 0) {
            this.searchParams.offset = 0;
        }
        this._search(this.searchParams);
    },

    disableControls: function() {
        this.nextButton.setDisabled(true);
        this.prevButton.setDisabled(true);
        this.pagerLabel.setText(this.loadingText);
    },

    updateControls: function() {
        var total = this.searchStore.getTotalCount();

        if (this.searchParams.offset > 0) {
            this.prevButton.setDisabled(false);
        }
        else {
            this.prevButton.setDisabled(true);
        }
        
        if (this.searchParams.offset + this.searchParams.limit < total) {
            this.nextButton.setDisabled(false);
        }
        else {
            this.nextButton.setDisabled(true);
        }
        
        var minItem = this.searchParams.offset + 1;
        var maxItem = minItem + this.searchParams.limit - 1;
        if (minItem > total) {
            minItem = total;
        }
        if (maxItem > total) {
            maxItem = total;
        }
        this.pagerLabel.setText(this.showingText + ' ' + minItem  +
                                '-' + maxItem + ' ' + this.ofText + ' ' + 
                                total);
    },

    
    updatePermalink: function() {
        if (this.permalink) {
            this.permalink.href = Ext.urlAppend(this.permalinkURL, Ext.urlEncode(this.searchParams));
        }
    },

    updateQuery: function() {
        /* called when main search query changes */ 
        this.searchParams.q = this.queryInput.getValue();
        this.doSearch();
    },
    
    hookupSearchButtons: function(el) {
        var root = Ext.get(el);
        var buttons = root.query('.search-button');
        for (var i = 0; i < buttons.length; i++) {
            var text = buttons[i].innerHTML || this.searchButtonText;
            Ext.get(buttons[i]).update('');
            var searchButton = new Ext.Button({
                text: text,
                renderTo: buttons[i]
            });
            searchButton.on('click', this.doSearch, this);
        }
    },

    doLayout: function() {
        
        var widgetHTML =
        '<div class="search-results">' +
        '<div class="search-input"></div>' +
        '<div class="search-table"></div>' +
        '<div class="search-controls"></div>' +
        '</div>';
        
        var el = Ext.get(this.renderTo);
        el.update(widgetHTML);
        var input_el = el.query('.search-input')[0];
        var table_el = el.query('.search-table')[0];
        var controls_el = el.query('.search-controls')[0];
        
        var expander = new GeoNode.SearchTableRowExpander(); 


        tableCfg = {
            store: this.searchStore, 
            plugins: [expander],
            autoExpandColumn: 'title',
            viewConfig: {
                autoFill: true,
                forceFit: true,
                emptyText: this.noResultsText
            },
            autoHeight: true,
            renderTo: table_el
        };

        var unviewableTooltip = this.unviewableTooltip;
        var remoteTooltip = this.remoteTooltip;
        
        var columns = [
            expander,
            /*
            {header: this.nameHeaderText,
             dataIndex: 'name',
             hidden: true,
             id: 'name',
             width: 35
            },*/
            {
                header: this.titleHeaderText,
                dataIndex: 'title',
                id: 'title',
                sortable: true,
                renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                    //var is_local = record.get('_local');
                    var detail = record.get('detail_url');

                    /* do not show detail link for layers without read permission */
                    /*
                    if (is_local) {
                        var permissions = record.get('_permissions');
                        if (permissions.view != true) {
                            detail = '';
                        }
                    }
                    */
                    if (detail) {
                        detail = '<a href="' + detail + '">' + value + '</a>';
                    }
                    else {
                        detail = value;
                    }
                    return detail;
                }
            }
        ];
        
        if (this.trackSelection == true) {
            sm = new Ext.grid.CheckboxSelectionModel({
                checkOnly: true,
                renderer: function(v, p, record){
                    /*
                     *  A bit of a hack. CheckboxSelectionModel's
                     *  mousedown selection behavior
                     *  is tied to rendered div's class.
                     */
                    //var permissions = record.get('_permissions');
                    //if (permissions.view != true) {
                        //return '<div>&#160;</div>'
                    //} else {
                        return '<div class="x-grid3-row-checker">&#160;</div>';
                    //}
                },
                listeners: {
                    'beforerowselect' : function(sm, rowIndex, keepExisting, record){
//                        var permissions = record.get('_permissions');
//                        if (permissions.view != true) {
//                            return false;
//                        }
                    }
                }
            });

            this.dataCart = new GeoNode.DataCartStore({selModel: sm});
            columns.push(sm);
            tableCfg.selModel = sm;
        }
        var colModel = new Ext.grid.ColumnModel({
            defaults: {sortable: false, menuDisabled: true},
            columns: columns
        });
        tableCfg.colModel = colModel;

        this.table = new Ext.grid.GridPanel(tableCfg);
        
        this.queryInput = new Ext.form.TextField({
                        fieldLabel: this.searchLabelText,
                        name: 'search',
                        allowBlank:true,
                        width: 350
                     });
        
        this.queryInput.on('specialkey', function(field, e) {
            if (e.getKey() == e.ENTER) {
                this.updateQuery();
            }
        }, this);
        var searchButton = new Ext.Button({
            text: this.searchButtonText
        });
        searchButton.on('click', this.updateQuery, this)

        var searchForm = new Ext.Panel({
             frame:false,
             border: false,
             layout: new Ext.layout.HBoxLayout({defaultMargins: {
                 top: 10,
                 bottom: 10,
                 left: 0,
                 right: 10
             }}),
             items: [this.queryInput,
                     searchButton
             ]
         });
         searchForm.render(input_el);

         this.prevButton =  new Ext.Button({text: this.previousText});
         this.prevButton.on('click', this.loadPrevBatch, this);
    
         this.nextButton =  new Ext.Button({text: this.nextText});
         this.nextButton.on('click', this.loadNextBatch, this);

         this.pagerLabel = new Ext.form.Label({text: ""});

         var controls = new Ext.Panel({
              frame:false,
              border: false,
              layout: new Ext.layout.HBoxLayout({defaultMargins: {
                  top: 10,
                  bottom: 10,
                  left: 0,
                  right: 10
              }}),
              items: [this.prevButton, this.nextButton, this.pagerLabel]
          });
          controls.render(controls_el);
          this.permalink = Ext.query('a.permalink')[0];
         
          this.disableControls();

          if (this.searchParams.q) {
              this.queryInput.setValue(this.searchParams.q);
          }
          this.updatePermalink();
}

});
