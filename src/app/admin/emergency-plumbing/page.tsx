'use client';

import WaterHeaterV2Editor from '@/components/admin/water-heater-v2/WaterHeaterV2Editor';
import { EM_V2_SLUG } from '@/lib/water-heater-v2-cms/model';

/**
 * Brief 225 — `/admin/emergency-plumbing` edits the Emergency Hub (`/emergency-plumbing`, template `em-hub`)
 * with the Brief 222 water heater editor: versions only, every word / link / image / list item editable,
 * layout locked (422 on a change). The Brief 38 field editor that lived here edited the pre-v2 columns,
 * which the page no longer reads; that content is the unpublished version "Pre-v2 archive (2026-11)".
 */
export default function AdminEmergencyPlumbingPage() {
  return <WaterHeaterV2Editor slug={EM_V2_SLUG} />;
}
