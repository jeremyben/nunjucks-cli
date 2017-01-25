#! /usr/bin/env node

var fs = require('fs')
var path = require('path')
var nunjucks = require('nunjucks')
var chokidar = require('chokidar')
var mkdirp = require('mkdirp')
var chalk = require('chalk')
var glob = require("glob")

var argv = require('yargs')
  .usage('Usage: nunjucks <file|glob> [context] [options]')
  .example('nunjucks foo.tpl data.json', 'Compile foo.tpl to dist/foo.html')
  .example('nunjucks *.tpl -w -p src -o dist',
    'Watch .tpl files in src folder, compile them to dist folder')
  .demand(1)
  .option('path', {
    alias: 'p',
    string: true,
    requiresArg: true,
    nargs: 1,
    describe: 'Path where templates live'
  })
  .option('out', {
    alias: 'o',
    string: true,
    requiresArg: true,
    nargs: 1,
    describe: 'Output folder'
  })
  .option('watch',{
    alias: 'w',
    boolean: true,
    describe: 'Watch files change, except files starting by "_"'
  })
  .option('options', {
    alias: 'O',
    string: true,
    requiresArg: true,
    nargs: 1,
    describe: 'Nunjucks options file'
  })
  .option('unsafe', {
    alias: 'u',
    boolean: true,
    describe: 'Allow use of .html as source files'
  })
  .help()
  .alias('help', 'h')
  .epilogue('For more information on Nunjucks: https://mozilla.github.io/nunjucks/api.html')
  .argv

// Set defaults
var opts = {}
opts.dirIn = argv.path || ''
opts.dirOut = argv.out || null
opts.nunjucks = (argv.options) ? JSON.parse(fs.readFileSync(argv.options, 'utf8')) : {
  trimBlocks: true,
  lstripBlocks: true,
  noCache: true
}

// Set Nunjucks environnement
var env = nunjucks.configure(path.resolve(process.cwd(), opts.dirIn), opts.nunjucks)

// Parse second argument as data context if any
opts.context = (argv._[1]) ? JSON.parse(fs.readFileSync(argv._[1], 'utf8')) : {}

// Set glob options
opts.glob = {
  strict: true,
  cwd: path.resolve(process.cwd(), opts.dirIn),
  ignore: '**/_*.*',
  nonull: true
}

// Match glob pattern and render files accordingly
glob(argv._[0], opts.glob, function(err, files) {
  if (err) return console.error(chalk.red(err))
  renderAll(files, opts.context, opts.dirOut)
})

// Watcher
if (argv.watch) {

  opts.chokidar = {
    persistent: true,
    cwd: path.resolve(process.cwd(), opts.dirIn),
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 50
    }
  }
  var watcher = chokidar.watch(argv._[0], opts.chokidar)
  var layouts = []
  var templates = []

  watcher.on('ready', function() {
    console.log(chalk.gray('Watching templates...'))
  })

  // Sort files to not render partials/layouts
  watcher.on('add', function(file) {
    if (path.basename(file).indexOf('_') === 0) {
      layouts.push(file)
    } else {
      templates.push(file)
    }
  })

  // if the file is a layout/partial, render all other files instead
  watcher.on('change', function(file) {
    if (layouts.indexOf(file) > -1) {
      renderAll(templates, opts.context, opts.dirOut)
    } else {
      render(file, opts.context, opts.dirOut)
    }
  })

}

// Render one file
function render(file, data, outputDir) {
  if (!argv.unsafe && path.extname(file) === '.html')
    return console.error(chalk.red(file + ': To use .html as source files, add --unsafe/-u flag'))

  env.render(file, data, function(err, res) {
    if (err) return console.error(chalk.red(err))
    var outputFile = file.replace(/\.\w+$/, '') + '.html'
    if (outputDir) {
      outputFile = path.resolve(outputDir, outputFile)
      mkdirp.sync(path.dirname(outputFile))
    }
    console.log(chalk.blue('Rendering: ' + file))
    fs.writeFileSync(outputFile, res)
  })

}

// Render multiple files
function renderAll(files, data, outputDir) {

  for (var i = 0; i < files.length; i++) {
    render(files[i], data, outputDir)
  }

}
