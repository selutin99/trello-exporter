import { Check } from '../../src/core/codes';
// @vitest-environment happy-dom
import { beforeEach, expect, test } from 'vitest';
import { loadPage } from '../helpers/browser';
beforeEach(() => loadPage('probe'));
import { ProbeController } from '../../src/core';
import { EventCode } from '../../src/core/codes';
import { ProbeView } from '../../src/app/view';
import { Locale } from '../../src/i18n';
test('board names and diagnostic content cannot inject HTML', () => {
  const model = new ProbeController('TEST0001');
  model.record({
    code: EventCode.TestBoardVerified,
    board: {
      id: 'a'.repeat(24),
      shortLink: 'TEST0001',
      name: '<img src=x onerror=alert(1)>',
      closed: false,
    },
  });
  new ProbeView(document).render(Locale.English, model, 'TEST0001', true, true);
  expect(document.querySelector('#results img')).toBeNull();
  expect(document.querySelector('#results')?.textContent).toContain('<img');
});

test('busy state disables competing operations and cancellation restores controls', async () => {
  const view = new ProbeView(document);
  const model = new ProbeController('TEST0001', () =>
    view.render(Locale.English, model, 'TEST0001', true, true),
  );
  const pending = model.run(Check.Authorize, () => new Promise(() => {}));
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
  view.render(Locale.Russian, new ProbeController(null), null, false, false);
  expect(view.connect.disabled).toBe(true);
  expect(view.inspect.disabled).toBe(true);
  expect(document.getElementById('standalone')?.hidden).toBe(false);
});

test('a missing required page control fails initialization', () => {
  document.getElementById('inspect')?.remove();
  expect(() => new ProbeView(document)).toThrow('MISSING_ELEMENT_inspect');
});
