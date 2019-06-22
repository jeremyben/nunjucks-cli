const { spawnSync } = require('child_process')
const { readFileSync, readdirSync, unlinkSync, rmdirSync } = require('fs')
const { ok, deepStrictEqual } = require('assert')

process.env.NODE_ENV = 'development'

const src = `fixtures`
const dist = `fixtures/dist`
const context = `fixtures/data.json`
const glob = `*.tpl`
const cmd = `node main.js ${glob} ${context} -p ${src} -o ${dist}`

spawnSync(cmd, { shell: true, stdio: 'inherit' })

const filesCompiled = readdirSync(dist)
deepStrictEqual(filesCompiled, ['first.html', 'second.html'], 'Templates not rendered correctly')

for (const file of filesCompiled) {
	const content = readFileSync(`${dist}/${file}`, 'utf8')

	ok(content.startsWith('<!DOCTYPE html>'), 'Layout not extended')

	if (file === 'first.html') {
		ok(content.includes('json,file'), 'Context not interpolated')
	}

	if (file === 'second.html') {
		ok(content.includes('development'), 'Env variable not passed')
	}

	unlinkSync(`${dist}/${file}`)
}

rmdirSync(dist)
