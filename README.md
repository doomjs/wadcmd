# WAD Commander

WAD Utility Tool

## Install

```npm install -g wadcmd```

## Exporting features

* Only IWAD files are supported
* Export WAD resources including:
	* ENDOOM
	* Flats
	* GENMIDI
	* Graphics
	* Maps
	* Music
	* Patches
	* Sound effects
	* Sprites
	* Textures
	* raw lumps
* Convert MUS to audio using OPL3 emulator (using [opl3](https://github.com/doomjs/opl3))
* Supported export formats for audio:
	* WAV/PCM audio
	* MP3/Lame (using [node-lame](https://github.com/TooTallNate/node-lame))
	* OGG/Vorbis (using [node-vorbis](https://github.com/TooTallNate/node-vorbis) and [node-ogg](https://github.com/TooTallNate/node-ogg))
* Export ENDOOM and GENMIDI in JSON
* Export maps in SVG format
* Export graphics in PNG format
* Supports glob file patterns
* Supports regular expression filtering

## Using from command line

```
WAD Commander v1.0.0                                             
Usage: wadcmd export <WAD> [options]                              
                                                                   
Resources:                                                         
  --endoom, -e        Export and show ENDOOM screen                
  --flats, -f         Export flats                                 
  --graphics, -g      Export graphics                              
  --maps, -m          Export maps (SVG)                            
  --music, -c         Export music                                 
  --patches, -p       Export patches                               
  --soundeffects, -x  Export sound effects                         
  --sprites, -s       Export sprites                               
  --textures, -t      Export textures                              
                                                                   
Audio formats:                                                     
  --mp3  Export in MP3 format                                      
  --ogg  Export in OGG format                                      
  --wav  Export in WAV format                                      
                                                                   
SVG options:                                                       
  --svg-zoom          Set SVG zoom level (defaults to 0.25)        
  --svg-padding       Set SVG padding (defaults to 50)             
  --svg-stroke-width  Set SVG stroke width (defaults to 5)         
                                                                   
Options:                                                           
  --all, -a       Export all resources                             
  --lump, -l      Export lump                                      
  --genmidi, -n   Export GENMIDI                                   
  --lumpinfo, -i  Export lump informations                         
  --playpal, -y   Use specific palette (defaults to -y0)           
  --filter        Lump filter pattern                              
  --output, -o    Output directory                                 
  --help, -h      Please don't leave, there's more demons to toast!
                                                                   
Examples:                                                          
  wadcmd export doom.wad -ao ./export                              
                                                                   
Copyright (c) 2016 IDDQD@doom.js                                   
```

## Coming soon

* Support PWADs
* Convert to Doom lump (all resources supported in export)
* Create IWAD and PWAD packages
* Support other games (Catacomb 3D, ShadowCaster, Wolfenstein 3D, games based on idtech1 engine like Heretic and Hexen)
* WAD Commander UI Tool