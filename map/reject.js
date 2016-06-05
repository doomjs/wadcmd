function Reject(lump, sectors){
    var bits = [];
    for (var i = 0; i < lump.size; i++){
        bits = bits.concat(lump.getUint8(i).toString(2).split('').reverse());
    }

    this.bits = new Array(sectors.length);
    for (var p = 0; p < sectors.length; p++){
        this.bits[p] = new Array(sectors.length);
        for (var m = 0; m < sectors.length; m++){
            this.bits[p][m] = bits[(m * sectors.length) + p] == '0' ? false : true;
        }
    }
}

module.exports = Reject;