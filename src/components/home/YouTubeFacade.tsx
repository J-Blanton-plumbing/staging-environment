'use client';

import { useState } from 'react';

/**
 * Homepage 2026 (Brief 220, B6) — click-to-load YouTube (`.yt-lite`, the prototype's facade).
 *
 * Until the visitor presses play there is no YouTube iframe, script or request: the button shows the
 * video's thumbnail as a CSS background (i.ytimg.com, a plain image) and the play mark. Pressing it
 * swaps in the youtube-nocookie.com embed with autoplay, as the prototype's script did.
 */
export default function YouTubeFacade({ videoId, title, playLabel }: { videoId: string; title: string; playLabel: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      className="yt-lite"
      type="button"
      aria-label={playLabel}
      style={{ backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)` }}
      onClick={() => setPlaying(true)}
    >
      <span className="yt-play">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="yt-title">{title}</span>
      {playing && (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}
    </button>
  );
}
