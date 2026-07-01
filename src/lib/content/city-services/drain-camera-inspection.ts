import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const DRAIN_CAMERA_INSPECTION: CityServiceContent = {
  serviceSlug: 'drain-camera-inspection',
  serviceTitle: 'Drain Camera Inspection',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} Providing Video Camera Drain Inspections. Same-Day Service Available.',

  serviceHeroImage: `${CDN}/images/img_sewer.webp`,

  seo: {
    title: 'Drain Camera Inspection in {city} | J. Blanton Plumbing',
    description:
      'Professional drain camera inspection in {city}. See exactly what is inside your pipes with HD video — diagnose clogs, cracks, root intrusion, and more. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Drain Camera Inspection Services in {city}',
    paragraphs: [
      'Not every drain problem is visible from the outside. J. Blanton Plumbing uses state-of-the-art video camera inspection equipment to see exactly what is happening inside your drain and sewer lines in {city} — without any guesswork.',
      'Our drain cameras transmit a live HD video feed from inside your pipes. This allows our licensed plumbers in {city} to pinpoint the exact location and nature of a problem: a stubborn grease clog, tree root intrusion, a cracked or collapsed pipe section, or a sagging line that traps debris.',
      'Camera inspection is especially valuable before purchasing a home in {city}, after repeated drain backups, or when a standard clearing attempt does not resolve the issue. Seeing the problem directly prevents unnecessary digging and ensures the right repair is performed the first time.',
      'We send the camera through your main sewer line or specific branch lines depending on where the problem is suspected. You receive a full verbal report and, if needed, recorded footage to share with your insurance company or home inspector.',
      'J. Blanton Plumbing has been diagnosing drain and sewer problems for {city} homeowners for over 30 years. Our camera inspection service is an affordable first step to understanding any persistent plumbing issue.',
    ],
    image: `${CDN}/images/img_sewer.webp`,
  },

  secondarySection: {
    heading: 'Drain Camera Inspection in {city}: Accurate Diagnostics, No Guesswork',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners face repeated drain problems, J. Blanton Plumbing\'s camera inspection service ends the guessing game. Our technicians run a flexible camera through your drain or sewer line and identify the exact problem — saving you from expensive unnecessary repairs.',
      'Camera inspection is also part of our standard process for hydro jetting and trenchless sewer repair. We film before and after every major drain service so you can see the difference and have a documented record of your pipe condition.',
      'We can also locate your sewer line\'s exact path underground using a locator device — useful when planning a renovation, addition, or landscaping project in your {city} home.',
    ],
  },

  faqs: [
    {
      question: 'When should I schedule a drain camera inspection?',
      answer:
        'Consider a camera inspection if you have recurring drain backups, are purchasing a home, notice foul sewer odors inside your home, have experienced tree root issues before, or want a baseline record of your pipe condition.',
    },
    {
      question: 'Will the camera inspection damage my pipes?',
      answer:
        'No. The camera is a flexible, waterproof device designed to travel through drain lines without causing any damage. It is a non-invasive diagnostic tool.',
    },
    {
      question: 'How long does a drain camera inspection take?',
      answer:
        'A typical main sewer line camera inspection takes 30 to 60 minutes. Inspecting multiple branch lines or a longer sewer line may take up to 2 hours.',
    },
    {
      question: 'What can a drain camera inspection detect?',
      answer:
        'Our cameras detect grease and debris buildup, tree root intrusion, pipe cracks and fractures, collapsed pipe sections, pipe offset and misalignment, scale and mineral deposits, and foreign objects lodged in the line.',
    },
  ],
};
