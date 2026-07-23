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

// Brief 102 (Track C): the former FOOTER_OFFICES list (footer.php's $offices array)
// moved to the CMS as the single source of truth for every office address on the
// site — see CmsOffice / FALLBACK.offices in src/lib/cms/global-settings.ts, and
// Footer.tsx, which now reads settings.offices instead of this file.
