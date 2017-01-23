# Nunjucks-cli
Simple Nunjucks CLI Wrapper and templates watcher, to generate static HTML files.
## Installation
    npm i -g nunjucks-cli
## Usage
    nunjucks <file|glob> [context] [options]
#### Basic examples
    nunjucks foo.tpl data.json
Compiles `foo.tpl` to `foo.html` with data from `data.json`.

    nunjucks **/*.tpl
Compiles all `.tpl` files (including subdirectories), except the ones starting by `_`.

## Options
### `--path <directory>`
`-p <directory>`

Path where the templates live. Default to the current working directory.
See https://mozilla.github.io/nunjucks/api.html#configure

### `--out <directory>`
`-o <directory>`

Output directory.

### `--watch`
`-w`

Allows to keep track of file changes and render accordingly (except files starting by `_`).

### `--unsafe`
`-u`

Allows use of .html as source files extension.

### `--options <file>`
`-O <file>`

Takes a json file as Nunjucks options. Defaults are :

    trimBlocks: true,
    lstripBlocks: true,
    noCache: true

See https://mozilla.github.io/nunjucks/api.html#configure

#### Advanced examples

    nunjucks foo.tpl -p src -o dist -O nj.json
Compiles `src/foo.tpl` to `dist/foo.html`, with `nj.json` as nunjucks environnement options.

    nunjucks *.tpl data.json -w -p src
Compiles all `.tpl` files (except ones starting with `_`) in the `src` folder to the current working directory, with `data.json` as metadata, and keeps running in the background for files changes.

