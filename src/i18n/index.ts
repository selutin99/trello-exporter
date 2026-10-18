import { en } from './locales/en';
import { ru } from './locales/ru';
import { Locale, type MessageKey, type Messages } from './types';

export const translations: Record<Locale, Messages> = { en, ru };
export { Locale, type MessageKey, type Messages } from './types';

/**
 * Selects Russian variants and falls back to English for all other language tags
 * @param value - Language preference or Trello locale
 * @returns The supported interface locale
 */
export function chooseLocale(value: unknown): Locale {
  return typeof value === 'string' && value.toLowerCase().startsWith('ru')
    ? Locale.Russian
    : Locale.English;
}

/**
 * Renders locale messages as plain text instead of interpreted markup
 * @param locale - Supported interface language
 * @param document - Document containing data-i18n message targets
 */
export function localizePage(locale: Locale, document: Document): void {
  const strings = translations[locale];
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n ?? '';
    element.textContent = Object.hasOwn(strings, key) ? strings[key as MessageKey] : key;
  }
}
