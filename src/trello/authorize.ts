import { saveCallbackStage } from '../core';
import type { CallbackStage } from '../core';
import { chooseLocale, translations } from '../i18n';
import { runtimeSettings } from './runtime';
import { pageReady } from './sdk';

const diagnostic = (stage: CallbackStage) => {
  try { saveCallbackStage(stage, window.localStorage); } catch { /* Optional storage. */ }
};
diagnostic('CALLBACK_STARTED');
const locale = chooseLocale(navigator.language);
document.documentElement.lang = locale;
const status = document.getElementById('authorization-status');
if (!status) throw new Error('MISSING_STATUS_ELEMENT');
status.textContent = translations[locale].callback;
await pageReady(window);
let failureCode: CallbackStage = 'CALLBACK_CONFIG_INVALID';
try {
  const settings = runtimeSettings(window.location.href);
  if (!settings.clientId) throw new Error();
  failureCode = 'CALLBACK_SDK_UNAVAILABLE';
  if (!window.TrelloPowerUp) throw new Error();
  failureCode = 'CALLBACK_SDK_INIT_FAILED';
  const client = window.TrelloPowerUp.iframe(settings.oauthOptions).getOAuth2ApiClient();
  failureCode = 'CALLBACK_OPENER_BLOCKED';
  // Desktop may open a separate browser without the same-origin SDK opener.
  const opener: unknown = window.opener;
  const canReturn = typeof opener === 'object' && opener !== null && 'authorize' in opener && typeof opener.authorize === 'function';
  failureCode = 'CALLBACK_OPENER_UNAVAILABLE';
  if (!canReturn) throw new Error();
  failureCode = 'CALLBACK_RETURN_FAILED';
  await client.redirectUriCallback();
  diagnostic('CALLBACK_COMPLETED');
  status.textContent = translations[locale].callbackDone;
} catch {
  diagnostic(failureCode);
  status.textContent = `${translations[locale].callbackFailed} (${failureCode})`;
}
