export interface WhyJBSection {
  heading: string;
  body: string;
  image: string;
  imageAlt: string;
}

export interface WhyJBSectionWithCta extends WhyJBSection {
  cta: { label: string; href: string };
}

export interface WhyJBContent {
  hero: {
    heading: string;
    subheading: string;
    description: string;
    cta: string;
    videoSrc: string;
    videoTitle: string;
    patternImage: string;
  };
  aboutUs: WhyJBSection;
  whatToExpect: WhyJBSection;
  meetOurTeam: WhyJBSection;
  ourLocations: WhyJBSectionWithCta;
  joinOurTeam: WhyJBSectionWithCta;
}

export const WHY_JB: WhyJBContent = {
  hero: {
    heading: 'WHY J. BLANTON',
    subheading:
      "At J Blanton, we understand the importance of an owner's home. We know that when disaster strikes, you need more than just a plumber; you need a problem solver who can bring fast relief to unexpected chaos.",
    description:
      'For more than 30 years, our professionals have raced through heat, rain, snow, and hail to restore order and peace back into the homes of many Chicagoland families.',
    cta: 'SCHEDULE A SERVICE',
    videoSrc: 'https://www.youtube-nocookie.com/embed/ZDFzUtjBUCk?controls=0&rel=0&fs=0',
    videoTitle: 'The J. Blanton Difference',
    patternImage: 'https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp',
  },
  aboutUs: {
    heading: 'ABOUT US',
    body: "At J. Blanton Plumbing, we've proudly served Chicagoland since 1993, solving plumbing problems for families with unmatched expertise and 5-star service. For over 30 years, our commitment to quality and cutting-edge solutions has made us a trusted name in the plumbing industry. With offices throughout the Chicagoland region, we deliver modern plumbing services while staying dedicated to the growth and success of skilled trades for future generations.",
    image: 'https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp',
    imageAlt: 'J. Blanton plumber providing preventative service',
  },
  whatToExpect: {
    heading: 'WHAT TO EXPECT',
    body: "When you choose J. Blanton Plumbing, you can expect same-day service, clear upfront pricing, and professional care every step of the way. Our licensed and bonded technicians arrive in fully stocked vehicles, ready to handle any repair or service on the spot. With highly trained, uniformed experts at your service, you'll enjoy a hassle-free experience from start to finish.",
    image: 'https://d1rplazj5a80fb.cloudfront.net/images/expect-whyjb.webp',
    imageAlt: 'J. Blanton technician explaining what to expect',
  },
  meetOurTeam: {
    heading: 'MEET OUR TEAM',
    body: "Our team of licensed, bonded, and highly trained plumbing professionals is passionate about providing exceptional service. Each technician is equipped with the expertise, tools, and professionalism to get the job done right the first time. When you call J. Blanton Plumbing, you're not just getting a plumber—you're getting a dedicated team committed to your satisfaction.",
    image: 'https://d1rplazj5a80fb.cloudfront.net/images/meet-team.webp',
    imageAlt: 'J. Blanton team photo',
  },
  ourLocations: {
    heading: 'OUR LOCATIONS',
    body: "With multiple locations across Chicagoland, J. Blanton Plumbing is always nearby to serve your community. Our wide coverage ensures same-day emergency response, bringing reliable and efficient plumbing solutions to your neighborhood. No matter where you are, we're ready to help.",
    image: 'https://d1rplazj5a80fb.cloudfront.net/images/locations2.png',
    imageAlt: 'J. Blanton Chicagoland coverage area map',
    cta: { label: 'VIEW OUR LOCATIONS AND COVERAGE AREA', href: '/locations' },
  },
  joinOurTeam: {
    heading: 'JOIN OUR TEAM',
    body: 'Join the JBP Team and grow with a company that values teamwork, education, and providing a 5-star customer experience. Enjoy competitive pay, comprehensive benefits, including health insurance, paid time off, a company truck, and opportunities for ongoing training in sales, leadership, and mechanical techniques. Qualified candidates with a plumbing license and residential experience can apply today.',
    image: 'https://d1rplazj5a80fb.cloudfront.net/images/hiring.webp',
    imageAlt: 'Join the J. Blanton Plumbing team',
    cta: { label: 'Join our Team', href: '/j-blanton-is-hiring' },
  },
};
