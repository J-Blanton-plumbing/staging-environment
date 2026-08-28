/**
 * Brief 156 — "Meet Your Expert Team": two bios plus the full team photo.
 *
 * Both names are <h3> here. The live page marks them up as <h1> — two of the
 * four H1s on that page. One H1 per page (CLAUDE.md gotcha #3); visually
 * identical.
 */

import Image from 'next/image';
import styles from './bathrooms.module.css';
import CtaBand from './CtaBand';

const HEADING = 'Meet Your Expert Team';
const INTRO =
  'The only way to deliver a truly seamless remodeling experience is to keep every part of the project under one roof. That’s why we never subcontract our work. Every member of our team is a direct employee—carefully selected, professionally trained, certified, and licensed to uphold our standards of quality and craftsmanship.';

const MEMBERS = [
  {
    name: 'Paul Louden',
    role: 'Senior Design Consultant',
    photo: '/bathrooms/team/paul-louden.jpg',
    width: 1835,
    height: 1223,
    paragraphs: [
      'Remodeling is in Paul’s DNA. He grew up in the industry, learning the trade in his father’s remodeling company in Virginia. By the time he was in high school, Paul had already worked through every stage of the process—from demolition and plumbing to detailed finish work.',
      'Today, he brings that hands-on expertise to every consultation, helping homeowners design showers that are both beautiful and built to last.',
    ],
  },
  {
    name: 'Brian Sloan',
    role: 'Design Consultant',
    photo: '/bathrooms/team/brian-sloan.jpg',
    width: 1790,
    height: 1193,
    paragraphs: [
      'Brian brings decades of experience in the real estate and mortgage industries, giving him a unique perspective on how remodeling decisions impact long-term property value.',
      'He guides homeowners through the design process with a focus on comfort, functionality, and smart investment—ensuring each project enhances both the home and the homeowner’s peace of mind.',
    ],
  },
] as const;

export default function Team() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <h2 className={`${styles.h2} text-[#171714]`}>{HEADING}</h2>
          <p className={`${styles.body18} text-[#171714]`}>{INTRO}</p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-12 lg:grid-cols-2">
          {MEMBERS.map((member) => (
            <div key={member.name} className="flex flex-col gap-4">
              <Image
                src={member.photo}
                alt={`${member.name}, ${member.role}`}
                width={member.width}
                height={member.height}
                sizes="(max-width: 1023px) 100vw, 596px"
                className="h-auto w-full rounded-2xl object-cover"
              />
              <h3 className={`${styles.h3} text-[#171714]`}>{member.name}</h3>
              <p className={`${styles.body18} text-[#171714]`}>{member.role}</p>
              {member.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className={`${styles.body16} text-[#171714]`}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>

        <Image
          src="/bathrooms/team/bathrooms-team.jpg"
          alt="The Bathrooms by J. Blanton team"
          width={2247}
          height={1498}
          sizes="(max-width: 1279px) 100vw, 1240px"
          className="mb-12 h-auto w-full rounded-2xl object-cover"
        />

        <CtaBand layout="horizontal" />
      </div>
    </section>
  );
}
