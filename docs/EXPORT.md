# Export implementation and validation

## Run locally

```sh
npm ci
npm run dev
```

The local page at `http://127.0.0.1:4173/trello-exporter/pages/export.html` renders
the interface without a Trello board context. Export is available only in the
registered Power-Up on its configured board. There is no sample-board button or
standalone query shortcut.

Live checks use the actual SDK and REST API on one explicitly designated board,
plus boards created by that restoration test. Do not enumerate other boards or
put real board references, exports, attachment bytes, tokens, or recovery journals
in public fixtures. See [deployment](DEPLOYMENT.md) for HTTPS hosting and runtime
configuration. Full live export/restore and Desktop acceptance remain pending.

`npm run check` retains deterministic tests for all formats, import validation,
cancellation, ownership, partial results, and uncertain writes. Synthetic board
content and file bytes are confined to `test/helpers/` and are not imported by the
application. The shared fixture has three lists, six active cards, three labels,
six checklists with nineteen items, three comments, and three small attachments.

For a production build, run `npm run build` then `npm run preview` and open
`http://127.0.0.1:4173/trello-exporter/export.html`.

## Implemented export path

The connector opens `export.html`. An embedded session uses the official Power-Up
SDK for OAuth and board context, then the read-only `BoardReader` for REST calls.
Both configured short link and canonical SDK board identity must match. Card
content requests recheck current board ownership before reading child resources.
No other boards are enumerated. No API writes occur in the export workflow.

Current content includes active lists and active cards, descriptions, labels, member
display identities (without email addresses), dates, checklists and completion,
comment-only actions, custom fields/values, and attachment metadata. Cards,
labels, and comments use bounded page sizes and reject repeated IDs rather than
looping indefinitely. Pagination follows Trello's
[API introduction](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/#paging).
Only comments are read from actions; unrelated activity history is excluded.
Lists use the `open` API filter; cards use `visible` and are also filtered locally
to active cards in active lists. Archived objects never enter the export allowlist
or trigger nested content/file reads. Board overview counts use the same scope.

JSON contains no file bytes. ZIP contains `snapshot.json`, `manifest.json`, and
available original uploads at ID-based paths. Manifest sizes and SHA-256 digests
cover the original bytes of the snapshot and every attachment; the manifest does
not list itself. External attachment URLs are never fetched. Credentials, signed
source URLs, and raw API error details are not serialized.

ZIP uses stored entries to avoid blocking compression. Files are downloaded
sequentially with a 250 MiB total attachment budget. Stream reads enforce the
remaining byte budget even if a server reports an incorrect size. The archive
still occupies memory, and per-file SHA-256 uses an in-memory buffer; this is not
a constant-memory large-backup implementation. Unavailable or oversized files
produce explicit partial coverage and warnings. Board identity failures and
authentication failures while collecting content stop the operation. Cancellation
discards prepared results and aborts requests, including on window teardown.

Capture is best-effort over an interval. A final activity timestamp comparison can
detect changes, but unchanged timestamps are not proof of atomic consistency.

## Validation boundary

Offline tests exercise complete and partial captures, identity checks, cancellation,
unsafe links, archived-object exclusions, custom values, exact ZIP contents, original file
bytes, digest verification, and UI/download wiring. The new exporter has not yet
been validated against the live designated test board or Trello Desktop. The
earlier diagnostics passed basic SDK, OAuth, file, and metadata checks; see
[compatibility evidence](PROTOTYPE.md).

The October 18 iteration used a local-only demo and did not populate a live board.
On October 19 the user explicitly requested restoring GitHub Pages with separate
CD after CI to show the Power-Up on the designated test board. See
[deployment](DEPLOYMENT.md) for hosting and runtime configuration. A hosted UI
does not itself establish successful live content export or Desktop support.
JSON/ZIP restoration and CSV/XLSX/Markdown/PDF export are now implemented and
tested offline. The Restore tab supports local file validation in a standalone
window; real creation requires an authorized embedded session. HTML remains planned.
See [formats](FORMATS.md) and [restoration](RESTORATION.md).
