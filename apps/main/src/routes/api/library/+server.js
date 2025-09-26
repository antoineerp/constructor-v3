import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';

export async function GET(){
  try {
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