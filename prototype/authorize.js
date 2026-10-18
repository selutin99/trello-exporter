import { chooseLocale, translations } from './i18n.js';
import { runtimeSettings } from './runtime.js';

const locale = chooseLocale(navigator.language);
document.documentElement.lang = locale;
const status = document.getElementById('authorization-status');
status.textContent = translations[locale].callback;
try {
  const settings = runtimeSettings(window.location.href);
  if (!settings.clientId || !window.TrelloPowerUp) throw new Error();
  const t = window.TrelloPowerUp.iframe(settings.oauthOptions);
  await t.getOAuth2ApiClient().redirectUriCallback();
  status.textContent = translations[locale].callbackDone;
} catch {
  // Auth codes and SDK error details must never be written to the DOM or logs.
  status.textContent = translations[locale].callbackFailed;
}
