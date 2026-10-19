/** English data-handling notice for the selected interface language */
export const privacyEn = {
  privacyProcessing:
    'trello-exporter prepares JSON files and ZIP archives in your browser or Trello Desktop window. The sample preview uses synthetic data and makes no Trello API requests',
  privacyScope:
    'When opened as an authorized Trello Power-Up, export reads only the configured board: active lists and cards, checklists, comments, labels, member display identities, custom fields, and attachment metadata. Archived lists and cards are excluded. ZIP downloads available Trello-uploaded files; external attachment links are not fetched. Export does not modify board data',
  privacyStorage:
    'The project operates no backend receiving board content, exports, files, or tokens. Prepared exports stay in memory until downloaded or the window is closed. Downloaded files may contain personal information; keep them private. Warnings identify unavailable content. Export takes time and is not an atomic backup',
  privacyAuthorization:
    'Authorization uses the official Atlassian Power-Up SDK. Tokens stay in Trello private plugin data and are sent only in Authorization headers to Trello. They are not included in exports, reports, or application logs. Existing OAuth grants may include Workspace board read/write permissions, although export uses only read requests',
  privacyPreferences:
    'The app may remember your language and a fixed authorization diagnostic stage in local storage. Neither value contains tokens or authorization codes. No analytics or advertising scripts are added. The official SDK loads from Atlassian CDN; the configured static host and Atlassian receive ordinary network request metadata under their own policies',
  privacyRevocation:
    'Revoke access through Atlassian connected apps. Deleting local files and revoking OAuth access are separate actions',
  privacySupport: 'For support, use GitHub Issues with synthetic examples only',
  privacyUpdated: 'Updated October 19, 2026',
} as const;
