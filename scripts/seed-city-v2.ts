/**
 * Brief 67 (Track G) — seed Algonquin + Elgin as Local Office V2 cities.
 *
 * All content is hardcoded below from the uploaded copy files:
 *   - Algonquin_CityPage_Copy.md
 *   - 2. Elgin_CityPage_Copy.docx
 *
 * Run AFTER the migration:
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-city-v2.ts
 *
 * Idempotent: UPSERT keyed on the UNIQUE city_slug. Existing rows (Algonquin +
 * Elgin already exist as coverage-area) are updated in place; the row is flipped
 * to template_type = 'local-office-v2'.
 *
 * JSONB columns are passed as JSON.stringify(...)::jsonb — node-pg serializes a
 * JS array to a Postgres array literal, which is invalid for jsonb, so the
 * explicit stringify + cast is required.
 */

import pool from '../src/lib/db';

interface V2City {
  slug: string;
  hero_heading_line1: string;
  hero_description: string;
  trust_bar_stars: string;
  trust_bar_review_count: string;
  services_intro: string;
  most_requested_services: Array<{ title: string; body: string }>;
  mid_cta_text: string;
  why_points: Array<{ heading: string; body: string }>;
  video_heading: string;
  video_intro: string;
  video_script: string;
  reviews: Array<{ name: string; text: string; gbp_url: string }>;
  ndc_intro: string;
  final_cta_heading: string;
  final_cta_body: string;
  faqs: Array<{ question: string; answer: string }>;
}

const algonquin: V2City = {
  slug: 'algonquin',
  hero_heading_line1: 'Plumbers in Algonquin, IL — Local Dispatch',
  hero_description:
    "Our Algonquin office serves the Fox River Valley and surrounding communities — Crystal Lake, Lake in the Hills, Cary, and Fox River Grove. Local dispatch means your technician isn't driving in from the city. Call days, evenings, or weekends — our office is in Algonquin and we're reachable when you need us.",
  trust_bar_stars: '4.8',
  trust_bar_review_count: '300+',
  services_intro:
    'From hard-water damage to sump pumps on the edge of the Fox River floodplain, our technicians are trained and certified to handle any plumbing job in Algonquin.',
  most_requested_services: [
    {
      title: 'Water Heater Services',
      body: "Algonquin's groundwater runs hard — the Fox River Valley aquifer delivers moderately high mineral content that accumulates inside your water heater every year. In a home without a water softener, sediment builds faster than the manufacturer's warranty assumes. Our technicians see early-stage failure regularly in Algonquin homes that are only 10–12 years old. We flush, diagnose, and replace — and we give you a flat-rate before anything starts.",
    },
    {
      title: 'Drain Cleaning',
      body: "Hard water doesn't just affect water heaters. Over time, calcium and magnesium deposits constrict inside drain lines the same way plaque builds in arteries — slow at first, then sudden. If your shower or kitchen sink drains slower every season, it's likely more than organic buildup. Our Algonquin team handles both standard cable clearing and hydro jetting for lines where scale has had time to accumulate.",
    },
    {
      title: 'Basement Flooding & Sump Pump Service',
      body: "Algonquin sits in the Fox River watershed. When spring snowmelt arrives or a major rain system rolls through, basements without a properly functioning sump pump are at real risk. Most of Algonquin's homes were built in the 1980s and 1990s — which means original sump pump systems are now 20–30 years old and well past their recommended service life. We install, replace, and inspect, and we can tell you whether your current system is actually ready for the next storm.",
    },
  ],
  mid_cta_text:
    'Need an emergency plumber in Algonquin? Our technicians diagnose first and give you a flat-rate before work begins.',
  why_points: [
    {
      heading: 'We Know How Fox River Valley Groundwater Affects Your Plumbing',
      body: "Our technicians know this water — Fox River Valley groundwater is among the harder in northeastern Illinois, and the calcium and magnesium dissolved in it don't behave the same way as what you'd see in a lake-water community. Sediment accumulates faster inside water heaters, scale builds in drain lines without any organic blockage, and fixtures and valves wear sooner than their rated life. The diagnostic approach here has to account for that, and ours does.",
    },
    {
      heading: 'We Know What to Check in Algonquin Before Each Spring',
      body: "Our Esplanade Drive office sits in Fox River watershed territory, and our technicians see what spring snowmelt and heavy rain events do to basements in this area. A sump pump that's been running for 25 years without inspection is the last line of defense between a dry basement and a costly cleanup — and that's not a hypothetical in Algonquin. We test the float switch, check the discharge line, and tell you exactly what your system can handle before you need it.",
    },
    {
      heading: 'We Know What 1990s Algonquin Homes Need Right Now',
      body: "Our technicians see the same pattern regularly in the 1980s and 1990s subdivisions that make up most of Algonquin: original water heaters running past their expected life, sump pumps that have never been serviced, and PRV valves that haven't been checked since installation. We know which systems typically go first in homes from that era — a diagnostic call often catches problems before they become emergencies.",
    },
  ],
  video_heading: 'ALGONQUIN WATER HEATERS: WHY YOUR GROUNDWATER IS THE PROBLEM',
  video_intro:
    "Most water heater failures in Algonquin aren't about the unit — they're about what's in the water.",
  video_script:
    "[Technician opens a mechanical room door, reveals a tank water heater with visible rust at the base]\n\nVoice over: When we get a water heater call in Algonquin, we ask the same question first: how long have you been here, and has it ever been flushed? [Cut to technician draining sediment from the tank — cloudy water, visible mineral deposits in the drain pan] Algonquin's groundwater comes from the Fox River Valley aquifer — it's moderately hard, which means calcium and magnesium are dissolving into your water supply every day. Over time, that sediment settles at the bottom of your water heater tank. [Cut to technician showing homeowner deposits on a white cloth] A tank sitting on a layer of mineral buildup runs hotter to reach the same temperature — which means higher gas bills and faster wear. [Closing frame: technician at the front door] We flush, inspect the anode rod, and tell you what you've got. Flat-rate after diagnosis. That's how we work in Algonquin.",
  reviews: [
    {
      name: 'Amanda J P Dunakin',
      text: "The team who installed the pipe lining for us were all amazing! We had an emergency sewer overflow with a hole in our pipe and a blockage. They fixed it, helped us understand what was happening and why, and were able to help us navigate some additional preventative sewer lining to save us from a much bigger disaster down the road. They were friendly, and when offering services they didn't put pressure on us to say yes.",
      gbp_url: 'https://maps.app.goo.gl/4gtR7JLwxAz1xMZ89',
    },
    {
      name: 'Jackson Jordan',
      text: 'Edgar H was great, we had water backup in our basement and he was at our house until 10 at night getting it drained out. He then cleaned out our sewer line and at multiple access points and stopped back out twice after our work was completed to make sure everything looked good.',
      gbp_url: 'https://maps.app.goo.gl/erPs4ejRTq8tsnoT7',
    },
    {
      name: 'Karen R',
      text: 'Christian was amazing. He came and looked over all of my plumbing issues discovered a large hole in my check valve in my sub pump. He was kind courteous and he explained everything so well and was also able to finish the job while he was here.',
      gbp_url: 'https://maps.app.goo.gl/WnzQRtgf4zS5Paxh6',
    },
  ],
  ndc_intro:
    "Members in Algonquin get three services that directly address what this market deals with every year:\n\n- Free Annual Water Heater Flush & Maintenance — In hard groundwater territory, this isn't optional maintenance. It's what keeps your unit running at full efficiency and extends its life.\n- 1 Free Drain Clearing Per Year — Hard water scale restricts drain lines over time. Annual clearing keeps the lines open before buildup becomes a blockage.\n- Free Annual Sewer Camera Inspection — Know what's happening underground before a backup forces the conversation. One inspection per year, no service charge.\n\nMembership is $29.97/month and includes 10% off all services, VIP priority scheduling, and no emergency, trip, or holiday fees.",
  final_cta_heading: "ALGONQUIN'S PLUMBER — AVAILABLE WHEN YOU NEED US MOST",
  final_cta_body:
    "Our technicians dispatch from Esplanade Drive and know what Algonquin homes deal with. We're available around the clock — evenings, weekends, holidays. Call and we'll have someone headed your way.",
  faqs: [
    {
      question: 'How quickly can you get to my home in Algonquin?',
      answer:
        "Our technicians dispatch directly from our Esplanade Drive office in Algonquin, which keeps response times tight within the Fox River Valley. For emergencies, we're available 24 hours a day, 7 days a week — including weekends and holidays. Call and we'll give you an ETA when you book.",
    },
    {
      question: 'Are J. Blanton plumbers licensed and insured in Illinois?',
      answer:
        "Yes. Every technician is licensed, bonded, and insured in Illinois. You're also covered by our workmanship guarantee on every job we complete.",
    },
    {
      question: 'Do I get a price before you start work?',
      answer:
        'Always. Our technicians diagnose first, then give you a flat-rate price before any work begins. No surprises on the invoice.',
    },
    {
      question: 'My water heater is only 10 years old. Why is it already having problems?',
      answer:
        "In Algonquin's hard water environment, 10 years is closer to the end of a water heater's effective life than you might expect. Groundwater from the Fox River Valley aquifer carries mineral content that accumulates at the bottom of the tank and accelerates wear. An annual flush extends the unit's life significantly — and if it's never been flushed, sediment may already be affecting your efficiency and recovery time.",
    },
    {
      question: 'What causes sump pump failure in Algonquin homes?',
      answer:
        "Most failures we see are either float switch failure (the switch gets stuck or corroded and stops triggering the pump) or the pump motor burning out from age. Homes built in the 1980s and 1990s often have original sump pumps — 25–30 years of service is past the expected life of most units. We test the float, check the discharge line for obstructions, and inspect the pit for water intrusion signs during any sump service call.",
    },
  ],
};

const elgin: V2City = {
  slug: 'elgin',
  hero_heading_line1: 'PLUMBERS IN ELGIN — WE ALWAYS ANSWER',
  hero_description:
    'Our Elgin office serves the Fox River Valley and surrounding communities. Local dispatch gets to your home fast, even on weekends and holidays. Upfront pricing, always.',
  trust_bar_stars: '4.8',
  trust_bar_review_count: '250+',
  services_intro:
    'From routine maintenance to full sewer repairs, our technicians are trained and certified to handle any plumbing job in Elgin.',
  most_requested_services: [
    {
      title: 'Drain Cleaning',
      body: "Elgin's older housing stock means aging pipes that accumulate buildup faster than newer materials. If your drains are slow or backing up, we diagnose the cause before recommending a fix.",
    },
    {
      title: 'Sump Pumps',
      body: "Elgin's proximity to the Fox River means basement flooding is a real seasonal risk. If your sump pump is struggling or hasn't been serviced recently, don't wait for the next heavy rain.",
    },
    {
      title: 'Lead Pipe Replacement',
      body: "The City of Elgin has identified roughly 10,000 lead service lines in older homes. If your home was built before 1960, your service line may be one of them. We'll tell you what we find.",
    },
  ],
  mid_cta_text:
    'Need an emergency plumber in Elgin right now? Our technicians diagnose first and give you a flat-rate before work begins.',
  why_points: [
    {
      heading: 'Older housing stock, legacy pipes',
      body: "Many Elgin homes — particularly in neighborhoods like Gifford Park and the Spring/Douglas Historic District — were built before modern pipe materials existed. We know what we're likely to find before we arrive — cast iron, galvanized steel, clay sewer lines — and we always camera-inspect before we recommend anything.",
    },
    {
      heading: 'Fox River proximity',
      body: "Elgin's water supply draws from the Fox River and six groundwater wells. That surface water source means more mineral load reaching your pipes, water heater, and fixtures over time — and higher basement flooding risk during heavy rain and snowmelt seasons.",
    },
    {
      heading: 'Lead service lines',
      body: "The City of Elgin has identified thousands of lead service lines in older properties. The city's water tests clean. The risk is inside the home. We know what to look for, and we'll tell you what we find — including things other plumbers might not flag.",
    },
  ],
  video_heading: "DON'T KNOW WHAT'S INSIDE YOUR ELGIN DRAIN PIPES? WATCH THIS.",
  video_intro:
    "Elgin's pre-1940 housing stock means millions of feet of cast iron, galvanized steel, and clay sewer lines still running underground. Here's what that means for your drains — and how to know when to act.",
  video_script:
    "What's Actually Inside the Drain Pipes of an Older Elgin Home?\n\nElgin has some of the oldest housing stock in Chicagoland. And if your home has original plumbing, there's something worth knowing about what's running underneath it.\n\nCast iron. Galvanized steel. Clay sewer lines. These were the standard materials — and after 80-plus years, they accumulate buildup in ways modern pipes simply don't.\n\nA slow drain in an older Elgin home isn't always just a clog. It can mean your pipe walls are closing in — and the problem is further down the line than you think.\n\nThat's why we camera-inspect before we recommend anything. We tell you what's in there — so you make a decision based on facts, not a guess.\n\nChicagoland plumbing isn't generic. You need someone who knows the specific challenges in this area. You need us.\n\nJ. Blanton Plumbing. Make a good call.",
  reviews: [
    {
      name: 'Christopher C.',
      text: 'Dominic ran into some very large build up during the cleaning, but was able to modify his approach to make sure the job was done perfectly. Very thankful for his expertise and service.',
      gbp_url: '',
    },
    {
      name: 'Adriana Hernandez',
      text: 'Responsive and easy scheduling. Very communicative about arrival and upfront/direct about costs and about additional potential issues associated with the problem we were having. Provided options without pushing a certain outcome.',
      gbp_url: '',
    },
    {
      name: "Andrew O'Dekirk",
      text: "We get recurring support from the same technician (Alex), which gives us the peace of mind that someone knows our house, keeps thorough notes on the areas we need to monitor and makes clear recommendations on what needs to be done. Alex is a true trusted advisor, which is rare in this field. We couldn't be bigger fans!",
      gbp_url: '',
    },
  ],
  ndc_intro:
    "The No Drip Club is J. Blanton's membership program. Members get: Free Annual Sewer Camera Inspection, Free Annual Water Heater Flush & Maintenance, 1 Free Drain Cleaning Per Year — plus no emergency fees, trip charges, or after-hours markups.",
  final_cta_heading: "ELGIN'S PLUMBER — AVAILABLE WHEN YOU NEED US MOST",
  final_cta_body:
    "Whether it's a burst pipe at midnight or a water heater that's been acting up for weeks, our Elgin technicians are ready. We diagnose first, give you a flat-rate price, and get the job done right.",
  faqs: [
    {
      question: 'How much does a plumber cost in Elgin?',
      answer:
        "Plumbing rates vary depending on the job type, complexity, and timing. Most plumbers charge by the hour — meaning the final number depends on how long the job takes. At J. Blanton, we don't work that way. We charge flat rates, so you know the full cost before we start, regardless of how long the job takes.",
    },
    {
      question: 'What should I ask before hiring a plumber in Elgin?',
      answer:
        "Three questions worth asking before anyone starts work: Do you diagnose before you recommend? Do you charge a trip fee just to show up? And will I get a price before you start? In Elgin's older homes — where you're likely dealing with cast iron, galvanized steel, or clay sewer lines — a plumber who camera-inspects before recommending a fix is worth the call.",
    },
    {
      question: 'Do you charge emergency fees or trip charges?',
      answer:
        "Many plumbers add emergency fees, after-hours markups, or trip charges on top of the repair cost — it's one of the most common sources of bill shock. Before you book anyone, ask directly. At J. Blanton, we give you a flat-rate price before work begins so the number you hear is the number on your invoice.",
    },
    {
      question: 'How fast can you get to my home in Elgin?',
      answer:
        "We dispatch locally from our Elgin office. We can't guarantee a specific arrival time, but we can tell you we're not routing a technician from the other side of Chicagoland. Local dispatch means faster response — especially for emergencies.",
    },
    {
      question: 'Is J. Blanton licensed and insured in Illinois?',
      answer:
        'Yes. J. Blanton Plumbing is fully licensed, bonded, and insured in Illinois. All technicians are trained and certified.',
    },
  ],
};

async function upsert(client: import('pg').PoolClient, city: V2City): Promise<void> {
  await client.query(
    `INSERT INTO city_pages (
       city_slug, city_type, template_type, hero_heading_line1, hero_description,
       trust_bar_stars, trust_bar_review_count, services_intro, most_requested_services,
       mid_cta_text, why_points, video_heading, video_intro, video_script, reviews,
       ndc_intro, final_cta_heading, final_cta_body, faqs
     ) VALUES (
       $1, 'local-office', 'local-office-v2', $2, $3,
       $4, $5, $6, $7::jsonb,
       $8, $9::jsonb, $10, $11, $12, $13::jsonb,
       $14, $15, $16, $17::jsonb
     )
     ON CONFLICT (city_slug) DO UPDATE SET
       city_type               = 'local-office',
       template_type           = 'local-office-v2',
       hero_heading_line1      = EXCLUDED.hero_heading_line1,
       hero_description        = EXCLUDED.hero_description,
       trust_bar_stars         = EXCLUDED.trust_bar_stars,
       trust_bar_review_count  = EXCLUDED.trust_bar_review_count,
       services_intro          = EXCLUDED.services_intro,
       most_requested_services = EXCLUDED.most_requested_services,
       mid_cta_text            = EXCLUDED.mid_cta_text,
       why_points              = EXCLUDED.why_points,
       video_heading           = EXCLUDED.video_heading,
       video_intro             = EXCLUDED.video_intro,
       video_script            = EXCLUDED.video_script,
       reviews                 = EXCLUDED.reviews,
       ndc_intro               = EXCLUDED.ndc_intro,
       final_cta_heading       = EXCLUDED.final_cta_heading,
       final_cta_body          = EXCLUDED.final_cta_body,
       faqs                    = EXCLUDED.faqs,
       updated_at              = NOW()`,
    [
      city.slug,
      city.hero_heading_line1,
      city.hero_description,
      city.trust_bar_stars,
      city.trust_bar_review_count,
      city.services_intro,
      JSON.stringify(city.most_requested_services),
      city.mid_cta_text,
      JSON.stringify(city.why_points),
      city.video_heading,
      city.video_intro,
      city.video_script,
      JSON.stringify(city.reviews),
      city.ndc_intro,
      city.final_cta_heading,
      city.final_cta_body,
      JSON.stringify(city.faqs),
    ]
  );
  console.log(`  ✓ ${city.slug} → local-office-v2`);
}

async function run() {
  const client = await pool.connect();
  try {
    for (const city of [algonquin, elgin]) {
      await upsert(client, city);
    }
    console.log('\nBrief 67 seed complete (Algonquin + Elgin on local-office-v2).');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
