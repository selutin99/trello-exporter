import { en } from './locales/en';
import { ru } from './locales/ru';
import type { Locale, MessageKey, Messages } from './types';

export const translations: Record<Locale, Messages> = { en, ru };
export type { Locale, MessageKey, Messages } from './types';

/** Russian variants use Russian; all other or missing language tags fall back to English. */
export function chooseLocale(value: unknown): Locale {
  return typeof value === 'string' && value.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

/** Renders translations as plain text, never interpreted markup. */
export function localizePage(locale: Locale, document: Document): void {
  const strings = translations[locale];
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n ?? '';
    element.textContent = Object.hasOwn(strings, key) ? strings[key as MessageKey] : key;
  }
}
