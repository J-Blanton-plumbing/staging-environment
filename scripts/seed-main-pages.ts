import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const pages: Array<{ slug: string; content: Record<string, unknown> }> = [
  {
    slug: 'home',
    content: {
      hero_heading: 'Plumbing Experts',
      hero_cta: 'Make a Good Call!',
      hero_tagline: 'Proudly Serving Chicago and Suburbs for Over 30 Years',
      hero_intro: 'Home is where life happens, but unexpected disruptions like a burst pipe or a kitchen flood can shatter the peace. When the unexpected strikes, trust J. Blanton Plumbing to be there.',
      services_heading: 'SERVICES',
      services_intro: 'Our team of tenacious plumbers are always ready to leap into action to save your day, no matter how light or severe the situation.',
      why_heading: 'WHY J. BLANTON',
      why_body: "At J Blanton, we understand the importance of an owner's home. We know that when disaster strikes, you need more than just a plumber; you need a problem solver who can bring fast relief to unexpected chaos.\n\nFor more than 30 years, our professionals have raced through heat, rain, snow, and hail to restore order and peace back into the homes of many Chicagoland families.",
      knowledge_hub_heading: 'KNOWLEDGE HUB',
      knowledge_hub_intro: "Check out the knowledge hub for FAQ's and helpful tips on all things plumbing.",
      find_us_heading: 'FIND US',
      find_us_body: "We’ve proudly served the Chicagoland area for 30+ years.\n\nContact us or use the site map to find the location that’s nearest to you.",
    },
  },
  {
    slug: 'why-j-blanton',
    content: {
      hero_heading: 'WHY J. BLANTON',
      hero_subheading: "At J Blanton, we understand the importance of an owner's home. We know that when disaster strikes, you need more than just a plumber; you need a problem solver who can bring fast relief to unexpected chaos.",
      hero_description: 'For more than 30 years, our professionals have raced through heat, rain, snow, and hail to restore order and peace back into the homes of many Chicagoland families.',
      hero_cta: 'SCHEDULE A SERVICE',
      about_us_heading: 'ABOUT US',
      about_us_body: "At J. Blanton Plumbing, we've proudly served Chicagoland since 1993, solving plumbing problems for families with unmatched expertise and 5-star service. For over 30 years, our commitment to quality and cutting-edge solutions has made us a trusted name in the plumbing industry. With offices throughout the Chicagoland region, we deliver modern plumbing services while staying dedicated to the growth and success of skilled trades for future generations.",
      what_to_expect_heading: 'WHAT TO EXPECT',
      what_to_expect_body: "When you choose J. Blanton Plumbing, you can expect same-day service, clear upfront pricing, and professional care every step of the way. Our licensed and bonded technicians arrive in fully stocked vehicles, ready to handle any repair or service on the spot. With highly trained, uniformed experts at your service, you'll enjoy a hassle-free experience from start to finish.",
      meet_our_team_heading: 'MEET OUR TEAM',
      meet_our_team_body: "Our team of licensed, bonded, and highly trained plumbing professionals is passionate about providing exceptional service. Each technician is equipped with the expertise, tools, and professionalism to get the job done right the first time. When you call J. Blanton Plumbing, you're not just getting a plumber—you're getting a dedicated team committed to your satisfaction.",
      our_locations_heading: 'OUR LOCATIONS',
      our_locations_body: "With multiple locations across Chicagoland, J. Blanton Plumbing is always nearby to serve your community. Our wide coverage ensures same-day emergency response, bringing reliable and efficient plumbing solutions to your neighborhood. No matter where you are, we're ready to help.",
      join_our_team_heading: 'JOIN OUR TEAM',
      join_our_team_body: 'Join the JBP Team and grow with a company that values teamwork, education, and providing a 5-star customer experience. Enjoy competitive pay, comprehensive benefits, including health insurance, paid time off, a company truck, and opportunities for ongoing training in sales, leadership, and mechanical techniques. Qualified candidates with a plumbing license and residential experience can apply today.',
    },
  },
  {
    slug: 'no-drip-club',
    content: {
      hero_heading: 'JOIN THE NO DRIP CLUB',
      hero_description: "There are Good Calls—and then there's the No Drip Club. Members enjoy significant annual savings on home checkups, emergency repairs, and unlock exclusive perks, including VIP treatment whenever they call for service.",
      hero_cta: 'Join Today',
      pricing: 'All for just $29.97/month**',
      how_heading: 'HOW IT WORKS',
      wait_heading: 'WHAT ARE YOU WAITING FOR?',
      wait_body: 'Still not convinced? Need more info?',
      wait_cta: 'CONTACT US',
    },
  },
  {
    slug: 'knowledge-hub',
    content: {
      hero_heading: 'KNOWLEDGE HUB',
      intro_label: 'HELPFUL ARTICLES',
      intro_body: 'Our team of tenacious plumbers are always ready to leap into action to save your day, no matter how light or severe the situation.',
      intro_cta: 'VIEW SERVICES',
      faqs_label: 'FAQ',
      faqs_body: "Got questions? Whether you're curious about our services, need tips for maintaining your plumbing, or want to know what sets J. Blanton Plumbing apart, you'll find the answers right here.",
    },
  },
  {
    slug: 'customer-stories',
    content: {
      hero_heading: 'SEE WHAT OUR CUSTOMERS ARE SAYING',
      hero_description: 'Real reviews from real customers - we are proud to share their experience.',
      behind_review_heading: 'BEHIND THE REVIEW:',
      cta_heading: 'Need a trusted plumber in Chicago?',
      cta_body: 'Join thousands of satisfied customers who trust J. Blanton Plumbing for their plumbing needs.',
    },
  },
  {
    slug: 'financing',
    content: {
      hero_heading: "J. BLANTON, LET'S TALK FINANCING OPTIONS",
      hero_description: "Flexible Financing Solutions for Your Plumbing Needs. Don't let budget concerns stop you from getting essential repairs. With our easy payment plans and quick approval process, you can get the plumbing service you need today. Call us to learn about our financing options and keep your home running smoothly!",
      financing_ready_label: 'FINANCING SOLUTIONS READY',
      financing_ready_body: "Don't let finances delay essential plumbing work. With J. Blanton's flexible financing options, you can get expert service now and pay over time. Our team works with trusted financial partners to make repairs and replacements affordable for every budget.",
      financing_simple_label: 'FINANCING MADE SIMPLE',
      coverage_heading: "WE'RE ALMOST EVERYWHERE",
      coverage_body: 'With more plumbers and more trucks at our disposal, we can cover more ground and reach your home quickly.',
      surprise_bills_label: 'WE HATE SURPRISE BILLS TOO',
      surprise_bills_body: "That's why we created the No Drip Club, a complete peace of mind solution that helps you avoid unexpected water quality issues and costly repairs. With flexible financing options, you can maintain your home's water systems without breaking the bank.",
      bottom_cta_label: 'TURN A TIGHT SPOT INTO A SMART PLAN',
      bottom_cta_body: 'What are you waiting for? Get the financing you need today and make your plumbing repairs affordable.',
    },
  },
  {
    slug: 'locations',
    content: {
      hero_heading: 'CHICAGO & SUBURBS TOP-RATED PLUMBING COMPANY',
      hero_description: 'For over 30 years, J. Blanton Plumbing has been the trusted choice for plumbing services in Chicago and the surrounding suburbs. From burst pipes to kitchen floods, no matter where you are, our team is ready 24/7 to restore your home\'s comfort.',
      hero_cta: 'SCHEDULE A SERVICE',
      intro_label: 'Your Trusted Plumbing Experts Serving Chicago and Suburbs',
      intro_body: "At J. Blanton Plumbing, we've proudly serving Chicago and its surrounding suburbs for over 30 years. Our team of experienced and certified plumbers is committed to delivering high-quality service that our customers can rely on-day or night.\n\nWhether you're in the heart of the city or in suburbs like Northbrook, Arlington Heights, or Evanston, we're here to address all your plumbing needs.",
    },
  },
  {
    slug: 'help-and-support',
    content: {
      hero_heading: "J BLANTON PLUMBING - WE'RE HERE TO HELP",
      hero_description: 'Find answers, support, and solutions for all your plumbing needs – right when you need them.',
      customer_service_label: 'CUSTOMER SERVICE',
      customer_service_body: "At J Blanton Plumbing, customer satisfaction is our top priority. Whether you have questions about a recent service, need assistance scheduling an appointment, or want to know more about our offerings, our friendly customer service team is here to help. Contact us today, and we'll ensure your experience is smooth and stress-free.",
      billing_questions_label: 'BILLING QUESTIONS',
      billing_questions_body: "Have questions about your invoice or payment options? Our billing team is ready to assist you. Whether you need clarification on a charge, want to set up a payment plan, or explore financing options, we're here to provide clear and simple solutions. Reach out to us for fast, accurate answers.",
      plumbing_issue_label: 'HAVE A PLUMBING ISSUE?',
      plumbing_issue_body: "Dealing with a plumbing problem? Don't worry – J Blanton Plumbing is here to help. From emergency repairs to routine maintenance, our licensed professionals are just a call away. Click the button below to schedule a service and let us quickly diagnose the issue and provide reliable, high-quality solutions to get your home or business back on track.",
    },
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS main_pages (
        id               SERIAL PRIMARY KEY,
        slug             TEXT UNIQUE NOT NULL,
        content          JSONB NOT NULL DEFAULT '{}',
        meta_title       TEXT,
        meta_description TEXT,
        updated_by       TEXT,
        updated_at       TIMESTAMPTZ DEFAULT NOW(),
        created_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    for (const page of pages) {
      await client.query(
        `INSERT INTO main_pages (slug, content) VALUES ($1, $2)
         ON CONFLICT (slug) DO NOTHING`,
        [page.slug, JSON.stringify(page.content)]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${pages.length} main pages.`);
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
