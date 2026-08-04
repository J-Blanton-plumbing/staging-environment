/**
 * check-env.ts — Brief 135 / Track B: run the production env guard as a CLI.
 *
 *   npm run env:check                 # check the current environment
 *   SITE_ENV=production npm run env:check
 *
 * Two jobs:
 *
 *  1. Let someone answer "would production accept this box's config?" WITHOUT
 *     restarting the app. `src/instrumentation.ts` enforces the same rules at
 *     boot, but finding out at boot means finding out during a deploy, with the
 *     site already swapping over.
 *
 *  2. Be the backstop if the instrumentation hook ever stops running (the
 *     `experimental.instrumentationHook` flag is removed, or a future Next
 *     version changes the contract). Adding this to the deploy pipeline before
 *     the pm2 reload is the recommended belt-and-braces — see the Brief 135
 *     report's runbook.
 *
 * Exit codes: 0 = no errors (warnings are allowed and printed) · 1 = at least
 * one finding that production treats as fatal. Note the non-zero exit happens
 * whether or not SITE_ENV is actually "production", so the check is useful from
 * a dev machine; only the app's boot behavior is gated on SITE_ENV.
 *
 * Imported by relative path, not the `@/` alias: tsconfig.scripts.json compiles
 * `scripts/**` with `moduleResolution: node` and no path mapping, so `@/lib/…`
 * would need `-r tsconfig-paths/register` on every invocation for no benefit.
 */

import { existsSync, readFileSync } from 'fs';
import { assertEnv, collectEnvFindings, isProductionSite } from '../src/lib/env-guards';

// ── env bootstrap ────────────────────────────────────────────────────────────
// Same pattern as scripts/setup-db.ts, and the same file order deploy.yml and
// scripts/backup-db.sh use, so the CLI evaluates exactly the environment the app
// would boot with. Already-set process env wins.
for (const envfile of ['.env', '.env.production', '.env.local']) {
  if (!existsSync(envfile)) continue;
  for (const line of readFileSync(envfile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const findings = collectEnvFindings();
const errors = findings.filter(f => f.severity === 'error');

console.log('env:check — Brief 135 production configuration guard');
console.log(`  SITE_ENV = ${process.env.SITE_ENV ? `"${process.env.SITE_ENV}"` : '(unset)'}`);
console.log(`  NODE_ENV = ${process.env.NODE_ENV ? `"${process.env.NODE_ENV}"` : '(unset)'}`);
console.log(
  `  mode     = ${isProductionSite() ? 'PRODUCTION (findings below are fatal at boot)' : 'non-production (findings below are advisory at boot)'}`
);
console.log('');

// assertEnv does the printing (and throws in production) — catch so the CLI can
// own its own exit code instead of dying with a stack trace.
try {
  assertEnv({ context: 'env:check' });
} catch {
  /* already logged in full by assertEnv */
}

console.log('');
if (errors.length === 0) {
  console.log('✓ No production-fatal findings.');
  process.exit(0);
}

console.error(`✗ ${errors.length} finding(s) that block a production boot: ${errors.map(f => f.variable).join(', ')}`);
console.error('  Never paste real secret values into a terminal transcript, a ticket, or a chat — set them in the box\'s env file only.');
process.exit(1);
