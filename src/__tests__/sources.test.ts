import { describe, it, expect } from 'vitest';
import { resolveSource, availableSources } from '../sources.js';

describe('resolveSource — auto cascade', () => {
  it('selects gemelli1990 for infant < 12 months', () => {
    const { sourceId } = resolveSource('male', 6, false);
    expect(sourceId).toBe('gemelli1990');
  });

  it('selects aap2017 for child 1-12y with height', () => {
    const { sourceId } = resolveSource('male', 120, true);
    expect(sourceId).toBe('aap2017');
  });

  it('selects erica for adolescent 12-17y with height', () => {
    const { sourceId } = resolveSource('male', 168, true);
    expect(sourceId).toBe('erica');
  });

  it('selects lo2013 for child ≥ 3y without height', () => {
    const { sourceId } = resolveSource('male', 120, false);
    expect(sourceId).toBe('lo2013');
  });

  it('selects nhlbi for child 12-35mo without height (P50 fallback)', () => {
    const { sourceId } = resolveSource('male', 18, false);
    expect(sourceId).toBe('nhlbi');
  });

  it('selects lo2013 for adolescent without height', () => {
    const { sourceId } = resolveSource('female', 180, false);
    expect(sourceId).toBe('lo2013');
  });
});

describe('resolveSource — explicit source', () => {
  it('allows aap2017 when height is provided for eligible age', () => {
    const { sourceId } = resolveSource('male', 168, true, 'aap2017');
    expect(sourceId).toBe('aap2017');
  });

  it('allows nhlbi even without height (uses P50 fallback)', () => {
    const { sourceId } = resolveSource('male', 120, false, 'nhlbi');
    expect(sourceId).toBe('nhlbi');
  });

  it('throws when requesting erica without height', () => {
    expect(() => resolveSource('male', 168, false, 'erica')).toThrow();
  });

  it('throws when requesting erica for child under 12', () => {
    expect(() => resolveSource('male', 120, true, 'erica')).toThrow();
  });

  it('throws when requesting lo2013 for infant', () => {
    expect(() => resolveSource('male', 12, false, 'lo2013')).toThrow();
  });
});

describe('resolveSource — alternatives', () => {
  it('lists alternatives for 10y boy with height', () => {
    const { info } = resolveSource('male', 120, true);
    expect(info.used).toBe('aap2017');
    // Should have nhlbi, lo2013 as available alternatives
    const altIds = info.alternatives.map((a) => a.id);
    expect(altIds).toContain('nhlbi');
    expect(altIds).toContain('lo2013');
    // Gemelli not available at this age
    const gemelliAlt = info.alternatives.find((a) => a.id === 'gemelli1990');
    expect(gemelliAlt?.available).toBe(false);
  });

  it('lists no available alternatives for infant 6mo', () => {
    const { info } = resolveSource('male', 6, false);
    expect(info.used).toBe('gemelli1990');
    const availableAlts = info.alternatives.filter((a) => a.available);
    expect(availableAlts.length).toBe(0);
  });

  it('lists all alternatives for 14y boy with height', () => {
    const { info } = resolveSource('male', 168, true);
    expect(info.used).toBe('erica');
    const availableAlts = info.alternatives.filter((a) => a.available);
    // aap2017, nhlbi, lo2013 should all be available
    expect(availableAlts.length).toBe(3);
  });
});

describe('availableSources', () => {
  it('returns source info with auto-selected source', () => {
    const info = availableSources('female', 120, 135);
    expect(info.used).toBe('aap2017');
    expect(info.label).toContain('AAP 2017');
    expect(info.alternatives.length).toBeGreaterThan(0);
  });
});
