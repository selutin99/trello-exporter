# Repository audit — October 18, 2026

The initial audit covered all available refs after `git fetch --all --tags` and
the working files. Gitleaks 8.30.1 found no secrets in the initial 11 commits or
workspace. The official binary archive was checked against its published SHA-256.
Output uses `--redact=100`, and audit reports remain outside the repository.
Scanning cannot prove the absence of every possible secret.

GitHub secret scanning and push protection are enabled. There were no open
secret-scanning alerts when checked. History was not rewritten: no detected
credentials required revocation or removal. Subsequent refactoring history and
source/lockfile scans also found no secrets.

Before refactoring, the largest historical blob was the product specification at
32,126 bytes. No real exports, 200 MiB attachments, or large binaries were found.
Dependencies, build output, coverage reports, runtime data, `.env`, and editor
settings are excluded from Git.

## Current quality tooling

`npm audit` returned no known vulnerabilities after selecting the current tool
set. Stylelint was evaluated but its dependency chain contained the unpatched
`braces` issue [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
The project instead uses ESLint's official CSS language plugin and Prettier,
without adding that dependency chain. TypeScript matches typescript-eslint's
supported peer range; forced dependency resolution is not used.

The official SDK manages OAuth tokens. Application code must not put them in
URLs, application localStorage, reports, logs, or Git. A public client ID is not a
secret, but actual test deployment settings also stay out of source. Application
localStorage may contain only a language preference and a fixed callback stage.

CI scans all Git history on changes. Repository hygiene tests reject tracked
runtime/generated directories, typical binary exports, and files of 1 MiB or
larger. Introducing a new legitimate resource type requires an explicit review of
that rule. Diagnostics allowlist named codes, API responses are projected to
validated fields, and all committed test data is synthetic.

## Hosting

GitHub Pages publishing has been removed from CI, including Pages artifacts,
deployment jobs, and Pages/OIDC permissions. The existing Pages site is removed
at the user's request. Coverage is retained only as a CI artifact. The old hosted
Power-Up URLs therefore require replacement before further live integration tests.

## If a secret is found

Revoke or rotate it at the provider first, then assess history cleanup. Removing
only the current file does not remove historical copies. Never paste a secret
into an issue or CI log.
