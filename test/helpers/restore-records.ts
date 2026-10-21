import type { Snapshot } from '../../src/snapshot/types';
import { AttachmentKind } from '../../src/snapshot/codes';
import { id, sourceBoard } from './snapshot';

export type Records = Map<string, Record<string, unknown>>;
export function seedRestoreRecords(records: Records, snapshot: Snapshot): void {
  const boardId = sourceBoard.id;
  for (const member of snapshot.members)
    records.set(`/members/${member.id}`, { ...member, fullName: member.displayName });
  for (const list of snapshot.lists)
    records.set(`/lists/${list.id}`, { ...list, idBoard: boardId, pos: list.order });
  for (const label of snapshot.labels)
    records.set(`/labels/${label.id}`, { ...label, idBoard: boardId });
  for (const field of snapshot.customFields) {
    records.set(`/customFields/${field.id}`, {
      ...field,
      idModel: boardId,
      pos: field.order,
      options: field.options.map((option) => ({
        ...option,
        value: { text: option.text },
        pos: option.order,
      })),
    });
    for (const option of field.options)
      records.set(`/customFields/${field.id}/options/${option.id}`, {
        ...option,
        value: { text: option.text },
        pos: option.order,
      });
  }
  for (const card of snapshot.cards)
    records.set(`/cards/${card.id}`, {
      ...card,
      idBoard: boardId,
      idList: card.listId,
      desc: card.description,
      pos: card.order,
      idLabels: card.labelIds,
      idMembers: card.memberIds,
    });
  for (const checklist of snapshot.checklists)
    records.set(`/checklists/${checklist.id}`, {
      ...checklist,
      idCard: checklist.cardId,
      idBoard: boardId,
      pos: checklist.order,
    });
  for (const item of snapshot.checklistItems)
    records.set(`/checklists/${item.checklistId}/checkItems/${item.id}`, {
      ...item,
      pos: item.order,
      state: item.checked ? 'complete' : 'incomplete',
    });
  for (const comment of snapshot.comments)
    records.set(`/cards/${comment.cardId}/actions/${comment.id}`, {
      ...comment,
      type: 'commentCard',
      date: comment.createdAt,
      data: { text: comment.text, board: { id: boardId }, card: { id: comment.cardId } },
      memberCreator: comment.authorDisplayName
        ? { id: comment.authorId ?? id(900), fullName: comment.authorDisplayName }
        : null,
    });
  for (const attachment of snapshot.attachments)
    records.set(`/cards/${attachment.cardId}/attachments/${attachment.id}`, {
      ...attachment,
      isUpload: attachment.kind === AttachmentKind.Upload,
      bytes: attachment.size ?? 0,
      pos: 1,
      url: attachment.url ?? '',
    });
  for (const value of snapshot.customFieldValues)
    records.set(`/cards/${value.cardId}/customFieldItems/${value.fieldId}`, {
      idCustomField: value.fieldId,
      ...(value.value ? { value: value.value } : {}),
      ...(value.optionId ? { idValue: value.optionId } : {}),
    });
}

export function children(records: Records, path: string): Record<string, unknown>[] {
  return [...records]
    .filter(([key]) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/'))
    .map(([, value]) => value);
}
export function readRestoreRecord(records: Records, path: string): unknown {
  const exact = records.get(path);
  if (exact) return exact;
  const [kind, parent, collection] = path.slice(1).split('/');
  if (kind === 'boards') {
    if (collection === 'members') return children(records, '/members');
    return children(records, `/${collection}`).filter(
      (record) => record.idBoard === parent || record.idModel === parent,
    );
  }
  if (kind === 'cards' && collection === 'checklists')
    return children(records, '/checklists')
      .filter((record) => record.idCard === parent)
      .map((record) => ({
        ...record,
        checkItems: children(records, `/checklists/${String(record.id)}/checkItems`),
      }));
  if (collection && ['actions', 'attachments', 'customFieldItems'].includes(collection))
    return children(records, path);
  return undefined;
}

export function createRestoreRecord(
  records: Records,
  path: string,
  body: Record<string, unknown> | FormData,
  created: string,
): Record<string, unknown> {
  const data = body instanceof FormData ? { name: body.get('name') } : body;
  const [kind, parent] = path.slice(1).split('/');
  const type = path.split('/').at(-1);
  const record: Record<string, unknown> = {
    id: created,
    idBoard: sourceBoard.id,
    pos: records.size,
    ...data,
  };
  if (type === 'cards') Object.assign(record, { closed: false, idMembers: [], cover: null });
  if (type === 'lists') record.closed = false;
  if (type === 'customFields') {
    record.options = [];
    record.pos = records.size;
  }
  if (type === 'checklists') record.idCard = parent;
  if (type === 'checkItems') record.state = data.checked ? 'complete' : 'incomplete';
  if (type === 'comments')
    Object.assign(record, {
      type: 'commentCard',
      date: new Date().toISOString(),
      memberCreator: null,
      data: { text: data.text, board: { id: sourceBoard.id }, card: { id: parent } },
    });
  if (type === 'attachments')
    Object.assign(record, {
      isUpload: body instanceof FormData,
      url: data.url ?? '',
      bytes: body instanceof FormData ? (body.get('file') as Blob).size : 0,
      mimeType: body instanceof FormData ? (body.get('file') as Blob).type : null,
    });
  if (record.pos === 'bottom') record.pos = records.size;
  const destination =
    type === 'comments'
      ? `/cards/${parent}/actions/${created}`
      : ['options', 'checkItems', 'attachments'].includes(type ?? '')
        ? `${path}/${created}`
        : `/${type}/${created}`;
  records.set(destination, record);
  if (kind === 'customFields' && type === 'options') {
    const field = records.get(`/customFields/${parent}`)!;
    field.options = children(records, `/customFields/${parent}/options`);
  }
  return record;
}
export function updateRestoreRecord(
  records: Records,
  path: string,
  body: Record<string, unknown>,
): unknown {
  const [, kind, parent, collection, field] = path.split('/');
  if (kind === 'cards' && collection === 'customField') {
    const record = { idCustomField: field, ...body };
    records.set(`/cards/${parent}/customFieldItems/${field}`, record);
    return record;
  }
  if (kind === 'cards' && collection === 'checkItem') {
    const entry = [...records].find(([key]) => key.endsWith(`/checkItems/${field}`));
    if (!entry) throw new Error('Unknown item');
    Object.assign(entry[1], body);
    return entry[1];
  }
  const record = records.get(path);
  if (!record) throw new Error(`Unknown update: ${path}`);
  Object.assign(record, body);
  return record;
}
