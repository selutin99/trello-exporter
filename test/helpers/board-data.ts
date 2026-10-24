export const syntheticLists = ['Ideas', 'In progress', 'Done'];
export const syntheticLabels = [
  { name: 'Design', color: 'purple' },
  { name: 'Engineering', color: 'blue' },
  { name: 'Launch', color: 'green' },
];

/** Synthetic board content for deterministic export and restoration tests */
export const syntheticCards = [
  {
    name: 'Plan the studio launch',
    list: 0,
    label: 2,
    description:
      '## Goal\nLaunch a small creative studio.\n\n- Define the audience\n- Agree on the first release\n\n**Success:** a clear, friendly launch page.',
    items: ['Agree on the audience', 'Choose a launch date', 'Review the plan'],
    completed: 1,
    comment: 'Synthetic review: the first milestone is ready.',
    file: 0,
    due: '2026-11-20T12:00:00.000Z',
    closed: false,
  },
  {
    name: 'Prepare the editorial calendar',
    list: 0,
    label: 2,
    description:
      'A small content plan for the launch week.\n\nThe attached CSV is synthetic and contains no personal data.',
    items: [
      'Draft the announcement',
      'Review the copy',
      'Schedule three posts',
      'Check both languages',
    ],
    completed: 2,
    comment: '',
    file: 1,
    due: null,
    closed: false,
  },
  {
    name: 'Explore the visual direction',
    list: 1,
    label: 0,
    description:
      'Review the color palette and simple geometric illustration.\n\nUnicode check: café · 東京 · ✓',
    items: ['Pick the palette', 'Review the illustration', 'Check contrast'],
    completed: 2,
    comment: 'Synthetic design feedback: keep the blue accent.',
    file: 2,
    due: null,
    closed: false,
  },
  {
    name: 'Review the API integration',
    list: 1,
    label: 1,
    description:
      'Verify the selected-board boundary, cancellation, and rate-limit handling.\n\n```ts\nconst snapshot = await exportBoard();\n```',
    items: [
      'Verify board identity',
      'Check child ownership',
      'Handle cancellation',
      'Review the export report',
    ],
    completed: 3,
    comment: 'Synthetic engineering note: test external links separately from uploaded files.',
    file: -1,
    due: null,
    closed: false,
  },
  {
    name: 'Complete the launch checklist',
    list: 2,
    label: 2,
    description: 'A completed card for testing dates and checked items.',
    items: ['Review the page', 'Verify downloads', 'Approve the release'],
    completed: 3,
    comment: '',
    file: -1,
    due: '2026-10-01T12:00:00.000Z',
    closed: false,
  },
  {
    name: 'Review the research notes',
    list: 2,
    label: 1,
    description: 'Active synthetic research notes for export testing.',
    items: ['Collect references', 'Summarize the findings'],
    completed: 2,
    comment: '',
    file: -1,
    due: null,
    closed: false,
  },
];

/**
 * Creates small, deterministic files without reading the user's filesystem
 * @returns Original synthetic attachment bytes and MIME types
 */
export function syntheticFiles(): {
  name: string;
  mimeType: string;
  bytes: Uint8Array<ArrayBuffer>;
}[] {
  const encode = (text: string) => new TextEncoder().encode(text);
  return [
    {
      name: 'launch-brief.txt',
      mimeType: 'text/plain',
      bytes: encode(
        'Studio launch\n\nSynthetic brief for trello-exporter-importer.\nGoal: preserve current board content and original files.\nUnicode: café · 東京 · ✓\n',
      ),
    },
    {
      name: 'content-plan.csv',
      mimeType: 'text/csv',
      bytes: encode(
        'day,channel,topic\nMonday,Website,Studio introduction\nWednesday,Newsletter,Behind the scenes\nFriday,Blog,Launch recap\n',
      ),
    },
    {
      name: 'studio-palette.svg',
      mimeType: 'image/svg+xml',
      bytes: encode(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" rx="24" fill="#e9f2ff"/><circle cx="160" cy="180" r="90" fill="#0c66e4"/><rect x="290" y="90" width="180" height="180" rx="24" fill="#8270db"/><circle cx="500" cy="240" r="60" fill="#4bce97"/><text x="40" y="330" fill="#172b4d" font-family="sans-serif" font-size="20">Studio launch · synthetic attachment</text></svg>',
      ),
    },
  ];
}
