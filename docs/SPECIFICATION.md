# trello-exporter: product specification

Status: JSON/ZIP export implementation with a synthetic local demo. Live content
export validation and restoration remain pending. Revision 0.4, October 19, 2026.
Project license: MIT.

## 1. Problem

A user saves a Trello board's current content into a portable file and later
recreates it as a new board. The export must remain useful without a working
source board or a particular backup service's storage.

Primary workflow: save board → receive an archive containing data and files →
load archive → review the plan → receive a new board and a restoration report.

A snapshot describes current object state, not an event sequence the user must
replay. Comments are card content; movement and edit history are not.

## 2. Formats

| Format   | Purpose                                                 | Reverse import                             |
| -------- | ------------------------------------------------------- | ------------------------------------------ |
| JSON     | Structured snapshot with attachment metadata            | Project format only; file bytes are absent |
| ZIP      | The same JSON, attachment files, and integrity manifest | Primary restoration format                 |
| CSV      | Flat card table for analysis                            | Outside the initial release                |
| XLSX     | Workbook with related entities on separate sheets       | Outside the initial release                |
| Markdown | Readable board and card representation                  | Not planned for initial releases           |
| HTML     | Local saved-board browsing without Trello               | Not planned for initial releases           |
| PDF      | Fixed document for printing and sharing                 | Not planned for initial releases           |

Every representation derives from one normalized snapshot model. Spreadsheet
and document formats are not restoration intermediates. JSON/ZIP rules are in
[the snapshot contract](SNAPSHOT_FORMAT.md).

## 3. UI and architecture boundaries

The target is a Trello Power-Up offering “Export snapshot” and “Restore from
file”. Support for the installed Trello Desktop application is mandatory for
the MVP. Shared data/conversion logic must be separate from the UI and API client.

Prefer processing on the user's device without requiring a project server to
store boards. Authorized attachments, large ZIP files, and PDF processing must
be validated before finalizing the full architecture. The prototype uses
TypeScript and Vite; see [architecture](ARCHITECTURE.md). GitHub Pages hosts the static Power-Up through the separately gated CD workflow;
see [deployment](DEPLOYMENT.md). Whether the full MVP needs an auxiliary local/server component remains
undecided. Desktop support alone does not require a server receiving board data.

Request read access for export and the required write access for restoration.
If Trello cannot support incremental permission escalation, explain the actual
granted permissions. Tokens must never enter exports, reports, public logs, or Git.

Board reads and restoration use the Trello REST API; the interface uses the
official Power-Up SDK. The prototype uses a public OAuth 2.0 client and the
standard SDK flow. Power-Ups require board read/write scopes across the authorized
Workspace; do not promise permission limited to one board. The current interface
performs no writes. See [the prototype](PROTOTYPE.md).

Live checks previously confirmed API metadata reads in Chrome and Trello Desktop
on macOS. The tested initial path was OAuth on the same board in Chrome, then
returning to Desktop using SDK-saved authorization. Direct Desktop OAuth return
is not confirmed. Those checks did not cover full JSON/ZIP export, Trello
attachment downloads, or restoration.

### Required environments

The MVP requires Trello Desktop on macOS and desktop Trello web, initially in
current Chrome. Windows Desktop and other browsers may be claimed only after
separate validation. Mobile apps are outside the MVP.

The Power-Up must open from the board in both environments. Test authorization,
attachment access, local JSON/ZIP selection, export saving, and report saving in
each client. An external consent window is acceptable if the user can return to
the operation in Desktop. Moving the entire export/restore operation to a browser
does not satisfy Desktop support.

Before the main interface, prototype these operations in the actual Desktop
client. If file restrictions block the intended flow, refine the architecture
before full implementation. A Chrome extension cannot be the only entry point.

### Russian and English

Both `ru` and `en` are required from the first MVP. Localize buttons, settings,
preview, progress, warnings, errors, and readable reports. Initially use the SDK
locale, provide a manual RU/EN switch, and retain the preference. Unknown locales
fall back to English.

Messages live in separate dictionaries with identical keys. Display numbers and
dates according to the interface locale; archive dates remain UTC. JSON keys
and machine codes are stable and untranslated. Board content stays in its source
language. An archive is importable under either interface language. Repository
documentation, comments, and code identifiers use English.

### MVP workload

The initial user scenario includes dozens of cards, several lists, hundreds of
checklist items on one card, and 100–200 MB of attachments overall. A card's
checklist counter aggregates its checklists: do not truncate collection to the
first items or mistake the counter for a single checklist.

The synthetic acceptance board must contain at least 100 cards, 2,000 checklist
items in total, at least 600 items across multiple checklists on one card, and
200 MiB of attachment files (209,715,200 bytes). This is a minimum acceptance
workload, not a new Trello limit or a claimed maximum supported board size.

Bound concurrent attachment downloads. Avoid retaining all original files plus
multiple full ZIP copies in memory. Choose streaming or temporary disk storage
based on client capabilities and measured peak memory. Long operations show the
stage, object counts, and file volume, support cancellation, and keep the UI
responsive. The first release may require keeping its window open, explaining
what closure does; background continuation after closure is not promised.

## 4. Export

1. Select a board, JSON or ZIP, and included content.
2. Include only active lists and active cards in those lists, comments, and
   attachment metadata; ZIP also includes available attachment bytes. Archived
   objects and their nested content are excluded with no opt-in setting.
3. Verify access, collect content, and show progress.
4. For ZIP, download Trello-uploaded files. Preserve external attachments as links;
   do not crawl arbitrary sites, Google Drive, or other storage services.
5. Return the file and counts, intentionally excluded sections, and unavailable data.

A failed card/file read must not look like a successful complete export. Offer a
retry or an explicitly partial snapshot listing omissions. If the entire board
is inaccessible, fail instead of producing a successful empty snapshot.

Export only reads the source board. Retrieve only active lists and active cards
with pagination and API-limit handling. Cards in archived lists are excluded, even
when the card itself is not marked closed. Paginate comments separately;
recent board activity is not a complete comment collection.

### Snapshot consistency

Collection takes time. v0.1 does not promise a transactional snapshot at one
millisecond: objects may change between API calls. Record capture start/end and
change-detection results. Use available signals and rereads; no detected change
is not proof of atomicity.

When changes or broken relationships are detected, offer another collection
attempt or a warned snapshot. Bound automatic retries so a continuously changing
board cannot cause an endless export.

## 5. Data and restoration fidelity in v0.1

These are target requirements. Verify API support for every field. Unsupported
properties remain source metadata with explicit report limitations.

| Entity               | Preserve                                                                           | Restore                                                                             |
| -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Board                | Name, description, source IDs/URL, archive state                                   | New private board with name/description; source archive state remains metadata      |
| Lists                | Names and relative order of active lists                                           | Equivalent relative order as active lists                                           |
| Cards                | Name, Markdown description, list, order, start/due, dueComplete; active cards only | Content, dates, relative order; active cards                                        |
| Labels               | Names, colors, card assignments                                                    | New labels and assignments; never merge solely by name                              |
| Checklists           | Names, order, items, completion                                                    | Structure and completion; advanced assignees/dates only after API validation        |
| Custom fields        | Definitions, types, options, values                                                | Supported types and values when available in the target Workspace                   |
| Members              | Source IDs, usernames, names, assignments                                          | Assignments only after explicit mapping to available target-board members           |
| Trello attachments   | Name, type, size, source link; available bytes in ZIP                              | Upload saved files; warn when standalone JSON can only recreate links               |
| External attachments | Name and safe URL                                                                  | Links, without guaranteeing external availability                                   |
| Comments             | Text, order, original author/time                                                  | Optional textual summary in one new comment per card, naming original authors/dates |
| Covers               | Available settings and attachment relationship                                     | Metadata only in v0.1; applying covers is deferred                                  |

New objects receive new Trello IDs/URLs. Creation times, new comment authorship,
and historical activity are not impersonated. Historical information in a
comment summary is explicitly identified as text from the snapshot.

Do not automatically invite people or copy access rights. Create a private target
board; if Workspace policy prevents this, stop before board creation and explain.

## 6. Restoration

1. Open a project-format JSON or ZIP file.
2. Before any Trello mutation, validate format/version, entity relationships,
   and ZIP file inventory and checksums.
3. Select the target Workspace and a name for the new board.
4. Preview active object counts, missing files, limitations, member
   mapping, and comment handling.
5. After confirmation, create the board, labels/field definitions, lists, cards,
   checklists, field values, and attachments. Map old IDs to new IDs. Lists and cards remain active.
6. Reread available created objects, verify results, and return a board link and
   downloadable restoration report.

Restoration never changes the source or updates an arbitrary existing board.
Creating a new board is a deliberate first-release restriction.

### Failures and restart

Keep a local job journal with operation ID, snapshot checksum, target board ID,
ID mappings, and step results. It contains no tokens and is never a public fixture.

On interruption, stop and identify the partially created board. Resume only with
the same operation's journal after verifying existing Trello objects. Never
blindly retry a creating POST with an unknown result: resolve ambiguity by
verification or present it to the user. Without a journal, a new run creates a
separate board and warns of possible duplication.

Cancellation stops new requests but does not undo completed ones. Retain the
partial board with its link/report; do not delete it automatically. Interrupted
or lossy restoration must not be labeled complete.

## 7. Additional formats

| Format   | Planned content                                                                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSV      | One row per card: list, name, description, dates, labels, members; related collections serialized into cells using documented separators                                                     |
| XLSX     | Boards, Lists, Cards, Labels, Members, CardMembers, CardLabels, Checklists, ChecklistItems, CustomFields, CustomFieldValues, Comments, Attachments, ExportReport sheets linked by source IDs |
| Markdown | Board index and per-card files with checklists and relative attachment links, distributed as ZIP                                                                                             |
| HTML     | One local board/list/card viewer with search; attachment files beside it in ZIP, no source-board requests or external CDNs                                                                   |
| PDF      | Document grouped by lists with descriptions, checklists, attachment links, and completeness summary                                                                                          |

Every format identifies the capture interval and omissions. PDF/HTML preserve
content without reproducing Trello's exact appearance. Store external XLSX
strings as text and protect CSV cells against formula interpretation. JSON
retains original text without spreadsheet-specific transformation.

## 8. Safety and limits

- JSON/ZIP are unencrypted by default; explain this during export.
- Limit input size, ZIP entry count, total extracted bytes, compression ratio,
  and individual entry size. Choose numerical limits after measurements and
  validate them before board creation.
- Reject absolute paths, `..`, symlinks, conflicting paths, and duplicate ZIP
  entry names; extraction cannot escape its own namespace.
- Treat HTML, Markdown, filenames, and URLs as untrusted. Escape HTML, restrict
  schemes, and prevent embedded content from executing code.
- Do not retain secrets in tokenized/signed URLs. Omit unsafe source URLs with an
  explanatory issue when a safe form cannot be obtained.
- Checksums validate integrity, not archive authorship.
- Bound API concurrency, paginate correctly, handle 429, use backoff for retryable
  reads, and maintain a separate policy for creating requests.
- Explain plan, attachment-size, and access restrictions; do not promise to bypass
  Trello limits.

## 9. Outside the initial release

Archived lists/cards, activity history, scheduled backups, synchronization, version comparisons,
merging into existing boards, bulk Workspace export, Butler automations,
third-party Power-Up state, views, reactions, stickers, access permissions, and
original object creation timestamps are excluded.

Built-in Trello JSON import is a later separate adapter. Supporting our own JSON
must not be advertised as supporting every Trello JSON export.

## 10. v0.1 acceptance criteria

1. A synthetic board with active and archived objects, Unicode, Markdown, duplicate
   names, and empty lists passes JSON/ZIP export. Only active objects are exported;
   no content or file requests are made for archived cards or cards in archived lists.
2. ZIP contains available file bytes; report failed downloads and external links
   explicitly without concealing missing files.
3. Restore creates a separate private board. Supported values, relationships,
   states, and relative order match after ID normalization.
4. Comparison accounts for declared exceptions: new IDs/URLs, authorship/times,
   access settings, and separately confirmed omissions. Do not disguise loss.
5. Corrupt archives, unsupported versions, unsafe paths, and invalid references
   are rejected before changing Trello.
6. Revoked access, API limits, interrupted networks, and uncertain POST outcomes
   do not silently skip content or automatically create duplicates.
7. The journal supports safe continuation on the same partial board; uncertain
   outcomes require ambiguity resolution.
8. Files/reports contain no tokens. JSON can restore structure after the source
   board is deleted; ZIP additionally supplies preserved file bytes.
9. Authorization, export, local file selection, and restoration are separately
   tested in macOS Desktop and Chrome with recorded client versions. Browser
   success alone cannot establish Desktop support.
10. The section 3 workload passes export/restore with 200 MiB of files and long
    checklists. Compare item counts, completion states, and file hashes; measure
    execution time and peak memory.
11. Equivalent primary flows pass in Russian and English, including errors and
    reports. Language switching neither resets the operation nor changes board
    data. Translation keys match and artifacts are compatible across locales.

## 11. Milestones

| Stage                 | Outcome                                                                                                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current               | Specification, archive contract, JSON/ZIP export implementation, local synthetic demo, compatibility diagnostics, tests, and open repository                                                               |
| API/client validation | Authorization and file selection/saving in macOS Desktop and Chrome first; then pagination, long checklists, comments, 200 MiB attachments, custom fields, archives, and permissions on a disposable board |
| v0.1                  | macOS Desktop/Chrome Power-Up, RU/EN, JSON/ZIP, preview, new-board restoration, reports, and resumable journal                                                                                             |
| v0.2                  | CSV/XLSX and a built-in Trello JSON adapter with an explicit loss matrix                                                                                                                                   |
| v0.3                  | Markdown/HTML local viewing, followed by PDF                                                                                                                                                               |

Before implementation, decide supported custom-field types, exact resource
limits, journal/token storage, large-archive processing, and Power-Up hosting.
Record decisions from actual validation rather than describing intended support
as already implemented.

## Implementation update — 2026-10-18

A JSON/ZIP capture pipeline and bilingual export UI are implemented with an
explicitly synthetic local demo. The current scope and validation limits are
recorded in [EXPORT_DEMO.md](EXPORT_DEMO.md). Live test-board seeding and export,
new Desktop export checks, and the full acceptance workload remain pending.
Restoration and additional formats are not implemented. This October 18
iteration used a local-only demo by user choice.

## Delivery update — 2026-10-19

GitHub Pages hosting is explicitly authorized for showing the Power-Up inside the
designated test board. CI retains quality and secret checks; a separate CD workflow
publishes only its checked site artifact after successful push CI on main.
Coverage is never part of the site. See [DEPLOYMENT.md](DEPLOYMENT.md).
