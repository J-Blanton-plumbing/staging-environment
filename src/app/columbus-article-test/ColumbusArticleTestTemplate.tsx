import Link from 'next/link';
import { OHIO_GROUPS } from '@/lib/content/locations-regions';
import ColumbusArticleTestClient from './ColumbusArticleTestClient';

/**
 * The Columbus launch article (Brief 185) — a faithful port of the approved v3
 * prototype's ARTICLE ONLY:
 *   masthead → TOC | article | rail → related articles → mobile call bar.
 *
 * Dropped on purpose (Brief 185, hard rule 1): the prototype's `.jbp-header`,
 * its `.jbp-drawer-overlay` drawer, its `.jbp-footer` and the drawer script. The
 * live Navbar and Footer from SiteShell replace them.
 *
 * Forced structural changes, each visually identical to `01_approved`:
 *   • the masthead's outer `<header>` is a `<div>` — it must not read as a
 *     second site header;
 *   • the article column's `<main id="content">` is an `<article id="content">`
 *     — SiteShell already renders the page's one `<main>`;
 *   • `document.documentElement.classList.add('js')` became `data-js` on the
 *     `.cat-root` wrapper (set by the client component), so nothing is added to
 *     `<html>` sitewide;
 *   • every `https://jblantonplumbing.com/...` link is a relative route.
 *
 * Copy is inline here by the brief's explicit allowance (a test page with no CMS
 * shape yet). The prototype's HTML wins over `03_content/` wherever they differ.
 * The two `<footer>` elements are blockquote attributions, scoped to their
 * quotes — they are not page footers and not landmarks.
 *
 * PHONE: the Columbus office, `614-547-6516` → `tel:+16145476516`, everywhere in
 * the article (Marketing, 2026-09-23). Deliberately NOT the global-settings phone.
 */

const TEL_HREF = 'tel:+16145476516';
const TEL_DISPLAY = '614-547-6516';

const TOC_ITEMS: { id: string; label: string }[] = [
  { id: 'why', label: 'Why Central Ohio' },
  { id: 'good-call', label: 'What “Make a Good Call” means' },
  { id: 'location', label: "Where we're located" },
  { id: 'services', label: 'Services in Central Ohio' },
  { id: 'same', label: 'What stays the same' },
  { id: 'community', label: 'More than a new location' },
  { id: 'faq', label: 'FAQ' },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Does J. Blanton Plumbing serve Columbus, Ohio?',
    a: 'Yes. We now serve Columbus and 138 cities and neighborhoods across 17 Central Ohio counties. That includes Grandview Heights, Upper Arlington, Clintonville, Bexley, Dublin, Hilliard and many more communities around the city.',
  },
  {
    q: "Where is J. Blanton Plumbing's Columbus office?",
    a: "Our Columbus office is at 1387 W. Goodale Blvd, Columbus, OH 43212, in the Grandview Heights area. It's our first location outside of Illinois.",
  },
  {
    q: 'Does J. Blanton Plumbing offer 24/7 emergency plumbing in Columbus?',
    a: 'Yes. Our Columbus team offers 24/7 emergency plumbing, drain, sewer and water heater service. That includes nights, weekends and holidays.',
  },
  {
    q: 'Is the No Drip Club available in Central Ohio?',
    a: 'Yes. Central Ohio homeowners can join the No Drip Club, our home plumbing membership. Members get priority scheduling, a 10% discount on service and equipment, no emergency or trip charges, and two preventative maintenance visits per year.',
  },
  {
    q: 'Does J. Blanton Plumbing offer financing in Ohio?',
    a: 'Yes. Flexible financing options are available to Central Ohio homeowners. Get service now and pay over time, for emergency and planned repairs.',
  },
];

const NDC_BENEFITS = [
  'Priority scheduling',
  '10% off service and equipment',
  'No emergency or trip charges',
  'Two maintenance visits a year',
];

const RELATED: { href: string; img: string; title: string }[] = [
  {
    href: '/knowledge-hub/prepare-your-home-plumbing-for-the-chicago-cold-snap',
    img: 'https://d1rplazj5a80fb.cloudfront.net/images/articles/coldsnap.webp',
    title: 'Prepare Your Home Plumbing for the Chicago Cold Snap',
  },
  {
    href: '/knowledge-hub/sewer-replacement-old-homes-chicagoland',
    img: 'https://d1rplazj5a80fb.cloudfront.net/images/articles/SewerLining-7.webp',
    title:
      'Is Your Old House Sewer a Ticking Time Bomb? Why Chicagoland Homeowners Should Consider Replacement',
  },
  {
    href: '/knowledge-hub/unclogs-for-dogs-campaign-making-bigger-impact',
    img: 'https://d1rplazj5a80fb.cloudfront.net/images/articles/dog2.webp',
    title: 'How Our "Unclogs for Dogs" Campaign Is Making a Bigger Impact Than Ever',
  },
];

const IMG = '/images/columbus-article-test';

function Check({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#BC0E0E"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Plus() {
  return (
    <span className="plus" aria-hidden="true">
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M1 6h10" />
        <path className="v" d="M6 1v10" />
      </svg>
    </span>
  );
}

function CeoQuote({ quote }: { quote: string }) {
  return (
    <blockquote>
      <p>{quote}</p>
      <footer>
        <img
          className="avatar-img"
          src={`${IMG}/avatar-aizik-zimerman.webp`}
          width={48}
          height={48}
          alt=""
        />
        <span>
          <b>Aizik Zimerman</b>CEO, J. Blanton Plumbing
        </span>
      </footer>
    </blockquote>
  );
}

function TocList() {
  return (
    <>
      {TOC_ITEMS.map((t) => (
        <li key={t.id}>
          <a href={`#${t.id}`}>{t.label}</a>
        </li>
      ))}
    </>
  );
}

export default function ColumbusArticleTestTemplate() {
  return (
    <div className="cat-root">
      <a className="skip" href="#content">
        Skip to article
      </a>

      <div className="masthead">
        <div className="masthead-band" aria-hidden="true"></div>
        <div className="masthead-text">
          <nav className="crumbs" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/knowledge-hub">Knowledge Hub</Link>
              </li>
              <li aria-current="page">Company News</li>
            </ol>
          </nav>
          <span className="eyebrow">Company News · Central Ohio</span>
          <h1>J. Blanton Plumbing Is Now Serving Columbus and Central Ohio</h1>
          <p className="dek">
            Our first location outside Illinois is open in Grandview Heights. Same 24/7 service,
            same flat-rate pricing, same promise: Make a Good Call.
          </p>
        </div>
        <div className="masthead-meta">
          <div className="byline">
            <span className="avatar" aria-hidden="true">
              JB
            </span>
            <span>
              By <strong>J. Blanton Plumbing</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>6 min read</span>
          </div>
        </div>
        <figure className="frame">
          <img
            src={`${IMG}/hero-columbus-team-skyline.webp`}
            width={1600}
            height={1067}
            alt="Two J. Blanton Plumbing team members in red company polos, arms crossed, in front of the downtown Columbus skyline"
            fetchPriority="high"
          />
          <figcaption>Our team in Columbus. Photo: Harry Acosta Photography.</figcaption>
        </figure>
      </div>

      <div className="body">
        <nav className="toc" aria-labelledby="toc-label">
          <p className="rail-label" id="toc-label">
            On this page
          </p>
          <ol id="toc">
            <TocList />
          </ol>
        </nav>

        <article id="content" className="cat-article">
          <section className="takeaways" aria-labelledby="kt">
            <p className="takeaways-label" id="kt">
              Key takeaways
            </p>
            <ul>
              <li>
                We&apos;ve opened our first Ohio location at 1387 W. Goodale Blvd in Columbus, in the
                Grandview Heights area.
              </li>
              <li>Homeowners across 138 communities in 17 Central Ohio counties are now covered.</li>
              <li>
                You get the same 24/7 plumbing, drain, sewer and water heater service Chicagoland has
                trusted for more than 30 years.
              </li>
              <li>Same flat-rate pricing, same No Drip Club, same promise: Make a Good Call.</li>
            </ul>
          </section>

          <details className="toc-m">
            <summary>On this page</summary>
            <ol>
              <TocList />
            </ol>
          </details>

          <section aria-label="Introduction">
            <p>
              For more than 30 years, we&apos;ve served homeowners across Chicago and its suburbs with
              one simple philosophy: when you call a plumber, Make a Good Call. Our team has raced
              through heat, rain, snow and hail to restore order in homes across Chicagoland. Now
              we&apos;re bringing that same standard of service, professionalism and care to Central
              Ohio.
            </p>
          </section>

          <section aria-labelledby="why">
            <h2 id="why">Why We&apos;re Expanding to Central Ohio</h2>
            <p>
              Columbus is the next chapter in our growth, and it&apos;s a big one. It&apos;s the first
              time we&apos;ve operated outside of Illinois.
            </p>
            <CeoQuote quote="“Expanding into Columbus is an exciting milestone for J. Blanton Plumbing. We've built our company around taking care of homeowners, doing what we say we're going to do, and creating an experience that makes people feel confident they made a good call. We're excited to bring that philosophy to Ohio and become part of the Columbus community.”" />
            <p>
              That last part is the key. We didn&apos;t come to Central Ohio just to add a pin on a
              map. We came to put down roots.
            </p>
          </section>

          <section aria-labelledby="good-call">
            <h2 id="good-call">What Does “Make a Good Call” Mean?</h2>
            <p>
              “Make a Good Call” is our promise that choosing us will feel like the right decision,
              from the first phone call to the final walkthrough. It means showing up when we say we
              will, giving you a flat rate before any work starts, and doing exactly what we said
              we&apos;d do.
            </p>
            <ul className="promises">
              <li>
                <b>We answer your call, 24/7.</b>
                <span>Plumbing problems don&apos;t wait for business hours, so neither do we.</span>
              </li>
              <li>
                <b>You get a flat rate before work begins.</b>
                <span>
                  Our technicians walk you through your options first. No surprises on the bill.
                </span>
              </li>
              <li>
                <b>You deal with local plumbers.</b>
                <span>
                  Our Columbus office is staffed by plumbers who work in your area, not a call center
                  routing you to a subcontractor.
                </span>
              </li>
              <li>
                <b>We treat your home like it matters.</b>
                <span>Because it does.</span>
              </li>
            </ul>
            <figure className="art-fig">
              <img
                src={`${IMG}/tech-doorstep-camera-footage.webp`}
                width={1200}
                height={896}
                loading="lazy"
                decoding="async"
                alt="J. Blanton Plumbing technician at a homeowner's front door, showing sewer camera footage on a tablet and explaining the options before any work begins"
              />
            </figure>
            <p>
              Want the longer version? Read <Link href="/why-j-blanton">why homeowners choose us</Link>.
            </p>
          </section>

          <section aria-labelledby="location">
            <h2 id="location">Where Is J. Blanton Plumbing Located in Columbus?</h2>
            <p>
              Our Columbus office is at 1387 W. Goodale Blvd, Columbus, OH 43212, in the Grandview
              Heights area. From there, our team serves 138 cities and neighborhoods across 17
              Central Ohio counties, including Franklin, Delaware, Licking, Fairfield and Union.
            </p>
            <figure className="map">
              {/* TODO (carried from the prototype): swap src for the official embed from the
                  Columbus Google Business Profile (Maps > Share > Embed a map) so the pin is
                  tied to the GBP listing. */}
              <iframe
                title="Map of J. Blanton Plumbing, 1387 W. Goodale Blvd, Columbus, OH 43212"
                src="https://www.google.com/maps?q=J.+Blanton+Plumbing,+1387+W+Goodale+Blvd,+Columbus,+OH+43212&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              ></iframe>
              <figcaption>
                <a
                  className="more"
                  href="https://www.google.com/maps/dir/?api=1&destination=J.+Blanton+Plumbing,+1387+W+Goodale+Blvd,+Columbus,+OH+43212"
                  target="_blank"
                  rel="noopener"
                >
                  Get directions
                  <span className="visually-hidden"> (opens Google Maps in a new tab)</span>
                </a>
              </figcaption>
            </figure>
            <p>
              That covers homeowners in{' '}
              <Link href="/columbus-grandview-heights">Grandview Heights</Link>, Upper Arlington,
              Clintonville, Bexley, German Village, the Short North, Dublin, Hilliard and many more.
              If you live in or around Columbus, there&apos;s a good chance we&apos;re already close
              by.
            </p>
            {/* Brief 189: every Central Ohio community, read from `OHIO_GROUPS` (same
                groups, order and `defaultOpen` as /locations/central-ohio). Native
                <details> so collapsed names still ship in the HTML. Plain text, no
                links; group labels live in <summary>, never as headings. */}
            <details className="communities">
              <summary>See all 138 communities we serve in Central Ohio</summary>
              <div className="communities-body">
                {OHIO_GROUPS.map((group) => (
                  <details
                    key={group.label}
                    className="communities-group"
                    open={group.defaultOpen}
                  >
                    <summary>
                      {group.label} <span>({group.cities.length})</span>
                    </summary>
                    <ul>
                      {group.cities.map((city) => (
                        <li key={city.slug}>{city.name}</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </details>
          </section>

          <section aria-labelledby="services">
            <h2 id="services">What Plumbing Services Do We Offer in Central Ohio?</h2>
            <p>
              Our Columbus team handles the full range of residential plumbing and sewer work.
              Emergency service is available 24/7, including nights, weekends and holidays.
            </p>
            <figure className="art-fig">
              <img
                src={`${IMG}/tech-backyard-camera-inspection.webp`}
                width={1200}
                height={896}
                loading="lazy"
                decoding="async"
                alt="J. Blanton Plumbing technician showing an older homeowner the live sewer camera inspection feed on a monitor in the backyard"
              />
            </figure>
            <ul className="svc">
              <li>
                <b>Plumbing repairs</b>
                <span>
                  Leaks, running toilets, low water pressure, broken fixtures. The everyday problems
                  that turn into big ones if you ignore them.
                </span>
              </li>
              <li>
                <b>Drain cleaning</b>
                <span>
                  Slow or clogged drains in your kitchen, bathroom, laundry room or basement. We clear
                  the clog and help you understand what caused it.
                </span>
                <Link className="more" href="/services/drain">
                  Explore drain services
                </Link>
              </li>
              <li>
                <b>Sewer camera inspections</b>
                <span>
                  A small camera goes down your sewer line to see what&apos;s going on inside. The
                  fastest way to find the real problem without guessing.
                </span>
              </li>
              <li>
                <b>Water heater services</b>
                <span>Repairs, maintenance and replacements for tank and tankless units.</span>
                <Link className="more" href="/services/water-heater">
                  Explore water heater services
                </Link>
              </li>
              <li>
                <b>Sewer repair and advanced sewer solutions</b>
                <span>
                  When a sewer line is damaged, we&apos;ll show you what we found and explain your
                  repair options.
                </span>
                <Link className="more" href="/services/sewer">
                  Explore sewer services
                </Link>
              </li>
            </ul>
          </section>

          <section aria-labelledby="same">
            <h2 id="same">What Stays the Same From Chicagoland</h2>
            <p>
              A new state doesn&apos;t mean a new standard. Columbus homeowners get the same
              experience our Chicagoland customers have counted on for decades.
            </p>
            <div className="same">
              <div>
                <h3>No Drip Club</h3>
                <p>
                  Our home plumbing membership. The easiest way to catch small problems before they
                  become expensive ones.
                </p>
                <ul className="benefits">
                  {NDC_BENEFITS.map((b) => (
                    <li key={b}>
                      <Check size={14} />
                      {b}
                    </li>
                  ))}
                </ul>
                <Link className="more" href="/no-drip-club">
                  See No Drip Club benefits
                </Link>
              </div>
              <div>
                <h3>Flexible financing</h3>
                <p>
                  A failed water heater or a broken sewer line is never in the budget. Flexible
                  financing options are available. Get service now and pay over time.
                </p>
                <Link className="more" href="/financing">
                  See financing options
                </Link>
              </div>
            </div>
          </section>

          <section aria-labelledby="community">
            <h2 id="community">More Than a New Location</h2>
            <p>
              Opening an office is the easy part. Earning a community&apos;s trust takes longer, and
              we&apos;re in it for the long haul. Our plans for Central Ohio include creating local
              jobs, building community partnerships, supporting local organizations and developing
              long-term relationships with Columbus-area homeowners.
            </p>
            <CeoQuote quote="“Our goal isn't simply to enter a new market. We want to become part of the community. We want our customers to recognize our trucks, know our team, and feel confident that when they need us, we'll be there.”" />
            <figure className="art-fig">
              <img
                src={`${IMG}/van-residential-street.webp`}
                width={1376}
                height={768}
                loading="lazy"
                decoding="async"
                alt="A red J. Blanton Plumbing service van driving down a tree-lined residential street"
              />
            </figure>
            <p>
              Are you a plumber in the Columbus area looking for a company that does things the right
              way? <Link href="/j-blanton-is-hiring">See open plumbing jobs</Link>.
            </p>
          </section>

          <section aria-labelledby="welcome">
            <h2 id="welcome">Welcome to the Good Call Family, Columbus</h2>
            <p>
              Whether it&apos;s a clogged drain, a cold shower or a sewer line you&apos;re not sure
              about, we&apos;re ready when you need us. Call us at <a href={TEL_HREF}>{TEL_DISPLAY}</a>{' '}
              or <Link href="/contact">schedule a service online</Link>.
            </p>
            <p>When you need a plumber in Columbus, Make a Good Call.</p>
          </section>

          <section className="faq" aria-labelledby="faq">
            <h2 id="faq">Frequently Asked Questions</h2>
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <Plus />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        </article>

        <aside className="rail" aria-label="Get help">
          <div className="rail-stick">
            <div className="help">
              <span className="status">
                <span className="pulse" aria-hidden="true"></span>Answering 24/7
              </span>
              <span className="loc">Columbus office</span>
              <a className="num" href={TEL_HREF}>
                {TEL_DISPLAY}
              </a>
              <p>Talk to a local plumber, day or night. You get a flat rate before any work begins.</p>
              <address>
                1387 W. Goodale Blvd
                <br />
                Columbus, OH 43212
              </address>
              <a className="btn btn-fill" href={TEL_HREF}>
                Call now
              </a>
              <Link className="btn btn-line" href="/contact">
                Schedule online
              </Link>
            </div>
            <div className="ndc">
              <p className="ndc-title">No Drip Club</p>
              <p>Our home plumbing membership, now available in Central Ohio.</p>
              <ul>
                {NDC_BENEFITS.map((b) => (
                  <li key={b}>
                    <Check size={12} />
                    {b}
                  </li>
                ))}
              </ul>
              <Link className="btn btn-line" href="/no-drip-club">
                See benefits
              </Link>
            </div>
          </div>
        </aside>
      </div>

      <section className="related" aria-labelledby="related">
        {/* Real Knowledge Hub articles. Thumbnails load from the production CDN on purpose. */}
        <h2 id="related">Related articles</h2>
        <ul>
          {RELATED.map((r) => (
            <li key={r.href}>
              <Link href={r.href}>
                <img src={r.img} alt="" width={640} height={360} loading="lazy" decoding="async" />
                <b>{r.title}</b>
                <i>Read article</i>
              </Link>
            </li>
          ))}
        </ul>
        <Link className="more" href="/knowledge-hub">
          All Knowledge Hub articles
        </Link>
      </section>

      <div className="callbar" id="callbar" aria-label="Contact the Columbus office" role="region">
        <a className="btn btn-fill" href={TEL_HREF}>
          Call {TEL_DISPLAY}
        </a>
        <Link className="btn btn-line" href="/contact">
          Schedule
        </Link>
      </div>

      <ColumbusArticleTestClient />
    </div>
  );
}
