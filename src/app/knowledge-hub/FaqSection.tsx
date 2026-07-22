'use client';

import { useState } from 'react';
import type { FaqItem } from '@/lib/content/knowledge-hub';

interface FaqSectionProps {
  label: string;
  body: string;
  items: FaqItem[];
}

export default function FaqSection({ label, body, items }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIndex((prev) => (prev === i ? null : i));
  }

  return (
    <div className="faqs">
      <div className="l">
        <p className="red-text">{label}</p>
        <p>{body}</p>
      </div>
      <div className="r">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className={`faq${isOpen ? ' active' : ' not-active'}`}
              onClick={() => toggle(i)}
            >
              <div className="ii">
                <p className="label">{item.question}</p>
                <div style={{ display: isOpen ? 'none' : 'block' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m10 17l5-5l-5-5"/>
                  </svg>
                </div>
                <div className="bottom-arrow" style={{ display: isOpen ? 'block' : 'none' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m19 9l-7 6l-7-6"/>
                  </svg>
                </div>
              </div>
              {isOpen && (
                <p className="faq-desc" style={{ display: 'block' }}>{item.answer}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
