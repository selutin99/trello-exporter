# Contributing

The project has a specification and a TypeScript compatibility application. Contributions that clarify
the snapshot format, verify Trello API behavior, or identify restoration gaps are
welcome.

Before proposing a feature, read the [specification](docs/SPECIFICATION.md) and
[format draft](docs/SNAPSHOT_FORMAT.md). Describe the user scenario, what data
must survive an export and restore, and any platform limitations. Update both
documents when the proposal changes their shared contract.

Use synthetic data in examples and bug reports. Do not attach real board exports,
private attachments, authentication tokens, or unredacted operation logs.

Implementation proposals should include checks relevant to the behavior they
change. The first implementation must validate the archive format and exercise
export and restore against a disposable Trello board before claiming support.

Run `npm ci` and `npm run check` before submitting changes. Tests run offline with
synthetic fixtures. Keep browser code under `src/`, reusable logic in
`packages/*/src/`, and add TSDoc for exported contracts whose behavior needs
explanation. Keep translations in `src/i18n/locales/`; Russian must satisfy the
English message contract. See [architecture](docs/ARCHITECTURE.md) for boundaries.

Do not commit `dist/`, dependencies, runtime configuration, reports, or test
attachments. The build generates compatibility HTML for existing `/prototype/`
URLs; changing those URLs may break registered OAuth callbacks.

Contributions are distributed under the project's [MIT license](LICENSE).
