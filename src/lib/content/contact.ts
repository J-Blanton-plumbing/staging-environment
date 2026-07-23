export const CONTACT = {
  meta: {
    title: 'Contact Us | J. Blanton Plumbing',
    description:
      'Ready to make a good call? Contact J. Blanton Plumbing 24/7 for emergencies or schedule a service online.',
  },
  hero: {
    heading: 'CONTACT J. BLANTON PLUMBING',
    description:
      'Ready to make a good call? Our team is available 24/7 for emergencies and during business hours for all other inquiries.',
    imageSrc: 'https://d1rplazj5a80fb.cloudfront.net/images/hero_image.webp',
    imageAlt: 'Contact Us',
  },
  getInTouch: {
    phone: '(773) 724-9272',
    phoneHref: 'tel:773-724-9272',
    availability:
      'Available 24/7 for plumbing emergencies. We typically respond to all inquiries within 1 business day.',
  },
  // Brief 102 (Track C): office addresses moved to the CMS (global_settings.offices,
  // single source of truth) — see CONTACT_OFFICE_SLUGS in src/app/contact/page.tsx.
} as const;
