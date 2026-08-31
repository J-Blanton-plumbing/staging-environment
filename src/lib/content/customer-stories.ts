const CDN = 'https://d1rplazj5a80fb.cloudfront.net/images';
const REVIEW_URL =
  'https://www.google.com/search?q=J+Blanton+Plumbing+Chicago&ludocid=13338365584811630957#lrd=0x880fd23cbc97c273:0xb91b64d466fe216d,3';

export interface Testimonial {
  name: string;
  body: string;
  image: string;
  reviewUrl: string;
}

export interface CustomerStoriesContent {
  hero: {
    heading: string;
    description: string;
    heroImage: string;
  };
  testimonials: Testimonial[];
  reviewUrl: string;
  behindTheReview: {
    heading: string;
    videoSrc: string;
    videoTitle: string;
  };
  cta: {
    heading: string;
    body: string;
    googleButtonLabel: string;
    googleHref: string;
  };
}

export const CUSTOMER_STORIES: CustomerStoriesContent = {
  hero: {
    heading: 'SEE WHAT OUR CUSTOMERS ARE SAYING',
    description: 'Real reviews from real customers - we are proud to share their experience.',
    heroImage: '/images/header_customer.webp',
  },
  reviewUrl: REVIEW_URL,
  testimonials: [
    {
      name: 'Omar U.',
      image: `${CDN}/0mar.webp`,
      reviewUrl: REVIEW_URL,
      body: 'Alex was fantastic - explained everything really well, talked me through a leak issue in my shower, gave me options and communicated effectively with my building maintenance team. Really put my mind at ease!',
    },
    {
      name: 'Joseph C.',
      image: `${CDN}/j0sep.webp`,
      reviewUrl: REVIEW_URL,
      body: 'Very informative and professional. Greatly appreciated the time spent.',
    },
    {
      name: 'Jorge D.',
      image: `${CDN}/j0rg.webp`,
      reviewUrl: REVIEW_URL,
      body: "Christian was fantastic! He's been here a few times for no drip club visits and he's the man! Did our tankless water heater maintenance and was friendly and efficient, highly recommend",
    },
    {
      name: 'Benjamin F.',
      image: `${CDN}/header_custumer.webp`,
      reviewUrl: REVIEW_URL,
      body: 'Great experience. Trust 100%. Great prices and super knowledgable. Pic of me and my man Ron below! #satisfied #relieved #happy',
    },
    {
      name: 'Samantha F.',
      image: `${CDN}/s4m.webp`,
      reviewUrl: REVIEW_URL,
      body: 'Arrived timely and took their time reviewing all of my concerns. Bryan explained his findings clearly and was transparent with pricing. He made sure to walk through next steps and ensure everything was set. Highly recommend!',
    },
    {
      name: 'Jason K.',
      image: `${CDN}/j4s.webp`,
      reviewUrl: REVIEW_URL,
      body: 'Christian came out today, even though it was passed 5 he still made the trip. Super friendly and got the water heater taken care of quick.',
    },
    {
      name: 'George S.',
      image: `${CDN}/ge0.webp`,
      reviewUrl: REVIEW_URL,
      body: 'Ron is the man! He not only walked us through our reason for calling which was a leak in a ceiling but was gracious to answer all the questions we had in a multiple unit condo (which was a lot). Highly recommend and a constant customer going forward!',
    },
  ],
  behindTheReview: {
    heading: 'BEHIND THE REVIEW:',
    videoSrc: 'https://www.youtube.com/embed/m8iTyK0vrr8',
    videoTitle: 'Behind the Review',
  },
  cta: {
    heading: 'Need a trusted plumber in Chicago?',
    body: 'Join thousands of satisfied customers who trust J. Blanton Plumbing for their plumbing needs.',
    googleButtonLabel: 'Review us on Google',
    googleHref: REVIEW_URL,
  },
};
