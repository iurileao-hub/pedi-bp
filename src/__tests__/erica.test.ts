import { describe, it, expect } from 'vitest';
import { calculateErica, ericaBpAtPercentile } from '../erica.js';

describe('calculateErica', () => {
  it('returns median SBP ≈ intercept for 15y boy at z_height=0', async () => {
    // At age=15, z_height=0, predicted BP = intercept
    // Boys SBP intercept = 113.265
    const result = await calculateErica('male', 180, 0, 113, undefined);
    expect(result.sbpPredicted).toBeCloseTo(113.265, 1);
    // SBP close to predicted → percentile near 50
    expect(result.sbpPercentile).toBeGreaterThan(45);
    expect(result.sbpPercentile).toBeLessThan(55);
  });

  it('returns median DBP ≈ intercept for 15y girl at z_height=0', async () => {
    // Girls DBP intercept = 65.983
    const result = await calculateErica('female', 180, 0, undefined, 66);
    expect(result.dbpPredicted).toBeCloseTo(65.983, 1);
    expect(result.dbpPercentile).toBeGreaterThan(45);
    expect(result.dbpPercentile).toBeLessThan(55);
  });

  it('higher BP gives higher percentile', async () => {
    const low = await calculateErica('male', 180, 0, 100, undefined);
    const high = await calculateErica('male', 180, 0, 130, undefined);
    expect(high.sbpPercentile).toBeGreaterThan(low.sbpPercentile);
  });

  it('height z-score affects predicted BP', async () => {
    // Taller adolescent → higher expected BP
    const short = await calculateErica('male', 180, -1, 115, undefined);
    const tall = await calculateErica('male', 180, 1, 115, undefined);
    expect(tall.sbpPredicted).toBeGreaterThan(short.sbpPredicted);
    // Same observed BP → lower percentile for taller child (higher expected)
    expect(tall.sbpPercentile).toBeLessThan(short.sbpPercentile);
  });

  it('age affects predicted BP for boys', async () => {
    // Older boys → higher expected SBP (due to positive age coefficient)
    const young = await calculateErica('male', 144, 0, 115, undefined); // 12y
    const old = await calculateErica('male', 204, 0, 115, undefined); // 17y
    expect(old.sbpPredicted).toBeGreaterThan(young.sbpPredicted);
  });
});

describe('ericaBpAtPercentile', () => {
  it('P50 ≈ predicted BP for 15y boy at z_height=0', async () => {
    const bp = await ericaBpAtPercentile('male', 180, 0, 50, 'systolic');
    expect(bp).toBeCloseTo(113.265, 0);
  });

  it('P95 > P50 > P5', async () => {
    const p5 = await ericaBpAtPercentile('male', 180, 0, 5, 'systolic');
    const p50 = await ericaBpAtPercentile('male', 180, 0, 50, 'systolic');
    const p95 = await ericaBpAtPercentile('male', 180, 0, 95, 'systolic');
    expect(p95).toBeGreaterThan(p50);
    expect(p50).toBeGreaterThan(p5);
  });

  it('roundtrip: calculate → percentile → bpAtPercentile', async () => {
    const result = await calculateErica('female', 168, 0.5, 110, undefined);
    const reconstructed = await ericaBpAtPercentile(
      'female',
      168,
      0.5,
      result.sbpPercentile,
      'systolic'
    );
    expect(reconstructed).toBeCloseTo(110, 0);
  });
});
