function VoiceData(data){
    this.modulatorTremolo = data.getUint8(0);
    this.modulatorAttack = data.getUint8(1);
    this.modulatorSustain = data.getUint8(2);
    this.modulatorWaveform = data.getUint8(3);
    this.modulatorKey = data.getUint8(4);
    this.modulatorOutput = data.getUint8(5);
    this.feedback = data.getUint8(6);
    this.carrierTremolo = data.getUint8(7);
    this.carrierAttack = data.getUint8(8);
    this.carrierSustain = data.getUint8(9);
    this.carrierWaveform = data.getUint8(10);
    this.carrierKey = data.getUint8(11);
    this.carrierOutput = data.getUint8(12);
    this.baseNoteOffset = data.getInt16(14, true);
}

function OPLInstrument(name, data){
    this.name = name;
    this.data = data;
    this.flags = data.getUint16(0, true);

    this.fixedPitch = !!(this.flags & 1);
    this.unknown = !!(this.flags & 2);
    this.doubleVoice = !!(this.flags & 4);

    this.fineTuning = data.getUint8(2);
    this.fixedNote = data.getUint8(3);

    this.voices = [new VoiceData(new DataView(data.buffer.slice(4, 20))), new VoiceData(new DataView(data.buffer.slice(20, 36)))];
}

function GENMIDI(lump){
    this.lump = lump;
    this.instruments = [];
    this.header = lump.getString(0, 8);
    for (var i = 8, j = 175 * 36 + 8; i < 175 * 36 + 8; i += 36, j += 32){
        var name = lump.getString(j);
        this.instruments.push(new OPLInstrument(name, new DataView(lump.buffer.slice(i, i + 36))));
    }
}

module.exports = GENMIDI;