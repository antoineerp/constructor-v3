// Prettier configuration unifiée pour le projet
// Ajoute support Svelte + Tailwind (ordre des classes) si installé
module.exports = {
  plugins: [
    'prettier-plugin-svelte',
    // Le plugin Tailwind est optionnel : si absent, Prettier l'ignorera (géré côté script aussi)
    'prettier-plugin-tailwindcss'
  ],
  overrides: [
    { files: '*.svelte', options: { parser: 'svelte' } },
  ],
};
