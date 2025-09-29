import { findBlueprint } from './registry';

export interface GeneratedProjectOptions {
  includeExample?: boolean; // ajoute une page secondaire + composant utilitaire
  language?: 'ts'|'js';
}

// Génération déterministe multi-fichiers à partir d'un blueprint enregistré.
// Ne dépend pas d'API externe (offline friendly).
export function generateBlueprintProject(id: string, opts: GeneratedProjectOptions = {}) {
  const bp = findBlueprint(id);
  if(!bp) return { id, found:false, files:{}, meta:null };
  const useTs = opts.language === 'ts';
  const extScript = useTs ? 'ts' : 'js';
  const now = new Date().toISOString();

  // Contenus minimaux Tailwind + Layout racine
  const files: Record<string,string> = {
    'src/app.css': `@tailwind base;@tailwind components;@tailwind utilities;\nbody{@apply antialiased bg-gray-50 text-gray-800;}`,
    'tailwind.config.cjs': `module.exports={content:["./src/**/*.{svelte,ts,js}"],theme:{extend:{}},plugins:[]}`,
    'src/routes/+layout.svelte': `<script${useTs? ' lang="ts"':''}>export let data;\/\/ layout global ${bp.id}\n<\/script>\n<div class="min-h-screen flex flex-col">\n<header class="p-4 border-b bg-white"><h1 class="font-bold text-lg">${bp.label}</h1></header>\n<main class="flex-1 p-6"><slot/><\/main>\n<footer class="p-4 text-xs text-gray-500">Generated ${now}<\/footer>\n</div>`,
    'src/routes/+page.svelte': `<script${useTs? ' lang="ts"':''}>let count=0;function inc(){count++;}<\/script>\n<h2 class="text-2xl font-semibold mb-4">Accueil (${bp.id})<\/h2>\n<button class="px-3 py-1 rounded bg-indigo-600 text-white" on:click={inc}>Compteur {count}<\/button>\n<p class="mt-4 text-sm">Blueprint: ${bp.description || bp.label}.<\/p>`
  };

  if(opts.includeExample){
    files['src/routes/about/+page.svelte'] = `<h2 class=\"text-xl font-semibold mb-2\">À propos<\/h2><p class=\"text-sm\">Page secondaire générée (${bp.id}).<\/p>`;
    files[`src/lib/ui/${bp.id}-badge.svelte`] = `<script${useTs? ' lang="ts"':''}>export let label='${bp.id}';<\/script>\n<span class=\"inline-block px-2 py-0.5 text-xs rounded bg-purple-600/10 text-purple-700 border border-purple-600/20\">{label}<\/span>`;
    files['src/routes/+page.svelte'] += `\n<p class=\"mt-6\">Composant: <${bp.id}-badge label=\"Demo\"/><\/p>`;
  }

  // Ajout spécifique dépendances UI pour montrer intégration simple
  if(bp.approved.includes('skeleton')){
    files['src/routes/+layout.svelte'] = files['src/routes/+layout.svelte'].replace('<slot/>', '<slot/>\n<!-- Skeleton placeholder theme hook -->');
  }
  if(bp.approved.includes('flowbite')){
    files['src/routes/+page.svelte'] += `\n<!-- Flowbite: exemple bouton -->\n<button class=\"btn btn-primary mt-2\">Flowbite Btn<\/button>`;
  }
  if(bp.approved.includes('shadcn')){
    files['src/routes/+page.svelte'] += `\n<!-- shadcn: exemple classe -->\n<div class=\"shadow-sm border rounded p-2 mt-2\">Bloc shadcn<\/div>`;
  }
  if(bp.approved.includes('bits')){
    files['src/routes/+page.svelte'] += `\n<!-- Bits UI: placeholder -->`;
  }

  return { id: bp.id, found:true, meta: bp, files };
}
