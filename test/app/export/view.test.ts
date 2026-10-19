// @vitest-environment happy-dom
import { beforeEach, expect, test } from 'vitest';
import { loadPage } from '../../helpers/browser';
import { ExportView } from '../../../src/app/export/view';
import { ExportSession } from '../../../src/app/export/session';
import { Locale } from '../../../src/i18n';
import { ExportFormat, ExportStage, IssueCode } from '../../../src/snapshot/codes';
import { createDemoCapture, demoFileReader } from '../../../src/demo/preview';

beforeEach(() => loadPage('export'));

test('attachment file coverage follows JSON and ZIP selection in both languages', () => {
  const view = new ExportView(document);
  const session = new ExportSession(() => {});
  for (const locale of Object.values(Locale)) {
    for (const format of [ExportFormat.Json, ExportFormat.Zip, ExportFormat.Json]) {
      session.selectFormat(format);
      view.render(locale, session.model, false, false);
      const included = format === ExportFormat.Zip;
      expect(view.element('attachment-mark', HTMLElement).textContent).toBe(included ? '✓' : '×');
      expect(view.element('attachment-mark', HTMLElement).getAttribute('aria-hidden')).toBe('true');
      expect(view.element('attachment-coverage', HTMLElement).classList.contains('excluded')).toBe(
        !included,
      );
      expect(view.element('attachment-status', HTMLElement).textContent).toBe(
        locale === Locale.Russian
          ? included
            ? 'Сохраняются'
            : 'Не сохраняются в JSON'
          : included
            ? 'Included'
            : 'Not included in JSON',
      );
      expect(view.element('privacy-link', HTMLAnchorElement).getAttribute('href')).toBe(
        `./privacy.html?lang=${locale}`,
      );
    }
  }
});

test('a missing control fails clearly and progress is accessible', () => {
  const view = new ExportView(document);
  expect(() => view.element('missing', HTMLButtonElement)).toThrow('Missing export control');
  const session = new ExportSession(() => {});
  session.model.progress = { stage: ExportStage.Files, current: 1, total: 3 };
  view.render(Locale.Russian, session.model, true, true);
  expect(view.element('progress', HTMLProgressElement).value).toBe(1);
  expect(view.element('progress', HTMLProgressElement).max).toBe(3);
  expect(view.element('progress-label', HTMLElement).textContent).toContain('1 / 3');
});

test('all warning types are localized, and untrusted entity IDs remain plain text', async () => {
  const view = new ExportView(document);
  const session = new ExportSession(() => {});
  session.useDemo(() => {
    const capture = createDemoCapture();
    capture.snapshot.issues = Object.values(IssueCode).map((code) => ({
      code,
      severity: 'warning',
      entityType: 'content',
      entityId: code === IssueCode.BoardChanged ? null : '<script>attack</script>',
      message: code,
    }));
    return capture;
  }, demoFileReader);
  await session.prepare(null, '');
  view.render(Locale.English, session.model, false, false);
  expect(view.element('warning-list', HTMLElement).children).toHaveLength(4);
  expect(document.querySelector('#warning-list script')).toBeNull();
});
