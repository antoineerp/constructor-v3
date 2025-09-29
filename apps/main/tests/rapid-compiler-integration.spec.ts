import { describe, it, expect } from 'vitest';

// Test d'intégration réel du Worker rapidCompiler (sans mock) – nécessite environnement Node avec support Worker (Node >=18)
// On ignore si pas supporté.

const hasWorker = typeof Worker !== 'undefined';

// Chargement dynamique pour éviter d'alourdir startup tests si Worker absent

describe('rapidCompiler integration (real worker)', () => {
  if(!hasWorker){
    it('skip (Worker non disponible)', () => {
      expect(true).toBe(true);
    });
    return;
  }
  it('compile un composant simple DOM', async () => {
    const { compileRapid } = await import('../src/lib/compile/rapidCompiler');
    const code = `<script>let c=0; function inc(){c++;}</script><button on:click={inc}>C {c}</button>`;
    const res: any = await compileRapid(code, 'Btn.svelte');
    expect(res.ok).toBe(true);
    expect(res.js).toContain('Component');
    expect(res.js.length).toBeGreaterThan(50);
  }, 20000);

  it('retourne erreur sur code invalide', async () => {
    const { compileRapid } = await import('../src/lib/compile/rapidCompiler');
    const res: any = await compileRapid('<script>let x=</script>', 'Bad.svelte');
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  }, 20000);
});
