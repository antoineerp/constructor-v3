import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const disabled = !PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY || process.env.DISABLE_SUPABASE === '1';

export async function handle({ event, resolve }) {
  const authHeader = event.request.headers.get('authorization');
  if (!disabled && authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        event.locals.user = { id: user.id, email: user.email };
      }
    } catch { /* ignore */ }
  }
  return resolve(event);
}
