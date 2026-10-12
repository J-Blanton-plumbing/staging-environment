/**
 * Brief 75 — typed CMS write errors so API routes can translate a failed
 * optimistic-concurrency / staleness check into the right HTTP status instead of
 * a blanket 500. Follows the existing convention (see `deleteDraft`) of stamping
 * a string `.code` on the error, and adds `instanceof` classes for clarity.
 */

/** A write was rejected because the row changed since the caller last read it. */
export class ConflictError extends Error {
  code = '409';
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/** The target row does not exist. */
export class NotFoundError extends Error {
  code = '404';
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** Narrow an unknown error to its stamped string code, if any. */
export function errorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: unknown }).code;
    return typeof c === 'string' ? c : undefined;
  }
  return undefined;
}

/**
 * Brief 204 — content an editor must fix before it can be saved (a literal phone number, a bad
 * link, an emptied required field, a layout change). The message is shown to the editor verbatim.
 */
export class ValidationError extends Error {
  code = '422';
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
