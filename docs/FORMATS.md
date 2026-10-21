# Export formats

All six formats use the same capture of active lists and active cards in those
lists. Archived content and activity history are excluded. Capture is best-effort
over an interval. Only ZIP downloads original attachment bytes. Other formats
contain attachment names and available safe source links; external sites are
never fetched. Files are unencrypted and can contain personal information.

JSON and ZIP are the restoration formats. The other representations are reading
and analysis views, without reverse import. A separate coverage report remains
available for every format.

## JSON and ZIP

See the [versioned snapshot and integrity contract](SNAPSHOT_FORMAT.md). JSON
contains normalized board content and attachment metadata. ZIP includes the same
model plus available original uploads and a SHA-256 inventory. Missing content
produces explicit warnings and partial coverage.

## Markdown

A single UTF-8 `.md` document groups cards under list headings. It includes board
and card descriptions, dates, labels, member names, custom values, ordered
checklists/completion, comments with source attribution, attachment metadata/links,
and capture/coverage notices. Empty lists are represented by their headings.

Source Markdown/HTML is escaped and preserved as literal text rather than executed
or used as a template. This prevents board content from injecting active markup.
Attachment bytes and a browsable multi-file directory are not included.

## PDF

An A4 document groups content by list/card, with headings, wrapped literal text,
checklists, comments, metadata, capture notices, and page numbers. It does not
embed files or fetch images. It is a reading document, not a reproduction of the
Trello interface. Empty lists remain visible.

PDF generation loads lazily with bundled Roboto, Noto Sans Japanese, and Noto Sans
Symbols fonts. Latin/Cyrillic, Japanese, and supported symbols are embedded. A
character unavailable in all bundled fonts is preserved visibly as `[U+HEX]` and
an explanatory notice is appended; complete Unicode/emoji font coverage is not
claimed. No system fonts or remote font CDN are required. Labels follow the
selected interface language; source content is not translated.

## XLSX

The workbook contains normalized sheets linked by source IDs:

`Overview`, `Lists`, `Cards`, `Labels`, `Members`, `CardLabels`, `CardMembers`,
`Checklists`, `ChecklistItems`, `CustomFields`, `CustomFieldOptions`,
`CustomFieldValues`, `Comments`, `Attachments`, and `ExportReport`.

Headers are frozen, columns sized, and text wrapped. Numbers, booleans, and
card/comment dates use their corresponding cell types. Dates display in UTC.
Every source string is stored explicitly as text, including strings beginning
with `=`, `+`, `-`, or `@`; board content never becomes a formula. Stable English
sheet/column identifiers do not change with the interface language; Overview
labels follow the selected language.

To avoid Excel's per-cell limit and unreadable oversized rows, text longer than
1,000 UTF-16 code units is represented by a reference such as
`TextChunks: Cards/2/description`. The optional `TextChunks` sheet contains the
exact original value in ordered `reference`, `part`, `content` rows. Unicode
surrogate pairs remain intact. Join the content for each reference in part order
to reconstruct the value without truncation.

## CSV

CSV is a flat table with **one row per card**, ordered by list/card position.
Headers are stable English machine identifiers:

`card_id`, `list_id`, `list`, `name`, `description`, `start`, `due`, `due_complete`,
`labels`, `members`, `checklists`, `comments`, `custom_fields`, `attachments`.

Related collections are JSON inside quoted cells. Checklists contain their items;
custom values include their field definitions/options. Attachment cells contain
metadata and links, not bytes. Empty lists and board-level metadata are not rows;
use JSON/XLSX or the coverage report when those are required.

Encoding is UTF-8 with a BOM for Excel, comma delimiter, CRLF records, and RFC 4180
quote escaping. Multiline values stay inside quoted cells. Dangerous spreadsheet
prefixes, including leading whitespace/control characters before `=`, `+`, `-`,
or `@`, receive a leading apostrophe; initial tab/newline also receives one.
This intentionally changes the CSV cell's text representation for formula safety.
JSON remains available when exact original text without that prefix is needed.

## Libraries and verification

Converters load only when their format is selected: pdfmake for PDF,
write-excel-file for XLSX, and small local renderers for Markdown/CSV. PDF fonts
are bundled locally. Everything is generated locally without a
project-operated processing server.

Offline checks verify literal spreadsheet strings, dates/booleans, worksheet
relationships, long-text reconstruction, CSV quoting/formula protection,
Markdown escaping, and actual PDF generation with embedded fonts. Synthetic PDF
pages and all workbook sheets have been rendered for visual review. Full live
board acceptance and the 200 MiB workload remain separate checks.

HTML export is still planned and is not offered in the current interface.
