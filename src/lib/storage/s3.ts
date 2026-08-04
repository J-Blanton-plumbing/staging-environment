/**
 * s3.ts — thin S3 wrapper for CMS media uploads (Brief 134).
 *
 * WHY THIS EXISTS:
 * CMS uploads used to be written straight to `public/uploads/cms/` on the app
 * server. On cloud hosting that directory is ephemeral — every redeploy or
 * container replacement wipes it, silently breaking every page that references
 * an uploaded image. (It also collided with the Brief 112 gotcha where
 * `next start` won't serve a file added to `public/` after boot.) Object
 * storage fixes both: bytes live in S3, the public reads them through
 * CloudFront, and the app server holds no state.
 *
 * CONFIGURATION (all via env — never hardcode, never `NEXT_PUBLIC_*`):
 *   S3_UPLOAD_BUCKET           bucket name, e.g. jbp-cms-media
 *   S3_UPLOAD_REGION           e.g. us-east-2 (falls back to AWS_REGION)
 *   S3_UPLOAD_PREFIX           key prefix, default `uploads/cms/`
 *   S3_UPLOAD_PUBLIC_BASE_URL  CloudFront origin, e.g. https://dxxxx.cloudfront.net
 *
 * Credentials come from the standard AWS provider chain — an instance/task role
 * in production, `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` locally. They are
 * only ever read server-side; the browser never sees them and never talks to
 * the bucket directly (uploads go through the authenticated API route).
 *
 * GRACEFUL FALLBACK: `isS3Configured()` is false when the bucket or public base
 * URL is missing. Callers then keep writing to local disk exactly as before, so
 * an environment that hasn't been provisioned yet (today: local dev, and staging
 * until ops creates the bucket) keeps working instead of hard-failing every
 * upload. The upload route logs a loud warning whenever that path is taken —
 * seeing that line in production means the env vars were never set.
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const DEFAULT_PREFIX = 'uploads/cms/';

export interface S3UploadConfig {
  bucket: string;
  region: string;
  /** Always normalized to have no leading slash and exactly one trailing slash. */
  prefix: string;
  /** CloudFront origin, no trailing slash. */
  publicBaseUrl: string;
  /**
   * Optional override for the S3 API endpoint (`S3_UPLOAD_ENDPOINT`). Unset in
   * production — the SDK derives the real AWS endpoint from the region. Set it
   * to point at an S3-compatible service or a local stub when testing the
   * upload path without an AWS account. Implies path-style addressing, which is
   * what non-AWS implementations expect.
   */
  endpoint?: string;
}

/**
 * Normalize `S3_UPLOAD_PREFIX` so key building is unambiguous: no leading
 * slash, exactly one trailing slash.
 *
 * A blank or whitespace-only value falls back to the default rather than
 * meaning "bucket root" — an env file that ships `S3_UPLOAD_PREFIX=` with
 * nothing after it is overwhelmingly a missed setting, not a deliberate request
 * to scatter uploads across the top of the bucket.
 */
function normalizePrefix(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim();
  const p = (trimmed || DEFAULT_PREFIX).replace(/^\/+/, '');
  return p.endsWith('/') ? p : `${p}/`;
}

/**
 * Read the S3 config from env, or `null` if the environment isn't provisioned.
 * Bucket + public base URL are the two that make the feature meaningful: without
 * a bucket there's nowhere to put bytes, and without a CDN base there's no URL
 * to write into the catalog.
 */
export function getS3Config(): S3UploadConfig | null {
  const bucket = process.env.S3_UPLOAD_BUCKET?.trim();
  const publicBaseUrl = process.env.S3_UPLOAD_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '');
  if (!bucket || !publicBaseUrl) return null;

  const endpoint = process.env.S3_UPLOAD_ENDPOINT?.trim();

  return {
    bucket,
    region: (process.env.S3_UPLOAD_REGION || process.env.AWS_REGION || 'us-east-1').trim(),
    prefix: normalizePrefix(process.env.S3_UPLOAD_PREFIX),
    publicBaseUrl,
    ...(endpoint ? { endpoint } : {}),
  };
}

export function isS3Configured(): boolean {
  return getS3Config() !== null;
}

/**
 * Names the env vars that are missing, for the fallback warning. Kept separate
 * so the message can be specific instead of "S3 not configured".
 */
export function missingS3EnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.S3_UPLOAD_BUCKET?.trim()) missing.push('S3_UPLOAD_BUCKET');
  if (!process.env.S3_UPLOAD_PUBLIC_BASE_URL?.trim()) missing.push('S3_UPLOAD_PUBLIC_BASE_URL');
  return missing;
}

let client: S3Client | null = null;
let clientKey: string | null = null;

/** Lazily built and reused — constructing an S3Client per request is wasteful. */
export function getS3Client(config: S3UploadConfig): S3Client {
  const key = `${config.region}|${config.endpoint ?? ''}`;
  if (!client || clientKey !== key) {
    // No `credentials` key: the SDK's default provider chain resolves an
    // instance/task role in AWS and AWS_ACCESS_KEY_ID/SECRET locally.
    client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    });
    clientKey = key;
  }
  return client;
}

/** Full object key for a stored filename. */
export function keyFor(filename: string, config: S3UploadConfig): string {
  return `${config.prefix}${filename}`;
}

/** The public (CloudFront) URL the media catalog stores and the front-end loads. */
export function publicUrlFor(filename: string, config: S3UploadConfig): string {
  return `${config.publicBaseUrl}/${keyFor(filename, config)}`;
}

export interface PutResult {
  key: string;
  url: string;
}

/**
 * Store one object. Returns the key and the CDN URL.
 *
 * `CacheControl` is a year + immutable because every filename is uniquely
 * prefixed with `Date.now()` at upload time — an object is never overwritten
 * with different bytes, so it can be cached as aggressively as the CDN allows.
 */
export async function putObject(
  filename: string,
  body: Buffer,
  contentType: string,
  config: S3UploadConfig
): Promise<PutResult> {
  const key = keyFor(filename, config);
  await getS3Client(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return { key, url: publicUrlFor(filename, config) };
}

/** Does this key already exist? Used by the migration script to stay idempotent. */
export async function objectExists(key: string, config: S3UploadConfig): Promise<boolean> {
  try {
    await getS3Client(config).send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    return true;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 404 || (err as { name?: string })?.name === 'NotFound') return false;
    throw err;
  }
}
