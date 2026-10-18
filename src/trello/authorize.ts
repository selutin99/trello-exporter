import { saveCallbackStage } from '../core';
import { CallbackStage } from '../core';
import { chooseLocale, translations } from '../i18n';
import { runtimeSettings } from './runtime';
import { pageReady } from './sdk';

const diagnostic = (stage: CallbackStage) => {
  try {
    saveCallbackStage(stage, window.localStorage);
  } catch {
    /* Optional storage. */
  }
};
diagnostic(CallbackStage.Started);
const locale = chooseLocale(navigator.language);
document.documentElement.lang = locale;
const status = document.getElementById('authorization-status');
if (!status) throw new Error('MISSING_STATUS_ELEMENT');
status.textContent = translations[locale].callback;
await pageReady(window);
let failureCode: CallbackStage = CallbackStage.ConfigInvalid;
try {
  const settings = runtimeSettings(window.location.href);
  if (!settings.clientId) throw new Error();
  failureCode = CallbackStage.SdkUnavailable;
  if (!window.TrelloPowerUp) throw new Error();
  failureCode = CallbackStage.SdkInitFailed;
  const client = window.TrelloPowerUp.iframe(settings.oauthOptions).getOAuth2ApiClient();
  failureCode = CallbackStage.OpenerBlocked;
  // Desktop may open a separate browser without the same-origin SDK opener.
  const opener: unknown = window.opener;
  const canReturn =
    typeof opener === 'object' &&
    opener !== null &&
    'authorize' in opener &&
    typeof opener.authorize === 'function';
  failureCode = CallbackStage.OpenerUnavailable;
  if (!canReturn) throw new Error();
  failureCode = CallbackStage.ReturnFailed;
  await client.redirectUriCallback();
  diagnostic(CallbackStage.Completed);
  status.textContent = translations[locale].callbackDone;
} catch {
  diagnostic(failureCode);
  status.textContent = `${translations[locale].callbackFailed} (${failureCode})`;
}
