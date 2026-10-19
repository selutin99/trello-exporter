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

Append `?demo=1` to open the synthetic preview directly. This shortcut is accepted
only in a standalone window; it cannot replace live content inside a Trello iframe.

The fixture has three lists, six active cards, three
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
Restoration and CSV/XLSX/Markdown/HTML/PDF export remain planned.
