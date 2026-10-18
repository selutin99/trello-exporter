// The prototype accepts one explicitly selected test board. No account-wide APIs.
export class ScopeError extends Error {
  constructor(code = 'BOARD_SCOPE_BLOCKED') {
    super(code);
    this.name = 'ScopeError';
    this.code = code;
  }
}

export function parseBoardReference(value) {
  let reference = String(value ?? '').trim();
  if (reference.startsWith('https://')) {
    const url = new URL(reference);
    if (url.origin !== 'https://trello.com') throw new ScopeError();
    const match = /^\/b\/([a-zA-Z0-9]{8})(?:\/[^/]*)?\/?$/.exec(url.pathname);
    if (!match || url.search || url.hash) throw new ScopeError();
    reference = match[1];
  }
  if (!/^[a-zA-Z0-9]{8}$/.test(reference)) throw new ScopeError();
  return reference;
}

export class TestBoardScope {
  #reference;
  #boardId = null;
  #listIds = new Set();

  constructor(reference) {
    this.#reference = parseBoardReference(reference);
  }

  get reference() { return this.#reference; }

  get boardId() {
    if (!this.#boardId) throw new ScopeError('BOARD_NOT_VERIFIED');
    return this.#boardId;
  }

  bind(board, contextBoardId) {
    if (!board || board.shortLink !== this.#reference ||
        !/^[a-f0-9]{24}$/.test(board.id) ||
        (contextBoardId && contextBoardId !== board.id) ||
        (this.#boardId && board.id !== this.#boardId)) {
      throw new ScopeError();
    }
    this.#boardId = board.id;
  }

  assertBoard(boardId) {
    if (boardId !== this.boardId) throw new ScopeError();
  }

  rememberLists(lists) {
    if (!Array.isArray(lists)) throw new ScopeError();
    // Validate the entire response before making any IDs eligible for writes.
    for (const list of lists) {
      this.assertBoard(list.idBoard);
      if (!/^[a-f0-9]{24}$/.test(list.id)) throw new ScopeError();
    }
    for (const list of lists) this.#listIds.add(list.id);
  }

  assertKnownList(listId) {
    if (!this.#listIds.has(listId)) throw new ScopeError();
  }
}
