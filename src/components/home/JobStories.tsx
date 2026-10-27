'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import type { H26Job } from '@/lib/cms/home-2026-content';

/**
 * Homepage 2026 (Brief 220, B5) — "Real Jobs, Real Reviews": a tablist of recent jobs, each with the
 * customer's Google review and a photo gallery from that job. Replaces the Elfsight reviews widget.
 *
 * Ported from the prototype's inline script to React state, with the same markup and classes:
 *   - ARIA tablist: arrow keys move (and focus) the tab, `aria-selected`, roving `tabindex`
 *   - mobile (≤ 700px CSS): previous | current | next tabs (`is-prev` / `is-next`, after `is-ready`)
 *   - gallery: prev / next arrows (labelled), thumbnails with `aria-current`, "n / N" counter
 *
 * Server-rendered: every review is in the HTML, and with JS off the first job shows (the others are
 * `hidden`). Loading: no image here is fetched before the section nears the viewport
 * (`loading="lazy"`), and a hidden job's photos are not in the DOM at all until its tab is opened.
 * Thumbnails request a thumbnail-width file and the main photo one sized to its slot (next/image
 * `sizes`), never the full 1200px original.
 *
 * No Review / AggregateRating schema — on purpose (self-serving reviews).
 */

const MAIN_SIZES = '(max-width: 1000px) calc(100vw - 56px), 760px';
const THUMB_SIZES = '(max-width: 700px) 28vw, 120px';

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

function Gallery({ job, photosLabel }: { job: H26Job; photosLabel: string }) {
  const [c, setC] = useState(0);
  const n = job.photos.length;
  const wrap = (i: number) => ((i % n) + n) % n;
  const pic = (i: number) => setC(wrap(i));
  const cur = job.photos[c];
  return (
    <div className="job-media">
      <figure className="job-stage">
        <Image className="job-main" src={cur.image} width={1200} height={800} alt={cur.alt} sizes={MAIN_SIZES} loading="lazy" />
        <figcaption className="job-count">
          <span className="job-count-n">{c + 1}</span> / {n} {photosLabel}
        </figcaption>
        <button type="button" className="job-arrow job-arrow--prev" aria-label="Previous photo" onClick={() => setC((x) => wrap(x - 1))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button type="button" className="job-arrow job-arrow--next" aria-label="Next photo" onClick={() => setC((x) => wrap(x + 1))}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </figure>
      <ul className="job-thumbs" aria-label="Photos from this job">
        {job.photos.map((p, k) => (
          <li key={p.id}>
            <button
              type="button"
              className={`job-thumb${k === c ? ' is-active' : ''}`}
              aria-label={`Show photo ${k + 1} of ${n}`}
              aria-current={k === c ? 'true' : undefined}
              onClick={() => pic(k)}
            >
              <Image src={p.image} width={1200} height={800} alt="" sizes={THUMB_SIZES} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function JobStories({
  jobs,
  label,
  photosLabel,
  readOnGoogle,
}: {
  jobs: H26Job[];
  label: string;
  photosLabel: string;
  readOnGoogle: string;
}) {
  const [cur, setCur] = useState(0);
  const [ready, setReady] = useState(false);
  // Jobs whose tab has been opened: only those panels carry their photos.
  const [opened, setOpened] = useState<ReadonlySet<number>>(() => new Set([0]));
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const n = jobs.length;

  useEffect(() => setReady(true), []);

  const show = useCallback(
    (i: number, focus = false) => {
      const next = ((i % n) + n) % n;
      setCur(next);
      setOpened((o) => (o.has(next) ? o : new Set([...Array.from(o), next])));
      if (focus) tabRefs.current[next]?.focus();
    },
    [n]
  );

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1, true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1, true); }
    if (e.key === 'Home') { e.preventDefault(); show(0, true); }
    if (e.key === 'End') { e.preventDefault(); show(n - 1, true); }
  };

  const pv = (cur - 1 + n) % n;
  const nx = (cur + 1) % n;

  return (
    <div className="jobs" data-jobs="">
      <div className={`job-tabs${ready ? ' is-ready' : ''}`} role="tablist" aria-label={label}>
        {jobs.map((j, k) => {
          const on = k === cur;
          const cls = ['job-tab', ready && n > 1 && k === pv && !on ? 'is-prev' : '', ready && n > 1 && k === nx && !on ? 'is-next' : ''].filter(Boolean).join(' ');
          return (
            <button
              key={j.id}
              ref={(el) => { tabRefs.current[k] = el; }}
              type="button"
              className={cls}
              role="tab"
              id={`jobtab-${j.id}`}
              aria-controls={`job-${j.id}`}
              aria-selected={on}
              tabIndex={on ? 0 : -1}
              onClick={() => show(k)}
              onKeyDown={onKey}
            >
              <strong>{j.tab_title}</strong>
              {j.tab_city && <span>{j.tab_city}</span>}
            </button>
          );
        })}
      </div>
      {jobs.map((j, k) => (
        <div className="job-panel" id={`job-${j.id}`} role="tabpanel" aria-labelledby={`jobtab-${j.id}`} hidden={k !== cur} key={j.id}>
          {opened.has(k) ? <Gallery job={j} photosLabel={photosLabel} /> : <div className="job-media" />}
          <div className="job-info">
            <h3 className="t-h4 job-title">{j.title}</h3>
            {j.location && (
              <p className="job-meta">
                <PinIcon />
                <span>{j.location}</span>
              </p>
            )}
            <div aria-label={`${j.stars} out of 5 stars`} className="pv-stars h26-m0" role="img">
              {'★'.repeat(j.stars)}
            </div>
            <blockquote className="job-quote">“{j.quote}”</blockquote>
            <div className="review-author">
              <span className="review-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F9F3EC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <div>
                <strong className="t-label h26-author">{j.author}</strong>
                <div className="t-caption pv-cap">{j.author_label}</div>
                {j.review_url && (
                  <a className="hp-rev-link" href={j.review_url} target="_blank" rel="noreferrer">
                    {readOnGoogle}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
