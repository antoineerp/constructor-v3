import { json } from '@sveltejs/kit';

import { openaiService } from '$lib/openaiService.js';
import { validateFiles } from '$lib/validation/validator.js';

/* Endpoint de réparation ciblée
Body: { filename, code, diagnostics: [{severity, message, line, column, rule?}], intent? }
Retour: { success, patchedCode }
*/
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { filename, code, diagnostics, intent } = body || {};
    if(!filename || !code) return json({ success:false, error:'filename & code requis' }, { status:400 });
    const diagText = (diagnostics||[]) 
      .slice(0,15)
      .map(d=>`- [${d.severity}] ${d.message}${d.line?` (ligne ${d.line})`:''}`)
      .join('\n');
    const system = `Tu es un assistant qui RÉPARE du code Svelte strictement.
Règles:
- NE PAS réécrire totalement si une réparation locale suffit.
- Ne pas ajouter de dépendances externes.
- Conserver le style Tailwind existant.
- Sortie: uniquement le contenu complet corrigé du fichier ${filename}, pas de markdown.`;
    const user = `Fichier: ${filename}
Intent utilisateur (optionnel): ${intent || 'non précisé'}
Diagnostics:
${diagText || 'aucun'}

Code actuel:
${code}

Corrige le code ci-dessus. Si déjà valide, renvoie-le identique.`;
    const patched = await openaiService.generateComponent(user, 'repair', { model: 'gpt-4o-mini' });
    // Revalidation uniquement sur ce fichier
    let validation = null;
    try {
      const v = await validateFiles({ [filename]: patched });
      validation = v[filename];
    } catch (e) {
      validation = { diagnostics:[{ severity:'error', source:'validator', message:'Revalidation échouée: '+e.message }], ssrOk:false, domOk:false, original: code, formatted: patched };
    }
    return json({ success:true, patchedCode: patched, validation });
  } catch(e){
    console.error('repair error', e);
    return json({ success:false, error:e.message||'Erreur réparation' }, { status:500 });
  }
}
