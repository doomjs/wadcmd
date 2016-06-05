function Blockmap(lump, linedefs){
    this.lump = lump;
    this.linedefs = linedefs;

    this.x = this.lump.getInt16(0, true);
    this.y = this.lump.getInt16(2, true);
    this.width = this.lump.getUint16(4, true);
    this.height = this.lump.getUint16(6, true);

    var len = this.width * this.height;
    this.blocklist = [];
    for (var x = 0; x < this.width; x++){
        this.blocklist[x] = [];
        for (var y = 0; y < this.height; y++){
            this.blocklist[x][y] = {
                linedefs: []
            };
            var offset = (this.lump.getUint16(8 + ((y * this.width) + x) * 2, true) + 1) * 2;
            var linedef = this.lump.getInt16(offset, true);
            while (linedef != -1){
                this.blocklist[x][y].linedefs.push(this.linedefs[linedef]);
                offset += 2;
                linedef = this.lump.getInt16(offset, true);
            }
        }
    }
}

module.exports = Blockmap;