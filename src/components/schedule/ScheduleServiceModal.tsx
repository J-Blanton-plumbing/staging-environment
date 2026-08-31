'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MAINLINE_ORIGIN, buildScheduleUrl } from '@/lib/schedule/tracking';

/**
 * Brief 169 (Track A) — the first-party "Schedule a Service" popup that replaces
 * the retired involve.me scheduling project. Mounted ONCE from the root
 * layout; it owns every scheduling-CTA click on the site.
 *
 * ── Why event delegation ────────────────────────────────────────────────────
 * involve.me bound triggers with a one-time `querySelectorAll('.involveme_popup')`
 * at script load and never re-scanned, so every CTA that mounted after a
 * client-side route change was dead on click — the bug Brief 108 had to paper
 * over with `InvolveMePopupBinder`'s MutationObserver.
 *
 * ONE delegated listener on `document` fixes that class of bug permanently: it
 * matches elements that exist now and elements React mounts later, with no
 * observer and no re-binding. It also means a trigger needs no props, no
 * handler and no `data-*` — just `class="schedule-popup"` — so the pages that
 * render one stay SERVER components.
 *
 * ── Why the iframe is not mounted until first open ──────────────────────────
 * The Mainline form is a full Next app that loads its own GA4, Google Ads and
 * Meta Pixel. Mounting the frame on page load would pull all of that into every
 * pageview on jblantonplumbing.com. `src` is set at open time and then kept —
 * closing hides the panel with `display:none`, which does NOT unload an iframe,
 * so re-opening is instant and resumes the visitor's place in the flow.
 *
 * ── Completion / conversion (Brief 169 Track D) ─────────────────────────────
 * involve.me finished by navigating the TOP-LEVEL window to /thank-you, and that
 * pageview is the GA4 / Google Ads conversion. Mainline navigates ITSELF to its
 * own /thank-you inside the frame, which our analytics cannot see. The listener
 * below is ready for a `jbp:form_submitted` message; until Mainline ships it
 * (spec in the Brief 169 report), our /thank-you conversion does not fire for
 * scheduling submissions. Deliberately NOT worked around by guessing the final
 * step index — a step re-order would break the conversion silently, and a wrong
 * guess would count abandoned sessions as leads.
 */

/** The class every scheduling trigger carries. Delegation key — do not rename. */
const TRIGGER_SELECTOR = '.schedule-popup';

/** Above the sticky header (z-40), the mobile drawer (z-50) and the site's z-[100]. */
const MODAL_Z_INDEX = 9999;

/** Midnight #0A1B2E at 55% — the brand backdrop. Never #000. */
const BACKDROP_COLOR = 'rgba(10, 27, 46, 0.55)';

type MainlineMessage = {
  type: string;
  data?: Record<string, unknown>;
};

/** Narrows an untrusted `event.data` to the shape we act on. */
function asMainlineMessage(value: unknown): MainlineMessage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const type = (value as { type?: unknown }).type;
  if (typeof type !== 'string' || !type) return null;
  const data = (value as { data?: unknown }).data;
  return {
    type,
    data: data && typeof data === 'object' && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : undefined,
  };
}

export default function ScheduleServiceModal() {
  const router = useRouter();

  // `src` doubles as "has ever been opened": null → nothing rendered at all.
  const [src, setSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // Bumped only when a fresh flow is wanted, to force a NEW iframe element.
  const [frameKey, setFrameKey] = useState(0);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  /** Element that opened the modal — focus goes back to it on close. */
  const triggerRef = useRef<HTMLElement | null>(null);
  const startOverRef = useRef<HTMLButtonElement | null>(null);
  /** Mirrors `src` so `openModal` stays a stable, dependency-free callback. */
  const srcRef = useRef<string | null>(null);
  /** Set once the visitor completes the form, so the next open starts over. */
  const completedRef = useRef(false);
  /** Guards against a duplicated `jbp:form_submitted`. */
  const submitHandledRef = useRef(false);
  /**
   * True once a `jbp:form_step` has reported the LAST step of the flow.
   *
   * This is the anti-trap flag. The frame is deliberately kept alive across a
   * close so a half-finished flow resumes — but the only signal that would have
   * retired it was `jbp:form_submitted`, which Mainline does not send yet (see
   * the header). That made the reset condition unreachable: once the visitor
   * reached ANY end state — submitted, or a failed submission with Mainline's
   * own error banner showing — re-opening the popup handed them back the same
   * dead frame with no way out. Reported from QA on 2026-08-31.
   *
   * At the final step the flow is either done or errored, so the next OPEN gets
   * a fresh form. Note this only decides which URL to load; it never fires a
   * conversion, so it is not the "infer completion from step_index" the brief
   * (rightly) forbids — being wrong here costs a restart, not a phantom lead.
   */
  const reachedLastStepRef = useRef(false);

  /** Discards the current frame and loads a fresh form. */
  const restartFlow = useCallback(() => {
    completedRef.current = false;
    submitHandledRef.current = false;
    reachedLastStepRef.current = false;
    const url = buildScheduleUrl();
    srcRef.current = url;
    setSrc(url);
    setFrameKey((key) => key + 1);
  }, []);

  const openModal = useCallback(
    (trigger: HTMLElement | null) => {
      triggerRef.current = trigger;
      // Fresh frame on the first open, after a completed flow, or after the
      // visitor reached the last step (success or failure — see
      // reachedLastStepRef). Otherwise re-show the existing frame untouched so a
      // half-finished flow resumes where they left it.
      if (srcRef.current === null || completedRef.current || reachedLastStepRef.current) {
        restartFlow();
      }
      setOpen(true);
    },
    [restartFlow]
  );

  const closeModal = useCallback(() => {
    setOpen(false);
    const trigger = triggerRef.current;
    triggerRef.current = null;
    // Return focus where the visitor left it, after the panel has actually gone
    // to display:none — otherwise the browser can bounce focus straight back.
    // A 0 ms timeout, not requestAnimationFrame: rAF is suspended entirely in a
    // backgrounded/non-compositing tab, which would leave focus stranded.
    if (trigger && typeof trigger.focus === 'function') {
      setTimeout(() => trigger.focus(), 0);
    }
  }, []);

  /* ── Trigger delegation: click ──────────────────────────────────────────── */
  useEffect(() => {
    function onClick(event: MouseEvent) {
      // Let modified clicks and non-primary buttons through untouched.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const trigger = target?.closest?.(TRIGGER_SELECTOR) as HTMLElement | null;
      if (!trigger) return;
      event.preventDefault();
      openModal(trigger);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [openModal]);

  /* ── Trigger delegation: keyboard ───────────────────────────────────────────
   * The triggers are `role="button" tabIndex={0}` divs, which involve.me never
   * actually made keyboard-operable. Enter/Space here is a small accessibility
   * gain, not a redesign. Real `<button>` triggers already fire a synthetic
   * click, so they are skipped to avoid opening twice. */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
      if (event.defaultPrevented) return;
      const active = document.activeElement as HTMLElement | null;
      if (!active || !active.matches?.(TRIGGER_SELECTOR)) return;
      if (active.tagName === 'BUTTON' || active.tagName === 'A') return;
      event.preventDefault();
      openModal(active);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openModal]);

  /* ── Escape + Tab trap (only while open) ─────────────────────────────────────
   * The panel holds two focusables: the × button and the (cross-origin) iframe.
   * Focus INSIDE the frame is invisible to us and its keydowns never reach this
   * document, so the trap works at the boundary: Tab off the iframe wraps to ×,
   * Shift+Tab off × wraps to the iframe. That is the achievable trap for an
   * embedded third-party document. */
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== 'Tab') return;
      // Focusables in DOM order. The iframe is last, and focus INSIDE it is
      // invisible to us, so the trap works at the boundary: Tab off the frame
      // wraps to the first control, Shift+Tab off the first wraps to the frame.
      const ring: HTMLElement[] = [
        startOverRef.current,
        closeButtonRef.current,
        iframeRef.current,
      ].filter((el) => el != null) as HTMLElement[];
      if (ring.length < 2) return;
      const first = ring[0];
      const last = ring[ring.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closeModal]);

  /* ── Body scroll lock ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    // Compensate for the scrollbar the lock removes, so the page behind the
    // backdrop does not jump sideways when the modal opens.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      const current = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + scrollbarWidth}px`;
    }
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  /* ── Focus the close button on open ─────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    // Deferred by a tick: the panel has just been switched off display:none, and
    // a hidden element cannot take focus. `setTimeout` rather than rAF for the
    // same reason as in `closeModal` — rAF does not run in a hidden tab.
    const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [open, src]);

  /* ── postMessage from the Mainline frame ────────────────────────────────────
   * Origin check FIRST and unconditionally: any page on the internet can
   * postMessage to us, so this is the security boundary of the whole feature. */
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== MAINLINE_ORIGIN) return;
      const message = asMainlineMessage(event.data);
      if (!message) return;

      if (process.env.NODE_ENV !== 'production') {
        // Brief 169 D3: makes the missing `jbp:form_submitted` visible, so we
        // can tell the day Mainline ships it. Never rendered into the DOM.
        console.info('[schedule] message from Mainline:', message.type, message.data);
      }

      if (message.type === 'jbp:form_step') {
        const data = message.data ?? {};
        // Anti-trap bookkeeping — see reachedLastStepRef. Both values are
        // untrusted, so only a pair of finite numbers counts.
        const stepIndex = data.step_index;
        const totalSteps = data.total_steps;
        if (
          typeof stepIndex === 'number' &&
          typeof totalSteps === 'number' &&
          Number.isFinite(stepIndex) &&
          Number.isFinite(totalSteps) &&
          totalSteps > 0 &&
          stepIndex >= totalSteps
        ) {
          reachedLastStepRef.current = true;
        }
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'schedule_form_step', {
            step_index: data.step_index,
            step_id: data.step_id,
            form_slug: data.form_slug,
          });
        }
        return;
      }

      if (message.type === 'jbp:form_submitted') {
        if (submitHandledRef.current) return;
        submitHandledRef.current = true;
        // A completed flow must not be re-shown: the next open starts fresh.
        completedRef.current = true;
        closeModal();
        // Our own /thank-you pageview — the GA4 / Google Ads conversion, exactly
        // as involve.me used to trigger it.
        router.push('/thank-you');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [closeModal, router]);

  // Never opened → nothing in the DOM, no iframe, no Mainline request.
  if (src === null) return null;

  return (
    <div
      // display, not the `hidden` attribute: Tailwind's `.flex` utility comes
      // after Preflight's `[hidden]` rule and would win.
      style={{
        display: open ? 'flex' : 'none',
        zIndex: MODAL_Z_INDEX,
        backgroundColor: BACKDROP_COLOR,
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
      className="fixed inset-0 items-center justify-center"
      onClick={(event) => {
        // Backdrop only — a click that started inside the panel must not close.
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Schedule a service"
        // Mobile (<768px): full-screen sheet, square corners, iframe fills it.
        // Desktop: centred panel matched to the involve.me popup's footprint.
        className="relative h-full w-full overflow-hidden bg-white md:h-[min(90vh,760px)] md:w-[min(92vw,560px)] md:rounded-2xl md:shadow-[0_20px_60px_rgba(10,27,46,0.35)]"
      >
        {/* The escape hatch. Always rendered, never conditional: this is the ONE
            control that is guaranteed to get a visitor out of a stuck frame —
            Mainline's "Submission failed" state in particular, which we cannot
            detect, cannot scroll into view, and cannot clear from out here.
            Top-LEFT so it never crowds the × on a 375px sheet. */}
        <button
          ref={startOverRef}
          type="button"
          onClick={restartFlow}
          className="absolute left-2 top-2 z-10 flex h-11 items-center rounded-full bg-white/90 px-3 font-sans text-sm text-[#0A1B2E] underline decoration-[#0A1B2E]/30 underline-offset-2 transition-colors hover:bg-[#F9F3EC] hover:decoration-[#0A1B2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1560E6]"
        >
          Start over
        </button>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={closeModal}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#0A1B2E] transition-colors hover:bg-[#F9F3EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1560E6]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>

        <iframe
          key={frameKey}
          ref={iframeRef}
          src={src}
          title="Schedule a service"
          width="100%"
          height="100%"
          // No `sandbox`: it would break Mainline's own scripts.
          allow="clipboard-write"
          style={{ border: 0, display: 'block', width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
