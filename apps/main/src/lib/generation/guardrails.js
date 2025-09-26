// Guardrails de génération: assure fichiers requis & réécritures rapides.
// Objectif: réduire les erreurs de compilation avant passes de critic / validation lourde.

const REQUIRED_FILES = [
  'src/routes/+page.svelte',
  'src/app.css'
];

const TAILWIND_CSS = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;

function baseRouteTemplate(title='Titre'){ return `<script>export let data; </script>\n<section class=\"container mx-auto p-6 space-y-6\">\n  <h1 class=\"text-3xl font-bold tracking-tight mb-4\">${title}</h1>\n  <p class=\"text-sm text-slate-600\">Section initiale générée automatiquement.</p>\n</section>\n`; }

function ensureRequiredFiles(files){
  const meta = { injected: [], normalized: [] };
  for(const f of REQUIRED_FILES){
    if(!files[f]){
      if(f.endsWith('+page.svelte')) files[f] = baseRouteTemplate('Accueil');
      else if(f === 'src/app.css') files[f] = `/* Fichier Tailwind auto-injecté */\n${TAILWIND_CSS}`;
      meta.injected.push(f);
    }
  }
  // tailwind config minimal
  if(!files['tailwind.config.cjs']){
    files['tailwind.config.cjs'] = `module.exports = { content: [\n  './src/**/*.{svelte,js,ts}',\n], theme: { extend: {} }, plugins: [] };`;
    meta.injected.push('tailwind.config.cjs');
  }
  if(!files['postcss.config.cjs']){
    files['postcss.config.cjs'] = `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };`;
    meta.injected.push('postcss.config.cjs');
  }
  if(!files['package.json']){
    files['package.json'] = JSON.stringify({ name:'generated-app', private:true, type:'module', scripts:{ dev:'vite dev', build:'vite build', preview:'vite preview' } }, null, 2);
    meta.injected.push('package.json');
  }
  return meta;
}

function quickFixSvelte(code){
  let meta = { addedAlt:0, tailwindHexFix:0, strippedDangerous:0 };
  if(typeof code !== 'string') return { code, meta };
  // alt sur <img> sans alt
  code = code.replace(/<img(?![^>]*\balt=)([^>]*)>/g, (m, rest)=> { meta.addedAlt++; return `<img alt="" ${rest}>`; });
  // text-HEX → text-[#HEX]
  code = code.replace(/\btext-([0-9A-Fa-f]{6})\b/g, (_m, hex)=> { meta.tailwindHexFix++; return `text-[#${hex}]`; });
  // imports dangereux
  code = code.replace(/import\s+[^;]*\b(fs|child_process|vm|module)\b[^;]*;?/g, (m)=> { meta.strippedDangerous++; return `/* stripped-dangerous-import ${m.replace(/\n/g,' ')} */`; });
  // eval(
  code = code.replace(/eval\s*\(/g, ()=> { meta.strippedDangerous++; return '/*eval-stripped*/(()=>'; });
  return { code, meta };
}

function applyGuardRails(files){
  const guardMeta = { ensure: null, perFile: {}, summary:{ addedAlt:0, tailwindHexFix:0, strippedDangerous:0 } };
  guardMeta.ensure = ensureRequiredFiles(files);
  for(const [fname, content] of Object.entries(files)){
    if(!fname.endsWith('.svelte')) continue;
    const { code, meta } = quickFixSvelte(content);
    files[fname] = code;
    guardMeta.perFile[fname] = meta;
    guardMeta.summary.addedAlt += meta.addedAlt;
    guardMeta.summary.tailwindHexFix += meta.tailwindHexFix;
    guardMeta.summary.strippedDangerous += meta.strippedDangerous;
  }
  files.__guard_meta = guardMeta;
  return guardMeta;
}

export { applyGuardRails };
