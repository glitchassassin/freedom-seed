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
			iconNameTransformer: (name) => name,
		}),
		cloudflare({ viteEnvironment: { name: 'ssr' } }),
		tailwindcss(),
		reactRouter(),
		tsconfigPaths(),
	],
	define: {
		'process.env.RESEND_BASE_URL': JSON.stringify(
			process.env.RESEND_BASE_URL ?? '',
		),
	},
})
