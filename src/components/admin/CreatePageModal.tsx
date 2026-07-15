'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

interface Props {
  onClose: () => void;
}

// Fix 6: Emergency Plumbing and Standalone Pages removed — edit only via direct URLs.
// Fix 2 & 7: sub-service and article are now creatable (removed from MANAGED_INFO).
// Fix 4 & 5: city-service flows replaced with guided creation forms.
const PAGE_TYPES = [
  { value: 'service-category',       label: 'Service Category' },
  { value: 'sub-service',            label: 'Sub-service' },
  { value: 'city-coverage',          label: 'City — Coverage Area' },
  { value: 'city-local',             label: 'City — Local Office' },
  { value: 'city-service-standard',  label: 'City-Service' },
  { value: 'city-service-emergency', label: 'City-Service (Emergency)' },
  { value: 'article',                label: 'Article' },
];

const SLUG_RE = /^[a-z0-9-]+$/;

function slugError(slug: string): string {
  if (!slug) return '';
  if (/[A-Z]/.test(slug)) return 'Slug must be lowercase.';
  if (/\s/.test(slug)) return 'Slug must not contain spaces.';
  if (!SLUG_RE.test(slug)) return 'Slug may only contain lowercase letters, numbers, and hyphens.';
  return '';
}

// Types that need a title field in addition to slug
const NEEDS_TITLE = new Set(['service-category', 'sub-service', 'article', 'city-coverage', 'city-local']);
// Types driven by dropdowns (no slug input)
const DROPDOWN_TYPES = new Set(['city-service-standard', 'city-service-emergency']);

interface CityOption { slug: string; cityType: string }
interface ServiceOption { slug: string; title: string }

const LABEL_STYLES: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '13px',
  color: ADMIN_COLORS.onSurface,
  marginBottom: '0.25rem',
  fontWeight: 600,
};

const INPUT_STYLES: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  background: ADMIN_COLORS.surfaceContainerLow,
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
  borderRadius: '0.5rem',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  color: ADMIN_COLORS.onSurface,
  boxSizing: 'border-box',
};

const FOCUS_RING_STYLE = `
  .admin-cpm-field:focus { outline: none; box-shadow: 0 0 0 1px ${ADMIN_COLORS.primary}66; }
  .admin-cpm-cta:hover:not(:disabled) { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
`;

export default function CreatePageModal({ onClose }: Props) {
  const router = useRouter();
  const [pageType, setPageType] = useState('service-category');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // Dropdown state for city-service and city-emergency flows
  const [cities, setCities] = useState<CityOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [citySearch, setCitySearch] = useState('');

  const isDropdownType = DROPDOWN_TYPES.has(pageType);
  const needsTitle = NEEDS_TITLE.has(pageType);
  const clientSlugError = slugError(slug);

  // Fetch cities when a dropdown type is selected
  useEffect(() => {
    if (!isDropdownType) return;
    setCitiesLoading(true);
    fetch('/api/cms/cities')
      .then(r => r.json())
      .then((data: CityOption[]) => {
        setCities(Array.isArray(data) ? data : []);
      })
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, [isDropdownType]);

  // Fetch services when city-service-standard is selected
  useEffect(() => {
    if (pageType !== 'city-service-standard') return;
    setServicesLoading(true);
    fetch('/api/cms/sub-services')
      .then(r => r.json())
      .then((data: ServiceOption[]) => {
        setServices(Array.isArray(data) ? data : []);
      })
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false));
  }, [pageType]);

  function handleTypeChange(newType: string) {
    setPageType(newType);
    setSlug('');
    setTitle('');
    setApiError('');
    setSelectedCity('');
    setSelectedService('');
    setCitySearch('');
  }

  const filteredCities = citySearch
    ? cities.filter(c => c.slug.includes(citySearch.toLowerCase()))
    : cities;

  function isDropdownReady(): boolean {
    if (!isDropdownType) return false;
    if (!selectedCity) return false;
    if (pageType === 'city-service-standard' && !selectedService) return false;
    return true;
  }

  function canSubmit(): boolean {
    if (submitting) return false;
    if (isDropdownType) return isDropdownReady();
    if (clientSlugError || !slug) return false;
    if (needsTitle && !title.trim()) return false;
    return true;
  }

  // Smart fill preview label
  function smartFillPreview(): string {
    if (!selectedCity || !selectedService) return '';
    const city = selectedCity.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const svc = selectedService.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `${svc} in ${city}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit()) return;
    setSubmitting(true);
    setApiError('');

    try {
      let payload: Record<string, string>;
      if (pageType === 'city-service-standard') {
        payload = { template: pageType, citySlug: selectedCity, serviceSlug: selectedService };
      } else if (pageType === 'city-service-emergency') {
        payload = { template: pageType, citySlug: selectedCity };
      } else {
        payload = { template: pageType, slug, title };
      }

      const res = await fetch('/api/cms/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create page');
      onClose();
      router.push(json.redirectUrl);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to create page');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: ADMIN_COLORS.surfaceContainerLow,
          borderRadius: '1.5rem',
          padding: '24px',
          width: '100%',
          maxWidth: '480px',
          border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <style>{FOCUS_RING_STYLE}</style>
        <h2
          style={{
            margin: '0 0 1.5rem',
            fontFamily: 'var(--font-outfit), system-ui, sans-serif',
            fontWeight: 700,
            fontSize: '1.25rem',
            color: ADMIN_COLORS.onSurface,
          }}
        >
          Create New Page
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Page Type */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={LABEL_STYLES}>Page Type</label>
            <select
              value={pageType}
              onChange={e => handleTypeChange(e.target.value)}
              className="admin-cpm-field"
              style={INPUT_STYLES}
            >
              {PAGE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Fix 4 & 5: City-Service and City-Emergency dropdown flows */}
          {isDropdownType && (
            <>
              {/* City search + select */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={LABEL_STYLES}>City</label>
                <input
                  type="text"
                  placeholder="Filter cities…"
                  value={citySearch}
                  onChange={e => { setCitySearch(e.target.value); setSelectedCity(''); }}
                  className="admin-cpm-field"
                  style={{ ...INPUT_STYLES, marginBottom: '0.35rem' }}
                />
                {citiesLoading ? (
                  <p style={{ fontSize: '13px', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>Loading cities…</p>
                ) : (
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    size={Math.min(filteredCities.length, 6) || 3}
                    className="admin-cpm-field"
                    style={{ ...INPUT_STYLES, fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '13px' }}
                  >
                    <option value="">— select a city —</option>
                    {filteredCities.map(c => (
                      <option key={c.slug} value={c.slug}>{c.slug}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Service dropdown — city-service-standard only */}
              {pageType === 'city-service-standard' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={LABEL_STYLES}>Service</label>
                  {servicesLoading ? (
                    <p style={{ fontSize: '13px', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>Loading services…</p>
                  ) : (
                    <select
                      value={selectedService}
                      onChange={e => setSelectedService(e.target.value)}
                      className="admin-cpm-field"
                      style={INPUT_STYLES}
                    >
                      <option value="">— select a service —</option>
                      {services.map(s => (
                        <option key={s.slug} value={s.slug}>{s.title || s.slug}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Smart Fill preview */}
              {isDropdownReady() && (
                <div
                  style={{
                    background: `${ADMIN_COLORS.cerulean}22`,
                    border: `1px solid ${ADMIN_COLORS.cerulean}55`,
                    borderRadius: '0.75rem',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    color: ADMIN_COLORS.onSurface,
                    fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                  }}
                >
                  <strong>Smart Fill ready.</strong>{' '}
                  {pageType === 'city-service-standard'
                    ? `Will seed "${smartFillPreview()}" from the parent service page.`
                    : `Will seed emergency plumbing defaults for ${selectedCity.replace(/-/g, ' ')}.`}
                </div>
              )}
            </>
          )}

          {/* Fix 2 & 7: Title field for sub-service and article */}
          {!isDropdownType && needsTitle && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={LABEL_STYLES}>
                {pageType === 'article' ? 'Article Title' : pageType === 'city-coverage' || pageType === 'city-local' ? 'City Name' : 'Page Title'}
              </label>
              <input
                type="text"
                placeholder={pageType === 'article' ? 'e.g. How to Fix a Leaky Faucet' : pageType === 'city-coverage' || pageType === 'city-local' ? 'e.g. Evanston' : 'e.g. Bathroom Plumbing'}
                value={title}
                onChange={e => { setTitle(e.target.value); setApiError(''); }}
                className="admin-cpm-field"
                style={INPUT_STYLES}
              />
            </div>
          )}

          {/* Slug field — standard creatable types */}
          {!isDropdownType && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={LABEL_STYLES}>Slug</label>
              <input
                type="text"
                placeholder="e.g. my-new-page"
                value={slug}
                onChange={e => { setSlug(e.target.value); setApiError(''); }}
                className="admin-cpm-field"
                style={{
                  ...INPUT_STYLES,
                  borderColor: clientSlugError ? ADMIN_COLORS.error : `${ADMIN_COLORS.outlineVariant}66`,
                }}
              />
              {clientSlugError && (
                <p style={{ color: ADMIN_COLORS.error, fontSize: '12px', margin: '0.25rem 0 0', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
                  {clientSlugError}
                </p>
              )}
            </div>
          )}

          {apiError && (
            <p style={{ color: ADMIN_COLORS.error, fontSize: '13px', margin: '0 0 0.75rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
              {apiError}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: ADMIN_COLORS.onSurfaceVariant, fontSize: '13px', fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                padding: '0.5rem 0.75rem',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit()}
              className="admin-cpm-cta"
              style={{
                background: ADMIN_COLORS.cerulean, border: 'none', borderRadius: '9999px',
                padding: '0.5rem 1.25rem', color: '#fff',
                fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 600, fontSize: '14px',
                cursor: !canSubmit() ? 'not-allowed' : 'pointer',
                opacity: !canSubmit() ? 0.6 : 1,
                boxShadow: ADMIN_SHADOWS.md,
                transition: 'box-shadow 0.2s ease, filter 0.2s ease',
              }}
            >
              {submitting ? 'Creating…' : 'Create Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
