export enum FormatErrorCode {
  FontUnavailable = 'PDF_FONT_UNAVAILABLE',
}
/** A safe output-format error without source content */
export class FormatError extends Error {
  /**
   * Creates a format-specific failure
   * @param code - Stable public failure category
   */
  constructor(readonly code: FormatErrorCode) {
    super(code);
    this.name = 'FormatError';
  }
}
