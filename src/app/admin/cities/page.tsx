'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CityRow {
  slug: string;
  cityType: string;
  updatedAt: string | null;
}

interface CityService {
  city_slug: string;
  service_slug: string;
  updatedAt: string | null;
}

function toDisplayName(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function CityServicesList({ citySlug }: { citySlug: string }) {
  const [services, setServices] = useState<CityService[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/cms/city-services/${citySlug}`)
      .then(r => r.json())
      .then(data => {
        setServices(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [citySlug]);

  if (!loaded) return null;

  return (
    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(10,27,46,0.1)' }}>
      <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: '12px', color: 'rgba(10,27,46,0.6)', margin: '0 0 0.4rem', fontWeight: 600 }}>
        City Services:
      </p>
      {services.length === 0 ? (
        <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: 'rgba(10,27,46,0.4)', margin: 0 }}>
          No services yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {services.map(svc => (
            <Link
              key={svc.service_slug}
              href={`/admin/city-service/${citySlug}/${svc.service_slug}`}
              style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: '13px',
                color: '#1560E6',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
            >
              {toDisplayName(svc.service_slug)} →
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CitiesAdminPage() {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading');

  useEffect(() => {
    fetch('/api/cms/cities')
      .then(r => r.json())
      .then(data => {
        setCities(data);
        setStatus('done');
      })
      .catch(() => setStatus('error'));
  }, []);

  const filtered = cities.filter(c =>
    c.slug.includes(query.toLowerCase()) ||
    toDisplayName(c.slug).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main style={{ padding: '2rem', maxWidth: '900px' }}>
      <h1 style={{ fontFamily: 'Industry, sans-serif', color: '#0A1B2E', marginBottom: '0.25rem' }}>
        Cities
      </h1>
      <p style={{ color: '#5a6a7a', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {status === 'done' ? `${cities.length} cities in the database` : ' '}
      </p>

      <input
        type="search"
        placeholder="Search cities…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '360px',
          padding: '0.5rem 0.75rem',
          border: '1px solid rgba(10,27,46,0.2)',
          borderRadius: '6px',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          fontFamily: 'inherit',
          color: '#0A1B2E',
          boxSizing: 'border-box',
        }}
      />

      {status === 'loading' && <p style={{ color: '#5a6a7a' }}>Loading…</p>}
      {status === 'error' && <p style={{ color: '#BC0E0E' }}>Failed to load cities. Check database connection.</p>}

      {status === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.length === 0 && (
            <p style={{ color: '#5a6a7a' }}>No cities match &quot;{query}&quot;</p>
          )}
          {filtered.map(city => (
            <div
              key={city.slug}
              style={{
                background: '#F9F3EC',
                border: '1px solid rgba(10,27,46,0.1)',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
              }}
            >
              {/* City header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#0A1B2E', fontSize: '0.95rem' }}>
                    {toDisplayName(city.slug)}
                  </span>
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: '#5a6a7a', background: 'rgba(10,27,46,0.07)', borderRadius: '4px', padding: '0.1rem 0.4rem' }}>
                    {city.cityType}
                  </span>
                  {city.updatedAt && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                      Updated {new Date(city.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Link
                  href={`/admin/city/${city.slug}`}
                  style={{ color: '#BC0E0E', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
                >
                  Edit →
                </Link>
              </div>

              {/* City services sub-list */}
              <CityServicesList citySlug={city.slug} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
