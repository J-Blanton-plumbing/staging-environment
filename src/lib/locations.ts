export interface Location {
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  isCorporate?: boolean;
}

export const LOCATIONS: Location[] = [
  { slug: 'northbrook',           name: 'Northbrook (Corporate)',  address: '1945 Techny Road, #11',            city: 'Northbrook',         state: 'IL', zip: '60062', lat: 42.1278, lng: -87.8451, isCorporate: true },
  { slug: 'algonquin',            name: 'Algonquin',               address: '2390 Esplanade Dr #200f',          city: 'Algonquin',          state: 'IL', zip: '60102', lat: 42.1656, lng: -88.2942 },
  { slug: 'geneva',               name: 'Geneva',                  address: '115 Campbell St #201C',            city: 'Geneva',             state: 'IL', zip: '60134', lat: 41.8875, lng: -88.3054 },
  { slug: 'arlington-heights',    name: 'Arlington Heights',       address: '1204 East Central Road — Suite 2', city: 'Arlington Heights',  state: 'IL', zip: '60005', lat: 42.0884, lng: -87.9806 },
  { slug: 'chicago-lincoln-park', name: 'Chicago — Lincoln Park',  address: '800 W Diversey Pkwy',              city: 'Chicago',            state: 'IL', zip: '60614', lat: 41.9325, lng: -87.6437 },
  { slug: 'chicago-ravenswood',   name: 'Chicago — Ravenswood',    address: '5126 N Ravenswood Ave',            city: 'Chicago',            state: 'IL', zip: '60640', lat: 41.9745, lng: -87.6745 },
  { slug: 'elgin',                name: 'Elgin',                   address: '964 N McLean Blvd',                city: 'Elgin',              state: 'IL', zip: '60123', lat: 42.0354, lng: -88.2826 },
  { slug: 'elmhurst',             name: 'Elmhurst',                address: '130 S York St',                    city: 'Elmhurst',           state: 'IL', zip: '60126', lat: 41.8995, lng: -87.9403 },
  { slug: 'evanston',             name: 'Evanston',                address: '1603 Orrington Ave #600-1085',     city: 'Evanston',           state: 'IL', zip: '60201', lat: 42.0451, lng: -87.6877 },
  { slug: 'hinsdale',             name: 'Hinsdale',                address: '15 Spinning Wheel Road, 216A',     city: 'Hinsdale',           state: 'IL', zip: '60521', lat: 41.8009, lng: -87.9370 },
  { slug: 'mchenry',              name: 'McHenry',                 address: '3406 W Elm St',                    city: 'McHenry',            state: 'IL', zip: '60050', lat: 42.3334, lng: -88.2670 },
  { slug: 'naperville',           name: 'Naperville',              address: '200 S. Main Street',               city: 'Naperville',         state: 'IL', zip: '60540', lat: 41.7508, lng: -88.1535 },
  { slug: 'skokie',               name: 'Skokie',                  address: '8001 Lincoln Ave, Suite 301',      city: 'Skokie',             state: 'IL', zip: '60077', lat: 42.0334, lng: -87.7334 },
  { slug: 'joliet',               name: 'Joliet',                  address: 'Service area office',              city: 'Joliet',             state: 'IL', zip: '60431', lat: 41.5250, lng: -88.0817 },
];

export interface FooterOffice {
  /** Top-level location slug — footer links to `/{slug}` (routing brief makes these resolve). */
  slug: string;
  /** Lowercase display name; the footer renders it uppercase via CSS, matching the theme. */
  name: string;
  /** Full single-line address exactly as the live theme prints it. */
  address: string;
}

/**
 * Footer office list — mirrors the live theme's `footer.php` `$offices` array verbatim
 * (brief-06 §1/§2). Kept SEPARATE from LOCATIONS on purpose, because the footer reproduces
 * the live site exactly while LOCATIONS holds the clean canonical records used by the
 * /locations page + map. Known divergences preserved here to match live:
 *   - Elgin / Skokie carry ZIP+4 codes the canonical records omit.
 *   - ⚠️ Joliet uses the Ravenswood address (5126 N Ravenswood Ave, Chicago) — almost
 *     certainly a data bug on the live site. Reproduced as-is to match live for now;
 *     flagged for correction. Do NOT propagate this into the canonical LOCATIONS above.
 */
export const FOOTER_OFFICES: FooterOffice[] = [
  { slug: 'northbrook',           name: 'northbrook (corporate)', address: '1945 Techny Road, #11, Northbrook, IL 60062' },
  { slug: 'algonquin',            name: 'algonquin',              address: '2390 Esplanade Dr #200f, Algonquin, IL 60102' },
  { slug: 'geneva',               name: 'geneva',                 address: '115 Campbell St #201C, Geneva, IL 60134' },
  { slug: 'arlington-heights',    name: 'arlington heights',      address: '1204 East Central Road - Suite 2, Arlington Heights, IL 60005' },
  { slug: 'chicago-lincoln-park', name: 'chicago lincoln park',   address: '800 W Diversey Pkwy, Chicago, IL 60614' },
  { slug: 'chicago-ravenswood',   name: 'chicago ravenswood',     address: '5126 N Ravenswood Ave, Chicago, IL 60640' },
  { slug: 'elgin',                name: 'elgin',                  address: '964 N McLean Blvd, Elgin, IL 60123-2039' },
  { slug: 'elmhurst',             name: 'elmhurst',               address: '130 S York St, Elmhurst, IL 60126' },
  { slug: 'evanston',             name: 'evanston',               address: '1603 Orrington Ave #600-1085, Evanston, IL 60201' },
  { slug: 'hinsdale',             name: 'hinsdale',               address: '15 Spinning Wheel Road, 216A, Hinsdale, IL 60521' },
  { slug: 'mchenry',              name: 'mchenry',                address: '3406 W Elm St, Mchenry, IL 60050' },
  { slug: 'naperville',           name: 'naperville',             address: '200 S. Main Street, Naperville, IL 60540' },
  { slug: 'skokie',               name: 'skokie',                 address: '8001 Lincoln Ave, Suite 301 Skokie, IL 60077-3695' },
  // ⚠️ Live theme bug — Ravenswood address on the Joliet entry. Reproduced to match live.
  { slug: 'joliet',               name: 'joliet',                 address: '5126 N Ravenswood Ave, Chicago, IL 60640' },
];
