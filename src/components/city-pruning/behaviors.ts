/**
 * Brief 229 — the City Pruning pilot pages' two small behaviours, as plain DOM functions that
 * `CityHubRoot` (the existing client root of every hub-styled page) runs ONLY on a `.pruned` root:
 *
 *   wireServiceAreasSearch — the "Do We Serve Your Town?" search (Tier 1 v7 at 12+ towns, Tier 3 at 12+):
 *                            typing hides non-matching towns; no match → the package's line with the
 *                            panel's state page (`data-state-url` / `data-state-name`) and phone
 *                            (`data-phone-href`). The query is inserted as TEXT, never HTML.
 *   wireTownCarousel       — the Tier 3 services carousel: tags and arrows scroll the track; an
 *                            IntersectionObserver keeps the active tag, `aria-current` and the disabled
 *                            arrow in step. Every card is in the server HTML; only the track scrolls.
 *
 * They live here, not in new client components, on purpose: a client component imported into the
 * `[city]` route (statically, or via next/dynamic from a SERVER component) changes the client chunks /
 * CSS links of EVERY city page — the control pages must stay byte-identical. The package's inline
 * scripts couldn't be used either (an inline <script> doesn't run after a client-side navigation).
 */

export function wireServiceAreasSearch(root: HTMLElement): () => void {
  const offs: Array<() => void> = [];
  root.querySelectorAll<HTMLInputElement>('[data-cb-input]').forEach((input) => {
    const panel = input.closest<HTMLElement>('#service-areas');
    const list = panel?.querySelector('[data-cb-list]');
    const empty = panel?.querySelector<HTMLElement>('[data-cb-empty]');
    if (!panel || !list || !empty) return;
    const onInput = () => {
      const q = input.value.trim().toLowerCase();
      let n = 0;
      list.querySelectorAll<HTMLElement>('li').forEach((li) => {
        const match = !q || (li.textContent ?? '').toLowerCase().includes(q);
        li.hidden = !match;
        if (match) n++;
      });
      empty.hidden = n > 0;
      empty.textContent = '';
      if (n > 0) return;
      const state = document.createElement('a');
      state.href = panel.dataset.stateUrl || '/locations';
      state.textContent = `See all our ${panel.dataset.stateName || ''} locations`.replace(/\s+/g, ' ');
      const call = document.createElement('a');
      call.href = panel.dataset.phoneHref || '#book';
      call.textContent = 'call us 24/7';
      empty.append(`We don’t list “${input.value.replace(/[<>&"]/g, '')}” here. `, state, ' or ', call, ' and we’ll let you know.');
    };
    input.addEventListener('input', onInput);
    offs.push(() => input.removeEventListener('input', onInput));
  });
  return () => offs.forEach((f) => f());
}

export function wireTownCarousel(root: HTMLElement): () => void {
  const region = root.querySelector<HTMLElement>('.t3d');
  const track = region?.querySelector<HTMLElement>('[data-t3d-track]');
  if (!region || !track) return () => {};
  const cards = Array.from(track.children) as HTMLElement[];
  const tags = Array.from(region.querySelectorAll<HTMLAnchorElement>('.t3d-tag'));
  const prev = region.querySelector<HTMLButtonElement>('[data-t3d-prev]');
  const next = region.querySelector<HTMLButtonElement>('[data-t3d-next]');
  let cur = 0;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const go = (i: number) => {
    const k = Math.max(0, Math.min(cards.length - 1, i));
    track.scrollTo({ left: cards[k].offsetLeft - track.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  };
  const set = (i: number) => {
    if (i < 0) return;
    cur = i;
    tags.forEach((t, k) => {
      t.classList.toggle('is-on', k === i);
      t.setAttribute('aria-current', k === i ? 'true' : 'false');
    });
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === cards.length - 1;
    const a = tags[i];
    const ul = a?.closest('ul');
    if (a && ul && ul.scrollWidth > ul.clientWidth) {
      const r = a.getBoundingClientRect();
      const u = ul.getBoundingClientRect();
      if (r.left < u.left || r.right > u.right) ul.scrollBy({ left: r.left - u.left - 16, behavior: 'smooth' });
    }
  };
  const offs: Array<() => void> = [];
  tags.forEach((t, k) => {
    const h = (e: Event) => {
      e.preventDefault();
      go(k);
    };
    t.addEventListener('click', h);
    offs.push(() => t.removeEventListener('click', h));
  });
  const onPrev = () => go(cur - 1);
  const onNext = () => go(cur + 1);
  prev?.addEventListener('click', onPrev);
  next?.addEventListener('click', onNext);
  offs.push(() => prev?.removeEventListener('click', onPrev));
  offs.push(() => next?.removeEventListener('click', onNext));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.intersectionRatio > 0.6) set(cards.indexOf(e.target as HTMLElement)); }), { root: track, threshold: [0.6] });
    cards.forEach((c) => io.observe(c));
    offs.push(() => io.disconnect());
  }
  set(0);
  return () => offs.forEach((f) => f());
}
