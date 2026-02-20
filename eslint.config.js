import { config as defaultConfig } from '@epic-web/config/eslint'

/**
 * Minimal parser so ESLint can open .md files without crashing.
 * Returns a Program node that covers the whole file; rules inspect
 * the raw source text via context.sourceCode.getText().
 */
const markdownParser = {
	parse(text) {
		return {
			type: 'Program',
			body: [],
			tokens: [],
			comments: [],
			range: [0, text.length],
			loc: {
				start: { line: 1, column: 0 },
				end: { line: text.split('\n').length, column: 0 },
			},
		}
	},
}

/**
 * Inline ESLint plugin that enforces a line-count limit on facet docs.
 * Facet files must stay small so they fit in agent context windows.
 */
const facetsPlugin = {
	rules: {
		'max-lines': {
			meta: { type: 'suggestion', schema: [] },
			create(context) {
				const MAX = 100
				return {
					Program() {
						const lineCount = context.sourceCode
							.getText()
							.trimEnd()
							.split('\n').length
						if (lineCount > MAX) {
							context.report({
								loc: { line: MAX + 1, column: 0 },
								message: `Facet file exceeds ${MAX}-line limit (${lineCount} lines). Keep facet docs concise — they are pulled into agent context windows.`,
							})
						}
					},
				}
			},
		},
	},
}

/** @type {import("eslint").Linter.Config[]} */
export default [
	...defaultConfig,
	{
		rules: {
			// Enforce separate type imports consistently
			'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
			'import/no-duplicates': ['error', { 'prefer-inline': false }],
		},
	},
	{
		ignores: [
			'.react-router/**',
			'.wrangler/**',
			'playwright-report/**',
			'test-results/**',
			'worker-configuration.d.ts',
			'node_modules/**',
		],
	},
	// Facet docs: enforce 100-line limit so files stay context-window friendly
	{
		files: ['docs/facets/**/*.md'],
		ignores: ['docs/facets/README.md'],
		plugins: { facets: facetsPlugin },
		languageOptions: { parser: markdownParser },
		rules: { 'facets/max-lines': 'error' },
	},
]
