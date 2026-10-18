# Application structure

The application implements a read-only JSON/ZIP export pipeline and a synthetic
local demo, with separate historical compatibility diagnostics. It uses strict
TypeScript, Vite for a static multi-page build, Zod for API projections, fflate
for ZIP storage, and Vitest for offline tests with synthetic data. Live export
validation and restoration are pending.

```text
src/
  api/                 scoped API client, transport, validation, and retry policy
  app/                 diagnostic wiring and shared local downloads
    export/            export entry point, session state, and text-only DOM view
  snapshot/            capture, normalization, archive packaging, types, and codes
  demo/                synthetic board content and local preview file boundary
  core/                checks, cancellation, reports, diagnostics, and file streams
  config/              reviewed public service URLs and HTML URL placeholders
  shared/              stable error code enums shared across domains
  trello/              official SDK adapter, connector, OAuth callback, and URLs
  pages/               connector, export, diagnostics, authorization, and privacy HTML
  styles/              CSS
  assets/icons/        compact board-button SVG and generated 144px PNG
  i18n/
    locales/en.ts      English messages and the message-key contract
    locales/export-*.ts  separate product export messages in both languages
    locales/ru.ts      Russian messages checked against that contract
    index.ts           locale selection and safe text rendering
    types.ts           locale enum and message types
test/                  mirrors src/ directories and module names
  helpers/             shared synthetic browser and SDK setup
  config/              build configuration checks
  repository/          repository hygiene checks
vite.config.ts         local build configuration and legacy URL compatibility
```

## Module boundaries

`src/api/` is independent of the SDK, DOM, translations, and UI. It receives a
token provider and injectable Web API boundaries. The facade does not accept
arbitrary endpoints. It binds the selected short link and SDK context to a
canonical board ID, validates child ownership, and disables writes by default.
Before creating a card it rechecks list ownership. Trello does not provide an
atomic ownership check combined with that POST, so a concurrent move remains a
platform limitation.

`src/core/` is independent of the API client and view. It owns one check at a
time, releases the UI when SDK waiting is cancelled, rejects late results from
cancelled checks, and returns defensive report snapshots. It shares only stable
error-code definitions with the API layer. Unknown errors become fixed diagnostic
codes; raw SDK messages, URLs, and tokens are not copied. File checks use a single
stream reader instead of buffering the entire file.

This is one npm project without workspaces. Stable machine values use string
enums such as `ApiErrorCode.RateLimitWait`, `EventCode.CheckStarted`, and
`CallbackStage.Completed`; their serialized strings remain compatible with older
reports. Domain enums live beside their domain, while shared error codes live in
`src/shared/`.

Public contracts use TSDoc with summaries without trailing periods and applicable
`@param`, `@returns`, and `@throws` tags. TypeScript remains the source of type
information. `skipLibCheck` skips dependency declaration checking, not strict
checking of this project's code and tests. TypeScript 6.0.3 matches the supported
range of the installed typescript-eslint release.

## Service configuration

`src/config/services.ts` is the single source for Trello API/board origins, the
official SDK URL, connected-app management, and support links. Both API code and
Vite HTML substitution use it. URL placeholders are resolved before serving or
building HTML, including the privacy page that works without JavaScript. API
origins are not taken from query parameters or imported files: this prevents
untrusted runtime settings from redirecting bearer tokens. Standard URL schemes
and the SVG XML namespace are not deployment-specific service endpoints.

## Resources and hosting

HTML, CSS, icons, and translations have separate directories. The connector
imports the SVG, which receives a hashed asset filename during the build.
Translations and diagnostic content use `textContent`, never HTML interpretation.
The generated PNG brands the export page and the app listing; its generation
prompt is recorded in [branding](BRANDING.md). The public data-handling page includes both product languages so it can be read
without JavaScript. Code, comments, repository documentation, and community
forms are in English; Russian is used for localized product content and deliberate
Unicode fixtures.

Vite's root is `src/`; HTML sources are under `src/pages/`. The build moves HTML
to the root of the ignored `dist/` directory. Asset paths use `/trello-exporter/`;
change Vite's `base` when choosing a different hosting path.

The build also creates legacy `/prototype/*.html` aliases without redirects, so
OAuth query and fragment data can reach the official SDK unchanged on a compatible
host. These aliases do not publish a site. GitHub Pages is disabled, CI has no
deployment job, and `.nojekyll` is unnecessary. Live Power-Up checks now require a
separately configured HTTPS host and matching registered connector/callback URLs.

## Quality checks

`npm run check` performs type checking, ESLint checks for TypeScript and CSS,
SonarJS code-smell analysis, Prettier formatting checks, tests with V8 coverage
thresholds, and a production build. Coverage includes all executable `src/**/*.ts`
files, including application and SDK entry points; type-only `types.ts` files are
excluded. HTML, LCOV, JSON summary, and console reports are generated locally in
ignored `coverage/`. CI uploads these as a seven-day artifact, never as Pages.

Tests mirror source paths, for example `src/api/client.ts` and
`test/api/client.test.ts`. Repository and build checks use dedicated test folders.
The export session owns one cancellable operation, separates preparation from
user-initiated download, and drops late results after cancellation. Snapshot
normalization and ZIP packaging are independent of the DOM and SDK. See
[export boundaries](EXPORT_DEMO.md) for content, file budget, and validation limits.

Tests exercise board scope, response validation, GET retries, uncertain POST
results, cancellation, late SDK completion, safe diagnostics, a streamed 200 MiB
file, DOM behavior, localization, and callback paths. SDK and HTTP boundaries are
stubbed. These tests do not establish a working full JSON/ZIP restore cycle.

CI has separate secrets and quality jobs with read-only repository permissions.
Gitleaks scans all fetched Git history with redacted output. Its version and
archive checksum are fixed. Action SHAs are defined once as YAML anchors in the
workflow's top-level block; steps use short aliases because `uses:` does not
support environment expressions. No Pages or deployment permissions are granted.
