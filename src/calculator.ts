/**
 * Main calculator — orchestrates BP percentile calculation.
 *
 * Public API:
 *   calculateBp(input, locale?) → BpResult
 *   bpAtPercentile(input) → number
 */

import type {
  BpInput,
  BpResult,
  BpPercentileResult,
  BpReferenceInput,
  GaussianRow,
  Locale,
} from './types.js';
import { pnorm, qnorm } from './gaussian.js';
import { heightPercentile, heightZScore } from './height.js';
import {
  lookupGaussianWithHeight,
  lookupGaussianNoHeight,
  gaussianReferences,
  type LookupResult,
} from './lookup.js';
import { calculateErica, ericaBpAtPercentile } from './erica.js';
import { resolveSource } from './sources.js';
import { classifyBp } from './classify.js';

// ─── Input validation ───

const VALID_SEX = new Set(['male', 'female']);
const VALID_BP_TYPE = new Set(['systolic', 'diastolic']);

function isFinitePositive(v: number): boolean {
  return Number.isFinite(v) && v > 0;
}

function validateBpInput(input: BpInput): void {
  if (!VALID_SEX.has(input.sex)) {
    throw new Error(`Invalid sex: '${input.sex}'. Expected 'male' or 'female'.`);
  }
  if (!Number.isFinite(input.ageMonths) || input.ageMonths < 1 || input.ageMonths > 204) {
    throw new Error(`Invalid ageMonths: ${input.ageMonths}. Expected 1–204.`);
  }
  if (input.heightCm != null && !isFinitePositive(input.heightCm)) {
    throw new Error(`Invalid heightCm: ${input.heightCm}. Expected positive number.`);
  }
  if (input.systolic != null && !isFinitePositive(input.systolic)) {
    throw new Error(`Invalid systolic: ${input.systolic}. Expected positive number.`);
  }
  if (input.diastolic != null && !isFinitePositive(input.diastolic)) {
    throw new Error(`Invalid diastolic: ${input.diastolic}. Expected positive number.`);
  }
}

function validateReferenceInput(input: BpReferenceInput): void {
  if (!VALID_SEX.has(input.sex)) {
    throw new Error(`Invalid sex: '${input.sex}'. Expected 'male' or 'female'.`);
  }
  if (!Number.isFinite(input.ageMonths) || input.ageMonths < 1 || input.ageMonths > 204) {
    throw new Error(`Invalid ageMonths: ${input.ageMonths}. Expected 1–204.`);
  }
  if (input.heightCm != null && !isFinitePositive(input.heightCm)) {
    throw new Error(`Invalid heightCm: ${input.heightCm}. Expected positive number.`);
  }
  if (!Number.isFinite(input.percentile) || input.percentile <= 0 || input.percentile >= 100) {
    throw new Error(`Invalid percentile: ${input.percentile}. Expected 0 < p < 100.`);
  }
  if (!VALID_BP_TYPE.has(input.type)) {
    throw new Error(`Invalid type: '${input.type}'. Expected 'systolic' or 'diastolic'.`);
  }
}

// ─── Lazy-loaded data tables ───

let aap2017Boys: GaussianRow[] | null = null;
let aap2017Girls: GaussianRow[] | null = null;
let nhlbiBoys: GaussianRow[] | null = null;
let nhlbiGirls: GaussianRow[] | null = null;
let lo2013Boys: GaussianRow[] | null = null;
let lo2013Girls: GaussianRow[] | null = null;
let gemelliBoys: GaussianRow[] | null = null;
let gemelliGirls: GaussianRow[] | null = null;

async function loadData(sourceId: string, sex: 'male' | 'female'): Promise<GaussianRow[]> {
  switch (sourceId) {
    case 'aap2017':
      if (sex === 'male') {
        if (!aap2017Boys) {
          aap2017Boys = (await import('./data/aap2017-boys.json')).default as GaussianRow[];
        }
        return aap2017Boys;
      } else {
        if (!aap2017Girls) {
          aap2017Girls = (await import('./data/aap2017-girls.json')).default as GaussianRow[];
        }
        return aap2017Girls;
      }

    case 'nhlbi':
      if (sex === 'male') {
        if (!nhlbiBoys) {
          nhlbiBoys = (await import('./data/nhlbi-boys.json')).default as GaussianRow[];
        }
        return nhlbiBoys;
      } else {
        if (!nhlbiGirls) {
          nhlbiGirls = (await import('./data/nhlbi-girls.json')).default as GaussianRow[];
        }
        return nhlbiGirls;
      }

    case 'lo2013':
      if (sex === 'male') {
        if (!lo2013Boys) {
          lo2013Boys = (await import('./data/lo2013-boys.json')).default as GaussianRow[];
        }
        return lo2013Boys;
      } else {
        if (!lo2013Girls) {
          lo2013Girls = (await import('./data/lo2013-girls.json')).default as GaussianRow[];
        }
        return lo2013Girls;
      }

    case 'gemelli1990':
      if (sex === 'male') {
        if (!gemelliBoys) {
          gemelliBoys = (await import('./data/gemelli-boys.json')).default as GaussianRow[];
        }
        return gemelliBoys;
      } else {
        if (!gemelliGirls) {
          gemelliGirls = (await import('./data/gemelli-girls.json')).default as GaussianRow[];
        }
        return gemelliGirls;
      }

    default:
      throw new Error(`Unknown Gaussian source: ${sourceId}`);
  }
}

// ─── Gaussian BP calculation ───

function computeGaussianPercentile(
  bpValue: number,
  mean: number,
  sd: number
): { percentile: number; zScore: number } {
  if (sd <= 0) {
    // Degenerate distribution — treat as exact match at P50
    return {
      percentile: bpValue >= mean ? 100 : 0,
      zScore: bpValue >= mean ? Infinity : -Infinity,
    };
  }
  const zScore = (bpValue - mean) / sd;
  return {
    percentile: pnorm(zScore) * 100,
    zScore,
  };
}

// ─── Main calculator ───

/**
 * Calculate blood pressure percentiles and classification.
 *
 * @param input - Patient data (age, sex, height, BP values)
 * @param locale - Locale for labels (default: 'pt-BR')
 * @returns Full result with percentiles, classification, and source info
 */
export async function calculateBp(
  input: BpInput,
  locale: Locale | string = 'pt-BR'
): Promise<BpResult> {
  validateBpInput(input);
  const { sex, ageMonths, heightCm, systolic, diastolic, source = 'auto' } = input;

  // Resolve source
  const hasHeight = heightCm != null;
  const { sourceId, info: sourceInfo } = resolveSource(
    sex,
    ageMonths,
    hasHeight,
    source,
    locale as Locale
  );

  // Calculate height percentile if provided
  let htPercentile: number | undefined;
  let htZScore: number | undefined;

  if (heightCm != null) {
    const pct = await heightPercentile(sex, ageMonths, heightCm);
    if (pct != null) htPercentile = pct;

    const z = await heightZScore(sex, ageMonths, heightCm);
    if (z != null) htZScore = z;
  }

  // Delegate to source-specific calculation
  let sbpResult: BpPercentileResult | undefined;
  let dbpResult: BpPercentileResult | undefined;
  let sbpP95: number | undefined;
  let dbpP95: number | undefined;

  if (sourceId === 'erica') {
    // ERICA uses z-score of height, not percentile
    const zHt = htZScore ?? 0;
    const erica = await calculateErica(sex, ageMonths, zHt, systolic, diastolic);

    if (systolic != null) {
      sbpResult = {
        value: systolic,
        percentile: erica.sbpPercentile,
        zScore: erica.sbpZScore,
        references: {
          p50: Math.round(erica.sbpPredicted * 10) / 10,
          p90: Math.round((erica.sbpPredicted + 1.2816 * erica.sbpSd) * 10) / 10,
          p95: Math.round((erica.sbpPredicted + 1.6449 * erica.sbpSd) * 10) / 10,
        },
      };
      sbpP95 = erica.sbpPredicted + 1.6449 * erica.sbpSd;
    }

    if (diastolic != null) {
      dbpResult = {
        value: diastolic,
        percentile: erica.dbpPercentile,
        zScore: erica.dbpZScore,
        references: {
          p50: Math.round(erica.dbpPredicted * 10) / 10,
          p90: Math.round((erica.dbpPredicted + 1.2816 * erica.dbpSd) * 10) / 10,
          p95: Math.round((erica.dbpPredicted + 1.6449 * erica.dbpSd) * 10) / 10,
        },
      };
      dbpP95 = erica.dbpPredicted + 1.6449 * erica.dbpSd;
    }
  } else {
    // Gaussian sources
    const data = await loadData(sourceId, sex);

    let lookup: LookupResult;

    if (sourceId === 'gemelli1990' || sourceId === 'lo2013') {
      lookup = lookupGaussianNoHeight(data, ageMonths);
    } else {
      // aap2017 or nhlbi — need height percentile
      const effectiveHtPct = htPercentile ?? 50; // fallback to P50 if no height
      lookup = lookupGaussianWithHeight(data, ageMonths, effectiveHtPct);
    }

    const sbpRefs = gaussianReferences(lookup.sbpMean, lookup.sbpSd);
    const dbpRefs = gaussianReferences(lookup.dbpMean, lookup.dbpSd);

    if (systolic != null) {
      const { percentile, zScore } = computeGaussianPercentile(
        systolic,
        lookup.sbpMean,
        lookup.sbpSd
      );
      sbpResult = {
        value: systolic,
        percentile,
        zScore,
        references: sbpRefs,
      };
      sbpP95 = lookup.sbpMean + 1.6449 * lookup.sbpSd;
    }

    if (diastolic != null) {
      const { percentile, zScore } = computeGaussianPercentile(
        diastolic,
        lookup.dbpMean,
        lookup.dbpSd
      );
      dbpResult = {
        value: diastolic,
        percentile,
        zScore,
        references: dbpRefs,
      };
      dbpP95 = lookup.dbpMean + 1.6449 * lookup.dbpSd;
    }
  }

  // Classify
  const classification = classifyBp(
    ageMonths,
    {
      sbpPercentile: sbpResult?.percentile,
      dbpPercentile: dbpResult?.percentile,
      systolic,
      diastolic,
      sbpP95,
      dbpP95,
    },
    locale as Locale
  );

  return {
    systolic: sbpResult,
    diastolic: dbpResult,
    classification,
    source: sourceInfo,
    heightPercentile: htPercentile,
  };
}

/**
 * Compute BP value at a given percentile (inverse function).
 *
 * @param input - Patient data with desired percentile and BP type
 * @returns BP value in mmHg at the requested percentile
 */
export async function bpAtPercentile(input: BpReferenceInput): Promise<number> {
  validateReferenceInput(input);
  const { sex, ageMonths, heightCm, percentile, type, source = 'auto' } = input;

  const hasHeight = heightCm != null;
  const { sourceId } = resolveSource(sex, ageMonths, hasHeight, source);

  if (sourceId === 'erica') {
    let htZScore = 0;
    if (heightCm != null) {
      const z = await heightZScore(sex, ageMonths, heightCm);
      if (z != null) htZScore = z;
    }
    return ericaBpAtPercentile(sex, ageMonths, htZScore, percentile, type);
  }

  // Gaussian sources
  const data = await loadData(sourceId, sex);

  let lookup: LookupResult;

  if (sourceId === 'gemelli1990' || sourceId === 'lo2013') {
    lookup = lookupGaussianNoHeight(data, ageMonths);
  } else {
    let htPercentileVal = 50;
    if (heightCm != null) {
      const pct = await heightPercentile(sex, ageMonths, heightCm);
      if (pct != null) htPercentileVal = pct;
    }
    lookup = lookupGaussianWithHeight(data, ageMonths, htPercentileVal);
  }

  const mean = type === 'systolic' ? lookup.sbpMean : lookup.dbpMean;
  const sd = type === 'systolic' ? lookup.sbpSd : lookup.dbpSd;

  const z = qnorm(percentile / 100);
  return mean + z * sd;
}
