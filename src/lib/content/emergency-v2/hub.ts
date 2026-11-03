import type { WhPage, WhSharedContent } from '@/lib/content/water-heater-v2/types';

/**
 * Brief 225 — /emergency-plumbing (the Emergency Hub, template `em-hub`), ported verbatim from the approved
 * Emergency Plumbing Hub package (Build/index.html, 2026-11-02) by .scripts-out/b225/port.cjs, then owned by
 * hand. Do not edit copy here without a brief: once the deploy seed has run, the live page reads its CMS row
 * (`emergency_plumbing_page.v2_content`) and this module is the fallback and the layout template.
 *
 * Brief changes already applied: the final CTA keeps only its phone button (decision 0.4 / §1 #4, so no
 * `#book` id either), the map is the live sewer hub's embed (§1 #10), the rating card is Brief 221's
 * company tokens (§1 #1), every phone is `{{phone}}`, every content image carries its intrinsic size.
 */
export const EM_HUB: WhPage = {
  slug: "emergency-plumbing",
  template: "em-hub",
  meta: {
    title: "24/7 Emergency Plumbers in Illinois & Ohio",
    description: "Burst pipe, sewer backup or flooded basement? Our plumbers take emergency calls nights, weekends and holidays across Illinois and Ohio. Call now.",
  },
  hero: {
    crumb: "",
    eyebrow: "Serving Chicagoland & Central Ohio",
    h1: "24/7 Emergency Plumbing Services",
    lead: "",
    words: [],
    intro: "Water damage is stressful enough. A surprise bill shouldn’t add to it. Call us any time, day or night, and you’ll get an upfront price before any work begins.",
    image: {
      src: "/images/services/emergency-plumbing/em-hero-meter.webp",
      alt: "J. Blanton plumber in red shoe covers checking the water meter in a basement",
      width: 1600,
      height: 900,
    },
  },
  sections: [
    {
      kind: "panel",
      el: {
        tag: "section",
        cls: "trust-stripe",
        attrs: {
          "aria-label": "Why homeowners trust J. Blanton",
        },
        kids: [
          {
            tag: "ul",
            cls: "wrap trust-stripe-list",
            kids: [
              {
                tag: "li",
                kids: [
                  {
                    icon: "checkCircle",
                  },
                  {
                    tag: "span",
                    kids: [
                      "In business since 1993",
                    ],
                  },
                ],
              },
              {
                tag: "li",
                kids: [
                  {
                    icon: "checkCircle",
                  },
                  {
                    tag: "span",
                    kids: [
                      "Same-day service available",
                    ],
                  },
                ],
              },
              {
                tag: "li",
                kids: [
                  {
                    icon: "checkCircle",
                  },
                  {
                    tag: "span",
                    kids: [
                      "Dispatched nights, weekends & holidays",
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      kind: "reviews",
      layout: "hub",
      cls: "sec",
      style: "background:#F1E8DC",
      eyebrow: "Customer Stories",
      heading: "Real Emergencies, Real Reviews",
      intro: "Here’s what homeowners say happened when they called us in an emergency.",
      items: [
        {
          quote: "“So it’s Christmas Eve and my sewer is backed up😭. J. Blanton did not hesitate or cancel my appointment. George and Mike were excellent!! They were not rushed, answered all my questions. Very knowledgeable and honest, which goes a long way especially as a first time home owner [...] Their pricing is VERY reasonable compared to other companies and professionalism exceeded expectations.”",
          name: "Betty Knows",
          location: "Chicago, IL",
          href: "https://maps.app.goo.gl/3WpnaH18n4LiyMyD6",
        },
        {
          quote: "“I was panicked because I’ve previously had substantial water damage in my basement, so having my water spigot line burst and water pouring into my basement, caused a lot concern. Andrew calmly walked me through what he found, answered my questions, and addressed my fears. [...] Pricing was upfront and reasonable.”",
          name: "Veronica Flores",
          location: "Chicago, IL",
          href: "https://maps.app.goo.gl/iEHVigmJspUUxLc18",
        },
        {
          quote: "“Called them out on a Tuesday morning after our water heater finally gave out here in Grandview Heights, and I honestly expected to wait days for someone to help. J Blanton Plumbing had a tech out same day and the replacement was done before dinner, no mess left behind either. Fast, professional, and reasonably priced too so we’re definitely calling them again if anything else pops up.”",
          name: "Brady Bendau",
          location: "Columbus, OH",
          href: "https://maps.app.goo.gl/J8Ek9EP8LSsW9JpA9",
        },
      ],
      gallery: null,
    },
    {
      kind: "panel",
      el: {
        tag: "section",
        cls: "sec hub-svc-sec",
        style: "background:#F9F3EC",
        attrs: {
          id: "services",
        },
        kids: [
          {
            tag: "div",
            cls: "wrap",
            kids: [
              " ",
              {
                tag: "div",
                style: "max-width:780px",
                kids: [
                  {
                    tag: "span",
                    cls: "t-eyebrow",
                    style: "color:#BC0E0E",
                    kids: [
                      "Know the Signs",
                    ],
                  },
                  {
                    tag: "h2",
                    cls: "hub-h2 t-h2",
                    style: "margin:12px 0 18px",
                    kids: [
                      "Is Your Situation an Emergency?",
                    ],
                  },
                  {
                    tag: "p",
                    cls: "t-body pv-mute",
                    style: "margin:0 0 8px",
                    kids: [
                      "If waiting until morning means more water damage, a home you can’t use, or a safety risk, it’s an emergency. Some are impossible to miss. Others are hiding behind a wall or under the floor. These are the calls we get most:",
                    ],
                  },
                ],
              },
              " ",
              {
                tag: "ul",
                cls: "em-signs",
                kids: [
                  {
                    tag: "li",
                    cls: "em-sign",
                    kids: [
                      {
                        tag: "span",
                        cls: "em-sign-i",
                        kids: [
                          {
                            icon: "emAlert",
                          },
                        ],
                      },
                      {
                        tag: "div",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-label",
                            style: "margin:0 0 6px;color:#0A1B2E",
                            kids: [
                              "Sewage Backing Up",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm pv-mute",
                            style: "margin:0",
                            kids: [
                              "Sewage coming up through a floor drain, or every drain in the house backing up at once, usually means the main line is blocked. Stop running water and call.",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "li",
                    cls: "em-sign",
                    kids: [
                      {
                        tag: "span",
                        cls: "em-sign-i",
                        kids: [
                          {
                            icon: "emAlert",
                          },
                        ],
                      },
                      {
                        tag: "div",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-label",
                            style: "margin:0 0 6px;color:#0A1B2E",
                            kids: [
                              "A Flooded Basement",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm pv-mute",
                            style: "margin:0",
                            kids: [
                              "Water on the basement floor can come from the sewer, a failed pump, a broken pipe or the water heater. Finding the source fast is what limits the damage.",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "li",
                    cls: "em-sign",
                    kids: [
                      {
                        tag: "span",
                        cls: "em-sign-i",
                        kids: [
                          {
                            icon: "emAlert",
                          },
                        ],
                      },
                      {
                        tag: "div",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-label",
                            style: "margin:0 0 6px;color:#0A1B2E",
                            kids: [
                              "A Burst or Frozen Pipe",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm pv-mute",
                            style: "margin:0",
                            kids: [
                              "When a pipe bursts, water keeps coming until the supply is shut off. Close the main valve if you can, then call.",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "li",
                    cls: "em-sign",
                    kids: [
                      {
                        tag: "span",
                        cls: "em-sign-i",
                        kids: [
                          {
                            icon: "emAlert",
                          },
                        ],
                      },
                      {
                        tag: "div",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-label",
                            style: "margin:0 0 6px;color:#0A1B2E",
                            kids: [
                              "A Failed Sump or Ejector Pump",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm pv-mute",
                            style: "margin:0",
                            kids: [
                              "A pump that quits in the middle of a storm can flood a basement in hours. If the pit is filling and the pump isn’t running, don’t wait for the rain to stop.",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "li",
                    cls: "em-sign",
                    kids: [
                      {
                        tag: "span",
                        cls: "em-sign-i",
                        kids: [
                          {
                            icon: "emAlert",
                          },
                        ],
                      },
                      {
                        tag: "div",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-label",
                            style: "margin:0 0 6px;color:#0A1B2E",
                            kids: [
                              "A Leaking Water Heater",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm pv-mute",
                            style: "margin:0",
                            kids: [
                              "No hot water can usually wait for a scheduled visit. Water pooling around the tank, or a heater that’s hissing or popping, can’t.",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "li",
                    cls: "em-sign",
                    kids: [
                      {
                        tag: "span",
                        cls: "em-sign-i",
                        kids: [
                          {
                            icon: "emAlert",
                          },
                        ],
                      },
                      {
                        tag: "div",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-label",
                            style: "margin:0 0 6px;color:#0A1B2E",
                            kids: [
                              "An Overflowing Toilet",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm pv-mute",
                            style: "margin:0",
                            kids: [
                              "A toilet that keeps running is a nuisance. One that overflows every time you flush, or backs up into the tub, points to a bigger blockage.",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "li",
                    cls: "em-sign",
                    kids: [
                      {
                        tag: "span",
                        cls: "em-sign-i",
                        kids: [
                          {
                            icon: "emAlert",
                          },
                        ],
                      },
                      {
                        tag: "div",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-label",
                            style: "margin:0 0 6px;color:#0A1B2E",
                            kids: [
                              "A Gas Smell",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm pv-mute",
                            style: "margin:0",
                            kids: [
                              "Don’t look for the leak yourself. Get everyone out of the house and call from outside.",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "li",
                    cls: "em-sign",
                    kids: [
                      {
                        tag: "span",
                        cls: "em-sign-i",
                        kids: [
                          {
                            icon: "emAlert",
                          },
                        ],
                      },
                      {
                        tag: "div",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-label",
                            style: "margin:0 0 6px;color:#0A1B2E",
                            kids: [
                              "A Hidden Leak",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm pv-mute",
                            style: "margin:0",
                            kids: [
                              "Water stains on the ceiling, a soft spot in the floor or a water bill that jumped for no reason. Hidden leaks do their damage slowly, and they get more expensive the longer they run.",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              " ",
              {
                tag: "div",
                cls: "em-signs-cta",
                kids: [
                  {
                    tag: "p",
                    cls: "t-h4",
                    style: "margin:0",
                    kids: [
                      "Sound like what’s happening in your home? Call us now!",
                    ],
                  },
                  {
                    phone: {
                      cls: "btn btn-hero-cta t-btn",
                      kids: [
                        {
                          icon: "phone20",
                        },
                        {
                          phoneNumber: true,
                        },
                      ],
                    },
                  },
                ],
              },
              " ",
            ],
          },
        ],
      },
    },
    {
      kind: "panel",
      el: {
        tag: "section",
        cls: "sec",
        style: "background:#F1E8DC",
        attrs: {
          id: "wait",
        },
        kids: [
          {
            tag: "div",
            cls: "wrap hub-split",
            kids: [
              " ",
              {
                tag: "div",
                cls: "hub-sticky",
                kids: [
                  {
                    tag: "span",
                    cls: "t-eyebrow",
                    style: "color:#BC0E0E",
                    kids: [
                      "Right Now",
                    ],
                  },
                  {
                    tag: "h2",
                    cls: "hub-h2 t-h2",
                    style: "margin:12px 0 18px",
                    kids: [
                      "What to Do While You Wait for a Plumber",
                    ],
                  },
                  {
                    tag: "p",
                    cls: "t-body pv-mute",
                    style: "margin:0 0 24px",
                    kids: [
                      "A few minutes of the right steps can save you thousands in damage. Start here:",
                    ],
                  },
                  {
                    tag: "p",
                    cls: "t-body-sm pv-mute",
                    style: "margin:0 0 18px",
                    kids: [
                      "Not sure which valve to close? Call us and we’ll walk you through it on the phone.",
                    ],
                  },
                  {
                    phone: {
                      cls: "btn btn-hero-cta t-btn",
                      kids: [
                        {
                          icon: "phone20",
                        },
                        {
                          phoneNumber: true,
                        },
                      ],
                    },
                  },
                ],
              },
              " ",
              {
                tag: "div",
                kids: [
                  {
                    tag: "ol",
                    cls: "em-steps",
                    kids: [
                      {
                        tag: "li",
                        kids: [
                          {
                            tag: "span",
                            cls: "em-n",
                            attrs: {
                              "aria-hidden": "true",
                            },
                            kids: [
                              "1",
                            ],
                          },
                          {
                            tag: "div",
                            kids: [
                              {
                                tag: "h3",
                                cls: "t-label",
                                style: "margin:0 0 6px;color:#0A1B2E",
                                kids: [
                                  "Shut off the water.",
                                ],
                              },
                              {
                                tag: "p",
                                cls: "t-body-sm pv-mute",
                                style: "margin:0",
                                kids: [
                                  "Close the valve on the fixture that’s leaking. If you can’t find one, or it won’t turn, close the main shutoff. It’s usually in the basement or crawl space, where the water line comes in through the wall.",
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        tag: "li",
                        kids: [
                          {
                            tag: "span",
                            cls: "em-n",
                            attrs: {
                              "aria-hidden": "true",
                            },
                            kids: [
                              "2",
                            ],
                          },
                          {
                            tag: "div",
                            kids: [
                              {
                                tag: "h3",
                                cls: "t-label",
                                style: "margin:0 0 6px;color:#0A1B2E",
                                kids: [
                                  "Stay away from water near outlets and appliances.",
                                ],
                              },
                              {
                                tag: "p",
                                cls: "t-body-sm pv-mute",
                                style: "margin:0",
                                kids: [
                                  "Only turn off power at the breaker panel if you can reach it without standing in water.",
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        tag: "li",
                        kids: [
                          {
                            tag: "span",
                            cls: "em-n",
                            attrs: {
                              "aria-hidden": "true",
                            },
                            kids: [
                              "3",
                            ],
                          },
                          {
                            tag: "div",
                            kids: [
                              {
                                tag: "h3",
                                cls: "t-label",
                                style: "margin:0 0 6px;color:#0A1B2E",
                                kids: [
                                  "Stop using the drains.",
                                ],
                              },
                              {
                                tag: "p",
                                cls: "t-body-sm pv-mute",
                                style: "margin:0",
                                kids: [
                                  "If sewage is backing up, don’t flush, shower or run the dishwasher or washing machine. Everything you send down comes back up.",
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        tag: "li",
                        kids: [
                          {
                            tag: "span",
                            cls: "em-n",
                            attrs: {
                              "aria-hidden": "true",
                            },
                            kids: [
                              "4",
                            ],
                          },
                          {
                            tag: "div",
                            kids: [
                              {
                                tag: "h3",
                                cls: "t-label",
                                style: "margin:0 0 6px;color:#0A1B2E",
                                kids: [
                                  "Turn off the water heater if it’s leaking.",
                                ],
                              },
                              {
                                tag: "p",
                                cls: "t-body-sm pv-mute",
                                style: "margin:0",
                                kids: [
                                  "Shut off the gas or power to the heater, then close the cold water valve on top of the tank.",
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        tag: "li",
                        kids: [
                          {
                            tag: "span",
                            cls: "em-n",
                            attrs: {
                              "aria-hidden": "true",
                            },
                            kids: [
                              "5",
                            ],
                          },
                          {
                            tag: "div",
                            kids: [
                              {
                                tag: "h3",
                                cls: "t-label",
                                style: "margin:0 0 6px;color:#0A1B2E",
                                kids: [
                                  "Protect what you can and take photos.",
                                ],
                              },
                              {
                                tag: "p",
                                cls: "t-body-sm pv-mute",
                                style: "margin:0",
                                kids: [
                                  "Move valuables off the floor. Photos of the damage help with an insurance claim later.",
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tag: "aside",
                    cls: "em-gas",
                    attrs: {
                      role: "note",
                    },
                    kids: [
                      {
                        tag: "span",
                        cls: "em-sign-i",
                        kids: [
                          {
                            icon: "emAlert",
                          },
                        ],
                      },
                      {
                        tag: "div",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-label",
                            style: "margin:0 0 6px;color:#BC0E0E",
                            kids: [
                              "If you smell gas, leave.",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm",
                            style: "margin:0;color:#0A1B2E",
                            kids: [
                              "Don’t flip switches or use anything that could spark. Call your gas utility or 911 from outside.",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              " ",
            ],
          },
        ],
      },
    },
    {
      kind: "panel",
      el: {
        tag: "section",
        cls: "sec",
        style: "background:#F9F3EC",
        attrs: {
          id: "why-us",
        },
        kids: [
          {
            tag: "div",
            cls: "wrap em-why",
            kids: [
              " ",
              {
                tag: "img",
                cls: "pv-img",
                attrs: {
                  src: "/images/services/emergency-plumbing/em-why-van.webp",
                  alt: "J. Blanton plumber kneeling in a stocked service van, pulling on work gloves before a job",
                  loading: "lazy",
                  width: "800",
                  height: "1200",
                },
              },
              " ",
              {
                tag: "div",
                kids: [
                  {
                    tag: "span",
                    cls: "t-eyebrow",
                    style: "color:#BC0E0E",
                    kids: [
                      "The J. Blanton Difference",
                    ],
                  },
                  {
                    tag: "h2",
                    cls: "hub-h2 t-h2",
                    style: "margin:12px 0 18px",
                    kids: [
                      "Why Homeowners Call Us When Things Go Wrong",
                    ],
                  },
                  {
                    tag: "p",
                    cls: "t-body pv-mute",
                    style: "margin:0 0 28px",
                    kids: [
                      "Plumbing problems don’t wait for business hours, and neither do we. Here’s what homeowners say about our emergency calls:",
                    ],
                  },
                  " ",
                  {
                    tag: "ol",
                    kids: [
                      {
                        tag: "li",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-h4",
                            style: "margin:0 0 8px",
                            kids: [
                              "We pick up nights, weekends and holidays.",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm pv-mute",
                            style: "margin:0",
                            kids: [
                              "Saturday nights, Sunday afternoons, the day before Thanksgiving. Our plumbers go out when the problem happens, not on Monday morning.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "li",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-h4",
                            style: "margin:0 0 8px",
                            kids: [
                              "We explain before we touch anything.",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm pv-mute",
                            style: "margin:0",
                            kids: [
                              "When you’re standing in water, you need someone who tells you what’s going on. Your plumber explains what they found, what your options are and what happens next, in plain English.",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "li",
                        kids: [
                          {
                            tag: "h3",
                            cls: "t-h4",
                            style: "margin:0 0 8px",
                            kids: [
                              "We treat your home with care.",
                            ],
                          },
                          {
                            tag: "p",
                            cls: "t-body-sm pv-mute",
                            style: "margin:0",
                            kids: [
                              "Shoe covers on, and the work area left clean. An emergency is stressful enough without a mess to clean up afterward.",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  " ",
                  {
                    phone: {
                      cls: "btn btn-hero-cta t-btn",
                      kids: [
                        {
                          icon: "phone20",
                        },
                        {
                          phoneNumber: true,
                        },
                      ],
                    },
                  },
                ],
              },
              " ",
            ],
          },
        ],
      },
    },
    {
      kind: "panel",
      el: {
        tag: "section",
        cls: "hub-fin",
        kids: [
          {
            tag: "div",
            cls: "wrap hub-fin-in",
            kids: [
              {
                tag: "div",
                cls: "hub-fin-copy",
                kids: [
                  {
                    tag: "span",
                    cls: "t-eyebrow",
                    style: "color:#F9F3EC",
                    kids: [
                      "Financing",
                    ],
                  },
                  {
                    tag: "h2",
                    cls: "t-h2",
                    style: "color:#F9F3EC;margin:12px 0 10px;max-width:440px",
                    kids: [
                      "Fix It With Financing As Low As 0%",
                    ],
                  },
                  {
                    tag: "p",
                    cls: "t-body-sm",
                    style: "color:#F9F3EC;margin:0 0 8px;max-width:440px",
                    kids: [
                      "We’ve partnered with trusted lenders, so you can get the service you need now and pay on your terms.",
                    ],
                  },
                  {
                    tag: "p",
                    cls: "t-body-sm",
                    style: "color:#F9F3EC;margin:0;max-width:440px;font-size:13px",
                    kids: [
                      "Subject to credit approval. Rates and terms vary.",
                    ],
                  },
                ],
              },
              {
                phone: {
                  cls: "btn btn-onred t-btn hub-fin-cta",
                  kids: [
                    {
                      icon: "phone20",
                    },
                    "Ask about your options",
                  ],
                },
              },
            ],
          },
        ],
      },
    },
    {
      kind: "locations",
      style: "background:#F9F3EC",
      map: {
        title: "Google Map of J. Blanton Plumbing office locations",
        src: "https://maps.google.com/maps?hl=en&q=J.%20Blanton%20Plumbing%2C%20Sewer%20%26%20Drain&ll=41.0%2C-85.35&z=7&ie=UTF8&iwloc=B&output=embed",
      },
      eyebrow: "Where We Work",
      heading: "Emergency Plumbing Near You",
      intro: "Our plumbers work out of local offices, so help comes from nearby. Find your closest office:",
      states: [
        {
          name: "Illinois",
          offices: [
            {
              label: "Algonquin",
              href: "/algonquin/emergency-plumbing",
            },
            {
              label: "Arlington Heights",
              href: "/arlington-heights/emergency-plumbing",
            },
            {
              label: "Chicago (Lincoln Park)",
              href: "/chicago-lincoln-park/emergency-plumbing",
            },
            {
              label: "Chicago (Ravenswood)",
              href: "/chicago-ravenswood/emergency-plumbing",
            },
            {
              label: "Elgin",
              href: "/elgin/emergency-plumbing",
            },
            {
              label: "Elmhurst",
              href: "/elmhurst/emergency-plumbing",
            },
            {
              label: "Evanston",
              href: "/evanston/emergency-plumbing",
            },
            {
              label: "Geneva",
              href: "/geneva/emergency-plumbing",
            },
            {
              label: "Hanover Park",
              href: "/hanover-park/emergency-plumbing",
            },
            {
              label: "Highland Park",
              href: "/highland-park/emergency-plumbing",
            },
            {
              label: "Hinsdale",
              href: "/hinsdale/emergency-plumbing",
            },
            {
              label: "Joliet",
              href: "/joliet/emergency-plumbing",
            },
            {
              label: "McHenry",
              href: "/mchenry/emergency-plumbing",
            },
            {
              label: "Mokena",
              href: "/mokena/emergency-plumbing",
            },
            {
              label: "Naperville",
              href: "/naperville/emergency-plumbing",
            },
            {
              label: "Northbrook",
              href: "/northbrook/emergency-plumbing",
            },
            {
              label: "Skokie",
              href: "/skokie/emergency-plumbing",
            },
            {
              label: "Tinley Park",
              href: "/tinley-park/emergency-plumbing",
            },
          ],
        },
        {
          name: "Ohio",
          offices: [
            {
              label: "Columbus",
              href: "/columbus/emergency-plumbing",
            },
          ],
        },
      ],
      close: "Each office also covers the towns around it, and more. Not sure which one is yours? Call us and we’ll route you.",
    },
    {
      kind: "panel",
      el: {
        tag: "section",
        cls: "sec-tight",
        style: "background:#F1E8DC",
        attrs: {
          id: "business",
        },
        kids: [
          {
            tag: "div",
            cls: "wrap wh-biz",
            kids: [
              " ",
              {
                tag: "span",
                cls: "wh-biz-icon",
                kids: [
                  {
                    icon: "storefront",
                  },
                ],
              },
              " ",
              {
                tag: "div",
                kids: [
                  {
                    tag: "h2",
                    cls: "t-h2",
                    style: "margin:0 0 10px",
                    kids: [
                      "Emergency at Your Business? We Handle That Too",
                    ],
                  },
                  {
                    tag: "p",
                    cls: "t-body pv-mute",
                    style: "margin:0;max-width:70ch",
                    kids: [
                      "A backed-up drain or burst pipe at a restaurant, office or store can mean closing for the day. Our ",
                      {
                        tag: "a",
                        attrs: {
                          href: "/services/commercial",
                        },
                        kids: [
                          "commercial plumbing team",
                        ],
                      },
                      " handles the larger systems businesses run on.",
                    ],
                  },
                ],
              },
              " ",
              {
                tag: "a",
                cls: "svc-cta",
                attrs: {
                  href: "/services/commercial",
                  "aria-label": "Learn More about Commercial Plumbing",
                },
                kids: [
                  "Learn More ",
                  {
                    tag: "span",
                    attrs: {
                      "aria-hidden": "true",
                    },
                    kids: [
                      "→",
                    ],
                  },
                ],
              },
              " ",
            ],
          },
        ],
      },
    },
    {
      kind: "panel",
      el: {
        tag: "section",
        cls: "ndc ndc--band",
        attrs: {
          id: "no-drip-club",
        },
        kids: [
          {
            tag: "div",
            cls: "wrap",
            kids: [
              {
                tag: "div",
                cls: "ndc-grid",
                kids: [
                  {
                    tag: "div",
                    cls: "ndc-text",
                    kids: [
                      {
                        tag: "p",
                        cls: "t-eyebrow ndc-eyebrow",
                        kids: [
                          "Annual Protection Plan",
                        ],
                      },
                      {
                        tag: "h2",
                        cls: "t-h2 ndc-h2",
                        kids: [
                          "Skip the Emergency Fees With the ",
                          {
                            tag: "a",
                            attrs: {
                              href: "/no-drip-club",
                            },
                            kids: [
                              "No Drip Club",
                            ],
                          },
                        ],
                      },
                      {
                        tag: "p",
                        cls: "ndc-body",
                        kids: [
                          "Some homes have more plumbing emergencies than others. No Drip Club members never pay emergency fees or after-hours charges, and two maintenance visits a year help us catch small problems before they turn into a 2 a.m. call.",
                        ],
                      },
                      {
                        tag: "ul",
                        cls: "ndc-list",
                        kids: [
                          {
                            tag: "li",
                            kids: [
                              {
                                tag: "span",
                                cls: "ndc-check",
                                kids: [
                                  {
                                    icon: "ndcCheck",
                                  },
                                ],
                              },
                              {
                                tag: "span",
                                kids: [
                                  "No Emergency Fees or Trip Charges",
                                ],
                              },
                            ],
                          },
                          {
                            tag: "li",
                            kids: [
                              {
                                tag: "span",
                                cls: "ndc-check",
                                kids: [
                                  {
                                    icon: "ndcCheck",
                                  },
                                ],
                              },
                              {
                                tag: "span",
                                kids: [
                                  "No After-Hours or Holiday Charges",
                                ],
                              },
                            ],
                          },
                          {
                            tag: "li",
                            kids: [
                              {
                                tag: "span",
                                cls: "ndc-check",
                                kids: [
                                  {
                                    icon: "ndcCheck",
                                  },
                                ],
                              },
                              {
                                tag: "span",
                                kids: [
                                  "VIP Priority Scheduling (Skip the Queue)",
                                ],
                              },
                            ],
                          },
                          {
                            tag: "li",
                            kids: [
                              {
                                tag: "span",
                                cls: "ndc-check",
                                kids: [
                                  {
                                    icon: "ndcCheck",
                                  },
                                ],
                              },
                              {
                                tag: "span",
                                kids: [
                                  "10% Discount on Service and Equipment",
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        tag: "a",
                        cls: "btn btn-primary t-btn ndc-btn",
                        attrs: {
                          href: "/no-drip-club",
                        },
                        kids: [
                          {
                            icon: "userPlus",
                          },
                          "Learn More About the No Drip Club",
                        ],
                      },
                    ],
                  },
                  {
                    tag: "div",
                    cls: "ndc-figure",
                    kids: [
                      {
                        tag: "img",
                        attrs: {
                          src: "/images/services/sewer/j-ndc.webp",
                          alt: "",
                          width: "1180",
                          height: "1604",
                          loading: "lazy",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      kind: "faq",
      layout: "hub",
      cls: "sec",
      style: "background:#F9F3EC",
      eyebrow: "Got Questions?",
      heading: "Emergency Plumbing Questions",
      items: [
        {
          q: "What counts as a plumbing emergency?",
          preview: "Any problem where waiting makes things worse or puts someone at risk.",
          full: "Any problem where waiting makes things worse or puts someone at risk. Burst pipes, sewage backing up, a flooding basement, a leaking water heater and a gas smell all count. If you can’t shut the water off, or you can’t use your toilets or drains, call right away.",
        },
        {
          q: "Do you really answer at night, on weekends and on holidays?",
          preview: "Yes. We take emergency calls at any hour, and our plumbers go out nights, weekends and holidays.",
          full: "Yes. We take emergency calls at any hour, and our plumbers go out nights, weekends and holidays. During big storms, when many homes flood at once, we’ll tell you honestly when we can get there and help you limit the damage until then.",
        },
        {
          q: "How fast can you get a plumber to my house?",
          preview: "It depends on the time of day, where you are and how many emergencies are coming in.",
          full: "It depends on the time of day, where you are and how many emergencies are coming in. When you call, we give you the soonest time we can and keep you posted until your plumber arrives.",
        },
        {
          q: "How much does an emergency plumber cost?",
          preview: "It depends on what’s wrong, what it takes to fix it and the parts involved, so we don’t guess over the phone.",
          full: "It depends on what’s wrong, what it takes to fix it and the parts involved, so we don’t guess over the phone. Your plumber finds the cause first, then explains your options and the cost before any work starts. Flexible financing options are available.",
        },
        {
          q: "Do you charge extra at night or on weekends?",
          preview: "Timing can affect the cost of a job, and we won’t pretend otherwise.",
          full: "Timing can affect the cost of a job, and we won’t pretend otherwise. What we can promise is that you’ll know the cost before any work starts, so there are no surprises on the bill.",
        },
        {
          q: "Is a leaking toilet an emergency at night?",
          preview: "It depends on the leak. A toilet that keeps running or drips a little at the base can usually wait until morning.",
          full: "It depends on the leak. A toilet that keeps running or drips a little at the base can usually wait until morning. Close the valve behind it and call us during the day. A toilet that’s overflowing, backing up into the tub or flooding the floor is an emergency. Call now.",
        },
        {
          q: "Is a clogged drain an emergency?",
          preview: "A single slow drain usually isn’t. Several drains backing up at once, or sewage coming up through a floor drain, is.",
          full: "A single slow drain usually isn’t. Several drains backing up at once, or sewage coming up through a floor drain, is. That points to a blockage in the main line, and it will keep getting worse every time water runs in the house.",
        },
        {
          q: "Do you handle plumbing emergencies in Ohio?",
          preview: "Yes. We serve homeowners in Columbus and the surrounding area.",
          full: [
            "Yes. We serve homeowners in Columbus and the surrounding area. See our ",
            {
              tag: "a",
              attrs: {
                href: "/columbus/emergency-plumbing",
              },
              kids: [
                "Columbus emergency plumbing",
              ],
            },
            " page or call us to get started.",
          ],
        },
      ],
    },
    {
      kind: "panel",
      el: {
        tag: "section",
        cls: "sec final-cta",
        kids: [
          {
            tag: "div",
            cls: "wrap hub-final",
            kids: [
              {
                tag: "div",
                kids: [
                  {
                    tag: "span",
                    cls: "t-eyebrow",
                    style: "color:#BC0E0E",
                    kids: [
                      "Call Us Now",
                    ],
                  },
                  {
                    tag: "h2",
                    cls: "hub-h2 t-h2",
                    style: "margin:12px 0 16px",
                    kids: [
                      "Still Have Water Where It Shouldn’t Be?",
                    ],
                  },
                  {
                    tag: "p",
                    cls: "t-body pv-mute",
                    style: "margin:0",
                    kids: [
                      "We’ve been answering plumbing emergencies since 1993. One call gets it handled.",
                    ],
                  },
                ],
              },
              " ",
              {
                tag: "div",
                cls: "hub-final-btns",
                style: "display:flex;flex-wrap:wrap;gap:14px",
                kids: [
                  {
                    phone: {
                      cls: "btn btn-hero-cta t-btn",
                      kids: [
                        "Call Now: ",
                        {
                          phoneNumber: true,
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
  rail: null,
  service: {
    name: "Emergency Plumbing",
    serviceType: "Emergency plumber",
    description: "",
    audienceType: "",
    catalog: null,
  },
};

/**
 * The page's "shared" record (stored on the same row under `v2_content.shared` — this page shares nothing
 * with the sewer or water heater pages). `call` is not shown on this page and `financing` is the fixed
 * copy (the financing band itself is a locked panel above); both are locked by conform.
 */
export const EM_SHARED_DEFAULT: WhSharedContent = {
  badge24Label: "24 hours, 7 days a week emergency service",
  quickLinks: {
    ariaLabel: "Quick links",
    links: [
      {
        href: "#wait",
        label: "What to Do Now",
      },
      {
        href: "#locations",
        label: "Find Your Office",
      },
      {
        href: "/financing",
        label: "Financing",
      },
      {
        href: "#faq",
        label: "FAQ",
      },
    ],
  },
  crumbParent: {
    label: "Emergency Plumbing",
    href: "/emergency-plumbing",
  },
  call: {
    heading: "24/7 Emergency Service",
    body: "Dispatched nights, weekends, and holidays.",
    cta: "Call Now",
  },
  financing: {
    eyebrow: "Financing",
    heading: "Fix It With Financing As Low As 0%",
    body: "We’ve partnered with trusted lenders, so you can get the service you need now and pay on your terms.",
    note: "Subject to credit approval. Rates and terms vary.",
    cta: "Ask about your options",
    image: "/images/services/sewer/financing-family.webp",
    alt: "J. Blanton Plumbing technician reviewing financing options with a homeowner couple at their kitchen table",
  },
  sticky: {
    title: "24/7 Emergency Service",
    sub: "Nights, weekends and holidays.",
    cta: "Call Now",
    ariaLabel: "Call J. Blanton Plumbing now, {{phone}}",
  },
  proof: {
    ariaLabel: "Review ratings and accreditation",
    rating: "{{company_rating}}",
    starsLabel: "{{company_rating}} out of 5 stars",
    sub: "Average from {{company_review_count}} Google reviews",
    bbb: {
      href: "https://www.bbb.org/us/il/morton-grove/profile/plumber/j-blanton-plumbing-0654-88664305/#sealclick",
      seal: "/images/services/sewer/bbb-seal.webp",
      sealAlt: "BBB Accredited Business seal",
      label: "Accredited business. View our BBB profile",
    },
  },
  review: {
    stars: "★★★★★",
    starsLabel: "5 out of 5 stars",
    caption: "Verified Customer",
  },
};
