import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const GARBAGE_DISPOSAL_INSTALLATION_REPAIR: CityServiceContent = {
  serviceSlug: 'garbage-disposal-installation-repair',
  serviceTitle: 'Garbage Disposal Installation & Repair',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Garbage Disposal Installation and Repair. Same-Day Service Available.',

  serviceHeroImage: `${CDN}/images/img_garbage-disposal.webp`,

  seo: {
    title: 'Garbage Disposal Installation & Repair in {city} | J. Blanton Plumbing',
    description:
      'Professional garbage disposal installation and repair in {city}. Fix jams, replace old units, or install a new disposal. Licensed plumbers. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Garbage Disposal Installation and Repair in {city}',
    paragraphs: [
      'A malfunctioning garbage disposal is a kitchen headache that our licensed plumbers in {city} resolve fast. J. Blanton Plumbing handles garbage disposal repair, installation, and replacement throughout {city} with same-day service available.',
      'Common disposal problems include: humming without grinding (jammed impeller), total failure to start (tripped reset button or failed motor), leaking from the bottom or sides, slow grinding performance, or persistent odors despite cleaning.',
      'Our plumbers diagnose disposal issues quickly. Many jammed disposals can be cleared and reset in minutes. Failed units — particularly those over 10 years old or with a burned-out motor — are typically more cost-effective to replace than repair.',
      'We install all major garbage disposal brands and horsepower ratings. Whether you want a basic replacement or an upgrade to a quieter, higher-capacity unit, we recommend options that fit your household\'s needs and your {city} kitchen\'s plumbing configuration.',
      'J. Blanton Plumbing has been providing fast, professional garbage disposal service to {city} homeowners for over 30 years — with upfront pricing and same-day installation in most cases.',
    ],
    image: `${CDN}/images/img_garbage-disposal.webp`,
  },

  secondarySection: {
    heading: 'Garbage Disposal Services in {city}: Quick Repairs and New Installations',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When your garbage disposal fails in {city}, J. Blanton Plumbing makes the repair or replacement easy. Our plumbers carry common disposal models on their trucks so most installations are completed the same day you call.',
      'We also address the drain plumbing connected to your disposal — replacing deteriorated discharge hoses, clearing connected kitchen drain clogs, and ensuring the dishwasher drain connection (if present) is properly routed.',
      'Garbage disposal installation requires proper electrical and plumbing connections. Our {city} plumbers handle the plumbing side completely — ensuring a secure, leak-free mount and a properly vented drain line.',
    ],
  },

  faqs: [
    {
      question: 'My disposal hums but does not grind — what is wrong?',
      answer:
        'A humming disposal that does not grind is almost always jammed. Turn off the disposal, use the hex key in the center underside of the unit to manually rotate the impeller plate, then press the reset button and try again. If it still does not work, call a plumber.',
    },
    {
      question: 'How long does a garbage disposal last?',
      answer:
        'A quality garbage disposal typically lasts 8 to 15 years depending on usage and care. Units over 10 years old that require repair are often better replaced with a more efficient modern model.',
    },
    {
      question: 'Do I need a plumber to install a garbage disposal?',
      answer:
        'Plumber installation is recommended because disposals require proper drain plumbing connections and a vented drain configuration to prevent odor and backflow. Improper installation commonly leads to leaks and drain problems.',
    },
    {
      question: 'What should I never put in a garbage disposal?',
      answer:
        'Avoid putting grease or oils, fibrous vegetables (celery, artichokes), hard items (bones, fruit pits), coffee grounds, pasta, rice, or non-food items into your disposal. These commonly cause jams, clogs, or motor damage.',
    },
  ],
};
