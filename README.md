# Trello Exporter

An open-source project for saving a Trello board's current state and rebuilding
that board from a portable snapshot.

**Status: specification draft. No application is implemented yet.**

The primary formats are JSON and ZIP. ZIP bundles the snapshot with downloaded
attachments so that recovery does not depend on the original files remaining
available in Trello. CSV, XLSX, Markdown, HTML, and PDF are planned as additional
formats for analysis, reading, and sharing.

## Planned workflow

1. Select a board and the content to include.
2. Export a JSON snapshot or a ZIP archive with attachment files.
3. Inspect the export and its completeness report.
4. Load the snapshot, preview the restore plan, and rebuild it as a new board.
5. Review the restore report, including any unsupported or missing content.

The project targets the board's current content. Activity history, scheduled
backups, and synchronization are outside the initial release.

## MVP requirements

- A Trello Power-Up usable inside Trello Desktop on macOS and Trello on the web
  in Chrome. Desktop authorization, file selection, and downloads must be tested
  directly in the installed client.
- Russian and English interfaces from the first release.
- JSON/ZIP export and restore, with an acceptance workload of 100 cards,
  2,000 checklist items, and 200 MiB of attachment files. One card in that workload
  has at least 600 items across multiple checklists.
- Processing on the user's device is preferred. Desktop support does not itself
  require uploading board data to a project-operated server.

These are requirements awaiting implementation and validation. Windows Desktop
and other browsers require separate compatibility checks before support is claimed.

## Documentation

The initial design documents are in Russian:

- [Product specification and release scope](docs/SPECIFICATION.md)
- [Snapshot and archive format](docs/SNAPSHOT_FORMAT.md)
- [Market research and reference documentation](docs/RESEARCH.md)
- [Contributing](CONTRIBUTING.md)

These documents describe intended behavior, not capabilities already available.
The application stack and delivery architecture will be selected after the
Trello API feasibility checks described in the specification.

## License

[MIT](LICENSE), copyright 2026 Alexander Selyutin.

This is an independent project and is not affiliated with Atlassian or Trello.
