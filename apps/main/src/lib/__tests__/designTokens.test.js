import { describe, it, expect } from 'vitest';

import { ensureDesignTokens } from '../prompt/promptBuilders.js';

describe('ensureDesignTokens', () => {
  it('génère un set par défaut', () => {
    const bp = {};
    const tokens = ensureDesignTokens(bp);
    expect(tokens.colors.length).toBeGreaterThan(0);
    expect(tokens.radii.md).toBe('8px');
  });

  it('respecte une palette fournie', () => {
    const bp = { color_palette:['#111111','#222222'] };
    const tokens = ensureDesignTokens(bp);
    expect(tokens.colors[0]).toBe('#111111');
  });
});
