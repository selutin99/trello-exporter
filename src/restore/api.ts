import { BoardReader } from '../api/reader';
import { Transport } from '../api/transport';
import { HttpMethod } from '../api/types';
import type { ClientOptions, RequestOptions } from '../api/types';
import { isId, isRecord } from '../api/validation';
import { ApiError, ScopeError } from '../api/errors';
import { ApiErrorCode } from '../shared/error-codes';
import { captureBoard } from '../snapshot/capture';
import type { Snapshot } from '../snapshot/types';
import { RestoreError, RestoreErrorCode, RestoreResource } from './codes';
import type { RestoreContext, RestoreTarget, RestoreWriter } from './types';
import { canonicalJson } from '../shared/json';
import { assertCreatePayload, assertUpdatePayload, assertExpectedValues } from './payloads';
import { RestoreScope } from './scope';

/** Merge transport restricted to the currently open SDK board; board creation is not exposed */
export class RestoreApi implements RestoreWriter {
  readonly #transport: Transport;
  readonly #scope: RestoreScope;
  /**
   * Binds the trusted API origin and explicitly verified board boundary
   * @param options - Current board identity, OAuth provider, and HTTP dependencies
   */
  constructor(private readonly options: ClientOptions) {
    this.#transport = new Transport(options);
    this.#scope = new RestoreScope(options);
  }
  /**
   * Verifies the current SDK board and its Workspace without enumerating other boards
   * @param boardId - Canonical identity from the SDK, never the snapshot
   * @param options - Optional cancellation
   * @returns Verified destination context
   * @throws ScopeError for an identity mismatch; propagates API and cancellation failures
   */
  context(boardId: string, options: RequestOptions = {}): Promise<RestoreContext> {
    return this.#scope.context(boardId, options);
  }
  /**
   * Selects only the existing board verified by the current context
   * @param context - Fresh SDK-bound destination context
   * @param options - Optional cancellation
   * @returns Current board metadata for progress and reports
   * @throws ScopeError when board identity or Workspace changed
   */
  selectTarget(context: RestoreContext, options: RequestOptions = {}): Promise<RestoreTarget> {
    return this.#scope.selectTarget(context, options);
  }
  /**
   * Reads current active content for a merge comparison without downloading attachment bytes
   * @param context - Fresh live context
   * @param options - Optional cancellation
   * @returns Current normalized content
   * @throws Propagates ownership, read, and cancellation failures
   */
  async snapshot(context: RestoreContext, options: RequestOptions = {}): Promise<Snapshot> {
    await this.selectTarget(context, options);
    return (
      await captureBoard(
        new BoardReader(this.options),
        context.boardId,
        options.signal ? { signal: options.signal } : {},
      )
    ).snapshot;
  }
  /**
   * Rechecks that the selected current board remains active in the same Workspace
   * @param options - Optional cancellation
   * @throws ScopeError when the destination changed; RestoreError before selection
   */
  async verifyTarget(options: RequestOptions = {}): Promise<void> {
    await this.#scope.verifyTarget(options);
  }
  /**
   * Creates one missing object after current-board and parent verification
   * @param resource - Supported nested collection; boards cannot be created
   * @param parentId - Mapped current-board parent identity
   * @param body - Allowlisted engine-produced fields or attachment form data
   * @param options - Optional cancellation
   * @returns The newly created identity
   * @throws ScopeError for unsafe payloads or foreign parents; ApiError for failed or unknown writes
   */
  async create(
    resource: RestoreResource,
    parentId: string,
    body: Record<string, unknown> | FormData,
    options: RequestOptions = {},
  ): Promise<string> {
    await this.verifyTarget(options);
    const path = await this.#createPath(resource, parentId, options);
    assertCreatePayload(resource, parentId, body);
    if (resource === RestoreResource.Card && !(body instanceof FormData))
      await this.#verifyLabels(body, options);
    const result = await this.#transport.request(HttpMethod.Post, path, { body, ...options });
    if (!isRecord(result) || !isId(result.id)) throw new ApiError(ApiErrorCode.WriteResultUnknown);
    return result.id;
  }
  /**
   * Applies one reviewed field with a fresh value check immediately before the write
   * @param resource - Mutable current-board entity kind
   * @param id - Verified target identity
   * @param body - Exactly the fields selected in the merge plan
   * @param expected - The values reviewed before the operation
   * @param options - Optional cancellation
   * @throws ScopeError for unreviewed fields or foreign parents; RestoreError for stale values; propagates write failures
   */
  async update(
    resource: RestoreResource,
    id: string,
    body: Record<string, unknown>,
    expected: Record<string, unknown>,
    options: RequestOptions = {},
  ): Promise<void> {
    await this.verifyTarget(options);
    assertUpdatePayload(resource, body);
    if (resource === RestoreResource.Board && id !== this.#scope.target.id) throw new ScopeError();
    const current =
      resource === RestoreResource.Board
        ? await this.#scope.verifyTarget(options)
        : await this.verifyEntity(resource, id, options);
    assertExpectedValues(current, body, expected);
    if (typeof body.idList === 'string')
      await this.verifyEntity(RestoreResource.List, body.idList, options);
    await this.#verifyLabels(body, options);
    await this.#transport.request(HttpMethod.Put, `/${resource}/${id}`, { body, ...options });
  }
  /**
   * Sets a reviewed custom value after validating the card, field, and optional old value
   * @param cardId - Current-board card
   * @param fieldId - Current-board custom field
   * @param value - Typed value or mapped dropdown choice
   * @param options - Optional cancellation
   * @param expected - Reviewed value, or null for an unset value
   * @throws RestoreError on a stale field; propagates ownership and write failures
   */
  async value(
    cardId: string,
    fieldId: string,
    value: Record<string, unknown>,
    options: RequestOptions = {},
    expected: unknown = null,
  ): Promise<void> {
    await this.verifyTarget(options);
    await this.verifyEntity(RestoreResource.Card, cardId, options);
    await this.verifyEntity(RestoreResource.Field, fieldId, options);
    if (typeof value.idValue === 'string')
      await this.verifyNested(RestoreResource.Option, fieldId, value.idValue, options);
    const values = await this.#transport.request(
      HttpMethod.Get,
      `/cards/${cardId}/customFieldItems`,
      options,
    );
    if (!Array.isArray(values)) throw new ScopeError();
    const current: unknown = values.find(
      (item: unknown) => isRecord(item) && item.idCustomField === fieldId,
    );
    let content: unknown = null;
    if (isRecord(current))
      content = current.idValue ? { idValue: current.idValue } : { value: current.value };
    if (canonicalJson(content) !== canonicalJson(expected))
      throw new RestoreError(RestoreErrorCode.PlanStale);
    await this.#transport.request(HttpMethod.Put, `/cards/${cardId}/customField/${fieldId}/item`, {
      body: value,
      ...options,
    });
  }
  /**
   * Updates a checked item through its verified current card and checklist
   * @param checklistId - Owning checklist
   * @param itemId - Current item
   * @param body - Selected name, state, or due date
   * @param expected - Reviewed current values
   * @param options - Optional cancellation
   * @throws ScopeError for unreviewed fields or foreign parents; RestoreError for stale values; propagates write failures
   */
  async item(
    checklistId: string,
    itemId: string,
    body: Record<string, unknown>,
    expected: Record<string, unknown>,
    options: RequestOptions = {},
  ): Promise<void> {
    await this.verifyTarget(options);
    const checklist = await this.verifyEntity(RestoreResource.Checklist, checklistId, options);
    const current = await this.verifyNested(RestoreResource.Item, checklistId, itemId, options);
    if (!isId(checklist.idCard)) throw new ScopeError();
    assertUpdatePayload(RestoreResource.Item, body);
    await this.verifyEntity(RestoreResource.Card, checklist.idCard, options);
    assertExpectedValues(current, body, expected);
    await this.#transport.request(
      HttpMethod.Put,
      `/cards/${checklist.idCard}/checkItem/${itemId}`,
      { body, ...options },
    );
  }
  /**
   * Verifies a selected active parent before it can receive content
   * @param resource - Board-owned entity kind
   * @param id - Current target identity
   * @param options - Optional cancellation
   * @returns Current API fields
   * @throws RestoreError before target selection; ScopeError for malformed, archived, or foreign parents
   */
  verifyEntity(
    resource: RestoreResource,
    id: string,
    options: RequestOptions = {},
  ): Promise<Record<string, unknown>> {
    return this.#scope.verifyEntity(resource, id, options);
  }
  /**
   * Verifies an item or dropdown option through its owning current-board parent
   * @param resource - Supported nested identity kind
   * @param parent - Mapped current-board parent
   * @param id - Nested target identity
   * @param options - Optional cancellation
   * @returns The validated nested response
   * @throws RestoreError before target selection; ScopeError for mismatched parent or nested identity
   */
  verifyNested(
    resource: RestoreResource,
    parent: string,
    id: string,
    options: RequestOptions = {},
  ): Promise<Record<string, unknown>> {
    return this.#scope.verifyNested(resource, parent, id, options);
  }
  async #verifyLabels(body: Record<string, unknown>, options: RequestOptions): Promise<void> {
    if (!('idLabels' in body)) return;
    if (!Array.isArray(body.idLabels)) throw new ScopeError();
    const labels: unknown[] = body.idLabels;
    for (const label of labels) {
      if (!isId(label)) throw new ScopeError();
      await this.verifyEntity(RestoreResource.Label, label, options);
    }
  }
  async #createPath(
    resource: RestoreResource,
    parent: string,
    options: RequestOptions,
  ): Promise<string> {
    const target = this.#scope.target;
    if ([RestoreResource.Board, RestoreResource.Value].includes(resource)) throw new ScopeError();
    if ([RestoreResource.List, RestoreResource.Label, RestoreResource.Field].includes(resource)) {
      if (parent !== target.id) throw new ScopeError();
      if (resource === RestoreResource.Field) return '/customFields';
      return `/boards/${target.id}/${resource}`;
    }
    if (resource === RestoreResource.Option) {
      await this.verifyEntity(RestoreResource.Field, parent, options);
      return `/customFields/${parent}/options`;
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
