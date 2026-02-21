// Usage: npm run icons:add lucide:x lucide:chevron-right heroicons:home
// Browse icons at: https://icones.js.org
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUTPUT_DIR = join(
	fileURLToPath(new URL('.', import.meta.url)),
	'../other/svg-icons',
)

const args = process.argv.slice(2)
if (!args.length) {
	console.error('Usage: npm run icons:add <iconify-id> [...]')
	console.error('Browse icons at: https://icones.js.org')
	process.exit(1)
}

await mkdir(OUTPUT_DIR, { recursive: true })
for (const id of args) {
	const [prefix, ...rest] = id.split(':')
	const name = rest.join(':')
	if (!prefix || !name) {
		console.error(
			`Invalid icon ID "${id}" — expected format: prefix:name (e.g. lucide:x)`,
		)
		process.exit(1)
	}
	const res = await fetch(`https://api.iconify.design/${prefix}/${name}.svg`)
	if (!res.ok) {
		console.error(`Failed to fetch ${id}: ${res.status} ${res.statusText}`)
		process.exit(1)
	}
	const filename = `${prefix}--${name}.svg`
	await writeFile(join(OUTPUT_DIR, filename), await res.text())
	console.log(`✓ ${id} → other/svg-icons/${filename}`)
}
console.log('\nRun `npm run build` or restart dev server to update the sprite.')
