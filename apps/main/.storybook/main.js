import { mergeConfig } from 'vite';

function extractPublicEnv(){
  const out = {};
  for(const k of Object.keys(process.env)){
    if(k.startsWith('PUBLIC_')) out[k] = process.env[k];
  }
  return out;
}

/** @type { import('@storybook/sveltekit').StorybookConfig } */
const config = {
  stories: ['../src/**/*.stories.@(js|ts|svelte|mdx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/sveltekit',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  },
  async viteFinal(baseConfig){
    return mergeConfig(baseConfig, {
      define: Object.fromEntries(Object.entries(extractPublicEnv()).map(([k,v])=>[`process.env.${k}`, JSON.stringify(v)]))
    });
  }
};

export default config;
