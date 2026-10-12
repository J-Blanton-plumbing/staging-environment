import type { SewerSharedContent } from '@/lib/content/sewer-v2/types';
import { SewerIcon } from './icons';
import { parseStyle as s } from './SewerNodes';

/**
 * Brief 200 — the No Drip Club block of the approved Sewer v2 package: one component, two contexts
 * (a full-width Midnight band on the hub, a panel on service pages). Copy is the sewer-shared `ndc`
 * (Brief 204: edited once in /admin/sewer, code fallback SEWER_NDC); two service pages were approved
 * with a different closing sentence, passed in as `body`.
 */
export default function SewerNdc({
  ndc,
  context,
  order,
  body,
}: {
  ndc: SewerSharedContent['ndc'];
  context: 'band' | 'panel';
  order?: number;
  body?: string;
}) {
  const grid = (
    <div className="ndc-grid">
      <div className="ndc-text">
        <p className="t-eyebrow ndc-eyebrow">{ndc.eyebrow}</p>
        <h2 className="t-h2 ndc-h2">
          <a href={ndc.href}>{ndc.headingLink}</a>
          {ndc.headingRest}
        </h2>
        <p className="ndc-body">{body ?? ndc.body}</p>
        <ul className="ndc-list">
          {ndc.benefits.map((b) => (
            <li key={b}>
              <span className="ndc-check">
                <SewerIcon name="ndcCheck" />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <a className="btn btn-primary t-btn ndc-btn" href={ndc.href}>
          <SewerIcon name="userPlus" />
          {ndc.cta}
        </a>
      </div>
      <div className="ndc-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ndc.image} alt="" width={1180} height={1604} loading="lazy" />
      </div>
    </div>
  );

  if (context === 'band') {
    return (
      <section className="ndc ndc--band" id="no-drip-club">
        <div className="wrap">{grid}</div>
      </section>
    );
  }
  return (
    <section className="ss-panel ss-midnight ndc ndc--panel" id="no-drip-club" style={s(`--o:${order ?? 0}`)}>
      {grid}
    </section>
  );
}
