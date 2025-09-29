import { describe, it, expect } from 'vitest';
import * as patchEndpoint from '../src/routes/api/blueprint/patch/+server.js';

function mockEvent(body){
  return { request: { json: async () => body } } as any;
}

describe('blueprint patch endpoint', () => {
  it('applique add/update/remove correctement', async () => {
    const base = { 'src/routes/+page.svelte': '<h1>Home</h1>' };
    const ops = [
      { op:'add', path:'src/routes/about/+page.svelte', content:'<h2>About</h2>' },
      { op:'update', path:'src/routes/+page.svelte', content:'<h1>Accueil</h1>' },
      { op:'remove', path:'src/routes/missing/+page.svelte' }, // devrait erreur
      { op:'remove', path:'src/routes/about/+page.svelte' }
    ];
    const res: any = await patchEndpoint.POST(mockEvent({ files: base, operations: ops }));
    const data = await res.json();
    expect(data.success).toBe(true);
    // Après add+update+remove sur about il ne reste que +page.svelte
    expect(Object.keys(data.files)).toEqual(['src/routes/+page.svelte']);
    expect(data.files['src/routes/+page.svelte']).toContain('Accueil');
    const removeError = data.errors.find(e=> e.error && e.error.includes('inexistant'));
    expect(removeError).toBeTruthy();
    const appliedOps = data.applied.map(a=> a.op);
    expect(appliedOps).toEqual(['add','update','remove']); // la tentative remove missing produit erreur -> non dans applied
  });
});
