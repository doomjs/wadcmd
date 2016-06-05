var lame = require('lame');
var ogg = require('ogg');
var vorbis = require('opl3/utils/vorbis-encoder');
var Speaker = require('speaker');
var fs = require('fs');
var WAV = require('../utils/wav').WAV;

function SoundEffect(name, lump){
    this.name = name;
    this.lump = lump;
    this.sampleRate = this.lump.getUint16(2, true);
    var samples = this.lump.getUint32(4, true);
    
    var offset = 16;
    if (samples > 33){
        var e = samples - 16;
		for (var i = 0; i < 16; ++i){
			if (this.lump.getUint8(8 + i) != this.lump.getUint8(24) || this.lump.getUint8(8 + e + i) != this.lump.getUint8(8 + e - 1)){
				offset = 0;
				break;
			}
		}
    }else offset = 0;
    
    if (offset){
        samples -= 32;
    }
    
    this.data = new Uint8Array(samples);
    this.data16 = new Int16Array(samples + 2048);

    for (var i = 0, p = 8 + offset; i < samples && p < this.lump.buffer.byteLength; i++, p++){
        this.data[i] = this.lump.getUint8(p);
        this.data16[i] = (this.data[i] - 128) << 8;
    }
}
SoundEffect.prototype.play = function(){
    var speaker = new Speaker({
        channels: 1,
        bitDepth: 16,
        sampleRate: this.sampleRate
    });
    
    speaker.write(new Buffer(this.data16.buffer));
    speaker.end();
};
SoundEffect.prototype.saveAsWAV = function(filename, callback){
    fs.writeFileSync(filename, new Buffer(WAV(this.data, {
        channels: 1,
        bitDepth: 8,
        sampleRate: this.sampleRate
    })));
    if (typeof callback == 'function') callback(null, this);
};
var emptyFn = function(){};
SoundEffect.prototype.saveAsMP3 = function(filename, callback){
    // create the Encoder instance
    var encoder = new lame.Encoder({
        // input
        channels: 1,        // 2 channels (left and right)
        bitDepth: 16,       // 16-bit samples
        sampleRate: this.sampleRate,  // 49,700 Hz sample rate

        // output
        bitRate: 128,
        outSampleRate: this.sampleRate,
        mode: lame.STEREO // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
    });
     
    var file = fs.createWriteStream(filename);
    encoder.pipe(file);
    
    encoder.write(new Buffer(this.data16.buffer));
    if (typeof callback == 'function') callback(null, this);
};
SoundEffect.prototype.saveAsOGG = function(filename, callback){
    var oe = new ogg.Encoder();
    var ve = new vorbis.Encoder({
        channels: 1,
        sampleRate: this.sampleRate
    });
    
    var b32 = new Float32Array(this.data16.length);
    for (var i = 0, j = 0; i < this.data16.length; i++, j += 1){
        b32[j] = this.data16[i] / 32768;
    }
    
    fs.writeFile(filename + '.tmp', new Buffer(b32.buffer), 'binary', function(err){
        if (err) throw err;
        
        var reader = fs.createReadStream(filename + '.tmp');
        var writer = fs.createWriteStream(filename);
        reader.pipe(ve);
        ve.pipe(oe.stream());
        oe.pipe(writer);
        
        var self = this;
        reader.on('end', function(){
            fs.unlink(filename + '.tmp', function(err){
                if (err) throw err;                
                //writer.end();
                if (typeof callback == 'function') callback(null, self);
            });
        });
    });
};

module.exports = SoundEffect;