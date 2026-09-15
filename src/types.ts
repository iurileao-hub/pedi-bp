// @pedi-bp/core — Pediatric Blood Pressure Percentile Calculator

// ─── Input types ───

export type Sex = 'male' | 'female';

export type BpSource = 'auto' | 'aap2017' | 'nhlbi' | 'erica' | 'lo2013';

export interface BpInput {
  sex: Sex;
  /** Age in months (1–204) */
  ageMonths: number;
  /** Height in cm (optional — enables height-dependent lookup) */
  heightCm?: number;
  /** Systolic blood pressure in mmHg */
  systolic?: number;
  /** Diastolic blood pressure in mmHg */
  diastolic?: number;
  /** Data source selection (default: 'auto') */
  source?: BpSource;
}

// ─── Output types ───

export interface BpResult {
  systolic?: BpPercentileResult;
  diastolic?: BpPercentileResult;
  classification: BpClassification;
  source: BpSourceInfo;
  /** Height percentile used for lookup (if height was provided) */
  heightPercentile?: number;
}

export interface BpPercentileResult {
  /** BP value in mmHg (echo of input) */
  value: number;
  /** Calculated percentile (0–100) */
  percentile: number;
  /** Equivalent z-score */
  zScore: number;
  /** Reference values for context */
  references: {
    p50: number;
    p90: number;
    p95: number;
  };
}

export type BpCategory = 'normal' | 'elevated' | 'stage1' | 'stage2';

export interface BpClassification {
  category: BpCategory;
  /** Localized label (e.g. "PA Elevada", "HTN Stage 1") */
  label: string;
  /** Whether classification used percentile-based or absolute thresholds */
  basedOn: 'percentile' | 'absolute';
}

export interface BpSourceInfo {
  /** ID of the source used for calculation */
  used: string;
  /** Localized human-readable label */
  label: string;
  /** Alternative sources available for this age/sex/height */
  alternatives: BpAlternative[];
}

export interface BpAlternative {
  id: string;
  label: string;
  available: boolean;
}

export interface BpReferenceInput {
  sex: Sex;
  ageMonths: number;
  heightCm?: number;
  /** Desired percentile (0–100) */
  percentile: number;
  type: 'systolic' | 'diastolic';
  source?: BpSource;
}

// ─── Internal types ───

export type Locale = 'pt-BR' | 'en' | 'es';

export interface I18nStrings {
  classifications: Record<BpCategory, string>;
  sources: Record<string, string>;
}

/** Gaussian parameters for a single (age, sex, height_percentile) point */
export interface GaussianRow {
  age_months: number;
  sbp_mean: number;
  sbp_sd: number;
  dbp_mean: number;
  dbp_sd: number;
  height_percentile: number | null;
}

/** ERICA polynomial coefficients for one BP type */
export interface EricaCoefficients {
  intercept: number;
  age_minus_15: number;
  age_minus_15_sq: number;
  age_minus_15_cu: number;
  age_minus_15_qu: number;
  zht: number;
  zht_sq: number;
  zht_cu: number;
  zht_qu: number;
  residual_sd: number;
}

/** LMS row for height-for-age reference */
export interface HeightLmsRow {
  age: number;
  L: number;
  M: number;
  S: number;
}
