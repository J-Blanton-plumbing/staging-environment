import type { SewerServicePage } from './types';
import { HYDRO_JETTING } from './hydro-jetting';
import { SEWER_RODDING } from './sewer-rodding';
import { SEWER_REPAIR } from './sewer-repair';
import { SEWER_CAMERA_INSPECTION } from './sewer-camera-inspection';
import { SEWER_LINE_REPLACEMENT } from './sewer-line-replacement';
import { SEWER_MAINTENANCE } from './sewer-maintenance';
import { OVERHEAD_SEWER_SYSTEMS } from './overhead-sewer-systems';
import { TRENCHLESS_SEWER_REPAIR } from './trenchless-sewer-repair';
import { SEWER_LINE_INSTALLATION } from './sewer-line-installation';
import { SEWER_V2_SERVICE_SLUGS } from './routes';

/** Brief 200 — the 9 Sewer Ecosystem v2 service pages, by slug. The hub is ./hub.ts. */
export const SEWER_V2_PAGES: Record<(typeof SEWER_V2_SERVICE_SLUGS)[number], SewerServicePage> = {
  'hydro-jetting': HYDRO_JETTING,
  'sewer-rodding': SEWER_RODDING,
  'sewer-repair': SEWER_REPAIR,
  'sewer-camera-inspection': SEWER_CAMERA_INSPECTION,
  'sewer-line-replacement': SEWER_LINE_REPLACEMENT,
  'sewer-maintenance': SEWER_MAINTENANCE,
  'overhead-sewer-systems': OVERHEAD_SEWER_SYSTEMS,
  'trenchless-sewer-repair': TRENCHLESS_SEWER_REPAIR,
  'sewer-line-installation': SEWER_LINE_INSTALLATION,
};
