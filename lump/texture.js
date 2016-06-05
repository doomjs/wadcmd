var fs = require('fs');
var PNG = require('pngjs').PNG;

function Texture(name, width, height, patches, offset){
    this.name = name;
    this.width = width;
    this.height = height;
    this.patches = patches;
    this.offset = offset;
    this.buffer = new Uint32Array(this.width * this.height);
}
var emptyFn = function(){};
Texture.prototype.render = function(pal){
    if ((pal && this.pal == pal) || !pal) return this.buffer;
    this.buffer = new Uint32Array(this.width * this.height);
    for (var i = 0; i < this.patches.length; i++){
        var patch = this.patches[i];
        patch.picture.render(pal);
        for (var x = 0; x < patch.width; x++){
            for (var y = 0; y < patch.height; y++){
                if ((y + patch.topOffset) >= this.height || (x + patch.leftOffset) >= this.width || patch.picture.buffer[(y * patch.width) + x] == 0) continue;
                var offset = ((y + patch.topOffset) * this.width) + (x + patch.leftOffset);
                this.buffer[offset] = patch.picture.buffer[(y * patch.width) + x];
            }
        }
    }
    this.pal = pal;
    return this.buffer;
};
Texture.prototype.saveAsPNG = function(filename, pal, callback){
    var png = new PNG({
        width: this.width,
        height: this.height
    });

    png.data = new Buffer(this.render(pal).buffer);
    png.pack().pipe(fs.createWriteStream(filename)).on('finish', callback || emptyFn);
};

module.exports = Texture;