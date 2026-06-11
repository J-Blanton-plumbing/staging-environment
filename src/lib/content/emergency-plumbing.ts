/**
 * Editable copy for the Emergency Plumbing page (`app/emergency-plumbing/page.tsx`).
 * All page-specific strings live here — nothing is hardcoded in JSX.
 */

export interface EmergencyPlumbingContent {
  meta: {
    title: string;
    description: string;
  };
  hero: {
    heading: string;
    description: string;
  };
  ready: {
    heading: string;
    body: string;
  };
  card: {
    heading: string;
    items: string[];
  };
  map: {
    heading: string;
    body: string;
  };
  tiktok: {
    headline: string;
  };
  ndcCta: {
    heading: string;
    body: string;
  };
  finalPitch: {
    heading: string;
    body: string;
  };
}

export const EMERGENCY_PLUMBING: EmergencyPlumbingContent = {
  meta: {
    title: 'Emergency Plumbing Services | J. Blanton Plumbing',
    description:
      '24/7 emergency plumbing service from J. Blanton Plumbing. Burst pipes, clogged drains, water leaks, and more — we\'ll be there fast.',
  },
  hero: {
    heading: "J. BLANTON, WHAT'S YOUR EMERGENCY?",
    description:
      "We provide 24/7 service for plumbing emergencies. If you're facing an urgent issue like a burst pipe or clogged drain, don't hesitate—pick up the phone and call us! We'll be there to turn an unexpected problem into a Good Call.",
  },
  ready: {
    heading: 'PLUMBERS AT THE READY',
    body: "In an emergency, every second counts. J. Blanton isn't just one plumber—we're a full team of professionals ready to act fast. Whatever the problem, we'll have the right person at your door, ready to make the right call.",
  },
  card: {
    heading: 'EMERGENCIES WE FIX',
    items: [
      'Kitchen plumbing repair',
      'Bathroom plumbing repair',
      'Sewer line repair',
      'Water leak repair',
      'Water heater repair',
    ],
  },
  map: {
    heading: "WE'RE ALMOST EVERYWHERE",
    body: "With more plumbers and more trucks at our disposal, we can cover more ground and reach your home quickly. Use our map to see if we cover your location, or give us a call for immediate assistance.",
  },
  tiktok: {
    headline: 'J Blanton Plumbing - Turning Bad Calls to Good Calls',
  },
  ndcCta: {
    heading: 'WE HATE EMERGENCIES TOO',
    body: "That's why we created the No Drip Club, a complete peace of mind solution that helps you save on unexpected expenses.",
  },
  finalPitch: {
    heading: 'TURN A BAD SITUATION INTO A GOOD CALL',
    body: "What are you waiting for? The sooner you call, the sooner we'll be there.",
  },
};
