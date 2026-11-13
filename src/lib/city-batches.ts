/**
 * Brief 212 — the city clusters that are City Hub + City Service V2 pages, by rollout batch. Plain
 * data (no imports): the source APIs, the seeds, the importer and the live check read it. Adding a
 * batch here is part of loading it (`scripts/import-city-batch.ts`); it changes no rendering by itself.
 */
export interface CityPageBatch {
  id: number;
  /** Rollout name, as in the copy package. */
  label: string;
  cities: readonly string[];
}

export const CITY_PAGE_BATCHES: readonly CityPageBatch[] = [
  { id: 1, label: 'Batch 1 (Briefs 205/209, Oct 2026)', cities: ['northbrook', 'columbus', 'tinley-park', 'joliet', 'naperville'] },
  { id: 2, label: 'Batch 2 (Brief 212, Oct 2026)', cities: ['arlington-heights', 'elgin', 'mchenry', 'algonquin', 'geneva'] },
  {
    id: 3,
    label: 'Batch 3 (Brief 216, Oct 2026)',
    cities: ['mokena', 'hinsdale', 'skokie', 'chicago-lincoln-park', 'elmhurst', 'chicago-ravenswood', 'evanston', 'hanover-park'],
  },
  // Brief 217: the 19th cluster, from the approved Highland Park static package (data/city-batches/highland-park).
  { id: 4, label: 'Highland Park (Brief 217, Oct 2026)', cities: ['highland-park'] },
  // Brief 227: the 20th hub — the German Village OFFICE PAGE (hub only, no service pages; data/city-batches/german-village).
  { id: 5, label: 'German Village office page (Brief 227, Nov 2026)', cities: ['columbus-german-village-oh'] },
];

export const CITY_PAGE_BATCH_CITIES: readonly string[] = CITY_PAGE_BATCHES.flatMap((b) => b.cities);
