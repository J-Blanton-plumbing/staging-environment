/**
 * Brief 212 (Track D3) — restore City Hub / City Service V2 pages to their pre-template archive, for
 * bulk or emergency use (the admin's "Restore this page" button does the same for one page).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/restore-city-archive.ts --slug geneva            # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/restore-city-archive.ts --slug geneva/drain-cleaning --apply
 *   --slug may be repeated or comma-separated; `<city>/*` restores the city's 29 V2 service pages.
 *
 * Per page (src/lib/cms/restore-archive.ts, one transaction): writes every archived column back
 * (meta_*, template_type, blocks …), for a hub switches back to its pre-hub template, sets
 * hub_content / v2_content NULL (refused unless that content is saved in a version), bumps version and
 * records "Restored pre-template archive (date)" as the live version. It never publishes the archive
 * itself. Re-applying the design = publishing the City Hub / V2 version again (in /admin, or by id).
 */
import pool from '../src/lib/db';
import { restorePreTemplateArchive } from '../src/lib/cms/restore-archive';
import { CITY_SERVICE_V2_SLUGS } from '../src/lib/city-service-v2-cms/code-defaults';
import { authorId } from './lib/city-pages-seed';
import { resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'restore-city-archive';
const argv = process.argv.slice(2);
const apply = argv.some((a) => ['--apply', 'apply', 'commit', '--commit'].includes(a));
console.log(apply ? 'APPLY — writing' : 'DRY RUN — nothing written');
const mode = resolveRunMode(SCRIPT, argv);
const slugs = argv
  .flatMap((a, i) => (a === '--slug' ? [argv[i + 1]] : a.startsWith('--slug=') ? [a.slice(7)] : []))
  .flatMap((s) => (s ?? '').split(','))
  .filter(Boolean)
  .flatMap((s) => (s.endsWith('/*') ? CITY_SERVICE_V2_SLUGS.map((x) => `${s.slice(0, -2)}/${x}`) : [s]));

async function main() {
  if (!slugs.length) throw new Error('pass --slug <city>[/<service>] (repeatable, comma-separated, or <city>/*)');
  const by = await authorId();
  let done = 0;
  const problems: string[] = [];
  for (const slug of slugs) {
    const kind = slug.includes('/') ? 'service' : 'hub';
    try {
      const plan = await restorePreTemplateArchive({ kind, slug }, by, mode === 'commit');
      done++;
      console.log(`  ${(mode === 'commit' ? 'RESTORED ' : 'WOULD RESTORE ').padEnd(14)} /${slug} from "${plan.archiveLabel}" #${plan.archiveId}${plan.toTemplate ? ` → template ${plan.toTemplate}` : ''}; ${plan.columns.length} columns; current content kept in version #${plan.newContentSavedIn ?? '—'}`);
    } catch (e) {
      problems.push(`/${slug}: ${(e as Error).message}`);
      console.log(`  REFUSED        /${slug}: ${(e as Error).message}`);
    }
  }
  if (mode === 'dry') verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${done} page(s) would be restored, ${problems.length} refused`);
  else if (problems.length && !done) verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `${problems.length} refused`);
  else verdict(SCRIPT, 'APPLIED', `${done} restored, ${problems.length} refused`);
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
