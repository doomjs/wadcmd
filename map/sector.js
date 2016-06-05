function Sector(index, floorHeight, ceilingHeight, floorPic, ceilingPic, lightLevel, special, tag){
    this.index = index;
    this.floorHeight = floorHeight;
    this.ceilingHeight = ceilingHeight;
    this.floorPic = floorPic;
    this.ceilingPic = ceilingPic;
    this.lightLevel = lightLevel;
    this.special = special;
    this.tag = tag;

    this.segs = [];
    this.linedefs = [];
}
Sector.sizeOf = 26;

module.exports = Sector;