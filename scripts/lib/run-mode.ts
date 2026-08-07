/**
 * Brief 147 (Track A) — one rule for how a DB-writing script decides whether it is
 * applying changes or only previewing them, and one place that makes a SILENT
 * dry-run impossible from the deploy pipeline.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * Every seed/fix script in this repo is dry-run by default — the right default for
 * a human at a terminal, and a trap in CI. Each one used to decide for itself:
 *
 *     const mode = process.argv[2] === 'commit' ? 'commit' : 'dry';
 *
 * Drop the `commit` argument in deploy.yml and the script logs everything it WOULD
 * have done, exits 0, and the pipeline sails on reporting success. The Brief 146
 * content port shipped a route change onto a row whose copy was never loaded, and
 * from the outside — a green deploy, exit 0 — that is indistinguishable from a
 * step that applied cleanly, a step that tripped a guard, and a step that never
 * ran at all. Marketing found the empty page instead of the pipeline finding it.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────
 * At a terminal: no argument → dry run (unchanged, still the safe default).
 * In the pipeline: no explicit choice → EXIT NON-ZERO before touching anything.
 *
 * "In the pipeline" means `JBP_PIPELINE` or `CI` is set in the environment.
 * deploy.yml exports `JBP_PIPELINE=1` (GitHub's own `CI` does not survive the SSH
 * hop into the box, so it cannot be relied on here).
 *
 * A pipeline step that genuinely wants a preview says so — `--dry-run` is an
 * explicit choice and is honoured everywhere, including in CI.
 *
 * ── VERDICTS ────────────────────────────────────────────────────────────────
 * `verdict()` prints one greppable line per script so a deploy log can be read at
 * a glance, and appends it to the file named by `JBP_DEPLOY_VERDICTS` when set, so
 * deploy.yml can print every script's outcome together at the end:
 *
 *     PIPELINE VERDICT: seed-brief-146-gas-lines-content — APPLIED
 *     PIPELINE VERDICT: fix-brief-146-delete-gas-lines-chicago — NOT-APPLIED (guard tripped)
 *
 * NOT-APPLIED is the line that used to be invisible.
 */
import { appendFileSync } from 'fs';

export type RunMode = 'commit' | 'dry';

/** Tokens that mean "apply", and tokens that mean "explicitly preview". */
const COMMIT_TOKENS = new Set(['commit', '--commit', 'apply', '--apply']);
const DRY_TOKENS = new Set(['dry', '--dry', 'dry-run', '--dry-run']);

/** Is this process running inside the deploy pipeline rather than at a terminal? */
export function inPipeline(): boolean {
  return !!(process.env.JBP_PIPELINE || process.env.CI);
}

/**
 * Resolve the run mode from argv, refusing to guess in the pipeline.
 *
 * Also installs an exit hook that prints this script's verdict line if the script
 * never called `verdict()` itself — so every retrofitted script contributes a
 * greppable outcome to the deploy log without needing its internals rewritten.
 *
 * @param scriptName used in the error message and in `verdict()` lines.
 * @param argv       defaults to the real process arguments.
 */
export function resolveRunMode(scriptName: string, argv: string[] = process.argv.slice(2)): RunMode {
  const commit = argv.some((a) => COMMIT_TOKENS.has(a));
  const dry = argv.some((a) => DRY_TOKENS.has(a));

  if (commit && dry) {
    console.error(
      `\n${scriptName}: both an apply flag and --dry-run were passed. Pick one.\n`
    );
    process.exit(2);
  }
  if (commit) {
    installAutoVerdict(scriptName, 'commit');
    return 'commit';
  }
  if (dry) {
    installAutoVerdict(scriptName, 'dry');
    return 'dry';
  }

  if (inPipeline()) {
    console.error('');
    console.error('!'.repeat(72));
    console.error(`${scriptName}: REFUSING TO RUN — no apply/dry-run choice was given.`);
    console.error('');
    console.error('This script is dry-run by default, which in a pipeline means it would');
    console.error('log what it WOULD do, exit 0, and let the deploy report success while');
    console.error('nothing was written. That is exactly how the Brief 146 content port');
    console.error('shipped a page with no content on it (Brief 147, Track A).');
    console.error('');
    console.error('Fix the deploy step: pass `commit` to apply, or `--dry-run` to preview');
    console.error('on purpose. Exiting NON-ZERO so the deploy fails here instead of');
    console.error('shipping a silent no-op.');
    console.error('!'.repeat(72));
    console.error('');
    process.exit(1);
  }

  installAutoVerdict(scriptName, 'dry');
  return 'dry';
}

/**
 * Fallback verdict for scripts that have not been wired with an explicit
 * `verdict()` call: report the mode and the process exit code. An explicit
 * `verdict()` anywhere in the run suppresses this.
 */
function installAutoVerdict(scriptName: string, mode: RunMode): void {
  process.on('exit', (code) => {
    if (verdictReported) return;
    if (code !== 0) verdict(scriptName, 'FAILED', `exit ${code}`);
    else if (mode === 'dry') verdict(scriptName, 'NOT-APPLIED (dry run)');
    else verdict(scriptName, 'APPLIED', 'exit 0 — read the step output above for guard banners');
  });
}

/** The banner every script prints once it knows its mode. */
export function announceMode(scriptName: string, mode: RunMode): void {
  console.log(
    mode === 'commit'
      ? `MODE: COMMIT (writing changes)${inPipeline() ? ' [pipeline]' : ''}\n`
      : `MODE: DRY RUN (no writes — pass "commit" to apply)${inPipeline() ? ' [pipeline, explicitly requested]' : ''}\n`
  );
  return;
}

export type Verdict =
  | 'APPLIED'
  | 'ALREADY-APPLIED'
  | 'NOT-APPLIED (guard tripped)'
  | 'NOT-APPLIED (dry run)'
  | 'FAILED';

let verdictReported = false;

/**
 * Print — and, when `JBP_DEPLOY_VERDICTS` is set, record — this script's outcome
 * in one greppable line. Call it exactly once, on every exit path; calling it
 * suppresses the automatic fallback verdict.
 */
export function verdict(scriptName: string, v: Verdict, detail = ''): void {
  verdictReported = true;
  const line = `PIPELINE VERDICT: ${scriptName} — ${v}${detail ? ` — ${detail}` : ''}`;
  console.log(line);
  const file = process.env.JBP_DEPLOY_VERDICTS;
  if (!file) return;
  try {
    appendFileSync(file, line + '\n');
  } catch {
    /* a missing verdict file must never fail a deploy — the line is on stdout too */
  }
}
