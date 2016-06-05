var extend = require('extend');

var WAD = require('./lumptypes');

function FileLump(iwad, header){
    this.filepos = header.getUint32(0, true);
    this.size = header.getUint32(4, true);
    this.name = header.getString(8);
    this.lump = new DataView(iwad.src.slice(this.filepos, this.filepos + this.size));
    this.iwad = iwad;
}
FileLump.sizeOf = 16;

extend(FileLump.prototype, {
    getType: function(){
        if (WAD.LumpTypesByName[this.name]) return WAD.LumpTypesByName[this.name];
        if (this.size == 0 && this.next && WAD.MapLumpTypes.indexOf(WAD.LumpTypesByName[this.next.name]) >= 0) return WAD.LumpTypes.MapMarker;
        if (this.size == 0) return WAD.LumpTypes.Marker;
        if (this.size == 4000) return WAD.LumpTypes.ANSIText;
        if (this.name.indexOf('DEMO') == 0) return WAD.LumpTypes.Demo;
        if (this.name.indexOf('TEXTURE') == 0) return WAD.LumpTypes.TEXTUREx;
        if (this.name == 'PNAMES') return WAD.LumpTypes.PNames;
        if (this.name == 'GENMIDI') return WAD.LumpTypes.GENMIDI;
        if (this.name == 'DMXGUS' || this.name == 'DMXGUSC') return WAD.LumpTypes.DMXGUS;
        if (this.name.indexOf('DP') == 0) return WAD.LumpTypes.SoundPC;
        if (this.name.indexOf('DS') == 0) return WAD.LumpTypes.SoundRaw;
        if (this.name.indexOf('D_') == 0) return WAD.LumpTypes.MusicMUS;
        if (this.size % 768 == 0 && /.+PAL$/i.test(this.name)) return WAD.LumpTypes.Playpal;
        return WAD.LumpTypes.Unknown;
    },
    load: function(){
        if (this.instance) return this.instance;

        switch (this.type){
            case WAD.LumpTypes.Playpal:
                this.instance = this.iwad.loadPlaypal(this);
                break;
            case WAD.LumpTypes.PNames:
                this.instance = this.iwad.loadPNames(this);
                break;
            case WAD.LumpTypes.Patch:
                this.instance = this.iwad.loadPatch(this);
                break;
        }

        return this.instance;
    }
});

module.exports = FileLump;