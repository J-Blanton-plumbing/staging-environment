/* Sewer Ecosystem V2 (sandbox). Shared behavior for the hub and every sub-service page.
   1. Mobile drawer   2. FAQ accordion (animated)   3. Survival chart + count-up (hub) */
(function(){
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

  /* 1. Drawer */
  (function(){
    var ov = document.getElementById('jbp-drawer'), b = document.querySelector('.jbp-burger'), root = document.documentElement;
    if (!ov || !b) return;
    var x = ov.querySelector('.jbp-drawer-close');
    function open(){ ov.classList.add('open'); b.setAttribute('aria-expanded','true'); root.classList.add('jbp-lock'); if (x) x.focus({preventScroll:true}); }
    function close(){
      if (!ov.classList.contains('open')) return;
      ov.classList.remove('open'); b.setAttribute('aria-expanded','false'); root.classList.remove('jbp-lock'); b.focus({preventScroll:true});
    }
    b.addEventListener('click', open);
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    if (x) x.addEventListener('click', close);
    ov.querySelectorAll('.jbp-drawer-nav a,.jbp-drawer-cta,.jbp-drawer-phone').forEach(function(a){ a.addEventListener('click', close); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
    window.addEventListener('resize', function(){ if (window.innerWidth > 1070) close(); });
  })();

  /* 2. FAQ accordion: height animated with WAAPI, preview swaps to full answer */
  document.addEventListener('click', function(e){
    var btn = e.target.closest('.faq-q');
    if (!btn) return;
    var item = btn.closest('.faq-item2'), panel = item.querySelector('.faq-panel');
    if (!panel) return;
    var from = panel.getBoundingClientRect().height;
    if (panel.getAnimations) panel.getAnimations({subtree:true}).forEach(function(a){ a.cancel(); });
    var open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!panel.animate) return;
    panel.querySelector(open ? '.faq-full' : '.faq-preview').animate([{opacity:0},{opacity:1}], {duration:200, easing:EASE});
    if (reduce) return;
    var to = panel.getBoundingClientRect().height;
    panel.animate([{height:from+'px'},{height:to+'px'}], {duration:220, easing:EASE});
  });

  /* 3b. Content images: fade in once loaded, instead of popping in (lazy-loaded cards/tiles) */
  document.querySelectorAll('img.pv-img').forEach(function(img){
    if (img.complete && img.naturalWidth) { img.classList.add('is-loaded'); return; }
    img.addEventListener('load', function(){ img.classList.add('is-loaded'); }, {once:true});
    img.addEventListener('error', function(){ img.classList.add('is-loaded'); }, {once:true});
  });

  /* 3c. Testimonial cards (3 only, deliberately not the whole page): reveal on scroll,
     reusing the existing pv-in/pvIn entrance rather than a parallel keyframe. */
  var reveals = [].slice.call(document.querySelectorAll('.pv-reveal'));
  if (reveals.length){
    if (reduce || !('IntersectionObserver' in window)){
      reveals.forEach(function(el){ el.classList.add('pv-in'); });
    } else {
      var ioReveal = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if (!en.isIntersecting) return;
          en.target.classList.add('pv-in');
          ioReveal.unobserve(en.target);
        });
      }, {threshold:0.3});
      reveals.forEach(function(el){ ioReveal.observe(el); });
    }
  }

  /* 3. Survival chart: bars grow, labels count up once when scrolled into view */
  var charts = [].slice.call(document.querySelectorAll('[data-chart]'));
  var counters = [].slice.call(document.querySelectorAll('[data-count-solo]'));
  function countUp(el, dur){
    var end = parseFloat(el.getAttribute('data-count')), t0 = null;
    if (isNaN(end)) return;
    function step(t){
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased);
      if (p < 1) requestAnimationFrame(step); else el.textContent = end;
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }
  if (reduce || !('IntersectionObserver' in window)){
    charts.forEach(function(c){ c.classList.add('reduce','is-in'); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (!en.isIntersecting) return;
      var el = en.target; io.unobserve(el);
      if (el.hasAttribute('data-chart')){
        el.classList.add('is-in');
        [].slice.call(el.querySelectorAll('[data-count]')).forEach(function(n, i){
          setTimeout(function(){ countUp(n, 900); }, i * 110 + 250);
        });
      } else { countUp(el, 1200); }
    });
  }, {threshold:0.35});
  charts.forEach(function(c){
    // start hidden values at 0 so the count-up has somewhere to start (bars are hidden by CSS until .is-in)
    [].slice.call(c.querySelectorAll('[data-count]')).forEach(function(n){ n.textContent = '0'; });
    io.observe(c);
  });
  counters.forEach(function(n){ n.textContent = '0'; io.observe(n); });
})();

/* 4. Card rails: horizontal scrollers with prev/next buttons, an edge mask that fades
   whichever side still has hidden cards, and keyboard support (tabindex on the scroller
   itself, so arrow keys work once it's focused, in addition to the buttons). Separate IIFE
   so it isn't skipped by the early `return` inside block 3 on reduced-motion/no-IO browsers. */
(function(){
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FADE = 36;

  function buildMask(canLeft, canRight){
    var stops = [];
    stops.push(canLeft ? 'transparent 0' : 'black 0');
    if (canLeft) stops.push('black ' + FADE + 'px');
    stops.push(canRight ? 'black calc(100% - ' + FADE + 'px)' : 'black 100%');
    if (canRight) stops.push('transparent 100%');
    return 'linear-gradient(to right, ' + stops.join(', ') + ')';
  }

  [].slice.call(document.querySelectorAll('.rail-block')).forEach(function(block){
    var rail = block.querySelector('.rail');
    var prev = block.querySelector('[data-rail-dir="prev"]');
    var next = block.querySelector('[data-rail-dir="next"]');
    var nav = block.querySelector('.rail-nav');
    if (!rail) return;

    function update(){
      var max = rail.scrollWidth - rail.clientWidth;
      var scrollable = max > 2;
      var canLeft = scrollable && rail.scrollLeft > 2;
      var canRight = scrollable && rail.scrollLeft < max - 2;

      if (nav) nav.hidden = !scrollable;
      if (prev) prev.disabled = !canLeft;
      if (next) next.disabled = !canRight;

      var mask = scrollable ? buildMask(canLeft, canRight) : 'none';
      rail.style.maskImage = mask;
      rail.style.webkitMaskImage = mask;
    }

    function scrollByCard(dir){
      var card = rail.querySelector('.card');
      var step = card ? card.getBoundingClientRect().width + 20 : rail.clientWidth * 0.8;
      rail.scrollBy({ left: dir * step, behavior: reduce ? 'auto' : 'smooth' });
    }

    if (prev) prev.addEventListener('click', function(){ scrollByCard(-1); });
    if (next) next.addEventListener('click', function(){ scrollByCard(1); });
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();
