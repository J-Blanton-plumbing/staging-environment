'use client';

import { useEffect, useRef } from 'react';
import { LOCATIONS } from '@/lib/locations';
import { SITE } from '@/lib/site';

declare global {
  interface Window {
    L?: any;
  }
}

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

/**
 * Interactive Leaflet map with a red pin for every J. Blanton Plumbing office.
 * Auto-fits the viewport to all locations.
 */
export default function LocationsMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function ensureLeaflet(): Promise<any> {
      if (typeof window === 'undefined') return null;
      if (window.L) return window.L;

      // Inject CSS once
      if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = LEAFLET_CSS;
        document.head.appendChild(link);
      }

      // Inject JS once
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
        if (existing) {
          if (window.L) return resolve();
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject());
          return;
        }
        const script = document.createElement('script');
        script.src = LEAFLET_JS;
        script.async = true;
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject());
        document.head.appendChild(script);
      });

      return window.L;
    }

    (async () => {
      const L = await ensureLeaflet();
      if (cancelled || !L || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      // Red pin SVG icon
      const pinSvg = encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
          <path d="M16 0C7.16 0 0 7.16 0 16c0 11.5 16 26 16 26s16-14.5 16-26C32 7.16 24.84 0 16 0z" fill="#BC0E0E"/>
          <circle cx="16" cy="16" r="6" fill="#fff"/>
        </svg>`);
      const icon = L.icon({
        iconUrl: `data:image/svg+xml;charset=UTF-8,${pinSvg}`,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42],
      });

      // Plot every location
      LOCATIONS.forEach((loc) => {
        const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
        marker.bindPopup(
          `<div style="font-family:system-ui,sans-serif">
             <strong style="color:#0A1B2E;font-size:14px;">${loc.name}</strong><br/>
             <span style="color:#666;font-size:12px;">${loc.address}<br/>${loc.city}, ${loc.state} ${loc.zip}</span><br/>
             <a href="${SITE.phoneHref}" style="color:#BC0E0E;font-weight:bold;font-size:12px;">${SITE.phone}</a>
           </div>`
        );
      });

      // Default view frames the Chicagoland metro tightly (§13b) rather than
      // fitting all 13 pins, which zoomed out far enough to show Rockford/Beloit.
      map.setView([41.9, -87.85], 10);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      // `relative z-0 isolate` walls off Leaflet's high z-index panes/controls in
      // their own stacking context so the map can never paint over the fixed navbar (§13c).
      className="relative z-0 isolate w-full h-[460px] rounded-lg overflow-hidden bg-cream-100"
      aria-label="J. Blanton Plumbing locations map"
    />
  );
}
