import { describe, it, expect } from 'vitest';
import { calculateBp, bpAtPercentile, availableSources } from '../index.js';

/**
 * Integration tests — clinical scenarios with realistic patient data.
 * These test the full pipeline: source selection → height percentile →
 * Gaussian/ERICA lookup → percentile calculation → classification.
 */

describe('Clinical scenario: healthy 8y boy', () => {
  it('classifies normal BP correctly', async () => {
    // 8-year-old boy, 50th percentile height (~128 cm), BP 95/60
    const result = await calculateBp({
      sex: 'male',
      ageMonths: 96,
      heightCm: 128,
      systolic: 95,
      diastolic: 60,
    });

    expect(result.classification.category).toBe('normal');
    expect(result.source.used).toBe('aap2017');
    expect(result.systolic!.percentile).toBeLessThan(50);
    expect(result.diastolic!.percentile).toBeLessThan(70);
    expect(result.heightPercentile).toBeGreaterThan(30);
    expect(result.heightPercentile).toBeLessThan(70);
  });
});

describe('Clinical scenario: hypertensive 12y girl', () => {
  it('detects stage 1 hypertension', async () => {
    // 12-year-old girl, tall (95th percentile), BP 125/82
    // At 12y this is still < 13y → percentile-based classification
    const result = await calculateBp({
      sex: 'female',
      ageMonths: 144,
      heightCm: 160,
      systolic: 125,
      diastolic: 82,
    });

    // Should use ERICA (≥ 12y with height)
    expect(result.source.used).toBe('erica');
    expect(result.systolic!.percentile).toBeGreaterThan(90);
    // Classification: < 13y = percentile-based
    expect(result.classification.basedOn).toBe('percentile');
    expect(['elevated', 'stage1', 'stage2']).toContain(result.classification.category);
  });
});

describe('Clinical scenario: 15y boy with high BP', () => {
  it('uses absolute thresholds for classification', async () => {
    // 15-year-old boy, average height, BP 140/90
    const result = await calculateBp({
      sex: 'male',
      ageMonths: 180,
      heightCm: 170,
      systolic: 140,
      diastolic: 90,
    });

    expect(result.source.used).toBe('erica');
    expect(result.classification.basedOn).toBe('absolute');
    expect(result.classification.category).toBe('stage2');
  });
});

describe('Clinical scenario: infant 6mo', () => {
  it('uses Gemelli for infants', async () => {
    // 6-month-old boy, BP 92/56
    const result = await calculateBp({
      sex: 'male',
      ageMonths: 6,
      systolic: 92,
      diastolic: 56,
    });

    expect(result.source.used).toBe('gemelli1990');
    expect(result.systolic!.percentile).toBeGreaterThan(30);
    expect(result.systolic!.percentile).toBeLessThan(70);
    // No alternatives for this age
    const availableAlts = result.source.alternatives.filter((a) => a.available);
    expect(availableAlts.length).toBe(0);
  });
});

describe('Clinical scenario: no height provided', () => {
  it('falls back to Lo 2013 for school-age child', async () => {
    // 8-year-old girl, no height, BP 105/65
    const result = await calculateBp({
      sex: 'female',
      ageMonths: 96,
      systolic: 105,
      diastolic: 65,
    });

    expect(result.source.used).toBe('lo2013');
    expect(result.heightPercentile).toBeUndefined();
    expect(result.classification.category).toBeDefined();
  });
});

describe('Clinical scenario: source switching', () => {
  it('allows switching from ERICA to AAP 2017', async () => {
    const ericaResult = await calculateBp({
      sex: 'male',
      ageMonths: 168,
      heightCm: 165,
      systolic: 120,
      diastolic: 75,
    });

    const aapResult = await calculateBp({
      sex: 'male',
      ageMonths: 168,
      heightCm: 165,
      systolic: 120,
      diastolic: 75,
      source: 'aap2017',
    });

    expect(ericaResult.source.used).toBe('erica');
    expect(aapResult.source.used).toBe('aap2017');
    // Both should calculate valid percentiles (may differ)
    expect(ericaResult.systolic!.percentile).toBeGreaterThan(0);
    expect(aapResult.systolic!.percentile).toBeGreaterThan(0);
  });
});

describe('availableSources', () => {
  it('reports correct sources for 10y boy with height', () => {
    const info = availableSources('male', 120, 138);
    expect(info.used).toBe('aap2017');
    const altIds = info.alternatives.filter((a) => a.available).map((a) => a.id);
    expect(altIds).toContain('nhlbi');
    expect(altIds).toContain('lo2013');
    expect(altIds).not.toContain('erica');
    expect(altIds).not.toContain('gemelli1990');
  });

  it('reports ERICA for 14y girl with height', () => {
    const info = availableSources('female', 168, 160);
    expect(info.used).toBe('erica');
    const altIds = info.alternatives.filter((a) => a.available).map((a) => a.id);
    expect(altIds).toContain('aap2017');
    expect(altIds).toContain('nhlbi');
    expect(altIds).toContain('lo2013');
  });
});

describe('bpAtPercentile — clinical references', () => {
  it('P90 and P95 make clinical sense for 10y boy', async () => {
    const p90 = await bpAtPercentile({
      sex: 'male',
      ageMonths: 120,
      heightCm: 138,
      percentile: 90,
      type: 'systolic',
    });

    const p95 = await bpAtPercentile({
      sex: 'male',
      ageMonths: 120,
      heightCm: 138,
      percentile: 95,
      type: 'systolic',
    });

    // For a 10y boy, P90 SBP should be around 107-112
    expect(p90).toBeGreaterThan(100);
    expect(p90).toBeLessThan(120);
    // P95 > P90
    expect(p95).toBeGreaterThan(p90);
    // P95 should be around 110-118
    expect(p95).toBeGreaterThan(105);
    expect(p95).toBeLessThan(125);
  });
});
