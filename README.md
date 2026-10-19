# trello-exporter

An open-source project for saving a Trello board's current state and rebuilding
that board from a portable snapshot.

**Status: JSON/ZIP export implementation with a working synthetic local demo.
Live export validation and snapshot restoration are still pending.**

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

## Initial release requirements

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

## Run the export demo

Use Node.js 24, or a compatible runtime (20.19+ / 22.13+). The application is
written in strict TypeScript with Vite. It is a single npm project.

```sh
npm ci
npm run check
npm run dev
```

Open `http://127.0.0.1:4173/trello-exporter/pages/export.html` and choose
**Explore a sample board**. Create a JSON snapshot or a ZIP with original synthetic
attachment files, then download it and its coverage report. The sample has six
cards, nineteen checklist items, three comments, and three files. It does not
access Trello. See [export implementation and validation boundaries](docs/EXPORT_DEMO.md).

The embedded export uses the official SDK and a read-only REST API reader restricted
to the explicitly configured board. It requires a registered Power-Up on an HTTPS
host; the new content export has not yet been validated live or in Desktop.
Historical [compatibility diagnostics](docs/PROTOTYPE.md) remain at `probe.html`.
Restoration and additional export formats are planned.

`npm run check` checks types, TypeScript/CSS lint, code smells, formatting,
coverage thresholds, and the production build. Use `npm run format` to apply
formatting and `npm run lint:fix` for supported lint fixes.
`npm run preview` serves that build at `/trello-exporter/export.html`. GitHub Actions
checks the same code, scans Git history for secrets, and uploads a coverage artifact.
CI does not deploy a website. A separate CD workflow publishes the checked site
artifact to [GitHub Pages](https://selutin99.github.io/trello-exporter/) only after
successful CI for a push to `main`. Coverage reports are never published. See
[deployment](docs/DEPLOYMENT.md) for permissions and the CI-to-CD artifact handoff.

`npm run test:coverage` generates HTML, LCOV, JSON summary, and console reports in
ignored `coverage/`. Minimum coverage is 90% for statements/functions/lines and
85% for branches. Tests mirror `src/`, for example `src/api/client.ts` and
`test/api/client.test.ts`. See [architecture](docs/ARCHITECTURE.md).

Live checks passed in Chrome and Trello Desktop on macOS: the board button and
modal, JSON download, local streaming of a 200 MiB file, RU/EN, and a scoped board
metadata read through the REST API. For the tested Desktop flow, authorize on the
same board in Chrome first, then return to Desktop. Direct Desktop OAuth callback
handling still needs work. These checks do not validate full JSON/ZIP snapshots.

## Documentation

Project documentation and code comments are in English; the product supports
Russian and English:

- [Product specification and release scope](docs/SPECIFICATION.md)
- [Export demo and validation boundaries](docs/EXPORT_DEMO.md)
- [Snapshot and archive format](docs/SNAPSHOT_FORMAT.md)
- [Market research and reference documentation](docs/RESEARCH.md)
- [Contributing](CONTRIBUTING.md)
- [Source layout and module boundaries](docs/ARCHITECTURE.md)
- [Credential audit and repository hygiene](docs/SECURITY_AUDIT.md)

The specification includes planned behavior; the export demo document records current implementation and validation boundaries.
Live content export and restoration remain subject to the API feasibility and
compatibility checks described in the specification. The local demo does not
claim a completed live backup/restore cycle.

## License

[MIT](LICENSE), copyright 2026 Alexander Selyutin.

This is an independent project and is not affiliated with Atlassian or Trello.
