import {
  WHATCONVERTS_BOOTSTRAP,
  getWhatConvertsConfig,
  whatConvertsScriptUrl,
} from '@/lib/whatconverts';
import WhatConvertsRouteSwap from './WhatConvertsRouteSwap';

/**
 * WhatConverts call tracking — the snippet the live WordPress theme carried in
 * <head> (`jb-blanton/header.php`), adapted for a hydrated App Router site.
 *
 * Renders nothing when NEXT_PUBLIC_WHATCONVERTS_PROFILE_ID is blank, so no
 * environment but production can touch the account or its number pool.
 *
 * Two pieces, and the split matters:
 *
 * 1. The inline bootstrap, rendered into the SSR HTML as the first child of
 *    <body>. It must run as early as possible because it snapshots the entry
 *    URL, referrer, query and hash, and that snapshot is what every lead gets
 *    attributed to. Being a raw inline <script> rather than next/script is what
 *    guarantees it runs before anything else touches the page.
 *
 * 2. The tracking script itself, injected from a client effect — NOT rendered
 *    here as a <script src> tag.
 *
 * WHY THE TRACKING SCRIPT IS NOT IN THE HTML. It used to be, as `<script defer>`
 * directly after the bootstrap, mirroring the WordPress install. That reproduced
 * the vendor's intent but lost a race roughly a quarter of the time: the script
 * swapped the numbers on DOMContentLoaded, then React hydrated, compared the
 * live DOM against the server HTML, found the phone text changed and patched it
 * back to the default number. Visitors saw the tracking number appear and then
 * revert, and the call went out on the untracked number.
 *
 * Injecting from an effect makes the ordering deterministic instead of racy:
 * React runs effects only after hydration has committed, so the swap always
 * lands on a DOM that React is finished with and can never be reverted by it.
 * The same effect re-injects on navigation and runs a watchdog — see the
 * sibling component.
 *
 * WhatConverts' install doc asks for the snippet before </head> (preferred) or
 * "inside the <body> tag". An App Router root layout cannot author <head>, so
 * the bootstrap takes the documented second option, ahead of all page markup.
 */
export default function WhatConvertsScript() {
  const config = getWhatConvertsConfig();
  if (!config.profileId) return null;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: WHATCONVERTS_BOOTSTRAP }} />
      <WhatConvertsRouteSwap src={whatConvertsScriptUrl(config)} />
    </>
  );
}
