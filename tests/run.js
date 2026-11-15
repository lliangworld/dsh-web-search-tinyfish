/**
 * In-process test entry point.
 *
 * `node --test` spawns one child process per test file, which some confined
 * environments forbid. This runner imports every test file into this process
 * instead, where `node:test` executes them with its normal reporter.
 *
 *   node tests/run.js
 *
 * `node --test` remains fully supported when spawning is available.
 *
 * @module dsh-web-search-tinyfish/tests/run
 */

import { readdir } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const entries = (await readdir(here, { withFileTypes: true }))
	.filter((entry) => entry.isFile() && entry.name.endsWith('.test.js'))
	.map((entry) => entry.name)
	.sort()

for (const name of entries) {
	await import(pathToFileURL(path.join(here, name)).href)
}
