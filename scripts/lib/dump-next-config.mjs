/**
 * Dump the resolved next.config.mjs routing tables as JSON on stdout.
 *
 * `scripts/validate-sitemap.ts` runs under ts-node (CommonJS), which cannot
 * `import()` an ESM `.mjs` module. Rather than regex-parse the config — which
 * would silently under-report after any refactor — the validator spawns this
 * one-liner and reads the ACTUAL objects `redirects()` and `rewrites()` return.
 *
 * Not a general-purpose helper: it exists so the validator can never disagree
 * with the config it is validating against.
 */
import cfg from '../../next.config.mjs';

const out = {
  redirects: (await cfg.redirects?.()) ?? [],
  rewrites: (await cfg.rewrites?.()) ?? {},
  skipTrailingSlashRedirect: cfg.skipTrailingSlashRedirect === true,
  headers: (await cfg.headers?.()) ?? [],
};
process.stdout.write(JSON.stringify(out));
