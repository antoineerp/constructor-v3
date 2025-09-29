import { describe, it, expect } from 'vitest';

import { detectCapabilities } from '../catalog/capabilities.js';

describe('detectCapabilities', () => {
  it('détecte blog et marketing', () => {
    const blueprint = { goals: 'Créer un blog marketing avec articles et pricing', routes:[{path:'/'}] };
    const hits = detectCapabilities(blueprint);
    const ids = hits.map(h=>h.id);
    expect(ids).toContain('blog');
    expect(ids).toContain('marketing');
  });

  it('retourne vide si blueprint absent', () => {
    const hits = detectCapabilities(null);
    expect(hits).toEqual([]);
  });
});
