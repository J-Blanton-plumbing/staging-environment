# Brief 181 verification harnesses

Committed on purpose. Brief 181 was told to "re-use Brief 180's copy-diff
harness (`copy-diff.mjs`)" — and that harness had never been committed, so it
had to be rebuilt from scratch. Brief 142's scan scripts were lost the same way.
These three are the ones worth keeping, because Brief 182 (CMS-wiring the V3
template) needs exactly the same evidence.

All three are read-only. None touches the database.

| Script | What it proves |
|---|---|
| `copy-diff.ts` | The V3 content module's approved strings are all present in a served page. Reports the suspended `video.*` block and the D5 alt text separately, so a correct result cannot be mistaken for a failure. |
| `audit-page.mjs` | One canonical, no `noindex`, the exact title/description, the heading outline, exactly one `BreadcrumbList`, no `FAQPage`, the footer graph unchanged, no `#000000`, and every link a direct 200. Runs against any origin. |
| `regression-diff.mjs` | "No other page moved." Diffs two directories of captured HTML with build-hash, `buildId` and RSC-streaming noise normalised away, and `--selftest` proves the normaliser itself is sound. |

```bash
# copy-diff (needs the repo's path aliases)
npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
  scripts/brief-181/copy-diff.ts <saved.html> [...]

# page audit — local production build, or production over HTTPS
node scripts/brief-181/audit-page.mjs http://localhost:3000 /hanover-park
node scripts/brief-181/audit-page.mjs https://jblantonplumbing.com /hanover-park

# regression diff — capture the same URLs from two builds into two dirs first
node scripts/brief-181/regression-diff.mjs before/ after/ --selftest   # sanity
node scripts/brief-181/regression-diff.mjs before/ after/
```

`audit-page.mjs` carries one localhost-only allowance, documented inline: the
local dev DB stores the Hanover Park office slug with a leading slash, so the
shared footer locator emits `href="//hanover-park"` there. Production does not,
and the production run has no allowance.
