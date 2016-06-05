function WadInfo(iwad){
    this.identification = iwad.getString(0, 4);
    this.numlumps = iwad.getUint32(4, true);
    this.infotableofs = iwad.getUint32(8, true);
};
WadInfo.sizeOf = 16;

module.exports = WadInfo;