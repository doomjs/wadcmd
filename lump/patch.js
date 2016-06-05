function Patch(name, picture, leftOffset, topOffset){
    this.name = name;
    this.picture = picture;
    this.width = picture.width;
    this.height = picture.height;
    this.leftOffset = leftOffset;
    this.topOffset = topOffset;
    this.stepdir = 1;
    this.colormap = 0;
}
Patch.prototype.saveAsPNG = function(filename, pal, callback){
    return this.picture.saveAsPNG(filename, pal, callback);
};

module.exports = Patch;