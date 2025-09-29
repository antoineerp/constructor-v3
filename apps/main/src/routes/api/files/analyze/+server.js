import crypto from 'crypto';

import { json } from '@sveltejs/kit';

import { env } from '$env/dynamic/private';
import { openaiService } from '$lib/openaiService.js';
import { supabase } from '$lib/supabase.js';

// Endpoint générique d'analyse d'un fichier (image / pdf / texte brut)
// Méthodes acceptées: POST multipart/form-data (file) ou JSON { base64, mime?, text?, bucketObject? }
// Cache: table file_analyses (clé = hash SHA1 du contenu normalisé)

const BUCKET = env.SUPABASE_UPLOAD_BUCKET || 'uploads';
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB limite soft
const IMAGE_MIME = /^(image\/(png|jpeg|webp|gif))$/i;
const PDF_MIME = /^application\/pdf$/i;
const TEXT_MIME = /^(text\/plain|application\/json)$/i;

function sha1(buf){ return crypto.createHash('sha1').update(buf).digest('hex'); }

async function fetchBucketObject(object){
  const { data, error } = await supabase.storage.from(BUCKET).download(object);
  if(error) throw new Error('Objet storage introuvable: '+error.message);
  const arr = await data.arrayBuffer();
  return Buffer.from(arr);
}

async function ocrOrTextExtract(buffer, mime){
  // Pour PDF: heuristique simplifiée (pas de dépendance lourde). On envoie un extrait base64 + demande résumé.
  // Pour image (non gérée par vision dédiée ici si trop lourd): fallback "non extrait".
  if(PDF_MIME.test(mime)){
    // Envoyer un prompt au modèle pour extraire un aperçu textuel (limiter taille base64)
    if(!openaiService.apiKey) return { excerpt: null, note: 'Vision indisponible (clé manquante)' };
    const b64 = buffer.toString('base64');
    const truncated = b64.slice(0, 12000); // limiter payload
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${openaiService.apiKey}` },
        body: JSON.stringify({
          model: env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
          messages:[
            { role:'system', content:'Tu reçois des bytes PDF encodés en base64 tronqués. Déduis un aperçu textuel concis (fr).' },
            { role:'user', content: `Base64 partiel (tronqué) du PDF:\n${truncated}` }
          ],
          max_tokens: 220,
          temperature: 0.2
        })
      });
      if(resp.ok){
        const data = await resp.json();
        const txt = data.choices?.[0]?.message?.content?.trim();
        return { excerpt: txt || null, note: 'Résumé modèle (tronqué)' };
      }
    } catch(_e){ /* ignore */ }
    return { excerpt: null, note: 'Extraction PDF échouée' };
  }
  return { excerpt: null, note: 'Pas d\'extraction spécifique' };
}

async function analyzeImage(b64, mime){
  if(!openaiService.apiKey) throw new Error('Clé OpenAI manquante');
  const model = env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
  const body = {
    model,
    messages:[
      { role:'system', content:'Analyse image UI. Fournis JSON { "summary":string, "colors":["#hex"], "objects":[string], "layout":[string] }' },
      { role:'user', content:[
        { type:'text', text:'Analyse concise.' },
        { type:'image_url', image_url:{ url:`data:${mime};base64,${b64}` } }
      ] }
    ],
    max_tokens: 350,
    temperature: 0.2
  };
  const resp = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':`Bearer ${openaiService.apiKey}` }, body: JSON.stringify(body) });
  if(!resp.ok){ const t = await resp.text(); throw new Error('OpenAI vision failure: '+t); }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  let parsed=null;
  try { parsed = JSON.parse(content.replace(/^```json\n?/i,'').replace(/```$/,'')); } catch(_e){ /* keep raw */ }
  return { raw: content, parsed, model };
}

async function summarizeText(text){
  if(!openaiService.apiKey) return { summary: text.slice(0,280) };
  const model = env.OPENAI_SUMMARY_MODEL || 'gpt-4o-mini';
  const trimmed = text.slice(0, 6000);
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${openaiService.apiKey}` },
    body: JSON.stringify({ model, messages:[
      { role:'system', content:'Résume le texte en français en ~3 phrases et liste 3 mots-clés. Retourne JSON { "summary":string, "keywords":[string] } sans autre texte.' },
      { role:'user', content: trimmed }
    ], max_tokens: 180, temperature:0.3 })
  });
  if(!resp.ok){ return { summary: trimmed.slice(0,200) }; }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  try { return JSON.parse(content.replace(/^```json\n?/,'').replace(/```$/,'')); } catch(_e){ return { summary: trimmed.slice(0,300) }; }
}

export async function POST({ request, locals }){
  try {
    const contentType = request.headers.get('content-type') || '';
    let buffer=null; let mime=null; let providedText=null; let source='upload';
    if(contentType.startsWith('multipart/form-data')){
      const form = await request.formData();
      const file = form.get('file');
      if(file && typeof file !== 'string'){
        mime = file.type || 'application/octet-stream';
        const arr = await file.arrayBuffer();
        buffer = Buffer.from(arr);
      }
      providedText = form.get('text') || null;
    } else if(contentType.includes('application/json')){
      const body = await request.json();
      if(body.base64){
        buffer = Buffer.from(body.base64.replace(/^data:[^;]+;base64,/,'') ,'base64');
        mime = body.mime || 'application/octet-stream';
      } else if(body.text){
        providedText = body.text;
        mime = 'text/plain';
        buffer = Buffer.from(providedText, 'utf8');
      } else if(body.bucketObject){
        buffer = await fetchBucketObject(body.bucketObject);
        mime = body.mime || 'application/octet-stream';
        source='bucketObject';
      } else {
        return json({ success:false, error:'Aucun contenu fourni' }, { status:400 });
      }
    } else {
      return json({ success:false, error:'Content-Type non supporté' }, { status:415 });
    }
    if(!buffer) return json({ success:false, error:'Buffer vide' }, { status:400 });
    if(buffer.length > MAX_SIZE_BYTES){
      return json({ success:false, error:'Fichier trop volumineux' }, { status:413 });
    }
    if(!mime){
      // heuristique simple
      if(providedText) mime='text/plain'; else mime='application/octet-stream';
    }
    const hash = sha1(buffer);
    // Cache lookup
    const { data: cachedRows } = await supabase.from('file_analyses').select('*').eq('hash', hash).limit(1);
    if(cachedRows && cachedRows.length){
      return json({ success:true, cached:true, hash, analysis: cachedRows[0].analysis, mime: cachedRows[0].mime, kind: cachedRows[0].kind, excerpt: cachedRows[0].raw_excerpt });
    }
    // Déterminer kind
    let kind='other';
    if(IMAGE_MIME.test(mime)) kind='image'; else if(PDF_MIME.test(mime)) kind='pdf'; else if(TEXT_MIME.test(mime) || providedText) kind='text';

    let analysis=null; let raw_excerpt=null;
    if(kind==='image'){
      const b64 = buffer.toString('base64');
      const imgRes = await analyzeImage(b64, mime);
      analysis = imgRes.parsed || { raw: imgRes.raw };
    } else if(kind==='text'){
      const text = providedText || buffer.toString('utf8');
      raw_excerpt = text.slice(0, 8000);
      analysis = await summarizeText(text);
    } else if(kind==='pdf'){
      const ocr = await ocrOrTextExtract(buffer, mime);
      raw_excerpt = ocr.excerpt || null;
      analysis = { summary: ocr.excerpt, note: ocr.note };
    } else {
      analysis = { note: 'Type non supporté pour analyse détaillée' };
    }

    const insertPayload = {
      user_id: locals.user?.id || null,
      hash,
      mime,
      bytes: buffer.length,
      kind,
      analysis,
      raw_excerpt
    };
    await supabase.from('file_analyses').insert(insertPayload).select().limit(1);
    return json({ success:true, cached:false, hash, analysis, mime, kind, excerpt: raw_excerpt });
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}
