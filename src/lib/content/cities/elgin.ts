/**
 * Per-city copy for Elgin — the Coverage Area model page (brief-10).
 * Source of truth: live https://jblantonplumbing.com/elgin (fetched 2026-06-03).
 *
 * Office NAP (Elgin office), areas-served, the static OUR SERVICES menu, FAQs,
 * Google map and city grid are all derived in the builder from the registry +
 * theme maps — this file carries ONLY Elgin's unique prose (the part that must
 * be backfilled per city). `coveredBody` / `manplumberBody` are rich HTML
 * (subheadings + a bullet list), not flattened to one paragraph (brief §4).
 */
import type { CoverageAreaContent } from './types';

export const ELGIN: CoverageAreaContent = {
  slug: 'elgin',

  callout:
    'Highly-Rated Plumbers with Over 30 Years of Experience, 5-Star Reviews, and Same-Day Service Available. Serving Elgin for All Your Plumbing Repair Needs.',

  // "WE'VE GOT YOU COVERED, Elgin" body — rich HTML (ACF city_content).
  coveredBody: `
    <h3>Professional Plumbing Repairs in Elgin, Illinois</h3>
    <p>Looking for reliable plumbing repairs in Elgin, Illinois? Look no further! Our team of certified plumbers is equipped with the skills and expertise to handle any plumbing issue, no matter how complex.</p>
    <p>Here's what sets us apart:</p>
    <ul>
      <li>Emergency plumbing services</li>
      <li>Same-day sewer repairs</li>
      <li>Certified, licensed, and insured plumbers in Illinois</li>
      <li>Annual maintenance plans with our exclusive 'No-Drip Club'</li>
    </ul>
    <h3>Residential Plumbing Services in Elgin, Illinois</h3>
    <p>Your home's plumbing system works hard every day, and over time, issues like clogs, faulty fixtures, and broken pipes are inevitable. Trust J. Blanton Plumbing to provide dependable and professional plumbing services in Elgin, Illinois.</p>
    <h3>Emergency Plumbing Services</h3>
    <p>When a plumbing emergency strikes, you need prompt and reliable assistance. Our team is ready to respond quickly to your call, dispatching a plumber to address the issue without delay.</p>
    <h3>Basement Plumbing Services</h3>
    <p>Protect your basement from potential water damage with our expert plumbing services. From sump pump and ejector pump installation to basement waterproofing, we've got you covered.</p>
    <h3>Bathroom and Kitchen Plumbing Services</h3>
    <p>The bathroom and kitchen are two of the most heavily used areas in any home. Our skilled technicians can handle all your plumbing needs, from drains and fixtures to pipes and water-based appliances. Whether it's repairs, installations, or routine servicing, we've got you covered.</p>
  `,

  manplumberHeading: 'Expert Plumbing Repairs in Elgin: Your Local Solution',
  manplumberBody: `
    <p>Elgin, Illinois, known for its historic architecture and vibrant community, is home to over 100,000 residents. With a rich history dating back to the 19th century, Elgin boasts a diverse array of homes, from charming Victorian houses to modern developments. As a bustling city, Elgin sees its fair share of plumbing issues, from clogged drains to leaky pipes. That's where J Blanton Plumbing comes in. Our local office in Elgin is dedicated to providing top-notch plumbing services to the community, including plumbing drain repair, general plumbing repairs, and maintenance. Whether it's an emergency repair or a routine maintenance check, J Blanton Plumbing is committed to keeping the plumbing systems of Elgin running smoothly. Nestled within the vibrant neighborhood of Elgin, Illinois, J Blanton Plumbing serves as a trusted partner for all plumbing repair needs. From the historic homes along Chicago Street to the modern developments near Randall Road, our team is dedicated to providing reliable plumbing services to the diverse community of Elgin. Whether it's a simple plumbing repair or a complex drain issue, J Blanton Plumbing is committed to delivering efficient and effective solutions. With our local office conveniently located in Elgin, residents can count on us for prompt and professional plumbing services, ensuring that their homes and businesses are well-maintained and functioning smoothly.</p>
  `,

  meta: {
    title: 'Elgin Plumber',
    description:
      'J. Blanton Plumbing — certified plumbers serving Elgin, IL with emergency plumbing, same-day sewer repairs, water heaters, and drain service. 30+ years, 5-star reviews. Call (773) 724-9272.',
  },
};
