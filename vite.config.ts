import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { iconsSpritesheet as iconsPlugin } from 'vite-plugin-icons-spritesheet'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
	plugins: [
		iconsPlugin({
			inputDir: './other/svg-icons',
			outputDir: './app/components/ui/icons',
			typesOutputFile: './app/components/ui/icons/icon-name.ts',
			fileName: 'sprite.svg',
			withTypes: true,
			formatter: 'prettier',
			iconNameTransformer: (name) => name,
		}),
		cloudflare({
			viteEnvironment: { name: 'ssr' },
			// Per-worker E2E tests set CF_INSPECTOR_PORT=false to avoid port conflicts
			...(process.env.CF_INSPECTOR_PORT === 'false'
				? { inspectorPort: false }
				: {}),
		}),
		tailwindcss(),
		reactRouter(),
		tsconfigPaths(),
	],
	define: {
		...(process.env.RESEND_BASE_URL
			? {
					'process.env.RESEND_BASE_URL': JSON.stringify(
						process.env.RESEND_BASE_URL,
					),
				}
			: {}),
	},
})
