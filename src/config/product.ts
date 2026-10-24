/** Accepted producer identities; legacy files retain their original metadata */
export enum ProductName {
  Current = 'trello-exporter-importer',
  Legacy = 'trello-exporter',
}

/** Product identity recorded in new portable snapshots */
export const product = Object.freeze({ name: ProductName.Current, version: '0.0.0' });
