function SideDef(textureOffset, rowOffset, topTexture, bottomTexture, midTexture, sector){
    this.textureOffset = textureOffset;
    this.rowOffset = rowOffset;
    this.topTexture = topTexture.toUpperCase();
    this.bottomTexture = bottomTexture.toUpperCase();
    this.midTexture = midTexture.toUpperCase();
    this.sector = sector;
}
SideDef.sizeOf = 30;

module.exports = SideDef;