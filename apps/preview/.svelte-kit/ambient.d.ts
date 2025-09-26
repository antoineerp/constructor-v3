
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const DOCKER_BUILDKIT: string;
	export const USER: string;
	export const npm_config_user_agent: string;
	export const npm_package_dependencies_socket_io: string;
	export const npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
	export const npm_package_devDependencies_vite: string;
	export const npm_node_execpath: string;
	export const HOME: string;
	export const VSCODE_IPC_HOOK_CLI: string;
	export const npm_package_devDependencies_eslint_config_prettier: string;
	export const npm_package_devDependencies_eslint_plugin_svelte: string;
	export const VSCODE_GIT_ASKPASS_MAIN: string;
	export const npm_package_devDependencies_svelte_check: string;
	export const VSCODE_GIT_ASKPASS_NODE: string;
	export const npm_package_scripts_check: string;
	export const VSCODE_PYTHON_AUTOACTIVATE_GUARD: string;
	export const COLORTERM: string;
	export const npm_package_devDependencies_typescript: string;
	export const npm_package_devDependencies_tailwindcss: string;
	export const npm_package_scripts_dev: string;
	export const npm_package_devDependencies_prettier: string;
	export const npm_package_type: string;
	export const npm_package_private: string;
	export const npm_package_scripts_check_watch: string;
	export const npm_package_devDependencies_autoprefixer: string;
	export const npm_package_scripts_lint: string;
	export const npm_config_registry: string;
	export const TERM: string;
	export const npm_config_node_gyp: string;
	export const PATH: string;
	export const TURBO_HASH: string;
	export const npm_package_name: string;
	export const NODE: string;
	export const npm_config_frozen_lockfile: string;
	export const LANG: string;
	export const npm_package_devDependencies_eslint: string;
	export const TERM_PROGRAM: string;
	export const VSCODE_GIT_IPC_HANDLE: string;
	export const npm_lifecycle_script: string;
	export const npm_package_devDependencies__sveltejs_kit: string;
	export const SHELL: string;
	export const TURBO_IS_TUI: string;
	export const npm_package_version: string;
	export const npm_lifecycle_event: string;
	export const NODE_PATH: string;
	export const npm_package_scripts_build: string;
	export const npm_package_devDependencies_svelte: string;
	export const npm_package_devDependencies_globals: string;
	export const VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
	export const npm_package_scripts_format: string;
	export const PWD: string;
	export const npm_execpath: string;
	export const npm_package_devDependencies__sveltejs_adapter_auto: string;
	export const npm_package_devDependencies_postcss: string;
	export const npm_command: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const npm_package_scripts_preview: string;
	export const npm_package_devDependencies_prettier_plugin_svelte: string;
	export const npm_package_devDependencies__types_eslint: string;
	export const INIT_CWD: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		DOCKER_BUILDKIT: string;
		USER: string;
		npm_config_user_agent: string;
		npm_package_dependencies_socket_io: string;
		npm_package_devDependencies__sveltejs_vite_plugin_svelte: string;
		npm_package_devDependencies_vite: string;
		npm_node_execpath: string;
		HOME: string;
		VSCODE_IPC_HOOK_CLI: string;
		npm_package_devDependencies_eslint_config_prettier: string;
		npm_package_devDependencies_eslint_plugin_svelte: string;
		VSCODE_GIT_ASKPASS_MAIN: string;
		npm_package_devDependencies_svelte_check: string;
		VSCODE_GIT_ASKPASS_NODE: string;
		npm_package_scripts_check: string;
		VSCODE_PYTHON_AUTOACTIVATE_GUARD: string;
		COLORTERM: string;
		npm_package_devDependencies_typescript: string;
		npm_package_devDependencies_tailwindcss: string;
		npm_package_scripts_dev: string;
		npm_package_devDependencies_prettier: string;
		npm_package_type: string;
		npm_package_private: string;
		npm_package_scripts_check_watch: string;
		npm_package_devDependencies_autoprefixer: string;
		npm_package_scripts_lint: string;
		npm_config_registry: string;
		TERM: string;
		npm_config_node_gyp: string;
		PATH: string;
		TURBO_HASH: string;
		npm_package_name: string;
		NODE: string;
		npm_config_frozen_lockfile: string;
		LANG: string;
		npm_package_devDependencies_eslint: string;
		TERM_PROGRAM: string;
		VSCODE_GIT_IPC_HANDLE: string;
		npm_lifecycle_script: string;
		npm_package_devDependencies__sveltejs_kit: string;
		SHELL: string;
		TURBO_IS_TUI: string;
		npm_package_version: string;
		npm_lifecycle_event: string;
		NODE_PATH: string;
		npm_package_scripts_build: string;
		npm_package_devDependencies_svelte: string;
		npm_package_devDependencies_globals: string;
		VSCODE_GIT_ASKPASS_EXTRA_ARGS: string;
		npm_package_scripts_format: string;
		PWD: string;
		npm_execpath: string;
		npm_package_devDependencies__sveltejs_adapter_auto: string;
		npm_package_devDependencies_postcss: string;
		npm_command: string;
		PNPM_SCRIPT_SRC_DIR: string;
		npm_package_scripts_preview: string;
		npm_package_devDependencies_prettier_plugin_svelte: string;
		npm_package_devDependencies__types_eslint: string;
		INIT_CWD: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
