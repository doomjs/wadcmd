var path = require('path');
var fs = require('fs');
var _ = require('underscore');

var svgTemplate = _.template(fs.readFileSync(path.join(__dirname, './template.svg'), 'utf8'));

var Blockmap = require('./blockmap');
var BoundingBox = require('./boundingbox');
var LineDef = require('./linedef');
var Node = require('./node');
var Reject = require('./reject');
var Sector = require('./sector');
var Seg = require('./seg');
var SideDef = require('./sidedef');
var SubSector = require('./subsector');
var Thing = require('./thing');
var Vertex = require('./vertex');

function Map(lump){
    this.name = lump.name;
    
    var iwad = lump.iwad;
    var p = lump.index;

    this.lumps = {
        things: iwad.lumps[p + 1],
        linedefs: iwad.lumps[p + 2],
        sidedefs: iwad.lumps[p + 3],
        vertices: iwad.lumps[p + 4],
        segs: iwad.lumps[p + 5],
        subsectors: iwad.lumps[p + 6],
        nodes: iwad.lumps[p + 7],
        sectors: iwad.lumps[p + 8],
        reject: iwad.lumps[p + 9],
        blockmap: iwad.lumps[p + 10]
    };

    this.vertices = new Array(this.lumps.vertices.size / Vertex.sizeOf);
    for (var i = 0, j = 2, p = 0; j < this.lumps.vertices.size; i += Vertex.sizeOf, j += Vertex.sizeOf, p++){
        this.vertices[p] = new Vertex(
            this.lumps.vertices.lump.getInt16(i, true),
            this.lumps.vertices.lump.getInt16(j, true)
        );
    }

    this.things = new Array(this.lumps.things.size / Thing.sizeOf);
    for (var i = 0, p = 0; i < this.lumps.things.size; i += Thing.sizeOf, p++){
        this.things[p] = new Thing(
            this.lumps.things.lump.getInt16(i, true),
            this.lumps.things.lump.getInt16(i + 2, true),
            this.lumps.things.lump.getUint16(i + 4, true),
            this.lumps.things.lump.getUint16(i + 6, true),
            this.lumps.things.lump.getUint16(i + 8, true)
        );
    }

    this.sectors = new Array(this.lumps.sectors.size / Sector.sizeOf);
    for (var i = 0, p = 0; i < this.lumps.sectors.size; i += Sector.sizeOf, p++){
        this.sectors[p] = new Sector(
            p,
            this.lumps.sectors.lump.getInt16(i, true),
            this.lumps.sectors.lump.getInt16(i + 2, true),
            this.lumps.sectors.lump.getString(i + 4, 8),
            this.lumps.sectors.lump.getString(i + 12, 8),
            this.lumps.sectors.lump.getUint16(i + 20, true),
            this.lumps.sectors.lump.getUint16(i + 22, true),
            this.lumps.sectors.lump.getUint16(i + 24, true)
        );
    }

    this.sidedefs = new Array(this.lumps.sidedefs.size / SideDef.sizeOf);
    for (var i = 0, p = 0; i < this.lumps.sidedefs.size; i += SideDef.sizeOf, p++){
        this.sidedefs[p] = new SideDef(
            this.lumps.sidedefs.lump.getInt16(i, true),
            this.lumps.sidedefs.lump.getInt16(i + 2, true),
            this.lumps.sidedefs.lump.getString(i + 4, 8),
            this.lumps.sidedefs.lump.getString(i + 12, 8),
            this.lumps.sidedefs.lump.getString(i + 20, 8),
            this.sectors[this.lumps.sidedefs.lump.getUint16(i + 28, true)]
        );
    }

    this.linedefs = new Array(this.lumps.linedefs.size / LineDef.sizeOf);
    for (var i = 0, p = 0; i < this.lumps.linedefs.size; i += LineDef.sizeOf, p++){
        this.linedefs[p] = new LineDef(
            this.vertices[this.lumps.linedefs.lump.getUint16(i, true)],
            this.vertices[this.lumps.linedefs.lump.getUint16(i + 2, true)],
            this.lumps.linedefs.lump.getUint16(i + 4, true),
            this.lumps.linedefs.lump.getUint16(i + 6, true),
            this.lumps.linedefs.lump.getUint16(i + 8, true),
            this.sidedefs[this.lumps.linedefs.lump.getInt16(i + 10, true)],
            this.sidedefs[this.lumps.linedefs.lump.getInt16(i + 12, true)]
        );
    }

    this.segs = new Array(this.lumps.segs.size / Seg.sizeOf);
    for (var i = 0, p = 0; i < this.lumps.segs.size; i += Seg.sizeOf, p++){
        this.segs[p] = new Seg(
            this.vertices[this.lumps.segs.lump.getUint16(i, true)],
            this.vertices[this.lumps.segs.lump.getUint16(i + 2, true)],
            this.lumps.segs.lump.getInt16(i + 4, true),
            this.linedefs[this.lumps.segs.lump.getUint16(i + 6, true)],
            this.lumps.segs.lump.getUint16(i + 8, true),
            this.lumps.segs.lump.getUint16(i + 10, true)
        );
    }

    this.subsectors = new Array(this.lumps.subsectors.size / SubSector.sizeOf);
    for (var i = 0, j = 2, p = 0; j < this.lumps.subsectors.size; i += SubSector.sizeOf, j += SubSector.sizeOf, p++){
        var numsegs = this.lumps.subsectors.lump.getUint16(i, true);
        var firstseg = this.lumps.subsectors.lump.getUint16(j, true);
        this.subsectors[p] = new SubSector(
            p,
            numsegs,
            firstseg,
            this.segs.slice(firstseg, firstseg + numsegs)
        );
    }

    this.nodes = new Array(this.lumps.nodes.size / Node.sizeOf);
    var buildNode = function(p, lump, offset, nodes, subsectors){
        if (nodes[p]) return nodes[p];

        var rightChild = lump.getUint16(offset + 24, true);
        var leftChild = lump.getUint16(offset + 26, true);
        nodes[p] = new Node(
            p,
            lump.getInt16(offset, true),
            lump.getInt16(offset + 2, true),
            lump.getInt16(offset + 4, true),
            lump.getInt16(offset + 6, true),
            new BoundingBox(
                lump.getInt16(offset + 8, true),
                lump.getInt16(offset + 10, true),
                lump.getInt16(offset + 12, true),
                lump.getInt16(offset + 14, true)
            ),
            new BoundingBox(
                lump.getInt16(offset + 16, true),
                lump.getInt16(offset + 18, true),
                lump.getInt16(offset + 20, true),
                lump.getInt16(offset + 22, true)
            ),
            rightChild & 0x8000 ? subsectors[rightChild & 0x7fff] : buildNode(rightChild, lump, rightChild * Node.sizeOf, nodes, subsectors),
            leftChild & 0x8000 ? subsectors[leftChild & 0x7fff] : buildNode(leftChild, lump, leftChild * Node.sizeOf, nodes, subsectors)
        );
        if (nodes[p].rightChild instanceof SubSector){
            nodes[p].rightChild.parent = nodes[p];
            nodes[p].rightChild.boundingBox = nodes[p].rightBbox;
        }
        if (nodes[p].leftChild instanceof SubSector){
            nodes[p].leftChild.parent = nodes[p];
            nodes[p].leftChild.boundingBox = nodes[p].leftBbox;
        }

        return nodes[p];
    };
    for (var i = 0, p = 0; i < this.lumps.nodes.size; i += Node.sizeOf, p++){
        if (!this.nodes[p]){
            buildNode(p, this.lumps.nodes.lump, i, this.nodes, this.subsectors);
        }
    }

    this.reject = new Reject(this.lumps.reject.lump, this.sectors);
    this.blockmap = new Blockmap(this.lumps.blockmap.lump, this.linedefs);
}
Map.prototype.svgZoom = 0.25;
Map.prototype.svgPadding = 50;
Map.prototype.svgStrokeWidth = 5;
Map.prototype.svgColors = {
    diff: '#bf7b4b',
    nomap: '#ffff00',
    hidden: '#838383',
    wall: '#ff0000'
};
Map.prototype.renderAsSVG = function(){
    var zoom = this.svgZoom;
    var padding = this.svgPadding;
    var min = { x: Infinity, y: Infinity };
    var max = { x: -Infinity, y: -Infinity };
    for (var i = 0; i < this.linedefs.length; i++){
        var ld = this.linedefs[i];
        
        if (ld.v1.x < min.x) min.x = ld.v1.x;
        if (ld.v2.x < min.x) min.x = ld.v2.x;
        if (-ld.v1.y < min.y) min.y = -ld.v1.y;
        if (-ld.v2.y < min.y) min.y = -ld.v2.y;
        
        if (ld.v1.x > max.x) max.x = ld.v1.x;
        if (ld.v2.x > max.x) max.x = ld.v2.x;
        if (-ld.v1.y > max.y) max.y = -ld.v1.y;
        if (-ld.v2.y > max.y) max.y = -ld.v2.y;
    }
    
    var path = {
        wall: [],
        hidden: [],
        diff: [],
        nomap: []
    };
    for (var i = 0; i < this.linedefs.length; i++){
        var ld = this.linedefs[i];
        
        if (ld.left && ld.right && ld.left.sector.floorHeight == ld.right.sector.floorHeight && ld.left.sector.ceilingHeight == ld.right.sector.ceilingHeight){
            path.hidden.push(ld);                
        }else if (ld.left && ld.right && ld.left.sector.floorHeight != ld.right.sector.floorHeight){
            path.diff.push(ld);
        }else if (ld.left && ld.right && ld.left.sector.ceilingHeight != ld.right.sector.ceilingHeight){
            path.nomap.push(ld);
        }else path.wall.push(ld);
    }
    
    for (var p in path){
        var stylePath = path[p].map(function(it){ return { v1: it.v1, v2: it.v2 }; });
        var ld = stylePath[0];
        var t = [];
        var svgPath = '';
        
        if (ld){
            var first = ld;
            t.push(ld);
            svgPath += 'M' + (ld.v1.x) + ',' + (-ld.v1.y) + ' L' + (ld.v2.x) + ',' + (-ld.v2.y);
            
            var moveline = false;
            var next = null;
            var findNext = function(){
                for (var i = 0; i < stylePath.length; i++){
                    var it = stylePath[i];
                    
                    if (t.indexOf(it) < 0){
                        if (it.v1.x == ld.v2.x && it.v1.y == ld.v2.y){
                            next = it;
                            break;
                        }else if (it.v2.x == ld.v2.x && it.v2.y == ld.v2.y){
                            var tmp = it.v1;
                            it.v1 = it.v2;
                            it.v2 = tmp;
                            
                            next = it;
                            break;
                        }
                    }
                }
                
                if (!next){
                    for (var i = 0; i < stylePath.length; i++){
                        var it = stylePath[i];
                        
                        if (t.indexOf(it) < 0){
                            next = it;
                            moveline = true;
                            break;
                        }
                    }
                }
            };
            findNext();
            
            while (next){
                t.push(next);
                
                if (moveline){
                    svgPath += ' M' + (next.v1.x) + ',' + (-next.v1.y) + ' L' + (next.v2.x) + ',' + (-next.v2.y);
                    first = next;
                    moveline = false;
                }else{
                    svgPath += ' L' + (next.v1.x) + ',' + (-next.v1.y) + ' L' + (next.v2.x) + ',' + (-next.v2.y);
                    if (first.v1.x == next.v2.x && first.v1.y == next.v2.y) svgPath += 'Z';
                }
                
                ld = next;
                next = null;
                findNext();
            }
        }
        
        path[p] = svgPath;
    }
    
    return svgTemplate({
        width: (max.x - min.x + padding * 2) * zoom,
        height: (max.y - min.y + padding * 2) * zoom,
        zoom: zoom,
        description: this.name,
        translateX: (-min.x + padding) * zoom,
        translateY: (-min.y + padding) * zoom,
        path: path,
        strokeWidth: this.svgStrokeWidth,
        colors: this.svgColors
    });
};
Map.prototype.saveAsSVG = function(filename, callback){
    fs.writeFile(filename, this.renderAsSVG(), 'utf8', callback);
};

module.exports = Map;