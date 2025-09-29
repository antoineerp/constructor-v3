import { describe, it, expect } from 'vitest';
import { blueprints, findBlueprint } from '../src/lib/blueprints/registry';

describe('blueprints registry', () => {
  it('contient au moins 1 blueprint', () => {
    expect(blueprints.length).toBeGreaterThan(0);
  });
  it('findBlueprint retourne un blueprint existant', () => {
    const bp = findBlueprint('skeleton-base');
    expect(bp).toBeDefined();
    expect(bp?.approved).toContain('skeleton');
  });
  it('findBlueprint retourne undefined pour id inconnu', () => {
    expect(findBlueprint('unknown-xyz')).toBeUndefined();
  });
});
