// Supabase retiré : stub minimal
export const supabase = { from(){ return { select: async () => ({ data: [], error: null }) }; }, auth:{ getUser: async () => ({ data:{ user:null }, error:null }) } };