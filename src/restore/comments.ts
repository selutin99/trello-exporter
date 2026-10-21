import { textChunks } from '../shared/text';
import type { ImportedBoard } from '../import/read';
import type { Locale } from '../i18n';
import { translations } from '../i18n';

/**
 * Builds comment summaries explicitly attributing original authors and timestamps as text
 * @param imported - Validated content
 * @param cardId - Source card
 * @param locale - Product language for the attribution header
 * @returns Bounded chunks without dropping original comment text
 */
export function commentSummaries(
  imported: ImportedBoard,
  cardId: string,
  locale: Locale,
): string[] {
  const text = imported.snapshot.comments
    .filter((comment) => comment.cardId === cardId)
    .sort((a, b) => a.order - b.order)
    .map(
      (comment) =>
        `${translations[locale].restoreCommentHeader}\n${comment.authorDisplayName ?? '—'} · ${comment.createdAt}\n\n${comment.text}`,
    )
    .join('\n\n---\n\n');
  return textChunks(text, 10_000);
}

/**
 * Attributes one original comment as literal text for a new comment on the current board
 * @param comment - Original comment metadata and text
 * @param locale - Explicit attribution language
 * @returns Complete attributed text, before bounded upload chunking
 */
export function attributedComment(
  comment: ImportedBoard['snapshot']['comments'][number],
  locale: Locale,
): string {
  return `${translations[locale].restoreCommentHeader}\n${comment.authorDisplayName ?? '—'} · ${comment.createdAt}\n\n${comment.text}`;
}
