#!/usr/bin/env bash
#
# restore-db.sh — Brief 135 / OPS-1: the other half of a backup.
#
# A dump nobody has ever restored is not a backup, it is a file. This script is
# the documented, rehearsed restore path — and the drill recorded in the Brief
# 135 report was performed with exactly this script, no manual steps.
#
# USAGE
#   # List what is available in S3
#   ./scripts/restore-db.sh --list
#
#   # Restore the newest daily backup into a scratch database (the drill)
#   ./scripts/restore-db.sh \
#     --from-s3 latest \
#     --target postgresql://user:pass@localhost:5432/jbp_cms_restore \
#     --create --yes
#
#   # Restore a specific dump already on disk
#   ./scripts/restore-db.sh --file /var/backups/jbp-cms/jbp-cms-20260804-070001.sql.gz \
#     --target postgresql://user:pass@localhost:5432/jbp_cms_restore --create --yes
#
#   # Prove the round-trip: compare every table's row count against a reference DB
#   ./scripts/restore-db.sh --file … --target … --create --yes --compare-with "$DATABASE_URL"
#
# OPTIONS
#   --file PATH           restore this local .sql.gz (or .sql)
#   --from-s3 KEY|latest  download from the backup bucket first ("latest" = newest
#                         object in the chosen tier)
#   --tier daily|weekly   which S3 tier "latest" means (default daily)
#   --target URL          REQUIRED — the database to restore INTO
#   --create              create the target database if it does not exist
#   --drop-existing       drop and recreate the target database first (destructive;
#                         still refuses the production DB without --allow-production)
#   --compare-with URL    after restoring, print a per-table row-count comparison
#                         against this reference database and fail on any mismatch
#   --yes                 don't prompt (required for non-interactive/cron use)
#   --allow-production    the only way to target the DATABASE_URL database itself
#   --list                list available S3 backups and exit
#
# SAFETY — read this before adding flags to a real invocation
#   The default posture is that this script CANNOT touch the live database. If
#   --target resolves to the same host+database as DATABASE_URL, it aborts unless
#   --allow-production is passed. That guard exists because the realistic way to
#   lose the CMS is no longer "no backups" — it is someone running the restore
#   tool at the live database with a stale dump while trying to test something.
#
# ENV: DATABASE_URL (used only as the "do not clobber this" reference and for the
#      env-file bootstrap), BACKUP_S3_BUCKET, BACKUP_S3_PREFIX, BACKUP_S3_REGION,
#      PG_BIN / PSQL (explicit client location for Windows drills).
#
# EXIT CODES: 0 success · 1 configuration/usage error · 2 download failed ·
#             3 dump integrity check failed · 4 restore failed ·
#             5 post-restore comparison found a mismatch
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

FILE_ARG=""
S3_ARG=""
TIER="daily"
TARGET_URL=""
COMPARE_URL=""
DO_CREATE=0
DO_DROP=0
ASSUME_YES=0
ALLOW_PROD=0
DO_LIST=0

while [ $# -gt 0 ]; do
  case "$1" in
    --file)             FILE_ARG="${2:-}"; shift 2 ;;
    --from-s3)          S3_ARG="${2:-}"; shift 2 ;;
    --tier)             TIER="${2:-}"; shift 2 ;;
    --target)           TARGET_URL="${2:-}"; shift 2 ;;
    --compare-with)     COMPARE_URL="${2:-}"; shift 2 ;;
    --create)           DO_CREATE=1; shift ;;
    --drop-existing)    DO_DROP=1; shift ;;
    --yes|-y)           ASSUME_YES=1; shift ;;
    --allow-production) ALLOW_PROD=1; shift ;;
    --list)             DO_LIST=1; shift ;;
    -h|--help)          sed -n '2,60p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "restore-db.sh: unknown argument '$1' (try --help)" >&2; exit 1 ;;
  esac
done

ts()   { date -u +'%Y-%m-%dT%H:%M:%SZ'; }
log()  { echo "[$(ts)] $*"; }
warn() { echo "[$(ts)] WARN  $*" >&2; }
# $1 = message, $2 = exit code (default 1). Uses $1 rather than $* so the exit
# code never gets printed as part of the message.
die()  { echo "[$(ts)] ERROR $1" >&2; exit "${2:-1}"; }

redact_url() { echo "$1" | sed -E 's#(://[^:/@]+):[^@]*@#\1:***@#'; }
# Everything after the last "/" and before any "?" is the database name.
url_dbname()  { echo "$1" | sed -E 's#\?.*$##; s#^.*/##'; }
url_hostport() { echo "$1" | sed -E 's#^[a-z]+://##; s#^[^@]*@##; s#/.*$##'; }
# Same URL, pointed at the `postgres` maintenance database — needed to CREATE or
# DROP the target, since you cannot do either while connected to it.
url_maintenance() { echo "$1" | sed -E 's#(^[a-z]+://[^/]+)/[^?]*(\?.*)?$#\1/postgres\2#'; }

# ── env bootstrap (same files/order as deploy.yml and backup-db.sh) ──────────
if [ -z "${DATABASE_URL:-}" ]; then
  for envfile in .env .env.production .env.local; do
    if [ -f "$REPO_ROOT/$envfile" ]; then
      set -a
      # shellcheck disable=SC1090
      . "$REPO_ROOT/$envfile"
      set +a
    fi
  done
fi

BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-cms-backups}"
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX%/}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-${AWS_REGION:-us-east-1}}"
BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/var/backups/jbp-cms}"

PSQL_BIN="${PSQL:-}"
if [ -z "$PSQL_BIN" ]; then
  if [ -n "${PG_BIN:-}" ]; then PSQL_BIN="$PG_BIN/psql"; else PSQL_BIN="psql"; fi
fi
command -v "$PSQL_BIN" >/dev/null 2>&1 || die "psql not found (tried '$PSQL_BIN'). Install the postgresql client package, or set PG_BIN=/path/to/postgres/bin."

# ── --list ───────────────────────────────────────────────────────────────────
if [ "$DO_LIST" -eq 1 ]; then
  [ -n "${BACKUP_S3_BUCKET:-}" ] || die "BACKUP_S3_BUCKET is not set — nothing to list."
  command -v aws >/dev/null 2>&1 || die "the aws CLI is not installed on this host."
  for sub in daily weekly; do
    echo "── s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/$sub/"
    aws s3 ls "s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/$sub/" --region "$BACKUP_S3_REGION" | grep -E '\.sql\.gz$' || echo "   (none)"
  done
  echo
  echo "── local: $BACKUP_LOCAL_DIR"
  ls -lh "$BACKUP_LOCAL_DIR"/jbp-cms-*.sql.gz 2>/dev/null || echo "   (none)"
  exit 0
fi

# ── validate inputs ──────────────────────────────────────────────────────────
[ -n "$TARGET_URL" ] || die "--target is required (the database to restore INTO). Refusing to guess."
if [ -n "$FILE_ARG" ] && [ -n "$S3_ARG" ]; then die "pass --file OR --from-s3, not both."; fi
if [ -z "$FILE_ARG" ] && [ -z "$S3_ARG" ]; then die "pass one of --file <path> or --from-s3 <key|latest>."; fi
case "$TIER" in daily|weekly) ;; *) die "--tier must be 'daily' or 'weekly' (got '$TIER')." ;; esac

TARGET_DB="$(url_dbname "$TARGET_URL")"
TARGET_HOST="$(url_hostport "$TARGET_URL")"
[ -n "$TARGET_DB" ] || die "could not parse a database name out of --target."

# ── the production guard ─────────────────────────────────────────────────────
if [ -n "${DATABASE_URL:-}" ]; then
  LIVE_DB="$(url_dbname "$DATABASE_URL")"
  LIVE_HOST="$(url_hostport "$DATABASE_URL")"
  if [ "$TARGET_DB" = "$LIVE_DB" ] && [ "$TARGET_HOST" = "$LIVE_HOST" ] && [ "$ALLOW_PROD" -eq 0 ]; then
    die "--target is the SAME database this app runs on ($TARGET_HOST/$TARGET_DB). That is a real disaster-recovery action, not a drill: re-run with --allow-production if you genuinely mean to overwrite live data."
  fi
fi

# ── obtain the dump ──────────────────────────────────────────────────────────
DOWNLOADED=""
if [ -n "$S3_ARG" ]; then
  [ -n "${BACKUP_S3_BUCKET:-}" ] || die "BACKUP_S3_BUCKET is not set — cannot use --from-s3."
  command -v aws >/dev/null 2>&1 || die "the aws CLI is not installed on this host." 2

  if [ "$S3_ARG" = "latest" ]; then
    log "resolving newest object in s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/$TIER/ …"
    # Keys embed a UTC timestamp, so lexicographic sort == chronological sort.
    KEY="$(aws s3api list-objects-v2 \
             --bucket "$BACKUP_S3_BUCKET" \
             --prefix "$BACKUP_S3_PREFIX/$TIER/" \
             --region "$BACKUP_S3_REGION" \
             --query 'sort_by(Contents, &Key)[].Key' \
             --output text 2>/dev/null | tr '\t' '\n' | grep -E '\.sql\.gz$' | tail -1 || true)"
    [ -n "$KEY" ] || die "no .sql.gz objects found under $BACKUP_S3_PREFIX/$TIER/." 2
  else
    KEY="$S3_ARG"
  fi

  mkdir -p "$BACKUP_LOCAL_DIR" 2>/dev/null || BACKUP_LOCAL_DIR="$(mktemp -d)"
  FILE_ARG="$BACKUP_LOCAL_DIR/$(basename "$KEY")"
  log "downloading s3://$BACKUP_S3_BUCKET/$KEY → $FILE_ARG"
  aws s3 cp "s3://$BACKUP_S3_BUCKET/$KEY" "$FILE_ARG" --region "$BACKUP_S3_REGION" --only-show-errors \
    || die "download failed." 2
  DOWNLOADED="$FILE_ARG"
  # Best effort: the sidecar may not exist for older dumps.
  aws s3 cp "s3://$BACKUP_S3_BUCKET/$KEY.sha256" "$FILE_ARG.sha256" --region "$BACKUP_S3_REGION" --only-show-errors 2>/dev/null || true
fi

[ -f "$FILE_ARG" ] || die "dump file not found: $FILE_ARG"

# ── verify the dump before letting it near a database ────────────────────────
if [ -f "$FILE_ARG.sha256" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    ( cd "$(dirname "$FILE_ARG")" && sha256sum -c "$(basename "$FILE_ARG").sha256" >/dev/null ) \
      || die "checksum MISMATCH for $FILE_ARG — the dump is corrupt or truncated. Do not restore it." 3
    log "checksum verified"
  else
    warn "sha256sum unavailable — skipping checksum verification."
  fi
else
  warn "no .sha256 sidecar for this dump — skipping checksum verification."
fi

case "$FILE_ARG" in
  *.gz)
    gzip -t "$FILE_ARG" || die "gzip stream is invalid for $FILE_ARG." 3
    READ_CMD=(gzip -dc "$FILE_ARG")
    ;;
  *)
    READ_CMD=(cat "$FILE_ARG")
    ;;
esac

# Same trailer check backup-db.sh applies on the way out, re-applied on the way
# in — the file may have been copied around by hand since it was written.
if ! "${READ_CMD[@]}" | tail -5 | grep -q 'PostgreSQL database dump complete'; then
  die "dump is missing its pg_dump completion trailer — it is truncated. Refusing to restore a partial dump over anything." 3
fi
log "dump integrity OK: $FILE_ARG"

# ── confirm ──────────────────────────────────────────────────────────────────
log "about to restore into $(redact_url "$TARGET_URL")"
if [ "$ASSUME_YES" -eq 0 ]; then
  printf 'Proceed? Type the target database name (%s) to continue: ' "$TARGET_DB"
  read -r reply
  [ "$reply" = "$TARGET_DB" ] || die "aborted (typed '$reply', expected '$TARGET_DB')."
fi

MAINT_URL="$(url_maintenance "$TARGET_URL")"
psql_maint() { "$PSQL_BIN" "$MAINT_URL" -v ON_ERROR_STOP=1 -q -A -t "$@"; }

if [ "$DO_DROP" -eq 1 ]; then
  log "dropping database \"$TARGET_DB\" …"
  # WITH (FORCE) terminates other sessions; without it a single idle CMS
  # connection makes DROP DATABASE fail and the whole restore stalls half-done.
  psql_maint -c "DROP DATABASE IF EXISTS \"$TARGET_DB\" WITH (FORCE);" \
    || die "could not drop \"$TARGET_DB\"." 4
  DO_CREATE=1
fi

if [ "$DO_CREATE" -eq 1 ]; then
  EXISTS="$(psql_maint -c "SELECT 1 FROM pg_database WHERE datname = '$TARGET_DB';" || true)"
  if [ "$EXISTS" = "1" ]; then
    log "database \"$TARGET_DB\" already exists — restoring into it (the dump's --clean/--if-exists header drops existing objects first)"
  else
    log "creating database \"$TARGET_DB\" …"
    psql_maint -c "CREATE DATABASE \"$TARGET_DB\";" || die "could not create \"$TARGET_DB\"." 4
  fi
fi

# ── restore ──────────────────────────────────────────────────────────────────
# ON_ERROR_STOP=1 is the whole ballgame: psql's DEFAULT is to log an error and
# carry on, which produces a database that looks restored, exits 0, and is
# missing arbitrary rows. Never restore without it.
log "restoring…"
RESTORE_LOG="$(mktemp)"
if ! "${READ_CMD[@]}" | "$PSQL_BIN" "$TARGET_URL" -v ON_ERROR_STOP=1 -q > "$RESTORE_LOG" 2>&1; then
  echo "──── last 40 lines of restore output ────" >&2
  tail -40 "$RESTORE_LOG" >&2
  rm -f "$RESTORE_LOG"
  die "restore FAILED — the target database is in an indeterminate state. Do not point the app at it." 4
fi
# `--clean --if-exists` on a fresh database emits harmless NOTICEs, not errors;
# anything louder is worth surfacing even on a successful run.
if grep -qiE '^(psql:)?.*\b(error|fatal)\b' "$RESTORE_LOG"; then
  warn "restore exited 0 but its output mentions errors — review:"
  grep -iE '\b(error|fatal)\b' "$RESTORE_LOG" | head -20 >&2
fi
rm -f "$RESTORE_LOG"
log "restore completed"

# ── verify ───────────────────────────────────────────────────────────────────
# query_to_xml is used instead of a hand-written UNION because the table list has
# to be discovered at runtime: the whole point is to catch a table that did NOT
# come across, which a hardcoded list would miss by construction.
COUNT_SQL="SELECT table_name || '=' || (xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM public.' || quote_ident(table_name), false, true, '')))[1]::text::bigint
           FROM information_schema.tables
           WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
           ORDER BY table_name;"

restored_counts="$("$PSQL_BIN" "$TARGET_URL" -At -c "$COUNT_SQL")"
table_count="$(echo "$restored_counts" | grep -c '=' || true)"
log "restored database contains $table_count table(s):"
echo "$restored_counts" | sed 's/^/    /'

if [ "$table_count" -eq 0 ]; then
  die "the restored database has NO tables — the dump did not apply." 4
fi

if [ -n "$COMPARE_URL" ]; then
  log "comparing row counts against reference $(redact_url "$COMPARE_URL") …"
  reference_counts="$("$PSQL_BIN" "$COMPARE_URL" -At -c "$COUNT_SQL")" || die "could not read the reference database." 5
  ref_file="$(mktemp)"; res_file="$(mktemp)"
  echo "$reference_counts" | sort > "$ref_file"
  echo "$restored_counts"  | sort > "$res_file"
  if diff -u "$ref_file" "$res_file" > /dev/null; then
    log "MATCH — all $table_count tables have identical row counts in source and restore."
    rm -f "$ref_file" "$res_file"
  else
    echo "──── row-count differences (-source / +restore) ────" >&2
    diff -u "$ref_file" "$res_file" >&2 || true
    rm -f "$ref_file" "$res_file"
    die "row counts DIFFER between the source and the restore." 5
  fi
fi

[ -n "$DOWNLOADED" ] && log "downloaded dump left in place at $DOWNLOADED"
log "restore-db finished OK"
