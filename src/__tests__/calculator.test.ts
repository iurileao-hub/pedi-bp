import { describe, it, expect } from 'vitest';
import { calculateBp, bpAtPercentile } from '../calculator.js';

describe('calculateBp — Gaussian sources', () => {
  it('calculates for 10y boy with height (AAP 2017)', async () => {
    const result = await calculateBp({
      sex: 'male',
      ageMonths: 120,
      heightCm: 138,
      systolic: 110,
      diastolic: 70,
    });

    expect(result.source.used).toBe('aap2017');
    expect(result.systolic).toBeDefined();
    expect(result.diastolic).toBeDefined();
    expect(result.systolic!.value).toBe(110);
    expect(result.systolic!.percentile).toBeGreaterThan(0);
    expect(result.systolic!.percentile).toBeLessThan(100);
    expect(result.diastolic!.percentile).toBeGreaterThan(0);
    expect(result.heightPercentile).toBeDefined();
    expect(result.classification).toBeDefined();
  });

  it('calculates for 5y girl without height (Lo 2013)', async () => {
    const result = await calculateBp({
      sex: 'female',
      ageMonths: 60,
      systolic: 100,
      diastolic: 60,
    });

    expect(result.source.used).toBe('lo2013');
    expect(result.heightPercentile).toBeUndefined();
    expect(result.systolic!.percentile).toBeGreaterThan(0);
  });

  it('calculates for 6mo infant (Gemelli)', async () => {
    const result = await calculateBp({
      sex: 'male',
      ageMonths: 6,
      systolic: 90,
      diastolic: 55,
    });

    expect(result.source.used).toBe('gemelli1990');
    expect(result.systolic!.percentile).toBeGreaterThan(0);
  });

  it('provides reference values (P50, P90, P95)', async () => {
    const result = await calculateBp({
      sex: 'male',
      ageMonths: 120,
      heightCm: 138,
      systolic: 110,
      diastolic: 70,
    });

    expect(result.systolic!.references.p50).toBeGreaterThan(80);
    expect(result.systolic!.references.p90).toBeGreaterThan(result.systolic!.references.p50);
    expect(result.systolic!.references.p95).toBeGreaterThan(result.systolic!.references.p90);
  });

  it('handles SBP only (no DBP)', async () => {
    const result = await calculateBp({
      sex: 'male',
      ageMonths: 120,
      heightCm: 138,
      systolic: 110,
    });

    expect(result.systolic).toBeDefined();
    expect(result.diastolic).toBeUndefined();
    expect(result.classification.category).toBeDefined();
  });
});

describe('calculateBp — ERICA source', () => {
  it('uses ERICA for 14y boy with height', async () => {
    const result = await calculateBp({
      sex: 'male',
      ageMonths: 168,
      heightCm: 165,
      systolic: 125,
      diastolic: 75,
    });

    expect(result.source.used).toBe('erica');
    expect(result.systolic!.percentile).toBeGreaterThan(50);
    expect(result.heightPercentile).toBeDefined();
  });

  it('uses explicit aap2017 for 14y boy when requested', async () => {
    const result = await calculateBp({
      sex: 'male',
      ageMonths: 168,
      heightCm: 165,
      systolic: 125,
      diastolic: 75,
      source: 'aap2017',
    });

    expect(result.source.used).toBe('aap2017');
  });
});

describe('calculateBp — classification', () => {
  it('classifies normal for typical child', async () => {
    const result = await calculateBp({
      sex: 'female',
      ageMonths: 96,
      heightCm: 128,
      systolic: 95,
      diastolic: 58,
    });

    expect(result.classification.category).toBe('normal');
  });

  it('classifies using absolute thresholds for ≥ 13y', async () => {
    const result = await calculateBp({
      sex: 'male',
      ageMonths: 180,
      heightCm: 170,
      systolic: 135,
      diastolic: 85,
    });

    expect(result.classification.basedOn).toBe('absolute');
    expect(result.classification.category).toBe('stage1');
  });
});

describe('calculateBp — i18n', () => {
  it('returns pt-BR labels by default', async () => {
    const result = await calculateBp({
      sex: 'male',
      ageMonths: 180,
      heightCm: 170,
      systolic: 135,
      diastolic: 70,
    });

    expect(result.classification.label).toBe('HAS Estágio 1');
    expect(result.source.label).toContain('ERICA');
  });

  it('returns English labels', async () => {
    const result = await calculateBp(
      {
        sex: 'male',
        ageMonths: 180,
        heightCm: 170,
        systolic: 135,
        diastolic: 70,
      },
      'en'
    );

    expect(result.classification.label).toBe('HTN Stage 1');
    expect(result.source.label).toContain('ERICA');
  });
});

describe('calculateBp — input validation', () => {
  it('rejects invalid sex', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calculateBp({ sex: 'other' as any, ageMonths: 120, systolic: 110 })
    ).rejects.toThrow(/Invalid sex/);
  });

  it('rejects NaN ageMonths', async () => {
    await expect(calculateBp({ sex: 'male', ageMonths: NaN, systolic: 110 })).rejects.toThrow(
      /Invalid ageMonths/
    );
  });

  it('rejects ageMonths out of range', async () => {
    await expect(calculateBp({ sex: 'male', ageMonths: 0, systolic: 110 })).rejects.toThrow(
      /Invalid ageMonths/
    );
    await expect(calculateBp({ sex: 'male', ageMonths: 250, systolic: 110 })).rejects.toThrow(
      /Invalid ageMonths/
    );
  });

  it('rejects negative heightCm', async () => {
    await expect(
      calculateBp({ sex: 'male', ageMonths: 120, heightCm: -5, systolic: 110 })
    ).rejects.toThrow(/Invalid heightCm/);
  });

  it('rejects Infinity systolic', async () => {
    await expect(calculateBp({ sex: 'male', ageMonths: 120, systolic: Infinity })).rejects.toThrow(
      /Invalid systolic/
    );
  });

  it('rejects negative diastolic', async () => {
    await expect(calculateBp({ sex: 'male', ageMonths: 120, diastolic: -10 })).rejects.toThrow(
      /Invalid diastolic/
    );
  });
});

describe('bpAtPercentile — input validation', () => {
  it('rejects percentile at 0', async () => {
    await expect(
      bpAtPercentile({ sex: 'male', ageMonths: 120, percentile: 0, type: 'systolic' })
    ).rejects.toThrow(/Invalid percentile/);
  });

  it('rejects percentile at 100', async () => {
    await expect(
      bpAtPercentile({ sex: 'male', ageMonths: 120, percentile: 100, type: 'systolic' })
    ).rejects.toThrow(/Invalid percentile/);
  });

  it('rejects invalid type', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bpAtPercentile({ sex: 'male', ageMonths: 120, percentile: 50, type: 'mean' as any })
    ).rejects.toThrow(/Invalid type/);
  });
});

describe('bpAtPercentile', () => {
  it('returns BP value at P50', async () => {
    const bp = await bpAtPercentile({
      sex: 'male',
      ageMonths: 120,
      heightCm: 138,
      percentile: 50,
      type: 'systolic',
    });

    expect(bp).toBeGreaterThan(80);
    expect(bp).toBeLessThan(120);
  });

  it('P95 > P50', async () => {
    const p50 = await bpAtPercentile({
      sex: 'male',
      ageMonths: 120,
      heightCm: 138,
      percentile: 50,
      type: 'systolic',
    });

    const p95 = await bpAtPercentile({
      sex: 'male',
      ageMonths: 120,
      heightCm: 138,
      percentile: 95,
      type: 'systolic',
    });

    expect(p95).toBeGreaterThan(p50);
  });

  it('roundtrip with calculateBp', async () => {
    const forwardResult = await calculateBp({
      sex: 'female',
      ageMonths: 96,
      heightCm: 128,
      systolic: 100,
    });

    const reconstructed = await bpAtPercentile({
      sex: 'female',
      ageMonths: 96,
      heightCm: 128,
      percentile: forwardResult.systolic!.percentile,
      type: 'systolic',
    });

    expect(reconstructed).toBeCloseTo(100, 0);
  });

  it('works with ERICA source for adolescents', async () => {
    const bp = await bpAtPercentile({
      sex: 'male',
      ageMonths: 180,
      heightCm: 170,
      percentile: 95,
      type: 'systolic',
    });

    expect(bp).toBeGreaterThan(120);
    expect(bp).toBeLessThan(145);
  });
});
