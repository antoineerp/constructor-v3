import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			'$tools/format': resolve(__dirname, 'tools/format-files.mjs')
		}
	},
	server: { port: 5173 },
	build: {
		target: 'es2022',
		rollupOptions: {
			output: {
				format: 'es'
			}
		}
	}
});