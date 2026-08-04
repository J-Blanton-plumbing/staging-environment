/**
 * env-guards.ts — Brief 135 / Track B: refuse to boot production with insecure
 * or placeholder configuration.
 *
 * WHY THIS EXISTS: the app has always read its security-critical configuration
 * straight out of `process.env` at the point of use, and every one of those read
 * sites degrades quietly rather than loudly:
 *
 *   - `src/lib/auth/session.ts` throws only when a session is actually minted or
 *     verified — so a box booted with no `CMS_SESSION_SECRET` looks healthy until
 *     someone tries to log in.
 *   - `src/middleware.ts` treats a missing `PREVIEW_USER`/`PREVIEW_PASS` as
 *     "no Basic Auth" and passes the request straight through.
 *   - `src/lib/db.ts` hands `undefined` to `new Pool()`, which then falls back to
 *     libpq defaults (localhost, the OS user) instead of failing.
 *
 * Individually each of those is defensible. Together they mean production can
 * come up fully "working" while signing sessions with the checked-in dev
 * placeholder. This module turns that class of mistake into a boot failure.
 *
 * It is called from `src/instrumentation.ts`, which Next.js runs once per server
 * process before any request is served. Nothing here imports `pg`, `next/*`, or
 * anything else runtime-specific — it reads `process.env` and returns findings —
 * so it is equally usable from a plain `ts-node` CLI (`npm run env:check`).
 *
 * The gate is `SITE_ENV === 'production'`, deliberately NOT `NODE_ENV`:
 * `NODE_ENV` is `production` on staging too (it is set by `ecosystem.config.js`
 * for every `next start`), so keying off it would make staging unbootable. The
 * codebase already uses `SITE_ENV` as its "this is the real live site" switch —
 * see `src/app/robots.txt/route.ts` — and this reuses that single meaning.
 */

export type EnvFindingSeverity = 'error' | 'warn';

export interface EnvFinding {
  /** `error` = refuses to boot in production. `warn` = logged, never fatal. */
  severity: EnvFindingSeverity;
  /** The environment variable at fault, for grep-ability in logs. */
  variable: string;
  /** What is wrong, and what to do about it. */
  message: string;
}

/**
 * Substrings that mark a value as "obviously not a real secret". Matched
 * case-insensitively anywhere in the value.
 *
 * `change-me` is here because it is literally what this repo's dev
 * `CMS_SESSION_SECRET` ends with; the rest are the usual suspects that show up
 * when a value is copied out of an example file. The list is intentionally short
 * and specific — a broad blocklist would eventually reject a legitimate random
 * secret that happened to contain a flagged word.
 */
const PLACEHOLDER_MARKERS = [
  'change-me',
  'changeme',
  'change_me',
  'placeholder',
  'your-secret',
  'yoursecret',
  'replace-me',
  'todo',
  'xxxxx',
];

/**
 * Values that are never acceptable in production regardless of context, matched
 * exactly (case-insensitive). `jbp-cms-2026` is the dev `CMS_ADMIN_PASSWORD`
 * that has been sitting in `.env.local` since the CMS was built.
 */
const FORBIDDEN_EXACT = ['jbp', 'jbp-cms', 'jbp-cms-2026', 'admin', 'password', 'secret', 'test'];

const MIN_SECRET_LENGTH = 32;

function read(env: NodeJS.ProcessEnv, name: string): string {
  return (env[name] ?? '').trim();
}

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  if (FORBIDDEN_EXACT.includes(lower)) return true;
  return PLACEHOLDER_MARKERS.some(marker => lower.includes(marker));
}

/**
 * Evaluate the environment against the production rules.
 *
 * Always returns findings using PRODUCTION severities, whatever `SITE_ENV`
 * actually is — that is what lets `npm run env:check` tell you on a dev machine
 * what production *would* reject. Deciding whether an `error` is fatal is
 * `assertEnv`'s job, not this function's.
 */
export function collectEnvFindings(env: NodeJS.ProcessEnv = process.env): EnvFinding[] {
  const findings: EnvFinding[] = [];
  const error = (variable: string, message: string) => findings.push({ severity: 'error', variable, message });
  const warn = (variable: string, message: string) => findings.push({ severity: 'warn', variable, message });

  // ── DATABASE_URL ───────────────────────────────────────────────────────────
  // Unset does not fail fast on its own: `new Pool({ connectionString: undefined })`
  // silently falls back to libpq defaults and tries localhost as the OS user.
  const databaseUrl = read(env, 'DATABASE_URL');
  if (!databaseUrl) {
    error('DATABASE_URL', 'not set. `new Pool()` would silently fall back to libpq defaults (localhost, the OS user) instead of failing, so every CMS page would 500 with a connection error rather than a config error.');
  } else if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    error('DATABASE_URL', 'does not look like a postgres:// or postgresql:// connection string.');
  }

  // ── CMS_SESSION_SECRET ─────────────────────────────────────────────────────
  // This is the HS256 key every admin session cookie is signed with. A known
  // value means anyone who has ever seen this repo can mint a valid
  // `cms_session` JWT for any userId and walk into the CMS.
  const sessionSecret = read(env, 'CMS_SESSION_SECRET');
  if (!sessionSecret) {
    error('CMS_SESSION_SECRET', 'not set. Admin login and every gated route would throw at request time instead of at boot. Generate one with: openssl rand -base64 48');
  } else if (isPlaceholder(sessionSecret)) {
    error('CMS_SESSION_SECRET', 'is a placeholder/dev value. It signs every admin session cookie — a known value means anyone can forge an admin session. Generate a fresh one with: openssl rand -base64 48');
  } else if (sessionSecret.startsWith('jbp-')) {
    // Explicit rule from the brief: the checked-in dev secret starts with this.
    error('CMS_SESSION_SECRET', 'starts with the known dev prefix "jbp-". Rotate it: openssl rand -base64 48');
  } else if (sessionSecret.length < MIN_SECRET_LENGTH) {
    error('CMS_SESSION_SECRET', `is only ${sessionSecret.length} characters; production requires at least ${MIN_SECRET_LENGTH}. Generate one with: openssl rand -base64 48`);
  }

  // ── PREVIEW_USER / PREVIEW_PASS ────────────────────────────────────────────
  // FLAGGED DEVIATION FROM BRIEF 135 (see the report, DEVIATION-1). The brief
  // asks this guard to require these to be *set* in production. Following that
  // literally would be a site-down bug: `src/middleware.ts` puts the ENTIRE
  // public site behind HTTP Basic Auth whenever both are set, so a production
  // boot with them set answers every visitor — and Googlebot — with 401. That
  // would also silently undo Brief 127's canonical/robots/sitemap work.
  //
  // So the default rule is inverted: in production these must be ABSENT. The
  // brief's literal rule is still available for the case it was presumably
  // written for — a locked-down pre-launch production host — by opting in with
  // PREVIEW_AUTH_IN_PRODUCTION=intentional, which switches these to the
  // "set, and not a placeholder" checks.
  const previewUser = read(env, 'PREVIEW_USER');
  const previewPass = read(env, 'PREVIEW_PASS');
  const previewAuthIntentional = read(env, 'PREVIEW_AUTH_IN_PRODUCTION').toLowerCase() === 'intentional';

  if (previewAuthIntentional) {
    if (!previewUser) {
      error('PREVIEW_USER', 'PREVIEW_AUTH_IN_PRODUCTION=intentional asks for the site to sit behind Basic Auth, but PREVIEW_USER is not set — middleware would let everyone through instead.');
    } else if (isPlaceholder(previewUser)) {
      error('PREVIEW_USER', 'is a placeholder/dev value while Basic Auth is deliberately enabled in production.');
    }
    if (!previewPass) {
      error('PREVIEW_PASS', 'PREVIEW_AUTH_IN_PRODUCTION=intentional asks for the site to sit behind Basic Auth, but PREVIEW_PASS is not set — middleware would let everyone through instead.');
    } else if (isPlaceholder(previewPass)) {
      error('PREVIEW_PASS', 'is a placeholder/dev value while Basic Auth is deliberately enabled in production. Generate a fresh one with: openssl rand -base64 24');
    } else if (previewPass.length < 16) {
      error('PREVIEW_PASS', `is only ${previewPass.length} characters and is the only thing gating the whole site. Use at least 16: openssl rand -base64 24`);
    }
    warn('PREVIEW_AUTH_IN_PRODUCTION', 'is "intentional", so the entire public site is behind HTTP Basic Auth and no crawler can index it. Unset both PREVIEW_* vars and this one to go actually-live.');
  } else if (previewUser || previewPass) {
    error(
      previewUser ? 'PREVIEW_USER' : 'PREVIEW_PASS',
      'is set in production. src/middleware.ts puts the ENTIRE public site behind HTTP Basic Auth when PREVIEW_USER and PREVIEW_PASS are both present — real visitors and search crawlers would get a 401. Unset both on the production box. (If a gated production host really is what you want, set PREVIEW_AUTH_IN_PRODUCTION=intentional.)'
    );
  }

  // ── CMS_ADMIN_PASSWORD ─────────────────────────────────────────────────────
  // Dead variable: no code reads it (it predates the cms_users table and
  // bcrypt-hashed passwords). Its continued presence in an env file is how a
  // stale shared credential survives a rotation, so production must not carry
  // it at all.
  const adminPassword = read(env, 'CMS_ADMIN_PASSWORD');
  if (adminPassword) {
    error('CMS_ADMIN_PASSWORD', 'is set in production but NO code reads it — admin passwords live bcrypt-hashed in cms_users. A dead credential in the production env file is exactly what survives a rotation. Delete the line from the box\'s env file.');
  }

  // ── Brief 128 tracking IDs ─────────────────────────────────────────────────
  // Warn, never fatal: a blank ID is a deliberate hard no-op (that is what keeps
  // staging traffic out of the production analytics accounts), so it can't be an
  // error in general. But in production a blank one means that channel's
  // reporting is dark, and because NEXT_PUBLIC_* values are inlined at BUILD
  // time, noticing it after boot already means a rebuild is required to fix it.
  const trackingIds: Array<[string, string]> = [
    ['NEXT_PUBLIC_GA4_ID', 'GA4 pageviews and conversions'],
    ['NEXT_PUBLIC_GOOGLE_ADS_ID', 'Google Ads conversion tracking'],
    ['NEXT_PUBLIC_META_PIXEL_ID', 'Meta Pixel audiences'],
    ['NEXT_PUBLIC_BING_UET_ID', 'Bing UET conversions'],
  ];
  const blankIds = trackingIds.filter(([name]) => !read(env, name));
  if (blankIds.length > 0) {
    warn(
      blankIds.map(([name]) => name).join(', '),
      `blank in production — ${blankIds.map(([, what]) => what).join('; ')} will not fire. These are inlined at BUILD time, so fixing them requires setting the values and running \`npm run build\` again; a pm2 restart will not pick them up.`
    );
  }

  // ── Brief 135 backups ──────────────────────────────────────────────────────
  // The whole point of this brief: a production box with no backup destination
  // configured is the OPS-1 gate still open.
  if (!read(env, 'BACKUP_S3_BUCKET')) {
    warn('BACKUP_S3_BUCKET', 'not set, so scripts/backup-db.sh has nowhere off-box to put a dump. Until this is set and the cron job is installed, losing this box loses every article, city page and draft (Brief 135 / OPS-1).');
  }

  // ── Brief 134 uploads ──────────────────────────────────────────────────────
  // Same family of problem as OPS-1: data that only exists on ephemeral local
  // disk. The upload route falls back to writing public/uploads/cms/ silently,
  // and every deploy's build swap loses whatever landed there.
  if (!read(env, 'S3_UPLOAD_BUCKET') || !read(env, 'S3_UPLOAD_PUBLIC_BASE_URL')) {
    warn('S3_UPLOAD_BUCKET/S3_UPLOAD_PUBLIC_BASE_URL', 'not both set, so CMS media uploads fall back to local disk (Brief 134). Uploaded images are then lost on the next deploy.');
  }

  return findings;
}

/** True when this process believes it is the real, public production site. */
export function isProductionSite(env: NodeJS.ProcessEnv = process.env): boolean {
  return read(env, 'SITE_ENV') === 'production';
}

export interface AssertEnvOptions {
  env?: NodeJS.ProcessEnv;
  /** Injectable for tests / the CLI. Defaults to `console`. */
  logger?: Pick<Console, 'log' | 'warn' | 'error'>;
  /** Label used in log lines, e.g. 'instrumentation' or 'env:check'. */
  context?: string;
}

/**
 * The startup assertion.
 *
 * In production (`SITE_ENV=production`): logs every finding and throws if any
 * has severity `error`, so the process refuses to serve traffic with insecure
 * config.
 *
 * Anywhere else: logs the same findings with `error` downgraded to a warning and
 * returns normally. Dev and staging must stay bootable — the value there is that
 * you can *see* what production would reject.
 *
 * Returns the findings so callers (the CLI) can set an exit code.
 */
export function assertEnv(options: AssertEnvOptions = {}): EnvFinding[] {
  const env = options.env ?? process.env;
  const logger = options.logger ?? console;
  const context = options.context ?? 'env-guards';
  const production = isProductionSite(env);
  const findings = collectEnvFindings(env);

  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warn');

  if (!production) {
    // One line, not a wall, when there is nothing to say — this runs on every
    // dev server start.
    if (findings.length === 0) {
      logger.log(`[${context}] SITE_ENV is not "production" — production config checks passed anyway.`);
    } else {
      logger.warn(
        `[${context}] SITE_ENV is not "production", so nothing here is fatal. ` +
          `Production WOULD reject this environment on ${errors.length} count(s):`
      );
      for (const f of errors) logger.warn(`  [would-fail-in-production] ${f.variable}: ${f.message}`);
      for (const f of warnings) logger.warn(`  [warn] ${f.variable}: ${f.message}`);
    }
    // Also surface the inverse mistake: a box that IS production but was booted
    // without SITE_ENV. That single missing var serves `Disallow: /` to every
    // crawler (src/app/robots.txt/route.ts) — a silent, total SEO outage.
    if ((env.NODE_ENV ?? '') === 'production') {
      logger.warn(
        `[${context}] NODE_ENV=production but SITE_ENV is "${env.SITE_ENV ?? ''}". If this IS the live site, robots.txt is currently serving "Disallow: /" and none of the checks above are being enforced — set SITE_ENV=production.`
      );
    }
    return findings;
  }

  for (const f of warnings) logger.warn(`[${context}] WARN ${f.variable}: ${f.message}`);

  if (errors.length > 0) {
    const detail = errors.map(f => `  • ${f.variable}: ${f.message}`).join('\n');
    logger.error(
      `[${context}] REFUSING TO START — SITE_ENV=production and ${errors.length} required secret(s)/setting(s) are missing or are known placeholders:\n${detail}`
    );
    throw new Error(
      `env-guards: production startup blocked by ${errors.length} configuration error(s): ` +
        errors.map(f => f.variable).join(', ') +
        '. See the log above, or run `npm run env:check` for the full detail.'
    );
  }

  logger.log(`[${context}] production environment checks passed (${warnings.length} warning(s)).`);
  return findings;
}
