# Snapshot and ZIP format

Status: draft contract 0.1.0, October 19, 2026. JSON/ZIP export is implemented;
JSON Schema and restoration are pending. Fields may change together with the example before release.

## 1. General rules

- The project format is `trello-exporter.snapshot`, versioned by `formatVersion`.
- JSON uses UTF-8. Dates use RFC 3339 in UTC; unknown dates are `null`.
- A snapshot contains one board. Source IDs are opaque relationship keys, never
  IDs to reuse for newly created Trello objects.
- Export contains only active lists and active cards in those lists. Archived
  lists, archived cards, and their nested content/files are intentionally excluded;
  `complete` coverage is relative to this active-only scope. The existing `closed`
  fields remain compatible metadata; exported lists/cards always use `false`.
- Collections are normalized: cards reference lists, checklists reference cards.
- Collection arrays are required, including empty arrays. Omission is expressed
  through `coverage`, never through a missing key.
- Lists, cards, checklists, and items use contiguous integer `order` values from
  zero within their parent. This preserves relative order, not numeric Trello `pos`.
- Unknown fields of a compatible version may be ignored. Unsupported versions
  require a registered adapter; migration never modifies the original file.
- Keys, tokens, authorization headers, and secret-bearing URLs are forbidden.
- RU/EN interfaces share one contract. Keys, versions, and machine codes are not
  translated; board content is not automatically translated. Human-readable
  message language does not affect import compatibility.

## 2. ZIP contents

```text
board-snapshot.zip
├── manifest.json
├── snapshot.json
└── attachments/
    └── <attachment-id>/
        └── content
```

`snapshot.json` uses the standalone JSON model. Original attachment names live
in metadata. Paths use safe unique segments assigned by the exporter; if a source
ID is unsuitable, a local key is assigned. Duplicate original filenames do not
collide.

`manifest.json` contains `format: "trello-exporter.archive"`, `formatVersion`,
`snapshotId`, and `files`. Each file entry requires a relative `path`, byte `size`,
and lowercase `sha256` of the exact uncompressed bytes. It lists `snapshot.json`
and every attachment file, but not itself. Its `snapshotId` matches the snapshot.

Duplicate paths, missing files, unlisted extra files, and size/hash mismatches
are validation errors. The manifest itself must pass structural and resource
limit checks. ZIP entry order is irrelevant. A checksum is not a digital signature.

The MVP must build and read archives with 200 MiB of attachment files in all
required environments from the [specification](SPECIFICATION.md). This measures
uncompressed file bytes, not ZIP size. Streaming does not change integrity rules.
Extraction limits must accommodate that acceptance workload.

## 3. Root JSON object

| Field                                 | Meaning                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `format`                              | Literal `trello-exporter.snapshot`                                           |
| `formatVersion`                       | Contract version, currently draft `0.1.0`                                    |
| `snapshotId`                          | UUID of this export                                                          |
| `exporter`                            | Producing application name and version                                       |
| `capture`                             | `startedAt`, `completedAt`, `consistency`, `changedDuringCapture`, `outcome` |
| `coverage`                            | Coverage of each section, including attachment file bytes separately         |
| `board`                               | Metadata for the single source board                                         |
| `lists`, `cards`, `labels`, `members` | Main collections                                                             |
| `customFields`, `customFieldValues`   | Field definitions and per-card values                                        |
| `checklists`, `checklistItems`        | Checklists and items                                                         |
| `comments`, `attachments`             | Comment content and attachment metadata                                      |
| `issues`                              | Machine-readable collection warnings and errors                              |

In v0.1, `capture.consistency` is always `best-effort`.
`changedDuringCapture` is `true`, `false`, or `null` if detection is unavailable.
`false` means only that no changes were detected, not that capture was atomic.
`outcome` is `complete` or `partial`. Detected changes, broken relationships, and
failures reading selected sections produce `partial` and an `issues` entry.
Intentionally excluding a section is not itself a collection failure.

`coverage` contains `board`, `lists`, `cards`, `labels`, `members`, `customFields`,
`customFieldValues`, `checklists`, `checklistItems`, `comments`, `attachments`, and
`attachmentFiles`. Every entry has `status` (`complete`, `partial`, `excluded`)
and `count`. Counts equal stored object counts, or stored file counts for
`attachmentFiles`. Excluded sections have count zero; collection counts must
match their array lengths.

No comments (`complete`, 0) differs from not reading them (`excluded`, 0).
Standalone JSON always has `attachmentFiles` excluded with count zero: it embeds
no bytes and references no local files. In ZIP, file coverage applies only to
selected Trello uploads; external links are metadata, not failed downloads.

Each issue has `code`, `severity` (`warning` or `error`), `entityType`, `entityId`,
and a readable `message`. Section/snapshot failures may use `entityId: null`.
Messages must not include tokens or raw secret-bearing responses.

## 4. Entities

| Collection          | Main fields                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `board`             | `id`, `name`, `description`, `url`, `closed`; optional available `preferences` are metadata only                          |
| `lists`             | `id`, `name`, `order`, `closed`                                                                                           |
| `cards`             | `id`, `listId`, `name`, `description`, `order`, `closed`, `start`, `due`, `dueComplete`, `labelIds`, `memberIds`, `cover` |
| `labels`            | `id`, `name`, `color`; color may be `null`                                                                                |
| `members`           | `id`, `username`, `displayName`; personal email addresses are not requested                                               |
| `customFields`      | `id`, `name`, `type`, `order`, and selection `options`                                                                    |
| `customFieldValues` | `cardId`, `fieldId`, typed `value` or `optionId`                                                                          |
| `checklists`        | `id`, `cardId`, `name`, `order`                                                                                           |
| `checklistItems`    | `id`, `checklistId`, `name`, `order`, `checked`; optional API-accessible `due` and `memberId`                             |
| `comments`          | `id`, `cardId`, `authorId`, `authorDisplayName`, `createdAt`, `text`, `order`                                             |
| `attachments`       | `id`, `cardId`, `name`, `kind`, `url`, `mimeType`, `size`, `file`                                                         |

`cover` may be `null`; an object retains available settings and `attachmentId` as
source metadata. Applying covers during restore is deferred.

Field `options` is an array of `{id, text, color, order}`, empty for fields without
choices. For `text`, `number`, `date`, and `checkbox`, `value` is respectively a
string, decimal string, UTC date, or boolean. A `list` field uses `optionId` to
reference its definition's option. Absent values do not create records. Unknown
field types are not silently reinterpreted: retain available metadata, mark the
section partial, and create an issue.

`attachments.kind` is `trello-upload` or `external-link`. `url` is a safe original
HTTP(S) URL, or `null` if retaining it would expose secrets. Unknown `mimeType`
and `size` may be `null`. `file` is `null` or `{path, size, sha256}` matching a
manifest entry. Standalone JSON always uses `file: null`; missing file bytes are
not concealed. A Trello upload without ZIP bytes requires an issue explaining why.

## 5. Relationships and restoration

IDs are unique within their collection. References to lists, cards, labels,
members, field definitions, and options must resolve. A comment author may no
longer be a board member; use `authorId: null` and the retained display name, or
`null` if unknown.

When a parent is deleted or inaccessible during export, reread it or omit the
dependent object with an issue. Dangling references are forbidden, and such loss
makes the snapshot partial. Import does not repair invalid references by guessing.

Import builds a plan and ID mappings before creating entities. Selection fields
preserve the option-value relationship; covers and members retain explicit
limitations. Arbitrary Trello URLs in descriptions are not rewritten in v0.1 and
may still lead to the source board; the preview must explain that.

A separate `restore-report.json` records operation/snapshot IDs, target board,
execution period, status (`complete`, `partial`, `failed`, `cancelled`), created
and skipped counts, ID mappings, limitations, and failures. It never changes the
source archive. A complete restore means no omissions within the applicable
selected plan, not identity of every Trello property. Metadata-only fields must
still be listed separately even when status is `complete`.

## 6. Example and further formalization

The [minimal snapshot](minimal.snapshot.json) contains a synthetic board, one
list, and one card. It illustrates the draft contract; restoration is not implemented.

Implementation must add JSON Schemas for snapshots, manifests, and reports, a
complete example with files and custom fields, and integrity, version-compatibility,
and restoration checks against the [product criteria](SPECIFICATION.md).
