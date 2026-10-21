# Contributing

The project implements board snapshots, current-board merging, and document
exports in TypeScript. Contributions that improve fidelity, validate Trello API
behavior, or make conflict resolution easier are welcome.

Before proposing a feature, read the [workflow and snapshot contract](README.md).
Describe the user scenario, the data that must survive an export/import, and any
platform limitations. Update the README and executable schemas when their shared
contract changes.

Use synthetic data in examples and bug reports. Do not attach real board exports,
private attachments, authentication tokens, or unredacted operation logs.

Implementation proposals should include checks relevant to the behavior they
change. The first implementation must validate the archive format and exercise
export and restore against a disposable Trello board before claiming support.

Run `npm ci` and `npm run check` before submitting changes. Tests run offline with
synthetic fixtures. Keep browser code under `src/`, reusable logic in
`src/api/` and `src/core/`, and add TSDoc for exported contracts whose behavior needs
explanation. Keep translations in `src/i18n/locales/`; Russian must satisfy the
English message contract. See the [project layout](README.md#project-layout) for boundaries.

Do not commit `dist/`, dependencies, runtime configuration, reports, or test
attachments. The build generates compatibility HTML for existing `/prototype/`
URLs; changing those URLs may break registered OAuth callbacks.

Contributions are distributed under the project's [MIT license](LICENSE).

Keep tests parallel to the source tree, such as `test/api/client.test.ts` for
`src/api/client.ts`. Keep code, comments, documentation, and issue/PR text in
English. Russian belongs in localized product messages and deliberate Unicode
fixtures. Public TSDoc summaries have no trailing period and document parameters,
return values, and actual failures using `@param`, `@returns`, and `@throws`.
Use named enums for stable errors, states, and other repeated protocol values.

`npm run check` runs all local quality gates. Coverage includes executable source
files, including entry points, with minimum 90% statements/functions/lines and
85% branches. Use `npm run format` and `npm run lint:fix` to apply supported fixes.
CI uploads coverage separately from the site; only the gated CD workflow publishes GitHub Pages.
