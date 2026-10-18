import { expect, test, vi } from 'vitest';
import { ProbeController, diagnosticError } from '../src/core';

test('a cancelled OAuth completion cannot change a later operation or its report', async () => {
  let complete: () => void = () => {};
  const sdk = new Promise<void>(resolve => { complete = resolve; });
  const model = new ProbeController('TEST0001');
  const first = model.run('connected', async ({ record }) => {
    await sdk;
    record({ code: 'AUTHORIZATION_COMPLETED' });
  });
  model.cancel();
  await first;
  expect(model.status).toBe('cancelled');
  await model.run('scanned', async ({ record }) => record({ code: 'LOCAL_FILE_READ', name: 'synthetic', bytes: 0 }));
  complete();
  await sdk;
  await Promise.resolve();
  expect(model.status).toBe('scanned');
  expect(model.report.events.some(event => event.code === 'AUTHORIZATION_COMPLETED')).toBe(false);
  expect(model.busy).toBe(false);
});

test('a second check is ignored while the first check owns the operation', async () => {
  const model = new ProbeController(null);
  const pending = model.run('connected', () => new Promise(() => {}));
  const second = vi.fn(async () => {});
  await model.run('scanned', second);
  expect(second).not.toHaveBeenCalled();
  model.cancel();
  await pending;
});

test('mutating a report snapshot cannot change the controller', () => {
  const model = new ProbeController(null);
  model.record({ code: 'SAMPLE_DOWNLOAD_REQUESTED' });
  const snapshot = model.report;
  snapshot.events.length = 0;
  expect(model.report.events).toHaveLength(1);
});

test('a failed check releases the controller and records no raw error details', async () => {
  const model = new ProbeController(null);
  await model.run('connected', async () => { throw Object.assign(new Error('synthetic-private-url'), { code: 'SYNTHETIC_SECRET' }); });
  expect(model.status).toBe('failed');
  expect(model.busy).toBe(false);
  expect(JSON.stringify(model.report)).not.toContain('SYNTHETIC_SECRET');
  expect(JSON.stringify(model.report)).not.toContain('synthetic-private-url');
});

test.each([
  null,
  new Error('synthetic-private-data'),
  { code: 'SYNTHETIC_SECRET', status: 401 },
  { get code() { throw new Error(); } },
])('diagnostics reject unknown errors, including uppercase strings and accessors', error => {
  expect(diagnosticError(error)).toEqual({ errorCode: 'CHECK_FAILED', status: null });
});

test('diagnostics retain known codes and only valid HTTP statuses', () => {
  expect(diagnosticError({ code: 'API_REQUEST_FAILED', status: 403, token: 'excluded' }))
    .toEqual({ errorCode: 'API_REQUEST_FAILED', status: 403 });
  expect(diagnosticError({ code: 'API_REQUEST_FAILED', status: 10000 }))
    .toEqual({ errorCode: 'API_REQUEST_FAILED', status: null });
});
