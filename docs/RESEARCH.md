# Market research and technical references

Research date: October 18, 2026. This comparison is based on vendor documentation;
these products were not used for a practical export/restore comparison.

## Related products

| Product                                                                                                          | Documented capabilities                                        | Difference from the target workflow                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Built-in Trello export](https://support.atlassian.com/trello/docs/exporting-data-from-trello/)                  | JSON, Premium CSV; Workspace exports can include files         | No built-in reconstruction of a board from JSON/CSV                                                                                                              |
| [Board Export](https://docs.adaptavist.com/be/latest/welcome/)                                                   | Excel, CSV, PDF, PNG                                           | Reverse import is not advertised; included data depends on the format                                                                                            |
| [TrelloExport](https://github.com/trapias/TrelloExport)                                                          | Open-source Chrome extension: Excel, CSV, Markdown, HTML, OPML | Board restoration is not advertised                                                                                                                              |
| [Blue Cat Exports](https://www.bluecatreports.com/exports/) / [Imports](https://www.bluecatreports.com/imports/) | CSV export and CSV/XLSX import with field mapping              | Card import is documented; complete board restoration is unverified                                                                                              |
| [Board Export Lite](https://www.trello-plugins.com/board-export-lite)                                            | Manual and scheduled JSON/CSV/XLSX snapshots                   | No restoration; attachments and comments are outside the verified model                                                                                          |
| [Kanban Importer](https://njligames.com/help/kanban-importer/migrating-from-jira-github-trello)                  | Recreates content from Trello JSON                             | Skips archived cards, custom fields, attachment files, comments beyond the first, and other data                                                                 |
| [BackupLABS](https://backuplabs.io/integrations/trello-backup/)                                                  | Snapshots, ZIP downloads, restoration to a new board           | Restoration is documented from service storage; arbitrary archive import is unverified                                                                           |
| [ProBackup](https://support.probackup.io/en/articles/9292103-how-to-restore-trello-data)                         | Restores a new board, cards, files, and comments               | Uses service backups; automations and views are not transferred                                                                                                  |
| [Rewind](https://rewind.com/products/backups/trello/)                                                            | Daily snapshots and restoration to a selected date             | Its [limitations page](https://help.rewind.com/hc/en-us/articles/28785780290203-What-Does-Rewind-Backup-For-Trello) says comments are backed up but not restored |

## Project hypothesis

Current-state snapshots and restoration already exist. The proposed distinction
is an open, portable JSON/ZIP format with files, local inspection, a restore
preview, and an explicit loss report. This is a product hypothesis, not a claim
that competitors do not exist or demand has been proven.

Initial practical comparison candidates are BackupLABS and built-in Trello JSON
combined with Kanban Importer. Compare restored content using one synthetic
board, including archived data, comments, files, fields, and duplicate names.

## Technical references

- [Trello REST API: Boards](https://developer.atlassian.com/cloud/trello/rest/api-group-boards/)
- [Trello REST API: Cards](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/)
- [Trello rate limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/)
- [Creating a Power-Up](https://developer.atlassian.com/cloud/trello/guides/power-ups/your-first-power-up/)
- [Understanding Trello JSON exports](https://support.atlassian.com/trello/docs/making-sense-of-trellos-json-export/)
- [Data included in Board Export](https://docs.adaptavist.com/be/latest/data-included-with-exports/)
- [Trello Desktop for macOS and Windows](https://support.atlassian.com/trello/docs/trello-desktop-apps/)
- [Power-Up client library](https://developer.atlassian.com/cloud/trello/power-ups/client-library/)
- [Power-Up localization](https://developer.atlassian.com/cloud/trello/power-ups/client-library/localization/)
- [Locale in the SDK context](https://developer.atlassian.com/cloud/trello/power-ups/client-library/t-getcontext/)

## Desktop and localization validation

The platform SDK provides in-Trello Power-Up interfaces and localization tools.
The chosen authorization, file selection, and saving paths must still be tested
in the installed Trello Desktop client. Browser success does not establish
Desktop compatibility.

For example, [TRELLO-1706](https://jira.atlassian.com/browse/TRELLO-1706) describes a
third-party Power-Up opening issue in the Windows client, marked fixed when the
research was conducted. This supports including Desktop in the test matrix; it
does not establish a current Power-Up failure.

Verify actual API and authorization behavior before implementation. Competitor
information is not a technical contract and can change over time.
