import type { CityServiceContent } from '@/types/city-service';

export const PLUMBING_SERVICES: CityServiceContent = {
  serviceSlug: 'plumbing-services',
  serviceTitle: 'Plumbing Services',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} — Full-Service Plumbing for Every Need. Same-Day Service Available.',

  serviceHeroImage: '/images/plumbing-hero.jpg',

  seo: {
    title: 'Plumbing Services in {city} | J. Blanton Plumbing',
    description:
      'Complete residential and commercial plumbing services in {city}. Repairs, installations, drain cleaning, water heaters, and more. Licensed plumbers. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Complete Plumbing Services in {city}',
    paragraphs: [
      'J. Blanton Plumbing is the full-service plumbing company {city} homeowners and businesses have trusted for over 30 years. From routine repairs to emergency response to large-scale installations, our licensed plumbers handle every plumbing need — large and small.',
      'Our {city} plumbing services include: drain cleaning and clog clearing, water heater repair and replacement, pipe repair and replacement, fixture installation, toilet and faucet repair, sewer line service, gas line work, flood control installation, and 24/7 emergency plumbing response.',
      'We serve both residential and commercial clients in {city} — from single-family homes to apartment buildings, restaurants, office complexes, and retail properties. Our team has the licensing, experience, and equipment to handle plumbing systems of any scale.',
      'J. Blanton Plumbing is Illinois-licensed, fully insured, and has built its reputation on transparent pricing, honest assessments, and quality workmanship that stands up over time.',
      'Whatever your {city} plumbing need — a dripping faucet or a major sewer repair — we arrive prepared, diagnose the problem accurately, and complete the work to a standard that holds.',
    ],
    image: '/images/plumbing-hero.jpg',
  },

  secondarySection: {
    heading: 'Plumbing Services in {city}: Your Local Plumbing Partner',
    image: '/images/manplumber.webp',
    paragraphs: [
      '{city} homeowners choose J. Blanton Plumbing because we provide the full range of plumbing services — and because our 30-year track record speaks for itself. We are not a call center that dispatches unknown subcontractors. Every technician is a J. Blanton employee and an Illinois-licensed plumber.',
      'We offer same-day service for most plumbing calls in {city}. When you call, a real person answers and dispatches a plumber — not a chatbot or an automated system. We respect your time and give you a clear arrival window.',
      'From Evanston to the North Shore to the greater Chicagoland area, J. Blanton Plumbing has earned the trust of thousands of {city} homeowners and businesses through consistent, honest, professional service.',
    ],
  },

  faqs: [
    {
      question: 'Are your plumbers licensed and insured?',
      answer:
        'Yes. Every J. Blanton Plumbing technician is an Illinois-licensed plumber. We carry full liability insurance and workers\' compensation on all work performed in {city} and surrounding communities.',
    },
    {
      question: 'Do you offer same-day plumbing service in {city}?',
      answer:
        'Yes. We offer same-day service for most plumbing calls and 24/7 emergency response for urgent situations. Call (773) 724-9272 to speak with our dispatch team.',
    },
    {
      question: 'Do you provide free estimates?',
      answer:
        'We provide upfront pricing before any work begins. Our plumbers diagnose the problem, explain the repair, and give you the price — so you can make an informed decision with no surprises.',
    },
    {
      question: 'What areas do you serve?',
      answer:
        'J. Blanton Plumbing serves {city} and the greater Chicagoland area including Chicago\'s North Shore, the western suburbs, the northwest suburbs, and surrounding communities. Call to confirm service in your area.',
    },
  ],
};
