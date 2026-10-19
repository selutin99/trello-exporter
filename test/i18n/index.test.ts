// @vitest-environment happy-dom
import { beforeEach, expect, test } from 'vitest';
import { localizePage, translations, Locale, chooseLocale } from '../../src/i18n';
import { loadPage } from '../helpers/browser';
beforeEach(() => loadPage('probe'));
test('every page message exists in both locales and renders as text', () => {
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    expect(Object.hasOwn(translations.en, element.dataset.i18n ?? '')).toBe(true);
    expect(Object.hasOwn(translations.ru, element.dataset.i18n ?? '')).toBe(true);
  }
  localizePage(Locale.Russian, document);
  expect(document.documentElement.lang).toBe('ru');
  expect(document.querySelector('h1')?.textContent).toBe(translations.ru.title);
  localizePage(Locale.English, document);
  expect(document.querySelector('[data-i18n="inspect"]')?.textContent).toBe(
    translations.en.inspect,
  );
  expect(document.querySelector('[data-i18n="privacy"]')?.getAttribute('href')).toBe(
    './privacy.html?lang=en',
  );
});

test('Russian and English cover the same interface keys', () => {
  expect(Object.keys(translations.ru).sort()).toEqual(Object.keys(translations.en).sort());
  expect(chooseLocale('ru-RU')).toBe('ru');
  expect(chooseLocale('fr-FR')).toBe('en');
});

test('product resources have no trailing periods and export messages exist in both locales', () => {
  for (const messages of Object.values(translations)) {
    for (const message of Object.values(messages)) expect(message.trim()).not.toMatch(/\.$/);
  }
  for (const message of Object.values(translations.ru))
    expect(message).not.toMatch(/[\u0451\u0401]/u);
  loadPage('export');
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    expect(Object.hasOwn(translations.en, element.dataset.i18n ?? '')).toBe(true);
    expect(Object.hasOwn(translations.ru, element.dataset.i18n ?? '')).toBe(true);
  }
});
