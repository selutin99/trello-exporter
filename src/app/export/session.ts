import { ScopeError } from '../../api/errors';
import type { BoardReader } from '../../api/reader';
import { buildArchive, jsonBytes } from '../../snapshot/archive';
import { captureBoard } from '../../snapshot/capture';
import type { CapturedBoard } from '../../snapshot/capture';
import { CaptureOutcome, ExportFormat } from '../../snapshot/codes';
import { ExportState } from './types';
import type { ExportModel } from './types';

/** One cancellable export at a time; content remains in this window only */
export class ExportSession {
  readonly model: ExportModel = {
    state: ExportState.Disconnected,
    board: null,
    format: ExportFormat.Zip,
    progress: null,
    result: null,
    demo: false,
  };
  #active: AbortController | null = null;
  #demoCapture: (() => CapturedBoard) | null = null;
  #demoReader: Pick<BoardReader, 'file'> | null = null;

  /**
   * Creates an export session with an explicit UI notification boundary
   * @param changed - Called when visible session state changes
   */
  constructor(private readonly changed: () => void) {}

  /**
   * Reports whether a load or export is in progress
   * @returns Whether a cancellable operation owns the session
   */
  get busy(): boolean {
    return this.#active !== null;
  }

  /**
   * Selects an output format when no operation is in progress
   * @param format - Requested portable format
   */
  selectFormat(format: ExportFormat): void {
    if (this.busy) return;
    this.model.format = format;
    this.model.result = null;
    if (this.model.board) this.model.state = ExportState.Ready;
    this.changed();
  }

  /**
   * Loads a small board overview through the scoped API
   * @param reader - Board-scoped reader
   * @param contextBoardId - Live SDK board identity
   * @returns Completion of the overview request
   */
  async load(reader: BoardReader, contextBoardId: string): Promise<void> {
    await this.#run(ExportState.Loading, async (signal) => {
      const board = await reader.board(contextBoardId, { signal });
      const lists = await reader.lists({ signal });
      const cards = await reader.cards({ signal });
      signal.throwIfAborted();
      this.model.board = { name: board.name, lists: lists.length, cards: cards.length };
      this.model.state = ExportState.Ready;
    });
  }

  /**
   * Enables an explicitly labelled synthetic preview without Trello access
   * @param capture - Fresh synthetic capture factory
   * @param fileReader - Original synthetic file bytes
   */
  useDemo(capture: () => CapturedBoard, fileReader: Pick<BoardReader, 'file'>): void {
    if (this.busy) return;
    this.#demoCapture = capture;
    this.#demoReader = fileReader;
    const { snapshot } = capture();
    this.model.demo = true;
    this.model.board = {
      name: snapshot.board.name,
      lists: snapshot.lists.length,
      cards: snapshot.cards.length,
    };
    this.model.state = ExportState.Ready;
    this.changed();
  }

  /**
   * Builds a fresh snapshot and prepares a separate, user-initiated download
   * @param reader - Live scoped reader, or a file-only synthetic preview boundary
   * @param contextBoardId - Live SDK board identity
   * @returns Completion after the archive is ready or an error is displayed
   */
  async prepare(reader: BoardReader | null, contextBoardId: string): Promise<void> {
    if (!this.model.board || (!reader && !this.#demoCapture)) return;
    await this.#run(ExportState.Running, async (signal) => {
      const options = {
        signal,
        onProgress: (progress: NonNullable<ExportModel['progress']>) => {
          if (signal.aborted) return;
          this.model.progress = progress;
          this.changed();
        },
      };
      const capture = this.#demoCapture
        ? this.#demoCapture()
        : await captureBoard(reader!, contextBoardId, options);
      const format = this.model.format;
      const blob =
        format === ExportFormat.Zip
          ? await buildArchive(capture, this.#demoReader ?? reader!, options)
          : new Blob([jsonBytes(capture.snapshot)], { type: 'application/json;charset=utf-8' });
      signal.throwIfAborted();
      const snapshot = capture.snapshot;
      const date = new Date().toISOString().replaceAll(':', '-').slice(0, 19);
      this.model.result = { blob, snapshot, format, filename: `trello-exporter-${date}.${format}` };
      this.model.state =
        snapshot.capture.outcome === CaptureOutcome.Complete
          ? ExportState.Complete
          : ExportState.Partial;
    });
  }

  /** Cancels the active operation and immediately clears prepared content */
  cancel(): void {
    this.#active?.abort();
    this.#active = null;
    this.model.result = null;
    this.model.progress = null;
    this.model.state = ExportState.Cancelled;
    this.changed();
  }

  async #run(state: ExportState, task: (signal: AbortSignal) => Promise<void>): Promise<void> {
    if (this.busy) return;
    const active = new AbortController();
    this.#active = active;
    this.model.result = null;
    this.model.progress = null;
    this.model.state = state;
    this.changed();
    try {
      await task(active.signal);
    } catch (error) {
      if (!active.signal.aborted)
        this.model.state =
          error instanceof ScopeError ? ExportState.ScopeFailed : ExportState.Failed;
    } finally {
      if (this.#active === active) {
        this.#active = null;
        this.changed();
      }
    }
  }
}
