export interface Office {
  name: string;
  address: string;
}

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
  offices: [
    { name: 'Northbrook (Corporate)', address: '1945 Techny Road, #11, Northbrook, IL 60062' },
    { name: 'Algonquin',              address: '2390 Esplanade Dr #200f, Algonquin, IL 60102' },
    { name: 'Chicago Ravenswood',     address: '5126 N Ravenswood Ave, Chicago, IL 60640' },
    { name: 'Arlington Heights',      address: '1204 East Central Road, Suite 2, Arlington Heights, IL 60005' },
    { name: 'Evanston',               address: '1603 Orrington Ave #600-1085, Evanston, IL 60201' },
  ] satisfies Office[],
} as const;
