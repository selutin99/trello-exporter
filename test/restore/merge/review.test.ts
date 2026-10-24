import { assert, expect, test } from 'vitest';
import { readImport } from '../../../src/import/read';
import { Locale } from '../../../src/i18n';
import { RestoreErrorCode } from '../../../src/restore/codes';
import { createMergeJournal } from '../../../src/restore/journal';
import { buildMergePlan } from '../../../src/restore/merge/planner';
import { reviewMergePlan } from '../../../src/restore/merge/review';
import { finishCapture } from '../../../src/snapshot/coverage';
import { jsonBytes } from '../../../src/snapshot/encoding';
import { createSyntheticCapture } from '../../helpers/board-capture';
import { workspaceId } from '../../helpers/restore';

async function setup() {
  const imported = await readImport(new Blob([jsonBytes(createSyntheticCapture().snapshot)]));
  const current = structuredClone(imported.snapshot);
  current.checklistItems.pop();
  finishCapture(current);
  const reviewed = buildMergePlan(imported, current);
  const input = { imported, current, reviewed, previous: null, continuation: null };
  const result = await reviewMergePlan(input);
  const journal = createMergeJournal({
    ...result,
    imported,
    context: { boardId: current.board.id, workspaceId, workspaceName: 'Synthetic Workspace' },
    target: { id: current.board.id, name: current.board.name, workspaceId, url: '' },
    locale: Locale.English,
    previous: null,
  });
  return { input, result, journal };
}

test('an unchanged review produces stable remaining-write hashes and allows the same continuation', async () => {
  const { input, result, journal } = await setup();
  expect(result.plan.actions).toHaveLength(1);
  expect(Object.values(result.planned)).toEqual([expect.stringMatching(/^[a-f0-9]{64}$/)]);
  expect(await reviewMergePlan({ ...input, previous: journal, continuation: journal })).toEqual(
    result,
  );
});

test('fresh content changes invalidate an otherwise resolved review', async () => {
  const { input } = await setup();
  input.current.board.description = 'Changed after review';
  await expect(reviewMergePlan(input)).rejects.toMatchObject({ code: RestoreErrorCode.PlanStale });
});

test('a continuation rejects changed remaining content even when it has been reviewed again', async () => {
  const { input, journal } = await setup();
  const item = input.imported.snapshot.checklistItems.at(-1);
  assert(item);
  item.name = 'Different incoming item';
  const reviewed = buildMergePlan(input.imported, input.current, {}, journal);
  expect(reviewed.unresolved).toBe(0);
  await expect(
    reviewMergePlan({ ...input, reviewed, previous: journal, continuation: journal }),
  ).rejects.toMatchObject({ code: RestoreErrorCode.PlanStale });
});

test('a continuation cannot reuse a binding that disappeared from the current board', async () => {
  const { input, journal } = await setup();
  const card = input.current.cards[0];
  assert(card);
  journal.bindings[`cards/${card.id}`] = 'f'.repeat(24);
  await expect(
    reviewMergePlan({ ...input, previous: journal, continuation: journal }),
  ).rejects.toMatchObject({ code: RestoreErrorCode.PlanStale });
});
