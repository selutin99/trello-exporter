# GitHub Pages delivery

The Power-Up is hosted at `https://selutin99.github.io/trello-exporter/`.
The root opens the synthetic export demo. Live board content is available only
through the configured Power-Up inside Trello; hosting does not receive exports,
attachments, or OAuth tokens from the app.

## CI followed by CD

`.github/workflows/ci.yml` runs quality checks and Gitleaks. For successful builds
from a push to `main`, its quality job uploads only `dist/` as `power-up-site`.
Coverage is a separate artifact and is never part of the site. CI has no Pages
deployment permissions and performs no deployment.

`.github/workflows/cd.yml` starts on completion of CI. It proceeds only after a
successful push run on this repository's `main` branch. Pull requests, fork runs,
failed checks, and cancelled checks cannot trigger publication. The download uses
the triggering CI run ID, so CD publishes the build that passed checks rather
than rebuilding or checking out a potentially newer revision.

The preparation job has read permissions for repository contents and Actions
artifacts. The deployment job alone receives `pages: write` and `id-token: write`
and uses the `github-pages` environment. Deployments are serialized without
cancelling a publication already in progress. Third-party actions are official
GitHub actions pinned to centralized SHA anchors in each workflow.

The repository's Pages publishing source must be **GitHub Actions**, not a branch
or a documentation directory. An ordinary push to `main` runs CI and then CD;
there is no independent CD dispatch that could bypass checks. Artifacts are kept
for seven days; rerun CI if the source build artifact has expired.

## Trello runtime configuration

The connector, export UI, privacy notice, and OAuth callback are static Pages
assets. Actual board references and public OAuth client IDs belong in the Trello
app's runtime settings, not committed site files. The compatibility
`/prototype/*.html` aliases remain available so the registered callback continues
to work without an OAuth redirect change. Prefer the canonical root page paths
when setting up a new app.

See [Power-Up registration](PROTOTYPE.md) for identity and workspace boundaries.
Changes to hosting do not authorize access to any additional boards or scopes.
