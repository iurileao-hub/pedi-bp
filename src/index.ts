/**
 * @pedi-bp/core — Pediatric Blood Pressure Percentile Calculator
 *
 * Zero-dependency TypeScript package for calculating pediatric BP percentiles
 * using multiple reference sources (AAP 2017, NHLBI, ERICA, Lo 2013, Gemelli).
 *
 * @example
 * ```ts
 * import { calculateBp, availableSources } from '@pedi-bp/core';
 *
 * const result = await calculateBp({
 *   sex: 'male',
 *   ageMonths: 120,   // 10 years
 *   heightCm: 140,
 *   systolic: 115,
 *   diastolic: 75,
 * });
 *
 * console.log(result.classification.label);     // "PA Elevada"
 * console.log(result.source.used);              // "aap2017"
 * console.log(result.systolic?.percentile);     // ~92.3
 * ```
 */

// Public API
export { calculateBp, bpAtPercentile } from './calculator.js';
export { availableSources } from './sources.js';

// Types
export type {
  Sex,
  BpSource,
  BpInput,
  BpResult,
  BpPercentileResult,
  BpCategory,
  BpClassification,
  BpSourceInfo,
  BpAlternative,
  BpReferenceInput,
  Locale,
} from './types.js';
