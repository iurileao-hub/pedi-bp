/**
 * Gaussian lookup for BP reference data.
 *
 * Given (age, sex, height_percentile), finds the matching Gaussian row
 * from AAP2017, NHLBI, Lo2013, or Gemelli datasets.
 *
 * For height-dependent sources (AAP2017, NHLBI), matches to the nearest
 * of 7 discrete height percentile levels: 5, 10, 25, 50, 75, 90, 95.
 */

import type { GaussianRow } from './types.js';

// Height percentile bins used in AAP2017 and NHLBI data
const HEIGHT_PERCENTILE_BINS = [5, 10, 25, 50, 75, 90, 95];

/** Find the nearest height percentile bin */
function nearestHeightBin(percentile: number): number {
  let best = HEIGHT_PERCENTILE_BINS[0];
  let bestDist = Math.abs(percentile - best);

  for (let i = 1; i < HEIGHT_PERCENTILE_BINS.length; i++) {
    const dist = Math.abs(percentile - HEIGHT_PERCENTILE_BINS[i]);
    if (dist < bestDist) {
      best = HEIGHT_PERCENTILE_BINS[i];
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Interpolates between two Gaussian rows based on age.
 * Linearly interpolates mean and SD values.
 */
function interpolateRows(lo: GaussianRow, hi: GaussianRow, ageMonths: number): GaussianRow {
  const denom = hi.age_months - lo.age_months;
  if (denom === 0) return lo; // identical ages — no interpolation
  const t = (ageMonths - lo.age_months) / denom;
  return {
    age_months: ageMonths,
    sbp_mean: lo.sbp_mean + t * (hi.sbp_mean - lo.sbp_mean),
    sbp_sd: lo.sbp_sd + t * (hi.sbp_sd - lo.sbp_sd),
    dbp_mean: lo.dbp_mean + t * (hi.dbp_mean - lo.dbp_mean),
    dbp_sd: lo.dbp_sd + t * (hi.dbp_sd - lo.dbp_sd),
    height_percentile: lo.height_percentile,
  };
}

/**
 * Finds the bracketing rows and interpolates for a given age
 * from a height-filtered subset.
 */
function lookupWithInterpolation(rows: GaussianRow[], ageMonths: number): GaussianRow {
  // Edge cases
  if (rows.length === 1) return rows[0];
  if (ageMonths <= rows[0].age_months) return rows[0];
  if (ageMonths >= rows[rows.length - 1].age_months) return rows[rows.length - 1];

  // Find bracketing rows
  let lo = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].age_months <= ageMonths) lo = i;
    else break;
  }
  const hi = Math.min(lo + 1, rows.length - 1);

  if (rows[lo].age_months === ageMonths) return rows[lo];
  return interpolateRows(rows[lo], rows[hi], ageMonths);
}

export interface LookupResult {
  sbpMean: number;
  sbpSd: number;
  dbpMean: number;
  dbpSd: number;
}

/**
 * Lookup Gaussian parameters for height-dependent sources (AAP2017, NHLBI).
 *
 * @param data - Full dataset rows
 * @param ageMonths - Patient age in months
 * @param heightPercentile - Patient height percentile (0-100)
 * @returns Gaussian parameters (mean, SD) for SBP and DBP
 */
export function lookupGaussianWithHeight(
  data: GaussianRow[],
  ageMonths: number,
  heightPercentile: number
): LookupResult {
  const htBin = nearestHeightBin(heightPercentile);

  // Filter to matching height percentile bin
  const filtered = data.filter((r) => r.height_percentile === htBin);

  const row = lookupWithInterpolation(filtered, ageMonths);

  return {
    sbpMean: row.sbp_mean,
    sbpSd: row.sbp_sd,
    dbpMean: row.dbp_mean,
    dbpSd: row.dbp_sd,
  };
}

/**
 * Lookup Gaussian parameters for height-independent sources (Lo2013, Gemelli).
 *
 * @param data - Dataset rows (no height_percentile dimension)
 * @param ageMonths - Patient age in months
 * @returns Gaussian parameters (mean, SD) for SBP and DBP
 */
export function lookupGaussianNoHeight(data: GaussianRow[], ageMonths: number): LookupResult {
  const row = lookupWithInterpolation(data, ageMonths);

  return {
    sbpMean: row.sbp_mean,
    sbpSd: row.sbp_sd,
    dbpMean: row.dbp_mean,
    dbpSd: row.dbp_sd,
  };
}

/**
 * Compute BP references (P50, P90, P95) from Gaussian parameters.
 */
export function gaussianReferences(
  mean: number,
  sd: number
): { p50: number; p90: number; p95: number } {
  // z-scores for these percentiles
  const z90 = 1.2815515655;
  const z95 = 1.644853627;
  return {
    p50: Math.round(mean * 10) / 10,
    p90: Math.round((mean + z90 * sd) * 10) / 10,
    p95: Math.round((mean + z95 * sd) * 10) / 10,
  };
}
