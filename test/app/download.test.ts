// @vitest-environment happy-dom
import { beforeEach, expect, test, vi } from 'vitest';
import { loadPage } from '../helpers/browser';
beforeEach(() => loadPage('probe'));
import { afterEach } from 'vitest';
import { downloadJson } from '../../src/app/download';
afterEach(() => {
  vi.useRealTimers();
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
