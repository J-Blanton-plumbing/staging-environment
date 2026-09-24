/**
 * Brief 187 (C6) — "More {City} articles →" under a city page's article grid.
 *
 * Rendered ONLY when the city (or its region) has enough tagged articles to
 * replace the hand-picked defaults; a city page with no tagged articles never
 * mounts this, so its HTML is unchanged. Brand text-link style (brand-rules.md:
 * Nunito 16px, arrow, no underline until hover), styled by `.kh-more-link` in
 * globals.css.
 */
export default function CityMoreArticles({ more }: { more: { label: string; href: string } }) {
  return (
    <p className="kh-more-link-row">
      <a className="kh-more-link" href={more.href}>
        {more.label} &rarr;
      </a>
    </p>
  );
}
