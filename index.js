#! /usr/bin/env node

var fs = require('fs')
var path = require('path')
var nunjucks = require('nunjucks')
var chokidar = require('chokidar')
var mkdirp = require('mkdirp')
var chalk = require('chalk')
var walkExt = require('./walk-ext')

var argv = require('yargs')
  .usage('Usage: nj <file|*.ext> [context] [options]')
  .example('nj foo.tpl data.json', 'Compile foo.tpl to dist/foo.html')
  .example('nj *.tpl -w -p src -o dist',
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
  .help()
  .alias('help', 'h')
  .epilogue('For more information on Nunjucks: https://mozilla.github.io/nunjucks/api.html')
  .argv

// Set defaults
var opts = {}
opts.dirIn = argv.path || null
opts.dirOut = argv.out || null
opts.nunjucks = (argv.options) ? JSON.parse(fs.readFileSync(argv.options, 'utf8')) : {
  trimBlocks: true,
  lstripBlocks: true,
  noCache: true
}

// Set Nunjucks environnement
var env = nunjucks.configure(opts.dirIn, opts.nunjucks)

// Parse second argument as data context if any
opts.context = (argv._[1]) ? JSON.parse(fs.readFileSync(argv._[1], 'utf8')) : {}

// Parse first argument
if (argv._[0].indexOf('*') === 0) {
  opts.fileExt = path.extname(argv._[0])
  opts.glob = './**/*' + opts.fileExt
  renderAll(walkExt(opts.dirIn, opts.fileExt), opts.context, opts.dirOut)
} else {
  opts.glob = argv._[0]
  render(argv._[0], opts.context, opts.dirOut)
}

// Watcher
if (argv.watch) {
  opts.chokidar = {
    persistent: true,
    cwd: opts.dirIn
  }
  var watcher = chokidar.watch(opts.glob, opts.chokidar)
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
  outputDir = outputDir || null
  env.render(file, data, function(err, res) {
    if (err) return console.error(chalk.red(err))
    var outputFile = file.replace(/\.\w+$/, '') + '.html'
    if (outputDir) {
      outputFile = path.resolve(outputDir, outputFile);
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
