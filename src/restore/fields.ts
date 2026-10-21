import { orderedRecords } from '../snapshot/collections';
import { isId, isRecord } from '../api/validation';
import { ScopeError } from '../api/errors';
import type { Snapshot } from '../snapshot/types';
import { CustomFieldType } from '../snapshot/codes';
import { RestoreResource } from './codes';
import type { RestoreExecution } from './types';

/**
 * Restores a supported field and binds its ordered choices to target option identities
 * @param execution - Validated content, target writer, and durable checkpoints
 * @param field - Source field definition and choices
 * @returns Completion of creation or a recorded optional omission
 * @throws ScopeError when returned options do not match; propagates uncertain writes and storage failures
 */
export async function restoreField(
  execution: RestoreExecution,
  field: Snapshot['customFields'][number],
): Promise<void> {
  const { api, journal, options, checkpoint } = execution;
  const request = { signal: options.signal };
  const target = execution.target.id;
  const id = await checkpoint.optionalStep(RestoreResource.Field, field.id, () =>
    api.create(
      RestoreResource.Field,
      target,
      {
        idModel: target,
        modelType: 'board',
        name: field.name,
        type: field.type,
        pos: 'bottom',
        ...(field.type === CustomFieldType.List
          ? {
              options: JSON.stringify(
                orderedRecords(field.options).map((option) => ({
                  value: { text: option.text },
                  color: option.color,
                  pos: (option.order + 1) * 16384,
                })),
              ),
            }
          : {}),
      },
      request,
    ),
  );
  if (!id) return;
  const fresh = await api.verifyEntity(RestoreResource.Field, id, request);
  if (field.type !== CustomFieldType.List) return;
  if (!Array.isArray(fresh.options) || fresh.options.length !== field.options.length)
    throw new ScopeError();
  const choices = fresh.options.filter(isRecord).sort((a, b) => Number(a.pos) - Number(b.pos));
  for (const [index, option] of orderedRecords(field.options).entries()) {
    const created = choices[index];
    if (
      !created ||
      !isId(created.id) ||
      !isRecord(created.value) ||
      created.value.text !== option.text
    )
      throw new ScopeError();
    journal.completed[`${RestoreResource.Option}/${option.id}`] = created.id;
  }
  execution.checkpoint.save();
}
