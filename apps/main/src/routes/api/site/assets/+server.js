import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { openaiService } from '$lib/openaiService.js';

// Endpoint: POST /api/site/assets
// Body: { projectId, type?: 'articles-hero' | 'all' }
// Pour chaque article blueprint (sample_content.articles[].hero_image_prompt) génère un placeholder d'image.
// Implémentation actuelle: pas d'appel provider image réel (à intégrer plus tard), on produit un slug + URL placeholder (picsum.photos) + alt.
// Met à jour projects.assets_json (merge).

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { projectId, type = 'articles-hero' } = body;
    if(!projectId) return json({ success:false, error:'projectId requis' }, { status:400 });
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, authHeader ? { global:{ headers:{ Authorization: authHeader } } } : {});
  const { data: project, error: pErr } = await supabase.from('projects').select('*').eq('id', projectId).single();
    if(pErr) throw pErr;
    if(!project.blueprint_json) return json({ success:false, error:'Blueprint manquant' }, { status:400 });
    const articles = project.blueprint_json?.sample_content?.articles || [];
    const assets = project.assets_json || {};
    if(type === 'articles-hero' || type === 'all') {
      for(const art of articles){
        if(!art.slug) continue;
        const key = `article:${art.slug}:hero`;
        if(assets[key]) continue; // ne pas dupliquer
        const prompt = art.hero_image_prompt || ('Illustration pour '+art.title);
        let generatedUrl = null;
        let provider = 'openai-image';
        try {
          const img = await openaiService.generateImage(prompt, { size: '512x512' });
          // Stocker dans Supabase Storage (bucket 'generated-assets') sous forme binaire
          const bucket = 'generated-assets';
          const filePath = `projects/${project.id}/${art.slug}-hero.png`;
          const buffer = Buffer.from(img.base64, 'base64');
          // Assure que le bucket existe côté projet (à créer manuellement si pas encore)
          const { error: upErr } = await supabase.storage.from(bucket).upload(filePath, buffer, { contentType: 'image/png', upsert: true });
          if(upErr) throw upErr;
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath);
          generatedUrl = pub?.publicUrl || null;
        } catch(e){
          provider = 'placeholder-fallback';
          const hash = Math.abs(hashCode(art.slug)) % 1000;
          generatedUrl = `https://picsum.photos/seed/${hash}/800/480`;
        }
        assets[key] = { prompt, provider, url: generatedUrl, alt: art.title, status: 'generated' };
      }
    }
    const { error: updErr } = await supabase.from('projects').update({ assets_json: assets }).eq('id', project.id);
    if(updErr) throw updErr;
    return json({ success:true, assets });
  } catch(e){
    console.error('assets gen error', e);
    return json({ success:false, error:e.message }, { status:500 });
  }
}

function hashCode(str){
  let h = 0, i = 0, len = str.length;
  while(i < len){ h = (h<<5) - h + str.charCodeAt(i++) | 0; }
  return h;
}
