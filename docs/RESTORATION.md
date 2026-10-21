# Restoration and recovery

The Restore tab accepts this project's `trello-exporter.snapshot` JSON and ZIP
format version `0.1.0`. It does not import Trello's native JSON, diagnostic or
coverage reports, restore reports, CSV, XLSX, Markdown, or PDF.

## Review before creation

1. Select a local JSON/ZIP export. Validation is local and does not mutate Trello.
2. Review counts, available file bytes, fidelity warnings, the new board name,
   and the current configured board's Workspace.
3. Confirm the plan and authorize the official SDK's board read/write scopes.
4. Start restoration. A separate private board is created with no default lists
   or labels. The configured context board is never edited.
5. Review the target link and download the token-free restoration report.

The standalone interface validates files and shows the plan. Board creation
is available only inside an authorized Trello session. The destination is the
configured board's Workspace; the application does not enumerate other boards or
Workspaces. OAuth permissions can cover the Workspace even though the application
restricts its requests. A Workspace's permissions, plan, attachment limits, and
custom-field availability still apply.

## Input validation

The importer checks the format/version, required collections, unique IDs,
contiguous sibling order, references, field value types, coverage counts, and safe
HTTP(S) metadata links. Unknown compatible fields are projected away. Input never
controls the API origin, authorization headers, destination board ID, or endpoints.

ZIP central/local headers are checked before decompression. Absolute paths,
traversal, symlinks, duplicate entries, encrypted or unsupported compression,
multipart archives, contradictory sizes, and oversized output are rejected.
Every inventory entry must exist with its declared size and SHA-256 digest;
extra, missing, or orphaned files are rejected. Checksums detect corruption, not
archive authorship. No files are extracted onto the user's filesystem.

Current limits are 300 MiB for the input and combined extracted bytes, 16 MiB per
JSON document, 10,000 ZIP entries, compression ratio at most 200:1, and at most
100,000 records per collection. ZIP methods 0 (stored) and 8 (deflate) are accepted;
ZIP64 is not supported. The archive is read into memory, decompressed with bounded
output, and checked before writes. Memory usage is not constant. These numerical
limits accommodate the intended 200 MiB attachment workload, but that full workload
still needs measurement in each supported client.

## Restored content and fidelity

Lists and cards retain relative order. Names, descriptions, dates, completion,
labels, checklists/items, supported custom-field definitions/options/values,
external links, and available ZIP attachment bytes are recreated with new IDs.
Custom fields can be unavailable under the destination plan; explicit API
rejections of optional content produce omissions and a partial report. Only known
content, permission, endpoint, or size rejections of the write itself are skipped.
A failed ownership read or HTTP 429 stops the operation for explicit continuation;
it does not permanently omit the object. HTTP 408 on a write is treated as an
unknown result, like a lost response or server failure.

Members are not invited or assigned automatically. Covers remain metadata.
Checklist assignees are not assigned. Item due dates are attempted when present;
API/client acceptance needs live validation. Comments become explicitly attributed
text summaries posted by the restoring user, split into bounded chunks when long.
Their original authors and dates are text, not new comment identities/timestamps.
Descriptions are copied literally; links to source cards/boards are not rewritten.
JSON has no original attachment bytes and can recreate only available links.
Missing files and intentionally reduced fidelity are reported as limitations.

Before each write the destination's privacy and Workspace are checked. Parent
ownership is rechecked before creating nested content. These checks are separate
REST requests; Trello does not provide an atomic ownership-check-and-write API,
so a concurrent move remains a platform limitation. No source IDs are reused as
destination IDs, and the snapshot cannot authorize changes to an existing board.

## Cancellation, interruption, and continuation

A journal is saved in this browser's local storage **before** each creating
request. It stores the operation and snapshot IDs, exact input-file checksum,
context/Workspace IDs, target board name/link, created-ID mappings, pending step,
warning codes, status, and the comment-summary language. It contains no token,
full snapshot, or attachment bytes.
Only the last operation is kept. An unavailable or corrupt journal is shown explicitly;
local file preview remains available, but execution requires readable and writable
storage. Clearing site data removes recovery information,
not already created Trello content. Downloaded reports cannot authorize continuation.

After a known failure or cancellation between writes, reopen the Power-Up in the
same browser profile, select the identical export file, and use **Continue the last
operation**. The context, checksum, target privacy, and existing parent identities
are verified before more content is created. Completed steps are not replayed.
Already skipped optional content stays skipped without duplicate omission records.
The optional `commentLocale` journal field fixes the original summary language so
switching the interface language cannot move already posted chunk boundaries.
Legacy journals without this field can continue only before any comment chunk was
completed or skipped; later legacy comment progress requires manual inspection.
A new run creates a separate board and the UI warns when an unfinished journal exists.

Cancellation observed before write dispatch does not create an uncertain write.
A known partial target remains resumable. Once a write has been sent, its result
is preserved if the complete response can still be read;
otherwise cancellation or a lost response leaves the result unknown. A successful
board-creation response that fails target validation also retains an unresolved
board checkpoint. An already cancelled run does not replace an existing journal.
Creating requests are never automatically retried, including directly repeated
checkpoint calls with an unresolved pending write. A pending or uncertain step
blocks continuation: inspect the target and report manually before starting a
separate restoration. There is no automatic reconciliation or rollback. If board
creation itself lost its response, the journal may have no target link; inspect
that Workspace manually. Cancellation and window closure stop further work but
retain content already created.

Reports use `complete`, `partial`, `failed`, `cancelled`, or `unknown`. Any fidelity
warning or skipped content produces `partial`; a successful response alone is not
a claim of exact Trello restoration. Fixed error codes avoid leaking API payloads.

## Validation status

Synthetic HTTP and DOM tests exercise JSON/ZIP round trips, mapped relationships,
uploaded file bytes, ownership boundaries, optional failures, unknown write
outcomes, storage failure, cancellation, continuation, and bilingual UI wiring.
No live write test or full Desktop recovery cycle has been performed for this
implementation. These remain release acceptance work on an explicitly designated
test board and newly created restoration boards only.

The API contracts follow Atlassian's [boards](https://developer.atlassian.com/cloud/trello/rest/api-group-boards/),
[cards](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/), and
[custom fields](https://developer.atlassian.com/cloud/trello/rest/api-group-customfields/)
references. REST documentation does not substitute for actual account/client checks.
