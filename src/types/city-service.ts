export interface CityServiceFaq {
  question: string;
  answer: string;
}

export interface CityServiceContent {
  serviceSlug: string;
  serviceTitle: string;
  heroCallout: string;
  serviceHeroImage: string;
  seo: {
    title: string;
    description: string;
  };
  serviceIntro: {
    heading: string;
    paragraphs: string[];
    image: string;
  };
  secondarySection: {
    heading: string;
    image: string;
    paragraphs: string[];
  };
  faqs: CityServiceFaq[];
}
