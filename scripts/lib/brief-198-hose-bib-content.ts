/**
 * Brief 198 — the hose bib fall checklist's SEED CONTENT, shared (Brief 201).
 *
 * Moved here byte for byte from scripts/seed-brief-198-hose-bib-fall-checklist.ts
 * so the Brief 201 update script (scripts/update-brief-201-hose-bib-images.ts)
 * can rebuild the exact payload the seed wrote and refuse to touch a draft that
 * Marketing has edited since — instead of comparing against a hand-copied
 * duplicate of this HTML. The seed imports everything from here; its behaviour
 * is unchanged (verified: the payload it builds is identical before and after
 * the move). Client-safe: no DB.
 *
 * DO NOT EDIT the copy below to change the live article — the seed is
 * create-once and the article is editor-owned. Changing it here would only make
 * the Brief 201 guard report NOT-APPLIED (edited in admin) on a fresh database.
 */
import { sanitizeArticleV2Content } from '../../src/lib/cms/article-v2-sanitize';

export const SLUG = 'hose-bib-irrigation-fall-checklist';
export const VERSION_LABEL = 'Version 1 — for review';
export const IMG = '/images/knowledge-hub/hose-bib-fall-checklist';

export const TITLE = "Shut Off Before Fall: A Homeowner's Hose Bib & Irrigation Checklist";
export const META_TITLE = 'Hose Bib & Irrigation Fall Shutoff Checklist';
export const DEK = 'Outdoor faucets (hose bibs) and lawn irrigation lines are the first pipes to freeze in Chicagoland.';
export const META_DESCRIPTION =
  "Winterize outdoor faucets and sprinkler lines before Chicagoland's first freeze: a step-by-step hose bib shutoff checklist, frost-free faucet tips and more.";

/** Brief 195 in-article photo shape, plus the placeholder caption. */
export const fig = (file: string, alt: string, caption: string) =>
  `<figure><img src="${IMG}/${file}" alt="${alt}" width="1100" height="654" loading="lazy"><figcaption>${caption}</figcaption></figure>`;

export const BODY = [
  // (1) The TL;DR is the subtitle + key takeaways; the body starts here.
  `<p>Every spring, Chicagoland homeowners call us with the same story: the garden hose seemed a little weak, and a few days later a wet stain showed up on the basement wall. Usually, it's a hose bib that froze and split over the winter. The good news? Learning how to <strong>winterize outdoor faucets</strong> is an easy DIY job, and it can save you from a burst pipe repair that can cost up to $3,600 in Chicago once water damage cleanup is included, <a href="https://www.angi.com/articles/cost-to-repair-leaking-pipe/il/chicago">according to Angi</a>. You just need to do it before the first freeze.</p>`,
  // (2) The .docx table (Area | Average first freeze) as a list — no <table> in the CMS.
  `<ul><li><strong>Most of northern Illinois:</strong> average first freeze October 11 to 20</li><li><strong>Chicago and immediate suburbs:</strong> average first freeze October 27 to November 5</li></ul>`,
  `<p><em>Source: <a href="https://www.nbcchicago.com/weather/explainer-heres-when-the-chicago-area-typically-sees-its-first-freeze/2954436/">National Weather Service data, via NBC Chicago</a></em></p>`,

  `<h2>Why Do Outdoor Faucets Freeze and Burst?</h2>`,
  `<p>Outdoor faucets freeze because they sit on the coldest side of your house, often with little or no insulation behind them. Water expands as it freezes, and that expansion puts enormous pressure on the pipe. When water is trapped with nowhere to go, the pipe or faucet body can crack.</p>`,
  `<p>The <a href="https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/winter-storm/frozen-pipes.html">American Red Cross</a> lists outdoor hose bibs, swimming pool lines and sprinkler systems among the pipes most likely to freeze. Insurance carrier <a href="https://www.travelers.com/resources/home/maintenance/how-to-prevent-frozen-pipes">Travelers</a> puts outdoor hose hookups and lawn sprinkler lines at the top of its own high-risk list.</p>`,
  `<p>Here's the tricky part. A split often happens inside the wall, where you can't see it. You won't notice anything until spring, when you turn the faucet on and water sprays into the wall cavity. If you want to know more about what's happening inside the pipe, read our guide on <a href="/knowledge-hub/what-causes-pipes-to-burst">what causes pipes to burst</a>.</p>`,

  `<h2>Your Hose Bib Shutoff Checklist</h2>`,
  `<p>Work through this list once per outdoor faucet. Most homes have two or three.</p>`,
  // (7) Stays an ordered list, bold lead-ins kept.
  `<ol>` +
    `<li><strong>Disconnect every hose.</strong> Unscrew the hose from the faucet. Don't leave anything attached, including splitters, timers or quick-connect fittings.</li>` +
    `<li><strong>Drain the hose.</strong> Stretch it out on a slope so the water runs out, then coil it and store it in the garage or basement.</li>` +
    `<li><strong>Find the indoor shutoff valve.</strong> Most older outdoor faucets have a small valve on the pipe inside the basement or crawl space, close to where the pipe goes through the wall.</li>` +
    `<li><strong>Close the indoor valve.</strong> Turn it clockwise until it stops.</li>` +
    `<li><strong>Open the outdoor faucet.</strong> This lets the water left in the line drain out. Travelers recommends leaving outdoor faucets open through the cold months.</li>` +
    `<li><strong>Check for a bleeder cap.</strong> Some indoor valves have a small cap on the side. Put a bucket under it and open it to drain the last bit of water, then close it again.</li>` +
    `<li><strong>Add an insulated faucet cover.</strong> A foam cover is cheap and adds another layer of protection against wind.</li>` +
    `</ol>`,
  fig(
    'placeholder-indoor-shutoff-valve.webp',
    'Photo placeholder: indoor shutoff valve on the pipe feeding an outdoor faucet',
    '[PHOTO PLACEHOLDER] Indoor shutoff valve near where the pipe exits the wall.'
  ),
  `<p>Can't find the indoor valve? It's worth knowing where all your valves are before winter. Our guide to <a href="/knowledge-hub/where-is-my-main-shut-off-valve">finding your main shut-off valve</a> walks you through it.</p>`,

  `<h2>Do Frost-Free Hose Bibs Need to Be Winterized?</h2>`,
  `<p>Yes, frost-free hose bibs still need attention in the fall. They're designed to shut off water deeper inside the wall, where it's warmer, but they only work if the water can drain out of the faucet. A hose left attached traps that water, and it can freeze and burst the faucet anyway.</p>`,
  `<p>A frost-free hose bib (also called a frost-proof sillcock) is a long faucet. The handle is outside, but the actual valve sits several inches back inside your home's heated space. When you close it, the water left in the long body should drain out through the spout.</p>`,
  fig('placeholder-frost-free-hose-bib.webp', 'Photo placeholder: frost-free hose bib on an exterior wall', '[PHOTO PLACEHOLDER] Frost-free hose bib.'),
  `<p>That only happens if nothing is blocking the spout. Manufacturer <a href="https://www.woodfordmfg.com/woodford/Wall_Faucet_PDF/17CATALOG.pdf">Woodford's Model 17 specification sheet</a> says it plainly: the hose must be removed in freezing weather, or the faucet may freeze and burst.</p>`,
  `<p>So even with frost-free faucets, step one on the checklist stays the same. Take the hose off.</p>`,

  `<h2>How Do You Winterize a Lawn Irrigation System?</h2>`,
  `<p>To winterize a lawn irrigation system, shut off its water supply, then remove the water from the lines. That's done either by opening manual drain valves (if your system has them) or by blowing the lines out with compressed air. Any water left in the pipes can freeze and crack them.</p>`,
  `<p>Sprinkler lines are often shallow, and they're made of plastic pipe. <a href="https://www.hunterirrigation.com/winterizing-your-irrigation-system">Hunter Industries</a>, one of the largest irrigation manufacturers, warns that even after draining, some water can remain and "freeze, expand, and crack PVC piping."</p>`,
  `<p>There are two common methods:</p>`,
  `<ul>` +
    `<li><strong>Manual drain.</strong> This only works if your system was built with drain valves at the low points and pipe ends. You shut off the supply and open the drains so gravity empties the lines.</li>` +
    `<li><strong>Blow-out.</strong> An air compressor pushes the water out, one zone at a time. Hunter says the air pressure shouldn't exceed 50 psi for polyethylene pipe or 80 psi for PVC pipe.</li>` +
    `</ul>`,
  fig(
    'placeholder-irrigation-blowout.webp',
    'Photo placeholder: technician blowing out a lawn sprinkler system with compressed air',
    '[PHOTO PLACEHOLDER] Irrigation blow-out, one zone at a time.'
  ),
  `<p>A quick safety note: Hunter also warns that compressed air can cause serious injury, including eye injuries from flying debris, and recommends hiring a professional. If you've never done a blow-out before, this is a good job to hand off to an irrigation contractor.</p>`,
  `<p>One small leak matters, too. The <a href="https://www.epa.gov/watersense/fix-leak-week">EPA's WaterSense program</a> estimates that an irrigation leak just 1/32 of an inch wide can waste about 6,300 gallons of water per month. If you noticed soggy spots in the lawn this summer, mention it when you schedule winterization. For the repair side, see our guide on <a href="/knowledge-hub/how-to-repair-a-broken-sprinkler-pipe">how to repair a broken sprinkler pipe</a>.</p>`,

  `<h2>Don't Skip the Backflow Device</h2>`,
  `<p>Most in-ground sprinkler systems have a backflow preventer. It's the brass valve assembly that usually sits above ground near the house. Its job is to keep lawn water, fertilizer and anything else in the irrigation lines from flowing back into your drinking water.</p>`,
  fig(
    'placeholder-backflow-preventer.webp',
    'Photo placeholder: brass backflow preventer assembly above ground beside a house',
    '[PHOTO PLACEHOLDER] Backflow preventer.'
  ),
  `<p>This device has water inside it too, so it needs to be drained for winter. Hunter's guide says to open the backflow device's isolation valves and test cocks after the blow-out so leftover water can escape.</p>`,
  `<p>It's also a device with rules attached. In Chicago, the <a href="https://www.chicagoplumbingcode.com/chapter-18-29/article-3/18-29-312/">Plumbing Code (Section 18-29-312.9)</a> says pressure vacuum breaker assemblies and other testable backflow assemblies must be tested at least once a year by a licensed Cross Connection Control Device Inspector. Many suburbs have similar programs. <a href="https://www.naperville.il.us/services/water-utility/maintaining-our-system/cross-connection-control-program/">Naperville</a>, for example, requires backflow devices on residential in-ground sprinkler systems and annual inspection by a certified tester. Check with your village if you're not sure what applies to you.</p>`,

  `<h2>Signs Your Outdoor Plumbing Already Has a Problem</h2>`,
  `<p>Sometimes the damage happened last winter and nobody noticed. Look for these before you shut everything down:</p>`,
  `<ul>` +
    `<li><strong>Water dripping from the faucet when it's fully closed.</strong> The valve seat may be worn.</li>` +
    `<li><strong>Water leaking from the handle or the wall around the faucet.</strong> That can point to a crack in the faucet body.</li>` +
    `<li><strong>A damp spot on the basement wall or ceiling</strong> near where the outdoor faucet goes through.</li>` +
    `<li><strong>Low pressure</strong> from one outdoor faucet but not the others.</li>` +
    `<li><strong>Soggy patches in the lawn</strong> along a sprinkler line.</li>` +
    `</ul>`,
  `<p>A small drip now is easy to fix. The same drip after a hard freeze can turn into a split pipe and water damage. The <a href="https://www.iii.org/fact-statistic/facts-statistics-homeowners-and-renters-insurance">Insurance Information Institute</a> reports that water damage and freezing claims averaged $15,400 per claim from 2019 to 2023.</p>`,

  `<h2>Shut It Down Now, Thank Yourself in Spring</h2>`,
  `<p>Winterizing your outdoor plumbing comes down to three moves: get the hoses off, drain the outdoor faucets from the inside valve, and get the irrigation lines emptied before the first freeze. Do it in early to mid-October and you're ahead of the average first freeze across most of Chicagoland.</p>`,
  `<p>If you find a leak, a stuck valve or a faucet that won't stop dripping, let a pro handle it before the cold sets in. Our plumbers give you a flat rate before any work begins, so there are no surprises. Want someone checking your whole system twice a year? The <a href="/no-drip-club">No Drip Club</a> includes two maintenance visits with a whole home plumbing tune-up.</p>`,
  // (5) {{phone}}, never typed. (6) /contact → #schedule, absolute → relative.
  `<p>When you need a plumber in Chicagoland, Make a Good Call. Call <strong><a href="tel:{{phone}}">{{phone}}</a></strong> or <a href="#schedule">schedule service online</a>. You can also learn more about our <a href="/services/plumbing">plumbing services</a>.</p>`,
  // (3) "NEED AN EXPERT? MAKE A GOOD CALL. SCHEDULE NOW" dropped. (4) FAQ JSON-LD not imported.
].join('\n');

export const V2 = {
  dek: DEK,
  byline_name: 'J. Blanton Plumbing',
  image_alt: 'Photo placeholder: outdoor hose bib on a brick wall with the garden hose disconnected',
  image_caption: '[PHOTO PLACEHOLDER] Hero: outdoor hose bib, hose disconnected, fall setting.',
  takeaways: [
    'Disconnect and drain every hose before the first freeze.',
    'Shut off the indoor valve that feeds each outdoor faucet, then open the faucet to drain it.',
    'Get your sprinkler system drained or blown out.',
    'It takes about an hour and helps you avoid a split pipe and a soaked basement wall next spring.',
  ],
  // No office and no service-area list ([[office-map]] renders nothing without one).
  office: '',
  service_area: '',
  service_area_label: '',
  faqs: [
    { q: 'When should I shut off my outdoor faucets in Chicago?', a: 'Aim for early to mid-October. The National Weather Service data reported by NBC Chicago puts the average first freeze for most of northern Illinois between October 11 and 20, and between October 27 and November 5 in Chicago and the immediate suburbs.' },
    { q: 'Can I leave my hose connected to a frost-free faucet?', a: 'No. A frost-free faucet needs to drain after you close it, and an attached hose traps water in the faucet. Woodford, a major manufacturer, states the hose must be removed in freezing weather or the faucet may freeze and burst.' },
    { q: 'Should I leave my outdoor faucet open or closed for winter?', a: 'Close the indoor valve that supplies the faucet, then leave the outdoor faucet open. That lets any water left in the line drain out instead of freezing. Travelers Insurance recommends keeping outdoor faucets open during the cold months.' },
    { q: 'Do I need to blow out my sprinkler system?', a: "If your system doesn't have manual drain valves, yes, a compressed-air blow-out is the usual way to clear the lines. Hunter Industries notes that leftover water can freeze and crack PVC pipe. Because compressed air can cause injury, it recommends hiring a professional." },
    { q: 'How do I know if my hose bib froze last winter?', a: 'Turn the faucet on and check inside. Water on the basement wall, a damp ceiling near the faucet or water leaking from the handle are common signs of a split. Low flow from just one faucet can also point to damage.' },
  ],
  components: [],
};

/** Brief 187 slugs (kh_terms): Plumbing Tips + Chicagoland (region), no secondary topics. */
export const TERMS = { primary: 'plumbing-tips', secondary: [] as string[], locations: ['chicagoland'] };
/** Brief 188 hand-picks. A missing or unpublished one is skipped and reported (not a guard). */
export const RELATED_WANTED = [
  'what-causes-pipes-to-burst',
  'prepare-your-home-plumbing-for-the-chicago-cold-snap',
  'how-to-repair-a-broken-sprinkler-pipe',
];

/**
 * The version content the seed writes for "Version 1 — for review" (key order
 * included), i.e. exactly the payload the editor saves. `related` is the
 * hand-picks that survived the seed's published-only filter.
 */
export function seedVersionContent(related: string[]) {
  return {
    title: TITLE,
    excerpt: DEK,
    body: BODY,
    image: `${IMG}/placeholder-hero.webp`,
    terms: TERMS,
    related,
    template: 'article-v2',
    v2: sanitizeArticleV2Content(V2),
    metaTitle: META_TITLE,
    metaDescription: META_DESCRIPTION,
  };
}
