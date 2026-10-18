import { ProbeErrorCode } from '../shared/error-codes';

/** A local failure with a fixed code and no raw transport details */
export class ProbeError extends Error {
  /**
   * Creates a safe local failure
   * @param code - Stable diagnostic identifier
   */
  constructor(readonly code: ProbeErrorCode) {
    super(code);
    this.name = 'ProbeError';
  }
}
