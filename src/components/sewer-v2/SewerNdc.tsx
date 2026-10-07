import { SEWER_NDC } from '@/lib/content/sewer-v2/shared';
import { SewerIcon } from './icons';
import { parseStyle as s } from './SewerNodes';

/**
 * Brief 200 — the No Drip Club block of the approved Sewer v2 package: one component, two contexts
 * (a full-width Midnight band on the hub, a panel on service pages). Copy is SEWER_NDC; two service
 * pages were approved with a different closing sentence, passed in as `body`.
 */
export default function SewerNdc({ context, order, body }: { context: 'band' | 'panel'; order?: number; body?: string }) {
  const grid = (
    <div className="ndc-grid">
      <div className="ndc-text">
        <p className="t-eyebrow ndc-eyebrow">{SEWER_NDC.eyebrow}</p>
        <h2 className="t-h2 ndc-h2">
          <a href={SEWER_NDC.href}>{SEWER_NDC.headingLink}</a>
          {SEWER_NDC.headingRest}
        </h2>
        <p className="ndc-body">{body ?? SEWER_NDC.body}</p>
        <ul className="ndc-list">
          {SEWER_NDC.benefits.map((b) => (
            <li key={b}>
              <span className="ndc-check">
                <SewerIcon name="ndcCheck" />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <a className="btn btn-primary t-btn ndc-btn" href={SEWER_NDC.href}>
          <SewerIcon name="userPlus" />
          {SEWER_NDC.cta}
        </a>
      </div>
      <div className="ndc-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SEWER_NDC.image} alt="" width={1180} height={1604} loading="lazy" />
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
