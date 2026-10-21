import { RestoreApi } from '../../restore/api';
import { RestoreError, RestoreErrorCode } from '../../restore/codes';
import { waitForOperation } from '../../core/operation';
import { isId } from '../../api/validation';
import { OAuthScope } from '../../trello/scopes';
import type { PowerUpFrame } from '../../trello/sdk';
import type { RestoreConnection } from './types';

/**
 * Resolves the selected live board's Workspace through the trusted API origin
 * @param frame - Current SDK frame
 * @param signal - Cancellation of context discovery
 * @returns A writer paired with the context it verified
 * @throws RestoreError for missing configuration; propagates API ownership and cancellation failures
 */
export async function restoreConnection(
  frame: PowerUpFrame | null,
  signal: AbortSignal,
): Promise<RestoreConnection> {
  const boardId = frame?.getContext().board;
  if (!frame || !isId(boardId)) throw new RestoreError(RestoreErrorCode.InvalidPlan);
  const api = new RestoreApi({
    boardReference: boardId,
    getAccessToken: () => frame.getOAuth2ApiClient().getAccessToken(),
  });
  const context = await waitForOperation(api.context(boardId, { signal }), signal);
  signal.throwIfAborted();
  return { api, context };
}

/**
 * Waits for explicit restore consent without allowing late SDK completion to start writes
 * @param frame - Current SDK frame
 * @param signal - Cancellation of the local consent wait
 * @returns Completion of consent while the operation is still active
 * @throws RestoreError without an SDK frame; propagates consent rejection or the signal reason
 */
export async function authorizeRestore(
  frame: PowerUpFrame | null,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  if (!frame) throw new RestoreError(RestoreErrorCode.InvalidPlan);
  await waitForOperation(
    frame.getOAuth2ApiClient().authorize({ scopes: [OAuthScope.ReadBoard, OAuthScope.WriteBoard] }),
    signal,
  );
  signal.throwIfAborted();
}
