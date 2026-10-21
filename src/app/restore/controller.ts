import type { Locale } from '../../i18n';
import { MergeChoice } from '../../restore/merge/types';
import type { PowerUpFrame } from '../../trello/sdk';
import { LocalJournalStore } from '../../restore/journal';
import { downloadJson } from '../download';
import type { RestoreModel } from './types';
import { RestoreView } from './view';
import { RestoreSession } from './session';
import { authorizeRestore, restoreConnection } from './connection';

interface Dependencies {
  document: Document;
  getFrame: () => PowerUpFrame | null;
  getLocale: () => Locale;
  exportBusy: () => boolean;
  changed: () => void;
}

/** User-triggered file validation, conflict review, current-board merging, and local continuation */
export class RestoreUI {
  #restoreActive = false;
  readonly #view: RestoreView;
  readonly #session: RestoreSession;
  /**
   * Binds UI events without authorizing or writing to Trello
   * @param dependencies - Shared SDK, language, DOM, and operation boundary
   */
  constructor(private readonly dependencies: Dependencies) {
    this.#view = new RestoreView(dependencies.document);
    this.#session = new RestoreSession({
      context: (signal) => restoreConnection(dependencies.getFrame(), signal),
      authorize: (signal) => authorizeRestore(dependencies.getFrame(), signal),
      store: () => new LocalJournalStore(window.localStorage),
      changed: dependencies.changed,
    });
    this.#view.element('restore-file', HTMLInputElement).addEventListener('change', () => {
      void this.#load();
    });
    this.#view.element('restore-start', HTMLButtonElement).addEventListener('click', () => {
      void this.#run(false);
    });
    this.#view.element('restore-resume', HTMLButtonElement).addEventListener('click', () => {
      void this.#run(true);
    });
    this.#view.element('restore-analyze', HTMLButtonElement).addEventListener('click', () => {
      this.#view.element('restore-confirm', HTMLInputElement).checked = false;
      if (!dependencies.exportBusy()) void this.#session.analyze();
    });
    this.#view.element('restore-conflicts', HTMLElement).addEventListener('change', (event) => {
      const input = event.target;
      if (input instanceof HTMLSelectElement && input.dataset.conflictKey) {
        this.#view.element('restore-confirm', HTMLInputElement).checked = false;
        this.#session.resolve(input.dataset.conflictKey, input.value);
      }
    });
    for (const [id, choice] of [
      ['restore-keep-all', MergeChoice.Current],
      ['restore-use-all', MergeChoice.Snapshot],
    ] as const)
      this.#view.element(id, HTMLButtonElement).addEventListener('click', () => {
        this.#view.element('restore-confirm', HTMLInputElement).checked = false;
        this.#session.resolveValues(choice);
      });
    this.#view.element('restore-connect', HTMLButtonElement).addEventListener('click', () => {
      this.#view.element('restore-confirm', HTMLInputElement).checked = false;
      if (!dependencies.exportBusy()) void this.#session.connect();
    });
    this.#view
      .element('restore-confirm', HTMLInputElement)
      .addEventListener('change', () => this.render());
    this.#view
      .element('restore-cancel', HTMLButtonElement)
      .addEventListener('click', () => this.#session.cancel());
    this.#view.element('restore-report', HTMLButtonElement).addEventListener('click', () => {
      if (this.model.report) downloadJson(this.model.report, 'trello-exporter-restore-report.json');
    });
    for (const [id, active] of [
      ['restore-tab', true],
      ['export-tab', false],
    ] as const)
      this.#view.element(id, HTMLButtonElement).addEventListener('click', () => {
        if (!this.busy && !dependencies.exportBusy()) {
          this.#restoreActive = active;
          this.render();
        }
      });
    window.addEventListener('pagehide', () => this.#session.cancel(), { once: true });
  }
  /**
   * Combines operation state with the locally selected tab
   * @returns Current view model
   */
  get model(): Readonly<RestoreModel> {
    return { ...this.#session.model, active: this.#restoreActive };
  }
  /** Reports exclusive restoration ownership of the interface
   * @returns Whether local validation or API restoration is in progress
   */
  get busy(): boolean {
    return this.#session.busy;
  }
  /** Renders current restoration state in the shared selected language */
  render(): void {
    this.#view.render(
      this.model,
      this.dependencies.getLocale(),
      !!this.dependencies.getFrame(),
      this.dependencies.exportBusy(),
    );
  }

  async #load(): Promise<void> {
    const file = this.#view.element('restore-file', HTMLInputElement).files?.[0];
    if (!file || this.busy || this.dependencies.exportBusy()) return;
    this.#view.element('restore-confirm', HTMLInputElement).checked = false;
    await this.#session.load(file);
  }

  async #run(resume: boolean): Promise<void> {
    if (
      this.busy ||
      this.dependencies.exportBusy() ||
      !this.model.imported ||
      !this.#view.element('restore-confirm', HTMLInputElement).checked ||
      !this.model.context
    )
      return;
    if (await this.#session.run(this.dependencies.getLocale(), resume))
      this.#view.element('restore-confirm', HTMLInputElement).checked = false;
  }
}
