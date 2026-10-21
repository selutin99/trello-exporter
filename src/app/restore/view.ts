import { canResumeJournal } from '../../restore/journal';
import type { Locale } from '../../i18n';
import { translations } from '../../i18n';
import { restorationPlan } from '../../restore/plan';
import { RestoreStatus } from '../../restore/codes';
import type { RestoreModel } from './types';
import { serviceUrls } from '../../config/services';

/** Text-only import preview, confirmation, and restoration outcome */
export class RestoreView {
  /**
   * Binds restoration controls
   * @param document - Export/restore page
   */
  constructor(private readonly document: Document) {}
  /**
   * Finds a required typed control
   * @param id - Control identity
   * @param type - Expected DOM type
   * @returns The requested element
   * @throws Error for incompatible page markup
   */
  element<T extends HTMLElement>(id: string, type: { new (...args: never[]): T }): T {
    const element = this.document.getElementById(id);
    if (!(element instanceof type)) throw new Error(`Missing restore control: ${id}`);
    return element;
  }
  /**
   * Updates the preview without resetting user name/confirmation inputs
   * @param model - Current restoration state
   * @param locale - Shared product language
   * @param embedded - Whether the SDK frame is available
   * @param exportBusy - Whether export owns the shared interface
   */
  render(
    model: Readonly<RestoreModel>,
    locale: Locale,
    embedded: boolean,
    exportBusy: boolean,
  ): void {
    const text = translations[locale];
    const busy = model.busy || exportBusy;
    this.element('restore-status', HTMLElement).textContent = text[model.message];
    this.element('restore-file', HTMLInputElement).disabled = busy;
    this.element('restore-name', HTMLInputElement).disabled = busy;
    this.element('restore-confirm', HTMLInputElement).disabled = busy;
    this.element('restore-preview', HTMLElement).hidden = !model.imported;
    this.element('restore-cancel', HTMLButtonElement).hidden = !model.busy;
    this.element('restore-connect', HTMLButtonElement).hidden = !embedded || !!model.context;
    this.element('restore-connect', HTMLButtonElement).disabled = busy;
    const confirmed = this.element('restore-confirm', HTMLInputElement).checked;
    this.element('restore-start', HTMLButtonElement).disabled =
      busy || !model.imported || !model.context || !confirmed;
    const resumable =
      model.imported &&
      model.context &&
      canResumeJournal(model.previous, model.imported.checksum, model.context);
    this.element('restore-resume', HTMLButtonElement).hidden = !resumable;
    this.element('restore-resume', HTMLButtonElement).disabled =
      busy || !confirmed || !model.context;
    this.element('restore-previous', HTMLElement).hidden =
      !model.previous ||
      [RestoreStatus.Complete, RestoreStatus.Partial].includes(model.previous.status);
    if (model.imported) {
      const plan = restorationPlan(model.imported);
      this.element('restore-source', HTMLElement).textContent = model.imported.snapshot.board.name;
      this.element('restore-counts', HTMLElement).textContent =
        `${text.exportLists}: ${plan.lists} · ${text.exportCardCount}: ${plan.cards} · ${text.exportItemCount}: ${plan.items} · ${text.exportFileCount}: ${plan.files}`;
      this.element('restore-workspace', HTMLElement).textContent = model.context
        ? `${text.restoreWorkspace}: ${model.context.workspaceName}`
        : text.restoreUnavailable;
      const warnings = this.element('restore-limitations', HTMLElement);
      warnings.replaceChildren();
      const notes = [text.restoreIdentities, ...plan.warnings.map((warning) => text[warning])];
      for (const message of notes) {
        const item = this.document.createElement('li');
        item.textContent = message;
        warnings.append(item);
      }
    }
    this.element('export-panel', HTMLElement).hidden = model.active;
    this.element('restore-panel', HTMLElement).hidden = !model.active;
    for (const [id, selected] of [
      ['export-tab', !model.active],
      ['restore-tab', model.active],
    ] as const) {
      const tab = this.element(id, HTMLButtonElement);
      tab.classList.toggle('active-tab', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.disabled = busy;
    }
    this.#result(model, locale);
  }
  #result(model: Readonly<RestoreModel>, locale: Locale): void {
    const report = model.report;
    const text = translations[locale];
    this.element('restore-result', HTMLElement).hidden = !report;
    if (!report) return;
    const messages = {
      [RestoreStatus.Ready]: text.restoreReady,
      [RestoreStatus.Running]: text.restoreRunning,
      [RestoreStatus.Complete]: text.restoreComplete,
      [RestoreStatus.Partial]: text.restorePartial,
      [RestoreStatus.Failed]: text.restoreFailed,
      [RestoreStatus.Cancelled]: text.restoreCancelled,
      [RestoreStatus.Unknown]: text.restoreUnknown,
    };
    this.element('restore-outcome', HTMLElement).textContent = messages[report.status];
    const link = this.element('restore-target', HTMLAnchorElement);
    link.hidden = !report.target;
    if (report.target) {
      link.href = `${serviceUrls.trelloBoardOrigin}/b/${report.target.id}`;
      link.textContent = report.target.name;
    }
  }
}
