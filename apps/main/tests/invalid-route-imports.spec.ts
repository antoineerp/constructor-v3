import { describe, it, expect } from 'vitest';
import * as compileEndpoint from '../src/routes/api/projects/[id]/compile/+server.js';

function mockEvent(projectId: string, body: any){
  return { params:{ id: projectId }, request:{ json: async () => body } } as any;
}

describe('détection imports interdits de routes', () => {
  it('signale un import ../routes/about/+page.svelte', async () => {
    const files = {
      'src/routes/+page.svelte': '<script>import About from "../routes/about/+page.svelte"; console.log("use", About);</script><h1>Accueil</h1>',
      'src/routes/about/+page.svelte': '<h2>About</h2>'
    };
    const res: any = await compileEndpoint.POST(mockEvent('test1',{ files }));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.invalidImports)).toBe(true);
    expect(data.invalidImports.length).toBeGreaterThan(0);
    expect(data.invalidImports[0].spec).toContain('routes/about/+page.svelte');
  });
});
