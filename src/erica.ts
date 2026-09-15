/**
 * ERICA polynomial regression model for Brazilian adolescent BP percentiles.
 *
 * Reference: Jardim TV, Rosner B, Bloch KV, et al.
 * J Pediatr (Rio J). 2020;96(2):168-176. doi:10.1016/j.jped.2018.09.003
 *
 * Model:
 *   BP = intercept + poly(age - 15, 4) + poly(z_height, 4)
 *   z_bp = (observed - predicted) / residual_sd
 *
 * Valid for ages 12–17 years (144–204 months).
 * Uses z-score of height (CDC 2000) rather than height percentile.
 */

import type { Sex, EricaCoefficients } from './types.js';
import { pnorm, qnorm } from './gaussian.js';

// Lazy-loaded ERICA coefficients
let ericaBoys: { systolic: EricaCoefficients; diastolic: EricaCoefficients } | null = null;
let ericaGirls: { systolic: EricaCoefficients; diastolic: EricaCoefficients } | null = null;

interface EricaData {
  systolic: EricaCoefficients;
  diastolic: EricaCoefficients;
}

async function loadEricaData(sex: Sex): Promise<EricaData> {
  if (sex === 'male') {
    if (!ericaBoys) {
      const raw = (await import('./data/erica-boys.json', { with: { type: 'json' } })).default;
      ericaBoys = {
        systolic: raw.systolic as EricaCoefficients,
        diastolic: raw.diastolic as EricaCoefficients,
      };
    }
    return ericaBoys;
  } else {
    if (!ericaGirls) {
      const raw = (await import('./data/erica-girls.json', { with: { type: 'json' } })).default;
      ericaGirls = {
        systolic: raw.systolic as EricaCoefficients,
        diastolic: raw.diastolic as EricaCoefficients,
      };
    }
    return ericaGirls;
  }
}

/**
 * Compute the predicted BP using the ERICA polynomial model.
 *
 * BP = intercept
 *    + b1*(age-15) + b2*(age-15)^2 + b3*(age-15)^3 + b4*(age-15)^4
 *    + b5*zht + b6*zht^2 + b7*zht^3 + b8*zht^4
 */
function predictBp(coeff: EricaCoefficients, ageYears: number, zHeight: number): number {
  const a = ageYears - 15;
  const a2 = a * a;
  const a3 = a2 * a;
  const a4 = a3 * a;

  const z = zHeight;
  const z2 = z * z;
  const z3 = z2 * z;
  const z4 = z3 * z;

  return (
    coeff.intercept +
    coeff.age_minus_15 * a +
    coeff.age_minus_15_sq * a2 +
    coeff.age_minus_15_cu * a3 +
    coeff.age_minus_15_qu * a4 +
    coeff.zht * z +
    coeff.zht_sq * z2 +
    coeff.zht_cu * z3 +
    coeff.zht_qu * z4
  );
}

export interface EricaResult {
  sbpPredicted: number;
  sbpZScore: number;
  sbpPercentile: number;
  sbpSd: number;
  dbpPredicted: number;
  dbpZScore: number;
  dbpPercentile: number;
  dbpSd: number;
}

/**
 * Calculate BP percentile using the ERICA polynomial regression model.
 *
 * @param sex - Patient sex
 * @param ageMonths - Age in months (144–204, i.e. 12–17 years)
 * @param zHeight - Height z-score (CDC 2000)
 * @param systolicBp - Observed systolic BP in mmHg (optional)
 * @param diastolicBp - Observed diastolic BP in mmHg (optional)
 * @returns Predicted values, z-scores, and percentiles
 */
export async function calculateErica(
  sex: Sex,
  ageMonths: number,
  zHeight: number,
  systolicBp?: number,
  diastolicBp?: number
): Promise<EricaResult> {
  const data = await loadEricaData(sex);
  const ageYears = ageMonths / 12;

  const sbpPredicted = predictBp(data.systolic, ageYears, zHeight);
  const dbpPredicted = predictBp(data.diastolic, ageYears, zHeight);

  const sbpZScore =
    systolicBp != null ? (systolicBp - sbpPredicted) / data.systolic.residual_sd : 0;
  const dbpZScore =
    diastolicBp != null ? (diastolicBp - dbpPredicted) / data.diastolic.residual_sd : 0;

  return {
    sbpPredicted,
    sbpZScore,
    sbpPercentile: pnorm(sbpZScore) * 100,
    sbpSd: data.systolic.residual_sd,
    dbpPredicted,
    dbpZScore,
    dbpPercentile: pnorm(dbpZScore) * 100,
    dbpSd: data.diastolic.residual_sd,
  };
}

/**
 * Compute BP value at a given percentile using ERICA (inverse function).
 */
export async function ericaBpAtPercentile(
  sex: Sex,
  ageMonths: number,
  zHeight: number,
  percentile: number,
  type: 'systolic' | 'diastolic'
): Promise<number> {
  const data = await loadEricaData(sex);
  const ageYears = ageMonths / 12;
  const coeff = type === 'systolic' ? data.systolic : data.diastolic;

  const predicted = predictBp(coeff, ageYears, zHeight);
  const z = qnorm(percentile / 100);
  return predicted + z * coeff.residual_sd;
}
