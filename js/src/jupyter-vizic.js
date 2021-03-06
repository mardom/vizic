var widgets = require('jupyter-js-widgets');
var _ = require('underscore');
var L = require('leaflet/leaflet-src');
var d3 = require("d3");
var d3SC = require('d3-scale-chromatic');
require('leaflet-draw');
require('leaflet/scripts/L.DesCRS');
require('leaflet/scripts/L.SvgTile');
require('leaflet/scripts/L.CusOverLay');
require('leaflet/scripts/L.OverLayShape');
require('leaflet/scripts/L.Control.MousePosition');
require('leaflet-fullscreen');


L.Icon.Default.imagePath = __webpack_public_path__;

function camel_case(input) {
    // Convert from foo_bar to fooBar
    return input.toLowerCase().replace(/_(.)/g, function(match, group1) {
        return group1.toUpperCase();
    });
}
var colorMaps={
    1: d3SC.interpolateSpectral,
    2: d3SC.interpolateBrBG,
    3: d3SC.interpolatePRGn,
    4: d3SC.interpolatePiYG,
    5: d3SC.interpolatePuOr,
    6: d3SC.interpolateRdBu,
    7: d3SC.interpolateRdYlBu,
    8: d3SC.interpolateRdYlGn,
    9: d3SC.interpolateBlues,
    10: d3SC.interpolateGreens,
    11: d3SC.interpolateOranges,
    12: d3SC.interpolatePurples,
    13: d3SC.interpolateReds,
    14: d3SC.interpolateBuGn,
    15: d3SC.interpolateBuPu,
    16: d3SC.interpolateGnBu,
    17: d3SC.interpolateOrRd,
    18: d3SC.interpolatePuBuGn,
    19: d3SC.interpolatePuBu,
    20: d3SC.interpolatePuRd,
    21: d3SC.interpolateRdPu,
    22: d3SC.interpolateYlGnBu,
    23: d3SC.interpolateYlGn,
    24: d3SC.interpolateYlOrBr,
    25: d3SC.interpolateYlOrRd
};

var NotebookUrlView = widgets.WidgetView.extend({

    render: function() {
        this.host = document.location.origin;
        this.base_url = document.querySelector('body').getAttribute('data-base-url');
        this.nb_url = this.host + this.base_url;
        this.el.textContent = this.nb_url;
        this.update();

    },
    update: function() {
        var that = this;
        this.model.set('nb_url', that.nb_url);
        this.touch();
    },

});

var HomeButtonView = widgets.ButtonView.extend({
    render: function() {
        HomeButtonView.__super__.render.call(this);
        this.el.className += " home-button";
    }
});

var GetDataButtonView = widgets.ButtonView.extend({
    render: function() {
        HomeButtonView.__super__.render.call(this);
        this.el.className += " getData-button";
    }
});

var SelectionButtonView = widgets.ToggleButtonView.extend({
    render: function() {
        SelectionButtonView.__super__.render.call(this);
        this.el.className += " selection-button";
    }
});

var PopupDisView = widgets.WidgetView.extend({

    render: function() {
        this.create_obj();
        this.model_events();
    },

    model_events: function() {
        var that = this;
        this.listenTo(this.model, 'change:_object_info', function() {
            that.create_obj();
        }, this);
    },
    create_obj: function() {
        var that = this;
        while (that.el.hasChildNodes()) {
            that.el.removeChild(that.el.lastChild);
        }
        var table = document.createElement('TABLE');
        var jObj = this.model.get('_object_info');
        var keys = Object.keys(jObj);
        keys.forEach(function(d) {
            var row = table.insertRow();
            row.insertCell().textContent = d;
            row.insertCell().textContent = jObj[d];
        });
        d3.select(table).style('font-size', '13px').style('border', '1px solid black').style('border-collapse', 'collapse');
        d3.select(table).selectAll('td').style('border', '1px solid black');
        d3.select(table).selectAll('tr').on('mouseover', function() {
            d3.select(this).style('background-color', '#d5d5d5');
        });
        d3.select(table).selectAll('tr').on('mouseout', function() {
            d3.select(this).style('background-color', 'white');
        });
        this.el.append(table);
    }
});


var LeafletLayerView = widgets.WidgetView.extend({

    initialize: function(parameters) {
        LeafletLayerView.__super__.initialize.apply(this, arguments);
        this.map_view = this.options.map_view;
    },

    render: function() {
        this.create_obj();
        this.leaflet_events();
        this.model_events();
    },

    leaflet_events: function() {},

    model_events: function() {},

    get_options: function() {
        var o = this.model.get('options');
        var options = {};
        var key;
        for (var i = 0; i < o.length; i++) {
            key = o[i];
            // Convert from foo_bar to fooBar that Leaflet.js uses
            options[camel_case(key)] = this.model.get(key);
        }
        return options;
    },
});

var LeafletMstLayerView = LeafletLayerView.extend({
    create_obj: function() {
        this.obj = L.overLayLines(this.model.get('mst_url'), this.get_options());
    },
    model_events: function() {
        var that = this;

        function validate(edges, max) {
            if (edges >= max) {
                return 'hidden';
            } else {
                return 'visible';
            }
        }
        this.listenTo(this.model, 'change:_cut_count', function() {
            // var visible = that.model.get('visible');
            var count = this.model.get('_cut_count');
            console.log(count);
            var max = this.model.get('max_len');
            var idx = this.model.get('line_idx');
            var json_cp = this.obj._json;

            function comp(a, b) {
                return a.line_index - b.line_index;
            }

            function key_func(d) {
                return d.line_index;
            }
            json_cp.sort(comp);
            var new_data = [];
            for (var i = 0; i < idx.length; i++) {
                new_data.push(json_cp[idx[i]]);
            }
            if (max === 0) {
                d3.select(this.obj._el).selectAll('path').attr('visibility', null);
            } else {
                var selection = d3.select(this.obj._el).selectAll('path').data(new_data, key_func);
                selection.exit().attr('visibility', 'hidden');
                selection.attr('visibility', 'visible');
            }

        }, this);
        this.listenTo(this.model, 'change:color', function() {
            var color = this.model.get('color');
            var shape = this.model.get('shape');
            d3.select(this.obj._el).selectAll(shape).attr('stroke', color);
        }, this);
    }
});

var LeafletOverlayView = LeafletLayerView.extend({
    model_events: function() {
        this.listenTo(this.model, 'change:color', function() {
            var color = this.model.get('color');
            var shape = this.model.get('shape');
            d3.select(this.obj._el).selectAll(shape).attr('stroke', color);
        }, this);
    }
});

var LeafletVoronoiLayerView = LeafletOverlayView.extend({
    create_obj: function() {
        this.obj = new Voronoi(this.model.get('voronoi_url'), this.get_options());
    },
});

var LeafletDelaunayLayerView = LeafletOverlayView.extend({
    create_obj: function() {
        this.obj = new Delaunay(this.model.get('delaunay_url'), this.get_options());
    },
});

var LeafletHealpixLayerView = LeafletOverlayView.extend({
    create_obj: function() {
        this.obj = new Healpix(this.model.get('healpix_url'), this.get_options());
    },
});

var LeafletCirclesLayerView = LeafletOverlayView.extend({
    create_obj: function() {
        this.obj = new L.overLayCircles(this.model.get('circles_url'), this.get_options());
    },
});

// RasterLayer
var LeafletRasterLayerView = LeafletLayerView.extend({});

var LeafletGridLayerView = LeafletRasterLayerView.extend({
    create_obj: function() {
        this.obj = L.svgTile(this.get_options());

    },
    model_events: function() {
        var that = this;
        function single_cTile(key, color, callback) {
            d3.select(that.obj._cTiles[key].el).selectAll('ellipse').attr('fill', color);
            callback(null);
        }

        function change_f_options(callback) {
            that.obj.options.filterObj = that.model.get('filter_obj');
            that.obj.options.filterRange = that.model.get('filter_range');
            that.obj.options.filterProperty = that.model.get('filter_property');
            callback(null);
        }
        function change_c_options(callback) {
            that.obj.options.customC = that.model.get('custom_c');
            that.obj.options.cMinMax = that.model.get('c_min_max');
            that.obj.options.cField = that.model.get('c_field');
            that.obj.options.cMap = that.model.get('c_map');
            callback(null);
        }
        this.listenTo(this.model, 'change:color', function() {
            var key;
            var q = d3.queue();
            var c = this.model.get('color');
            d3.selectAll('.leaflet-tile').selectAll('ellipse').attr('fill', c);
            this.obj.options.color = c;
            for (key in that.obj._cTiles) {
                q.defer(single_cTile, key, c);
            }
            q.awaitAll(function(error) {
                if (error) throw error;
                console.log('single color change done');
            });
        }, this);
        this.listenTo(this.model, 'change:c_map', function(){
            var custom_c = this.model.get('custom_c');
            var c_min_max = this.model.get('c_min_max');
            var c_map = this.model.get('c_map');
            var interpolate = d3.scaleSequential(colorMaps[c_map]).domain(c_min_max);
            function update_cTile(key, c_field, callback) {
                d3.select(that.obj._cTiles[key].el).selectAll('ellipse').attr('fill', function(d) {
                    return interpolate(d[c_field]);
                });
                callback(null);
            }
            var key;
            var q = d3.queue();
            if (custom_c === true) {
                var c_field = this.model.get('c_field');
                d3.selectAll('.leaflet-tile').selectAll('ellipse').attr('fill', function(d) {
                    return interpolate(d[c_field]);
                });
                q.defer(change_c_options);
                for (key in that.obj._cTiles) {
                    q.defer(update_cTile, key, c_field);
                }
                q.awaitAll(function(error) {
                    if (error) throw error;
                    console.log('update cTiles for customC');
                });
            }
        }, this);
        this.listenTo(this.model, 'change:c_min_max', function() {
            var custom_c = this.model.get('custom_c');
            var c_min_max = this.model.get('c_min_max');
            var c_map = this.model.get('c_map');
            var interpolate = d3.scaleSequential(colorMaps[c_map]).domain(c_min_max);

            function update_cTile(key, c_field, callback) {
                d3.select(that.obj._cTiles[key].el).selectAll('ellipse').attr('fill', function(d) {
                    return interpolate(d[c_field]);
                });
                callback(null);
            }
            var key;
            var q = d3.queue();
            if (custom_c === true) {
                var c_field = this.model.get('c_field');
                d3.selectAll('.leaflet-tile').selectAll('ellipse').attr('fill', function(d) {
                    return interpolate(d[c_field]);
                });
                q.defer(change_c_options);
                for (key in that.obj._cTiles) {
                    q.defer(update_cTile, key, c_field);
                }
                q.awaitAll(function(error) {
                    if (error) throw error;
                    console.log('update cTiles for customC');
                });
            } else {
                d3.selectAll('.leaflet-tile').selectAll('ellipse').attr('fill', that.model.get('color'));
                var c = this.model.get('color');
                q.defer(change_c_options);
                for (key in that.obj._cTiles) {
                    q.defer(single_cTile, key, c);
                }
                q.awaitAll(function(error) {
                    if (error) throw error;
                    console.log('back to single color');
                });
                that.obj.options.color = c;
            }
        }, this);
        this.listenTo(this.model, 'change:filter_range', function() {
            var that = this;
            var key;
            var range = this.model.get('filter_range');
            var q = d3.queue();

            function show_all(key, callback) {
                d3.select(that.obj._cTiles[key].el).selectAll('ellipse').style('visibility', 'visible');
                callback(null);
            }

            function validate(value) {
                if (value >= range[0] && value < range[1]) {
                    return 'visible';
                } else {
                    return 'hidden';
                }
            }

            function show_hide(key, callback) {
                d3.select(that.obj._cTiles[key].el).selectAll('ellipse').style('visibility', function(d) {
                    return validate(d[property]);
                });
                callback(null);
            }
            if (this.model.get('filter_obj')) {
                var property = this.model.get('filter_property');
                d3.selectAll('.leaflet-tile').selectAll('ellipse').style('visibility', function(d) {
                    return validate(d[property]);
                });
                q.defer(change_f_options);
                for (key in that.obj._cTiles) {
                    q.defer(show_hide, key);
                }
                q.awaitAll(function(error) {
                    if (error) {
                        return error;
                    }
                    // console.log('done hiding');
                });
            } else {
                d3.selectAll('.leaflet-tile').selectAll('ellipse').style('visibility', 'visible');
                q.defer(change_f_options);
                for (key in that.obj._cTiles) {
                    q.defer(show_all, key);
                }
                q.awaitAll(function(error) {
                    if (error) {
                        return error;
                    }
                    // console.log('done showing');
                });
            }
        }, this);

    },
    leaflet_events: function() {
        var that = this;
        this.obj.on('load', function() {
            d3.select(that.obj._level.el).selectAll('ellipse').on('click', function(d) {
                that.send({
                    'event': 'popup: click',
                    'RA': d.RA,
                    'DEC': d.DEC
                });
            });
        });
    }
});

var LeafletTileLayerView = LeafletRasterLayerView.extend({

    create_obj: function() {
        this.obj = L.tileLayer(
            this.model.get('url'),
            this.get_options()
        );
    },
});

var LeafletImageOverlayView = LeafletRasterLayerView.extend({

    create_obj: function() {
        this.obj = L.imageOverlay(
            this.model.get('url'),
            this.model.get('bounds'),
            this.get_options()
        );
    },
});


// UILayer
var LeafletUILayerView = LeafletLayerView.extend({});


var LeafletMarkerView = LeafletUILayerView.extend({

    create_obj: function() {
        this.obj = L.marker(
            this.model.get('location'),
            this.get_options()
        );
    },

    model_events: function() {
        LeafletMarkerView.__super__.model_events.apply(this, arguments);
        this.listenTo(this.model, 'change:location', function() {
            this.obj.setLatLng(this.model.get('location'));
        }, this);
        this.listenTo(this.model, 'change:z_index_offset', function() {
            this.obj.setZIndexOffset(this.model.get('z_index_offset'));
        }, this);
        this.listenTo(this.model, 'change:opacity', function() {
            this.obj.setOpacity(this.model.get('opacity'));
        }, this);
    },
});


var LeafletPopupView = LeafletUILayerView.extend({});

// VectorLayer
var LeafletVectorLayerView = LeafletLayerView.extend({});


var LeafletPathView = LeafletVectorLayerView.extend({

    model_events: function() {
        LeafletPathView.__super__.model_events.apply(this, arguments);
        var key;
        var o = this.model.get('options');
        for (var i = 0; i < o.length; i++) {
            key = o[i];
            this.listenTo(this.model, 'change:' + key, function() {
                this.obj.setStyle(this.get_options());
            }, this);
        }
    },

});


var LeafletPolylineView = LeafletPathView.extend({
    create_obj: function() {
        this.obj = L.polyline(
            this.model.get('locations'),
            this.get_options()
        );
    },
});


var LeafletPolygonView = LeafletPolylineView.extend({
    create_obj: function() {
        this.obj = L.polygon(
            this.model.get('locations'),
            this.get_options()
        );
    },
});


var LeafletRectangleView = LeafletPolygonView.extend({
    create_obj: function() {
        this.obj = L.rectangle(
            this.model.get('bounds'),
            this.get_options()
        );
    },
});


var LeafletCircleView = LeafletPathView.extend({
    create_obj: function() {
        this.obj = L.circle(
            this.model.get('location'), this.model.get('radius'),
            this.get_options()
        );
    },
});


var LeafletCircleMarkerView = LeafletCircleView.extend({
    create_obj: function() {
        this.obj = L.circleMarker(
            this.model.get('location'), this.model.get('radius'),
            this.get_options()
        );
    },
});


var LeafletLayerGroupView = LeafletLayerView.extend({
    create_obj: function() {
        this.obj = L.layerGroup();
    },
});


var LeafletFeatureGroupView = LeafletLayerGroupView.extend({
    create_obj: function() {
        this.obj = L.featureGroup();
    },
});


var LeafletMultiPolylineView = LeafletFeatureGroupView.extend({});


var LeafletGeoJSONView = LeafletFeatureGroupView.extend({
    create_obj: function() {
        var that = this;
        var style = this.model.get('style');
        if (_.isEmpty(style)) {
            style = function(feature) {
                return feature.properties.style;
            };
        }
        this.obj = L.geoJson(this.model.get('data'), {
            style: style,
            onEachFeature: function(feature, layer) {
                var mouseevent = function(e) {
                    if (e.type == 'mouseover') {
                        layer.setStyle(that.model.get('hover_style'));
                        layer.once('mouseout', function() {
                            that.obj.resetStyle(layer);
                        });
                    }
                    that.send({
                        event: e.type,
                        properties: feature.properties,
                        id: feature.id
                    });
                };
                layer.on({
                    mouseover: mouseevent,
                    click: mouseevent
                });
            }
        });
    },
});


var LeafletMultiPolygonView = LeafletFeatureGroupView.extend({
    create_obj: function() {
        this.obj = L.multiPolygon(
            this.model.get('locations'),
            this.get_options()
        );
    },
});


var LeafletControlView = widgets.WidgetView.extend({
    initialize: function(parameters) {
        LeafletControlView.__super__.initialize.apply(this, arguments);
        this.map_view = this.options.map_view;
    },
});


var LeafletDrawControlView = LeafletControlView.extend({
    initialize: function(parameters) {
        LeafletDrawControlView.__super__.initialize.apply(this, arguments);
        this.map_view = this.options.map_view;
    },

    render: function() {
        var that = this;
        return this.create_child_view(this.model.get('layer'), {
            map_view: this.map_view
        }).then(function(layer_view) {
            that.map_view.obj.addLayer(layer_view.obj);
            // TODO: create_obj refers to the layer view instead of the layer
            // view promise. We should fix that.
            that.layer_view = layer_view;
            that.create_obj();
            return that;
        });
    },

    create_obj: function() {
        var that = this;
        var polyline = this.model.get('polyline');
        if (_.isEmpty(polyline)) {
            polyline = false;
        }
        var polygon = this.model.get('polygon');
        if (_.isEmpty(polygon)) {
            polygon = false;
        }
        var circle = this.model.get('circle');
        if (_.isEmpty(circle)) {
            circle = false;
        }
        var rectangle = this.model.get('rectangle');
        if (_.isEmpty(rectangle)) {
            rectangle = false;
        }
        var marker = this.model.get('marker');
        if (_.isEmpty(marker)) {
            marker = false;
        }
        var edit = this.model.get('edit');
        var remove = this.model.get('remove');
        this.obj = new L.Control.Draw({
            edit: {
                featureGroup: this.layer_view.obj,
                edit: edit,
                remove: remove
            },
            draw: {
                polyline: polyline,
                polygon: polygon,
                circle: circle,
                rectangle: rectangle,
                marker: marker
            }
        });
        this.map_view.obj.on('draw:created', function(e) {
            var type = e.layerType;
            var layer = e.layer;
            var geo_json = layer.toGeoJSON();
            geo_json.properties.style = layer.options;
            that.send({
                'event': 'draw:created',
                'geo_json': geo_json
            });
            that.layer_view.obj.addLayer(layer);
        });
        this.map_view.obj.on('draw:edited', function(e) {
            var layers = e.layers;
            layers.eachLayer(function(layer) {
                var geo_json = layer.toGeoJSON();
                geo_json.properties.style = layer.options;
                that.send({
                    'event': 'draw:edited',
                    'geo_json': geo_json
                });
            });
        });
        this.map_view.obj.on('draw:deleted', function(e) {
            var layers = e.layers;
            layers.eachLayer(function(layer) {
                var geo_json = layer.toGeoJSON();
                geo_json.properties.style = layer.options;
                that.send({
                    'event': 'draw:deleted',
                    'geo_json': geo_json
                });
            });
        });
    },

});


var LeafletMapView = widgets.DOMWidgetView.extend({
    initialize: function(options) {
        LeafletMapView.__super__.initialize.apply(this, arguments);
    },

    remove_layer_view: function(child_view) {
        this.obj.removeLayer(child_view.obj);
        child_view.remove();
    },

    add_layer_model: function(child_model) {
        var that = this;
        return this.create_child_view(child_model, {
            map_view: this
        }).then(function(child_view) {
            that.obj.addLayer(child_view.obj);
            return child_view;
        });
    },

    remove_control_view: function(child_view) {
        this.obj.removeControl(child_view.obj);
        child_view.remove();
    },

    add_control_model: function(child_model) {
        var that = this;
        return this.create_child_view(child_model, {
            map_view: this
        }).then(function(child_view) {
            that.obj.addControl(child_view.obj);
            return child_view;
        });
    },

    render: function() {
        this.el.style['width'] = this.model.get('width');
        this.el.style['height'] = this.model.get('height');
        this.layer_views = new widgets.ViewList(this.add_layer_model, this.remove_layer_view, this);
        this.control_views = new widgets.ViewList(this.add_control_model, this.remove_control_view, this);
        this.displayed.then(_.bind(this.render_leaflet, this));
    },

    render_leaflet: function() {
        this.create_obj();
        this.layer_views.update(this.model.get('layers'));
        this.control_views.update(this.model.get('controls'));
        this.leaflet_events();
        this.model_events();
        this.update_bounds();
        // TODO: hack to get all the tiles to show.
        var that = this;

        this.update_crs();
        // window.setTimeout(function () {
        //     // that.update_crs();
        //     that.obj.invalidateSize();
        //     // that.update_crs();
        // }, 1000);
        return that;
    },

    create_obj: function() {
        this.obj = L.map(this.el, this.get_options());
    },

    get_options: function() {
        var o = this.model.get('options');
        var options = {};
        var key;
        for (var i = 0; i < o.length; i++) {
            key = o[i];
            // Convert from foo_bar to fooBar that Leaflet.js uses
            options[camel_case(key)] = this.model.get(key);
        }
        options.crs = L.extend({}, L.CRS.RADEC);
        return options;
    },

    leaflet_events: function() {
        var that = this;
        this.obj.on('moveend', function(e) {
            var c = e.target.getCenter();
            that.model.set('center', [c.lat, c.lng]);
            that.touch();
            that.update_bounds();
        });
        this.obj.on('zoomend', function(e) {
            var z = e.target.getZoom();
            that.model.set('zoom', z);
            that.touch();
            that.update_bounds();
        });
        this.obj.on('fullscreenchange', function(e) {
            if (!that.obj.isFullscreen()) {
                that.obj.invalidateSize();
            }
            // if (document.webkitIsFullScreen) {
            //     window.setTimeout(function(){
            //         that.obj.invalidateSize();
            //     }, 150);
            // }
        });
    },

    update_bounds: function() {
        var that = this;
        var b = this.obj.getBounds();
        this.model.set('_north', b.getNorth());
        this.model.set('_south', b.getSouth());
        this.model.set('_east', b.getEast());
        this.model.set('_west', b.getWest());
        this.touch();
    },

    model_events: function() {
        var that = this;
        this.listenTo(this.model, 'msg:custom', this.handle_msg, this);
        this.listenTo(this.model, 'change:layers', function() {
            this.layer_views.update(this.model.get('layers'));
        }, this);
        this.listenTo(this.model, 'change:controls', function() {
            this.control_views.update(this.model.get('controls'));
        }, this);
        this.listenTo(this.model, 'change:zoom', function() {
            this.obj.setZoom(this.model.get('zoom'));
            this.update_bounds();
        }, this);
        this.listenTo(this.model, 'change:center', function() {
            this.obj.panTo(this.model.get('center'));
            this.update_bounds();
        }, this);
        this.listenTo(this.model, 'change:pan_loc', function() {
            var loc = this.model.get('pan_loc');
            if (loc.length !== 0) {
                console.log(loc.length);
                this.obj.setView([loc[0], loc[1]], loc[2]);
                this.update_bounds();
            }
        }, this);
        this.listenTo(this.model, 'change:_des_crs', function() {
            _.bind(this.update_crs(), this);
            this.update_bounds();
        }, this);
        this.listenTo(this.model, 'change:selection', function() {
            var selection = this.model.get('selection');
            if (selection) {
                this.selection_enable();
            } else {
                this.selection_disable();
            }
        }, this);
    },

    selection_enable: function() {
        var that = this;
        this.obj.dragging.disable();
        this.obj.scrollWheelZoom.disable();
        this.obj.on('mousedown', L.DomEvent.stop)
            .on('click', L.DomEvent.stopPropagation)
            .on('mousedown', this._onMousedown, this);
    },

    selection_disable: function() {
        if (this._shape) {
            this._shape.remove();
            delete this._shape;
        }
        this.obj.off('mousedown', L.DomEvent.stop)
            .off('click')
            .off('mousedown', this._onMousedown, this)
            .off('mousemove', this._onMousemove, this)
            .off('mouseup', this._onMouseUp, this);
        this.obj.dragging.enable();
        this.obj.scrollWheelZoom.enable();
        this.model.set('s_bounds', []);
        this.touch();
    },

    _onMousedown: function(e) {
        this._selection_param.isDown = true;
        this._selection_param.startLatlng = e.latlng;
        this.obj.on('mousemove', this._onMousemove, this);
        L.DomEvent
            .on(document, 'mouseup', this._onMouseUp, this)
            .preventDefault(e.originalEvent);
    },

    _onMousemove: function(e) {
        var new_latlng = e.latlng;
        this._selection_param.lastLatlng = new_latlng;
        if (this._selection_param.isDown) {
            this._drawRect(new_latlng);
        }
        this._selection_param.isDrawing = true;
    },

    _onMouseUp: function(e) {
        this.obj.off('mousemove', this._onMousemove, this);
        this._selection_param.isDrawing = false;
        var rectSelection = this._selection_param;
        if (this._shape) {
            var bounds = this._shape._bounds;
            var s_bounds = [bounds.getWest(), bounds.getEast(), bounds.getSouth(), bounds.getNorth()];
            this.model.set('s_bounds', s_bounds);
            this.touch();
        }
    },

    _drawRect: function(latlng) {
        var startPoint = this._selection_param.startLatlng;
        if (!this._shape) {
            this._shape = new L.Rectangle(new L.LatLngBounds(startPoint, latlng), this.rectOptions);
            this.obj.addLayer(this._shape);
        } else {
            this._shape.setBounds(new L.LatLngBounds(startPoint, latlng));
        }

    },
    update_crs: function() {
        var that = this;
        that.obj.options.crs.adjust = that.model.get('_des_crs');
        // // Force the new crs options to be propagated to the end
        that.obj._pixelOrigin = that.obj._getNewPixelOrigin(that.model.get('center'), that.model.get('zoom'));
    },

    handle_msg: function(content) {
        switch (content.method) {
            case 'foo':
                break;
        }
    },

    _selection_param: {
        isDown: false,
        isDrawing: false,
        startLatlng: undefined,
        lastLatlng: undefined
    },
    rectOptions: {
        stroke: true,
        color: '#f06eaa',
        weight: 2,
        opacity: 0.5,
        fill: true,
        fillColor: null, //same as color by default
        fillOpacity: 0.2,
        clickable: false
    },
});

var def_loc = [0.0, 0.0];

var LeafletLayerModel = widgets.WidgetModel.extend({
    defaults: _.extend({}, widgets.WidgetModel.prototype.defaults, {
        _view_name: 'LeafletLayerView',
        _model_name: 'LeafletLayerModel',
        _view_module: 'jupyter-vizic',
        _model_module: 'jupyter-vizic',
        // bottom : false,
        options: []
    }),


});


var LeafletUILayerModel = LeafletLayerModel.extend({
    defaults: _.extend({}, LeafletLayerModel.prototype.defaults, {
        _view_name: 'LeafletUILayerView',
        _model_name: 'LeafletUILayerModel'
    })
});


var LeafletMarkerModel = LeafletUILayerModel.extend({
    defaults: _.extend({}, LeafletUILayerModel.prototype.defaults, {
        _view_name: 'LeafletMarkerView',
        _model_name: 'LeafletMarkerModel',
        location: def_loc,
        z_index_offset: 0,
        opacity: 1.0,
        clickable: true,
        draggable: false,
        keyboard: true,
        title: '',
        alt: '',
        rise_on_hover: false,
        rise_offset: 250
    })
});


var LeafletPopupModel = LeafletUILayerModel.extend({
    defaults: _.extend({}, LeafletUILayerModel.prototype.defaults, {
        _view_name: 'LeafletPopupView',
        _model_name: 'LeafletPopupModel'
    })
});


var LeafletRasterLayerModel = LeafletLayerModel.extend({
    defaults: _.extend({}, LeafletLayerModel.prototype.defaults, {
        _view_name: 'LeafletRasterLayerView',
        _model_name: 'LeafletRasterLayerModel'
    })
});


var LeafletTileLayerModel = LeafletRasterLayerModel.extend({
    defaults: _.extend({}, LeafletRasterLayerModel.prototype.defaults, {
        _view_name: 'LeafletTileLayerView',
        _model_name: 'LeafletTileLayerModel',

        // bottom : true,
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        min_zoom: 0,
        max_zoom: 18,
        tile_size: 256,
        attribution: 'Map data (c) <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        opacity: 1.0,
        detect_retina: false
    })
});

var LeafletGridLayerModel = LeafletRasterLayerModel.extend({
    defaults: _.extend({}, LeafletRasterLayerModel.prototype.defaults, {
        _view_name: 'LeafletGridLayerView',
        _model_name: 'LeafletGridLayerModel',

        _des_crs: [],
        bottom: false,
        min_zoom: 0,
        max_zoom: 8,
        collection: '',
        x_range: 1.0,
        y_range: 1.0,
        center: [],
        color: 'red',
        c_min_max: [],
        custom_c: false,
        c_field: '',
        c_map: 1,
        filter_obj: false,
        filter_range: [],
        filter_property: '',
        // tile_size : 256,
        // opacity : 1.0,
        detect_retina: false,
        radius: false,
        point: false,
        scale_r: 1,

    }),
    initialize(attributes, options) {
        widgets.WidgetModel.prototype.initialize(this, attributes, options);
        // console.log(this.attributes);
    }

});

var LeafletMstLayerModel = LeafletLayerModel.extend({
    defaults: _.extend({}, LeafletLayerModel.prototype.defaults, {
        _view_name: 'LeafletMstLayerView',
        _model_name: 'LeafletMstLayerModel',

        mst_url: '',
        visible: false,
        max_len: 0.0,
        svg_zoom: 5,
        color: '#0459e2',
        shape: 'path',
        __cut_count: 0
    })
});

var LeafletVoronoiLayerModel = LeafletLayerModel.extend({
    defaults: _.extend({}, LeafletLayerModel.prototype.defaults, {
        _view_name: 'LeafletVoronoiLayerView',
        _model_name: 'LeafletVoronoiLayerModel',

        voronoi_url: '',
        visible: false,
        svg_zoom: 5,
        color: '#88b21c',
        shape: 'path'
    })
});

var LeafletDelaunayLayerModel = LeafletLayerModel.extend({
    defaults: _.extend({}, LeafletLayerModel.prototype.defaults, {
        _view_name: 'LeafletDelaunayLayerView',
        _model_name: 'LeafletDelaunayLayerModel',

        delaunay_url: '',
        visible: false,
        svg_zoom: 5,
        color: 'blue',
        shape: 'path'
    })
});

var LeafletHealpixLayerModel = LeafletLayerModel.extend({
    defaults: _.extend({}, LeafletLayerModel.prototype.defaults, {
        _view_name: 'LeafletHealpixLayerView',
        _model_name: 'LeafletHealpixLayerModel',

        healpix_url: '',
        visible: false,
        svg_zoom: 5,
        color: 'white',
        shape: 'path'
    })
});

var LeafletCirclesLayerModel = LeafletLayerModel.extend({
    defaults: _.extend({}, LeafletLayerModel.prototype.defaults, {
        _view_name: 'LeafletCirclesLayerView',
        _model_name: 'LeafletCirclesLayerModel',

        circles_url: '',
        visible: false,
        svg_zoom: 5,
        color: 'purple',
        radius: 50,
        shape: 'circle'
    })
});

var LeafletImageOverlayModel = LeafletRasterLayerModel.extend({
    defaults: _.extend({}, LeafletRasterLayerModel.prototype.defaults, {
        _view_name: 'LeafletImageOverlayView',
        _model_name: 'LeafletImageOverlayModel',

        url: '',
        bounds: [def_loc, def_loc],
        opacity: 1.0,
        attribution: ''
    })
});


var LeafletVectorLayerModel = LeafletLayerModel.extend({
    defaults: _.extend({}, LeafletLayerModel.prototype.defaults, {
        _view_name: 'LeafletVectorLayerView',
        _model_name: 'LeafletVectorLayerModel'
    })
});


var LeafletPathModel = LeafletVectorLayerModel.extend({
    defaults: _.extend({}, LeafletVectorLayerModel.prototype.defaults, {
        _view_name: 'LeafletPathView',
        _model_name: 'LeafletPathModel',

        stroke: true,
        color: '#0033FF',
        weight: 5,
        opacity: 0.5,
        fill: true,
        fill_color: '#0033FF',
        fill_opacity: 0.2,
        dash_array: '',
        line_cap: '',
        line_join: '',
        clickable: true,
        pointer_events: '',
        class_name: ''
    })
});


var LeafletPolylineModel = LeafletPathModel.extend({
    defaults: _.extend({}, LeafletPathModel.prototype.defaults, {
        _view_name: 'LeafletPolylineView',
        _model_name: 'LeafletPolylineModel',

        locations: [],
        smooth_factor: 1.0,
        no_clip: false
    })
});


var LeafletPolygonModel = LeafletPolylineModel.extend({
    defaults: _.extend({}, LeafletPolylineModel.prototype.defaults, {
        _view_name: 'LeafletPolygonView',
        _model_name: 'LeafletPolygonModel'
    })
});


var LeafletRectangleModel = LeafletPolygonModel.extend({
    defaults: _.extend({}, LeafletPolygonModel.prototype.defaults, {
        _view_name: 'LeafletRectangleView',
        _model_name: 'LeafletRectangleModel',
        bounds: []
    })
});


var LeafletCircleModel = LeafletPathModel.extend({
    defaults: _.extend({}, LeafletPathModel.prototype.defaults, {
        _view_name: 'LeafletCircleView',
        _model_name: 'LeafletCircleModel',
        location: def_loc,
        radius: 10000
    })
});


var LeafletCircleMarkerModel = LeafletCircleModel.extend({
    defaults: _.extend({}, LeafletCircleModel.prototype.defaults, {
        _view_name: 'LeafletCircleMarkerView',
        _model_name: 'LeafletCircleMarkerModel',
        radius: 10
    })
});


var LeafletLayerGroupModel = LeafletLayerModel.extend({
    defaults: _.extend({}, LeafletLayerModel.prototype.defaults, {
        _view_name: 'LeafletLayerGroupView',
        _model_name: 'LeafletLayerGroupModel',
        layers: []
    })
}, {
    serializers: _.extend({
        layers: {
            deserialize: widgets.unpack_models
        }
    }, widgets.DOMWidgetModel.serializers)
});


var LeafletFeatureGroupModel = LeafletLayerModel.extend({
    defaults: _.extend({}, LeafletLayerModel.prototype.defaults, {
        _view_name: 'LeafletFeatureGroupView',
        _model_name: 'LeafletFeatureGroupModel'
    })
});


var LeafletGeoJSONModel = LeafletFeatureGroupModel.extend({
    defaults: _.extend({}, LeafletFeatureGroupModel.prototype.defaults, {
        _view_name: 'LeafletGeoJSONView',
        _model_name: 'LeafletGeoJSONModel',
        data: {},
        style: {},
        hover_style: {},
    })
});


var LeafletMultiPolylineModel = LeafletFeatureGroupModel.extend({
    defaults: _.extend({}, LeafletFeatureGroupModel.prototype.defaults, {
        _view_name: 'LeafletMultiPolylineView',
        _model_name: 'LeafletMultiPolylineModel'
    })
});


var LeafletMultiPolygonModel = LeafletFeatureGroupModel.extend({
    defaults: _.extend({}, LeafletFeatureGroupModel.prototype.defaults, {
        _view_name: 'LeafletMultiPolygonView',
        _model_name: 'LeafletMultiPolygonModel',
        locations: []
    })
});


var LeafletControlModel = widgets.WidgetModel.extend({
    defaults: _.extend({}, widgets.WidgetModel.prototype.defaults, {
        _view_name: 'LeafletControlView',
        _model_name: 'LeafletControlModel',
        _view_module: 'jupyter-vizic',
        _model_module: 'jupyter-vizic',
        options: []
    })
});


var LeafletDrawControlModel = LeafletControlModel.extend({
    defaults: _.extend({}, LeafletControlModel.prototype.defaults, {
        _view_name: 'LeafletDrawControlView',
        _model_name: 'LeafletDrawControlModel',

        layer: undefined,
        polyline: {
            shapeOptions: {}
        },
        polygon: {
            shapeOptions: {}
        },
        circle: {},
        rectangle: {},
        marker: {},
        edit: true,
        remove: true
    })
}, {
    serializers: _.extend({
        layer: {
            deserialize: widgets.unpack_models
        }
    }, LeafletControlModel.serializers)
});


var LeafletMapModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend({}, widgets.DOMWidgetModel.prototype.defaults, {
        _view_name: "LeafletMapView",
        _model_name: "LeafletMapModel",
        _model_module: "jupyter-vizic",
        _view_module: "jupyter-vizic",

        center: def_loc,
        width: "512px",
        height: "512px",
        // grid_added = false,
        zoom: 1,
        max_zoom: 12,
        min_zoom: 0,
        // max_bounds: [[-90, 0], [90, 360]],

        dragging: true,
        touch_zoom: true,
        scroll_wheel_zoom: true,
        wheel_debounce_time: 60,
        wheel_px_per_zoom_level: 60,
        double_click_zoom: true,
        box_zoom: true,
        tap: true,
        tap_tolerance: 15,
        world_copy_jump: false,
        close_popup_on_click: true,
        bounce_at_zoom_limits: true,
        keyboard: true,
        keyboardPanDelta: 80,
        inertia: true,
        inertia_deceleration: 3000,
        inertia_max_speed: 1500,
        zoom_control: true,
        attribution_control: true,
        // fade_animation : bool(?),
        // zoom_animation : bool(?),
        zoom_animation_threshold: 4,
        // marker_zoom_animation : bool(?),
        position_control: true,
        fullscreen_control: true,
        _south: def_loc[0],
        _north: def_loc[0],
        _east: def_loc[1],
        _west: def_loc[1],
        options: [],
        layers: [],
        controls: [],
        _des_crs: [],
        _pan_loc: [],
        selection: false,
        s_bounds: [],
    })
}, {
    serializers: _.extend({
        layers: {
            deserialize: widgets.unpack_models
        },
        controls: {
            deserialize: widgets.unpack_models
        }
    }, widgets.DOMWidgetModel.serializers)
});

module.exports = {
    // views
    LeafletLayerView: LeafletLayerView,
    LeafletUILayerView: LeafletUILayerView,
    LeafletMarkerView: LeafletMarkerView,
    LeafletPopupView: LeafletPopupView,
    LeafletRasterLayerView: LeafletRasterLayerView,
    LeafletGridLayerView: LeafletGridLayerView,
    LeafletTileLayerView: LeafletTileLayerView,
    LeafletImageOverlayView: LeafletImageOverlayView,
    LeafletVectorLayerView: LeafletVectorLayerView,
    LeafletPathView: LeafletPathView,
    LeafletPolylineView: LeafletPolylineView,
    LeafletPolygonView: LeafletPolygonView,
    LeafletRectangleView: LeafletRectangleView,
    LeafletCircleView: LeafletCircleView,
    LeafletCircleMarkerView: LeafletCircleMarkerView,
    LeafletLayerGroupView: LeafletLayerGroupView,
    LeafletFeatureGroupView: LeafletFeatureGroupView,
    LeafletMultiPolylineView: LeafletMultiPolylineView,
    LeafletGeoJSONView: LeafletGeoJSONView,
    LeafletMultiPolygonView: LeafletMultiPolygonView,
    LeafletControlView: LeafletControlView,
    LeafletDrawControlView: LeafletDrawControlView,
    LeafletMapView: LeafletMapView,
    NotebookUrlView: NotebookUrlView,
    PopupDisView: PopupDisView,
    HomeButtonView: HomeButtonView,
    SelectionButtonView: SelectionButtonView,
    GetDataButtonView: GetDataButtonView,
    LeafletMstLayerView: LeafletMstLayerView,
    LeafletVoronoiLayerView: LeafletVoronoiLayerView,
    LeafletDelaunayLayerView: LeafletDelaunayLayerView,
    LeafletHealpixLayerView: LeafletHealpixLayerView,
    LeafletCirclesLayerView: LeafletCirclesLayerView,
    // models
    LeafletCirclesLayerModel: LeafletCirclesLayerModel,
    LeafletHealpixLayerModel: LeafletHealpixLayerModel,
    LeafletDelaunayLayerModel: LeafletDelaunayLayerModel,
    LeafletMstLayerModel: LeafletMstLayerModel,
    LeafletVoronoiLayerModel: LeafletVoronoiLayerModel,
    LeafletLayerModel: LeafletLayerModel,
    LeafletUILayerModel: LeafletUILayerModel,
    LeafletGridLayerModel: LeafletGridLayerModel,
    LeafletMarkerModel: LeafletMarkerModel,
    LeafletPopupModel: LeafletPopupModel,
    LeafletRasterLayerModel: LeafletRasterLayerModel,
    LeafletTileLayerModel: LeafletTileLayerModel,
    LeafletImageOverlayModel: LeafletImageOverlayModel,
    LeafletVectorLayerModel: LeafletVectorLayerModel,
    LeafletPathModel: LeafletPathModel,
    LeafletPolylineModel: LeafletPolylineModel,
    LeafletPolygonModel: LeafletPolygonModel,
    LeafletRectangleModel: LeafletRectangleModel,
    LeafletCircleModel: LeafletCircleModel,
    LeafletCircleMarkerModel: LeafletCircleMarkerModel,
    LeafletLayerGroupModel: LeafletLayerGroupModel,
    LeafletFeatureGroupModel: LeafletFeatureGroupModel,
    LeafletGeoJSONModel: LeafletGeoJSONModel,
    LeafletMultiPolylineModel: LeafletMultiPolylineModel,
    LeafletMultiPolygonModel: LeafletMultiPolygonModel,
    LeafletControlModel: LeafletControlModel,
    LeafletDrawControlModel: LeafletDrawControlModel,
    LeafletMapModel: LeafletMapModel
};
