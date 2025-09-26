// Script de seed pour insérer les composants "library" dans Supabase
// Usage (à la racine de apps/main) : node scripts/seedLibraryComponents.js
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
  console.error('Variables PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY manquantes');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main(){
  const componentsDir = path.join(__dirname, '../src/lib/components/site');
  const files = readdirSync(componentsDir).filter(f => f.endsWith('.svelte'));
  console.log('Fichiers détectés:', files);
  for (const file of files){
    const full = path.join(componentsDir, file);
    const code = readFileSync(full, 'utf-8');
    const name = file.replace('.svelte','');
    const { error } = await supabase.from('components').insert({
      name: 'Lib:'+name,
      type: 'ui',
      description: 'Composant library '+name,
      code,
      category: 'library',
      created_at: new Date().toISOString()
    });
    if (error) console.error('Erreur insertion', name, error.message); else console.log('Inséré', name);
  }
  console.log('Terminé.');
}

main();