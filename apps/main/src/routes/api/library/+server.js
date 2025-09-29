import { json } from '@sveltejs/kit';
import { supabase, isSupabaseEnabled } from '$lib/supabase.js';

export async function GET(){
  try {
    if(!isSupabaseEnabled){
      // Fallback: retourner un petit set mock (peut s'appuyer sur catalog si besoin)
      const mock = [
        { id:'mock-1', name:'HeaderPro', description:'Header mock catalogue', code:'<!-- header stub -->', category:'library', created_at: new Date().toISOString() },
        { id:'mock-2', name:'FooterPro', description:'Footer mock catalogue', code:'<!-- footer stub -->', category:'library', created_at: new Date().toISOString() }
      ];
      return json({ success:true, components: mock, offline:true });
    }
    const { data, error } = await supabase
        .from('components')
        .select('id,name,description,code,category,created_at')
        .eq('category','library')
        .order('created_at',{ ascending:false })
        .limit(100);
      if (error) throw error;
      return json({ success:true, components:data });
  } catch(e){
    return json({ success:false, error:e.message }, { status:500 });
  }
}