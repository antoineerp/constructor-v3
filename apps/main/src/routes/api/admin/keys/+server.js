import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import fs from 'fs';
import path from 'path';

// Fichier pour stocker les clés (seulement en dev/test, production utilise les env vars)
const KEYS_FILE = '.api-keys.json';

let runtimeKeys = {}; // Stockage en mémoire pour la session

// Charger les clés depuis le fichier ou les env vars
function loadKeys() {
  try {
    // Priorité 1: Variables d'environnement (production)
    const envKeys = {
      openai: env.OPENAI_API_KEY || '',
      claude: env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY || '',
      supabase_url: env.SUPABASE_URL || '',
      supabase_anon: env.SUPABASE_ANON_KEY || ''
    };
    
    // Priorité 2: Fichier local (développement seulement)
    if (!envKeys.openai && !envKeys.claude && fs.existsSync(KEYS_FILE)) {
      const fileKeys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
      return { ...fileKeys, ...envKeys }; // env vars prennent priorité
    }
    
    // Priorité 3: Runtime (session temporaire)
    return { ...runtimeKeys, ...envKeys };
  } catch (e) {
    console.warn('Erreur chargement clés:', e.message);
    return { openai: '', claude: '', supabase_url: '', supabase_anon: '' };
  }
}

// Sauvegarder les clés
function saveKeys(keys) {
  try {
    // En production, on ne peut que mettre à jour le runtime
    runtimeKeys = { ...runtimeKeys, ...keys };
    
    // En développement, on peut sauver dans un fichier
    if (process.env.NODE_ENV !== 'production') {
      const filtered = {};
      Object.entries(keys).forEach(([k, v]) => {
        if (v && v.trim()) filtered[k] = v.trim();
      });
      fs.writeFileSync(KEYS_FILE, JSON.stringify(filtered, null, 2));
    }
    
    return true;
  } catch (e) {
    console.error('Erreur sauvegarde clés:', e.message);
    return false;
  }
}

// Obtenir les clés actuelles (masquées)
export async function GET() {
  try {
    const keys = loadKeys();
    
    // Masquer les clés pour la sécurité
    const masked = {};
    Object.entries(keys).forEach(([key, value]) => {
      if (value) {
        if (key.includes('key') || key.includes('anon')) {
          masked[key] = value.substring(0, 8) + '***' + value.slice(-4);
        } else {
          masked[key] = value; // URL peut être visible
        }
      } else {
        masked[key] = '';
      }
    });
    
    return json({ success: true, keys: masked });
  } catch (e) {
    return json({ success: false, error: e.message }, { status: 500 });
  }
}

// Sauvegarder les clés
export async function POST({ request }) {
  try {
    const { keys } = await request.json();
    
    if (!keys || typeof keys !== 'object') {
      return json({ success: false, error: 'Format de clés invalide' }, { status: 400 });
    }
    
    const saved = saveKeys(keys);
    
    if (saved) {
      return json({ 
        success: true, 
        message: 'Clés sauvegardées avec succès',
        environment: process.env.NODE_ENV || 'development'
      });
    } else {
      return json({ success: false, error: 'Impossible de sauvegarder les clés' }, { status: 500 });
    }
  } catch (e) {
    return json({ success: false, error: e.message }, { status: 500 });
  }
}

// Tester une clé spécifique
export async function PUT({ request }) {
  try {
    const { provider, key } = await request.json();
    
    if (!provider || !key) {
      return json({ success: false, error: 'Provider et clé requis' }, { status: 400 });
    }
    
    let testResult = false;
    let error = '';
    
    if (provider === 'openai') {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        testResult = response.ok;
        if (!testResult) error = `HTTP ${response.status}`;
      } catch (e) {
        error = e.message;
      }
    } else if (provider === 'claude') {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }]
          })
        });
        testResult = response.ok;
        if (!testResult) error = `HTTP ${response.status}`;
      } catch (e) {
        error = e.message;
      }
    }
    
    return json({ 
      success: testResult, 
      provider,
      error: testResult ? null : error
    });
  } catch (e) {
    return json({ success: false, error: e.message }, { status: 500 });
  }
}

// Export des clés pour utilisation par d'autres services
export function getCurrentKeys() {
  return loadKeys();
}