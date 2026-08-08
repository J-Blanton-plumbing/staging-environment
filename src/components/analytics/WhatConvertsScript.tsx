import {
  WHATCONVERTS_BOOTSTRAP,
  getWhatConvertsConfig,
  whatConvertsScriptUrl,
} from '@/lib/whatconverts';
import WhatConvertsRouteSwap from './WhatConvertsRouteSwap';

/**
 * WhatConverts call tracking — the snippet the live WordPress theme carried in
 * <head> (`jb-blanton/header.php`), ported 1:1 with its profile ID env-sourced.
 *
 * Renders nothing at all when NEXT_PUBLIC_WHATCONVERTS_PROFILE_ID is blank, so
 * staging and dev never touch the production WhatConverts account.
 *
 * WHY RAW <script> TAGS INSTEAD OF next/script. The inline bootstrap MUST run
 * before the tracking script, because the tracking script reads `$wc_leads` on
 * execute. Raw tags rendered into the SSR HTML give that ordering by document
 * order, which is a browser guarantee: the inline tag executes during parse and
 * the `defer` tag executes after parse, in source order. `next/script` makes no
 * such guarantee between an inline and a `src` script in the same strategy
 * bucket, and getting it wrong degrades silently — the script still loads, it
 * just attributes every lead to the wrong source.
 *
 * `defer` matches what the live WordPress site shipped and costs nothing in
 * swap timing: the vendor's swap is gated on DOM ready either way, so deferring
 * only avoids blocking the parser.
 *
 * WhatConverts' install doc prefers placement "directly before the closing
 * </head> tag (preferred) or inside the <body> tag". An App Router root layout
 * cannot author <head> directly, so this mounts as the first child of <body> —
 * the vendor's documented second option, and still ahead of all page markup.
 */
export default function WhatConvertsScript() {
  const config = getWhatConvertsConfig();
  if (!config.profileId) return null;

  const src = whatConvertsScriptUrl(config);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: WHATCONVERTS_BOOTSTRAP }} />
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src={src} defer />
      {/* App Router SPA fix — see this component's sibling for the full rationale. */}
      <WhatConvertsRouteSwap src={src} />
    </>
  );
}
