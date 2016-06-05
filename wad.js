var extend = require('extend');
var chalk = require('chalk');

require('./utils/dataview-polyfill');

var cp437 = require('./utils/cp437');
var WadInfo = module.exports.WadInfo = require('./lump/wadinfo');
var FileLump = module.exports.FileLump = require('./lump/filelump');
var Flat = module.exports.Flat = require('./lump/flat');
var Picture = module.exports.Picture = require('./lump/picture');
var Patch = module.exports.Patch = require('./lump/patch');
var Texture = module.exports.Texture = require('./lump/texture');
var SoundEffect = module.exports.SoundEffect = require('./lump/soundeffect');
var GENMIDI = module.exports.GENMIDI = require('./lump/genmidi');
var Music = module.exports.Music = require('./lump/music');
var Map = module.exports.Map = require('./map/map');

function WAD(iwad){
    this.src = iwad;
    this.data = new DataView(this.src);
    this.header = new WadInfo(this.data);
    this.lumps = [];
    this.lumpsByName = {};
    for (var i = 0, p = this.header.infotableofs; i < this.header.numlumps; i++, p += FileLump.sizeOf){
        var li = new FileLump(this, new DataView(this.src.slice(p, p + FileLump.sizeOf)));
        this.lumps.push(li);
        this.lumpsByName[li.name.toLowerCase()] = li;
    }
    var self = this;
    var inPStart = false;
    var inFStart = false;
    this.lumps.forEach(function(it, i){
        if (it.name == 'P_END') inPStart = false;
        if (it.name == 'F_END') inFStart = false;
        it.index = i;
        it.prev = self.lumps[i - 1] || self.lumps[self.lumps.length - 1];
        it.next = self.lumps[i + 1] || self.lumps[0];
        it.type = inPStart && it.size > 0 ? WAD.LumpTypes.Patch : inFStart && it.size > 0 ? WAD.LumpTypes.GraphicFlat : it.getType();
        if (it.name == 'P_START') inPStart = true;
        if (it.name == 'F_START') inFStart = true;
    });
    this.lumps.byName = function(name){
        return self.lumpsByName[name.toLowerCase()];
    };
}
extend(WAD, require('./lump/lumptypes'));

extend(WAD.prototype, {
    loadResources: function(){
        try{ this.loadPlaypal(); }catch(err){ console.log(chalk.red('Failed to load playpal'), err); }
        try{ this.loadColormap(); }catch(err){ console.log(chalk.red('Failed to load colormap'), err); }
        try{ this.loadTextures(); }catch(err){ console.log(chalk.red('Failed to load textures'), err); }
        try{ this.loadFlats(); }catch(err){ console.log(chalk.red('Failed to load flats'), err); }
        try{ this.loadSprites(); }catch(err){ console.log(chalk.red('Failed to load sprites'), err); }
        try{ this.loadGraphics(); }catch(err){ console.log(chalk.red('Failed to load graphics'), err); }
        try{ this.loadSoundeffects(); }catch(err){ console.log(chalk.red('Failed to load sound effects'), err); }
        try{ this.loadGenmidi(); }catch(err){ console.log(chalk.red('Failed to load genmidi'), err); }
        try{ this.loadMusic(); }catch(err){ console.log(chalk.red('Failed to load music tracks'), err); }
        try{ this.loadMaps(); }catch(err){ console.log(chalk.red('Failed to load maps'), err.stack); }
    },
    loadPlaypal: function(lump){
        var playpal = lump || this.lumps.byName('playpal');
        var count = playpal.size / 768;
        this.playpal = new Array(count);

        for (var i = 0, p = 0; i < count * 768; i += 768, p++){
            var buf = new ArrayBuffer(256 * 4);
            var pal = new Uint32Array(buf);
            for (var j = 0, k = 0; j < 768; j += 3, k++){
                pal[k] = (255 << 24) | (playpal.lump.getUint8(i + j + 2) << 16) | (playpal.lump.getUint8(i + j + 1) << 8) | playpal.lump.getUint8(i + j);
            }
            this.playpal[p] = pal;
        }
    },
    loadColormap: function(lump){
        var colormap = lump || this.lumps.byName('colormap');
        this.colormap = new Array(34);
        for (var i = 0, p = 0; i < 34 * 256; i += 256, p++){
            var map = new Array(256);
            for (var j = 0; j < 256; j++){
                map[j] = colormap.lump.getUint8(i + j);
            }
            this.colormap[p] = map;
        }
    },
    loadTextures: function(){
        var pnames = this.lumps.byName('pnames');
        var pnamesLength = pnames.lump.getUint32(0, true);
        this.pnames = new Array(pnamesLength);
        for (var i = 4, p = 0; i < pnamesLength * 8 + 4; i += 8, p++){
            this.pnames[p] = pnames.lump.getString(i, 8);
        }

        this.textures = {};
        this.patches = {};
        var texture1 = this.lumps.byName('texture1');
        var offsetLength = texture1.lump.getUint32(0, true) * 4 + 4;
        for (var i = 4; i < offsetLength; i += 4){
            var offset = texture1.lump.getUint32(i, true);
            var patchesLength = texture1.lump.getUint16(offset + 20, true);
            var patches = new Array(patchesLength);
            for (var j = offset + 22, p = 0; j < offset + patchesLength * 10 + 22; j += 10, p++){
                var pname = this.pnames[texture1.lump.getUint16(j + 4, true)];
                var patch = this.lumps.byName(pname);
                if (patch.type == WAD.LumpTypes.Unknown) patch.type = WAD.LumpTypes.GraphicDoom;
                patches[p] = this.patches[pname] = new Patch(
                    pname,
                    new Picture(patch.lump),
                    texture1.lump.getInt16(j, true),
                    texture1.lump.getInt16(j + 2, true)
                );
            }
            var tname = texture1.lump.getString(offset, 8);
            this.textures[tname] = new Texture(
                tname,
                texture1.lump.getUint16(offset + 12, true),
                texture1.lump.getUint16(offset + 14, true),
                patches,
                offset
            );
        }
    }, 
    loadFlats: function(){
        this.flats = {};
        var flat = this.lumps[this.lumps.byName('f_start').index + 1];
        while (flat.name.toLowerCase() != 'f_end'){
            if (flat.size){
                this.flats[flat.name] = new Flat(flat.lump);
            }
            flat = this.lumps[flat.index + 1];
        }
    },
    loadSprites: function(){
        this.sprites = {};
        var sprite = this.lumps[this.lumps.byName('s_start').index + 1];
        while (sprite.name.toLowerCase() != 's_end'){
            if (sprite.size){
                this.sprites[sprite.name] = new Picture(sprite.lump);
                if (sprite.type == WAD.LumpTypes.Unknown) sprite.type = WAD.LumpTypes.GraphicDoom;
            }
            sprite = this.lumps[sprite.index + 1];
        }
    },
    loadGraphics: function(){
        this.graphics = {};
        var self = this;
        this.lumps.filter(function(it){ return it.type == WAD.LumpTypes.Unknown; }).forEach(function(lump){
            if (lump.size){
                self.graphics[lump.name] = new Picture(lump.lump);
                if (lump.type == WAD.LumpTypes.Unknown) lump.type = WAD.LumpTypes.GraphicDoom;
            }
        });
    },
    loadSoundeffects: function(){
        this.soundeffects = {};
        var dslumps = this.lumps.filter(function(it){ return it.name.toLowerCase().indexOf('ds') == 0; });
        for (var i = 0; i < dslumps.length; i++){
            var ds = dslumps[i];
            this.soundeffects[ds.name] = new SoundEffect(ds.name, ds.lump);
        }
    },
    loadGenmidi: function(){
        this.genmidi = new GENMIDI(this.lumps.byName('genmidi').lump);
    },
    loadMusic: function(){
        this.music = {};
        var dlumps = this.lumps.filter(function(it){ return it.name.toLowerCase().indexOf('d_') == 0; });
        for (var i = 0; i < dlumps.length; i++){
            var d = dlumps[i];
            this.music[d.name] = new Music(d.name, d.lump, this.genmidi);
        }
    },
    loadMaps: function(){
        this.maps = {};
        var markers = this.lumps.filter(function(it){ return it.type == WAD.LumpTypes.MapMarker; });
        for (var i = 0; i < markers.length; i++){
            var marker = markers[i];
            this.maps[marker.name] = new Map(marker);
        }
    },
    
    //utils
    convertColor: function(color){
        var hex = color.toString(16);
        return '#' + hex.slice(6) + hex.slice(4, 6) + hex.slice(2, 4);
    },
    renderPal: function(pal){
        if (pal.imgSrc) return pal.imgSrc;

        var canvas = document.createElement('CANVAS');
        canvas.width = 16 * 32;
        canvas.height = 16 * 32;
        var context = canvas.getContext('2d');

        context.clearRect(0, 0, canvas.width, canvas.height);
        var self = this;
        pal.forEach(function(color, i){
            context.fillStyle = self.convertColor(color);
            context.fillRect((i % 16) * 32, Math.floor(i / 16) * 32, 32, 32);
        });

        pal.imgSrc = canvas.toDataURL();
        return pal.imgSrc;
    },
    renderANSI: function(lump){
        if (lump.ansi) return lump.ansi;
        
        var ansi = '';
        for (var i = 2, j = 3, line = 0, col = 0; i < lump.size; i += 2, j += 2){
            var char = '\u001b[';
            switch (lump.lump.getUint8(j) & 15){
                case 0: char += 30; break;
                case 1: char += 34; break;
                case 2: char += 32; break;
                case 3: char += 36; break;
                case 4: char += 31; break;
                case 5: char += 35; break;
                case 6: char += 33; break;
                case 7: char += 37; break;
                case 8: char += 90; break;
                case 9: char += 94; break;
                case 10: char += 92; break;
                case 11: char += 96; break;
                case 12: char += 91; break;
                case 13: char += 95; break;
                case 14: char += 93; break;
                case 15: char += 97; break;
            }
            char += 'm';
            
            char += '\u001b[';
            switch ((lump.lump.getUint8(j) >> 4) & 15){
                case 0: char += 40; break;
                case 1: char += 44; break;
                case 2: char += 42; break;
                case 3: char += 46; break;
                case 4: char += 41; break;
                case 5: char += 45; break;
                case 6: char += 43; break;
                case 7: char += 47; break;
                case 8: char += 100; break;
                case 9: char += 104; break;
                case 10: char += 102; break;
                case 11: char += 106; break;
                case 12: char += 101; break;
                case 13: char += 105; break;
                case 14: char += 103; break;
                case 15: char += 107; break;
            }
            char += 'm';
            char += cp437.convert(String.fromCharCode(lump.lump.getUint8(i)));
            char += '\u001b[39m\u001b[49m';
            
            if (i > 0 && i % 160 == 0){
                char += '\n';
            }
            
            ansi += char;
            col = i % 160;
        }
        
        return ansi;
    },
    renderANSIAsHtml: function(lump){
        if (lump.html) return lump.html;

        var style = 'color: #aaaaaa; background-color: #000000;';
        var mem = '<div><span style="' + style + '">';
        for (var i = 2, j = 3, line = 0, col = 0; i < lump.size; i += 2, j += 2){
            var html = '';

            var spanStyle = 'color: ';
            switch (lump.lump.getUint8(j) & 15){
                case 0: spanStyle += '#000000'; break;
                case 1: spanStyle += '#0000aa'; break;
                case 2: spanStyle += '#00aa00'; break;
                case 3: spanStyle += '#00aaaa'; break;
                case 4: spanStyle += '#aa0000'; break;
                case 5: spanStyle += '#aa00aa'; break;
                case 6: spanStyle += '#aa5500'; break;
                case 7: spanStyle += '#aaaaaa'; break;
                case 8: spanStyle += '#555555'; break;
                case 9: spanStyle += '#5555ff'; break;
                case 10: spanStyle += '#55ff55'; break;
                case 11: spanStyle += '#55ffff'; break;
                case 12: spanStyle += '#ff5555'; break;
                case 13: spanStyle += '#ff55ff'; break;
                case 14: spanStyle += '#ffff55'; break;
                case 15: spanStyle += '#ffffff'; break;
            }
            spanStyle += '; background-color: ';
            switch ((lump.lump.getUint8(j) >> 4) & 15){
                case 0: spanStyle += '#000000'; break;
                case 1: spanStyle += '#0000aa'; break;
                case 2: spanStyle += '#00aa00'; break;
                case 3: spanStyle += '#00aaaa'; break;
                case 4: spanStyle += '#aa0000'; break;
                case 5: spanStyle += '#aa00aa'; break;
                case 6: spanStyle += '#aa5500'; break;
                case 7: spanStyle += '#aaaaaa'; break;
                case 8: spanStyle += '#555555'; break;
                case 9: spanStyle += '#5555ff'; break;
                case 10: spanStyle += '#55ff55'; break;
                case 11: spanStyle += '#55ffff'; break;
                case 12: spanStyle += '#ff5555'; break;
                case 13: spanStyle += '#ff55ff'; break;
                case 14: spanStyle += '#ffff55'; break;
                case 15: spanStyle += '#ffffff'; break;
            }
            spanStyle += ';';

            var ch = String.fromCharCode(lump.lump.getUint8(i));
            if (ch == ' ') ch = '<span class="nbsp"></span>';

            if (style != spanStyle){
                style = spanStyle;
                html += '</span><span style="' + style + '">';
                html += ch;
            }else{
                html += ch;
            }

            if (i > 0 && i % 160 == 0){
                html += '</span></div>';
                line++;
                if (line < 25) html += '<div><span style="' + style + '">';
            }

            mem += html;
            col = i % 160;
        }

        var val = cp437.convert(mem);
        lump.html = val;
        return val;
    }
});
   
module.exports.WAD = WAD;