'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  fontFamily: 'Nunito, sans-serif',
  fontSize: '13px',
  color: '#0A1B2E',
  marginBottom: '0.25rem',
  fontWeight: 600,
};

const INPUT_STYLES: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  color: '#0A1B2E',
  boxSizing: 'border-box',
};

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
          background: '#fff',
          borderRadius: '8px',
          padding: '24px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <h2
          style={{
            margin: '0 0 1.5rem',
            fontFamily: 'Industry, sans-serif',
            fontWeight: 600,
            fontSize: '20px',
            color: '#0A1B2E',
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
                  style={{ ...INPUT_STYLES, marginBottom: '0.35rem' }}
                />
                {citiesLoading ? (
                  <p style={{ fontSize: '13px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif' }}>Loading cities…</p>
                ) : (
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    size={Math.min(filteredCities.length, 6) || 3}
                    style={{ ...INPUT_STYLES, fontFamily: 'Nunito, sans-serif', fontSize: '13px' }}
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
                    <p style={{ fontSize: '13px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif' }}>Loading services…</p>
                  ) : (
                    <select
                      value={selectedService}
                      onChange={e => setSelectedService(e.target.value)}
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
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '6px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    color: '#1e40af',
                    fontFamily: 'Nunito, sans-serif',
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
                style={{
                  ...INPUT_STYLES,
                  borderColor: clientSlugError ? '#BC0E0E' : '#d1d5db',
                }}
              />
              {clientSlugError && (
                <p style={{ color: '#BC0E0E', fontSize: '12px', margin: '0.25rem 0 0', fontFamily: 'Nunito, sans-serif' }}>
                  {clientSlugError}
                </p>
              )}
            </div>
          )}

          {apiError && (
            <p style={{ color: '#BC0E0E', fontSize: '13px', margin: '0 0 0.75rem', fontFamily: 'Nunito, sans-serif' }}>
              {apiError}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#0A1B2E', fontSize: '13px', fontFamily: 'Nunito, sans-serif',
                padding: '0.5rem 0.75rem',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit()}
              style={{
                background: '#BC0E0E', border: 'none', borderRadius: '4px',
                padding: '0.5rem 1.25rem', color: '#F9F3EC',
                fontFamily: 'Industry, sans-serif', fontWeight: 600, fontSize: '14px',
                cursor: !canSubmit() ? 'not-allowed' : 'pointer',
                opacity: !canSubmit() ? 0.6 : 1,
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
