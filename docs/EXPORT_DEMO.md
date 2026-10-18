# Export implementation and local demo

## Run locally

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173/trello-exporter/pages/export.html` and choose
**Explore a sample board**. The preview is explicitly labelled synthetic and
never makes Trello API requests. Choose JSON or ZIP, create a snapshot, then
download it with a separate user action. Switch between Russian and English at
any point. All product resources omit trailing periods.

The fixture has three lists, six cards (including one archived card), three
labels, six checklists with nineteen items, three comments, and three small
attachments: a UTF-8 text brief, a CSV content plan, and an SVG illustration.
This preview validates the interface and file packaging, not live Trello access.

For a production build, run `npm run build` then `npm run preview` and open
`http://127.0.0.1:4173/trello-exporter/export.html`.

## Implemented export path

The connector opens `export.html`. An embedded session uses the official Power-Up
SDK for OAuth and board context, then the read-only `BoardReader` for REST calls.
Both configured short link and canonical SDK board identity must match. Card
content requests recheck current board ownership before reading child resources.
No other boards are enumerated. No API writes occur in the export workflow.

Current content includes archived lists/cards, descriptions, labels, member
display identities (without email addresses), dates, checklists and completion,
comment-only actions, custom fields/values, and attachment metadata. Cards,
labels, and comments use bounded page sizes and reject repeated IDs rather than
looping indefinitely. Pagination follows Trello's
[API introduction](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/#paging).
Only comments are read from actions; unrelated activity history is excluded.

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
unsafe links, archived content, custom values, exact ZIP contents, original file
bytes, digest verification, and UI/download wiring. The new exporter has not yet
been validated against the live designated test board or Trello Desktop. The
earlier diagnostics passed basic SDK, OAuth, file, and metadata checks; see
[compatibility evidence](PROTOTYPE.md).

The user selected a local-only demo for this iteration. GitHub Pages remains
disabled. No live board was populated in this iteration. Live seeding/export tests
require separately configured HTTPS hosting and matching registered URLs.
Restoration and CSV/XLSX/Markdown/HTML/PDF export remain planned.
