export const CALLBACK_STAGE_KEY = 'exporter-callback-stage';
const stages = new Set([
  'CALLBACK_STARTED', 'CALLBACK_CONFIG_INVALID', 'CALLBACK_SDK_UNAVAILABLE',
  'CALLBACK_SDK_INIT_FAILED', 'CALLBACK_OPENER_BLOCKED',
  'CALLBACK_OPENER_UNAVAILABLE', 'CALLBACK_RETURN_FAILED', 'CALLBACK_COMPLETED',
]);

export function callbackStage(value) {
  return stages.has(value) ? value : null;
}

export function saveCallbackStage(value, storage) {
  const stage = callbackStage(value);
  if (!stage) return;
  // Optional, fixed diagnostic values only. Never pass URLs, errors, or codes.
  try { storage.setItem(CALLBACK_STAGE_KEY, stage); } catch { /* Optional. */ }
}
