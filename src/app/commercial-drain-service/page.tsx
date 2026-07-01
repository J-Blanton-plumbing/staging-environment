import type { Metadata } from 'next';
import SubServicePageView from '@/components/SubServicePageView';
import { getSubServiceMeta } from '@/lib/cms/sub-service-pages';

// Force SSR so DB edits and drafts are reflected immediately.
export const dynamic = 'force-dynamic';

const SLUG = 'commercial-drain-service';

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSubServiceMeta(SLUG);
  return meta ? { title: meta.title, description: meta.description } : {};
}

export default function Page() {
  return <SubServicePageView slug={SLUG} />;
}
