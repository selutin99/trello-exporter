// @vitest-environment happy-dom
import { expect, test, vi } from 'vitest';
import { pageReady } from '../../src/trello/sdk';

test('SDK initialization waits for both deferred scripts and document load', async () => {
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
  let completed = false;
  const ready = pageReady(window).then(() => {
    completed = true;
  });
  await Promise.resolve();
  expect(completed).toBe(false);
  window.dispatchEvent(new Event('load'));
  await ready;
  expect(completed).toBe(true);
});

test('an already loaded page needs no additional event', async () => {
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
  await expect(pageReady(window)).resolves.toBeUndefined();
});
