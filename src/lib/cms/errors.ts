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
