import { PoolClient } from 'pg';

export async function writeChangelog(
  client: PoolClient,
  pageType: string,
  pageSlug: string,
  changedBy: number | null,
  snapshot: object
): Promise<void> {
  await client.query(
    `INSERT INTO page_changelog (page_type, page_slug, changed_by, snapshot)
     VALUES ($1, $2, $3, $4)`,
    [pageType, pageSlug, changedBy, JSON.stringify(snapshot)]
  );
}
