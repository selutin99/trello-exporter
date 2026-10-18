// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ProbeController } from '../src/core';
import { ProbeView } from '../src/app/view';
import { downloadJson } from '../src/app/download';
import { localizePage, translations } from '../src/i18n';

const html = readFileSync(new NodeURL('../src/pages/probe.html', import.meta.url), 'utf8');

beforeEach(() => {
  document.body.innerHTML = /<body>([\s\S]*?)<\/body>/.exec(html)?.[1] ?? '';
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

test('every page message exists in both locales and renders as text', () => {
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    expect(Object.hasOwn(translations.en, element.dataset.i18n ?? '')).toBe(true);
    expect(Object.hasOwn(translations.ru, element.dataset.i18n ?? '')).toBe(true);
  }
  localizePage('ru', document);
  expect(document.documentElement.lang).toBe('ru');
  expect(document.querySelector('h1')?.textContent).toBe(translations.ru.title);
  localizePage('en', document);
  expect(document.querySelector('[data-i18n="inspect"]')?.textContent).toBe(translations.en.inspect);
});

test('board names and diagnostic content cannot inject HTML', () => {
  const model = new ProbeController('TEST0001');
  model.record({ code: 'TEST_BOARD_VERIFIED', board: { id: 'a'.repeat(24), shortLink: 'TEST0001', name: '<img src=x onerror=alert(1)>', closed: false } });
  new ProbeView(document).render('en', model, 'TEST0001', true, true);
  expect(document.querySelector('#results img')).toBeNull();
  expect(document.querySelector('#results')?.textContent).toContain('<img');
});

test('busy state disables competing operations and cancellation restores controls', async () => {
  const view = new ProbeView(document);
  const model = new ProbeController('TEST0001', () => view.render('en', model, 'TEST0001', true, true));
  const pending = model.run('connected', () => new Promise(() => {}));
  expect(view.connect.disabled).toBe(true);
  expect(view.inspect.disabled).toBe(true);
  expect(view.file.disabled).toBe(true);
  expect(view.cancel.disabled).toBe(false);
  model.cancel();
  await pending;
  expect(view.inspect.disabled).toBe(false);
  expect(view.cancel.disabled).toBe(true);
});

test('a standalone screen cannot start an API check', () => {
  const view = new ProbeView(document);
  view.render('ru', new ProbeController(null), null, false, false);
  expect(view.connect.disabled).toBe(true);
  expect(view.inspect.disabled).toBe(true);
  expect(document.getElementById('standalone')?.hidden).toBe(false);
});

test('a JSON download cleans up its anchor and eventually revokes its object URL', () => {
  vi.useFakeTimers();
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  downloadJson({ synthetic: true, text: 'Тест ✓' }, 'synthetic.json', document);
  expect(create.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
  expect(click).toHaveBeenCalledTimes(1);
  expect(document.querySelector('a[download]')).toBeNull();
  expect(revoke).not.toHaveBeenCalled();
  vi.advanceTimersByTime(60_000);
  expect(revoke).toHaveBeenCalledWith('blob:synthetic');
});

test('a missing required page control fails initialization', () => {
  document.getElementById('inspect')?.remove();
  expect(() => new ProbeView(document)).toThrow('MISSING_ELEMENT_inspect');
});
