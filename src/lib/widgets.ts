/**
 * Elfsight widget app IDs — defined once and referenced by the
 * <GoogleReviews /> and <TikTokFeed /> components so the long IDs
 * are never duplicated across pages. (Audit ref: Structural / CMS-readiness.)
 */
export const ELFSIGHT_WIDGETS = {
  googleReviews: '67911321-4b72-4209-b157-fc9812eadd3b',
  tiktok: '9f370c11-108b-412b-8529-6b3f093f04a3',
} as const;
