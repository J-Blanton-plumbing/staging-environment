/**
 * pm2 process definition for the production/staging app server.
 *
 * WHY THIS EXISTS: on 2026-07-28 (Brief 112 QA), `pm2 list` on staging returned
 * zero processes — the app was actually running as a bare `next start` bootstrapped
 * outside pm2 (no supervisor, wouldn't survive a reboot or crash, and wouldn't
 * restart on deploy). Meanwhile `.github/workflows/deploy.yml` has always run
 * `pm2 restart jblanton --update-env` at the end of every deploy — a command that
 * silently no-ops (or errors non-fatally) against a process pm2 has never heard of.
 * That means recent deploys likely never restarted the live process at all.
 *
 * This file gives the app a stable, named pm2 identity so:
 *   - `pm2 startOrReload ecosystem.config.js --update-env` (used by deploy.yml)
 *     registers it the first time and reloads it on every deploy after that.
 *   - `pm2 save` + `pm2 startup` (one-time, run by hand) make it survive an
 *     EC2 reboot.
 *
 * `watch: false` is deliberate — the app's own cwd includes `public/uploads/cms/`,
 * which now receives runtime writes from the CMS media uploader (Brief 112). If
 * pm2 watched the working directory, every upload would trigger a full app
 * restart. Restart-on-upload is not the fix for the "new upload 404s until
 * restart" bug (see the nginx `location /uploads/cms/` fix in the Brief 112
 * follow-up) — it would just be a slower, noisier version of it.
 */

module.exports = {
  apps: [
    {
      name: 'jblanton',
      cwd: __dirname,
      script: 'npm',
      args: 'start',
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
