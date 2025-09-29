import { createClient } from '@supabase/supabase-js';

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Mode désactivation : si variables manquantes OU DISABLE_SUPABASE=1 => stub in‑memory
const disabled = !PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY || process.env.DISABLE_SUPABASE === '1';

function makeStub(){
	const builder = () => ({
		select(){ return Promise.resolve({ data: [], error:null }); },
		eq(){ return builder(); },
		order(){ return builder(); },
		limit(){ return builder(); },
		single(){ return Promise.resolve({ data:null, error:null }); },
		maybeSingle(){ return Promise.resolve({ data:null, error:null }); },
		insert(){ return Promise.resolve({ data:[], error:null }); },
		update(){ return Promise.resolve({ data:[], error:null }); },
		upsert(){ return Promise.resolve({ data:[], error:null }); },
		delete(){ return Promise.resolve({ data:[], error:null }); }
	});
	return {
		__stub: true,
		from(){ return builder(); },
		auth: { getUser: async () => ({ data:{ user:null }, error:null }) }
	};
}

export const supabase = disabled ? makeStub() : createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
export const isSupabaseEnabled = !disabled;