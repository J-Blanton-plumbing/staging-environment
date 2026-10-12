import type { SewerSharedContent } from './types';
import {
  SEWER_BADGE24_LABEL,
  SEWER_CRUMB_PARENT,
  SEWER_FINAL,
  SEWER_LEARN_MORE,
  SEWER_NDC,
  SEWER_QUICK_LINKS,
  SEWER_RAIL,
  SEWER_REVIEW,
  SEWER_SERVICES_HEAD,
  SEWER_STICKY,
} from './shared';
import { SEWER_EMERGENCY_ROW, SEWER_HUB_FEATURED, SEWER_HUB_ORDER, SEWER_SERVICES } from './services';

/**
 * Brief 204 — the sewer-shared sections as ONE object: the code fallback for `v2_content.shared` on
 * the hub row, and the seed's source for it. Built from the Brief 200 constants (which stay the
 * source of truth for the code path), deep-copied so nothing downstream can mutate them.
 *
 * The one transformation: the sticky bar's screen-reader label placeholder is spelled `{{phone}}`
 * here (the token editors use everywhere else, Brief 77) instead of Brief 200's `{phone}`. Both are
 * replaced with the same default display number, so the rendered label is unchanged.
 */
export const SEWER_SHARED_DEFAULT: SewerSharedContent = JSON.parse(
  JSON.stringify({
    badge24Label: SEWER_BADGE24_LABEL,
    quickLinks: SEWER_QUICK_LINKS,
    rail: SEWER_RAIL,
    sticky: { ...SEWER_STICKY, ariaLabel: SEWER_STICKY.ariaLabel.replace('{phone}', '{{phone}}') },
    ndc: SEWER_NDC,
    servicesHead: SEWER_SERVICES_HEAD,
    services: SEWER_SERVICES,
    hubFeatured: SEWER_HUB_FEATURED,
    hubOrder: SEWER_HUB_ORDER,
    emergencyRow: SEWER_EMERGENCY_ROW,
    final: SEWER_FINAL,
    crumbParent: SEWER_CRUMB_PARENT,
    review: SEWER_REVIEW,
    learnMore: SEWER_LEARN_MORE,
  })
);
