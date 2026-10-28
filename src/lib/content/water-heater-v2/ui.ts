/**
 * Brief 222 — the water heater pages' interface labels (screen-reader labels and button text the
 * package hard-coded in its markup and in js/water-heater.js). Not CMS content: they describe the
 * controls, not the service. Copied from the package verbatim.
 */
export const WH_UI = {
  learnMore: 'Learn More',
  learnMoreAbout: (title: string) => `Learn More about ${title}`,
  railStandardLabel: 'Contact',
  railIndexLabel: 'Page sidebar',
  galleryPrev: 'Previous photo',
  galleryNext: 'Next photo',
  galleryCount: (n: number) => ` / ${n} photos from this job`,
  galleryThumb: (i: number, n: number) => `Show photo ${i} of ${n}`,
  tableMore: (n: number) => `Show ${n} more`,
  tableLess: 'Show less',
  breadcrumb: 'Breadcrumb',
  home: 'Home',
} as const;
