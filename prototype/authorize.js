import { chooseLocale, translations } from './i18n.js';
import { runtimeSettings } from './runtime.js';
import { saveCallbackStage } from './diagnostics.js';

const diagnostic = stage => {
  try { saveCallbackStage(stage, window.localStorage); } catch { /* Optional. */ }
};
diagnostic('CALLBACK_STARTED');

const locale = chooseLocale(navigator.language);
document.documentElement.lang = locale;
const status = document.getElementById('authorization-status');
status.textContent = translations[locale].callback;
if (document.readyState !== 'complete') {
  await new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
}
let failureCode = 'CALLBACK_CONFIG_INVALID';
try {
  const settings = runtimeSettings(window.location.href);
  if (!settings.clientId) throw new Error();
  failureCode = 'CALLBACK_SDK_UNAVAILABLE';
  if (!window.TrelloPowerUp) throw new Error();
  failureCode = 'CALLBACK_SDK_INIT_FAILED';
  const t = window.TrelloPowerUp.iframe(settings.oauthOptions);
  const client = t.getOAuth2ApiClient();
  failureCode = 'CALLBACK_OPENER_BLOCKED';
  // The official SDK needs this same-origin callback to reach the opening
  // Power-Up frame. Diagnose a missing/isolated opener without exposing URLs.
  const canReturn = typeof window.opener?.authorize === 'function';
  failureCode = 'CALLBACK_OPENER_UNAVAILABLE';
  if (!canReturn) throw new Error();
  failureCode = 'CALLBACK_RETURN_FAILED';
  await client.redirectUriCallback();
  diagnostic('CALLBACK_COMPLETED');
  status.textContent = translations[locale].callbackDone;
} catch {
  diagnostic(failureCode);
  // Auth codes and SDK error details must never be written to the DOM or logs.
  status.textContent = `${translations[locale].callbackFailed} (${failureCode})`;
}
