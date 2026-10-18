import { ScopeError } from './errors';
import { isId, isRecord } from './validation';

/** Accepts an exact short link or HTTPS Trello board URL without query or fragment. */
export function parseBoardReference(value: unknown): string {
  let reference = typeof value === 'string' ? value.trim() : '';
  if (reference.startsWith('https://')) {
    let url: URL;
    try { url = new URL(reference); } catch { throw new ScopeError(); }
    if (url.origin !== 'https://trello.com' || url.username || url.password) throw new ScopeError();
    const match = /^\/b\/([a-zA-Z0-9]{8})(?:\/[^/]*)?\/?$/.exec(url.pathname);
    if (!match?.[1] || url.search || url.hash) throw new ScopeError();
    reference = match[1];
  }
  if (!/^[a-zA-Z0-9]{8}$/.test(reference)) throw new ScopeError();
  return reference;
}

/** Binds once to one board and validates child ownership before allowing mutations. */
export class TestBoardScope {
  readonly reference: string;
  #boardId: string | null = null;
  #listIds = new Set<string>();

  constructor(reference: string) { this.reference = parseBoardReference(reference); }

  get boardId(): string {
    if (!this.#boardId) throw new ScopeError('BOARD_NOT_VERIFIED');
    return this.#boardId;
  }

  bind(board: unknown, contextBoardId?: string): void {
    if (!isRecord(board) || board.shortLink !== this.reference || !isId(board.id)
      || (contextBoardId !== undefined && contextBoardId !== board.id)
      || (this.#boardId && board.id !== this.#boardId)) throw new ScopeError();
    this.#boardId = board.id;
  }

  assertBoard(boardId: unknown): void {
    if (boardId !== this.boardId) throw new ScopeError();
  }

  /** Validates the entire response before adding any IDs to the allowlist. */
  rememberLists(lists: unknown): void {
    if (!Array.isArray(lists)) throw new ScopeError();
    const ids: string[] = [];
    for (const list of lists as unknown[]) {
      if (!isRecord(list) || !isId(list.id)) throw new ScopeError();
      this.assertBoard(list.idBoard);
      ids.push(list.id);
    }
    for (const id of ids) this.#listIds.add(id);
  }

  assertKnownList(listId: string): void {
    if (!this.#listIds.has(listId)) throw new ScopeError();
  }
}
