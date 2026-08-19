/**
 * Per-city copy for Columbus, OH — Brief 154 dummy content, cloned from
 * `./elgin.ts` (the Coverage Area model page, brief-10) after the post-review
 * decision to render Columbus as `coverage-area` rather than `local-office`
 * (the video-hero template needs a hero video that doesn't exist yet).
 *
 * Office NAP (Columbus office), areas-served ("Central Ohio" placeholder), the
 * static OUR SERVICES menu, FAQs, Google map, and city grid are all derived in
 * the builder from the registry + shared.ts — this file carries ONLY Columbus's
 * unique prose, exactly like elgin.ts/algonquin.ts do for their cities.
 *
 * ⚠️ DUMMY CONTENT. This is Elgin's copy with the city name and state
 * substituted — no new marketing prose was written. Marketing replaces this
 * with real Columbus copy in a later brief. Picked Elgin over algonquin.ts as
 * the reference: Elgin's file additionally carries a `callout` (Algonquin's
 * doesn't), making it the more complete of the two coverage-area references.
 *
 * Items that could NOT be meaningfully cloned (left in place, not fabricated):
 *  - "Chicago Street" / "Randall Road" in manplumberBody are real Elgin
 *    landmarks with no Columbus equivalent to invent — left as-is rather than
 *    making up fake Columbus street names. Flagged for Marketing.
 *  - "100,000 residents" (manplumberBody) is Elgin's population, not
 *    Columbus's — left as-is per the same "swap the name/state tokens only,
 *    don't fact-check" rule used for the rest of this dummy copy.
 *  - No `heroImage` is set (matches Elgin, not Algonquin) — `resolveHeroImage()`
 *    falls through to the standard generic fallback rather than pointing at a
 *    city-specific asset that doesn't exist.
 */
import type { CoverageAreaContent } from './types';

export const COLUMBUS: CoverageAreaContent = {
  slug: 'columbus',

  callout:
    'Highly-Rated Plumbers with Over 30 Years of Experience, 5-Star Reviews, and Same-Day Service Available. Serving Columbus for All Your Plumbing Repair Needs.',

  // "WE'VE GOT YOU COVERED, Columbus" body — rich HTML (Elgin's ACF
  // city_content with the city name + state substituted).
  coveredBody: `
    <h3>Professional Plumbing Repairs in Columbus, Ohio</h3>
    <p>Looking for reliable plumbing repairs in Columbus, Ohio? Look no further! Our team of certified plumbers is equipped with the skills and expertise to handle any plumbing issue, no matter how complex.</p>
    <p>Here's what sets us apart:</p>
    <ul>
      <li>Emergency plumbing services</li>
      <li>Same-day sewer repairs</li>
      <li>Certified, licensed, and insured plumbers in Ohio</li>
      <li>Annual maintenance plans with our exclusive 'No-Drip Club'</li>
    </ul>
    <h3>Residential Plumbing Services in Columbus, Ohio</h3>
    <p>Your home's plumbing system works hard every day, and over time, issues like clogs, faulty fixtures, and broken pipes are inevitable. Trust J. Blanton Plumbing to provide dependable and professional plumbing services in Columbus, Ohio.</p>
    <h3>Emergency Plumbing Services</h3>
    <p>When a plumbing emergency strikes, you need prompt and reliable assistance. Our team is ready to respond quickly to your call, dispatching a plumber to address the issue without delay.</p>
    <h3>Basement Plumbing Services</h3>
    <p>Protect your basement from potential water damage with our expert plumbing services. From sump pump and ejector pump installation to basement waterproofing, we've got you covered.</p>
    <h3>Bathroom and Kitchen Plumbing Services</h3>
    <p>The bathroom and kitchen are two of the most heavily used areas in any home. Our skilled technicians can handle all your plumbing needs, from drains and fixtures to pipes and water-based appliances. Whether it's repairs, installations, or routine servicing, we've got you covered.</p>
  `,

  manplumberHeading: 'Expert Plumbing Repairs in Columbus: Your Local Solution',
  // ⚠️ "Chicago Street"/"Randall Road" and "100,000 residents" are Elgin facts,
  // left in place — see file docblock.
  manplumberBody: `
    <p>Columbus, Ohio, known for its historic architecture and vibrant community, is home to over 100,000 residents. With a rich history dating back to the 19th century, Columbus boasts a diverse array of homes, from charming Victorian houses to modern developments. As a bustling city, Columbus sees its fair share of plumbing issues, from clogged drains to leaky pipes. That's where J Blanton Plumbing comes in. Our local office in Columbus is dedicated to providing top-notch plumbing services to the community, including plumbing drain repair, general plumbing repairs, and maintenance. Whether it's an emergency repair or a routine maintenance check, J Blanton Plumbing is committed to keeping the plumbing systems of Columbus running smoothly. Nestled within the vibrant neighborhood of Columbus, Ohio, J Blanton Plumbing serves as a trusted partner for all plumbing repair needs. From the historic homes along Chicago Street to the modern developments near Randall Road, our team is dedicated to providing reliable plumbing services to the diverse community of Columbus. Whether it's a simple plumbing repair or a complex drain issue, J Blanton Plumbing is committed to delivering efficient and effective solutions. With our local office conveniently located in Columbus, residents can count on us for prompt and professional plumbing services, ensuring that their homes and businesses are well-maintained and functioning smoothly.</p>
  `,

  meta: {
    title: 'Columbus Plumber',
    description:
      'J. Blanton Plumbing — certified plumbers serving Columbus, OH with emergency plumbing, same-day sewer repairs, water heaters, and drain service. 30+ years, 5-star reviews. Call (773) 724-9272.',
  },
};
