import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const CDN = 'https://d1rplazj5a80fb.cloudfront.net/images';

// ---------------------------------------------------------------------------
// Global content (shared across all pages)
// ---------------------------------------------------------------------------
const globalRow = {
  service_area_heading: "We're Almost Everywhere",
  service_area_body: 'With more plumbers and more trucks at our disposal, we can cover more ground and reach your home quickly.',
  tiktok_headline: 'J Blanton Plumbing — Turning Bad Calls to Good Calls',
};

// ---------------------------------------------------------------------------
// Page definitions
// ---------------------------------------------------------------------------
const pages = [
  // ── Sewer ──────────────────────────────────────────────────────────────
  {
    slug: 'sewer',
    hero_heading: "SEWER PROBLEMS? J. BLANTON'S ON THE WAY!",
    hero_intro: "24/7 Emergency Sewer Service: When disaster strikes, we're here. From backed-up lines to overflowing drains, our expert team will respond immediately to protect your home and restore your peace of mind. Don't wait—call us now!",
    intro_heading: 'SEWER EXPERTS ON CALL',
    intro_body: "When sewer problems strike, every second counts. J. Blanton isn't just one plumber—we're a full team of sewer repair specialists ready to act fast. Whatever the issue, we'll have the right expert at your door, ready to tackle your sewer emergency — as soon as humanly possible.",
    problems_heading: 'SEWER EMERGENCIES SOLVED',
    problems_items: [
      'Emergency sewer line repair and replacement',
      '24/7 sewer backup and clog removal',
      'Main line cleaning and repair',
      'Trenchless sewer repair services',
      'Camera inspection and diagnostics',
    ],
    subcategories_heading: 'Explore More Sewer Solutions',
    preventative_heading: 'WE HATE SEWER PROBLEMS TOO',
    preventative_body: "That's why we created our expert sewer repair service, a complete peace of mind solution that helps you avoid costly emergency repairs and property damage.",
    final_pitch_tagline: 'TURN A SEWER CRISIS INTO A CLEAN SOLUTION',
    final_pitch_body: "Don't wait until your sewer problems get worse. Call us now for immediate sewer repair service.",
    articles_featured_slugs: [
      'sewer-replacement-old-homes-chicagoland',
      'pvc-vs-abs-pipes',
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
    ],
    subcategories: [
      { label: 'Sewer Rodding', href: '/sewer-rodding', image: `${CDN}/img_sewer-rodding.webp`, desc: 'We provide emergency sewer rodding to quickly clear blocked drains and sewage backups.' },
      { label: 'Sewer Repair', href: '/sewer-repair', image: `${CDN}/img_sewer-repair.webp`, desc: 'Professional sewer repair services transform emergencies into permanent solutions.' },
      { label: 'Sewer Maintenance', href: '/sewer-maintenance', image: `${CDN}/img_sewer-maintenance.webp`, desc: 'We provide expert sewer line maintenance to address slow drains, odors, and clogs.' },
      { label: 'Home Repipe', href: '/home-repipe', image: `${CDN}/img_home-repipe.webp`, desc: 'Professional plumbers provide comprehensive home repiping services and system upgrades.' },
    ],
  },

  // ── Plumbing ────────────────────────────────────────────────────────────
  {
    slug: 'plumbing',
    hero_heading: 'Expert Plumbing Services near you.',
    hero_intro: 'Expert Residential Plumbing Services You Can Trust. From bathroom remodels to water heater installations, our certified plumbers deliver quality solutions for your home. Call J. Blanton for professional plumbing done right!',
    intro_heading: 'EXPERT PLUMBING SOLUTIONS',
    intro_body: "When you need plumbing services, trust J. Blanton's team of certified professionals. From kitchen remodels to bathroom upgrades, we deliver expert solutions for all your home's plumbing needs. Our skilled technicians arrive promptly, equipped to handle any residential plumbing challenge in the Chicagoland area.",
    problems_heading: 'Plumbing Problems We Solve',
    problems_items: [
      'Kitchen and bathroom fixture repairs and installations',
      'Drain cleaning and unclogging services',
      'Pipe repair and replacement',
      'Water line installation and maintenance',
      'Faucet and sink repairs',
    ],
    subcategories_heading: 'Explore More Plumbing Solutions',
    preventative_heading: 'We Make Plumbing Problems Disappear',
    preventative_body: "Expert Drain Services in Chicagoland\n\nThat's why we created the No Drip Club, a complete peace of mind solution that helps prevent costly drain emergencies. Our certified technicians keep your drains flowing smoothly with professional maintenance and rapid response when issues arise.",
    final_pitch_tagline: 'TURN A PLUMBING PROBLEM INTO A PERFECT SOLUTION',
    final_pitch_body: "What are you waiting for? The sooner you call, the sooner we'll be there.",
    articles_featured_slugs: [
      'where-did-those-pink-stains-in-your-bathroom-come-from',
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
      'sewer-replacement-old-homes-chicagoland',
    ],
    subcategories: [
      { label: 'Bathroom Plumbing', href: '/bathroom-plumbing-chicago', image: '/images/sub-bathroom-plumbing.webp', desc: 'Professional Chicago plumbers offer comprehensive bathroom plumbing solutions from minor repairs to full remodels.' },
      { label: 'Kitchen Plumbing', href: '/kitchen-plumbing', image: '/images/sub-kitchen-plumbing.webp', desc: 'We provide expert kitchen plumbing repairs and solutions for all your needs.' },
      { label: 'Laundry Room Plumbing', href: '/laundry-room-plumbing', image: '/images/laundry-room.webp', desc: 'Professional plumbers offering comprehensive laundry room repairs and installations.' },
      { label: 'Gas Lines', href: '/gas-lines-chicago', image: '/images/sub-gas-lines.webp', desc: 'Expert gas line technicians provide emergency repairs and solutions for leaks and line issues.' },
    ],
  },

  // ── Drain ───────────────────────────────────────────────────────────────
  {
    slug: 'drain',
    hero_heading: 'Are You Having Drain Troubles?',
    hero_intro: 'Slow water, bad smells, and recurring clogs are common drain problems that can quickly disrupt daily routines, but at J. Blanton Plumbing, our experienced team has the tools and expertise to diagnose the issue fast and fix it the right way.',
    intro_heading: 'Drain Solutions Experts on Standby',
    intro_body: "Our plumbers use proven methods to restore proper flow. We inspect lines, identify blockages, and recommend the best fix.\n\nFrom thorough cleaning to targeted repairs, we handle each drain issue with care. Every service is tailored to your home and plumbing system. You can trust J. Blanton Plumbing for lasting results.",
    problems_heading: 'Reliable Solutions for Common Drain Problems',
    problems_items: [
      'Slow moving water in sinks or tubs',
      'Frequent clogs that keep coming back',
      'Foul odors coming from pipes',
      'Gurgling sounds or backups',
    ],
    subcategories_heading: 'Explore More Drain Solutions',
    preventative_heading: 'Join the No Drip Club',
    preventative_body: "The No Drip Club is our premium maintenance program. Members receive priority scheduling and routine inspections. This helps catch small issues before they become big repairs. Discounts and exclusive benefits are included. It's an easy way to protect your plumbing year-round.",
    final_pitch_tagline: 'Schedule Your Drain Service Today',
    final_pitch_body: "Don't wait for small issues to get worse. Scheduling service is quick and easy. Our team is ready to help when you need it most. Book online or call to speak with a specialist. Let J. Blanton Plumbing handle your next drain service with confidence.",
    articles_featured_slugs: [
      'brown-friday-plumbing-drain-clog-emergency',
      '4-headaches-you-can-avoid-with-plumbing-maintenance',
      'where-did-those-pink-stains-in-your-bathroom-come-from',
    ],
    subcategories: [
      { label: 'Clogged Drains', href: '/clogged-drains-in-chicago', image: `${CDN}/img_clogged-drains.webp`, desc: 'We quickly clear all types of clogged drains in Chicago.' },
      { label: 'Basement Flooding', href: '/basement-flooding', image: `${CDN}/Basement-flooding.webp`, desc: 'We provide emergency response services to handle basement flooding and restore your space.' },
      { label: 'Kitchen Sink Drain', href: '/kitchen-sink-drain', image: `${CDN}/Kitchen-Sink-Drain.webp`, desc: 'Professional plumbers fix kitchen sink drain problems to restore normal function.' },
    ],
  },

  // ── Water Heater ────────────────────────────────────────────────────────
  {
    slug: 'water-heater',
    hero_heading: 'Is Your Water Heater on the Fritz?',
    hero_intro: 'When hot water disappears, our licensed plumbers provide fast water heater repair and expert water heater installation to restore comfort day or night.',
    intro_heading: '24/7 Water Heater Experts You Can Rely On',
    intro_body: "Water heater problems rarely happen at a convenient time. That's why our team is available around the clock. We arrive prepared, diagnose the issue clearly, and explain your options before any work begins.\n\nIf repair isn't the best long-term solution, we also provide professional water heater installation with minimal disruption to your home. Our goal is to get your hot water flowing again—safely and efficiently.",
    problems_heading: 'Fast Solutions for Common Water Heater Problems',
    problems_items: [
      'No hot water or inconsistent temperatures',
      'Strange noises coming from the tank',
      'Leaks around the unit',
      'Pilot light or ignition failures',
      'Aging or inefficient systems',
    ],
    subcategories_heading: 'Explore More Water-Heater Solutions',
    preventative_heading: 'Avoid Cold Showers with the No Drip Club',
    preventative_body: "We hate cold showers too. That's why we created the No Drip Club, designed to keep your plumbing system running smoothly all year. Members enjoy proactive care that helps prevent surprise breakdowns and expensive water heater repairs. It's a simple way to protect your comfort and extend the life of your system.",
    final_pitch_tagline: 'Schedule Water Heater Services with Confidence',
    final_pitch_body: "Whether you need urgent repairs or are planning ahead for a new system, our team is here to help. From expert diagnostics to careful water heater installation, you'll get clear communication and dependable workmanship.",
    articles_featured_slugs: [
      '45532-boost-your-water-heaters-efficiency-the-role-of-ventilation-in-arlington-heights-homes',
      '4-headaches-you-can-avoid-with-plumbing-maintenance',
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
    ],
    subcategories: [
      { label: 'Residential Water Heater', href: '/residential-water-heater', image: `${CDN}/img_residential-water-heater.webp`, desc: 'We provide rapid water heater repairs and installations to restore your hot water.' },
      { label: 'Tankless Water Heater', href: '/tankless-water-heater', image: `${CDN}/img_tankless-water-heater.webp`, desc: 'We offer professional tankless water heater repairs and maintenance to keep your hot water flowing.' },
      { label: 'Commercial Water Heater', href: '/commercial-water-heater', image: `${CDN}/img_commercial-water-heater.webp`, desc: 'Expert commercial water heater repair and installation services for businesses.' },
    ],
  },

  // ── Water Quality ───────────────────────────────────────────────────────
  {
    slug: 'water-quality',
    hero_heading: 'J. BLANTON, YOUR WATER QUALITY EXPERTS',
    hero_intro: "Pure, Clean Water 24/7: Expert Water Quality Solutions at Your Service. Don't compromise with contaminated or hard water—call us now! We'll transform your tap water into crystal-clear, healthy hydration.",
    intro_heading: 'PURE WATER SOLUTIONS',
    intro_body: "Clean water is essential for your family's health. J. Blanton's expert team delivers comprehensive water filtration solutions, ensuring your home's water is pure and safe — right when you need it most.",
    problems_heading: 'PURE WATER WE DELIVER',
    problems_items: [
      'Water testing and analysis',
      'Water filtration system installation',
      'Water softener installation',
      'Reverse osmosis system installation',
      'Water purification solutions',
    ],
    subcategories_heading: 'Explore More Water-Quality Solutions',
    preventative_heading: 'WE CARE ABOUT CLEAN WATER TOO',
    preventative_body: "That's why we offer the No Drip Club—a comprehensive solution to ensure your water stays pure and safe, preventing and addressing water quality issues before they impact your home.",
    final_pitch_tagline: 'TURN WATER ISSUES INTO A CLEAR SOLUTION',
    final_pitch_body: "Don't let poor water quality disrupt your home! Our Chicago water quality experts are ready to restore your water's purity today.",
    articles_featured_slugs: [
      'where-did-those-pink-stains-in-your-bathroom-come-from',
      '4-headaches-you-can-avoid-with-plumbing-maintenance',
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
    ],
    subcategories: [
      { label: 'Water Filtration Systems', href: '/water-filtration-systems', image: `${CDN}/img_water-filtration-system.webp`, desc: 'Expert water filtration installation transforms tap water into clean, healthy drinking water.' },
    ],
  },

  // ── Hydro Jetting (standalone service page) ────────────────────────────
  {
    slug: 'hydro-jetting',
    hero_heading: 'Hydro Jetting in Chicagoland',
    hero_intro: 'Our licensed plumbers blast away stubborn blockages with high-pressure water up to 4,000 PSI — no chemicals, no guesswork, just documented results.',
    intro_heading: 'Hydro Jetting Experts You Should Call',
    intro_body: 'If your drains are slow, gurgling, or backing up repeatedly, standard snaking may not be enough. J. Blanton Plumbing offers professional hydro jetting services throughout Chicagoland that blast away even the most stubborn blockages with high-pressure water — no harsh chemicals, no guesswork.\n\nHydro jetting uses a specialized nozzle to deliver water at pressures up to 4,000 PSI through your drain and sewer lines. This powerful stream cuts through grease accumulation, mineral scale, tree root intrusion, and years of built-up debris — restoring full flow and cleaning the pipe walls, not just punching a hole through the clog.\n\nOur licensed plumbers perform a video camera inspection before and after every jetting service so you can see exactly what was there and how thoroughly it was cleared. No surprises, no upsell — just documented results.',
    problems_heading: 'Reliable Solutions for Common Drain Problems',
    problems_items: [
      'Recurring slow drains despite previous clearing attempts',
      'Multiple fixtures backing up at once',
      'Grease accumulation and mineral scale in sewer lines',
      'Tree root intrusion',
      'Foul odors from drains',
    ],
    subcategories_heading: 'More Drain & Sewer Solutions',
    preventative_heading: 'Preventive Hydro Jetting for Healthier Pipes',
    preventative_body: 'Routine hydro jetting — performed every one to two years — can significantly reduce the need for emergency drain service.\n\nRegular high-pressure cleaning prevents grease accumulation, mineral scale, and root intrusion from building up to crisis levels. Addressing the issue proactively minimizes the chances of a backed-up sewer or flooded basement.\n\nA little maintenance now can save you from a major emergency later. Our team will help you set up a jetting schedule matched to your property\'s specific history and needs.',
    final_pitch_tagline: 'Schedule Hydro Jetting Service Today',
    final_pitch_body: "Don't wait for a minor clog to turn into a major sewer backup. Scheduling professional hydro jetting at the first sign of trouble can save time and money. Our friendly team makes booking easy — same-day service available.",
    articles_featured_slugs: [],
    subcategories: [
      { label: 'Sewer Rodding', href: '/sewer-rodding', image: `${CDN}/img_sewer-rodding.webp`, desc: 'Professional sewer rodding services clear stubborn blockages deep within your sewer lines for lasting results.' },
      { label: 'Drain Cleaning', href: '/drain-cleaning-services-in-chicago', image: `${CDN}/img_clogged-drains.webp`, desc: 'Expert drain cleaning services in Chicago transform drainage problems into lasting solutions.' },
    ],
  },

  // ── Sewer Rodding (standalone service page) ────────────────────────────
  {
    slug: 'sewer-rodding',
    hero_heading: 'Sewer Rodding in Chicagoland',
    hero_intro: 'Our licensed plumbers clear stubborn blockages deep within your sewer lines with professional rodding services built for lasting results.',
    intro_heading: 'Sewer Rodding Experts You Should Call',
    intro_body: 'Our licensed plumbers provide expert rodding services to clear stubborn blockages deep within your sewer lines.\n\nWe use advanced equipment to ensure sewer rodding is thorough and effective without damaging your pipes. From minor clogs to major backups, our sewer rodding services are tailored to your specific situation.\n\nWe focus on long-term results, not temporary fixes. When rodding a blocked drain, our goal is to restore full flow and prevent repeat issues.',
    problems_heading: 'Reliable Solutions for Common Sewer Rodding Problems',
    problems_items: [
      'Grease and sludge buildup in sewer lines',
      'Tree root intrusion',
      'Repeated drain backups',
      'Slow or gurgling drains',
    ],
    subcategories_heading: 'More Sewer Rodding Solutions',
    preventative_heading: 'Preventive Maintenance for Healthier Sewer Lines',
    preventative_body: 'Routine maintenance can significantly reduce the need for emergency sewer rodding.\n\nRegular inspections and drain cleaning help prevent debris buildup and root intrusion. Addressing small issues early minimizes the chances of needing rodding a blocked drain unexpectedly. Preventive rodding services also extend the life of your sewer system.\n\nA little maintenance now can save you from major sewer rodding services later.',
    final_pitch_tagline: 'Schedule Sewer Rodding Service Today',
    final_pitch_body: "Don't wait for a minor clog to turn into a major sewer problem. Scheduling professional sewer rodding at the first sign of trouble can save time and money. Our friendly team makes booking easy.",
    articles_featured_slugs: [],
    subcategories: [
      { label: 'Drain Cleaning', href: '/drain-cleaning-services-in-chicago', image: `${CDN}/img_clogged-drains.webp`, desc: 'Professional drain cleaning services in Chicago transform drainage problems into lasting solutions.' },
      { label: 'Hydro Jetting', href: '/hydro-jetting', image: `${CDN}/img_hydro-jetting.webp`, desc: 'Professional hydro jetting service eliminates stubborn pipe blockages quickly and effectively.' },
    ],
  },

  // ── Commercial ──────────────────────────────────────────────────────────
  {
    slug: 'commercial',
    hero_heading: 'J. BLANTON KEEP YOUR BUSINESS FLOWING',
    hero_intro: "If your business is experiencing plumbing issues, we're here to help! From clogged drains to water heater problems, our expert team delivers fast, reliable solutions to keep your operations running smoothly.",
    intro_heading: 'PLUMBING EXPERTS STANDING BY',
    intro_body: "When it comes to commercial plumbing, every service matters. At J. Blanton, you're not just getting a single technician—you're backed by a full team of plumbing experts. Whatever the issue, we'll send the right professional to your door, ready to diagnose and resolve the problem with precision and expertise you can trust.",
    problems_heading: 'COMMERCIAL PLUMBING SERVICES',
    problems_items: [],
    subcategories_heading: 'Explore More Commercial Plumbing Solutions',
    preventative_heading: 'WE HATE PLUMBING PROBLEMS TOO',
    preventative_body: "That's why we created COMMERCIAL PLUMBING EXPERTS, a comprehensive commercial plumbing solution that helps businesses maintain efficient operations through expert drain services, water heater installations, and specialized restaurant plumbing maintenance.",
    final_pitch_tagline: 'WE TURN PLUMBING PROBLEMS INTO PLUMBING CONFIDENCE',
    final_pitch_body: 'Why let plumbing problems disrupt your business? Trust our commercial plumbing experts for fast, reliable solutions that keep your operations running smoothly.',
    articles_featured_slugs: [
      'brown-friday-plumbing-drain-clog-emergency',
      '4-headaches-you-can-avoid-with-plumbing-maintenance',
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
    ],
    subcategories: [
      { label: 'Commercial Jetting', href: '/commercial-jetting', image: `${CDN}/Commercial+Jetting+copy.webp`, desc: '' },
      { label: 'Commercial Drain Service', href: '/commercial-drain-service', image: `${CDN}/drain-hero.webp`, desc: '' },
      { label: 'Commercial Water Heater', href: '/commercial-water-heater', image: `${CDN}/img_commercial-water-heater.webp`, desc: '' },
      { label: 'Restaurant Plumbing Service', href: '/restaurant-plumbing-services', image: `${CDN}/img_restaurant-plumbing-services.webp`, desc: '' },
      { label: 'Restaurant Drain Clearing', href: '/restaurant-drain-clearing', image: `${CDN}/sewer.webp`, desc: '' },
      { label: 'Restaurant Water Heater', href: '/restaurant-water-heater', image: `${CDN}/commercial-water-heater.webp`, desc: '' },
    ],
  },
];

// ---------------------------------------------------------------------------

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO global_content (id, service_area_heading, service_area_body, tiktok_headline)
       VALUES (1, $1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [globalRow.service_area_heading, globalRow.service_area_body, globalRow.tiktok_headline]
    );

    for (const page of pages) {
      await client.query(
        `INSERT INTO service_category_pages (
           slug, hero_heading, hero_intro, intro_heading, intro_body,
           problems_heading, problems_items, subcategories_heading,
           preventative_heading, preventative_body,
           final_pitch_tagline, final_pitch_body, articles_featured_slugs
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (slug) DO NOTHING`,
        [
          page.slug, page.hero_heading, page.hero_intro, page.intro_heading, page.intro_body,
          page.problems_heading, JSON.stringify(page.problems_items), page.subcategories_heading,
          page.preventative_heading, page.preventative_body,
          page.final_pitch_tagline, page.final_pitch_body, JSON.stringify(page.articles_featured_slugs),
        ]
      );

      // Only insert subcategories if none exist yet — prevents duplicate rows on re-runs
      // (service_subcategories has no unique constraint so ON CONFLICT DO NOTHING is a no-op)
      const existingSubCount = await client.query(
        'SELECT COUNT(*) FROM service_subcategories WHERE page_slug = $1',
        [page.slug]
      );
      if (existingSubCount.rows[0].count === '0') {
        for (let i = 0; i < page.subcategories.length; i++) {
          const sub = page.subcategories[i];
          await client.query(
            `INSERT INTO service_subcategories (page_slug, label, href, description, sort_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [page.slug, sub.label, sub.href, sub.desc, i]
          );
        }
      }
    }

    // ── Emergency Plumbing page ──────────────────────────────────────────────
    await client.query(`CREATE TABLE IF NOT EXISTS emergency_plumbing_page (
      id                SERIAL PRIMARY KEY,
      hero_heading      TEXT NOT NULL,
      hero_description  TEXT NOT NULL,
      f_heading         TEXT NOT NULL,
      f_body            TEXT NOT NULL,
      card_heading      TEXT NOT NULL,
      card_items        JSONB NOT NULL DEFAULT '[]',
      map_heading       TEXT NOT NULL,
      map_body          TEXT NOT NULL,
      f2_heading        TEXT NOT NULL,
      f2_body           TEXT NOT NULL,
      f3_heading        TEXT NOT NULL,
      f3_body           TEXT NOT NULL,
      updated_at        TIMESTAMP DEFAULT NOW()
    )`);

    // Brief 32 — add image columns
    await client.query(`
      ALTER TABLE emergency_plumbing_page
        ADD COLUMN IF NOT EXISTS hero_image  TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS f_image     TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS f2_image    TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS f3_image    TEXT NOT NULL DEFAULT ''
    `);

    await client.query(
      `INSERT INTO emergency_plumbing_page (
         hero_heading, hero_description,
         hero_image, f_image, f2_image, f3_image,
         f_heading, f_body,
         card_heading, card_items,
         map_heading, map_body,
         f2_heading, f2_body,
         f3_heading, f3_body
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT DO NOTHING`,
      [
        "J. BLANTON, WHAT'S YOUR EMERGENCY?",
        "We provide 24/7 service for plumbing emergencies. If you're facing an urgent issue like a burst pipe or clogged drain, don't hesitate—pick up the phone and call us! We'll be there to turn an unexpected problem into a Good Call.",
        /* hero_image, f_image, f2_image, f3_image */ '', '', '', '',
        'PLUMBERS AT THE READY',
        "In an emergency, every second counts. J. Blanton isn't just one plumber—we're a full team of professionals ready to act fast. Whatever the problem, we'll have the right person at your door, ready to make the right call.",
        'EMERGENCIES WE FIX',
        JSON.stringify(['Kitchen plumbing repair', 'Bathroom plumbing repair', 'Sewer line repair', 'Water leak repair', 'Water heater repair']),
        "WE'RE ALMOST EVERYWHERE",
        "With more plumbers and more trucks at our disposal, we can cover more ground and reach your home quickly. Use our map to see if we cover your location, or give us a call for immediate assistance.",
        'WE HATE EMERGENCIES TOO',
        "That's why we created the No Drip Club, a complete peace of mind solution that helps you save on unexpected expenses.",
        'TURN A BAD SITUATION INTO A GOOD CALL',
        "What are you waiting for? The sooner you call, the sooner we'll be there.",
      ]
    );

    // ── City Pages ────────────────────────────────────────────────────────────
    await client.query(`CREATE TABLE IF NOT EXISTS city_pages (
      id                  SERIAL PRIMARY KEY,
      city_slug           VARCHAR(100) UNIQUE NOT NULL,
      city_type           VARCHAR(50)  NOT NULL,
      hero_heading_line1  TEXT NOT NULL,
      hero_heading_line2  TEXT,
      hero_description    TEXT NOT NULL,
      faqs                JSONB NOT NULL DEFAULT '[]',
      updated_at          TIMESTAMP DEFAULT NOW()
    )`);

    // Brief 32 — add new content columns
    await client.query(`
      ALTER TABLE city_pages
        ADD COLUMN IF NOT EXISTS hero_image      TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS hero_callout    TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS content_heading TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS content_body    TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS f2_heading      TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS f2_body         TEXT NOT NULL DEFAULT ''
    `);

    const waterTestingFaqs = [
      {
        question: 'How can water testing help identify any potential issues with my household water supply that may not be visible or noticeable?',
        answer: 'Water testing can help identify potential issues with your household water supply by detecting contaminants, such as bacteria, lead, pesticides, or other harmful substances that may not be visible or noticeable. Testing can also determine the pH levels, hardness, and other factors that can affect the quality of your water and potentially cause health problems or damage to your plumbing system. Regular water testing is essential to ensure the safety and quality of your drinking water.',
      },
      {
        question: 'What are the potential health risks associated with not regularly testing my household water, and how can water testing help prevent these risks?',
        answer: 'Potential health risks associated with not regularly testing household water include exposure to harmful contaminants such as bacteria, lead, pesticides, and other pollutants. Water testing can help prevent these risks by identifying any contaminants present in the water supply, allowing for appropriate treatment or filtration measures to be implemented to ensure the water is safe for consumption. Regular testing can also help detect any issues early on before they become a serious health concern for you and your family.',
      },
      {
        question: 'How often should I have my water tested to ensure the continued safety and quality of my household water supply?',
        answer: 'It is recommended to have your water tested annually to ensure the continued safety and quality of your household water supply.',
      },
      {
        question: 'What specific contaminants can water testing detect, and how can addressing these improve the overall health and safety of my household water supply?',
        answer: 'Water testing can detect contaminants such as bacteria, lead, pesticides, nitrates, and other harmful substances. Addressing these contaminants can improve the overall health and safety of your household water supply by reducing the risk of waterborne illnesses, protecting against potential long-term health effects, and ensuring that your water meets regulatory standards for safe drinking water.',
      },
      {
        question: "Can you explain the process of water testing and how it can benefit my home's water quality?",
        answer: "Water testing involves collecting samples of your home's water and analyzing them for various contaminants such as bacteria, lead, pesticides, and other harmful substances. By conducting water testing, you can identify any potential issues with your water quality and take appropriate measures to address them, such as installing water filtration systems or treatment devices. Regular water testing can help ensure that your family has access to clean and safe drinking water.",
      },
    ];

    // Evanston — Local Office (DO UPDATE to populate new Brief 32 columns)
    await client.query(
      `INSERT INTO city_pages (
         city_slug, city_type,
         hero_image, hero_heading_line1, hero_heading_line2,
         hero_callout, hero_description,
         content_heading, content_body,
         f2_heading, f2_body,
         faqs
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (city_slug) DO UPDATE SET
         hero_image       = EXCLUDED.hero_image,
         hero_heading_line1 = EXCLUDED.hero_heading_line1,
         hero_heading_line2 = EXCLUDED.hero_heading_line2,
         hero_callout     = EXCLUDED.hero_callout,
         hero_description = EXCLUDED.hero_description,
         content_heading  = EXCLUDED.content_heading,
         content_body     = EXCLUDED.content_body,
         f2_heading       = EXCLUDED.f2_heading,
         f2_body          = EXCLUDED.f2_body,
         faqs             = EXCLUDED.faqs,
         updated_at       = NOW()`,
      [
        'evanston', 'local-office',
        /* hero_image      */ '',
        /* line1           */ 'EVANSTON PLUMBING EXPERTS',
        /* line2           */ 'PROUDLY SERVING EVANSTON FOR OVER 30 YEARS',
        /* hero_callout    */ '',
        /* hero_description*/ "Evanston is where you call home, and when plumbing issues like a burst pipe or a flooded kitchen arise, it can feel overwhelming. At J. Blanton Plumbing, we're proud to serve our fellow Evanston residents with fast, expert solutions that restore comfort and peace to your home.",
        /* content_heading */ 'WHY J. BLANTON FOR EVANSTON PLUMBING',
        /* content_body    */ "At J. Blanton Plumbing, we've been Evanston's trusted local experts for over 30 years, delivering fast, reliable solutions for everything from clogged drains to emergency repairs. With over 16,000 homes in this vibrant city of tree-lined streets and historic charm, residents rely on our Illinois-certified plumbers for same-day service, upfront pricing, and expert care. Whether it's a quick fix or a full plumbing overhaul, we're dedicated to keeping Evanston's homes from early 1900s classics to modern builds running smoothly with professional service and peace of mind.",
        /* f2_heading      */ '',
        /* f2_body         */ '',
        JSON.stringify(waterTestingFaqs),
      ]
    );

    // Elgin — Coverage Area (DO UPDATE to populate new Brief 32 columns)
    await client.query(
      `INSERT INTO city_pages (
         city_slug, city_type,
         hero_image, hero_heading_line1, hero_heading_line2,
         hero_callout, hero_description,
         content_heading, content_body,
         f2_heading, f2_body,
         faqs
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (city_slug) DO UPDATE SET
         hero_image       = EXCLUDED.hero_image,
         hero_heading_line1 = EXCLUDED.hero_heading_line1,
         hero_heading_line2 = EXCLUDED.hero_heading_line2,
         hero_callout     = EXCLUDED.hero_callout,
         hero_description = EXCLUDED.hero_description,
         content_heading  = EXCLUDED.content_heading,
         content_body     = EXCLUDED.content_body,
         f2_heading       = EXCLUDED.f2_heading,
         f2_body          = EXCLUDED.f2_body,
         faqs             = EXCLUDED.faqs,
         updated_at       = NOW()`,
      [
        'elgin', 'coverage-area',
        /* hero_image      */ '',
        /* line1           */ 'Elgin Plumber',
        /* line2           */ null,
        /* hero_callout    */ 'Highly-Rated Plumbers with Over 30 Years of Experience, 5-Star Reviews, and Same-Day Service Available. Serving Elgin for All Your Plumbing Repair Needs.',
        /* hero_description*/ '',
        /* content_heading */ '',
        /* content_body    */ `
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
        /* f2_heading      */ 'Expert Plumbing Repairs in Elgin: Your Local Solution',
        /* f2_body         */ `
    <p>Elgin, Illinois, known for its historic architecture and vibrant community, is home to over 100,000 residents. With a rich history dating back to the 19th century, Elgin boasts a diverse array of homes, from charming Victorian houses to modern developments. As a bustling city, Elgin sees its fair share of plumbing issues, from clogged drains to leaky pipes. That's where J Blanton Plumbing comes in. Our local office in Elgin is dedicated to providing top-notch plumbing services to the community, including plumbing drain repair, general plumbing repairs, and maintenance. Whether it's an emergency repair or a routine maintenance check, J Blanton Plumbing is committed to keeping the plumbing systems of Elgin running smoothly. Nestled within the vibrant neighborhood of Elgin, Illinois, J Blanton Plumbing serves as a trusted partner for all plumbing repair needs. From the historic homes along Chicago Street to the modern developments near Randall Road, our team is dedicated to providing reliable plumbing services to the diverse community of Elgin. Whether it's a simple plumbing repair or a complex drain issue, J Blanton Plumbing is committed to delivering efficient and effective solutions. With our local office conveniently located in Elgin, residents can count on us for prompt and professional plumbing services, ensuring that their homes and businesses are well-maintained and functioning smoothly.</p>
  `,
        JSON.stringify(waterTestingFaqs),
      ]
    );

    // ── City-Service Pages (Brief 37) ─────────────────────────────────────────
    await client.query(`CREATE TABLE IF NOT EXISTS city_service_pages (
      id                       SERIAL PRIMARY KEY,
      city_slug                VARCHAR(100)  NOT NULL,
      service_slug             VARCHAR(100)  NOT NULL,
      service_intro_heading    TEXT NOT NULL DEFAULT '',
      service_intro_paragraphs JSONB NOT NULL DEFAULT '[]',
      service_intro_image      TEXT NOT NULL DEFAULT '',
      secondary_heading        TEXT NOT NULL DEFAULT '',
      secondary_paragraphs     JSONB NOT NULL DEFAULT '[]',
      secondary_image          TEXT NOT NULL DEFAULT '',
      faqs                     JSONB NOT NULL DEFAULT '[]',
      updated_at               TIMESTAMP DEFAULT NOW(),
      UNIQUE (city_slug, service_slug)
    )`);

    const hydroFaqs = [
      {
        question: 'What precautions should I take before and after a hydro jetting service to ensure the safety and effectiveness of my plumbing system?',
        answer: 'Before hydro jetting, ensure all fixtures are securely closed, remove any debris or blockages near the drain, wear appropriate safety gear, and inform all occupants of the property. After hydro jetting, check for any leaks, ensure proper drainage, and schedule a follow-up inspection if necessary.',
      },
      {
        question: 'How often should hydro jetting be performed to prevent future clogs in my plumbing system?',
        answer: 'Hydro jetting should be performed every 1-2 years to prevent future clogs in your plumbing system.',
      },
      {
        question: 'What kind of maintenance is required after a hydro jetting service to ensure long-lasting results for my plumbing system?',
        answer: 'After a hydro jetting service, it is important to conduct regular inspections of your plumbing system to check for any signs of blockages or buildup. Additionally, implementing a preventive maintenance schedule that includes periodic hydro jetting services can help ensure long-lasting results for your plumbing system.',
      },
      {
        question: 'How long does a typical hydro jetting service take to complete for a residential property?',
        answer: 'A typical hydro jetting service for a residential property can take anywhere from 1 to 3 hours to complete.',
      },
      {
        question: 'What are the benefits of hydro jetting compared to traditional drain cleaning methods?',
        answer: 'Hydro jetting is more effective at removing stubborn clogs, mineral deposits, and debris from drains compared to traditional drain cleaning methods. It also helps prevent future clogs by thoroughly cleaning the pipes and restoring proper water flow. Additionally, hydro jetting is environmentally friendly as it uses high-pressure water instead of harsh chemicals.',
      },
    ];

    const hydroEvanstonIntroParagraphs = [
      'If your drains are slow, gurgling, or backing up repeatedly, standard snaking may not be enough. J. Blanton Plumbing offers professional hydro jetting services in Evanston that blast away even the most stubborn blockages with high-pressure water — no harsh chemicals, no guesswork.',
      'Hydro jetting uses a specialized nozzle to deliver water at pressures up to 4,000 PSI through your drain and sewer lines. This powerful stream cuts through grease accumulation, mineral scale, tree root intrusion, and years of built-up debris — restoring full flow and cleaning the pipe walls, not just punching a hole through the clog.',
      'Signs you may need hydro jetting include: recurring slow drains, multiple fixtures backing up at once, foul odors from your drains, gurgling sounds in your pipes, or repeated clogs in the same line despite previous clearing attempts.',
      'Our licensed plumbers in Evanston perform a video camera inspection before and after the jetting service so you can see exactly what was there and how thoroughly it was cleared. No surprises, no upsell — just documented results.',
      'Hydro jetting is safe for most residential and commercial plumbing systems when performed by a trained professional. We assess your pipe material and condition before every job to ensure the pressure settings are appropriate for your system.',
      'J. Blanton Plumbing has been serving Evanston and the greater Chicagoland area for over 30 years. We offer 24/7 emergency availability, upfront pricing, and a satisfaction guarantee on every hydro jetting service.',
    ];

    const hydroEvanstonSecondaryParagraphs = [
      'When Evanston homeowners and businesses need reliable drain and sewer cleaning, J. Blanton Plumbing delivers hydro jetting solutions that go far beyond a standard snake. Our McHenry-area office serves Evanston with fast response times and Illinois-certified plumbers who understand the local infrastructure.',
      'Hydro jetting is the preferred method for commercial kitchens, older homes with grease-prone lines, and any property dealing with recurring sewer drain problems. The high-pressure water not only removes existing blockages but scours the pipe walls clean — significantly delaying the return of future buildup.',
      "Whether you're dealing with a slow bathroom drain, a backed-up main sewer line, or a commercial grease trap that needs clearing, our Evanston hydro jetting team arrives fully equipped. We bring the camera, the jetter, and the expertise to diagnose and solve the problem in a single visit whenever possible.",
    ];

    await client.query(
      `INSERT INTO city_service_pages (
         city_slug, service_slug,
         service_intro_heading, service_intro_paragraphs, service_intro_image,
         secondary_heading, secondary_paragraphs, secondary_image,
         faqs
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (city_slug, service_slug) DO NOTHING`,
      [
        'evanston', 'hydro-jetting',
        'Clear Stubborn Clogs with Hydro Jetting Services in Evanston',
        JSON.stringify(hydroEvanstonIntroParagraphs),
        '/images/img_hydro-jetting.webp',
        'Hydro Jetting Services in Evanston: Clearing Drains with Precision',
        JSON.stringify(hydroEvanstonSecondaryParagraphs),
        '/images/manplumber.webp',
        JSON.stringify(hydroFaqs),
      ]
    );

    const hydroElginIntroParagraphs = [
      'If your drains are slow, gurgling, or backing up repeatedly, standard snaking may not be enough. J. Blanton Plumbing offers professional hydro jetting services in Elgin that blast away even the most stubborn blockages with high-pressure water — no harsh chemicals, no guesswork.',
      'Hydro jetting uses a specialized nozzle to deliver water at pressures up to 4,000 PSI through your drain and sewer lines. This powerful stream cuts through grease accumulation, mineral scale, tree root intrusion, and years of built-up debris — restoring full flow and cleaning the pipe walls, not just punching a hole through the clog.',
      'Signs you may need hydro jetting include: recurring slow drains, multiple fixtures backing up at once, foul odors from your drains, gurgling sounds in your pipes, or repeated clogs in the same line despite previous clearing attempts.',
      'Our licensed plumbers in Elgin perform a video camera inspection before and after the jetting service so you can see exactly what was there and how thoroughly it was cleared. No surprises, no upsell — just documented results.',
      'Hydro jetting is safe for most residential and commercial plumbing systems when performed by a trained professional. We assess your pipe material and condition before every job to ensure the pressure settings are appropriate for your system.',
      'J. Blanton Plumbing has been serving Elgin and the greater Chicagoland area for over 30 years. We offer 24/7 emergency availability, upfront pricing, and a satisfaction guarantee on every hydro jetting service.',
    ];

    const hydroElginSecondaryParagraphs = [
      'When Elgin homeowners and businesses need reliable drain and sewer cleaning, J. Blanton Plumbing delivers hydro jetting solutions that go far beyond a standard snake. Our McHenry-area office serves Elgin with fast response times and Illinois-certified plumbers who understand the local infrastructure.',
      'Hydro jetting is the preferred method for commercial kitchens, older homes with grease-prone lines, and any property dealing with recurring sewer drain problems. The high-pressure water not only removes existing blockages but scours the pipe walls clean — significantly delaying the return of future buildup.',
      "Whether you're dealing with a slow bathroom drain, a backed-up main sewer line, or a commercial grease trap that needs clearing, our Elgin hydro jetting team arrives fully equipped. We bring the camera, the jetter, and the expertise to diagnose and solve the problem in a single visit whenever possible.",
    ];

    await client.query(
      `INSERT INTO city_service_pages (
         city_slug, service_slug,
         service_intro_heading, service_intro_paragraphs, service_intro_image,
         secondary_heading, secondary_paragraphs, secondary_image,
         faqs
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (city_slug, service_slug) DO NOTHING`,
      [
        'elgin', 'hydro-jetting',
        'Clear Stubborn Clogs with Hydro Jetting Services in Elgin',
        JSON.stringify(hydroElginIntroParagraphs),
        '/images/img_hydro-jetting.webp',
        'Hydro Jetting Services in Elgin: Clearing Drains with Precision',
        JSON.stringify(hydroElginSecondaryParagraphs),
        '/images/manplumber.webp',
        JSON.stringify(hydroFaqs),
      ]
    );

    await client.query('COMMIT');
    console.log(`Seed complete. ${pages.length} service pages + emergency plumbing + 2 city pages + 2 city-service rows seeded.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
