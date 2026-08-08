'use client';

import { useEffect, useState } from 'react';
import { WC_DEBUG_BUILD } from './WhatConvertsRouteSwap';

/**
 * On-page WhatConverts diagnostic, rendered ONLY when the URL carries
 * `?wcdebug=1`. Normal visitors never see it and it costs them nothing beyond a
 * mounted component that returns null.
 *
 * WHY THIS EXISTS. A call button was reported as dialling the default number on a
 * real iOS device while the same element measured correct in every desktop
 * browser check — including a simulated revert immediately before the click. That
 * gap is not diagnosable remotely: there is no way to tell "the fix is not
 * deployed to that device", "it is deployed but the mapping is missing", and "it
 * is deployed, has a mapping, and something still reverts the href" apart from
 * one another. Guessing between those cost several wrong conclusions, each
 * asserted with more confidence than the evidence supported.
 *
 * So this reports the state that actually distinguishes them, on the device in
 * question, in a form that can be screenshotted:
 *   - `build` — is the device running the shipped build or a cached one? This is
 *     the first thing to check; a stale bundle explains most "still broken".
 *   - `passes` / `repairs` — did the repair code run at all, and did it change
 *     anything? Zero passes means the component never mounted.
 *   - `mapping` — did WhatConverts assign a pool number? Without one there is
 *     nothing to swap to and the default number is correct behaviour, not a bug.
 *   - every `tel:` anchor's live href AND visible text, since the failure mode is
 *     precisely those two disagreeing.
 *
 * Read live from the DOM on an interval rather than from React state, because the
 * whole question is what the DOM holds *now*, after anything else has touched it.
 */

interface AnchorRow {
  label: string;
  href: string;
  text: string;
  mismatch: boolean;
}

export default function WhatConvertsDebug() {
  const [enabled, setEnabled] = useState(false);
  const [rows, setRows] = useState<AnchorRow[]>([]);
  const [meta, setMeta] = useState<Record<string, string>>({});

  useEffect(() => {
    // Read the flag from location directly rather than useSearchParams, which
    // would force a Suspense boundary on statically rendered routes.
    if (!/[?&]wcdebug=1(&|$)/.test(window.location.search)) return;
    setEnabled(true);

    const digits = (value: string) => value.replace(/\D/g, '');

    const read = () => {
      const diag =
        ((window as unknown as Record<string, unknown>).__wc as Record<string, unknown>) ??
        null;
      const cookie =
        document.cookie.match(/(?:^|;\s*)wc_swap=([^;]*)/)?.[1] ?? '(none)';
      const parts = decodeURIComponent(cookie).split('+..+');
      const tracking = digits(parts[0] ?? '');
      const original = digits(parts[1] ?? '');

      setMeta({
        build: WC_DEBUG_BUILD,
        repairCodeRan: diag ? 'yes' : 'NO — component never mounted',
        buildOnDevice: (diag?.build as string) ?? '(unknown)',
        passes: String(diag?.passes ?? 0),
        repairs: String(diag?.repairs ?? 0),
        scriptInjections: String(diag?.injections ?? 0),
        vendorScriptLoaded: String(
          performance
            .getEntriesByType('resource')
            .some((e) => /\/\d+\.js$/.test(e.name) && /ksrndk|iconnode/.test(e.name)),
        ),
        wcLeads: typeof (window as unknown as Record<string, unknown>).$wc_leads,
        mapping: tracking && original ? `${original} -> ${tracking}` : '(no pool number assigned)',
      });

      setRows(
        Array.from(document.querySelectorAll('a[href^="tel:"]')).map((a) => {
          const href = a.getAttribute('href') ?? '';
          const text = (a.textContent ?? '').trim();
          return {
            label: a.getAttribute('aria-label') || text.slice(0, 18) || '(icon only)',
            href,
            text: text || '(no text)',
            // The reported failure: visible text swapped, href not.
            mismatch: Boolean(
              original && digits(href).includes(original),
            ),
          };
        }),
      );
    };

    read();
    const timer = window.setInterval(read, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 'auto 8px 8px 8px',
        zIndex: 2147483647,
        maxHeight: '55vh',
        overflow: 'auto',
        background: '#0A1B2E',
        color: '#F9F3EC',
        font: '12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
        padding: '10px 12px',
        borderRadius: 8,
        border: '2px solid #BC0E0E',
        boxShadow: '0 4px 24px rgba(0,0,0,.5)',
      }}
    >
      <strong style={{ color: '#BC0E0E' }}>WhatConverts debug</strong>
      {Object.entries(meta).map(([k, v]) => (
        <div key={k}>
          <span style={{ opacity: 0.7 }}>{k}:</span> {v}
        </div>
      ))}
      <div style={{ marginTop: 8, borderTop: '1px solid rgba(249,243,236,.25)', paddingTop: 6 }}>
        <strong>{rows.length} tel: link(s)</strong>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              marginTop: 5,
              // Red flags the case that matters: an href still on the original.
              color: r.mismatch ? '#ff8a8a' : '#F9F3EC',
            }}
          >
            {r.mismatch ? '✗ ' : '✓ '}
            <span style={{ opacity: 0.7 }}>{r.label}</span>
            <br />
            dials: <strong>{r.href}</strong>
            <br />
            shows: {r.text}
          </div>
        ))}
      </div>
    </div>
  );
}
