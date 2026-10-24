import { OAuthScope } from '../trello/scopes';
import { Check, DiagnosticFormat, EventCode, Status } from '../core/codes';
import { TestBoardApi } from '../api';
import { CALLBACK_STAGE_KEY, callbackStage, ProbeController, scanLocalFile } from '../core';
import { chooseLocale, translations } from '../i18n';
import { runtimeSettings } from '../trello/runtime';
import type { RuntimeSettings } from '../trello/runtime';
import { pageReady } from '../trello/sdk';
import type { PowerUpFrame } from '../trello/sdk';
import { downloadJson } from './download';
import { ProbeView } from './view';

const view = new ProbeView(document);
let settings: Pick<RuntimeSettings, 'boardReference' | 'clientId' | 'oauthOptions'>;
try {
  settings = runtimeSettings(window.location.href);
} catch {
  settings = { boardReference: null, clientId: '', oauthOptions: {} };
}
let preferredLocale: string | null = null;
try {
  preferredLocale = localStorage.getItem('exporter-locale');
} catch {
  /* Optional language preference. */
}
let locale = chooseLocale(preferredLocale ?? navigator.language);
let frame: PowerUpFrame | null = null;
let api: TestBoardApi | null = null;
const model = new ProbeController(settings.boardReference, render);

function render(): void {
  view.render(
    locale,
    model,
    settings.boardReference,
    Boolean(frame && settings.clientId),
    Boolean(api),
  );
}

window.addEventListener('storage', (event) => {
  if (event.key !== CALLBACK_STAGE_KEY || !model.busy) return;
  const stage = callbackStage(event.newValue);
  if (stage) model.record({ code: EventCode.OAuthCallbackStage, stage });
});
view.language.addEventListener('change', () => {
  locale = chooseLocale(view.language.value);
  preferredLocale = locale;
  try {
    localStorage.setItem('exporter-locale', locale);
  } catch {
    /* Optional storage. */
  }
  render();
});
view.download.addEventListener('click', () => {
  downloadJson(
    { format: DiagnosticFormat.FileProbe, synthetic: true, text: translations[locale].sampleText },
    'trello-exporter-importer-file-probe.json',
  );
  model.setStatus(Status.Downloaded);
  model.record({ code: EventCode.SampleDownloadRequested });
});
view.file.addEventListener('change', () => {
  const file = view.file.files?.[0];
  if (!file) {
    render();
    return;
  }
  model.setStatus(Status.Selected);
  model.record({ code: EventCode.LocalFileSelected, name: file.name, size: file.size });
});
view.scan.addEventListener('click', () => {
  const file = view.file.files?.[0];
  if (!file) return;
  void model.run(Check.Scan, async ({ signal, record }) => {
    const bytes = await scanLocalFile(file, signal);
    record({ code: EventCode.LocalFileRead, name: file.name, bytes });
  });
});
view.cancel.addEventListener('click', () => model.cancel());
view.report.addEventListener('click', () => {
  downloadJson(model.report, 'trello-exporter-importer-compatibility-report.json');
  model.setStatus(Status.Reported);
});
view.connect.addEventListener('click', () => {
  const activeFrame = frame;
  if (!activeFrame) return;
  void model.run(Check.Authorize, async ({ record }) => {
    await activeFrame
      .getOAuth2ApiClient()
      .authorize({ scopes: [OAuthScope.ReadBoard, OAuthScope.WriteBoard] });
    record({ code: EventCode.AuthorizationCompleted });
  });
});
view.inspect.addEventListener('click', () => {
  const activeApi = api;
  const contextBoardId = frame?.getContext().board;
  // The live iframe must supply board context, not just a caller-controlled query.
  if (!activeApi || !contextBoardId) return;
  void model.run(Check.Inspect, async ({ signal, record }) => {
    const board = await activeApi.verifyBoard({ contextBoardId, signal });
    record({ code: EventCode.TestBoardVerified, board });
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
  } catch {
    frame = null;
    api = null;
    render();
  }
}
