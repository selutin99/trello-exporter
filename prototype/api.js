import { ScopeError, TestBoardScope } from './scope.js';

export class ApiError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const apiOrigin = 'https://api.trello.com/1';
const pause = (ms, signal) => new Promise((resolve, reject) => {
  signal?.throwIfAborted();
  const finish = () => {
    signal?.removeEventListener('abort', abort);
    resolve();
  };
  const timer = setTimeout(finish, ms);
  const abort = () => {
    clearTimeout(timer);
    reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
  };
  signal?.addEventListener('abort', abort, { once: true });
});

export class TestBoardApi {
  #scope;
  #getToken;
  #fetch;
  #pause;
  #writesEnabled;

  constructor({ boardReference, getAccessToken, fetchImpl = fetch,
    pauseImpl = pause, writesEnabled = false }) {
    this.#scope = new TestBoardScope(boardReference);
    this.#getToken = getAccessToken;
    this.#fetch = fetchImpl;
    this.#pause = pauseImpl;
    this.#writesEnabled = writesEnabled;
  }

  async #request(method, path, { query = {}, body, signal } = {}) {
    // Endpoints are constructed only by the scoped methods below, never callers.
    const url = new URL(`${apiOrigin}${path}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const maxAttempts = method === 'GET' ? 3 : 1;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      signal?.throwIfAborted();
      const token = await this.#getToken();
      if (typeof token !== 'string' || !token) throw new ApiError('AUTH_REQUIRED');
      let response;
      try {
        // Browser fetch is a Web API: calling it as an instance method binds
        // an invalid receiver and can throw "Illegal invocation" before I/O.
        const fetchRequest = this.#fetch;
        response = await fetchRequest(url.href, {
          method,
          credentials: 'omit',
          redirect: 'error',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal,
        });
      } catch {
        signal?.throwIfAborted();
        // Never expose response bodies, tokens, URLs, or an uncertain POST as success.
        throw new ApiError(method === 'GET' ? 'NETWORK_ERROR' : 'WRITE_RESULT_UNKNOWN');
      }
      if (response.ok) {
        try { return await response.json(); }
        catch { throw new ApiError(method === 'GET' ? 'INVALID_RESPONSE' : 'WRITE_RESULT_UNKNOWN'); }
      }
      if (method === 'GET' && [429, 502, 503, 504].includes(response.status) &&
          attempt + 1 < maxAttempts) {
        const retry = response.headers.get('Retry-After');
        let delay = 500 * (2 ** attempt);
        if (retry) {
          const seconds = Number(retry);
          const requested = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - Date.now();
          if (Number.isFinite(requested)) delay = Math.max(delay, requested);
        }
        // Do not ignore a long server-directed delay by retrying too early.
        if (delay > 10_000) throw new ApiError('RATE_LIMIT_WAIT', response.status);
        await this.#pause(Math.max(0, delay), signal);
        continue;
      }
      const uncertain = method !== 'GET' && response.status >= 500;
      throw new ApiError(uncertain ? 'WRITE_RESULT_UNKNOWN' :
        response.status === 401 ? 'AUTH_REQUIRED' : 'API_REQUEST_FAILED', response.status);
    }
  }

  async verifyBoard({ contextBoardId, signal } = {}) {
    const board = await this.#request('GET', `/boards/${this.#scope.reference}`, {
      query: { fields: 'id,name,shortLink,closed' }, signal,
    });
    this.#scope.bind(board, contextBoardId);
    return { id: board.id, name: board.name, shortLink: board.shortLink, closed: board.closed };
  }

  async readLists({ signal } = {}) {
    const lists = await this.#request('GET', `/boards/${this.#scope.boardId}/lists`, {
      query: { filter: 'all', fields: 'id,idBoard,name,closed,pos' }, signal,
    });
    this.#scope.rememberLists(lists);
    return lists;
  }

  async createTestList({ signal } = {}) {
    this.#assertWrites();
    const list = await this.#request('POST', `/boards/${this.#scope.boardId}/lists`, {
      body: { name: '[Exporter test] API probe', pos: 'bottom' }, signal,
    });
    this.#scope.rememberLists([list]);
    return list;
  }

  async createTestCard(listId, { signal } = {}) {
    this.#assertWrites();
    this.#scope.assertKnownList(listId);
    // A list may have been moved after discovery. Recheck immediately before POST.
    const current = await this.#request('GET', `/lists/${listId}`, {
      query: { fields: 'id,idBoard' }, signal,
    });
    if (current.id !== listId) throw new ScopeError();
    this.#scope.assertBoard(current.idBoard);
    const card = await this.#request('POST', '/cards', {
      body: {
        idList: listId,
        name: '[Exporter test] API probe / Проверка API',
        desc: 'Synthetic test data created by the Trello Exporter prototype.',
      }, signal,
    });
    this.#scope.assertBoard(card.idBoard);
    if (card.idList !== listId) throw new ScopeError();
    return card;
  }

  #assertWrites() {
    if (!this.#writesEnabled) throw new ScopeError('WRITES_DISABLED');
  }
}
