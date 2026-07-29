/**
 * Brief 119 — shared password policy for the set-password flow.
 *
 * Client-safe (no server-only imports): the set-password page uses it for live
 * feedback and the API route re-enforces it server-side — the server check is
 * the real gate, the client one is UX.
 */

const MIN_LENGTH = 10;

// Obviously-guessable passwords this system has historically shipped or that
// trivially pass the structural checks below.
const WEAK_PASSWORDS = new Set([
  'password01',
  'password123',
  'plumbing123',
  'jblanton123',
  'jbp-admin-2026!',
  'admin12345',
  'welcome123',
  'qwerty1234',
  '1234567890',
  'letmein123',
  'changeme123',
]);

export interface PasswordCheck {
  ok: boolean;
  /** Human-readable reasons the password fails; empty when ok. */
  errors: string[];
}

/**
 * @param password  candidate password
 * @param context   strings the password must not contain (user's name, email
 *                  local part) — lowercased substring match, 4+ char parts only
 */
export function checkPassword(password: string, context: string[] = []): PasswordCheck {
  const errors: string[] = [];
  const lower = password.toLowerCase();

  if (password.length < MIN_LENGTH) {
    errors.push(`At least ${MIN_LENGTH} characters`);
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('At least one letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('At least one number');
  }
  if (WEAK_PASSWORDS.has(lower)) {
    errors.push('That password is too common — pick something less guessable');
  }
  for (const raw of context) {
    for (const part of raw.toLowerCase().split(/[^a-z0-9]+/)) {
      if (part.length >= 4 && lower.includes(part)) {
        errors.push('Must not contain your name or email');
      }
    }
  }

  return { ok: errors.length === 0, errors: Array.from(new Set(errors)) };
}

export const PASSWORD_RULES = [
  `At least ${MIN_LENGTH} characters`,
  'At least one letter and one number',
  'Not a common password, your name, or your email',
];
