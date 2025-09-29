import fs from 'fs';
import path from 'path';

// Endpoint: GET /api/external/list
// Scanne src/lib/external/* pour lister les librairies ingérées et leurs composants .svelte
// Retourne structure: { libraries: [ { id, meta, components:[{ file, name, size, lines, snippet }]} ] }

export async function GET() {
  try {
    const baseDir = path.resolve('src/lib/external');
    if (!fs.existsSync(baseDir)) {
      return new Response(JSON.stringify({ libraries: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    const entries = fs.readdirSync(baseDir).filter(f => !f.startsWith('.') && fs.statSync(path.join(baseDir, f)).isDirectory());
    const libraries = [];
    for (const lib of entries) {
      const libDir = path.join(baseDir, lib);
      const metaPath = path.join(libDir, 'meta.json');
      let meta = null;
      if (fs.existsSync(metaPath)) {
        try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { meta = { error: 'Invalid meta.json: ' + e.message }; }
      }
      const compDir = path.join(libDir, 'components');
      const components = [];
      if (fs.existsSync(compDir)) {
        const files = fs.readdirSync(compDir).filter(f => f.endsWith('.svelte'));
        for (const file of files) {
          const abs = path.join(compDir, file);
            try {
              const content = fs.readFileSync(abs, 'utf8');
              const lines = content.split(/\n/).length;
              components.push({
                file,
                name: file.replace(/\.svelte$/, ''),
                size: Buffer.byteLength(content, 'utf8'),
                lines,
                snippet: content.slice(0, 400)
              });
            } catch(e){
              components.push({ file, error: e.message });
            }
        }
      }
      libraries.push({ id: lib, meta, components });
    }
    return new Response(JSON.stringify({ libraries }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
