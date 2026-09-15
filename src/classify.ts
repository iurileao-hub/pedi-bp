/**
 * Blood pressure classification per AAP 2017 / SBP 2019 guidelines.
 *
 * Classification rules change at age 13:
 * - < 13 years: percentile-based (P90, P95, P95+12)
 * - ≥ 13 years: absolute thresholds (120/80, 130/80, 140/90)
 *
 * The final classification is the WORST between SBP and DBP.
 */

import type { BpCategory, BpClassification, Locale } from './types.js';
import { getStrings } from './i18n/index.js';

interface PercentileValues {
  sbpPercentile?: number;
  dbpPercentile?: number;
  systolic?: number;
  diastolic?: number;
  /** P95 values for SBP/DBP (needed for Stage 1 vs Stage 2 boundary) */
  sbpP95?: number;
  dbpP95?: number;
}

// Category severity order for comparison
const SEVERITY: Record<BpCategory, number> = {
  normal: 0,
  elevated: 1,
  stage1: 2,
  stage2: 3,
};

/**
 * Classify a single BP component (SBP or DBP) using percentile thresholds.
 * For children < 13 years.
 */
function classifyByPercentile(
  percentile: number,
  observedBp: number,
  p95: number,
  isSystemic: boolean
): BpCategory {
  // Stage 2: ≥ P95 + 12 mmHg
  if (observedBp >= p95 + 12) return 'stage2';

  // Stage 1: P95 to P95 + 12
  if (percentile >= 95) return 'stage1';

  // Elevated: P90 to < P95
  // For SBP: also elevated if ≥ 120 (even if percentile < 90)
  // For DBP: also elevated if ≥ 80 (even if percentile < 90)
  if (percentile >= 90) return 'elevated';
  if (isSystemic && observedBp >= 120) return 'elevated';
  if (!isSystemic && observedBp >= 80) return 'elevated';

  return 'normal';
}

/**
 * Classify a single BP component using absolute thresholds.
 * For adolescents ≥ 13 years.
 */
function classifyByAbsolute(value: number, type: 'systolic' | 'diastolic'): BpCategory {
  if (type === 'systolic') {
    if (value >= 140) return 'stage2';
    if (value >= 130) return 'stage1';
    if (value >= 120) return 'elevated';
    return 'normal';
  } else {
    if (value >= 90) return 'stage2';
    if (value >= 80) return 'stage1';
    // For DBP, there is no "elevated" category with absolute thresholds
    // (elevated is SBP 120-129 AND DBP < 80)
    return 'normal';
  }
}

/**
 * Return the worse (higher severity) of two categories.
 */
function worse(a: BpCategory, b: BpCategory): BpCategory {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

/**
 * Classify blood pressure per AAP 2017 guidelines.
 *
 * @param ageMonths - Patient age in months
 * @param values - Percentile and observed BP values
 * @param locale - Locale for classification label
 * @returns Classification with category, label, and method used
 */
export function classifyBp(
  ageMonths: number,
  values: PercentileValues,
  locale: Locale = 'pt-BR'
): BpClassification {
  const strings = getStrings(locale);
  const isChild = ageMonths < 156; // < 13 years

  let category: BpCategory = 'normal';
  let basedOn: 'percentile' | 'absolute';

  if (isChild) {
    basedOn = 'percentile';

    if (values.sbpPercentile != null && values.systolic != null && values.sbpP95 != null) {
      const sbpCat = classifyByPercentile(
        values.sbpPercentile,
        values.systolic,
        values.sbpP95,
        true
      );
      category = worse(category, sbpCat);
    }

    if (values.dbpPercentile != null && values.diastolic != null && values.dbpP95 != null) {
      const dbpCat = classifyByPercentile(
        values.dbpPercentile,
        values.diastolic,
        values.dbpP95,
        false
      );
      category = worse(category, dbpCat);
    }
  } else {
    // ≥ 13 years: use absolute thresholds
    basedOn = 'absolute';

    if (values.systolic != null) {
      category = worse(category, classifyByAbsolute(values.systolic, 'systolic'));
    }

    if (values.diastolic != null) {
      category = worse(category, classifyByAbsolute(values.diastolic, 'diastolic'));
    }
  }

  return {
    category,
    label: strings.classifications[category],
    basedOn,
  };
}
