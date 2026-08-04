/**
 * verify-brief-134-s3.ts — offline checks for the CMS→S3 upload wiring.
 *
 * Follows the repo's existing verify-brief-*.ts convention. Runs entirely
 * locally: the SDK's transport is stubbed, so this makes NO AWS calls and needs
 * no credentials. It proves the wrapper reads env correctly, normalizes the
 * prefix/base URL, builds the right object key + CloudFront URL, and issues a
 * PutObjectCommand with the right bucket, ContentType, CacheControl — and with
 * no ACL, so the bucket stays private and is only readable through CloudFront.
 *
 * It also prints the CURRENT environment's effective config, which is the
 * quickest way to confirm a box is provisioned correctly before running the
 * migration.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/verify-brief-134-s3.ts
 */

import { S3Client } from '@aws-sdk/client-s3';
import {
  getS3Config,
  isS3Configured,
  keyFor,
  missingS3EnvVars,
  publicUrlFor,
  putObject,
} from '../src/lib/storage/s3';

interface SentCommand {
  ctor: string;
  input: Record<string, unknown>;
}

const sent: SentCommand[] = [];
// Stub the transport so nothing leaves the machine.
(S3Client.prototype as unknown as { send: (cmd: unknown) => Promise<unknown> }).send = async function (
  cmd: unknown
) {
  const c = cmd as { constructor: { name: string }; input: Record<string, unknown> };
  sent.push({ ctor: c.constructor.name, input: c.input });
  return {};
};

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n        got  ${a}\n        want ${e}`}`);
}

async function main() {
  // Report the real environment first, before the checks overwrite it.
  console.log('=== effective config in THIS environment ===');
  const live = getS3Config();
  if (live) {
    console.log(`  bucket        : ${live.bucket}`);
    console.log(`  region        : ${live.region}`);
    console.log(`  prefix        : "${live.prefix}"`);
    console.log(`  CDN base      : ${live.publicBaseUrl}`);
    console.log(`  example URL   : ${publicUrlFor('1770000000000-example.webp', live)}`);
    console.log('  → uploads will go to S3.');
  } else {
    console.log(`  NOT CONFIGURED — missing ${missingS3EnvVars().join(', ')}`);
    console.log('  → uploads fall back to local disk (public/uploads/cms/), which is');
    console.log('    ephemeral on cloud hosting. Fine for local dev; NOT for production.');
  }

  console.log('\n=== unconfigured behaviour ===');
  const saved = { ...process.env };
  delete process.env.S3_UPLOAD_BUCKET;
  delete process.env.S3_UPLOAD_PUBLIC_BASE_URL;
  check('getS3Config() is null', getS3Config(), null);
  check('isS3Configured() is false', isS3Configured(), false);
  check('missingS3EnvVars() names both', missingS3EnvVars(), ['S3_UPLOAD_BUCKET', 'S3_UPLOAD_PUBLIC_BASE_URL']);

  console.log('\n=== configured behaviour ===');
  process.env.S3_UPLOAD_BUCKET = 'jbp-cms-media';
  process.env.S3_UPLOAD_REGION = 'us-east-2';
  process.env.S3_UPLOAD_PREFIX = 'uploads/cms/';
  process.env.S3_UPLOAD_PUBLIC_BASE_URL = 'https://d1abc2def3.cloudfront.net/'; // trailing slash on purpose
  const cfg = getS3Config()!;
  check('bucket', cfg.bucket, 'jbp-cms-media');
  check('region', cfg.region, 'us-east-2');
  check('trailing slash stripped from base URL', cfg.publicBaseUrl, 'https://d1abc2def3.cloudfront.net');
  check('keyFor()', keyFor('1234-photo.webp', cfg), 'uploads/cms/1234-photo.webp');
  check(
    'publicUrlFor()',
    publicUrlFor('1234-photo.webp', cfg),
    'https://d1abc2def3.cloudfront.net/uploads/cms/1234-photo.webp'
  );

  console.log('\n=== prefix normalization ===');
  process.env.S3_UPLOAD_PREFIX = '/media';
  check('"/media" → "media/"', getS3Config()!.prefix, 'media/');
  process.env.S3_UPLOAD_PREFIX = '';
  check('blank → default', getS3Config()!.prefix, 'uploads/cms/');
  delete process.env.S3_UPLOAD_PREFIX;
  check('unset → default', getS3Config()!.prefix, 'uploads/cms/');
  process.env.S3_UPLOAD_PREFIX = 'uploads/cms/';

  console.log('\n=== putObject issues the right command ===');
  const body = Buffer.from('fake-bytes');
  const res = await putObject('1770000000000-hero.webp', body, 'image/webp', getS3Config()!);
  const cmd = sent[sent.length - 1];
  check('command type', cmd.ctor, 'PutObjectCommand');
  check('Bucket', cmd.input.Bucket, 'jbp-cms-media');
  check('Key', cmd.input.Key, 'uploads/cms/1770000000000-hero.webp');
  check('ContentType', cmd.input.ContentType, 'image/webp');
  check('CacheControl', cmd.input.CacheControl, 'public, max-age=31536000, immutable');
  check('body passed through unchanged', Buffer.isBuffer(cmd.input.Body) && (cmd.input.Body as Buffer).equals(body), true);
  check('no ACL set (bucket stays private)', cmd.input.ACL, undefined);
  check('returned url', res.url, 'https://d1abc2def3.cloudfront.net/uploads/cms/1770000000000-hero.webp');
  check('returned key', res.key, 'uploads/cms/1770000000000-hero.webp');

  console.log('\n=== video content type is preserved ===');
  await putObject('1770000000001-clip.mp4', body, 'video/mp4', getS3Config()!);
  check('ContentType', sent[sent.length - 1].input.ContentType, 'video/mp4');

  // Restore whatever the environment actually had.
  for (const k of ['S3_UPLOAD_BUCKET', 'S3_UPLOAD_REGION', 'S3_UPLOAD_PREFIX', 'S3_UPLOAD_PUBLIC_BASE_URL']) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
  if (failures > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
