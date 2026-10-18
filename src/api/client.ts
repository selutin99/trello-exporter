import { ApiError, ScopeError } from './errors';
import { TestBoardScope } from './scope';
import { Transport } from './transport';
import type { BoardList, BoardSummary, ClientOptions, RequestOptions, TestCard } from './types';
import { isId, isRecord } from './validation';

/** Selected-board API facade. Writes require explicit opt-in and verified child ownership. */
export class TestBoardApi {
  readonly #scope: TestBoardScope;
  readonly #transport: Transport;
  readonly #writesEnabled: boolean;

  constructor(options: ClientOptions) {
    this.#scope = new TestBoardScope(options.boardReference);
    this.#transport = new Transport(options);
    this.#writesEnabled = options.writesEnabled ?? false;
  }

  /** Checks Trello context and short link before binding the canonical board ID. */
  async verifyBoard(options: RequestOptions & { contextBoardId?: string } = {}): Promise<BoardSummary> {
    const board = await this.#transport.request('GET', `/boards/${this.#scope.reference}`, {
      query: { fields: 'id,name,shortLink,closed' }, signal: options.signal,
    });
    if (!isRecord(board) || !isId(board.id) || typeof board.shortLink !== 'string'
      || typeof board.name !== 'string' || typeof board.closed !== 'boolean') throw new ApiError('INVALID_RESPONSE');
    this.#scope.bind(board, options.contextBoardId);
    return { id: board.id, shortLink: board.shortLink, name: board.name, closed: board.closed };
  }

  /** Includes archived lists; a malformed or foreign response cannot extend the allowlist. */
  async readLists(options: RequestOptions = {}): Promise<BoardList[]> {
    const lists = await this.#transport.request('GET', `/boards/${this.#scope.boardId}/lists`, {
      query: { filter: 'all', fields: 'id,idBoard,name,closed,pos' }, ...options,
    });
    if (!Array.isArray(lists)) throw new ApiError('INVALID_RESPONSE');
    const projected = (lists as unknown[]).map(projectList);
    this.#scope.rememberLists(projected);
    return projected;
  }

  /** Creates synthetic data only after explicit write opt-in and board verification. */
  async createTestList(options: RequestOptions = {}): Promise<BoardList> {
    this.#assertWrites();
    const result = await this.#transport.request('POST', `/boards/${this.#scope.boardId}/lists`, {
      body: { name: '[Exporter test] API probe', pos: 'bottom' }, ...options,
    });
    // Malformed successful writes have an unknown result; never retry automatically.
    let list: BoardList;
    try { list = projectList(result); } catch { throw new ApiError('WRITE_RESULT_UNKNOWN'); }
    this.#scope.rememberLists([list]);
    return list;
  }

  /** Rechecks that the previously discovered list still belongs to the bound board. */
  async createTestCard(listId: string, options: RequestOptions = {}): Promise<TestCard> {
    this.#assertWrites();
    this.#scope.assertKnownList(listId);
    const current = await this.#transport.request('GET', `/lists/${listId}`, {
      query: { fields: 'id,idBoard' }, ...options,
    });
    if (!isRecord(current) || current.id !== listId) throw new ScopeError();
    this.#scope.assertBoard(current.idBoard);
    const card = await this.#transport.request('POST', '/cards', {
      body: {
        idList: listId, name: '[Exporter test] API probe / Проверка API',
        desc: 'Synthetic test data created by the Trello Exporter prototype.',
      }, ...options,
    });
    if (!isRecord(card) || !isId(card.id)) throw new ApiError('WRITE_RESULT_UNKNOWN');
    this.#scope.assertBoard(card.idBoard);
    if (card.idList !== listId) throw new ScopeError();
    return { id: card.id, idBoard: this.#scope.boardId, idList: listId };
  }

  #assertWrites(): void {
    if (!this.#writesEnabled) throw new ScopeError('WRITES_DISABLED');
  }
}

function projectList(value: unknown): BoardList {
  if (!isRecord(value) || !isId(value.id) || !isId(value.idBoard)
    || typeof value.name !== 'string' || typeof value.closed !== 'boolean'
    || typeof value.pos !== 'number' || !Number.isFinite(value.pos)) throw new ApiError('INVALID_RESPONSE');
  return { id: value.id, idBoard: value.idBoard, name: value.name, closed: value.closed, pos: value.pos };
}
