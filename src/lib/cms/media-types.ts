/**
 * Brief 112 — shared media type helpers.
 *
 * Single source of truth for what the CMS accepts as an upload and how a MIME
 * type maps to the simple `image | video` enum stored in `cms_media.media_type`.
 * Imported by the upload endpoint, the media API, and the backfill migration so
 * the allow-list and the derivation logic never drift between them.
 *
 * Storage stays local this brief (public/uploads/cms/); nothing here assumes a
 * host, so a future S3 move is unaffected.
 */

export type MediaType = 'image' | 'video';

/** Allowed image MIME types (unchanged from the pre–Brief-112 uploader). */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Allowed video MIME types (new in Brief 112 — simple pass-through, no transcoding). */
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

export const ALLOWED_TYPES: readonly string[] = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

/** Per-type max upload size. Images keep the historical 10 MB cap; video is 50 MB
 *  (Brief 112 default — pending marketing-lead confirmation, see the report). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Human-readable accept hint shown under the file input. */
export const ACCEPT_ATTR = ALLOWED_TYPES.join(',');

export function isAllowedType(mime: string): boolean {
  return ALLOWED_TYPES.includes(mime);
}

/** `image` for any allowed image MIME, `video` for any allowed video MIME.
 *  Defaults to `image` for unknown types so a backfilled legacy file is never
 *  dropped from the catalog (it is still referenced by live pages). */
export function mediaTypeForMime(mime: string): MediaType {
  return (ALLOWED_VIDEO_TYPES as readonly string[]).includes(mime) || mime.startsWith('video/')
    ? 'video'
    : 'image';
}

/** Per-type size ceiling in bytes. */
export function maxBytesForMime(mime: string): number {
  return mediaTypeForMime(mime) === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

/** Best-effort MIME from a file extension — used by the backfill, which only has
 *  filenames on disk (no upload-time Content-Type). */
export function mimeForExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'webm':
      return 'video/webm';
    default:
      return '';
  }
}

/** Pretty byte size for the details panel (e.g. "2.4 MB"). */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
