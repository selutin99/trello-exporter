import { runtimeSettings } from './runtime.js';
import { chooseLocale } from './i18n.js';

const settings = runtimeSettings(window.location.href);
const openProbe = (t) => {
  const url = new URL('./probe.html', window.location.href);
  if (settings.boardReference) url.searchParams.set('board', settings.boardReference);
  if (settings.clientId) url.searchParams.set('clientId', settings.clientId);
  return t.modal({
    title: 'Board Snapshot Exporter · Prototype',
    url: t.signUrl(url.href), height: 640, fullscreen: false,
  });
};

window.TrelloPowerUp.initialize({
  'board-buttons': (t) => [{
    text: chooseLocale(t.getContext().locale) === 'ru' ? 'Проверка экспорта' : 'Export probe',
    icon: new URL('./icon.svg', window.location.href).href,
    callback: openProbe,
  }],
  'show-settings': openProbe,
  'show-authorization': openProbe,
  'authorization-status': async (t) => {
    if (!settings.clientId) return { authorized: false };
    try { return { authorized: Boolean(await t.getOAuth2ApiClient().getAccessToken()) }; }
    catch { return { authorized: false }; }
  },
}, settings.oauthOptions);
