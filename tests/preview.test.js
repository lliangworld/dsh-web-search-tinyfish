import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The plugin's detail image.
 *
 * The image is rendered from `docs/preview-source.html` by
 * `docs/render-preview.py`, which cannot run in this suite — it needs Pillow.
 * What is asserted here is what the plugin ships: that the images exist at the
 * size the detail page reserves, that they are far inside the Host's per-image
 * budget, and that both localized detail documents name a file that is really
 * there and is really packaged. A detail document naming a missing image is
 * the one failure mode the user sees as an empty slot under the description.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const DOCS = path.join(ROOT, 'docs')

/** The Host's own per-image ceiling; see `pluginManager.detailImageMaxBytes`. */
const HOST_IMAGE_LIMIT = 5 * 1024 * 1024

/** What this plugin holds itself to, an order of magnitude inside that. */
const OWN_IMAGE_BUDGET = 200 * 1024

/** The detail canvas size the plugin detail page reserves. */
const CANVAS = { width: 640, height: 300 }

/** The plugin's own detail documents, each with the image it must name. */
const DOCUMENTS = [
	['DETAIL.md', 'preview.png'],
	['DETAIL.zh.md', 'preview.zh.png'],
]

/**
 * The PNG's IHDR, read straight from the file.
 *
 * @param {string} file - the image to read.
 * @returns {{ width: number, height: number }} the pixel size.
 */
function pngSize(file) {
	const bytes = readFileSync(file)
	// The signature is 8 bytes, then a 4-byte length, then the `IHDR` tag.
	assert.equal(bytes.subarray(1, 4).toString('latin1'), 'PNG', `${file} is not a PNG`)
	assert.equal(bytes.subarray(12, 16).toString('latin1'), 'IHDR', `${file} has no IHDR`)
	return {
		width: bytes.readUInt32BE(16),
		height: bytes.readUInt32BE(20),
	}
}

/**
 * Every image destination a document writes.
 *
 * @param {string} document - the detail document's text.
 * @returns {string[]} the destinations its images name, relative to the document.
 */
function imageRefs(document) {
	const refs = []
	const pattern = /!\[[^\]]*\]\(([^)]+)\)/g
	let match
	while ((match = pattern.exec(document)) !== null) refs.push(match[1].trim())
	return refs
}

test('each detail image is a 640x300 PNG inside the budget', () => {
	for (const image of ['preview.png', 'preview.zh.png']) {
		const file = path.join(DOCS, image)
		assert.ok(existsSync(file), `${image} is missing from the bundle`)
		assert.deepEqual(pngSize(file), CANVAS, `${image} is not the detail canvas size`)
		assert.ok(statSync(file).size < OWN_IMAGE_BUDGET, `${image} exceeds the plugin budget`)
		assert.ok(statSync(file).size < HOST_IMAGE_LIMIT, `${image} exceeds the Host limit`)
	}
})

test('each detail document names exactly one image, and it ships', () => {
	// A missing image is the failure the user sees: an empty slot where the
	// feature picture should be. Both documents are checked separately, because
	// the localized one names its own variant.
	for (const [document, expected] of DOCUMENTS) {
		const file = path.join(DOCS, document)
		assert.ok(existsSync(file), `${document} is missing`)
		const refs = imageRefs(readFileSync(file, 'utf8'))
		assert.equal(refs.length, 1, `${document} should name exactly one image`)
		assert.equal(refs[0], expected, `${document} names the wrong image`)
		assert.ok(existsSync(path.join(DOCS, refs[0])), `${document} names ${refs[0]}, which is not shipped`)
	}
})

test('the detail document is one image line, and nothing else', () => {
	// The plugin detail page renders `meta.detail` verbatim. The documented
	// shape is exactly one image line; prose there is what the README is for.
	for (const document of DOCUMENTS.map(([name]) => name)) {
		const text = readFileSync(path.join(DOCS, document), 'utf8').trim()
		const lines = text.split('\n')
		assert.equal(lines.length, 1, `${document} must hold exactly one line, found ${lines.length}`)
		assert.match(lines[0], /^!\[[^\]]+\]\(preview(\.zh)?\.png\)$/, `${document} is not one image line`)
	}
})

test('the detail document has alt text, not an empty description', () => {
	// The alt text is the only thing a screen reader or a failed load can show,
	// so it has to say what the image is rather than being empty.
	for (const document of DOCUMENTS.map(([name]) => name)) {
		const text = readFileSync(path.join(DOCS, document), 'utf8')
		const match = /!\[([^\]]*)\]/.exec(text)
		assert.ok(match !== null, `${document} has no image`)
		assert.ok(match[1].length > 10, `${document} has no usable alt text`)
	}
})

test('every locale declares its own detail document', () => {
	// A locale that omits `meta.detail` falls back through the language chain to
	// the English document, so a Chinese reader would see English artwork.
	// Both are declared, so each language gets its own variant.
	for (const [locale, expected] of [['en', 'docs/DETAIL.md'], ['zh', 'docs/DETAIL.zh.md']]) {
		const file = path.join(ROOT, 'locale', `${locale}.json`)
		const meta = JSON.parse(readFileSync(file, 'utf8')).meta
		assert.equal(typeof meta.title, 'string', `${locale}.json has no title`)
		assert.ok(meta.description.length > 40, `${locale}.json has no description`)
		assert.equal(meta.detail, expected, `${locale}.json does not declare ${expected}`)
		// A declared document must exist: a missing file is an error on the
		// detail page, not a README fallback.
		assert.ok(existsSync(path.join(ROOT, meta.detail)), `${locale}.json names ${meta.detail}, which is not shipped`)
	}
})

test('the manifest packages the docs directory with the detail documents', () => {
	// The plugin is installed from git as a packed copy: `files` decides what
	// ships. A `docs` entry that only listed the package references would leave
	// the detail documents and their images behind, and the detail page would
	// show a failure instead of the image.
	const manifest = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
	assert.ok(manifest.files.includes('docs'), 'package.json does not ship the docs directory')
	for (const file of ['DETAIL.md', 'DETAIL.zh.md', 'preview.png', 'preview.zh.png']) {
		assert.ok(existsSync(path.join(DOCS, file)), `docs/${file} is not shipped`)
	}
})

test('the render source carries a scene with both languages', () => {
	// The scene is the contract between the page that previews the artwork and
	// the script that renders it: a language missing from it would render an
	// image with an empty label, and nothing here could catch that.
	const html = readFileSync(path.join(DOCS, 'preview-source.html'), 'utf8')
	const match = /<script[^>]*id="scene"[^>]*>([\s\S]*?)<\/script>/.exec(html)
	assert.ok(match !== null, 'preview-source.html carries no scene')
	const scene = JSON.parse(match[1])
	assert.equal(scene.width, CANVAS.width)
	assert.equal(scene.height, CANVAS.height)
	for (const lang of ['en', 'zh']) {
		assert.ok(scene.text[lang] !== undefined, `the scene has no ${lang} text`)
		// Both languages must describe the two capabilities and the provider.
		assert.ok(scene.text[lang].searchTitle, `${lang} has no web_search title`)
		assert.ok(scene.text[lang].fetchTitle, `${lang} has no web_fetch title`)
		assert.ok(scene.text[lang].providerTitle, `${lang} has no provider title`)
	}
	// The scene must still describe the three parts of the product.
	assert.ok(scene.search !== undefined, 'the scene has no web_search card')
	assert.ok(scene.fetch !== undefined, 'the scene has no web_fetch card')
	assert.ok(scene.provider !== undefined, 'the scene has no provider card')
})

test('the artwork names both hosts, and says there is no keyless fallback', () => {
	// The two things that separate this provider from its sibling: TinyFish
	// serves search and fetch from different hosts, and both endpoints require
	// X-API-Key. A scene that drew one host or promised a keyless fallback would
	// describe a provider that does not exist.
	const html = readFileSync(path.join(DOCS, 'preview-source.html'), 'utf8')
	const match = /<script[^>]*id="scene"[^>]*>([\s\S]*?)<\/script>/.exec(html)
	const scene = JSON.parse(match[1])
	for (const lang of ['en', 'zh']) {
		const text = scene.text[lang]
		assert.match(text.searchHost, /api\.search\.tinyfish\.ai/, `${lang} names no search host`)
		assert.match(text.fetchHost, /api\.fetch\.tinyfish\.ai/, `${lang} names no fetch host`)
		assert.notEqual(text.searchHost, text.fetchHost, `${lang} uses one host for both capabilities`)
		assert.match(text.providerNote, /X-API-Key/i, `${lang} does not name the credential`)
		assert.match(text.providerNote, /no keyless|无免密钥/, `${lang} claims a keyless fallback`)
	}
	// And the host lines must be drawn, not merely described in the prose.
	assert.ok(scene.search.hostX !== undefined, 'the scene has no search host line')
	assert.ok(scene.fetch.hostX !== undefined, 'the scene has no fetch host line')
	assert.ok(scene.search.hostY !== undefined && scene.fetch.hostY !== undefined,
		'the host lines have no row of their own')
})

/** The minimum clear gap between two stacked rows, in canvas units. */
const ROW_GAP = 3

/**
 * One row's vertical extent, in canvas units.
 *
 * A text row anchored at `y` in a font of `size` occupies `size` units below
 * it. This is the conservative em box — wider than the ink — which is exactly
 * what a stacked layout has to respect.
 *
 * @param {string} label - what the row is, for the failure message.
 * @param {number} top - the row's top edge.
 * @param {number} bottom - the row's bottom edge.
 * @returns {{ label: string, top: number, bottom: number }} the row.
 */
function row(label, top, bottom) {
	return { label, top, bottom }
}

/**
 * The rows of one capability card, split by how they relate.
 *
 * `stacked` rows sit one below the next, so each must clear the one above it.
 * `inner` rows sit inside a container — the markdown body's rect — so they must
 * clear each other and stay within it. The container itself is the first entry
 * of `inner` and also a member of `stacked`, because it is one row in the
 * card's own stack.
 *
 * @param {object} card - the scene's `search` or `fetch` card.
 * @param {string} kind - `search` or `fetch`, choosing which rows it holds.
 * @returns {{ stacked: object[], inner: object[] }} the rows.
 */
function cardRows(card, kind) {
	const stacked = [row('accent bar', card.y, card.y + card.bar.h)]
	stacked.push(row('title', card.titleY, card.titleY + 13))
	if (card.hostY !== undefined) stacked.push(row('host line', card.hostY, card.hostY + 10))
	const pill = kind === 'search' ? card.query : card.url
	stacked.push(row(kind === 'search' ? 'query' : 'url', pill.y, pill.y + pill.h))
	const inner = []
	if (kind === 'search') {
		card.results.forEach((result, index) => {
			stacked.push(row(`result ${index + 1} title`, result.titleY, result.titleY + 10.5))
			stacked.push(row(`result ${index + 1} snippet`, result.snippetY, result.snippetY + 9.5))
		})
	} else {
		const body = row('body', card.body.y, card.body.y + card.body.h)
		stacked.push(body)
		inner.push(body)
		inner.push(row('markdown title', card.mdTitleY, card.mdTitleY + 11.5))
		inner.push(row('markdown body', card.bodyY, card.bodyY + 10.5))
		inner.push(row('endpoints', card.endpointY, card.endpointY + 10))
	}
	return { stacked, inner }
}

test('every card row clears the row above it, and stays inside the card', () => {
	// Two shipped defects lived in this arithmetic. A host pill whose top sat
	// above the title's baseline covered the title's lower half, because the
	// pill is drawn after the title; and a row pushed past the card's bottom
	// edge simply vanished. Both are layout, so both are asserted from the
	// scene rather than from the rendered pixels, which no assertion here can
	// see.
	const html = readFileSync(path.join(DOCS, 'preview-source.html'), 'utf8')
	const match = /<script[^>]*id="scene"[^>]*>([\s\S]*?)<\/script>/.exec(html)
	const scene = JSON.parse(match[1])
	for (const [kind, card] of [['search', scene.search], ['fetch', scene.fetch]]) {
		const { stacked, inner } = cardRows(card, kind)
		const groups = inner.length > 1 ? [stacked, inner.slice(1)] : [stacked]
		for (const rows of groups) {
			for (let index = 1; index < rows.length; index++) {
				const above = rows[index - 1]
				const below = rows[index]
				assert.ok(
					below.top >= above.bottom + ROW_GAP,
					`${kind}: ${below.label} starts at ${below.top}, only ${below.top - above.bottom} ` +
						`below ${above.label}, which ends at ${above.bottom}`,
				)
			}
		}
		// A row inside the markdown body must also stay inside it. The container
		// is `inner[0]`; it is a row of the card's own stack, not a row to clear.
		const container = inner[0]
		for (const item of inner.slice(1)) {
			assert.ok(
				item.bottom <= container.bottom,
				`${kind}: ${item.label} ends at ${item.bottom}, past the body's ${container.bottom}`,
			)
		}
		for (const item of stacked) {
			assert.ok(item.top >= card.y, `${kind}: ${item.label} starts above the card`)
			assert.ok(
				item.bottom <= card.y + card.h,
				`${kind}: ${item.label} ends at ${item.bottom}, past the card's ${card.y + card.h}`,
			)
		}
	}
})

test('the renderer clips the accent bar to the bar, not to the card section', () => {
	// The shipped defect: the mask ran to `y + h + radius`, which tinted every
	// row down to the card's first full-width one and turned a 5-unit bar into
	// a 17-unit tongue under the title. The clip is the card's rounded shape
	// intersected with the bar's own rows.
	const python = readFileSync(path.join(DOCS, 'render-preview.py'), 'utf8')
	assert.ok(!/y \+ h \+ radius/.test(python), 'the accent mask still runs past the bar')
	assert.ok(python.includes('ImageChops.multiply'), 'the accent mask no longer intersects the bar band')
	assert.match(python, /def accent\(self, x, y, w, h, fill, radius, card_h\)/, 'accent no longer takes the card height')
})

test('the monospaced lines stay ASCII in both languages', () => {
	// Consolas has no CJK glyphs, so a Chinese host line, query, or URL would
	// silently render in a substituted face — a visible seam in the middle of
	// the card. The scene keeps every monospaced line ASCII instead.
	const html = readFileSync(path.join(DOCS, 'preview-source.html'), 'utf8')
	const match = /<script[^>]*id="scene"[^>]*>([\s\S]*?)<\/script>/.exec(html)
	const scene = JSON.parse(match[1])
	for (const lang of ['en', 'zh']) {
		const text = scene.text[lang]
		for (const [name, value] of [
			['searchHost', text.searchHost],
			['fetchHost', text.fetchHost],
			['query', text.query],
			['url', text.url],
			['dates', text.dates.join(' ')],
		]) {
			assert.match(value, /^[\x20-\x7e]*$/, `${lang} ${name} is not ASCII`)
		}
	}
})

test('nothing references the retired SVG placeholders', () => {
	// The detail images are PNGs rendered from the scene; a leftover reference
	// would leave a localized document pointing at a file that is not shipped.
	for (const name of ['DETAIL.md', 'DETAIL.zh.md', 'preview-source.html']) {
		const text = readFileSync(path.join(DOCS, name), 'utf8')
		assert.ok(!text.includes('preview.svg'), `${name} still references preview.svg`)
		assert.ok(!text.includes('preview.zh.svg'), `${name} still references preview.zh.svg`)
	}
})

test('the render source uses no remote resource or script beyond the scene', () => {
	// The detail page serves the document beside the bundle, but the source page
	// itself should stay self-contained so it can be opened from a checkout.
	const html = readFileSync(path.join(DOCS, 'preview-source.html'), 'utf8')
	assert.ok(!/<script[^>]+src=/i.test(html), 'the source loads a remote script')
	assert.ok(!/<link[^>]+href=/i.test(html), 'the source loads a remote stylesheet')
	assert.ok(!/https?:\/\//i.test(html.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '')),
		'the source names a remote resource')
})

test('the README documents the detail page and its preview pipeline', () => {
	// A reader who changes the plugin should know the image is generated, not
	// hand-edited, and where the scene that produces it lives. This repository's
	// README is written in Chinese only, so there is one tree to check.
	const text = readFileSync(path.join(ROOT, 'README.md'), 'utf8')
	assert.ok(text.includes('DETAIL.md'), 'README.md does not list DETAIL.md in its tree')
	assert.ok(text.includes('preview-source.html'), 'README.md does not mention the scene source')
	assert.ok(text.includes('render-preview.py'), 'README.md does not mention the renderer')
})

test('AGENTS.md records the detail-page contract', () => {
	// The rules that keep the detail page working are the ones a future edit is
	// most likely to break: one image line, the scene as the source of truth,
	// the two facts the artwork must state, and `docs` in `files`.
	const text = readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8')
	assert.ok(text.includes('meta.detail'), 'AGENTS.md does not mention meta.detail')
	assert.ok(text.includes('preview-source.html'), 'AGENTS.md does not name the scene source')
	assert.ok(text.includes('render-preview.py'), 'AGENTS.md does not name the renderer')
	assert.ok(/不要直接手改 PNG/.test(text), 'AGENTS.md does not forbid hand-editing the PNGs')
	assert.ok(/没有免密钥路径/.test(text), 'AGENTS.md does not state that there is no keyless fallback')
})
