import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { summarizeCatalog } from '$lib/catalog/components.js';

function getAuthSupabase(request){
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const client = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, authHeader ? { global: { headers: { Authorization: authHeader } } } : {});
  return { client, authHeader };
}

export async function GET({ url, request }){
  try {
    const { client } = getAuthSupabase(request);
    const id = url.searchParams.get('id');
    if(id){
      const { data, error } = await client.from('templates').select('*').eq('id', id).single();
      if(error) throw error;
      return json({ success:true, template: data });
    }
    const { data, error } = await client.from('templates').select('*').order('created_at', { ascending:false }).limit(50);
    if(error) throw error;
    return json({ success:true, templates: data });
  } catch(e){
    console.error('templates GET', e); return json({ success:false, error:e.message }, { status:500 });
  }
}

export async function POST({ request }){
  try {
    const body = await request.json();
    const { name, description, blueprint, catalogSnapshot } = body;
    if(!name) return json({ success:false, error:'name requis' }, { status:400 });
    const { client } = getAuthSupabase(request);
    // Récup user
    const { data:{ user } } = await client.auth.getUser();
    const insert = {
      name,
      description: description || '',
      blueprint_json: blueprint || null,
      components_snapshot: catalogSnapshot || null,
      user_id: user?.id || null
    };
    const { data, error } = await client.from('templates').insert(insert).select().single();
    if(error) throw error;
    return json({ success:true, template: data });
  } catch(e){
    console.error('templates POST', e); return json({ success:false, error:e.message }, { status:500 });
  }
}

export async function PUT({ request }){
  try {
    const body = await request.json();
    const { id, name, description, blueprint, catalogSnapshot } = body;
    if(!id) return json({ success:false, error:'id requis' }, { status:400 });
    const { client } = getAuthSupabase(request);
    const update = {};
    if(name) update.name = name;
    if(description!==undefined) update.description = description;
    if(blueprint) update.blueprint_json = blueprint;
    if(catalogSnapshot) update.components_snapshot = catalogSnapshot;
    const { data, error } = await client.from('templates').update(update).eq('id', id).select().single();
    if(error) throw error;
    return json({ success:true, template: data });
  } catch(e){
    console.error('templates PUT', e); return json({ success:false, error:e.message }, { status:500 });
  }
}

export async function DELETE({ url, request }){
  try {
    const id = url.searchParams.get('id');
    if(!id) return json({ success:false, error:'id requis' }, { status:400 });
    const { client } = getAuthSupabase(request);
    const { error } = await client.from('templates').delete().eq('id', id);
    if(error) throw error;
    return json({ success:true });
  } catch(e){
    console.error('templates DELETE', e); return json({ success:false, error:e.message }, { status:500 });
  }
}
