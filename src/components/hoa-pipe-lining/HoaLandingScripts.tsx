'use client';

import { useEffect } from 'react';

/**
 * Brief 127 — the HOA pipe-lining cluster's original static builds injected
 * their interactive JS via a trailing `<script>` tag in the HTML body. That
 * pattern does NOT execute when ported into React via
 * `dangerouslySetInnerHTML` (script tags inserted that way are inert), so the
 * burger-drawer / form-thankyou / carousel / sewer-camera-sync behavior is
 * reimplemented here as a shared client component. It renders nothing — it
 * just wires up listeners on the DOM the server-rendered page body already
 * produced, matching the original vanilla-JS IIFEs 1:1 (same ids/classes:
 * #jbp-drawer, .jbp-burger, .jbp-drawer-close, .jbp-drawer-nav a,
 * .jbp-drawer-cta, .jbp-drawer-phone, #hoa-form / #hoa-success).
 *
 * All three landing pages (/hoa-pipe-lining, /team, /reserve-studies) use
 * this one component instead of each re-implementing the same drawer/form
 * wiring — only the optional carousel and sewer-camera-sync bits differ
 * per page.
 */

interface CarouselConfig {
  /** CSS selector for the scrollable track (e.g. '.jbp-team-track' or '#conditions-track'). */
  trackSelector: string;
  prevSelector: string;
  nextSelector: string;
  /** Fraction of the track's clientWidth to scroll per click. Matches the two ratios seen in the source builds. */
  scrollRatio?: number;
}

interface SewerCameraSyncConfig {
  frameId: string;
  fallbackSrc: string;
}

export default function HoaLandingScripts({
  formId = 'hoa-form',
  successId = 'hoa-success',
  carousel,
  sewerCameraSync,
}: {
  formId?: string;
  successId?: string;
  carousel?: CarouselConfig;
  sewerCameraSync?: SewerCameraSyncConfig;
}) {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    // --- Burger drawer (identical across all three pages) ---
    const overlay = document.getElementById('jbp-drawer');
    const burger = document.querySelector<HTMLElement>('.jbp-burger');
    if (overlay && burger) {
      const open = () => {
        overlay.classList.add('open');
        burger.setAttribute('aria-expanded', 'true');
      };
      const close = () => {
        overlay.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      };
      const onOverlayClick = (e: MouseEvent) => {
        if (e.target === overlay) close();
      };
      burger.addEventListener('click', open);
      overlay.addEventListener('click', onOverlayClick);
      const closeBtn = overlay.querySelector<HTMLElement>('.jbp-drawer-close');
      closeBtn?.addEventListener('click', close);
      const dismissEls = overlay.querySelectorAll<HTMLElement>(
        '.jbp-drawer-nav a, .jbp-drawer-cta, .jbp-drawer-phone'
      );
      dismissEls.forEach((el) => el.addEventListener('click', close));
      cleanups.push(() => {
        burger.removeEventListener('click', open);
        overlay.removeEventListener('click', onOverlayClick);
        closeBtn?.removeEventListener('click', close);
        dismissEls.forEach((el) => el.removeEventListener('click', close));
      });
    }

    // --- Form thank-you (identical across all three pages) ---
    const form = document.getElementById(formId);
    if (form) {
      const onSubmit = (e: Event) => {
        e.preventDefault();
        const msg = document.getElementById(successId);
        if (msg) {
          msg.style.display = 'block';
          msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      };
      form.addEventListener('submit', onSubmit);
      cleanups.push(() => form.removeEventListener('submit', onSubmit));
    }

    // --- Carousel (Team + Reserve Studies only) ---
    if (carousel) {
      const track = document.querySelector<HTMLElement>(carousel.trackSelector);
      const prev = document.querySelector<HTMLElement>(carousel.prevSelector);
      const next = document.querySelector<HTMLElement>(carousel.nextSelector);
      const ratio = carousel.scrollRatio ?? 1;
      if (track) {
        const onPrev = () => track.scrollBy({ left: -track.clientWidth * ratio, behavior: 'smooth' });
        const onNext = () => track.scrollBy({ left: track.clientWidth * ratio, behavior: 'smooth' });
        prev?.addEventListener('click', onPrev);
        next?.addEventListener('click', onNext);
        cleanups.push(() => {
          prev?.removeEventListener('click', onPrev);
          next?.removeEventListener('click', onNext);
        });
      }
    }

    // --- Sewer camera iframe sync (Team only) ---
    if (sewerCameraSync) {
      const frame = document.getElementById(sewerCameraSync.frameId) as HTMLIFrameElement | null;
      let tries = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancelled = false;
      const poll = () => {
        if (cancelled || !frame) return;
        const resources = (window as unknown as { __resources?: { sewerSync?: string } }).__resources;
        if (resources && resources.sewerSync) {
          frame.src = resources.sewerSync;
        } else if (tries++ < 200) {
          timer = setTimeout(poll, 50);
        } else {
          frame.src = sewerCameraSync.fallbackSrc;
        }
      };
      poll();
      cleanups.push(() => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [formId, successId, carousel, sewerCameraSync]);

  return null;
}
