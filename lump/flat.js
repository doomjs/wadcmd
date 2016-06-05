var fs = require('fs');
var PNG = require('pngjs').PNG;

function Flat(lump){
    this.lump = lump;
    this.width = 64;
    this.height = 64;
    this.leftOffset = 0;
    this.topOffset = 0;
    this.buffer = new Uint32Array(this.width * this.height);
}
var emptyFn = function(){};
Flat.prototype.render = function(pal){
    if ((pal && this.pal == pal) || !pal) return this.buffer;
    
    for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
            var index = (this.width * y + x);

            this.buffer[index] = pal[this.lump.getUint8(index)];
        }
    }
    
    return this.buffer;
};
Flat.prototype.saveAsPNG = function(filename, pal, callback){
    var png = new PNG({
        width: this.width,
        height: this.height
    });

    png.data = new Buffer(this.render(pal).buffer);
    png.pack().pipe(fs.createWriteStream(filename)).on('finish', callback || emptyFn);
};

module.exports = Flat;