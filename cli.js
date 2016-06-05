#!/usr/bin/env node

var fs = require('fs');
var chalk = require('chalk');
var yargs = require('yargs');

var package = require('./package.json');
var helpText = require('./cli/help');
var terminalWidth = yargs.terminalWidth() - 1;

var argv = yargs.usage(chalk.cyan('\nWAD Commander v' + package.version) + '\n\u001b[97mUsage:\u001b[39m\u001b[49m wadcmd <command> <WAD> [options]')
	.command(require('./cli/export'))
	.alias('h', 'help')
	.epilog(chalk.cyan('Copyright (c) 2016 IDDQD@doom.js'))
	.wrap(terminalWidth)
	.describe('help', helpText[Math.floor(Math.random() * helpText.length)])
	.updateStrings({
		'Commands:': '\u001b[97mCommands:\u001b[39m\u001b[49m',
		'Options:': '\u001b[97mOptions:\u001b[39m\u001b[49m',
		'Examples:': '\u001b[97mExamples:\u001b[39m\u001b[49m'
	})
	.showHelpOnFail(false)
	.fail(function(msg, err){
		console.log(chalk.red(msg));
	})
	.argv;
  
//console.log(argv, yargs.getCommandInstance().getCommandHandlers(), yargs.getCommandInstance().getCommands(), argv._[0], !argv._[0], !(argv._[0] in yargs.getCommandInstance().getCommands()), argv.help);  
if (process.argv.length < 3 || (argv && argv.help)) yargs.showHelp();