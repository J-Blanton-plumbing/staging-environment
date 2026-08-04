/**
 * instrumentation.ts — Brief 135 / Track B: the one place that runs on boot.
 *
 * Next.js calls `register()` once per server process, before any request is
 * handled. That is the only hook in an App Router app that means "startup":
 *
 *   - a module-scope side effect in `src/app/layout.tsx` runs on first *render*,
 *     which may be long after the process came up;
 *   - `src/middleware.ts` runs per request, on the Edge runtime, and cannot see
 *     most of the environment;
 *   - there is no `server.js` to hook — the app is started by `next start` via
 *     pm2 (`ecosystem.config.js`).
 *
 * Requires `experimental.instrumentationHook: true` in next.config.mjs (Next
 * 14.2). If that flag is ever removed, this file silently stops running and the
 * production env guard stops being enforced. `npm run env:check` in the deploy
 * pipeline is the intended backstop — see the Brief 135 report's runbook.
 *
 * VERIFIED BEHAVIOUR ON THIS VERSION (Next 14.2.5, measured in Brief 135, not
 * assumed — both points are load-bearing for the runbook):
 *
 *  1. `register()` does NOT run during `next build`. Only at `next start`. So a
 *     production box with bad secrets still BUILDS fine and only fails when the
 *     new process comes up — which is after deploy.yml has already swapped the
 *     new build into place. That is why the runbook puts `npm run env:check`
 *     BEFORE the pm2 reload rather than relying on the build to fail.
 *
 *  2. Throwing out of `register()` does NOT stop the server process. Next logs
 *     "Failed to prepare server", then still prints "Ready", binds the port, and
 *     answers every request with a 500. The process stays alive and healthy from
 *     pm2's point of view — `pm2 list` shows `online`, `autorestart` never
 *     triggers, and the only symptom is a site that 500s. This project has
 *     already lost time to exactly that shape of failure once (the deploy step
 *     that silently no-op'd against a process pm2 had never registered — see
 *     ecosystem.config.js). So the throw is caught here and turned into an
 *     explicit `process.exit(1)`.
 */
import { assertEnv } from '@/lib/env-guards';

export async function register() {
  // `register()` is invoked for BOTH the nodejs and edge runtimes. On Edge,
  // `process.env` is a build-time-inlined shim: dynamic lookups like
  // `process.env[name]` — which is how env-guards reads every variable — come
  // back `undefined` regardless of what the box is actually configured with.
  // Running there would report every secret as missing and refuse to boot a
  // perfectly good production server. The Node runtime is where the real
  // environment lives, and it is where the app serves from.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    // Throws when SITE_ENV=production and a required secret is missing or is a
    // known placeholder. Everything is already logged in full by assertEnv.
    assertEnv({ context: 'instrumentation' });
  } catch (err) {
    // Exit rather than rethrow — see point 2 in the header. A process that dies
    // is diagnosable (pm2 shows `errored`, the logs show why, nginx returns 502);
    // a process that stays up and 500s every request while reporting `online`
    // is the worst of both worlds.
    //
    // pm2's `max_restarts: 10` + `restart_delay: 3000` means this crash-loops for
    // ~30s and then stops for good, instead of forever.
    //
    // If a future Next version ever DOES call register() during `next build`,
    // this exit fails the build instead — which is strictly better: deploy.yml's
    // `set -e` aborts before the build swap, so the previous version keeps
    // serving.
    console.error(
      `[instrumentation] exiting: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
}
