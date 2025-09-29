import { describe, it, expect } from 'vitest';
import * as compileProject from '../src/routes/api/projects/[id]/compile/+server.js';

// On ne lance pas la requête HTTP complète: on vérifie structure de l'export + un run simulé

function mockEvent(customFiles){
  return {
    params: { id: 'offline-demo' },
    request: { async json(){ return customFiles ? { files: customFiles } : {}; } },
    locals: { user: null }
  };
}

describe('sandbox project compile endpoint', () => {
  it('expose POST handler', () => {
    expect(typeof compileProject.POST).toBe('function');
  });

  it('retourne modules et wrappers (fallback offline)', async () => {
    // @ts-ignore signature dynamique provenant d'un module JS SvelteKit
    const res: any = await compileProject.POST(mockEvent());
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.modules)).toBe(true);
    const pageModule = data.modules.find(m=> m.path?.endsWith('+page.svelte'));
    expect(pageModule).toBeTruthy();
    // wrappers exposés via data.wrappers (tableau) ET recopies modules avec wrapper:true
    expect(Array.isArray(data.wrappers)).toBe(true);
  // wrapper principal racine (peut être '/+page.svelte' si aucun layout)
  expect(data.wrappers.length).toBeGreaterThan(0);
  });

  it('compile un set custom multi-fichiers (about page)', async () => {
    const files = {
      'src/routes/+page.svelte': '<h1>Home</h1>',
      'src/routes/about/+page.svelte': '<p>About</p>'
    };
    // @ts-ignore
    const res: any = await compileProject.POST(mockEvent(files));
  const data = await res.json();
    expect(data.success).toBe(true);
    const about = data.modules.find(m=> m.path==='src/routes/about/+page.svelte');
    expect(about).toBeTruthy();
    expect(data.routes).toContain('src/routes/about/+page.svelte');
  });

  it('génère wrapper dynamique pour route paramétrée', async () => {
    const files = {
      'src/routes/+page.svelte': '<h1>Home</h1>',
      'src/routes/blog/[slug]/+page.svelte': '<h1>Blog slug</h1>'
    };
    // @ts-ignore
    const res: any = await compileProject.POST(mockEvent(files));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.wrappers)).toBe(true);
    const dyn = data.wrappers.find(w=> /blog/.test(w.pattern));
    expect(dyn).toBeTruthy();
    expect(dyn.dynamic).toBe(true);
    expect(dyn.paramNames).toContain('slug');
  });
});
