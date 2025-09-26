import { mergeConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type { import('@storybook/sveltekit').StorybookConfig } */
const config = {
  stories: [
    '../src/**/*.stories.@(js|ts|svelte|mdx)'
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y'
  ],
  framework: {
    name: '@storybook/sveltekit',
    options: {}
  },
  async viteFinal(baseConfig) {
    return mergeConfig(baseConfig, {
      plugins: [sveltekit()],
    });
  }
};

export default config;
