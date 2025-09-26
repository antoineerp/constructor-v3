// Minimal runtime i18n helper (client-side only)
import en from './en.json';
import fr from './fr.json';

const dictionaries = { en, fr };
let current = 'fr';
const listeners = new Set();

export function setLocale(l){
  if(dictionaries[l]){ current = l; listeners.forEach(cb=> cb(current)); }
}
export function getLocale(){ return current; }
export function t(key){ return dictionaries[current][key] || dictionaries['en'][key] || key; }
export function onLocaleChange(cb){ listeners.add(cb); return () => listeners.delete(cb); }
export function availableLocales(){ return Object.keys(dictionaries); }
