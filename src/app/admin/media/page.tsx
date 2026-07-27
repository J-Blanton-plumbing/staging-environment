'use client';

/**
 * Brief 112 (Track D) — standalone Media Library admin page.
 *
 * Renders the shared MediaLibrary in `manage` mode: browse the full catalog,
 * filter by type, search, and (via the details panel) edit alt text / caption /
 * display name or delete an item with the delete-safety confirmation.
 */

import MediaLibrary from '@/components/admin/MediaLibrary';
import { ADMIN_COLORS } from '@/lib/admin/theme';

export default function MediaLibraryPage() {
  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', fontFamily: 'system-ui, sans-serif' }}>
      <h1
        style={{
          fontFamily: 'var(--font-outfit), system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.875rem',
          letterSpacing: '-0.025em',
          color: ADMIN_COLORS.onSurface,
          marginBottom: '0.25rem',
        }}
      >
        Media Library
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-nunito), system-ui, sans-serif',
          color: `${ADMIN_COLORS.onSurfaceVariant}99`,
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
        }}
      >
        All uploaded images and videos. Click an item to view details, edit alt text/caption, or delete it.
      </p>

      <MediaLibrary mode="manage" />
    </main>
  );
}
