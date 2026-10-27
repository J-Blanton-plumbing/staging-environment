import type { Metadata } from 'next';
import ClassicHome, { classicHomeMetadata } from '@/components/home/ClassicHome';
import Home2026, { home2026Metadata } from '@/components/home/Home2026';
import { homeRecordForRequest } from '@/lib/cms/homepage-switch';

/*
 * Brief 220: `/` renders ONE of two homepage records, chosen by the Live homepage switch in
 * /admin/home (`global_settings.homepage_active`, see src/lib/cms/homepage-switch.ts):
 *
 *   classic   → <ClassicHome />  the Brief 219 homepage, moved VERBATIM (main_pages row `home`)
 *   home-2026 → <Home2026 />     Homepage 2026, Real Jobs, no Elfsight (main_pages row `home-2026`)
 *
 * A missing / unreadable setting, a DB error, or a Homepage 2026 record without a published version
 * all render Classic — never a 500. An editor's preview cookie wins over the switch, so either record
 * can be previewed at `/` whatever is live. Both records keep their own draft / preview / publish /
 * version history; nothing is overwritten when the switch flips, and flipping back is one click.
 */

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { record } = await homeRecordForRequest();
  return record === 'home-2026' ? home2026Metadata() : classicHomeMetadata();
}

export default async function HomePage() {
  const { record } = await homeRecordForRequest();
  return record === 'home-2026' ? <Home2026 /> : <ClassicHome />;
}
