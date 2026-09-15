import { describe, it, expect } from 'vitest';
import { classifyBp } from '../classify.js';

describe('classifyBp — percentile-based (< 13 years)', () => {
  const ageMonths = 120; // 10 years (child)

  it('classifies normal (SBP < P90, DBP < P90)', () => {
    const result = classifyBp(ageMonths, {
      sbpPercentile: 60,
      dbpPercentile: 50,
      systolic: 100,
      diastolic: 60,
      sbpP95: 115,
      dbpP95: 75,
    });
    expect(result.category).toBe('normal');
    expect(result.basedOn).toBe('percentile');
  });

  it('classifies elevated (SBP P90–P95)', () => {
    const result = classifyBp(ageMonths, {
      sbpPercentile: 92,
      dbpPercentile: 50,
      systolic: 112,
      diastolic: 60,
      sbpP95: 115,
      dbpP95: 75,
    });
    expect(result.category).toBe('elevated');
  });

  it('classifies elevated when SBP ≥ 120 even if percentile < 90', () => {
    const result = classifyBp(ageMonths, {
      sbpPercentile: 85,
      dbpPercentile: 50,
      systolic: 120,
      diastolic: 60,
      sbpP95: 125,
      dbpP95: 75,
    });
    expect(result.category).toBe('elevated');
  });

  it('classifies stage 1 (SBP ≥ P95 but < P95+12)', () => {
    const result = classifyBp(ageMonths, {
      sbpPercentile: 96,
      dbpPercentile: 50,
      systolic: 118,
      diastolic: 60,
      sbpP95: 115,
      dbpP95: 75,
    });
    expect(result.category).toBe('stage1');
  });

  it('classifies stage 2 (SBP ≥ P95+12)', () => {
    const result = classifyBp(ageMonths, {
      sbpPercentile: 99,
      dbpPercentile: 50,
      systolic: 130,
      diastolic: 60,
      sbpP95: 115,
      dbpP95: 75,
    });
    expect(result.category).toBe('stage2');
  });

  it('uses worst of SBP and DBP', () => {
    const result = classifyBp(ageMonths, {
      sbpPercentile: 60,
      dbpPercentile: 96,
      systolic: 100,
      diastolic: 78,
      sbpP95: 115,
      dbpP95: 75,
    });
    expect(result.category).toBe('stage1');
  });
});

describe('classifyBp — absolute thresholds (≥ 13 years)', () => {
  const ageMonths = 168; // 14 years

  it('classifies normal (SBP < 120, DBP < 80)', () => {
    const result = classifyBp(ageMonths, {
      systolic: 115,
      diastolic: 70,
    });
    expect(result.category).toBe('normal');
    expect(result.basedOn).toBe('absolute');
  });

  it('classifies elevated (SBP 120-129, DBP < 80)', () => {
    const result = classifyBp(ageMonths, {
      systolic: 125,
      diastolic: 70,
    });
    expect(result.category).toBe('elevated');
  });

  it('classifies stage 1 (SBP 130-139)', () => {
    const result = classifyBp(ageMonths, {
      systolic: 135,
      diastolic: 70,
    });
    expect(result.category).toBe('stage1');
  });

  it('classifies stage 1 (DBP 80-89)', () => {
    const result = classifyBp(ageMonths, {
      systolic: 115,
      diastolic: 85,
    });
    expect(result.category).toBe('stage1');
  });

  it('classifies stage 2 (SBP ≥ 140)', () => {
    const result = classifyBp(ageMonths, {
      systolic: 145,
      diastolic: 70,
    });
    expect(result.category).toBe('stage2');
  });

  it('classifies stage 2 (DBP ≥ 90)', () => {
    const result = classifyBp(ageMonths, {
      systolic: 115,
      diastolic: 95,
    });
    expect(result.category).toBe('stage2');
  });

  it('uses worst of SBP and DBP', () => {
    const result = classifyBp(ageMonths, {
      systolic: 125, // elevated
      diastolic: 92, // stage 2
    });
    expect(result.category).toBe('stage2');
  });
});

describe('classifyBp — i18n labels', () => {
  it('returns pt-BR labels by default', () => {
    const result = classifyBp(168, { systolic: 135, diastolic: 70 });
    expect(result.label).toBe('HAS Estágio 1');
  });

  it('returns English labels', () => {
    const result = classifyBp(168, { systolic: 135, diastolic: 70 }, 'en');
    expect(result.label).toBe('HTN Stage 1');
  });

  it('returns Spanish labels', () => {
    const result = classifyBp(168, { systolic: 135, diastolic: 70 }, 'es');
    expect(result.label).toBe('HTA Estadio 1');
  });
});
