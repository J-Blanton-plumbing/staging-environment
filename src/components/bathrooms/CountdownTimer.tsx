'use client';

/**
 * Brief 156 — the hero offer's countdown.
 *
 * WHAT IT COUNTS DOWN TO: the next Monday at 00:00:00 LOCAL time, rolling
 * forward a full week when today is already Monday. It is an evergreen urgency
 * mechanic that resets every week, not a real deadline — that is what the live
 * Webflow page's inline script does and this reproduces it.
 *
 * HYDRATION: the server and the browser are in different places at different
 * moments, so a countdown computed during render is guaranteed to mismatch and
 * blow up hydration. This renders a stable all-zeroes placeholder on the first
 * paint (server AND client agree on it) and only starts computing inside
 * useEffect. Nothing time-dependent may move into the render body.
 *
 * When the target passes, the display simply parks at zero — the live page's
 * "EXPIRED" branch is commented out in its source, so there is no expiry text.
 */

import styles from './bathrooms.module.css';
import { useEffect, useState } from 'react';

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const ZERO: Remaining = { days: 0, hours: 0, minutes: 0, seconds: 0 };

/** Next Monday 00:00:00 local; if today is Monday, the Monday after this one. */
function nextMondayMidnight(from: Date): Date {
  const target = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = target.getDay(); // 0 = Sunday, 1 = Monday
  const daysUntilMonday = (8 - day) % 7 || 7;
  target.setDate(target.getDate() + daysUntilMonday);
  return target;
}

function remainingUntil(target: Date, now: Date): Remaining {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return ZERO;
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const UNITS: ReadonlyArray<[keyof Remaining, string]> = [
  ['days', 'Days'],
  ['hours', 'Hours'],
  ['minutes', 'Minutes'],
  ['seconds', 'Seconds'],
];

export default function CountdownTimer() {
  const [remaining, setRemaining] = useState<Remaining>(ZERO);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setRemaining(remainingUntil(nextMondayMidnight(now), now));
    };
    tick();
    setStarted(true);
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.countdown}>
      {UNITS.map(([key, label]) => (
        <div key={key} className={styles.countdownItem}>
          <div
            className={styles.countdownNumber}
            /* Until the first tick lands the value is a placeholder, not data. */
            aria-hidden={!started}
          >
            {remaining[key]}
          </div>
          <div className={styles.countdownLabel}>{label}</div>
        </div>
      ))}
    </div>
  );
}
