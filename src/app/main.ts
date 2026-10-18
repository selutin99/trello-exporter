import { TestBoardApi } from '@trello-exporter/trello-client';
import { CALLBACK_STAGE_KEY, callbackStage, ProbeController, scanLocalFile } from '@trello-exporter/probe-core';
import { chooseLocale } from '../i18n';
import { runtimeSettings } from '../trello/runtime';
import type { RuntimeSettings } from '../trello/runtime';
import { pageReady } from '../trello/sdk';
import type { PowerUpFrame } from '../trello/sdk';
import { downloadJson } from './download';
import { ProbeView } from './view';

const view = new ProbeView(document);
let settings: Pick<RuntimeSettings, 'boardReference' | 'clientId' | 'oauthOptions'>;
try { settings = runtimeSettings(window.location.href); }
catch { settings = { boardReference: null, clientId: '', oauthOptions: {} }; }
let preferredLocale: string | null = null;
try { preferredLocale = localStorage.getItem('exporter-locale'); } catch { /* Optional language preference. */ }
let locale = chooseLocale(preferredLocale ?? navigator.language);
let frame: PowerUpFrame | null = null;
let api: TestBoardApi | null = null;
const model = new ProbeController(settings.boardReference, render);

function render(): void {
  view.render(locale, model, settings.boardReference, Boolean(frame && settings.clientId), Boolean(api));
}

window.addEventListener('storage', event => {
  if (event.key !== CALLBACK_STAGE_KEY || !model.busy) return;
  const stage = callbackStage(event.newValue);
  if (stage) model.record({ code: 'OAUTH_CALLBACK_STAGE', stage });
});
view.language.addEventListener('change', () => {
  locale = chooseLocale(view.language.value);
  preferredLocale = locale;
  try { localStorage.setItem('exporter-locale', locale); } catch { /* Optional storage. */ }
  render();
});
view.download.addEventListener('click', () => {
  downloadJson({ format: 'trello-exporter.file-probe', synthetic: true, text: 'Проверка / Test ✓' }, 'trello-exporter-file-probe.json');
  model.setStatus('downloaded');
  model.record({ code: 'SAMPLE_DOWNLOAD_REQUESTED' });
});
view.file.addEventListener('change', () => {
  const file = view.file.files?.[0];
  if (!file) { render(); return; }
  model.setStatus('selected');
  model.record({ code: 'LOCAL_FILE_SELECTED', name: file.name, size: file.size });
});
view.scan.addEventListener('click', () => {
  const file = view.file.files?.[0];
  if (!file) return;
  void model.run('scanned', async ({ signal, record }) => {
    const bytes = await scanLocalFile(file, signal);
    record({ code: 'LOCAL_FILE_READ', name: file.name, bytes });
  });
});
view.cancel.addEventListener('click', () => model.cancel());
view.report.addEventListener('click', () => {
  downloadJson(model.report, 'trello-exporter-compatibility-report.json');
  model.setStatus('reported');
});
view.connect.addEventListener('click', () => {
  const activeFrame = frame;
  if (!activeFrame) return;
  void model.run('connected', async ({ record }) => {
    await activeFrame.getOAuth2ApiClient().authorize({ scopes: ['read:board:trello', 'write:board:trello'] });
    record({ code: 'AUTHORIZATION_COMPLETED' });
  });
});
view.inspect.addEventListener('click', () => {
  const activeApi = api;
  const contextBoardId = frame?.getContext().board;
  // The live iframe must supply board context, not just a caller-controlled query.
  if (!activeApi || !contextBoardId) return;
  void model.run('inspected', async ({ signal, record }) => {
    const board = await activeApi.verifyBoard({ contextBoardId, signal });
    record({ code: 'TEST_BOARD_VERIFIED', board });
  });
});

render();
await pageReady(window);
if (window.TrelloPowerUp && window.parent !== window) {
  try {
    const activeFrame = window.TrelloPowerUp.iframe(settings.oauthOptions);
    frame = activeFrame;
    activeFrame.render(() => {
      if (!preferredLocale) locale = chooseLocale(activeFrame.getContext().locale);
      if (settings.boardReference && settings.clientId && activeFrame.getContext().board && !api) {
        api = new TestBoardApi({
          boardReference: settings.boardReference,
          getAccessToken: () => activeFrame.getOAuth2ApiClient().getAccessToken(),
        });
      }
      render();
    });
  } catch { frame = null; api = null; render(); }
}
