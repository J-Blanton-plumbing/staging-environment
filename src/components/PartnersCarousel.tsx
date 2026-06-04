/**
 * v2 "OUR PARTNERS" logo marquee — theme `.image-carousel` (city.css 642–676).
 * An auto-scrolling track that repeats the logo set 3× for a seamless loop;
 * 20s linear infinite, paused on hover (see `.city-marquee*` in globals.css).
 * Each item is 25% wide; logos cap at 80px tall (50px on mobile).
 *
 * Only Evanston + Northbrook have partners on the live site, so the caller gates
 * on `logos.length` — this component assumes a non-empty list.
 */
export default function PartnersCarousel({ logos }: { logos: string[] }) {
  // Triple the set so the -100% keyframe scroll wraps without a visible seam.
  const track = [...logos, ...logos, ...logos];

  return (
    <section>
      <p className="red-text2 block w-full text-center font-display text-[2.5rem] font-bold leading-[1.2] text-brand-600 my-8">
        OUR PARTNERS
      </p>
      <div className="city-marquee relative w-full overflow-hidden bg-cream-100 pb-[30px]">
        <div className="city-marquee-track flex items-center">
          {track.map((src, i) => (
            <div key={`${src}-${i}`} className="mr-8 max-[600px]:mr-4 flex-[0_0_25%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="block w-auto max-h-[80px] max-[600px]:max-h-[50px] object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
