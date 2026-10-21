import { orderedRecords } from '../snapshot/collections';
import { ScopeError } from '../api/errors';
import { RestoreResource, RestoreWarning } from './codes';
import { commentSummaries } from './comments';
import { restoreField } from './fields';
import type { RestoreExecution } from './types';

/**
 * Restores supported content in dependency order with target-only mapped identities
 * @param execution - Validated content, scoped writer, durable step boundary, and cancellation
 * @returns Completion of all supported content steps
 * @throws ScopeError for changed ownership; API or journal errors stop ambiguous writes
 */
export async function restoreContent(execution: RestoreExecution): Promise<void> {
  const { snapshot } = execution.imported;
  const { api, options, checkpoint } = execution;
  const request = { signal: options.signal };
  const boardId = execution.target.id;
  for (const label of snapshot.labels) {
    const id = await checkpoint.step(RestoreResource.Label, label.id, () =>
      api.create(RestoreResource.Label, boardId, { name: label.name, color: label.color }, request),
    );
    await api.verifyEntity(RestoreResource.Label, id, request);
  }
  for (const list of orderedRecords(snapshot.lists)) {
    const id = await checkpoint.step(RestoreResource.List, list.id, () =>
      api.create(RestoreResource.List, boardId, { name: list.name, pos: 'bottom' }, request),
    );
    await api.verifyEntity(RestoreResource.List, id, request);
  }
  for (const field of orderedRecords(snapshot.customFields)) await restoreField(execution, field);
  for (const card of [...snapshot.cards].sort(
    (a, b) => a.listId.localeCompare(b.listId) || a.order - b.order,
  )) {
    const listId = checkpoint.mapped(RestoreResource.List, card.listId);
    const id = await checkpoint.step(RestoreResource.Card, card.id, () =>
      api.create(
        RestoreResource.Card,
        listId,
        {
          idList: listId,
          name: card.name,
          desc: card.description,
          pos: 'bottom',
          start: card.start,
          due: card.due,
          dueComplete: card.dueComplete,
          idLabels: card.labelIds
            .map((label) => checkpoint.mapped(RestoreResource.Label, label))
            .join(','),
        },
        request,
      ),
    );
    const fresh = await api.verifyEntity(RestoreResource.Card, id, request);
    if (fresh.idList !== listId) throw new ScopeError();
    await restoreCardContent(execution, card.id, id);
  }
}

async function restoreCardContent(
  execution: RestoreExecution,
  sourceId: string,
  cardId: string,
): Promise<void> {
  const { api, options, checkpoint, journal, relations } = execution;
  const request = { signal: options.signal };
  for (const checklist of orderedRecords(relations.checklists.get(sourceId) ?? [])) {
    const checklistId = await checkpoint.step(RestoreResource.Checklist, checklist.id, () =>
      api.create(
        RestoreResource.Checklist,
        cardId,
        { name: checklist.name, pos: 'bottom' },
        request,
      ),
    );
    const fresh = await api.verifyEntity(RestoreResource.Checklist, checklistId, request);
    if (fresh.idCard !== cardId) throw new ScopeError();
    for (const item of orderedRecords(relations.items.get(checklist.id) ?? [])) {
      await checkpoint.step(RestoreResource.Item, item.id, () =>
        api.create(
          RestoreResource.Item,
          checklistId,
          {
            name: item.name,
            pos: 'bottom',
            checked: item.checked,
            ...(item.due ? { due: item.due } : {}),
          },
          request,
        ),
      );
    }
  }
  for (const value of relations.values.get(sourceId) ?? []) {
    if (!value.value && !value.optionId) continue;
    const fieldId = journal.completed[`${RestoreResource.Field}/${value.fieldId}`];
    if (!fieldId) {
      const key = `${RestoreResource.Value}/${sourceId}-${value.fieldId}`;
      if (!journal.skipped.includes(key)) journal.skipped.push(key);
      continue;
    }
    await checkpoint.optionalStep(
      RestoreResource.Value,
      `${sourceId}-${value.fieldId}`,
      async () => {
        const body = value.optionId
          ? { idValue: checkpoint.mapped(RestoreResource.Option, value.optionId) }
          : { value: value.value ?? {} };
        await api.value(cardId, fieldId, body, request);
        return cardId;
      },
    );
  }
  for (const [index, summary] of commentSummaries(
    execution.imported,
    sourceId,
    options.locale,
  ).entries()) {
    await checkpoint.optionalStep(RestoreResource.Comment, `${sourceId}-${index}`, () =>
      api.create(RestoreResource.Comment, cardId, { text: summary }, request),
    );
  }
  await restoreAttachments(execution, sourceId, cardId);
}

async function restoreAttachments(
  execution: RestoreExecution,
  sourceId: string,
  cardId: string,
): Promise<void> {
  const { api, options, checkpoint, journal, relations } = execution;
  const request = { signal: options.signal };
  for (const attachment of relations.attachments.get(sourceId) ?? []) {
    const bytes = attachment.file ? execution.imported.files.get(attachment.file.path) : null;
    if (bytes) {
      const form = new FormData();
      form.set(
        'file',
        new Blob([bytes], { type: attachment.mimeType ?? 'application/octet-stream' }),
        attachment.name,
      );
      form.set('name', attachment.name);
      await checkpoint.optionalStep(RestoreResource.Attachment, attachment.id, () =>
        api.create(RestoreResource.Attachment, cardId, form, request),
      );
    } else if (attachment.url) {
      await checkpoint.optionalStep(RestoreResource.Attachment, attachment.id, () =>
        api.create(
          RestoreResource.Attachment,
          cardId,
          { name: attachment.name, url: attachment.url },
          request,
        ),
      );
    } else {
      const key = `${RestoreResource.Attachment}/${attachment.id}`;
      if (!journal.skipped.includes(key)) journal.skipped.push(key);
      if (!journal.warnings.includes(RestoreWarning.MissingFiles))
        journal.warnings.push(RestoreWarning.MissingFiles);
      execution.checkpoint.save();
    }
  }
}
