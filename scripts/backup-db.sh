#!/usr/bin/env bash
#
# backup-db.sh — Brief 135 / OPS-1: nightly logical backup of the CMS database.
#
# WHY THIS EXISTS: until this script, the CMS had NO backups of any kind. The
# database is self-managed Postgres running on the app EC2 box itself
# (DATABASE_URL points at localhost:5432/jbp_cms — see the Brief 135 report for
# the detection evidence), which means there is no RDS automated snapshot and no
# point-in-time recovery underneath us. A single lost EBS volume, a bad `DROP`,
# or a fat-fingered migration would permanently destroy all 812 articles, 227
# city pages, 9,738 city-service pages and every unpublished draft. There is no
# WordPress original to re-import from any more for CMS-authored edits.
#
# WHAT IT DOES
#   1. pg_dump the database identified by DATABASE_URL to a plain-SQL file.
#   2. Sanity-check the dump (trailer line present + non-trivial size) so a
#      truncated dump can never be mistaken for a good one.
#   3. gzip it, verify the gzip stream, and write a .sha256 sidecar.
#   4. Upload both to s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/daily/… and, on
#      the weekly day, also to …/weekly/….
#   5. Prune the local spool directory. S3 retention is handled by a bucket
#      lifecycle rule by default (see below) — NOT by this script.
#
# RETENTION MODEL (brief: daily for 14 days, weekly for 8 weeks)
#   Implemented by writing into two prefixes rather than by parsing dates back
#   out of object keys: every run lands in `daily/`, and runs on
#   BACKUP_WEEKLY_DOW (default 7 = Sunday, ISO) additionally land in `weekly/`.
#   Expiry is then a two-line S3 lifecycle rule (14 days on `daily/`, 56 days on
#   `weekly/`) — see the runbook in the Brief 135 report.
#
#   Why lifecycle instead of deleting from here: the brief requires the backup
#   job's credentials be scoped to s3:PutObject on the backup prefix only.
#   Pruning from the script would need s3:ListBucket + s3:DeleteObject, i.e. the
#   backup role would gain the ability to destroy the backups it just wrote —
#   exactly the blast radius a backup role should not have. If you nonetheless
#   want script-side pruning (e.g. no lifecycle rules allowed), pass --prune and
#   grant the extra actions knowingly; the report documents that IAM variant.
#
# USAGE
#   ./scripts/backup-db.sh                 # dump + upload (normal cron path)
#   ./scripts/backup-db.sh --local-only    # dump to disk only, no S3, no creds
#   ./scripts/backup-db.sh --prune         # also expire old S3 objects (opt-in)
#   ./scripts/backup-db.sh --quiet         # only warnings/errors (cron-friendly)
#
# ENV (read from the environment, else from the box's env files — same order
# and mechanism .github/workflows/deploy.yml uses: .env, .env.production,
# .env.local)
#   DATABASE_URL         required — postgresql://…  (never logged unredacted)
#   BACKUP_S3_BUCKET     required unless --local-only
#   BACKUP_S3_PREFIX     optional, default "cms-backups"
#   BACKUP_S3_REGION     optional, falls back to AWS_REGION, then us-east-1
#   BACKUP_LOCAL_DIR     optional, default /var/backups/jbp-cms
#   BACKUP_KEEP_LOCAL    optional, default 7 (local .sql.gz files retained)
#   BACKUP_WEEKLY_DOW    optional, default 7 (ISO day-of-week for the weekly tier)
#   PG_BIN / PG_DUMP     optional — explicit pg_dump location (Windows drills)
#
# EXIT CODES: 0 success · 1 configuration/usage error · 2 dump failed ·
#             3 dump failed its integrity check · 4 S3 upload failed
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

QUIET=0
LOCAL_ONLY=0
PRUNE_S3=0

for arg in "$@"; do
  case "$arg" in
    --local-only) LOCAL_ONLY=1 ;;
    --prune)      PRUNE_S3=1 ;;
    --quiet)      QUIET=1 ;;
    -h|--help)    sed -n '2,60p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "backup-db.sh: unknown argument '$arg' (try --help)" >&2; exit 1 ;;
  esac
done

ts()   { date -u +'%Y-%m-%dT%H:%M:%SZ'; }
log()  { [ "$QUIET" -eq 1 ] || echo "[$(ts)] $*"; }
warn() { echo "[$(ts)] WARN  $*" >&2; }
# $1 = message, $2 = exit code (default 1). Uses $1 rather than $* so the exit
# code never gets printed as part of the message.
die()  { echo "[$(ts)] ERROR $1" >&2; exit "${2:-1}"; }

# Strip the password out of a connection string before it reaches a log file or
# cron's mail. Everything here is designed so a DATABASE_URL never appears in
# full in any output.
redact_url() { echo "$1" | sed -E 's#(://[^:/@]+):[^@]*@#\1:***@#'; }

# ── env bootstrap ────────────────────────────────────────────────────────────
# Same files, same order as deploy.yml, so the cron job and the deploy pipeline
# can never disagree about which database is "the" database. Values already
# present in the environment win (so a cron wrapper can override).
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

[ -n "${DATABASE_URL:-}" ] || die "DATABASE_URL is not set (checked the environment and $REPO_ROOT/.env{,.production,.local})."

BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-cms-backups}"
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX%/}"   # tolerate a trailing slash in config
BACKUP_S3_REGION="${BACKUP_S3_REGION:-${AWS_REGION:-us-east-1}}"
BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/var/backups/jbp-cms}"
BACKUP_KEEP_LOCAL="${BACKUP_KEEP_LOCAL:-7}"
BACKUP_WEEKLY_DOW="${BACKUP_WEEKLY_DOW:-7}"

if [ "$LOCAL_ONLY" -eq 0 ] && [ -z "${BACKUP_S3_BUCKET:-}" ]; then
  # Deliberately fatal rather than a silent fall back to local-disk-only. A
  # backup that quietly stops leaving the box is the failure mode this whole
  # brief exists to remove — an un-provisioned environment must shout, not
  # pretend. (Contrast with the upload path in Brief 134, which does silently
  # fall back; that was a considered trade-off for media, not for backups.)
  die "BACKUP_S3_BUCKET is not set. Set it, or pass --local-only if you really only want a dump on this box's disk (that dump dies with the box)."
fi

# ── locate pg_dump ───────────────────────────────────────────────────────────
# PG_DUMP / PG_BIN exist because Postgres' client tools are not on PATH on a
# stock Windows install, and the restore drill for this brief ran on Windows.
PG_DUMP_BIN="${PG_DUMP:-}"
if [ -z "$PG_DUMP_BIN" ]; then
  if [ -n "${PG_BIN:-}" ]; then PG_DUMP_BIN="$PG_BIN/pg_dump"; else PG_DUMP_BIN="pg_dump"; fi
fi
command -v "$PG_DUMP_BIN" >/dev/null 2>&1 || die "pg_dump not found (tried '$PG_DUMP_BIN'). Install the postgresql client package, or set PG_BIN=/path/to/postgres/bin."

mkdir -p "$BACKUP_LOCAL_DIR" 2>/dev/null || die "cannot create BACKUP_LOCAL_DIR '$BACKUP_LOCAL_DIR' — create it and chown it to the user this cron job runs as."
[ -w "$BACKUP_LOCAL_DIR" ] || die "BACKUP_LOCAL_DIR '$BACKUP_LOCAL_DIR' is not writable by $(id -un 2>/dev/null || echo "$USER")."

# UTC everywhere: a local-time stamp makes two files collide (or vanish) at the
# DST boundary, and these names are the only ordering key the restore path has.
STAMP="$(date -u +%Y%m%d-%H%M%S)"
BASENAME="jbp-cms-${STAMP}.sql.gz"
SQL_TMP="$BACKUP_LOCAL_DIR/.jbp-cms-${STAMP}.sql.part"
GZ_PATH="$BACKUP_LOCAL_DIR/$BASENAME"
SHA_PATH="$GZ_PATH.sha256"

cleanup() { rm -f "$SQL_TMP"; }
trap cleanup EXIT

log "backup-db starting"
log "  source   : $(redact_url "$DATABASE_URL")"
log "  pg_dump  : $("$PG_DUMP_BIN" --version 2>/dev/null | head -1)"
log "  spool    : $BACKUP_LOCAL_DIR"
if [ "$LOCAL_ONLY" -eq 1 ]; then
  log "  target   : LOCAL ONLY (no S3 upload)"
else
  log "  target   : s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/ (region $BACKUP_S3_REGION)"
fi

# ── 1. dump ──────────────────────────────────────────────────────────────────
# --no-owner / --no-privileges: the dump must restore into a database owned by a
#   differently-named role (a scratch DB, a rebuilt box, a future RDS instance)
#   without a wall of "role does not exist" errors.
# --clean --if-exists: makes the dump usable for the realistic disaster path —
#   restoring *over* an existing jbp_cms — while staying a clean no-op when
#   restored into an empty database.
# NOT piped straight into gzip: `pg_dump | gzip > file` hides a pg_dump failure
#   behind gzip's exit status and leaves a plausible-looking short .gz behind.
#   Dumping to a file first is what makes step 2 possible at all.
log "running pg_dump…"
if ! "$PG_DUMP_BIN" \
      --dbname="$DATABASE_URL" \
      --no-owner \
      --no-privileges \
      --clean \
      --if-exists \
      --file="$SQL_TMP"; then
  die "pg_dump failed — no backup was produced for $STAMP." 2
fi

# ── 2. integrity check ───────────────────────────────────────────────────────
# pg_dump writes this trailer as its very last act, so its presence is a cheap
# proof the dump ran to completion rather than dying mid-COPY (disk full, killed
# process, connection drop). A backup nobody validated is not a backup.
SQL_BYTES=$(wc -c < "$SQL_TMP" | tr -d ' ')
if ! tail -5 "$SQL_TMP" | grep -q 'PostgreSQL database dump complete'; then
  die "dump is missing its completion trailer — treating it as TRUNCATED and discarding it (${SQL_BYTES} bytes)." 3
fi
if [ "$SQL_BYTES" -lt 100000 ]; then
  # The real database is tens of MB. Anything this small means we dumped an
  # empty/wrong database — which would silently overwrite good backups with
  # useless ones until the retention window rolled the real ones out.
  die "dump is only ${SQL_BYTES} bytes — implausibly small for this database. Refusing to publish it; check DATABASE_URL points at the right database." 3
fi
log "dump OK (${SQL_BYTES} bytes uncompressed, trailer present)"

# ── 3. compress + checksum ───────────────────────────────────────────────────
gzip -9 -c "$SQL_TMP" > "$GZ_PATH"
gzip -t "$GZ_PATH" || die "gzip verification failed for $GZ_PATH." 3
rm -f "$SQL_TMP"

if command -v sha256sum >/dev/null 2>&1; then
  ( cd "$BACKUP_LOCAL_DIR" && sha256sum "$BASENAME" > "$BASENAME.sha256" )
elif command -v shasum >/dev/null 2>&1; then
  ( cd "$BACKUP_LOCAL_DIR" && shasum -a 256 "$BASENAME" > "$BASENAME.sha256" )
else
  warn "no sha256sum/shasum available — skipping the checksum sidecar (restore-db.sh will then skip integrity verification)."
  SHA_PATH=""
fi

GZ_BYTES=$(wc -c < "$GZ_PATH" | tr -d ' ')
log "compressed → $GZ_PATH (${GZ_BYTES} bytes)"

# ── 4. upload ────────────────────────────────────────────────────────────────
if [ "$LOCAL_ONLY" -eq 0 ]; then
  command -v aws >/dev/null 2>&1 || die "the aws CLI is not installed on this host — required for the S3 upload. Install awscli v2, or run with --local-only." 4

  DAILY_KEY="$BACKUP_S3_PREFIX/daily/$BASENAME"
  # --sse AES256: the bucket policy should also require it, but asking for it
  # here means an unencrypted PUT can never be the thing that succeeds.
  # --only-show-errors keeps cron mail empty on success.
  s3_put() {
    local src="$1" key="$2"
    aws s3 cp "$src" "s3://$BACKUP_S3_BUCKET/$key" \
      --region "$BACKUP_S3_REGION" \
      --sse AES256 \
      --only-show-errors
  }

  log "uploading → s3://$BACKUP_S3_BUCKET/$DAILY_KEY"
  s3_put "$GZ_PATH" "$DAILY_KEY" || die "S3 upload failed. The local dump at $GZ_PATH is intact — re-upload it by hand once credentials/permissions are fixed." 4
  [ -n "$SHA_PATH" ] && s3_put "$SHA_PATH" "$DAILY_KEY.sha256"

  if [ "$(date -u +%u)" = "$BACKUP_WEEKLY_DOW" ]; then
    WEEKLY_KEY="$BACKUP_S3_PREFIX/weekly/$BASENAME"
    log "weekly tier day — also uploading → s3://$BACKUP_S3_BUCKET/$WEEKLY_KEY"
    s3_put "$GZ_PATH" "$WEEKLY_KEY" || warn "weekly-tier upload failed (the daily copy DID land, so this run is still a valid backup)."
    [ -n "$SHA_PATH" ] && s3_put "$SHA_PATH" "$WEEKLY_KEY.sha256" || true
  fi

  # Opt-in only — see the retention note in this file's header for why the
  # default is an S3 lifecycle rule instead.
  if [ "$PRUNE_S3" -eq 1 ]; then
    prune_prefix() {
      local sub="$1" keep="$2"
      local keys
      keys="$(aws s3api list-objects-v2 \
                --bucket "$BACKUP_S3_BUCKET" \
                --prefix "$BACKUP_S3_PREFIX/$sub/" \
                --region "$BACKUP_S3_REGION" \
                --query 'sort_by(Contents, &Key)[].Key' \
                --output text 2>/dev/null | tr '\t' '\n' | grep -E '\.sql\.gz$' || true)"
      [ -n "$keys" ] || return 0
      local total drop
      total="$(echo "$keys" | wc -l | tr -d ' ')"
      drop=$(( total - keep ))
      [ "$drop" -gt 0 ] || { log "prune $sub/: $total kept, nothing to expire"; return 0; }
      # Keys sort lexicographically, which for jbp-cms-YYYYMMDD-HHMMSS is also
      # chronological — so the oldest $drop entries are the head of the list.
      echo "$keys" | head -n "$drop" | while read -r k; do
        [ -n "$k" ] || continue
        log "prune $sub/: expiring $k"
        aws s3 rm "s3://$BACKUP_S3_BUCKET/$k" --region "$BACKUP_S3_REGION" --only-show-errors || warn "could not delete $k"
        aws s3 rm "s3://$BACKUP_S3_BUCKET/$k.sha256" --region "$BACKUP_S3_REGION" --only-show-errors 2>/dev/null || true
      done
    }
    prune_prefix daily 14
    prune_prefix weekly 8
  fi
fi

# ── 5. local spool pruning ───────────────────────────────────────────────────
# Always safe to do — needs no AWS permission at all. Keeps the box's disk from
# filling up, which is itself a way to break the next backup.
if [ "$BACKUP_KEEP_LOCAL" -gt 0 ] 2>/dev/null; then
  # ls -1 sorts lexicographically = chronologically for this name format.
  local_total=$(ls -1 "$BACKUP_LOCAL_DIR"/jbp-cms-*.sql.gz 2>/dev/null | wc -l | tr -d ' ')
  local_drop=$(( local_total - BACKUP_KEEP_LOCAL ))
  if [ "$local_drop" -gt 0 ]; then
    ls -1 "$BACKUP_LOCAL_DIR"/jbp-cms-*.sql.gz | head -n "$local_drop" | while read -r f; do
      log "pruning local $f"
      rm -f "$f" "$f.sha256"
    done
  fi
fi

log "backup-db finished OK — $BASENAME"
