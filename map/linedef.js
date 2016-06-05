function LineDef(v1, v2, flags, special, tag, right, left){
    this.v1 = v1;
    this.v2 = v2;
    this.flags = flags;
    this.special = special;
    this.tag = tag;
    this.right = right;
    this.left = left;

    this.impassable = !!(this.flags & 1);
    this.blockMonster = !!(this.flags & 2);
    this.doubleSided = !!(this.flags & 4);
    this.upperUnpegged = !!(this.flags & 8);
    this.lowerUnpegged = !!(this.flags & 16);
    this.secret = !!(this.flags & 32);
    this.blockSound = !!(this.flags & 64);
    this.notOnMap = !!(this.flags & 128);
    this.alreadyOnMap = !!(this.flags & 256);
}
LineDef.sizeOf = 14;

module.exports = LineDef;
