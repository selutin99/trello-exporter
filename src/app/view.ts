import type { ProbeController } from '../core';
import { localizePage, translations } from '../i18n';
import type { Locale } from '../i18n';

/** Typed DOM boundary; an incompatible page fails at initialization. */
export class ProbeView {
  readonly language: HTMLSelectElement;
  readonly file: HTMLInputElement;
  readonly download: HTMLButtonElement;
  readonly scan: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly report: HTMLButtonElement;
  readonly connect: HTMLButtonElement;
  readonly inspect: HTMLButtonElement;
  readonly #scope: HTMLElement;
  readonly #status: HTMLElement;
  readonly #results: HTMLElement;
  readonly #standalone: HTMLElement;

  constructor(private readonly document: Document) {
    this.language = element(document, 'language', 'select');
    this.file = element(document, 'file', 'input');
    this.download = element(document, 'download', 'button');
    this.scan = element(document, 'scan', 'button');
    this.cancel = element(document, 'cancel', 'button');
    this.report = element(document, 'report', 'button');
    this.connect = element(document, 'connect', 'button');
    this.inspect = element(document, 'inspect', 'button');
    this.#scope = element(document, 'scope', 'code');
    this.#status = element(document, 'status', 'p');
    this.#results = element(document, 'results', 'pre');
    this.#standalone = element(document, 'standalone', 'p');
  }

  render(locale: Locale, model: ProbeController, boardReference: string | null, sdkReady: boolean, apiReady: boolean): void {
    localizePage(locale, this.document);
    this.language.value = locale;
    this.#scope.textContent = boardReference ?? translations[locale].missingScope;
    this.#status.textContent = translations[locale][model.status];
    this.#results.textContent = JSON.stringify(model.report, null, 2);
    this.#standalone.hidden = sdkReady;
    this.connect.disabled = model.busy || !sdkReady || !boardReference;
    this.inspect.disabled = model.busy || !apiReady;
    this.scan.disabled = model.busy || !this.file.files?.length;
    this.cancel.disabled = !model.busy;
    this.file.disabled = model.busy;
    this.download.disabled = model.busy;
    this.report.disabled = model.busy;
  }
}

function element<Tag extends keyof HTMLElementTagNameMap>(document: Document, id: string, tag: Tag): HTMLElementTagNameMap[Tag] {
  const value = document.getElementById(id);
  if (!value || value.localName !== tag) throw new Error(`MISSING_ELEMENT_${id}`);
  return value as HTMLElementTagNameMap[Tag];
}
