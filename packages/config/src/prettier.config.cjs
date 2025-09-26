// Re-export de la config prettier racine; peut être enrichi si besoin
module.exports = {
  plugins: [
    'prettier-plugin-svelte',
    'prettier-plugin-tailwindcss'
  ],
  overrides: [
    { files: '*.svelte', options: { parser: 'svelte' } }
  ]
};
