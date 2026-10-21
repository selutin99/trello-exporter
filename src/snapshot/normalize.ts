import { groupRecords } from './collections';
import { serviceUrls } from '../config/services';
import type { SourceAttachment, SourceCard, SourceChecklist, SourceComment } from '../api/schemas';
import { AttachmentKind, IssueCode } from './codes';
import type { Snapshot, SnapshotAttachment, SnapshotIssue } from './types';

/**
 * Sorts Trello positions deterministically and assigns contiguous sibling order
 * @param values - Positioned entities
 * @returns Entities paired with zero-based order
 */
export function ordered<T extends { id: string; pos: number }>(
  values: T[],
): (T & { order: number })[] {
  return [...values]
    .sort((a, b) => a.pos - b.pos || a.id.localeCompare(b.id))
    .map((value, order) => ({ ...value, order }));
}

/**
 * Rejects executable links, embedded credentials, and signed authorization queries
 * @param value - Untrusted attachment URL
 * @returns A safe HTTP link or null
 */
export function safeLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (
      [...url.searchParams.keys()].some((key) =>
        /token|key|auth|signature|credential|x-amz/i.test(key),
      )
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Creates a portable attachment record without signed download URLs
 * @param source - Validated Trello attachment
 * @param cardId - Owning source card
 * @returns Metadata with a canonical upload link or safe external link
 */
export function normalizeAttachment(source: SourceAttachment, cardId: string): SnapshotAttachment {
  return {
    id: source.id,
    cardId,
    name: source.name,
    kind: source.isUpload ? AttachmentKind.Upload : AttachmentKind.Link,
    url: source.isUpload
      ? `${serviceUrls.trelloBoardOrigin}/1/cards/${cardId}/attachments/${source.id}/download/${encodeURIComponent(source.name)}`
      : safeLink(source.url),
    mimeType: source.mimeType,
    size: source.isUpload ? source.bytes : null,
    file: null,
  };
}

/**
 * Converts cards while preserving sibling order independently in each list
 * @param cards - Validated source cards
 * @returns Portable card content
 */
export function normalizeCards(cards: SourceCard[]): Snapshot['cards'] {
  const groups = groupRecords(cards, (card) => card.idList);
  return [...groups.values()].flatMap((group) =>
    ordered(group).map((card) => ({
      id: card.id,
      listId: card.idList,
      name: card.name,
      description: card.desc,
      order: card.order,
      closed: card.closed,
      start: card.start,
      due: card.due,
      dueComplete: card.dueComplete,
      labelIds: card.idLabels,
      memberIds: card.idMembers,
      cover: card.cover,
    })),
  );
}

/**
 * Appends current checklist state without exporting activity events
 * @param snapshot - Capture under construction
 * @param checklists - Checklists belonging to one verified card
 */
export function appendChecklists(snapshot: Snapshot, checklists: SourceChecklist[]): void {
  const members = new Set(snapshot.members.map((member) => member.id));
  for (const list of ordered(checklists)) {
    snapshot.checklists.push({
      id: list.id,
      cardId: list.idCard,
      name: list.name,
      order: list.order,
    });
    snapshot.checklistItems.push(
      ...ordered(list.checkItems).map((item) => ({
        id: item.id,
        checklistId: list.id,
        name: item.name,
        order: item.order,
        checked: item.state === 'complete',
        due: item.due ?? null,
        memberId: item.idMember && members.has(item.idMember) ? item.idMember : null,
      })),
    );
  }
}

/**
 * Appends comments in chronological order with original author metadata
 * @param snapshot - Capture under construction
 * @param comments - Comment-only actions for one card
 * @param cardId - Verified parent card
 */
export function appendComments(
  snapshot: Snapshot,
  comments: SourceComment[],
  cardId: string,
): void {
  snapshot.comments.push(
    ...[...comments]
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
      .map((comment, order) => ({
        id: comment.id,
        cardId,
        authorId: comment.memberCreator?.id ?? null,
        authorDisplayName: comment.memberCreator?.fullName ?? null,
        createdAt: comment.date,
        text: comment.data.text,
        order,
      })),
  );
}

/**
 * Creates a safe, stable warning without embedding API responses
 * @param code - Machine-readable warning code
 * @param entityType - Affected section
 * @param entityId - Optional source identity
 * @returns A portable warning record
 */
export function issue(code: IssueCode, entityType: string, entityId: string | null): SnapshotIssue {
  return { code, severity: 'warning', entityType, entityId, message: `${code}: ${entityType}` };
}
