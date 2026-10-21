export enum ImportErrorCode {
  InvalidSnapshot = 'IMPORT_INVALID_SNAPSHOT',
  UnsupportedVersion = 'IMPORT_UNSUPPORTED_VERSION',
  InvalidArchive = 'IMPORT_INVALID_ARCHIVE',
  IntegrityFailed = 'IMPORT_INTEGRITY_FAILED',
  LimitExceeded = 'IMPORT_LIMIT_EXCEEDED',
  InvalidReferences = 'IMPORT_INVALID_REFERENCES',
  MissingData = 'IMPORT_MISSING_DATA',
}

/** A stable import failure without file content or parser diagnostics */
export class ImportError extends Error {
  /**
   * Creates a safe import failure
   * @param code - Public failure category
   */
  constructor(readonly code: ImportErrorCode) {
    super(code);
    this.name = 'ImportError';
  }
}
