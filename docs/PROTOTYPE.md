# Compatibility prototype

This document records historical compatibility diagnostics before the main MVP.
The separate product now implements snapshot export, ZIP packaging, new-board
restoration, and additional export formats; full live workload validation remains
pending. See [export](EXPORT.md), [restoration](RESTORATION.md), and
[formats](FORMATS.md) for current implementation boundaries.

## Implemented checks

- Power-Up connector, diagnostic modal, and authorization callback
- Russian and English product interfaces with matching translation keys
- Synthetic JSON download, local file selection, and streaming reads
- OAuth 2.0 through the official Power-Up SDK without a project client secret
- REST metadata reads for one explicitly configured board
- A scoped client validating board and list ownership; creating methods are tested
  with synthetic HTTP responses and remain disabled in the connected interface
- Bounded read retries; an uncertain POST is never automatically retried
- Cancellation that releases the UI even if the SDK never settles; it does not
  revoke an OAuth grant already accepted in another window

Offline checks and live results are recorded separately. Neither establishes a
working full export/restore cycle.

## Local development

Use Node.js 24 or a compatible runtime: 20.19+ / 22.13+.

```sh
npm ci
npm run check
npm run dev
```

Vite listens only on `127.0.0.1:4173`. Open
`http://127.0.0.1:4173/trello-exporter/pages/probe.html`. Source modules live under
`src/` in a single npm project without workspaces; see [architecture](ARCHITECTURE.md).
Standalone mode supports local files; SDK authorization requires opening the
registered Power-Up inside Trello.

`npm run check` performs type, lint, formatting, smell, coverage, and build checks.
`npm run preview` serves the production build at
`http://127.0.0.1:4173/trello-exporter/probe.html`.

GitHub Pages hosting was restored by explicit request on October 19, 2026. A
separate CD workflow publishes the checked site only after successful CI for a
push to main. CI itself does not deploy. See [deployment](DEPLOYMENT.md). The
legacy connector and callback paths remain available, preserving the registered
OAuth callback without a redirect change.

## Registering a test Power-Up

1. Prepare an HTTPS host for the `dist/` output of `npm run build`.
2. Create an isolated test Workspace containing only the explicitly approved
   private test board. Register a Power-Up application for that Workspace and
   link support to this repository's GitHub Issues.
3. Configure a connector URL ending in
   `/trello-exporter/connector.html?board=<SHORT_LINK>`; adapt the base path to the
   host. Keep actual board references out of committed configuration and fixtures.
4. Configure a public OAuth 2.0 client using the official SDK flow and add its
   public `clientId` to the connector URL.
5. Register the exact same-origin callback URL, for example
   `/trello-exporter/authorize.html?clientId=<PUBLIC_CLIENT_ID>`.
6. Enable the Power-Up only on the designated test board.
7. Show the consent screen and obtain approval for the actual requested scope.

Use the hosted `privacy.html` as the data-handling notice and declare actual
storage behavior. The current prototype does not request member profiles or
operate an external profile database. Reassess the declaration for full exports.
The build retains `/prototype/*.html` aliases for compatible hosts without
redirecting OAuth callbacks; no `prototype/` source directory remains.

Power-Up OAuth 2.0 includes `read:board:trello` and `write:board:trello` within an
authorized Workspace. It must not be described as read-only or limited to one
board. Code-level identity checks further restrict our actions but do not reduce
the granted permission. No other scopes are requested. Verify the Workspace name
and board count before consenting, using an isolated test Workspace rather than
one containing personal boards.

## Live results recorded on October 18, 2026

These results were obtained before the former Pages deployment was removed.

| Check                             | Chrome                                                | Trello Desktop on macOS                                                     |
| --------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| Standalone diagnostic page        | Opens                                                 | Not applicable                                                              |
| Power-Up board button and modal   | Open                                                  | Open                                                                        |
| Synthetic JSON download           | Saved and checked                                     | Saved and checked                                                           |
| Selected synthetic 200 MiB stream | Read 209,715,200 bytes                                | Read 209,715,200 bytes                                                      |
| RU/EN                             | Switches on standalone page                           | Switches inside Power-Up                                                    |
| OAuth and REST read               | Official flow completed; selected board metadata read | Same board metadata read using SDK authorization saved after Chrome consent |
| Cancelling stalled OAuth          | Covered offline                                       | Waiting cancelled and controls released                                     |

Environment: macOS 15.3, Trello Desktop 2.16.1, running Chrome 155.0.8059.40
(arm64). Chrome's version came from `chrome://version`; the on-disk package had a
different pending-update version and was not used as the running version.

### Tested initial Desktop connection

1. Open the same designated board in Chrome and complete the Power-Up OAuth flow.
2. Verify the isolated test Workspace on the consent screen.
3. Return to Desktop, refresh that test board, and reopen the Power-Up.
4. Request metadata; another Desktop sign-in was not required.

Direct OAuth initiated in Desktop is not yet a supported path: its callback
opened in a separate Chrome tab without `window.opener`, producing
`CALLBACK_OPENER_UNAVAILABLE`. This is an observed limitation, not proof that a
future native return path is impossible. Codes and tokens were not manually
transferred between clients. Expired access/refresh token behavior was not tested.

### Automation-specific Chrome behavior

With the test tool's browser debugger attached, iframes stalled before issuing a
network request; the built-in Butler also timed out. Disconnecting that debugger
allowed the already-pending modal to load. The button, OAuth flow, and REST read
then passed through ordinary Chrome UI. Browser security settings were unchanged.
Do not interpret that automation symptom as a proven Power-Up failure.

## Live-test boundaries and outstanding work

Use only the board explicitly designated by the user. Do not enumerate account
or Workspace boards, or read/change unrelated cards, settings, or Power-Ups.
Negative ownership checks use synthetic IDs and a stub transport. Future restores
create a new private board and record its ID in that operation's journal; existing
boards do not become restore targets. No deletion operation is provided.

Repeat button/modal, consent/return, actual JSON download, local file selection,
200 MiB streaming, RU/EN, cancellation, and error handling in both required
clients when hosting changes. Browser standalone success does not prove iframe
or Desktop behavior. Local file checks do not validate downloading Trello
attachments, building full ZIP archives, restoration, or the required API workload.
The live interface kept writes disabled and the test board empty. Screenshots,
downloaded reports, and actual runtime IDs stay out of the repository.

## References

- [Trello OAuth 2.0](https://developer.atlassian.com/cloud/trello/guides/rest-api/oauth-2-getting-started/)
- [OAuth client configuration and Workspace scope](https://developer.atlassian.com/cloud/trello/guides/rest-api/oauth-2-client-configuration/)
- [Power-Up OAuth 2.0 client](https://developer.atlassian.com/cloud/trello/power-ups/oauth-2-api-client/)
- [Power-Up modal](https://developer.atlassian.com/cloud/trello/power-ups/ui-functions/modal/)
