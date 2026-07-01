/**
 * Elfsight widget app IDs — defined once and referenced by the
 * <GoogleReviews /> and <TikTokFeed /> components so the long IDs
 * are never duplicated across pages. (Audit ref: Structural / CMS-readiness.)
 */
export const ELFSIGHT_WIDGETS = {
  googleReviews: '67911321-4b72-4209-b157-fc9812eadd3b',
  tiktok: '9f370c11-108b-412b-8529-6b3f093f04a3',
  // Service-area coverage map ("WE'RE ALMOST EVERYWHERE") — the `.ep-map`
  // widget used on every live sub-service / category page (brief-61 Track D).
  map: '9da0734e-a27e-4557-85a0-da9b69617829',
} as const;
