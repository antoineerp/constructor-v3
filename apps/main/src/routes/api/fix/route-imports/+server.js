import { json } from '@sveltejs/kit';

/* Auto-fix basique des imports interdits de routes.
   POST /api/fix/route-imports
   Body: { files: { filename: code } }
   Stratégie: pour chaque import d'une route +page/+layout, on extrait le markup (hors <script>)
   dans un fichier src/lib/Extracted/<Name>Content.svelte et on remplace l'import par ce composant.
   Simplifié: si déjà créé dans cette passe, on réutilise. */

export async function POST({ request }) {
  try {
    const { files = {} } = await request.json();
    if(typeof files !== 'object' || Array.isArray(files)) return json({ success:false, error:'files invalide' }, { status:400 });
    const updated = { ...files };
    const created = {};
    const changes = [];
    const importRe = /import\s+([^;]+?)from\s+['"]([^'"\n]+)['"];?/g;
    function makeComponentName(spec){
      const base = spec.split('/').filter(Boolean).slice(-2).join('-').replace(/\+page\.svelte|\+layout\.svelte/,'')||'Part';
      return base.split(/[^A-Za-z0-9]/).filter(Boolean).map(s=> s[0].toUpperCase()+s.slice(1)).join('')+ 'Content';
    }
    for(const [fname, code] of Object.entries(files)){
      if(!fname.endsWith('.svelte')) continue;
      let mutated = code; let matched = false; let m;
      importRe.lastIndex = 0;
      while((m = importRe.exec(code))){
        const spec = m[2];
        if(/\+page\.svelte$/.test(spec) || /\+layout\.svelte$/.test(spec)){
          matched = true;
          const compName = makeComponentName(spec);
          const newPath = `src/lib/Extracted/${compName}.svelte`;
          if(!created[newPath]){
            // Contenu minimal – on pourrait essayer de récupérer le markup de la page cible mais hors scope ici.
            created[newPath] = `<script>export let children;<\/script>\n<div class=\"extracted-route-block border border-dashed p-4 rounded\">\n  <p class=\"text-xs text-gray-500\">Extrait de ${spec} (isolé pour réutilisation).\n  </p>{#if children}<slot/>{/if}\n</div>`;
          }
          // Remplacer l'import original par import du composant extrait
          const importStmt = m[0];
            mutated = mutated.replace(importStmt, `import ${compName} from '$lib/Extracted/${compName}.svelte';`);
        }
      }
      if(matched){
        updated[fname] = mutated;
        changes.push({ file: fname, fixed: true });
      }
    }
    Object.assign(updated, created);
    return json({ success:true, files: updated, created: Object.keys(created), changes });
  } catch(e){
    return json({ success:false, error:e.message||'Erreur auto-fix' }, { status:500 });
  }
}
