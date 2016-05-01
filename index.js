#! /usr/bin/env node

var fs = require('fs')
var path = require('path')
var nunjucks = require('nunjucks')
var chokidar = require('chokidar')
var mkdirp = require('mkdirp')
var chalk = require('chalk')
var yargs = require('yargs')
  .usage('Usage: nj [file] [context] [options]')
  .example('nj foo.tpl -o dist', 'Render foo.tpl to dist/foo.html')
  .example('nj -w -p src -o dist -j data.json',
    'Watch .tpl files in src folder, render them to dist folder, with the context of data.json')
  .option('watch',{
    alias: 'w',
    boolean: true,
    skipValidation: true,
    describe: 'Watch and render .tpl files, except the ones starting by "_"'
  })
  .option('path', {
    alias: 'p',
    string: true,
    requiresArg: true,
    nargs: 1,
    describe: 'Templates path'
  })
  .option('out', {
    alias: 'o',
    string: true,
    requiresArg: true,
    nargs: 1,
    describe: 'Destination folder'
  })
  .option('json', {
    alias: 'j',
    string: true,
    requiresArg: true,
    nargs: 1,
    describe: 'Load JSON context file'
  })
  .option('options', {
    alias: 'O',
    string: true,
    requiresArg: true,
    nargs: 1,
    describe: 'Nunjucks option file'
  })
  .help('h')
  .alias('h', 'help')
  .epilogue('For more information on Nunjucks: https://mozilla.github.io/nunjucks/api.html')
  
var argv = yargs.argv
var opts = {}
opts.dirIn = argv.path || null
opts.dirOut = argv.out || null
opts.nunjucks = argv.options || {
  trimBlocks: true,
  lstripBlocks: true,
  noCache: true
}
var env = nunjucks.configure(opts.dirIn, opts.nunjucks)
var context = (argv.j) ? JSON.parse(fs.readFileSync(argv.j, 'utf8')) : (argv._[1]) ? JSON.parse(fs.readFileSync(argv._[1], 'utf8')) : {}

if (!argv._[0] && !argv.watch) yargs.showHelp("log")
if (argv._[0]) render(argv._[0], context)
if (argv.watch) {
  opts.glob = './**/*.tpl'
  opts.chokidar = {
    persistent: true,
    cwd: opts.dirIn
  }
  var watcher = chokidar.watch(opts.glob, opts.chokidar)
  var layouts = []
  var files = []

  watcher.on('ready', function() {
    console.log(chalk.gray('Watching templates...'))
  })

  watcher.on('add', function(file, details) {
    if (path.basename(file).indexOf('_') === 0) {
      layouts.push(file)
    } else {
      files.push(file)
    }
  })

  watcher.on('change', function(file) {
    if (layouts.indexOf(file) > -1) {
      console.log(chalk.cyan('Rendering: ' + files))
      renderAll(files, context)
    } else {
      console.log(chalk.blue('Rendering: ' + file))
      render(file, context)
    }
  })
}

function render(file, data) {
  env.render(file, data, function(err, res) {
    if (err) return console.error(chalk.red(err))
    var output = file.replace(/\.\w+$/, '') + '.html'
    if (opts.dirOut) {
      output = opts.dirOut + '\\' + output
      mkdirp.sync(path.dirname(output))
    }
    fs.writeFileSync(output, res)
  })
}

function renderAll(files, data) {
  for (var i = 0; i < files.length; i++) {
    render(files[i], data)
  }
}
