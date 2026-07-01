import type { CityServiceContent } from '@/types/city-service';
import { HYDRO_JETTING } from './hydro-jetting';
import { BASEMENT_FLOODING } from './basement-flooding';
import { BASEMENT_WATERPROOFING } from './basement-waterproofing';
import { BATHROOM_PLUMBING } from './bathroom-plumbing';
import { BURST_PIPE_REPAIR } from './burst-pipe-repair';
import { CATCH_BASIN } from './catch-basin';
import { CLOGGED_DRAINS } from './clogged-drains';
import { COMMERCIAL_WATER_HEATER } from './commercial-water-heater';
import { DRAIN_CAMERA_INSPECTION } from './drain-camera-inspection';
import { DRAIN_CLEANING } from './drain-cleaning';
import { EJECTOR_PUMP } from './ejector-pump';
import { EMERGENCY_PLUMBING } from './emergency-plumbing';
import { FAUCET_INSTALLATION_REPAIR } from './faucet-installation-repair';
import { FLOOD_CONTROL_MAINTENANCE } from './flood-control-maintenance';
import { GARBAGE_DISPOSAL_INSTALLATION_REPAIR } from './garbage-disposal-installation-repair';
import { GAS_FIREPLACE } from './gas-fireplace';
import { GAS_LINE_INSTALLATION } from './gas-line-installation';
import { GAS_LINE_LEAK_DETECTION } from './gas-line-leak-detection';
import { GAS_LINE_REPAIR } from './gas-line-repair';
import { GAS_LINES } from './gas-lines';
import { KITCHEN_FAUCET_REPAIR_AND_INSTALLATION } from './kitchen-faucet-repair-and-installation';
import { KITCHEN_PLUMBING } from './kitchen-plumbing';
import { KITCHEN_SINK_DRAIN } from './kitchen-sink-drain';
import { LEAK_REPAIRS } from './leak-repairs';
import { OVERHEAD_SEWER_SYSTEMS } from './overhead-sewer-systems';
import { PLUMBING_FIXTURE_INSTALLATIONS } from './plumbing-fixture-installations';
import { PLUMBING_MAINTENANCE } from './plumbing-maintenance';
import { PLUMBING_SERVICES } from './plumbing-services';
import { RESIDENTIAL_WATER_HEATER } from './residential-water-heater';
import { SEWAGE_LINE_BACKUP_SERVICES } from './sewage-line-backup-services';
import { SEWER_DRAIN_CLEARING } from './sewer-drain-clearing';
import { SEWER_MAINTENANCE } from './sewer-maintenance';
import { SEWER_REPAIR } from './sewer-repair';
import { SEWER_RODDING } from './sewer-rodding';
import { SHOWER_REPAIR } from './shower-repair';
import { SUMP_PUMPS } from './sump-pumps';
import { TANKLESS_WATER_HEATER } from './tankless-water-heater';
import { TOILET_INSTALLATION_REPAIR } from './toilet-installation-repair';
import { TRENCHLESS_SEWER_REPAIR } from './trenchless-sewer-repair';
import { VIDEO_CAMERA_SEWER_INSPECTIONS } from './video-camera-sewer-inspections';
import { WATER_FILTRATION_SYSTEMS } from './water-filtration-systems';
import { WATER_HEATER_INSTALLATION } from './water-heater-installation';
import { WATER_HEATER_MAINTENANCE } from './water-heater-maintenance';
import { WATER_HEATER_REPAIR } from './water-heater-repair';
import { WATER_TESTING } from './water-testing';

const SERVICE_REGISTRY: Record<string, CityServiceContent> = {
  'hydro-jetting': HYDRO_JETTING,
  'basement-flooding': BASEMENT_FLOODING,
  'basement-waterproofing': BASEMENT_WATERPROOFING,
  'bathroom-plumbing': BATHROOM_PLUMBING,
  'burst-pipe-repair': BURST_PIPE_REPAIR,
  'catch-basin': CATCH_BASIN,
  'clogged-drains': CLOGGED_DRAINS,
  'commercial-water-heater': COMMERCIAL_WATER_HEATER,
  'drain-camera-inspection': DRAIN_CAMERA_INSPECTION,
  'drain-cleaning': DRAIN_CLEANING,
  'ejector-pump': EJECTOR_PUMP,
  'emergency-plumbing': EMERGENCY_PLUMBING,
  'faucet-installation-repair': FAUCET_INSTALLATION_REPAIR,
  'flood-control-maintenance': FLOOD_CONTROL_MAINTENANCE,
  'garbage-disposal-installation-repair': GARBAGE_DISPOSAL_INSTALLATION_REPAIR,
  'gas-fireplace': GAS_FIREPLACE,
  'gas-line-installation': GAS_LINE_INSTALLATION,
  'gas-line-leak-detection': GAS_LINE_LEAK_DETECTION,
  'gas-line-repair': GAS_LINE_REPAIR,
  'gas-lines': GAS_LINES,
  'kitchen-faucet-repair-and-installation': KITCHEN_FAUCET_REPAIR_AND_INSTALLATION,
  'kitchen-plumbing': KITCHEN_PLUMBING,
  'kitchen-sink-drain': KITCHEN_SINK_DRAIN,
  'leak-repairs': LEAK_REPAIRS,
  'overhead-sewer-systems': OVERHEAD_SEWER_SYSTEMS,
  'plumbing-fixture-installations': PLUMBING_FIXTURE_INSTALLATIONS,
  'plumbing-maintenance': PLUMBING_MAINTENANCE,
  'plumbing-services': PLUMBING_SERVICES,
  'residential-water-heater': RESIDENTIAL_WATER_HEATER,
  'sewage-line-backup-services': SEWAGE_LINE_BACKUP_SERVICES,
  'sewer-drain-clearing': SEWER_DRAIN_CLEARING,
  'sewer-maintenance': SEWER_MAINTENANCE,
  'sewer-repair': SEWER_REPAIR,
  'sewer-rodding': SEWER_RODDING,
  'shower-repair': SHOWER_REPAIR,
  'sump-pumps': SUMP_PUMPS,
  'tankless-water-heater': TANKLESS_WATER_HEATER,
  'toilet-installation-repair': TOILET_INSTALLATION_REPAIR,
  'trenchless-sewer-repair': TRENCHLESS_SEWER_REPAIR,
  'video-camera-sewer-inspections': VIDEO_CAMERA_SEWER_INSPECTIONS,
  'water-filtration-systems': WATER_FILTRATION_SYSTEMS,
  'water-heater-installation': WATER_HEATER_INSTALLATION,
  'water-heater-maintenance': WATER_HEATER_MAINTENANCE,
  'water-heater-repair': WATER_HEATER_REPAIR,
  'water-testing': WATER_TESTING,
};

export function getCityService(serviceSlug: string): CityServiceContent | undefined {
  return SERVICE_REGISTRY[serviceSlug];
}

export function getAllServiceSlugs(): string[] {
  return Object.keys(SERVICE_REGISTRY);
}
