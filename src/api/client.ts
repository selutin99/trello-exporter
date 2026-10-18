import { HttpMethod } from './types';
import { ApiErrorCode, ScopeErrorCode } from '../shared/error-codes';
import { ApiError, ScopeError } from './errors';
import { TestBoardScope } from './scope';
import { Transport } from './transport';
import type { BoardList, BoardSummary, ClientOptions, RequestOptions, TestCard } from './types';
import { isId, isRecord } from './validation';

/** Selected-board API facade. Writes require explicit opt-in and verified child ownership */
export class TestBoardApi {
  readonly #scope: TestBoardScope;
  readonly #transport: Transport;
  readonly #writesEnabled: boolean;

  /**
   * Creates a client restricted to one explicitly selected board
   * @param options - Board reference, token provider, transport, and write opt-in
   */
  constructor(options: ClientOptions) {
    this.#scope = new TestBoardScope(options.boardReference);
    this.#transport = new Transport(options);
    this.#writesEnabled = options.writesEnabled ?? false;
  }

  /**
   * Binds the board only after validating its response and Trello context
   * @param options - Expected board context and optional cancellation signal
   * @returns A validated projection of board metadata
   * @throws ApiError on authentication, transport, or response failures; ScopeError on an identity mismatch; the signal reason on cancellation
   */
  async verifyBoard(
    options: RequestOptions & { contextBoardId?: string } = {},
  ): Promise<BoardSummary> {
    const board = await this.#transport.request(
      HttpMethod.Get,
      `/boards/${this.#scope.reference}`,
      {
        query: { fields: 'id,name,shortLink,closed' },
        signal: options.signal,
      },
    );
    if (
      !isRecord(board) ||
      !isId(board.id) ||
      typeof board.shortLink !== 'string' ||
      typeof board.name !== 'string' ||
      typeof board.closed !== 'boolean'
    )
      throw new ApiError(ApiErrorCode.InvalidResponse);
    this.#scope.bind(board, options.contextBoardId);
    return { id: board.id, shortLink: board.shortLink, name: board.name, closed: board.closed };
  }

  /**
   * Validates every list before extending the board allowlist
   * @param options - Optional cancellation signal
   * @returns Active and archived lists with validated fields
   * @throws ApiError on invalid responses; ScopeError before board verification or on foreign ownership; the signal reason on cancellation
   */
  async readLists(options: RequestOptions = {}): Promise<BoardList[]> {
    const lists = await this.#transport.request(
      HttpMethod.Get,
      `/boards/${this.#scope.boardId}/lists`,
      {
        query: { filter: 'all', fields: 'id,idBoard,name,closed,pos' },
        ...options,
      },
    );
    if (!Array.isArray(lists)) throw new ApiError(ApiErrorCode.InvalidResponse);
    const projected = (lists as unknown[]).map(projectList);
    this.#scope.rememberLists(projected);
    return projected;
  }

  /**
   * Creates synthetic data only after explicit write opt-in and board verification
   * @param options - Optional cancellation signal
   * @returns The validated newly created list
   * @throws ScopeError if writes are disabled or ownership differs; ApiError if the write fails or its result is unknown; the signal reason on cancellation
   */
  async createTestList(options: RequestOptions = {}): Promise<BoardList> {
    this.#assertWrites();
    const result = await this.#transport.request(
      HttpMethod.Post,
      `/boards/${this.#scope.boardId}/lists`,
      {
        body: { name: '[Exporter test] API probe', pos: 'bottom' },
        ...options,
      },
    );
    // Malformed successful writes have an unknown result; never retry automatically.
    let list: BoardList;
    try {
      list = projectList(result);
    } catch {
      throw new ApiError(ApiErrorCode.WriteResultUnknown);
    }
    this.#scope.rememberLists([list]);
    return list;
  }

  /**
   * Rechecks list ownership immediately before creating a synthetic card
   * @param listId - Previously discovered list belonging to the selected board
   * @param options - Optional cancellation signal
   * @returns The created card identity and its verified parent IDs
   * @throws ScopeError for disabled writes or invalid ownership; ApiError for request failures or uncertain writes; the signal reason on cancellation
   */
  async createTestCard(listId: string, options: RequestOptions = {}): Promise<TestCard> {
    this.#assertWrites();
    this.#scope.assertKnownList(listId);
    const current = await this.#transport.request(HttpMethod.Get, `/lists/${listId}`, {
      query: { fields: 'id,idBoard' },
      ...options,
    });
    if (!isRecord(current) || current.id !== listId) throw new ScopeError();
    this.#scope.assertBoard(current.idBoard);
    const card = await this.#transport.request(HttpMethod.Post, '/cards', {
      body: {
        idList: listId,
        name: '[Exporter test] API probe',
        desc: 'Synthetic test data created by the Trello Exporter prototype.',
      },
      ...options,
    });
    if (!isRecord(card) || !isId(card.id)) throw new ApiError(ApiErrorCode.WriteResultUnknown);
    this.#scope.assertBoard(card.idBoard);
    if (card.idList !== listId) throw new ScopeError();
    return { id: card.id, idBoard: this.#scope.boardId, idList: listId };
  }

  #assertWrites(): void {
    if (!this.#writesEnabled) throw new ScopeError(ScopeErrorCode.WritesDisabled);
  }
}

function projectList(value: unknown): BoardList {
  if (
    !isRecord(value) ||
    !isId(value.id) ||
    !isId(value.idBoard) ||
    typeof value.name !== 'string' ||
    typeof value.closed !== 'boolean' ||
    typeof value.pos !== 'number' ||
    !Number.isFinite(value.pos)
  )
    throw new ApiError(ApiErrorCode.InvalidResponse);
  return {
    id: value.id,
    idBoard: value.idBoard,
    name: value.name,
    closed: value.closed,
    pos: value.pos,
  };
}
