// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { CALLBACK_STAGE_KEY } from '../../src/core';
import { downloadJson } from '../../src/app/download';
import { board, button, loadPage, installSdk } from '../helpers/browser';

vi.mock('../../src/app/download', () => ({ downloadJson: vi.fn() }));
beforeEach(() => {
  vi.resetModules();
  loadPage('probe');
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const results = () => document.getElementById('results')?.textContent ?? '';

test('standalone app localizes, downloads synthetic JSON and saves a local report', async () => {
  await import('../../src/app/main');
  expect(button('inspect').disabled).toBe(true);
  const language = document.getElementById('language');
  if (!(language instanceof HTMLSelectElement)) throw new Error('Missing language');
  language.value = 'ru';
  language.dispatchEvent(new Event('change'));
  expect(document.documentElement.lang).toBe('ru');
  expect(window.localStorage.getItem('exporter-locale')).toBe('ru');
  button('download').click();
  expect(downloadJson).toHaveBeenCalledWith(
    expect.objectContaining({ synthetic: true }),
    'trello-exporter-file-probe.json',
  );
  button('report').click();
  expect(downloadJson).toHaveBeenLastCalledWith(
    expect.objectContaining({ apiWritesEnabled: false }),
    'trello-exporter-compatibility-report.json',
  );
});

test('embedded app reads only the configured board and excludes extra response fields', async () => {
  const { sdk } = installSdk();
  vi.stubGlobal('parent', {});
  const fetchImpl = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(JSON.stringify({ ...board, token: 'synthetic-private-field' })),
    );
  vi.stubGlobal('fetch', fetchImpl);
  await import('../../src/app/main');
  expect(sdk.iframe).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'public-client' }));
  expect(button('inspect').disabled).toBe(false);
  button('inspect').click();
  await vi.waitFor(() => expect(results()).toContain('TEST_BOARD_VERIFIED'));
  expect(results()).not.toContain('synthetic-private-field');
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl).toHaveBeenCalledWith(
    expect.stringMatching(/^https:\/\/api\.trello\.com\/1\/boards\/TEST0001\?/),
    expect.objectContaining({ method: 'GET' }),
  );
});

test('closing a stalled OAuth wait records only allowlisted callback stages and releases controls', async () => {
  const { client } = installSdk();
  vi.stubGlobal('parent', {});
  client.authorize.mockReturnValue(new Promise(() => {}));
  await import('../../src/app/main');
  button('connect').click();
  window.dispatchEvent(
    new StorageEvent('storage', { key: CALLBACK_STAGE_KEY, newValue: 'CALLBACK_STARTED' }),
  );
  window.dispatchEvent(
    new StorageEvent('storage', { key: CALLBACK_STAGE_KEY, newValue: 'synthetic-private-url' }),
  );
  expect(results()).toContain('OAUTH_CALLBACK_STAGE');
  expect(results()).not.toContain('synthetic-private-url');
  button('cancel').click();
  await vi.waitFor(() => expect(button('connect').disabled).toBe(false));
  expect(results()).toContain('CHECK_CANCELLED');
});

test('successful SDK authorization records completion without making an implicit API request', async () => {
  installSdk();
  vi.stubGlobal('parent', {});
  const fetchImpl = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchImpl);
  await import('../../src/app/main');
  button('connect').click();
  await vi.waitFor(() => expect(results()).toContain('AUTHORIZATION_COMPLETED'));
  expect(fetchImpl).not.toHaveBeenCalled();
});

test('a chosen file is scanned locally and a cleared selection disables the action', async () => {
  await import('../../src/app/main');
  const input = document.getElementById('file');
  if (!(input instanceof HTMLInputElement)) throw new Error('Missing input');
  const file = new File([new Uint8Array([1, 2, 3])], 'synthetic.bin');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  button('scan').click();
  await vi.waitFor(() => expect(results()).toContain('LOCAL_FILE_READ'));
  expect(results()).toContain('"bytes": 3');
  Object.defineProperty(input, 'files', { value: [], configurable: true });
  input.dispatchEvent(new Event('change'));
  expect(button('scan').disabled).toBe(true);
});

test('invalid runtime config and blocked preference storage leave a safe standalone screen', async () => {
  loadPage('probe', 'board=invalid');
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new Error('Storage disabled');
  });
  await import('../../src/app/main');
  expect(button('connect').disabled).toBe(true);
  expect(button('inspect').disabled).toBe(true);
  expect(results()).toContain('"boardReference": null');
});

test('missing board context keeps API reads disabled', async () => {
  const { frame } = installSdk();
  frame.getContext.mockReturnValue({ locale: 'en' });
  vi.stubGlobal('parent', {});
  await import('../../src/app/main');
  expect(button('inspect').disabled).toBe(true);
});

test('SDK initialization failure does not expose its error or enable API access', async () => {
  const { sdk } = installSdk();
  sdk.iframe.mockImplementation(() => {
    throw new Error('synthetic-private-error');
  });
  vi.stubGlobal('parent', {});
  await import('../../src/app/main');
  expect(button('inspect').disabled).toBe(true);
  expect(document.body.textContent).not.toContain('synthetic-private-error');
});
