import { describe, it, expect } from 'vitest';
import * as genApp from '../src/routes/api/generate/app/+server.js';
import * as genComp from '../src/routes/api/generate/component/+server.js';
import * as pack from '../src/routes/api/library/svelte-pack/+server.js';

function mockEvent(body){
  return { request: { json: async () => body } } as any;
}

describe('offline fallbacks generation', () => {
  it('generate/app retourne mock si clé absente', async () => {
    const res: any = await genApp.POST(mockEvent({ prompt:'App test offline' }));
    const data = await res.json();
    expect(data.success).toBe(true);
    // offline peut être flaggé directement ou implicite (absence validation)
    expect(Object.keys(data.files).length).toBeGreaterThan(0);
    expect(data.files['src/routes/+page.svelte']).toMatch(/Mock App Offline|Offline App|Offline/);
  }, 15000);
  it('generate/component retourne mock si clé absente', async () => {
    const res: any = await genComp.POST(mockEvent({ name:'DemoBox', type:'card' }));
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.code).toMatch(/<script>[\s\S]*<\/script>/);
  }, 15000);
  it('svelte-pack fournit plusieurs fichiers', async () => {
    const r: any = await pack.GET();
    const data = await r.json();
    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThan(3);
  });
});
