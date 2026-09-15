import type { Locale, I18nStrings } from '../types.js';
import { ptBR } from './pt-BR.js';
import { en } from './en.js';
import { es } from './es.js';

const locales: Record<Locale, I18nStrings> = {
  'pt-BR': ptBR,
  en,
  es,
};

/**
 * Get localized strings for a given locale.
 * Falls back to pt-BR if the locale is not found.
 */
export function getStrings(locale: Locale | string = 'pt-BR'): I18nStrings {
  return locales[locale as Locale] || ptBR;
}
