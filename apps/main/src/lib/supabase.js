// Supabase retiré : export d'un stub minimal pour compatibilité résiduelle
function noopBuilder(){
  const chain = () => ({ select: ()=>Promise.resolve({ data:[], error:null }), eq:()=>chain(), order:()=>chain(), limit:()=>chain(), single:()=>Promise.resolve({ data:null, error:null }), maybeSingle:()=>Promise.resolve({ data:null, error:null }), insert:()=>Promise.resolve({ data:[], error:null }), update:()=>Promise.resolve({ data:[], error:null }), upsert:()=>Promise.resolve({ data:[], error:null }), delete:()=>Promise.resolve({ data:[], error:null }) });
  return chain;
}
export const supabase = { from(){ return noopBuilder()(); }, auth:{ getUser: async () => ({ data:{ user:null }, error:null }), getSession: async () => ({ data:{ session:null }, error:null }), onAuthStateChange: ()=>({ data:{ subscription:{ unsubscribe(){} } } }) } };
export const isSupabaseEnabled = false;