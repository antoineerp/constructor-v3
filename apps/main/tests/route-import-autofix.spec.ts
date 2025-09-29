import { describe, it, expect } from 'vitest';
import * as fixer from '../src/routes/api/fix/route-imports/+server.js';

function mockEvent(body:any){ return { request:{ json: async () => body } } as any; }

describe('auto-fix imports de routes', () => {
  it('extrait et remplace import route', async () => {
    const files = {
      'src/routes/+page.svelte': '<script>import About from "../routes/about/+page.svelte"; console.log(About);</script><h1>Home</h1>',
      'src/routes/about/+page.svelte': '<h2>About</h2>'
    };
    const res: any = await fixer.POST(mockEvent({ files }));
    const data = await res.json();
    expect(data.success).toBe(true);
    const newRoot = data.files['src/routes/+page.svelte'];
    expect(newRoot).toContain("$lib/Extracted/");
    expect(data.created.length).toBe(1);
  });
});
