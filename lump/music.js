var lame = require('lame');
var ogg = require('ogg');
var vorbis = require('opl3/utils/vorbis-encoder');
var Speaker = require('speaker');
var fs = require('fs');

var OPL3 = require('opl3').OPL3;
var MUS = require('opl3').format.MUS;
var Player = require('opl3').Player;

var WAV = require('../utils/wav').WAV;

function Music(name, lump, genmidi){
    this.name = name;
    this.lump = lump;
    this.genmidi = genmidi;
}
Music.prototype.createBuffer = function(callback, messageHandler){
    var self = this;
    var player = new Player(MUS, this.genmidi.instruments);
    player.load(this.lump, function(err, result){
        self.buffer = result;
        callback(err, result);
    }, messageHandler);
};
Music.prototype.play = function(callback, messageHandler){
    var fn = function(err, buffer){
        if (err){
            if (typeof callback == 'function') callback(err, null);
            else throw err;
        }
        
        var speaker = new Speaker({
            channels: 2,
            bitDepth: 16,
            sampleRate: 49700
        });
        
        speaker.write(new Buffer(buffer));
        speaker.end();
        
        if (typeof callback == 'function') callback(null, buffer);
    };
    
    if (!this.buffer) this.createBuffer(fn, messageHandler);
    else fn(null, this.buffer);
};
Music.prototype.saveAsWAV = function(filename, callback, messageHandler){
    var fn = function(err, buffer){
        if (err){
            if (typeof callback == 'function') callback(err, null);
            else throw err;
        }
        
        fs.writeFileSync(filename, new Buffer(WAV(buffer, {
            channels: 2,
            bitDepth: 16,
            sampleRate: 49700
        })));
        
        if (typeof callback == 'function') callback(null, buffer);
    };
    
    if (!this.buffer) this.createBuffer(fn, messageHandler);
    else fn(null, this.buffer);
};
Music.prototype.saveAsMP3 = function(filename, callback, messageHandler){
    var fn = function(err, buffer){
        if (err){
            if (typeof callback == 'function') callback(err, null);
            else throw err;
        }
        
        if (typeof messageHandler == 'function'){
            messageHandler({
                cmd: 'mp3',
                value: buffer
            });
        }
        
        fs.writeFileSync(filename + '.tmp', new Buffer(buffer), 'binary');
        var reader = fs.createReadStream(filename + '.tmp');
        
        // create the Encoder instance
        var encoder = new lame.Encoder({
            // input
            channels: 2,        // 2 channels (left and right)
            bitDepth: 16,       // 16-bit samples
            sampleRate: 49700,  // 49,700 Hz sample rate

            // output
            bitRate: 128,
            outSampleRate: 22050,
            mode: lame.MONO // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
        });
        
        var file = fs.createWriteStream(filename);
        reader.pipe(encoder);
        encoder.pipe(file);
        
        var pos = 0;
        reader.on('data', function(chunk){
            pos += chunk.length;
            if (typeof messageHandler == 'function'){
                messageHandler({
                    cmd: 'encode',
                    value: pos / buffer.length * 100
                });
            }
        });
        reader.on('end', function(){
            fs.unlinkSync(filename + '.tmp');
            file.end();
            encoder.end();
            if (typeof callback == 'function') callback(null, buffer);
        });
    };
    
    if (!this.buffer) this.createBuffer(fn, messageHandler);
    else fn(null, this.buffer);
};
Music.prototype.saveAsOGG = function(filename, callback, messageHandler){
    var fn = function(err, buffer){
        if (err){
            if (typeof callback == 'function') callback(err, null);
            else throw err;
        }
        
        if (typeof messageHandler == 'function'){
            messageHandler({
                cmd: 'ogg',
                value: buffer
            });
        }
        
        var mus = new Buffer(buffer);
        var b16 = new Int16Array(mus.buffer);
        var b32 = new Float32Array(b16.length);
        for (var i = 0; i < b16.length; i++){
            b32[i] = b16[i] / 32768 * 4; //TODO: normalize
        }
        
        fs.writeFile(filename + '.tmp', new Buffer(b32.buffer), 'binary', function(err){
            if (err) throw err;
            
            var reader = fs.createReadStream(filename + '.tmp');
            
            var oe = new ogg.Encoder();
            var ve = new vorbis.Encoder({
                sampleRate: 49700
            });
            
            var writer = fs.createWriteStream(filename);
            reader.pipe(ve);
            ve.pipe(oe.stream());
            oe.pipe(writer);
            
            var pos = 0;
            reader.on('data', function(chunk){
                pos += chunk.length;
                if (typeof messageHandler == 'function'){
                    messageHandler({
                        cmd: 'encode',
                        value: pos / b32.byteLength * 100
                    });
                }
            });
            reader.on('end', function(){
                fs.unlinkSync(filename + '.tmp');
                if (typeof callback == 'function') callback(null, buffer);
            });
        });
    };
    
    if (!this.buffer) this.createBuffer(fn, messageHandler);
    else fn(null, this.buffer);
};

module.exports = Music;