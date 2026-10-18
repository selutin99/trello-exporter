# Repository instructions

- Never create or use Git worktrees. Work in the main project directory.
- The project has a specification and an early compatibility prototype. Keep
  planned export/restore features clearly distinguished from implemented probes.
- Keep the product specification and snapshot format consistent when changing
  behavior or release scope.
- Use synthetic board data in examples, fixtures, screenshots, and issues.
  Never commit real exports, attachments, API tokens, or restore journals.
- Do not promise exact restoration of Trello identities, timestamps, activity
  history, permissions, or unsupported Power-Up data.
- Live tests may access only the board explicitly designated by the user and
  new restoration boards created during that test operation. Never enumerate
  other boards or change their cards, memberships, settings, or Power-Ups.
- Keep real test-board references in runtime configuration, not public fixtures.
  Verify the source board and child ownership before mutations. Prototype UI
  writes remain disabled until an explicit write test is ready and authorized.
