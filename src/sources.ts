/**
 * Source cascade logic for BP reference data selection.
 *
 * Determines which data source to use based on age, sex, height availability,
 * and user preference. Also reports available alternatives for transparency.
 *
 * Cascade (source = 'auto'):
 *   - < 12 months: Gemelli 1990 (height-independent, 1–9 months)
 *   - ≥ 12 months with height:
 *     - ≥ 144 months (12y): ERICA (Brazilian data, default for 12–17y)
 *     - < 144 months: AAP 2017 (Flynn, excludes obese)
 *   - ≥ 12 months without height:
 *     - ≥ 36 months: Lo 2013 (height-independent, 3–17y)
 *     - < 36 months: NHLBI with P50 height fallback
 */

import type { Sex, BpSource, BpSourceInfo, BpAlternative, Locale } from './types.js';
import { getStrings } from './i18n/index.js';

interface SourceAvailability {
  id: string;
  available: boolean;
}

/**
 * Determine which sources are available for a given patient profile.
 */
function checkAvailability(ageMonths: number, hasHeight: boolean): SourceAvailability[] {
  const sources: SourceAvailability[] = [];

  // Gemelli: 1–9 months (data at 1, 3, 6, 9 months)
  sources.push({
    id: 'gemelli1990',
    available: ageMonths >= 1 && ageMonths <= 11,
  });

  // AAP 2017: 12–204 months (1–17y), requires height
  sources.push({
    id: 'aap2017',
    available: ageMonths >= 12 && ageMonths <= 204 && hasHeight,
  });

  // NHLBI: 12–204 months (1–17y), requires height (or uses P50 fallback)
  sources.push({
    id: 'nhlbi',
    available: ageMonths >= 12 && ageMonths <= 204,
  });

  // Lo 2013: 36–204 months (3–17y), height-independent
  sources.push({
    id: 'lo2013',
    available: ageMonths >= 36 && ageMonths <= 204,
  });

  // ERICA: 144–204 months (12–17y), requires height
  sources.push({
    id: 'erica',
    available: ageMonths >= 144 && ageMonths <= 204 && hasHeight,
  });

  return sources;
}

/**
 * Resolve the 'auto' source based on the cascade logic.
 */
function resolveAutoSource(ageMonths: number, hasHeight: boolean): string {
  if (ageMonths < 12) {
    return 'gemelli1990';
  }

  if (hasHeight) {
    if (ageMonths >= 144) {
      return 'erica'; // Brazilian data for 12-17 years
    }
    return 'aap2017';
  }

  // No height
  if (ageMonths >= 36) {
    return 'lo2013';
  }

  // 12-35 months without height: use NHLBI with P50 fallback
  return 'nhlbi';
}

/**
 * Resolve source selection and build source info with alternatives.
 *
 * @param sex - Patient sex
 * @param ageMonths - Age in months
 * @param hasHeight - Whether height was provided
 * @param requestedSource - User-requested source ('auto' or specific)
 * @param locale - Locale for labels
 * @returns Source info including which source to use and available alternatives
 * @throws Error if requested source is not available for this patient
 */
export function resolveSource(
  sex: Sex,
  ageMonths: number,
  hasHeight: boolean,
  requestedSource: BpSource = 'auto',
  locale: Locale = 'pt-BR'
): { sourceId: string; info: BpSourceInfo } {
  const strings = getStrings(locale);
  const availability = checkAvailability(ageMonths, hasHeight);

  let sourceId: string;

  if (requestedSource === 'auto') {
    sourceId = resolveAutoSource(ageMonths, hasHeight);
  } else {
    sourceId = requestedSource;
    const src = availability.find((s) => s.id === sourceId);
    if (!src || !src.available) {
      throw new Error(
        `Source '${sourceId}' is not available for age ${ageMonths} months` +
          (hasHeight ? ' with height' : ' without height')
      );
    }
  }

  // Build alternatives list (exclude the one being used)
  const alternatives: BpAlternative[] = availability
    .filter((s) => s.id !== sourceId)
    .map((s) => ({
      id: s.id,
      label: strings.sources[s.id] || s.id,
      available: s.available,
    }));

  return {
    sourceId,
    info: {
      used: sourceId,
      label: strings.sources[sourceId] || sourceId,
      alternatives,
    },
  };
}

/**
 * List all available sources for a given patient profile.
 * Public API — used to show options in the UI before calculation.
 */
export function availableSources(
  sex: Sex,
  ageMonths: number,
  heightCm?: number,
  locale: Locale = 'pt-BR'
): BpSourceInfo {
  const hasHeight = heightCm != null;
  const { info } = resolveSource(sex, ageMonths, hasHeight, 'auto', locale);
  return info;
}
