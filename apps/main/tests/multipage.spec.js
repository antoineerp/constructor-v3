import { describe, it, expect } from 'vitest';

// Test fumée: structure de réponse attendue (sans exécuter serveur SvelteKit complet)
// Ici on vérifie seulement que le module exporte une fonction POST.

import * as mp from '../src/routes/api/compile/multipage/+server.js';

describe('multipage compile endpoint module', () => {
  it('expose POST handler', () => {
    expect(typeof mp.POST).toBe('function');
  });
});
