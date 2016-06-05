var fs = require('fs');
var PNG = require('pngjs').PNG;

function Picture(lump){
    this.lump = lump;
    this.width = lump.getUint16(0, true);
    this.height = lump.getUint16(2, true);
    this.leftOffset = lump.getInt16(4, true);
    this.topOffset = lump.getInt16(6, true);
    this.buffer = new Uint32Array(this.width * this.height);
}
var emptyFn = function(){};
Picture.prototype.render = function(pal){
    if ((pal && this.pal == pal) || !pal) return this.buffer;
    for (var i = 0; i < this.width; i++){
        var offset = this.lump.getUint32(8 + i * 4, true);
        var j = -1;
        while (this.lump.getUint8(offset + (++j)) != 255){
            var row = this.lump.getUint8(offset + (j++));
            var len = this.lump.getUint8(offset + (j++));
            for (var k = 0; k < len; k++){
                this.buffer[((row + k) * this.width) + i] = pal[this.lump.getUint8(offset + (j++) + 1)];
            }
            j++;
        }
    }
    this.pal = pal;
    return this.buffer;
};
Picture.prototype.saveAsPNG = function(filename, pal, callback){
    var png = new PNG({
        width: this.width,
        height: this.height
    });

    png.data = new Buffer(this.render(pal).buffer);
    png.pack().pipe(fs.createWriteStream(filename)).on('finish', callback || emptyFn);
};

module.exports = Picture;