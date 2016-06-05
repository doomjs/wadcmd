var chalk = require('chalk');
var ProgressBar = require('progress');
var yargs = require('yargs');
var Duration = require('duration');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var async = require('async');
var glob = require('glob');

var WAD = require('../wad').WAD;
var package = require('../package.json');
var helpText = require('./help');
var terminalWidth = yargs.terminalWidth() - 1;

module.exports.command = 'export [WAD] [options]';

module.exports.describe = 'Export WAD resources';

module.exports.builder = function(yargs){
    return yargs.option('all', {
        alias: 'a',
        describe: 'Export all resources'
    })
    .option('lump', {
        alias: 'l',
        describe: 'Export lump'
    })
    .option('endoom', {
        alias: 'e',
        describe: 'Export and show ENDOOM screen'
    })
    .option('flats', {
        alias: 'f',
        describe: 'Export flats'
    })
    .option('genmidi', {
        alias: 'n',
        describe: 'Export GENMIDI'
    })
    .option('graphics', {
        alias: 'g',
        describe: 'Export graphics'
    })
    .option('maps', {
        alias: 'm',
        describe: 'Export maps (SVG)'
    })
    .option('music', {
        alias: 'c',
        describe: 'Export music'
    })
    .option('patches', {
        alias: 'p',
        describe: 'Export patches'
    })
    .option('soundeffects', {
        alias: 'x',
        describe: 'Export sound effects'
    })
    .option('sprites', {
        alias: 's',
        describe: 'Export sprites'
    })
    .option('textures', {
        alias: 't',
        describe: 'Export textures'
    })
    .option('lumpinfo', {
        alias: 'i',
        describe: 'Export lump informations'
    })
    .option('playpal', {
        alias: 'y',
        describe: 'Use specific palette (defaults to -y0)'
    })
    .option('mp3', {
        describe: 'Export in MP3 format'
    })
    .option('ogg', {
        describe: 'Export in OGG format'
    })
    .option('wav', {
        describe: 'Export in WAV format'
    })
    .option('svg-zoom', {
        describe: 'Set SVG zoom level (defaults to 0.25)'
    })
    .option('svg-padding', {
        describe: 'Set SVG padding (defaults to 50)'
    })
    .option('svg-stroke-width', {
        describe: 'Set SVG stroke width (defaults to 5)'
    })
    .option('filter', {
        describe: 'Lump filter pattern'
    })
    .option('output', {
        alias: 'o',
        describe: 'Output directory'
    })
    .option('help', {
        alias: 'h',
        describe: helpText[Math.floor(Math.random() * helpText.length)]
    })
    .group(['endoom', 'flats', 'graphics', 'maps', 'music', 'patches', 'soundeffects', 'sprites', 'textures'], '\u001b[97mResources:\u001b[39m\u001b[49m')
    .group(['mp3', 'ogg', 'wav'], '\u001b[97mAudio formats:\u001b[39m\u001b[49m')
    .group(['svg-zoom', 'svg-padding', 'svg-stroke-width'], '\u001b[97mSVG options:\u001b[39m\u001b[49m')
    .usage(chalk.cyan('\nWAD Commander v' + package.version) + '\n\u001b[97mUsage:\u001b[39m\u001b[49m wadcmd export <WAD> [options]')
    .example('wadcmd export doom.wad -ao ./export')
    .epilog(chalk.cyan('Copyright (c) 2016 IDDQD@doom.js'))
    .showHelpOnFail(false)
	.fail(function(msg, err){
		console.log(chalk.red(msg));
	})
    .wrap(terminalWidth);
};

var tempDirs = [];
function exportWAD(argv, wadFilename, next){
    var isWav = true;
    var isMP3 = true;
    var isOGG = true;
    if (argv.wav || argv.mp3 || argv.ogg){
        isWav = argv.wav || false;
        isMP3 = argv.mp3 || false;
        isOGG = argv.ogg || false;
    }
    
    var filterPattern;
    if (argv.filter){
        if (argv.filter.indexOf('/') == 0){
            var tokens = argv.filter.split('/');
            filterPattern = new RegExp(tokens[1], tokens[2]);
        }else filterPattern = new RegExp(argv.filter, 'i');
    }
    
    var start = Date.now();
    var file = fs.readFileSync(wadFilename);
    var iwad = new WAD(file.buffer);
    iwad.loadResources();
    console.log('Resources loaded from', chalk.yellow(wadFilename));
    
    var exportDir = argv.output || path.join(process.cwd(), path.basename(wadFilename));
    mkdirp.sync(exportDir);
    console.log('Exporting to directory', chalk.yellow(exportDir));
    tempDirs.push(exportDir);
    
    var exportAny = false;
    if (argv.lumpinfo){
        exportAny = true;
        if (typeof argv.lumpinfo != 'string') argv.lumpinfo = 'lumpinfo.json';
        
        var lumpinfoFilename = path.join(exportDir, argv.lumpinfo);
        console.log('Exporting lump informations to', chalk.yellow(lumpinfoFilename));
        
        var lumpinfo = iwad.lumps.map(function(lump){
            return {
                name: lump.name,
                type: lump.type,
                offset: lump.filepos,
                size: lump.size
            };
        });
        
        if (argv.lumpinfo.slice(-5).toLowerCase() == '.json'){
            fs.writeFileSync(lumpinfoFilename, JSON.stringify(lumpinfo, null, 4));
        }else if (argv.lumpinfo.slice(-4).toLowerCase() == '.csv'){
            require('csv-stringify')(lumpinfo, function(err, csv){
                if (err) return console.log(chalk.red(err));
                fs.writeFileSync(lumpinfoFilename, csv);
            });
        }
    }
    
    var exportGraphics = function(callback){
        if (argv.graphics){
            exportAny = true;
            var outputDir = exportDir;
            if (typeof argv.graphics == 'string') outputDir = path.join(outputDir, argv.graphics);
            mkdirp.sync(outputDir);
            var exportFiles = Object.keys(iwad.graphics);
            if (filterPattern){
                exportFiles = exportFiles.filter(function(name){
                    return filterPattern.test(name);
                });
            }
            
            var bar = new ProgressBar('Exporting graphics to ' + chalk.yellow(outputDir) + ' [:bar] :percent :etas', {
                width: 20,
                total: exportFiles.length
            });
            
            var fn = function(){
                if (exportFiles.length > 0){
                    exportAny = true;
                    var name = exportFiles.shift();
                    var filename = path.join(outputDir, name + '.png');
                    try{
                        iwad.graphics[name].saveAsPNG(filename, iwad.playpal[argv.playpal || 0], function(){
                            bar.tick();
                            fn();
                        });
                    }catch(err){
                        console.log(chalk.red('Error exporting graphic from lump ' + name + '!'));
                        bar.tick();
                        fn();
                    }
                }else callback();
            }
            
            fn();
        }else callback();
    };
    
    var exportPatches = function(callback){
        if (argv.patches){
            exportAny = true;
            var outputDir = exportDir;
            if (typeof argv.patches == 'string') outputDir = path.join(outputDir, argv.patches);
            mkdirp.sync(outputDir);
            var exportFiles = Object.keys(iwad.patches);
            if (filterPattern){
                exportFiles = exportFiles.filter(function(name){
                    return filterPattern.test(name);
                });
            }
            
            var bar = new ProgressBar('Exporting patches to ' + chalk.yellow(outputDir) + ' [:bar] :percent :etas', {
                width: 20,
                total: exportFiles.length
            });
            
            var fn = function(){
                if (exportFiles.length > 0){
                    exportAny = true;
                    var name = exportFiles.shift();
                    var filename = path.join(outputDir, name + '.png');
                    iwad.patches[name].saveAsPNG(filename, iwad.playpal[argv.playpal || 0], function(){
                        bar.tick();
                        fn();
                    });
                }else callback();
            }
            
            fn();
        }else callback();
    };
    
    var exportTextures = function(callback){
        if (argv.textures){
            exportAny = true;
            var outputDir = exportDir;
            if (typeof argv.textures == 'string') outputDir = path.join(outputDir, argv.textures);
            mkdirp.sync(outputDir);
            var exportFiles = Object.keys(iwad.textures);
            if (filterPattern){
                exportFiles = exportFiles.filter(function(name){
                    return filterPattern.test(name);
                });
            }
            
            var bar = new ProgressBar('Exporting textures to ' + chalk.yellow(outputDir) + ' [:bar] :percent :etas', {
                width: 20,
                total: exportFiles.length
            });
            
            var fn = function(){
                if (exportFiles.length > 0){
                    exportAny = true;
                    var name = exportFiles.shift();
                    var filename = path.join(outputDir, name + '.png');
                    iwad.textures[name].saveAsPNG(filename, iwad.playpal[argv.playpal || 0], function(){
                        bar.tick();
                        fn();
                    });
                }else callback();
            }
            
            fn();
        }else callback();
    };
    
    var exportSprites = function(callback){
        if (argv.sprites){
            exportAny = true;
            var outputDir = exportDir;
            if (typeof argv.sprites == 'string') outputDir = path.join(outputDir, argv.sprites);
            mkdirp.sync(outputDir);
            var exportFiles = Object.keys(iwad.sprites);
            if (filterPattern){
                exportFiles = exportFiles.filter(function(name){
                    return filterPattern.test(name);
                });
            }
            
            var bar = new ProgressBar('Exporting sprites to ' + chalk.yellow(outputDir) + ' [:bar] :percent :etas', {
                width: 20,
                total: exportFiles.length
            });
            
            var fn = function(){
                if (exportFiles.length > 0){
                    exportAny = true;
                    var name = exportFiles.shift();
                    var filename = path.join(outputDir, name.replace('\\', '^') + '.png');
                    iwad.sprites[name].saveAsPNG(filename, iwad.playpal[argv.playpal || 0], function(){
                        bar.tick();
                        fn();
                    });
                }else callback();
            }
            
            fn();
        }else callback();
    };
    
    var exportFlats = function(callback){
        if (argv.flats){
            exportAny = true;
            var outputDir = exportDir;
            if (typeof argv.flats == 'string') outputDir = path.join(outputDir, argv.flats);
            mkdirp.sync(outputDir);
            var exportFiles = Object.keys(iwad.flats);
            if (filterPattern){
                exportFiles = exportFiles.filter(function(name){
                    return filterPattern.test(name);
                });
            }
            
            var bar = new ProgressBar('Exporting flats to ' + chalk.yellow(outputDir) + ' [:bar] :percent :etas', {
                width: 20,
                total: exportFiles.length
            });
            
            var fn = function(){
                if (exportFiles.length > 0){
                    exportAny = true;
                    var name = exportFiles.shift();
                    var filename = path.join(outputDir, name + '.png');
                    iwad.flats[name].saveAsPNG(filename, iwad.playpal[argv.playpal || 0], function(){
                        bar.tick();
                        fn();
                    });
                }else callback();
            }
            
            fn();
        }else callback();
    };
    
    var exportSoundeffects = function(callback){
        if (argv.soundeffects){
            exportAny = true;
            var outputDir = exportDir;
            if (typeof argv.soundeffects == 'string') outputDir = path.join(outputDir, argv.soundeffects);
            mkdirp.sync(outputDir);
            var exportFiles = Object.keys(iwad.soundeffects);
            if (filterPattern){
                exportFiles = exportFiles.filter(function(name){
                    return filterPattern.test(name);
                });
            }
            
            var bar = new ProgressBar('Exporting soundeffects to ' + chalk.yellow(outputDir) + ' [:bar] :percent :etas', {
                width: 20,
                total: exportFiles.length
            });
            
            var fn = function(){
                if (exportFiles.length > 0){
                    exportAny = true;
                    var name = exportFiles.shift();
                    var filename = path.join(outputDir, name);
                    
                    async.series([function(callback){
                        if (isWav) iwad.soundeffects[name].saveAsWAV(filename + '.wav', callback);
                        else callback();
                    }, function(callback){
                        if (isMP3) iwad.soundeffects[name].saveAsMP3(filename + '.mp3', callback);
                        else callback();
                    }, function(callback){
                        if (isOGG) iwad.soundeffects[name].saveAsOGG(filename + '.ogg', callback);
                        else callback();
                    }], function(){
                        bar.tick();
                        fn();
                    });
                }else callback();
            }
            
            fn();
        }else callback();
    };
    
    var exportMusic = function(callback){
        if (argv.music){
            exportAny = true;
            var outputDir = exportDir;
            if (typeof argv.music == 'string') outputDir = path.join(outputDir, argv.music);
            mkdirp.sync(outputDir);
            var exportFiles = Object.keys(iwad.music);
            if (filterPattern){
                exportFiles = exportFiles.filter(function(name){
                    return filterPattern.test(name);
                });
            }
            
            var fn = function(){
                if (exportFiles.length > 0){
                    exportAny = true;
                    var name = exportFiles.shift();
                    var filename = path.join(outputDir, name);
                    
                    var bar = new ProgressBar('Exporting music ' + chalk.yellow(name) + ' to ' + chalk.yellow(outputDir) + ' [:bar] :percent :etas', {
                        width: 20,
                        total: 100
                    });
                    
                    iwad.music[name].createBuffer(function(){
                        async.series([
                            function(callback){
                                if (isWav) iwad.music[name].saveAsWAV(filename + '.wav', callback);
                                else callback();
                            },
                            function(callback){
                                if (isMP3){
                                    var mp3bar = new ProgressBar('Encoding ' + chalk.yellow(name) + ' to MP3/Lame [:bar] :percent :etas', {
                                        width: 20,
                                        total: 100
                                    });
                                    iwad.music[name].saveAsMP3(filename + '.mp3', callback, function(msg){
                                        if (msg.cmd == 'encode') mp3bar.update(msg.value / 100);
                                    });
                                }else callback();
                            },
                            function(callback){
                                if (isOGG){
                                    var oggbar = new ProgressBar('Encoding ' + chalk.yellow(name) + ' to OGG/Vorbis [:bar] :percent :etas', {
                                        width: 20,
                                        total: 100
                                    });
                                    iwad.music[name].saveAsOGG(filename + '.ogg', callback, function(msg){
                                        if (msg.cmd == 'encode') oggbar.update(msg.value / 100);
                                    });
                                }else callback();
                            }
                        ], function(){
                            iwad.music[name].buffer = null;
                            process.nextTick(fn);
                        });
                    }, function(msg){
                        if (msg.cmd == 'progress') bar.update(msg.value / 100);
                    });
                }else callback();
            }
            
            fn();
        }else callback();
    };
    
    var exportMaps = function(callback){
        if (argv.maps){
            exportAny = true;
            var outputDir = exportDir;
            if (typeof argv.maps == 'string') outputDir = path.join(outputDir, argv.maps);
            mkdirp.sync(outputDir);
            var exportFiles = Object.keys(iwad.maps);
            if (filterPattern){
                exportFiles = exportFiles.filter(function(name){
                    return filterPattern.test(name);
                });
            }
            
            var bar = new ProgressBar('Exporting maps to ' + chalk.yellow(outputDir) + ' [:bar] :percent :etas', {
                width: 20,
                total: exportFiles.length
            });
            
            async.series(exportFiles.map(function(it){
                return function(callback){
                    var filename = path.join(outputDir, it);
                    if (argv['svg-zoom']) iwad.maps[it].svgZoom = +argv['svg-zoom'];
                    if (argv['svg-padding']) iwad.maps[it].svgPadding = +argv['svg-padding'];
                    if (argv['svg-stroke-width']) iwad.maps[it].svgStrokeWidth = +argv['svg-stroke-width'];
                    iwad.maps[it].saveAsSVG(filename + '.svg', function(){
                        bar.tick();
                        callback();
                    });
                };
            }), callback);
        }else callback();
    };
    
    var exportResources = function(callback){
        async.series([
            exportFlats,
            exportGraphics,
            exportMaps,
            exportMusic,
            exportPatches,
            exportSoundeffects,
            exportSprites,
            exportTextures
        ], callback);
    };
    
    var exportLumps = function(callback){
        if (argv.lump){
            if (!Array.isArray(argv.lump)) argv.lump = [argv.lump];
            
            var argvLump = argv.lump.slice();
            argv.lump = [];
            argvLump.forEach(function(lump){
                if (lump.indexOf('/') == 0 && lump.lastIndexOf('/') == lump.length - 1){
                    var tokens = lump.split('/');
                    var pattern = new RegExp(tokens[1], tokens[2]);
                    var lumps = iwad.lumps.forEach(function(lump){
                        if (pattern.test(lump.name) && argv.lump.filter(function(it){
                            return it.toLowerCase() == lump.name.toLowerCase();
                        }).length == 0){
                            argv.lump.push(lump.name.toLowerCase());
                        }
                    });
                }else argv.lump.push(lump.toLowerCase());
            });
            
            argv.lump.forEach(function(name){
                name = name.toUpperCase();
                var lump = iwad.lumps.byName(name);
                
                if (lump){
                    exportAny = true;
                    var lumpFilename = path.join(exportDir, name);
                    console.log('Exporting lump', chalk.yellow(name), 'to', chalk.yellow(lumpFilename));
                    if (lump.size > 0){
                        fs.writeFileSync(lumpFilename, new Buffer(lump.lump.buffer), 'binary');
                    }else fs.createWriteStream(lumpFilename).close();
                }else{
                    console.log('Lump not found', chalk.red(name));
                }
            });
            
            callback();
        }else callback();
    }
    
    var exportGenmidi = function(callback){
        if (argv.genmidi){
            exportAny = true;
            var outputDir = exportDir;
            if (typeof argv.genmidi == 'string') outputDir = path.join(outputDir, argv.genmidi);
            var genmidiFilename = path.join(outputDir, 'genmidi.json');
            console.log('Exporting GENMIDI to', chalk.yellow(genmidiFilename));
            
            fs.writeFileSync(genmidiFilename, JSON.stringify(iwad.genmidi, null, 4), 'utf8');
        }
        
        callback();
    };
    
    if (argv.endoom){
        exportAny = true;
        var endoom = iwad.renderANSI(iwad.lumps.byName('ENDOOM'));
        console.log(endoom);
        
        var outputDir = exportDir;
        if (typeof argv.endoom == 'string') outputDir = path.join(outputDir, argv.endoom);
        fs.writeFileSync(path.join(outputDir, 'endoom'), JSON.stringify(endoom), 'utf8');
    }
    
    exportLumps(function(){
        exportGenmidi(function(){
            exportResources(function(){
                if (!exportAny) console.log(chalk.red('No resources exported!'));
                else console.log('Export completed', chalk.green('ok'), 'in', chalk.green(Duration(new Date(start), new Date(Date.now())).toString(1)));
                next();
            });
        });
    });
}

module.exports.handler = function(argv){
    if (argv.help || !argv.WAD){
        argv.help = false;
        return yargs.showHelp();
    }
    
    if (argv.all){
        console.log('Exporting all resources...');
        argv.flats = argv.flats || 'flats';
        argv.genmidi = argv.genmidi || true;
        argv.graphics = argv.graphics || 'graphics';
        argv.maps = argv.maps || 'maps';
        argv.music = argv.music || 'music';
        argv.patches = argv.patches || 'patches';
        argv.soundeffects = argv.soundeffects || 'soundeffects';
        argv.sprites = argv.sprites || 'sprites';
        argv.textures = argv.textures || 'textures';
        argv.lumpinfo = argv.lumpinfo || true;
    }
    
    if (argv.flats && typeof argv.flats != 'string') argv.flats = 'flats';
    if (argv.graphics && typeof argv.graphics != 'string') argv.graphics = 'graphics';
    if (argv.maps && typeof argv.maps != 'string') argv.maps = 'maps';
    if (argv.music && typeof argv.music != 'string') argv.music = 'music';
    if (argv.patches && typeof argv.patches != 'string') argv.patches = 'patches';
    if (argv.soundeffects && typeof argv.soundeffects != 'string') argv.soundeffects = 'soundeffects';
    if (argv.sprites && typeof argv.sprites != 'string') argv.sprites = 'sprites';
    if (argv.textures && typeof argv.textures != 'string') argv.textures = 'textures';
    
    process.on('SIGINT', function(){
        async.series(tempDirs.map(function(dir){
            return function(next){
                glob(path.join(dir, '**/*.tmp'), function(err, files){
                    async.parallel(files.map(function(filename){
                        return function(next){
                             fs.unlink(filename, next);
                        };
                    }), next);
                });
            };
        }), function(){
            process.exit(1);
        });
    });
    
    console.log(chalk.cyan('\nWAD Commander v' + package.version));
    glob(argv.WAD, function(err, files){
        if (files.length < 1){
            console.log(chalk.red('Input file not found!'));
            process.exit(1);
        }
        
        async.series(files.map(function(filename){
            return function(next){
                exportWAD(argv, filename, next);
            };
        }));
    });
};