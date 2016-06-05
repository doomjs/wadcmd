function SubSector(index, numsegs, firstseg, segs){
    this.index = index;
    this.numsegs = numsegs;
    this.firstseg = firstseg;
    this.segs = segs;
}
SubSector.sizeOf = 4;

module.exports = SubSector;