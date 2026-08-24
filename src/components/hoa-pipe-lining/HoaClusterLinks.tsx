/**
 * Brief 127 §5 — the shared site `<Footer>` doesn't carry the HOA cluster's
 * "Explore HOA pipe lining" cross-links (Pillar ↔ Team ↔ Reserve Studies) that
 * used to live inside each page's own custom `<footer class="jbp-footer">`.
 * Per the brief's default ("keep the slim strip"), this renders that same
 * three-way link as a slim one-line strip at the very bottom of the page
 * body — just above the shared Footer.
 *
 * Restyled from the original (Brief 125/126 had it in white text on the red
 * jbp-footer background). It now sits directly on the page's own cream
 * background instead of inside a red footer, so it uses dark text + the
 * brand link color instead — same content and position in the linking
 * structure, brand colors only (Cream/Midnight/Carmine), no new colors.
 */

const PAGES = [
  { slug: 'pillar', href: '/hoa-pipe-lining', label: 'Pipe Lining Overview' },
  { slug: 'reserve-studies', href: '/hoa-pipe-lining/reserve-studies', label: 'Reserve Studies' },
  { slug: 'team', href: '/hoa-pipe-lining/team', label: 'Meet the Team' },
] as const;

export default function HoaClusterLinks({ current }: { current: 'pillar' | 'team' | 'reserve-studies' }) {
  return (
    <div
      style={{
        background: '#F9F3EC',
        borderTop: '1px solid rgba(10,27,46,0.12)',
        padding: '18px 64px',
        fontFamily: "'Nunito', system-ui, sans-serif",
        fontSize: '13.5px',
        color: '#0A1B2E',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: "'Industry', 'Arial', sans-serif",
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          fontSize: '12px',
          color: '#BC0E0E',
          marginRight: '6px',
        }}
      >
        Explore HOA pipe lining:
      </span>
      {PAGES.map((page, i) => (
        <span key={page.slug}>
          {i > 0 && <span style={{ margin: '0 8px', color: 'rgba(10,27,46,0.4)' }}>&middot;</span>}
          {page.slug === current ? (
            <span style={{ fontWeight: 700, color: '#0A1B2E' }}>{page.label}</span>
          ) : (
            <a href={page.href} style={{ color: '#BC0E0E', textDecoration: 'underline' }}>
              {page.label}
            </a>
          )}
        </span>
      ))}
    </div>
  );
}
