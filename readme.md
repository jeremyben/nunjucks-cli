# Nunjucks-cli
Simple Nunjucks CLI Wrapper and templates watcher, to generate static HTML files.
## Usage
    nunjucks [file] [context] [options]
#### Basic example with one file
    nunjucks foo.tpl bar.json
Compiles foo.tpl to foo.html with data from bar.json.

## Options
### `--path <directory>`
`-p <directory>`

Path where the templates live. Default to the current working directory.
See https://mozilla.github.io/nunjucks/api.html#configure

### `--out <directory>`
`-o <directory>`

Output directory.

### `--options <file>`
`-O <file>`

Takes a json file as Nunjucks options.
See https://mozilla.github.io/nunjucks/api.html#configure

#### Advanced example with one file

    nunjucks foo.tpl -p ./src -o ./dist -O nj.json
Compiles src/foo.tpl to dist/foo.html, with nj.json as nunjucks environnement options.

## Watcher
### `--watch` / `-w`
Run a watcher in the background which renders .tpl files.

`nunjucks -w` : Watch and render .tpl files in the current working directory, except the ones starting by "_".
