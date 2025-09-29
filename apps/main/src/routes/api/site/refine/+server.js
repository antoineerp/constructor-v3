import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { supabase as clientSupabase } from '$lib/supabase.js';
import { validateAndFix, unifyPalette, addAccessibilityFixes } from '$lib/validator/svelteValidator.js';

/*
 POST /api/site/refine
 Body: { projectId: string, strategies?: string[] } 
 strategies possibles: [ 'structure', 'design', 'accessibility' ]
 Retour: { success, refined: { filename: { issues, changed, strategiesApplied } }, score }

 Scoring heuristique (0-100):
  - Base 100
  - -5 par fichier avec critical issues
  - -1 par fichier avec >3 issues non critiques
  - + (jusqu'à +5) si aucune critical et access alt OK
*/
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { projectId, strategies = ['structure','design','accessibility'] } = body;
    if(!projectId) return json({ success:false, error:'projectId requis' }, { status:400 });

    // Auth optionnelle
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    let userId = null; let serverSupabase = null;
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.split(' ')[1];
      serverSupabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data: { user } } = await serverSupabase.auth.getUser();
      if (user) userId = user.id;
    }

    const queryBuilder = clientSupabase.from('projects').select('*').eq('id', projectId);
    if (userId) queryBuilder.eq('user_id', userId);
    const { data: project, error } = await queryBuilder.single();
    if (error || !project) return json({ success:false, error:'Projet introuvable ou non autorisé' }, { status:404 });

    const files = project.code_generated || {};
    const blueprint = project.blueprint_json || {};
    const palette = blueprint.color_palette || [];

    const refinedReport = {};
    let criticalCount = 0; let nonCriticalOver = 0; let accessibilityBonus = 0;

    for (const [filename, content] of Object.entries(files)) {
      let current = content;
      const fileIssues = [];
      const applied = [];

      if (strategies.includes('structure')) {
        const { fixed, issues, critical } = validateAndFix(current, { filename });
        current = fixed; fileIssues.push(...issues); if (critical) criticalCount++; if (issues.length > 3 && !critical) nonCriticalOver++;
        applied.push('structure');
      }
      if (strategies.includes('design') && palette.length) {
        const { content: c2, replacements } = unifyPalette(current, palette);
        if (replacements) { fileIssues.push(`Palette normalized: ${replacements} replacements`); applied.push('design'); current = c2; }
      }
      if (strategies.includes('accessibility')) {
        const { content: c3, issues: accIssues } = addAccessibilityFixes(current);
        if (accIssues.length) { fileIssues.push(...accIssues); applied.push('accessibility'); current = c3; accessibilityBonus += accIssues.includes('Added empty alt to img') ? 1 : 0; }
      }

      const changed = current !== content;
      if (changed) {
        files[filename] = current;
      }
      refinedReport[filename] = { issues: fileIssues, changed, strategiesApplied: applied };
    }

    // Persist if user owns
    if (userId) {
      await clientSupabase.from('projects').update({ code_generated: files }).eq('id', projectId);
      // Upsert each file in project_files
      for (const [filename, content] of Object.entries(files)) {
        await clientSupabase.from('project_files').upsert({ project_id: projectId, filename, content, stage: 'refined', pass_index: 1 }, { onConflict: 'project_id,filename' });
      }
    }

    // Scoring
    let score = 100;
    score -= criticalCount * 5;
    score -= nonCriticalOver * 1;
    score += Math.min(5, accessibilityBonus);
    if (score < 0) score = 0; if (score > 100) score = 100;

    return json({ success:true, refined: refinedReport, score });
  } catch(e) {
    console.error('refine error', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}
