'use client';

import { useEffect } from 'react';

/**
 * Brief 108 (Group B) — makes the involve.me scheduling / contact popup fire for
 * CTA buttons that first appear AFTER the initial page load (i.e. via a Next.js
 * client-side route change).
 *
 * ── Root cause ──────────────────────────────────────────────────────────────
 * The involve.me embed script (`window.involvemeEmbedPopup`, loaded by
 * `InvolveMeScript`) binds trigger buttons with a ONE-TIME
 * `document.querySelectorAll('.involveme_popup')` inside its `init()` on load. It
 * has no MutationObserver and never re-scans. So the persistent navbar button
 * (rendered once in `SiteShell` and present at first load) is bound forever and
 * works, but every hero/section CTA that a page renders only after a client-side
 * navigation is never bound → clicking it does nothing (OC-01, OC-07, OC-14,
 * OC-17). A full reload of those pages works; navigating to them in-app doesn't.
 *
 * ── Fix ─────────────────────────────────────────────────────────────────────
 * Leave every `.involveme_popup` present at first mount to the native `init()`
 * (so we never double-bind, e.g. the navbar). Then watch the DOM with a
 * MutationObserver and, for any `.involveme_popup` inserted later, attach a click
 * handler that calls the SAME `involvemeEmbedPopup.open(options, el)` the native
 * handler would — options are read from the element's data-* attributes exactly
 * as involve.me's own `getOptionsFromElement` does. This changes no button markup
 * or styling; it only wires the clicks the native script misses.
 */

const BOUND_ATTR = 'data-im-popup-bound';

type InvolveMeApi = {
  open: (options: Record<string, string | null>, el: Element) => void;
};

/** Mirrors involve.me's own getOptionsFromElement (see /embed?type=popup). */
function getOptions(el: Element): Record<string, string | null> {
  return {
    projectUrl: el.getAttribute('data-project'),
    embedMode: el.getAttribute('data-embed-mode'),
    triggerEvent: el.getAttribute('data-trigger-event'),
    popupSize: el.getAttribute('data-popup-size'),
    organizationUrl: el.getAttribute('data-organization-url'),
    position: el.getAttribute('data-position'),
    params: el.getAttribute('data-params'),
    loadColor: el.getAttribute('data-loadcolor'),
  };
}

function getApi(): InvolveMeApi | null {
  const api = (window as unknown as { involvemeEmbedPopup?: InvolveMeApi }).involvemeEmbedPopup;
  return api && typeof api.open === 'function' ? api : null;
}

export default function InvolveMePopupBinder() {
  useEffect(() => {
    function handleClick(this: Element, ev: Event) {
      const api = getApi();
      // Script not ready yet (e.g. still loading) — no-op, matching the
      // pre-existing behavior of an un-bound native button.
      if (!api) return;
      ev.preventDefault();
      api.open(getOptions(this), this);
    }

    function bind(el: Element) {
      if (el.getAttribute(BOUND_ATTR)) return;
      el.setAttribute(BOUND_ATTR, 'mine');
      el.addEventListener('click', handleClick as EventListener);
    }

    // Elements present right now are owned by involve.me's native init() — mark
    // them so we never attach a duplicate handler to them (prevents the navbar
    // button from opening the popup twice).
    document.querySelectorAll('.involveme_popup').forEach((el) => {
      if (!el.getAttribute(BOUND_ATTR)) el.setAttribute(BOUND_ATTR, 'native');
    });

    // Bind any .involveme_popup inserted later (client-side navigation).
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches?.('.involveme_popup')) bind(node);
          node.querySelectorAll?.('.involveme_popup').forEach(bind);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
