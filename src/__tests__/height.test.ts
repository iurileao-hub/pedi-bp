import { describe, it, expect } from 'vitest';
import { heightPercentile, heightZScore } from '../height.js';

describe('heightPercentile', () => {
  it('returns ~50th percentile for median height (boy, 120 months)', async () => {
    // CDC median for 10-year-old boy is about 138.2 cm
    const pct = await heightPercentile('male', 120, 138);
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(40);
    expect(pct!).toBeLessThan(60);
  });

  it('returns ~50th percentile for median height (girl, 120 months)', async () => {
    // CDC median for 10-year-old girl is about 138.4 cm
    const pct = await heightPercentile('female', 120, 138);
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(40);
    expect(pct!).toBeLessThan(60);
  });

  it('returns high percentile for tall child', async () => {
    const pct = await heightPercentile('male', 120, 155);
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(95);
  });

  it('returns low percentile for short child', async () => {
    const pct = await heightPercentile('male', 120, 120);
    expect(pct).not.toBeNull();
    expect(pct!).toBeLessThan(5);
  });

  it('returns null for age > 240 months', async () => {
    const pct = await heightPercentile('male', 250, 170);
    expect(pct).toBeNull();
  });

  it('returns null for negative age', async () => {
    const pct = await heightPercentile('male', -1, 50);
    expect(pct).toBeNull();
  });

  it('works for infants using recumbent length (< 24 months)', async () => {
    // CDC median length at 12 months boys ≈ 75.7 cm
    const pct = await heightPercentile('male', 12, 76);
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(40);
    expect(pct!).toBeLessThan(65);
  });

  it('works for adolescents (180 months = 15 years)', async () => {
    // CDC median for 15-year-old boy is about 170.1 cm
    const pct = await heightPercentile('male', 180, 170);
    expect(pct).not.toBeNull();
    expect(pct!).toBeGreaterThan(40);
    expect(pct!).toBeLessThan(60);
  });
});

describe('heightZScore', () => {
  it('returns ~0 for median height', async () => {
    const z = await heightZScore('male', 120, 138);
    expect(z).not.toBeNull();
    expect(z!).toBeGreaterThan(-0.5);
    expect(z!).toBeLessThan(0.5);
  });

  it('returns positive z-score for tall child', async () => {
    const z = await heightZScore('male', 120, 155);
    expect(z).not.toBeNull();
    expect(z!).toBeGreaterThan(2);
  });

  it('returns negative z-score for short child', async () => {
    const z = await heightZScore('male', 120, 120);
    expect(z).not.toBeNull();
    expect(z!).toBeLessThan(-2);
  });

  it('returns null for out of range age', async () => {
    const z = await heightZScore('male', 250, 170);
    expect(z).toBeNull();
  });
});
