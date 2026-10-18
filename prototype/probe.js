import { TestBoardApi } from './api.js';
import { chooseLocale, localizePage, translations } from './i18n.js';
import { runtimeSettings } from './runtime.js';

const $ = (id) => document.getElementById(id);
let settings;
try { settings = runtimeSettings(window.location.href); }
catch { settings = { boardReference: null, clientId: '', oauthOptions: {} }; }
let preferredLocale = null;
try { preferredLocale = localStorage.getItem('exporter-locale'); }
catch { /* Storage is optional; no tokens are stored here. */ }
let locale = chooseLocale(preferredLocale ?? navigator.language);
let controller = null;
let t = null;
let api = null;
let statusKey = 'idle';
const report = {
  format: 'trello-exporter.compatibility-probe',
  version: '0.0.0', startedAt: new Date().toISOString(),
  boardReference: settings.boardReference, apiWritesEnabled: false, events: [],
};

function render() {
  localizePage(locale);
  $('language').value = locale;
  $('scope').textContent = settings.boardReference ?? translations[locale].missingScope;
  $('status').textContent = translations[locale][statusKey];
  $('results').textContent = JSON.stringify(report, null, 2);
  $('standalone').hidden = Boolean(t && settings.clientId);
  $('connect').disabled = Boolean(controller) || !t || !settings.clientId || !settings.boardReference;
  $('inspect').disabled = Boolean(controller) || !api;
  $('scan').disabled = Boolean(controller) || !$('file').files.length;
  $('cancel').disabled = !controller;
  $('file').disabled = Boolean(controller);
}

function record(code, detail = {}) {
  report.events.push({ at: new Date().toISOString(), code, ...detail });
  render();
}

async function run(code, task) {
  if (controller) return;
  const active = new AbortController();
  controller = active;
  statusKey = 'working';
  record('CHECK_STARTED', { check: code });
  try { await task(active.signal); active.signal.throwIfAborted(); statusKey = code; }
  catch (error) {
    const aborted = active.signal.aborted;
    statusKey = aborted ? 'cancelled' : 'failed';
    record(aborted ? 'CHECK_CANCELLED' : 'CHECK_FAILED', {
      check: code,
      // Raw SDK/network errors can contain auth URLs. Only known codes are recorded.
      errorCode: /^[A-Z_]+$/.test(error?.code ?? '') ? error.code : 'CHECK_FAILED',
      status: Number.isInteger(error?.status) ? error.status : null,
    });
  } finally { controller = null; render(); }
}

function download(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

$('language').addEventListener('change', () => {
  locale = chooseLocale($('language').value);
  preferredLocale = locale;
  try { localStorage.setItem('exporter-locale', locale); } catch { /* Optional. */ }
  render();
});
$('download').addEventListener('click', () => {
  download({ format: 'trello-exporter.file-probe', synthetic: true, text: 'Проверка / Test ✓' }, 'trello-exporter-file-probe.json');
  statusKey = 'downloaded';
  record('SAMPLE_DOWNLOAD_REQUESTED');
});
$('file').addEventListener('change', () => {
  const file = $('file').files[0];
  if (!file) return render();
  statusKey = 'selected';
  record('LOCAL_FILE_SELECTED', { name: file.name, size: file.size });
});
$('scan').addEventListener('click', () => run('scanned', async signal => {
  const file = $('file').files[0];
  const reader = file.stream().getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  let bytes = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
    }
    signal.throwIfAborted();
    if (bytes !== file.size) throw Object.assign(new Error(), { code: 'FILE_SIZE_MISMATCH' });
    record('LOCAL_FILE_READ', { name: file.name, bytes });
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}));
$('cancel').addEventListener('click', () => controller?.abort());
$('report').addEventListener('click', () => {
  download(report, 'trello-exporter-compatibility-report.json');
  statusKey = 'reported'; render();
});
$('connect').addEventListener('click', () => run('connected', async () => {
  await t.getOAuth2ApiClient().authorize({ scopes: ['read:board:trello', 'write:board:trello'] });
  // Authorization can return after cancellation; do not perform API work implicitly.
  record('AUTHORIZATION_COMPLETED');
}));
$('inspect').addEventListener('click', () => run('inspected', async signal => {
  const context = t.getContext();
  const board = await api.verifyBoard({ contextBoardId: context.board, signal });
  record('TEST_BOARD_VERIFIED', { board });
}));

render();
if (document.readyState !== 'complete') {
  await new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
}
if (window.TrelloPowerUp && window.parent !== window) {
  t = window.TrelloPowerUp.iframe(settings.oauthOptions);
  t.render(() => {
    if (!preferredLocale) locale = chooseLocale(t.getContext().locale);
    if (settings.boardReference && settings.clientId && !api) {
      api = new TestBoardApi({
        boardReference: settings.boardReference,
        getAccessToken: () => t.getOAuth2ApiClient().getAccessToken(),
      });
    }
    render();
  });
}
