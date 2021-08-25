#! /usr/bin/env node
const { readdirSync, readFileSync, writeFileSync, statSync } = require('fs')
const { resolve, basename, dirname } = require('path')
const nunjucks = require('nunjucks')
const chokidar = require('chokidar')
const mkdirp = require('mkdirp')
const chalk = require('chalk')


const { argv } = require('yargs')
	.usage('Usage: nunjucks <file|glob> [context] [options]')
	.example('nunjucks foo.tpl data.json', 'Compile foo.tpl to foo.html')
	.example('nunjucks *.tpl -w -p src -o dist', 'Watch .tpl files in ./src, compile them to ./dist')
	.epilogue('For more information on Nunjucks: https://mozilla.github.io/nunjucks/')
	.help()
	.alias('help', 'h')
	.locale('en')
	.version(false)
	.option('path', {
		alias: 'p',
		string: true,
		requiresArg: true,
		nargs: 1,
		describe: 'Path where templates live, defaults to .',
		default: "."
	})
	.option('out', {
		alias: 'o',
		string: true,
		requiresArg: true,
		nargs: 1,
		describe: 'Output folder, defaults to rendered',
		required: true,
		default: "rendered"
	})
	.option('watch', {
		alias: 'w',
		boolean: true,
		describe: 'Watch files change, except files starting by "_"',
	})
	.option('options', {
		alias: 'O',
		string: true,
		requiresArg: true,
		nargs: 1,
		describe: 'Nunjucks options file',
	})
	.option('data', {
		alias: 'd',
		string: true,
		requiresArg: true,
		nargs: 1,
		describe: 'Nunjucks values file',
	})

const inputDir = resolve(process.cwd(), argv.path) || ''
const outputDir = argv.out

const context = argv.data ? JSON.parse(readFileSync(argv.data, 'utf8')) : {}
// Expose environment variables to render context
context.env = process.env

/** @type {nunjucks.ConfigureOptions} */
const nunjucksOptions = argv.options
	? JSON.parse(readFileSync(argv.options, 'utf8'))
	: {
		"tags": {
			"variableStart": "${{",
			"variableEnd": "}}"
		},
		"autoescape": false
	}

const nunjucksEnv = nunjucks.configure(inputDir, nunjucksOptions)

const render = (/** @type {string[]} */ files) => {
	for (const file of files) {
		const inputFile = resolve(file)
		const res = nunjucksEnv.render(inputFile, context)
		outputFile = resolve(outputDir, file)
		mkdirp.sync(dirname(outputFile))

		console.log(chalk.blue('Rendering: ' + file))
		writeFileSync(outputFile, res)
	}
}

const files = getFiles(argv.path)
render(files)

// Watcher
if (argv.watch) {
	const layouts = []
	const templates = []

	/** @type {chokidar.WatchOptions} */
	const watchOptions = { persistent: true, cwd: inputDir }
	const watcher = chokidar.watch(argv._[0], watchOptions)

	watcher.on('ready', () => console.log(chalk.gray('Watching templates...')))

	// Sort files to not render partials/layouts
	watcher.on('add', (file) => {
		if (basename(file).indexOf('_') === 0) layouts.push(file)
		else templates.push(file)
	})

	// if the file is a layout/partial, render all other files instead
	watcher.on('change', (file) => {
		if (layouts.indexOf(file) > -1) render(templates)
		else render([file])
	})
}

function getFiles (dir, files_){
    files_ = files_ || [];
    var files = readdirSync(dir);
    for (var i in files){
        var name = dir + '/' + files[i];
        if (statSync(name).isDirectory()){
            getFiles(name, files_);
        } else {
            files_.push(name);
        }
    }
    return files_;
}