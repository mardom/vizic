var d3 = require("d3");
Voronoi = L.CusOverLay.extend({
	add: function() {
		var that = this;
		this._voronoi = this._projectData(this._json, this._map);
		this.sortJson(this._voronoi.polygons());
		setTimeout(function() {
			that.drawSvg();
		});
	},

    comp_func_y: function(a, b) {
        return a.data.y - b.data.y;
    },

    comp_func_x: function(a, b) {
        return a.data.x - b.data.x;
    },

    drawSvg: function() {
        L.CusOverLay.prototype.drawSvg.call(this, 'svg_v');
    },

    drawGroup: function(key, map) {
        L.CusOverLay.prototype.drawGroup.call(this, key, map, 'path');
    },

    _buildPathFromPoint: function(d) {
        try {
            return "M" + d.join("L") + "Z";
        } catch (e) {}
    },

	_projectData: function(json, map) {
        var init_z = this.options.svgZoom;
        // console.log(init_z);
        json.forEach(function(d) {
            var latlng = new L.LatLng(d.DEC, d.RA);
            var point = map.project(latlng, init_z);

            d.x = point.x;
            d.y = point.y;
        });
        var sz = Math.pow(2, init_z) * 256;
        var voronoi = d3.voronoi()
            .x(function(d) {
                return d.x;
            })
            .y(function(d) {
                return d.y;
            })
            .size([sz + 1, sz + 1]);
        return voronoi(json);
    },
});

Delaunay = Voronoi.extend({

	add: function() {
		var that = this;
		this._delaunay = this._projectData(this._json, this._map);
		this.sortJson(this._delaunay.triangles());
		setTimeout(function() {
			that.drawSvg();
		});
	},

	drawSvg: function() {
        L.CusOverLay.prototype.drawSvg.call(this, 'svg_d');
    },

	comp_func_y: function(a, b) {
        return a[0].y - b[0].y;
    },

	comp_func_x: function(a, b) {
        return a[0].x - b[0].x;
    },

	_buildPathFromPoint: function(d) {
		var line_gen = d3.line()
					.x(function(d){return d.x;})
					.y(function(d){return d.y;});
        try {
            return line_gen(d) + "Z";
        } catch (e) {}
    },
});

Healpix = L.CusOverLay.extend({
    comp_func_y: function(a, b) {
        return a[0][0] - b[0][0];
    },

	comp_func_x: function(a, b) {
        return a[0][0] - b[0][0];
    },

    drawSvg: function() {
        L.CusOverLay.prototype.drawSvg.call(this, 'svg_h');
    },

    drawGroup: function(key, map) {
        L.CusOverLay.prototype.drawGroup.call(this, key, map, 'path');
    },

    _buildPathFromPoint: function(d) {
        try {
            return "M" + d.join("L") + "Z";
        } catch (e) {}
    },

	_projectData: function(json, map) {
        var init_z = this.options.svgZoom;
        // console.log(init_z);
		var new_j = [];
		console.log(json);
        json.forEach(function(d) {
			var arr = [];
			for (var i=0; i<4; i++){
				var latlng = new L.LatLng(d.dec[i], d.ra[i]);
	            var point = map.project(latlng, init_z);
				arr.push([point.x, point.y]);
			}
			new_j.push(arr);
        });

        return new_j;
    },
});

L.CusOverLay.Circles = L.CusOverLay.extend({

	comp_func_y: function(a, b) {
        return Math.abs(a.DEC) - Math.abs(b.DEC);
    },

    comp_func_x: function(a, b) {
        return a.RA - b.RA;
    },

	drawSvg: function() {
        L.CusOverLay.prototype.drawSvg.call(this, 'svg_circles');
    },

	drawGroup: function(key, map) {
        var data = this._dataR[key];
		// console.log(data);
        var g = svg_m.append('g');
        g.selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
			.attr('cx', function(d){return d.x;})
			.attr('cy', function(d){return d.y;})
			.attr('r', function(d){return d.r;})
            .attr('stroke', this.options.color)
            .attr('stroke-width', this.options.lineWidth)
            .attr('vector-effect', 'non-scaling-stroke')
            .attr("transform", "scale(" + Math.pow(2, (map.getZoom() - this.options.svgZoom)) + ")");
    },

	_projectData: function(json, map) {
        var init_z = this.options.svgZoom,
			r = this.options.radius;

        json.forEach(function(d) {
            var latlng = new L.LatLng(d.DEC, d.RA);
            var point = map.project(latlng, init_z);
            d.x = point.x;
            d.y = point.y;
			d.r = d.RADIUS === undefined? r:d.RADIUS;

        });
		// console.log(json);
        return json;
    },
});

L.overLayCircles = function(url, options) {
    return new L.CusOverLay.Circles(url, options);
};

L.CusOverLay.Lines = L.CusOverLay.extend({
	comp_func_y: function(a, b) {
        return Math.abs(a.DEC1) - Math.abs(b.DEC1);
    },

    comp_func_x: function(a, b) {
        return a.RA1 - b.RA1;
    },

	drawSvg: function() {
        L.CusOverLay.prototype.drawSvg.call(this, 'svg_lines');
    },

	key_func: function(d){
		return d.line_index;
	},

    drawGroup: function(key, map) {
        var data = this._dataR[key];
        var g = svg_m.append('g');
        g.selectAll('path')
            .data(data, this.key_func)
            .enter()
            .append('path').attr("d", this._buildPathFromPoint)
            .attr('stroke', this.options.color)
            .attr('stroke-width', this.options.lineWidth)
            .attr('vector-effect', 'non-scaling-stroke')
            .attr("transform", "scale(" + Math.pow(2, (map.getZoom() - this.options.svgZoom)) + ")");
        // this._fms[key] = g;
    },

	_buildPathFromPoint: function(d) {
        try {
            return "M" + d.x1 + ',' + d.y1 + 'L' + d.x2 + ',' + d.y2;
        } catch (e) {
            console.log(e);
        }
    },

	_projectData: function(json, map) {
        var init_z = this.options.svgZoom;
        // console.log(init_z);
        json.forEach(function(d) {
            var latlng1 = new L.LatLng(d.DEC1, d.RA1);
            var latlng2 = new L.LatLng(d.DEC2, d.RA2);

            var point1 = map.project(latlng1, init_z);
            var point2 = map.project(latlng2, init_z);

            d.x1 = point1.x;
            d.y1 = point1.y;
            d.x2 = point2.x;
            d.y2 = point2.y;

        });
        return json;
    },
});

L.overLayLines = function(url, options) {
    return new L.CusOverLay.Lines(url, options);
};
