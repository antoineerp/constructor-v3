import { json } from '@sveltejs/kit';

import { supabase } from '$lib/supabase.js';

// GET /api/files/analyses?hash=abc&hash=def ou POST { hashes: [] }
// Retour: { analyses:[{hash,kind,summary,colors,components}], palette:{ colors:[...] } }

function unifyPalette(analyses){
  // Collecte couleurs, normalise en minuscule, supprime doublons, limite à 8.
  const colorCounts = new Map();
  for(const a of analyses){
    const cols = a.colors || [];
    for(const c of cols){
      if(!/^#?[0-9a-fA-F]{3,8}$/.test(c)) continue;
      let norm = c.startsWith('#') ? c.toLowerCase() : '#'+c.toLowerCase();
      // Expand #abc -> #aabbcc pour comparaison simple
      if(/^#[0-9a-f]{3}$/.test(norm)) norm = '#' + norm.slice(1).split('').map(ch=> ch+ch).join('');
      colorCounts.set(norm, (colorCounts.get(norm)||0)+1);
    }
  }
  const sorted = Array.from(colorCounts.entries()).sort((a,b)=> b[1]-a[1]).map(e=> e[0]).slice(0,12);
  return { colors: sorted };
}

async function fetchAnalyses(hashes){
  if(!hashes.length) return [];
  const { data, error } = await supabase.from('file_analyses').select('*').in('hash', hashes.slice(0,50));
  if(error) throw new Error(error.message);
  return (data||[]).map(r=> ({
    hash: r.hash,
    kind: r.kind,
    summary: r.analysis?.summary || r.analysis?.note || null,
    colors: r.analysis?.colors || [],
    components: r.analysis?.components || r.analysis?.objects || []
  }));
}

export async function GET({ url }){
  try {
    const hashes = url.searchParams.getAll('hash');
    const analyses = await fetchAnalyses(hashes);
    const palette = unifyPalette(analyses);
    return json({ success:true, analyses, palette });
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}

export async function POST({ request }){
  try {
    const body = await request.json().catch(()=>({}));
    const hashes = Array.isArray(body.hashes) ? body.hashes : [];
    const analyses = await fetchAnalyses(hashes);
    const palette = unifyPalette(analyses);
    return json({ success:true, analyses, palette });
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}
