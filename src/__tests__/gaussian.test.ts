import { describe, it, expect } from 'vitest';
import { pnorm, qnorm } from '../gaussian.js';

describe('pnorm (standard normal CDF)', () => {
  it('returns 0.5 for z=0', () => {
    expect(pnorm(0)).toBeCloseTo(0.5, 7);
  });

  it('returns ~0.8413 for z=1', () => {
    expect(pnorm(1)).toBeCloseTo(0.8413447, 5);
  });

  it('returns ~0.1587 for z=-1', () => {
    expect(pnorm(-1)).toBeCloseTo(0.1586553, 5);
  });

  it('returns ~0.9772 for z=2', () => {
    expect(pnorm(2)).toBeCloseTo(0.9772499, 5);
  });

  it('returns ~0.9987 for z=3', () => {
    expect(pnorm(3)).toBeCloseTo(0.9986501, 4);
  });

  it('returns 0 for extremely negative z', () => {
    expect(pnorm(-15)).toBe(0);
  });

  it('returns 1 for extremely positive z', () => {
    expect(pnorm(15)).toBe(1);
  });

  it('symmetry: pnorm(z) + pnorm(-z) ≈ 1', () => {
    for (const z of [0.5, 1, 1.5, 2, 2.5, 3]) {
      expect(pnorm(z) + pnorm(-z)).toBeCloseTo(1.0, 6);
    }
  });
});

describe('qnorm (inverse normal CDF)', () => {
  it('returns 0 for p=0.5', () => {
    expect(qnorm(0.5)).toBe(0);
  });

  it('returns ~1.6449 for p=0.95', () => {
    expect(qnorm(0.95)).toBeCloseTo(1.6449, 3);
  });

  it('returns ~1.2816 for p=0.90', () => {
    expect(qnorm(0.9)).toBeCloseTo(1.2816, 3);
  });

  it('returns ~-1.6449 for p=0.05', () => {
    expect(qnorm(0.05)).toBeCloseTo(-1.6449, 3);
  });

  it('returns -Infinity for p=0', () => {
    expect(qnorm(0)).toBe(-Infinity);
  });

  it('returns Infinity for p=1', () => {
    expect(qnorm(1)).toBe(Infinity);
  });

  it('roundtrip: pnorm(qnorm(p)) ≈ p', () => {
    for (const p of [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]) {
      expect(pnorm(qnorm(p))).toBeCloseTo(p, 6);
    }
  });

  it('roundtrip: qnorm(pnorm(z)) ≈ z', () => {
    for (const z of [-3, -2, -1, 0, 1, 2, 3]) {
      expect(qnorm(pnorm(z))).toBeCloseTo(z, 4);
    }
  });
});
