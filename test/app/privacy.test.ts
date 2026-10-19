// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadPage } from '../helpers/browser';

beforeEach(() => {
  vi.resetModules();
  loadPage('privacy', '');
});
afterEach(() => vi.unstubAllGlobals());

test.each(['ru', 'en'])(
  'the notice displays only the explicitly selected language: %s',
  async (locale) => {
    loadPage('privacy', `lang=${locale}`);
    localStorage.setItem('exporter-locale', locale === 'en' ? 'ru' : 'en');
    await import('../../src/app/privacy');
    expect(document.documentElement.lang).toBe(locale);
    expect(document.querySelector('h1')?.textContent).toBe(
      locale === 'ru' ? 'Обработка данных' : 'Data handling',
    );
    expect(document.body.textContent).not.toContain(
      locale === 'ru' ? 'Archived lists' : 'Архивные списки',
    );
    expect(document.body.textContent).toContain(
      locale === 'ru'
        ? 'Архивные списки и карточки исключены'
        : 'Archived lists and cards are excluded',
    );
    expect(document.title).toContain(locale === 'ru' ? 'Обработка данных' : 'Data handling');
  },
);

test('the notice falls back to the stored interface preference without an explicit language', async () => {
  localStorage.setItem('exporter-locale', 'ru');
  await import('../../src/app/privacy');
  expect(document.documentElement.lang).toBe('ru');
});

test('unavailable preference storage still permits an explicit language and browser fallback', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  loadPage('privacy', 'lang=ru');
  await import('../../src/app/privacy');
  expect(document.documentElement.lang).toBe('ru');
  vi.resetModules();
  loadPage('privacy', '');
  vi.stubGlobal('navigator', { language: 'fr-FR' });
  await import('../../src/app/privacy');
  expect(document.documentElement.lang).toBe('en');
});
