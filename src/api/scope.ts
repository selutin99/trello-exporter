import { ScopeErrorCode } from '../shared/error-codes';
import { serviceUrls } from '../config/services';
import { ScopeError } from './errors';
import { isId, isRecord } from './validation';

/**
 * Accepts an exact short link or HTTPS Trello board URL without query or fragment
 * @param value - Caller-supplied board reference
 * @returns The eight-character board short link
 * @throws ScopeError when the reference is malformed or points outside Trello
 */
export function parseBoardReference(value: unknown): string {
  let reference = typeof value === 'string' ? value.trim() : '';
  if (reference.startsWith('https://')) {
    let url: URL;
    try {
      url = new URL(reference);
    } catch {
      throw new ScopeError();
    }
    if (url.origin !== serviceUrls.trelloBoardOrigin || url.username || url.password)
      throw new ScopeError();
    const match = /^\/b\/([a-zA-Z0-9]{8})(?:\/[^/]*)?\/?$/.exec(url.pathname);
    if (!match?.[1] || url.search || url.hash) throw new ScopeError();
    reference = match[1];
  }
  if (!/^[a-zA-Z0-9]{8}$/.test(reference)) throw new ScopeError();
  return reference;
}

/** Binds once to one board and validates child ownership before allowing mutations */
export class TestBoardScope {
  readonly reference: string;
  #boardId: string | null = null;
  #listIds = new Set<string>();

  /**
   * Starts an unbound scope for one board
   * @param reference - Exact short link or supported Trello board URL
   * @throws ScopeError if the board reference is invalid
   */
  constructor(reference: string) {
    this.reference = parseBoardReference(reference);
  }

  /**
   * Returns the canonical identity after verification
   * @returns The bound Trello board ID
   * @throws ScopeError before the board has been verified
   */
  get boardId(): string {
    if (!this.#boardId) throw new ScopeError(ScopeErrorCode.BoardNotVerified);
    return this.#boardId;
  }

  /**
   * Binds once to matching board metadata and optional SDK context
   * @param board - Untrusted API board identity
   * @param contextBoardId - Canonical board ID provided by the SDK
   * @throws ScopeError if identities differ or a different board is already bound
   */
  bind(board: unknown, contextBoardId?: string): void {
    if (
      !isRecord(board) ||
      board.shortLink !== this.reference ||
      !isId(board.id) ||
      (contextBoardId !== undefined && contextBoardId !== board.id) ||
      (this.#boardId && board.id !== this.#boardId)
    )
      throw new ScopeError();
    this.#boardId = board.id;
  }

  /**
   * Rejects a foreign board identity
   * @param boardId - Identity to compare with the verified board
   * @throws ScopeError if the board is unverified or the identity differs
   */
  assertBoard(boardId: unknown): void {
    if (boardId !== this.boardId) throw new ScopeError();
  }

  /**
   * Validates the entire response before adding list IDs to the allowlist
   * @param lists - Untrusted list collection
   * @throws ScopeError on a malformed response or foreign list
   */
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

  /**
   * Requires a list previously discovered within the verified board
   * @param listId - Candidate list identity
   * @throws ScopeError when the list is absent from the allowlist
   */
  assertKnownList(listId: string): void {
    if (!this.#listIds.has(listId)) throw new ScopeError();
  }
}
