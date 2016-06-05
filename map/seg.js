function Seg(v1, v2, angle, linedef, direction, offset){
    this.v1 = v1;
    this.v2 = v2;
    this.angle = angle;
    this.linedef = linedef;
    this.direction = direction;
    this.offset = offset;

    if (this.linedef.right && this.linedef.right.sector.segs.indexOf(this) < 0) this.linedef.right.sector.segs.push(this);
    if (this.linedef.left && this.linedef.left.sector.segs.indexOf(this) < 0) this.linedef.left.sector.segs.push(this);
}
Seg.sizeOf = 12;

module.exports = Seg;