const { spawnSync } = require('child_process')
const { readFileSync, readdirSync, unlinkSync, rmSync } = require('fs')
const { ok, deepStrictEqual } = require('assert')

process.env.NODE_ENV = 'development'

const src = `fixtures`
const dist = `rendered`
const cmd = `node main.js -p ${src} -d ${src}/data.json`

spawnSync(cmd, { shell: true, stdio: 'inherit' })

const renderedDir = dist+"/"+src
const filesCompiled = readdirSync(renderedDir)
deepStrictEqual(filesCompiled, ['_layout.tpl', 'data.json', 'first.tpl', 'second.tpl'], 'Templates not rendered correctly')

for (const file of filesCompiled) {
	const content = readFileSync(`${renderedDir}/${file}`, 'utf8')
	if (file.endsWith('.tpl')) {
		ok(content.startsWith('<!DOCTYPE html>'), 'Layout not extended')
	}

	if (file === 'first.tpl') {
		ok(content.includes('json,file'), 'Context not interpolated')
	}

	if (file === 'second.tpl') {
		ok(content.includes('development'), 'Env variable not passed')
	}

	unlinkSync(`${renderedDir}/${file}`)
}
rmSync("rendered",{ recursive: true, force: true })
