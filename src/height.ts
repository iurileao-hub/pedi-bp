/**
 * Height percentile calculator using CDC 2000 growth charts (LMS method).
 *
 * Uses recumbent length-for-age (0–36 months) and standing stature-for-age (24–240 months).
 * The AAP 2017 and ERICA BP tables were calibrated against CDC references, not WHO.
 */

import type { Sex, HeightLmsRow } from './types.js';
import { pnorm } from './gaussian.js';

// Lazy-loaded data tables (code-split)
let lengthBoys: HeightLmsRow[] | null = null;
let lengthGirls: HeightLmsRow[] | null = null;
let statureBoys: HeightLmsRow[] | null = null;
let statureGirls: HeightLmsRow[] | null = null;

async function loadLengthData(sex: Sex): Promise<HeightLmsRow[]> {
  if (sex === 'male') {
    if (!lengthBoys) {
      lengthBoys = (await import('./data/cdc-length-boys.json', { with: { type: 'json' } })).default as HeightLmsRow[];
    }
    return lengthBoys;
  } else {
    if (!lengthGirls) {
      lengthGirls = (await import('./data/cdc-length-girls.json', { with: { type: 'json' } })).default as HeightLmsRow[];
    }
    return lengthGirls;
  }
}

async function loadStatureData(sex: Sex): Promise<HeightLmsRow[]> {
  if (sex === 'male') {
    if (!statureBoys) {
      statureBoys = (await import('./data/cdc-stature-boys.json', { with: { type: 'json' } })).default as HeightLmsRow[];
    }
    return statureBoys;
  } else {
    if (!statureGirls) {
      statureGirls = (await import('./data/cdc-stature-girls.json', { with: { type: 'json' } })).default as HeightLmsRow[];
    }
    return statureGirls;
  }
}

/**
 * Interpolates L, M, S values at a given age from the reference table.
 * Uses linear interpolation between the two nearest data points.
 */
function interpolateLms(
  table: HeightLmsRow[],
  ageMonths: number
): { L: number; M: number; S: number } {
  // Clamp to table range
  const first = table[0];
  const last = table[table.length - 1];

  if (ageMonths <= first.age) return { L: first.L, M: first.M, S: first.S };
  if (ageMonths >= last.age) return { L: last.L, M: last.M, S: last.S };

  // Find bracketing entries
  let lo = 0;
  let hi = table.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid].age <= ageMonths) lo = mid;
    else hi = mid;
  }

  const a = table[lo];
  const b = table[hi];
  const denom = b.age - a.age;
  if (denom === 0) return { L: a.L, M: a.M, S: a.S }; // identical ages
  const t = (ageMonths - a.age) / denom;

  return {
    L: a.L + t * (b.L - a.L),
    M: a.M + t * (b.M - a.M),
    S: a.S + t * (b.S - a.S),
  };
}

/**
 * Computes z-score from the LMS parameters and observed measurement.
 *
 * Standard formula: Z = ((measurement / M)^L - 1) / (L * S)
 * When L ≈ 0: Z = ln(measurement / M) / S
 */
function lmsZScore(measurement: number, L: number, M: number, S: number): number {
  if (S <= 0 || M <= 0 || measurement <= 0) return NaN;
  if (Math.abs(L) < 1e-10) {
    return Math.log(measurement / M) / S;
  }
  return (Math.pow(measurement / M, L) - 1) / (L * S);
}

/**
 * Calculate height percentile using CDC 2000 growth charts.
 *
 * For children < 24 months: uses recumbent length-for-age.
 * For children ≥ 24 months: uses standing stature-for-age.
 *
 * @returns Height percentile (0–100), or null if age is out of range.
 */
export async function heightPercentile(
  sex: Sex,
  ageMonths: number,
  heightCm: number
): Promise<number | null> {
  if (ageMonths < 0 || ageMonths > 240) return null;

  let table: HeightLmsRow[];

  if (ageMonths < 24) {
    table = await loadLengthData(sex);
  } else {
    table = await loadStatureData(sex);
  }

  const { L, M, S } = interpolateLms(table, ageMonths);
  const z = lmsZScore(heightCm, L, M, S);
  return pnorm(z) * 100;
}

/**
 * Calculate height z-score using CDC 2000 growth charts.
 * Used internally by ERICA which requires z-score rather than percentile.
 */
export async function heightZScore(
  sex: Sex,
  ageMonths: number,
  heightCm: number
): Promise<number | null> {
  if (ageMonths < 0 || ageMonths > 240) return null;

  let table: HeightLmsRow[];

  if (ageMonths < 24) {
    table = await loadLengthData(sex);
  } else {
    table = await loadStatureData(sex);
  }

  const { L, M, S } = interpolateLms(table, ageMonths);
  return lmsZScore(heightCm, L, M, S);
}
