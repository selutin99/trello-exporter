import { TestBoardApi } from '../api/client';
import { Transport } from '../api/transport';
import { HttpMethod } from '../api/types';
import type { ClientOptions, RequestOptions } from '../api/types';
import { isId, isRecord } from '../api/validation';
import { ApiError, ScopeError } from '../api/errors';
import { ApiErrorCode } from '../shared/error-codes';
import { serviceUrls } from '../config/services';
import { RestoreError, RestoreErrorCode, RestoreResource } from './codes';
import type { RestoreContext, RestoreTarget } from './types';

/** API writes restricted to a newly created restoration board, never the context board */
export class RestoreApi {
  readonly #transport: Transport;
  readonly #source: TestBoardApi;
  #target: RestoreTarget | null = null;

  /**
   * Creates a restoration transport using the trusted API origin
   * @param options - Explicit board boundary, OAuth provider, and HTTP dependencies
   */
  constructor(options: ClientOptions) {
    this.#transport = new Transport(options);
    this.#source = new TestBoardApi(options);
  }

  /**
   * Discovers only the current board's Workspace without enumerating boards or Workspaces
   * @param boardId - Live SDK context identity
   * @param options - Optional cancellation
   * @returns The verified destination Workspace context
   * @throws ScopeError for a foreign board; ApiError for unavailable metadata
   */
  async context(boardId: string, options: RequestOptions = {}): Promise<RestoreContext> {
    await this.#source.verifyBoard({ contextBoardId: boardId, ...options });
    const board = await this.#transport.request(HttpMethod.Get, `/boards/${boardId}`, {
      query: {
        fields: 'id,idOrganization',
        organization: 'true',
        organization_fields: 'id,displayName',
      },
      ...options,
    });
    if (!isRecord(board) || board.id !== boardId || !isId(board.idOrganization))
      throw new ScopeError();
    const workspace = board.organization;
    const workspaceName =
      isRecord(workspace) &&
      workspace.id === board.idOrganization &&
      typeof workspace.displayName === 'string'
        ? workspace.displayName
        : board.idOrganization;
    return { boardId, workspaceId: board.idOrganization, workspaceName };
  }

  /**
   * Creates a new private board without default lists or labels
   * @param context - Freshly verified context, independent of imported source IDs
   * @param name - User-reviewed destination name
   * @param description - Imported board description
   * @param options - Optional cancellation
   * @returns The newly created target
   * @throws ApiError on an uncertain write; RestoreError when privacy or ownership differs
   */
  async createBoard(
    context: RestoreContext,
    name: string,
    description: string,
    options: RequestOptions = {},
  ): Promise<RestoreTarget> {
    const board = await this.#transport.request(HttpMethod.Post, '/boards', {
      body: {
        name,
        desc: description,
        idOrganization: context.workspaceId,
        prefs_permissionLevel: 'private',
        defaultLists: false,
        defaultLabels: false,
      },
      ...options,
    });
    if (
      !isRecord(board) ||
      !isId(board.id) ||
      typeof board.shortLink !== 'string' ||
      !/^[a-zA-Z0-9]{8}$/.test(board.shortLink)
    )
      throw new ApiError(ApiErrorCode.WriteResultUnknown);
    if (
      board.id === context.boardId ||
      board.idOrganization !== context.workspaceId ||
      !isRecord(board.prefs) ||
      board.prefs.permissionLevel !== 'private'
    )
      throw new RestoreError(RestoreErrorCode.InvalidTarget);
    this.#target = {
      id: board.id,
      name,
      workspaceId: context.workspaceId,
      url: `${serviceUrls.trelloBoardOrigin}/b/${board.shortLink}`,
    };
    return this.#target;
  }

  /**
   * Rebinds only a target previously recorded by this browser's trusted local journal
   * @param target - Locally created operation target, never imported snapshot input
   * @param context - Freshly verified live context
   * @param options - Optional cancellation
   * @throws RestoreError or ScopeError when the board, Workspace, or privacy no longer matches
   */
  async resumeTarget(
    target: RestoreTarget,
    context: RestoreContext,
    options: RequestOptions = {},
  ): Promise<void> {
    if (
      target.id === context.boardId ||
      target.workspaceId !== context.workspaceId ||
      !isId(target.id)
    )
      throw new RestoreError(RestoreErrorCode.InvalidTarget);
    this.#target = target;
    await this.verifyTarget(options);
  }

  /**
   * Rechecks destination identity, privacy, and Workspace
   * @param options - Optional cancellation
   * @throws RestoreError for a missing target; ScopeError if target ownership changed
   */
  async verifyTarget(options: RequestOptions = {}): Promise<void> {
    const target = this.#target;
    if (!target) throw new RestoreError(RestoreErrorCode.InvalidTarget);
    const board = await this.#transport.request(HttpMethod.Get, `/boards/${target.id}`, {
      query: { fields: 'id,idOrganization,prefs,closed' },
      ...options,
    });
    if (
      !isRecord(board) ||
      board.id !== target.id ||
      board.idOrganization !== target.workspaceId ||
      board.closed !== false ||
      !isRecord(board.prefs) ||
      board.prefs.permissionLevel !== 'private'
    )
      throw new ScopeError();
  }

  /**
   * Creates one entity after a fresh destination/parent ownership check
   * @param resource - Supported entity kind
   * @param parentId - Target board, list, card, or checklist identity
   * @param body - Engine-produced values with mapped target IDs
   * @param options - Optional cancellation
   * @returns The new target identity
   * @throws ScopeError for a foreign parent; ApiError on failed or uncertain writes
   */
  async create(
    resource: RestoreResource,
    parentId: string,
    body: Record<string, unknown> | FormData,
    options: RequestOptions = {},
  ): Promise<string> {
    await this.verifyTarget(options);
    const path = await this.#path(resource, parentId, options);
    const result = await this.#transport.request(HttpMethod.Post, path, { body, ...options });
    if (!isRecord(result) || !isId(result.id)) throw new ApiError(ApiErrorCode.WriteResultUnknown);
    return result.id;
  }

  /**
   * Restores a custom field value to a verified target card
   * @param cardId - Mapped target card
   * @param fieldId - Mapped target field
   * @param value - Typed source value or mapped option
   * @param options - Optional cancellation
   * @throws ScopeError for foreign ownership; ApiError for failed or uncertain updates
   */
  async value(
    cardId: string,
    fieldId: string,
    value: Record<string, unknown>,
    options: RequestOptions = {},
  ): Promise<void> {
    await this.verifyTarget(options);
    await this.verifyEntity(RestoreResource.Card, cardId, options);
    await this.verifyEntity(RestoreResource.Field, fieldId, options);
    await this.#transport.request(HttpMethod.Put, `/cards/${cardId}/customField/${fieldId}/item`, {
      body: value,
      ...options,
    });
  }

  /**
   * Verifies a known created entity before reuse or journal continuation
   * @param resource - Supported target entity kind
   * @param id - Target identity from this operation's journal
   * @param options - Optional cancellation
   * @returns Projected source response for option mapping or verification
   * @throws ScopeError when parent ownership is not the operation's target
   */
  async verifyEntity(
    resource: RestoreResource,
    id: string,
    options: RequestOptions = {},
  ): Promise<Record<string, unknown>> {
    if (!isId(id) || !this.#target) throw new ScopeError();
    const path = resource === RestoreResource.Item ? null : `/${resource}/${id}`;
    if (!path) throw new ScopeError();
    const value = await this.#transport.request(HttpMethod.Get, path, options);
    if (!isRecord(value) || value.id !== id) throw new ScopeError();
    const boardId = resource === RestoreResource.Field ? value.idModel : value.idBoard;
    if (boardId !== this.#target.id) throw new ScopeError();
    return value;
  }

  async #path(resource: RestoreResource, parent: string, options: RequestOptions): Promise<string> {
    const target = this.#target;
    if (!target) throw new RestoreError(RestoreErrorCode.InvalidTarget);
    if ([RestoreResource.List, RestoreResource.Label, RestoreResource.Field].includes(resource)) {
      if (parent !== target.id) throw new ScopeError();
      if (resource === RestoreResource.List) return `/boards/${target.id}/lists`;
      if (resource === RestoreResource.Label) return `/boards/${target.id}/labels`;
      return '/customFields';
    }
    if (resource === RestoreResource.Card) {
      await this.verifyEntity(RestoreResource.List, parent, options);
      return '/cards';
    }
    if (resource === RestoreResource.Item) {
      await this.verifyEntity(RestoreResource.Checklist, parent, options);
      return `/checklists/${parent}/checkItems`;
    }
    await this.verifyEntity(RestoreResource.Card, parent, options);
    if (resource === RestoreResource.Checklist) return `/cards/${parent}/checklists`;
    if (resource === RestoreResource.Attachment) return `/cards/${parent}/attachments`;
    if (resource === RestoreResource.Comment) return `/cards/${parent}/actions/comments`;
    throw new ScopeError();
  }
}
