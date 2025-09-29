import { describe, it, expect } from 'vitest';
import { generateBlueprintProject } from '../src/lib/blueprints/generator';
import * as api from '../src/routes/api/blueprint/generate/+server.js';

function mockReq(body){
  return { json: async () => body } as any;
}

describe('blueprint multi-fichier generator', () => {
  it('génère un projet skeleton avec fichiers de base', () => {
    const out = generateBlueprintProject('skeleton-base', { includeExample:true });
    expect(out.found).toBe(true);
    expect(out.files['src/routes/+page.svelte']).toBeTruthy();
    expect(out.files['tailwind.config.cjs']).toContain('content');
  });

  it('retourne not found pour id inconnu', () => {
    const out = generateBlueprintProject('zzz-unknown');
    expect(out.found).toBe(false);
  });

  it('endpoint renvoie fichiers', async () => {
    const res: any = await api.POST({ request: mockReq({ id:'flowbite-kit', includeExample:true }) });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Object.keys(data.files).length).toBeGreaterThan(3);
  });
});
