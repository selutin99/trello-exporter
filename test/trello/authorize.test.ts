// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { CALLBACK_STAGE_KEY } from '../../src/core';
import { loadPage, installSdk } from '../helpers/browser';

beforeEach(() => {
  vi.resetModules();
  loadPage('authorize');
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const status = () => document.getElementById('authorization-status')?.textContent;

test('callback returns through the official SDK and persists only a fixed stage', async () => {
  const { client } = installSdk();
  vi.stubGlobal('opener', { authorize: vi.fn() });
  await import('../../src/trello/authorize');
  expect(client.redirectUriCallback).toHaveBeenCalledTimes(1);
  expect(window.localStorage.getItem(CALLBACK_STAGE_KEY)).toBe('CALLBACK_COMPLETED');
  expect(status()).not.toContain('CALLBACK_RETURN_FAILED');
});

test('Desktop callback without an opener diagnoses the limitation without SDK redirection', async () => {
  const { client } = installSdk();
  await import('../../src/trello/authorize');
  expect(status()).toContain('CALLBACK_OPENER_UNAVAILABLE');
  expect(client.redirectUriCallback).not.toHaveBeenCalled();
});

test('blocked opener access produces a fixed diagnostic stage', async () => {
  installSdk();
  vi.stubGlobal(
    'opener',
    new Proxy(
      {},
      {
        has() {
          throw new Error('synthetic-private-origin');
        },
      },
    ),
  );
  await import('../../src/trello/authorize');
  expect(status()).toContain('CALLBACK_OPENER_BLOCKED');
  expect(status()).not.toContain('synthetic-private-origin');
});

test('SDK callback errors never expose the original authorization error', async () => {
  const { client } = installSdk();
  vi.stubGlobal('opener', { authorize: vi.fn() });
  client.redirectUriCallback.mockRejectedValue(
    new Error('https://example.invalid/?code=synthetic-private'),
  );
  await import('../../src/trello/authorize');
  expect(status()).toContain('CALLBACK_RETURN_FAILED');
  expect(document.body.textContent).not.toContain('synthetic-private');
});

test('missing SDK and missing client report distinct fixed stages', async () => {
  await import('../../src/trello/authorize');
  expect(status()).toContain('CALLBACK_SDK_UNAVAILABLE');
  vi.resetModules();
  loadPage('authorize', '');
  installSdk();
  await import('../../src/trello/authorize');
  expect(status()).toContain('CALLBACK_CONFIG_INVALID');
});

test('SDK initialization failure is sanitized', async () => {
  const { sdk } = installSdk();
  sdk.iframe.mockImplementation(() => {
    throw new Error('synthetic-private-sdk-error');
  });
  await import('../../src/trello/authorize');
  expect(status()).toContain('CALLBACK_SDK_INIT_FAILED');
  expect(document.body.textContent).not.toContain('synthetic-private-sdk-error');
});

test('disabled diagnostic storage does not prevent a valid callback', async () => {
  const { client } = installSdk();
  vi.stubGlobal('opener', { authorize: vi.fn() });
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new Error('Storage disabled');
  });
  await import('../../src/trello/authorize');
  expect(client.redirectUriCallback).toHaveBeenCalledTimes(1);
});
