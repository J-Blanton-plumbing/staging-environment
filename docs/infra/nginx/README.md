# Live-box nginx — reference copies (NOT deployed from here)

The box that serves `jblantonplumbing.com` runs nginx 1.28 with its site config in
`/etc/nginx/conf.d/`. That directory is **not** in git and nothing in `deploy.yml` / `scripts/deploy.sh`
touches it. The files here are copies, kept so the config is reviewable and recoverable.

| File | What it is |
|---|---|
| `production.conf` | `/etc/nginx/conf.d/production.conf` as applied by Brief 211 on 2026-10-15 |
| `production.conf.before-brief211` | the same file before Brief 211 (on-box backup: `/etc/nginx/backup-brief211/production.conf.20261015T185622Z`) |

Both were captured through the Actions log (`ops/brief-211`), which drops blank lines; content is otherwise verbatim.

## Host canonicalization (Brief 211)

Every www / http variant reaches `https://jblantonplumbing.com{path}{query}` in **one** 301:

| Request | Handled by |
|---|---|
| `https://www.jblantonplumbing.com/*` | its own 443 server block → `return 301 https://jblantonplumbing.com$request_uri` |
| `http://www.jblantonplumbing.com/*` | port-80 block, `$host = www…` branch → same target |
| `http://jblantonplumbing.com/*` | port-80 block, apex branch → `https://$host$request_uri` |
| `https://jblantonplumbing.com/*` | apex 443 block → proxied to Next on :3000 |

**Do not add `www.jblantonplumbing.com` back to the apex block's `server_name`** — www would be served
as a 200 duplicate again, and a Next-side fallback could only ever make `http://www` a two-hop chain
(nginx answers `http://` before Next sees the request).

The apex 443 block is deliberately first in the file: it stays the default 443 server for unknown
hosts, as before. `staging.conf`, `staging2.conf` and nginx.conf's default `_` block were not changed.

## How to change it

There is no SSH from the office workstation. Changes go through an ops workflow on a non-default
branch (pattern: `.github/workflows/brief211-ops.yml` on `ops/brief-211`): push an empty commit
whose message carries the phase marker. The apply phase backs up, writes, `nginx -t`s, reloads
(never restarts), self-tests with `curl --resolve`, and restores the backup on any failure.

The repo is public, so Actions logs are public: never print secret values from the box.

## Certificate renewal — OPEN (found 2026-10-15)

`jblantonplumbing.com` (SAN: apex + www) expires **2026-11-06**; `staging.` expires 2026-10-21;
`staging2.` expired 2026-07-30. Renewal is configured for the certbot nginx authenticator, but the
box has **no certbot systemd timer, no root crontab line and no `/etc/cron.d` entry** — nothing
renews these automatically.
