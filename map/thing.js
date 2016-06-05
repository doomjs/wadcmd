function Thing(x, y, angle, type, options){
    this.x = x;
    this.y = y;
    this.angle = (angle + 180) % 360;
    this.type = type;
    this.options = options;
}
Thing.sizeOf = 10;

module.exports = Thing;