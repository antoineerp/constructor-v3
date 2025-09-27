import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

// Configuration basique
const ALLOWED_MIME = new Set(['image/png','image/jpeg','image/webp','image/gif']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const BUCKET = env.SUPABASE_UPLOAD_BUCKET || 'uploads';

async function ensureBucket(){
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if(!buckets?.find(b=> b.name===BUCKET)){
      await supabase.storage.createBucket(BUCKET, { public: false });
    }
  } catch(_e){ /* ignore bucket race */ }
}

export async function POST({ request }){
  try {
    // Vérifier configuration supabase minimale
    if(!process.env.PUBLIC_SUPABASE_URL || !process.env.PUBLIC_SUPABASE_ANON_KEY){
      return json({ success:false, error:'Configuration Supabase manquante (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY).', hint:'Définis les variables d\'env publiques pour activer l\'upload.' }, { status:500 });
    }
    const contentType = request.headers.get('content-type') || '';
    if(!contentType.startsWith('multipart/form-data')){
      return json({ success:false, error:'Utiliser multipart/form-data' }, { status:400 });
    }
    const form = await request.formData();
    const file = form.get('file');
    if(!file || typeof file === 'string'){
      return json({ success:false, error:'Champ file manquant' }, { status:400 });
    }
    if(!ALLOWED_MIME.has(file.type)){
      return json({ success:false, error:'Type non autorisé', allowed: Array.from(ALLOWED_MIME) }, { status:400 });
    }
    if(file.size > MAX_SIZE_BYTES){
      return json({ success:false, error:`Fichier trop volumineux (> ${MAX_SIZE_BYTES} bytes)` }, { status:413 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sha1 = crypto.createHash('sha1').update(buffer).digest('hex');
    await ensureBucket();
    // Déduplication simple par hash
    const objectPath = `${sha1}_${file.name}`;
    // Vérifier si déjà présent
    const { data: existing, error: listErr } = await supabase.storage.from(BUCKET).list('', { limit:100 });
    if(listErr){ /* ignore */ }
    let already=false;
    if(existing){
      already = existing.some(o=> o.name === objectPath);
    }
    if(!already){
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, buffer, { contentType: file.type, upsert:false });
      if(upErr && !upErr.message.includes('exists')){
        return json({ success:false, error:'Upload Supabase échoué', detail: upErr.message }, { status:500 });
      }
    }
    // URL signée (optionnelle)
    let signedUrl=null;
    try {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, 60*10); // 10 min
      signedUrl = signed?.signedUrl || null;
    } catch(_e){ /* ignore */ }
    return json({ success:true, hash: sha1, name: file.name, size: file.size, mime: file.type, objectPath, signedUrl, dedup: already });
  } catch(e){
    return json({ success:false, error:'Échec upload: '+ e.message }, { status:500 });
  }
}
