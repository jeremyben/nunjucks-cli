#! /usr/bin/env node

const { readFileSync, writeFileSync } = require('fs')
const { resolve, basename, dirname } = require('path')
const nunjucks = require('nunjucks')
const chokidar = require('chokidar')
const glob = require('glob')
const http = require('http')
const serveHandler = require('serve-handler')
const mkdirp = require('mkdirp')
const chalk = require('chalk').default

const { argv } = require('yargs')
	.usage('Usage: nunjucks <file|glob> [context] [options]')
	.example('nunjucks foo.tpl data.json', 'Compile foo.tpl to foo.html')
	.example('nunjucks *.tpl -w -p src -o dist', 'Watch .tpl files in ./src, compile them to ./dist')
	.demandCommand(1, 'You must provide at least a file/glob path')
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
		describe: 'Path where templates live',
	})
	.option('out', {
		alias: 'o',
		string: true,
		requiresArg: true,
		nargs: 1,
		describe: 'Output folder',
	})
	.option('watch', {
		alias: 'w',
		boolean: true,
		describe: 'Watch files change, except files starting by "_"',
	})
	.option('serve', {
		boolean: true,
		describe: 'Local server',
	})
	.option('port', {
		number: true,
		default: 5000,
		describe: 'Local server port',
	})
	.option('extension', {
		alias: 'e',
		string: true,
		requiresArg: true,
		default: 'html',
		describe: 'Extension of the rendered files',
	})
	.option('options', {
		alias: 'O',
		string: true,
		requiresArg: true,
		nargs: 1,
		describe: 'Nunjucks options file',
	})

const inputDir = resolve(process.cwd(), argv.path) || ''
const outputDir = argv.out || ''

const context = argv._[1] ? JSON.parse(readFileSync(argv._[1], 'utf8')) : {}
// Expose environment variables to render context
context.env = process.env

/** @type {nunjucks.ConfigureOptions} */
const nunjucksOptions = argv.options
	? JSON.parse(readFileSync(argv.options, 'utf8'))
	: { trimBlocks: true, lstripBlocks: true, noCache: true }

const nunjucksEnv = nunjucks.configure(inputDir, nunjucksOptions)

const render = (/** @type {string[]} */ files) => {
	for (const file of files) {
		// No performance benefits in async rendering
		// https://mozilla.github.io/nunjucks/api.html#asynchronous-support
		const res = nunjucksEnv.render(file, context)

		let outputFile = file.replace(/\.\w+$/, `.${argv.extension}`)

		if (outputDir) {
			outputFile = resolve(outputDir, outputFile)
			mkdirp.sync(dirname(outputFile))
		}

		console.log(chalk.blue('Rendering: ' + file))
		writeFileSync(outputFile, res)
	}
}

/** @type {glob.IOptions} */
const globOptions = { strict: true, cwd: inputDir, ignore: '**/_*.*', nonull: true }

// Render the files given a glob pattern (except the ones starting with "_")
glob(argv._[0], globOptions, (err, files) => {
	if (err) return console.error(chalk.red(err))
	render(files)
})

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

	if (argv.serve) {
		const servePort = argv.port;
		const server = http.createServer((request, response) => {
			return serveHandler(request, response);
		})

		server.listen(servePort, () => {
			console.log(chalk.green('Serving on http://localhost:' + servePort))
		});
	}
}
