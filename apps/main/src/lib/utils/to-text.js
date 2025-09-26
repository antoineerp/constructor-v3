// Normalise n'importe quelle valeur représentant du code en string.
export function toText(val, filename = '') {
  if (typeof val === 'string') return val;
  if (val == null) throw new TypeError(`Code vide pour ${filename}`);
  if (typeof val.formatted === 'string') return val.formatted;
  if (typeof val.original === 'string') return val.original;
  if (typeof val.code === 'string') return val.code;
  if (typeof val.content === 'string') return val.content;
  if (val instanceof Uint8Array) {
    return new TextDecoder('utf-8').decode(val);
  }
  throw new TypeError(`Attendu string pour ${filename}, reçu ${Object.prototype.toString.call(val)}`);
}
