'use client';

/**
 * Brief 156 — the /bathrooms landing page's single lead-capture modal, plus the
 * two button primitives every CTA on the page is built from.
 *
 * WHY A CONTEXT: the page has no <form>. Every "Schedule Your Free In-Home
 * Consultation" button — 7 of them, in the header, the hero and after five
 * sections — opens the SAME modal, which contains an iframe pointing at the
 * Bathrooms division's existing lead form. The CTAs are scattered across seven
 * sibling server components, so the open/close state lives in a context that
 * `page.tsx` wraps the whole page in.
 *
 * NOT WIRED TO /api/leads — deliberate (Brief 156 §6.4). Marketing's decision is
 * to ship the clone with the current iframe so the live lead flow is untouched;
 * a native form is separate work. Do not "finish" this by posting to our own
 * endpoint without that decision being made.
 *
 * The iframe is mounted only after the modal is first opened (`hasOpened`), so a
 * visitor who never clicks a CTA never pays for the third-party page load. Once
 * mounted it STAYS mounted (hidden) — remounting on every open would re-load the
 * form and throw away anything the visitor had already typed.
 */

import Image from 'next/image';
import styles from './bathrooms.module.css';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** The Bathrooms division's existing hosted lead form. */
const LEAD_FORM_SRC = 'https://i.jblantonplumbing.com/shower-remodel-ppc';

/** Bathrooms division call-tracking number. Display and dial string as the live page has them. */
export const BATHROOMS_PHONE_DISPLAY = '(224) 208-8949';
export const BATHROOMS_PHONE_HREF = 'tel:(224)208-8949';

export const CONSULTATION_CTA_LABEL = 'Schedule Your Free In-Home Consultation';

interface LeadModalContextValue {
  open: () => void;
}

const LeadModalContext = createContext<LeadModalContextValue | null>(null);

function useLeadModal(): LeadModalContextValue {
  const ctx = useContext(LeadModalContext);
  if (!ctx) {
    throw new Error('useLeadModal must be used inside <LeadModalProvider> (src/app/bathrooms/page.tsx)');
  }
  return ctx;
}

export function LeadModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // Latches true on the first open and never resets — see the note above.
  const [hasOpened, setHasOpened] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setHasOpened(true);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Hand focus back to whichever CTA opened the modal.
    lastFocusedRef.current?.focus?.();
  }, []);

  // Esc to close + body scroll lock. The lock restores the previous inline value
  // rather than clearing it, so it can't stomp on anything else that set it.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close]);

  return (
    <LeadModalContext.Provider value={{ open }}>
      {children}

      {hasOpened && (
        <div
          className="fixed inset-0 z-[100] items-center justify-center px-0 md:px-[30px]"
          style={{ display: isOpen ? 'flex' : 'none' }}
          aria-hidden={!isOpen}
        >
          {/* Backdrop: the page's warm ink at 50%. The source uses #00000080; pure
              black is not a brand value (Brief 156 §4.2). */}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 z-[1] cursor-pointer border-0"
            style={{ backgroundColor: 'rgba(23, 23, 20, 0.5)' }}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={CONSULTATION_CTA_LABEL}
            tabIndex={-1}
            className="relative z-[2] h-[90vh] w-full max-w-[900px] overflow-hidden bg-[#F9F3EC] outline-none md:rounded-[32px]"
          >
            <iframe
              src={LEAD_FORM_SRC}
              title={CONSULTATION_CTA_LABEL}
              className="h-full w-full border-none"
            />
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-5 top-5 z-[100] h-10 w-10 cursor-pointer border-0 bg-transparent p-0"
            >
              <Image
                src="/bathrooms/icons/close-cross.svg"
                alt=""
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10"
              />
            </button>
          </div>
        </div>
      )}
    </LeadModalContext.Provider>
  );
}

/**
 * Which of the three button variants in `bathrooms.module.css` to render.
 *
 *  header   — the site header pair.  14px/600 Inter,   padding 14px
 *  hero     — the offer card's pair. 16px/600 Jakarta, padding 26/30/21
 *  service  — every CTA band's pair. 16px/700 Jakarta, padding 18/30
 *
 * The weights and paddings differ between variants on the source and are not
 * interchangeable: at 700 the consultation label is wide enough to wrap inside
 * the hero card, and at 26/30/21 the CTA bands stand ~10px too tall.
 */
export type CtaVariant = 'header' | 'hero' | 'service';

const VARIANT_CLASS: Record<CtaVariant, string> = {
  header: styles.btnHeader,
  hero: styles.btnHero,
  service: styles.btnService,
};

/**
 * The blue "Schedule Your Free In-Home Consultation" button. A <button>, not an
 * <a> — it opens the modal and goes nowhere. (On the live page these are <a>
 * tags pointing at `#`, and one of them points at a non-existent `/services`;
 * see Brief 156 §9.3.)
 */
export function ConsultationCtaButton({
  variant = 'service',
  className = '',
}: {
  variant?: CtaVariant;
  className?: string;
}) {
  const { open } = useLeadModal();

  return (
    <button
      type="button"
      onClick={open}
      className={[styles.btnBase, styles.btnPrimary, VARIANT_CLASS[variant], className]
        .filter(Boolean)
        .join(' ')}
    >
      {CONSULTATION_CTA_LABEL}
    </button>
  );
}

/**
 * The grey phone button. A plain `tel:` link everywhere it appears — phone CTAs
 * are never modals (Brief 156 §6.4).
 */
export function PhoneCtaButton({
  variant = 'service',
  className = '',
}: {
  variant?: CtaVariant;
  className?: string;
}) {
  return (
    <a
      href={BATHROOMS_PHONE_HREF}
      className={[styles.btnBase, styles.btnSecondary, VARIANT_CLASS[variant], className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles.btnInner}>
        <Image
          src={variant === 'header' ? '/bathrooms/icons/phone-white.svg' : '/bathrooms/icons/phone-blue.svg'}
          alt=""
          width={20}
          height={20}
          unoptimized
          className="h-5 w-5 shrink-0"
        />
        {BATHROOMS_PHONE_DISPLAY}
      </span>
    </a>
  );
}
