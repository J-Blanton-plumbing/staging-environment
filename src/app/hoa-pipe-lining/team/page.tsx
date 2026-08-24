import type { Metadata } from 'next';
import HoaLandingScripts from '@/components/hoa-pipe-lining/HoaLandingScripts';
import HoaClusterLinks from '@/components/hoa-pipe-lining/HoaClusterLinks';

// Brief 127 — Team page (`/hoa-pipe-lining/team`).
//
// Source deviation: the brief names this page's source as
// `…\HOA-line-piping\clean\hoa-line-piping.html`, which does not exist on
// disk. Per the brief's own note that this page's content is unchanged from
// the prior Brief 125/126 deployment, the CURRENTLY DEPLOYED static file
// (`public/hoa-pipe-lining/team/index.html`) was used as the source of truth
// instead.
//
// Dropped from that source (dead builder-tool cruft, verified unused):
//   - `<x-dc>` / `<helmet>` wrapper tags.
//   - The head `<script src=".../3c41a415-....js">` builder-support script —
//     the real burger/carousel/form/sewer-sync logic lives in the plain
//     `<script>` IIFEs near the end of the file (reimplemented below via
//     `HoaLandingScripts`), not in this file.
//   - A ~260-line `<style>` block of `@font-face` rules for "IBM Plex Mono"
//     and "Kanit" — grepped the full source file and neither family name is
//     referenced anywhere outside that block itself (the page only uses
//     Industry/Nunito). Treated as builder-tool default-typography cruft,
//     same category as the DCLogic script, and dropped for the same reason.
//     Its `<link rel="preconnect" ...>` tags (googleapis/gstatic) were
//     dropped alongside it since the actual font files here are self-hosted,
//     not Google Fonts.
//   - The trailing `<script type="text/x-dc" data-dc-script="">class
//     Component extends DCLogic {...}</script>` block — DCLogic is not a
//     real runtime; never executed in production.
//   - The trailing plain `<script>` IIFEs (drawer, carousel, form,
//     sewer-camera poll) — reimplemented via `HoaLandingScripts` below with
//     the exact same selectors/ids.
//   - `<footer class="jbp-footer">...</footer>` — replaced by the shared
//     `<Footer>` (via `SiteShell`) + `<HoaClusterLinks current="team" />`.
//     Its now-unused CSS (`.jbp-footer*`, `.jbp-loc-*`, `.jbp-badge-row`,
//     `.jbp-review-btn`, `.jbp-socials`, and their two media-query rules)
//     was removed from PAGE_CSS too, since nothing in BODY_HTML carries
//     those classes any more.
//   - The `<link rel="canonical">` tag — the root layout generates this
//     automatically from the request pathname.
//
// CSS scoping: `.jbp-*` rules and class-keyed `@media` blocks are unchanged.
// The two bare/element-level rules found were rescoped under `.hoa-landing`:
//   - the single `body{font-family:...}` rule inside the `jbp-brand` style
//     block, and
//   - the small second `<style>` block inside `<helmet>` (`body`, `*`, `a`,
//     `a:hover`, `::selection`) — the brief flagged this as something to
//     check for; it IS present in this source, unlike what the brief assumed.
// No `x-dc{display:block}` rule was present in this source (nothing to drop
// there).
//
// The outer wrapper `<div style="...">` became `<div className="hoa-landing">`;
// its `background`/`font-family` were dropped as duplicates of the scoped
// `.hoa-landing` CSS rule, and its non-duplicate `color`/`overflow-x` were
// kept as an inline `style` prop on the JSX div instead.
//
// Asset paths were already absolute (`/hoa-pipe-lining/team/assets/...`)
// since this source came from the already-deployed file — verified via grep,
// zero bare `assets/` references. Every referenced asset (fonts, the four
// `team-*` headshots, badges, social icons, `sewer-camera-sync.html`) was
// confirmed present under `public/hoa-pipe-lining/team/assets/`.
//
// Inline poll script right after the iframe
// (`window.__resources.sewerSync` / 200×50ms fallback) removed — its exact
// behavior is the `sewerCameraSync` prop below.

export const metadata: Metadata = { title: 'Meet the HOA Sewer & Drain Team' };

const PAGE_CSS = `
@font-face{font-family:'Industry';src:url('/hoa-pipe-lining/team/assets/fonts/IMedium.otf') format('opentype');font-weight:500;font-style:normal;font-display:swap;}
@font-face{font-family:'Industry';src:url('/hoa-pipe-lining/team/assets/fonts/IDemi.otf') format('opentype');font-weight:600;font-style:normal;font-display:swap;}
@font-face{font-family:'Industry';src:url('/hoa-pipe-lining/team/assets/fonts/IBold.otf') format('opentype');font-weight:700;font-style:normal;font-display:swap;}
@font-face{font-family:'Industry';src:url('/hoa-pipe-lining/team/assets/fonts/IBlack.otf') format('opentype');font-weight:800;font-style:normal;font-display:swap;}
@font-face{font-family:'Industry';src:url('/hoa-pipe-lining/team/assets/fonts/IBlack.otf') format('opentype');font-weight:900;font-style:normal;font-display:swap;}
@font-face{font-family:'Nunito';src:url('/hoa-pipe-lining/team/assets/fonts/Nunito-Variable.ttf') format('truetype');font-weight:300 800;font-style:normal;font-display:swap;}
.hoa-landing{font-family:'Nunito',system-ui,sans-serif;}

/* ===== Header — matches staging Navbar (cream bar, red rectangle logo, blue CTA) ===== */
.jbp-header{position:sticky;top:0;left:0;right:0;z-index:60;display:flex;width:100%;box-shadow:0 0 10px rgba(0,0,0,.3);}
.jbp-logo{position:absolute;z-index:20;width:225px;height:158px;pointer-events:none;}
.jbp-logo-bg{position:absolute;inset:0;width:100%;height:100%;}
.jbp-logo-link{position:absolute;z-index:30;pointer-events:auto;width:168px;height:87px;margin-top:20px;left:40%;transform:translateX(-40%);}
.jbp-logo-link img{width:100%;height:100%;object-fit:contain;}
.jbp-bar{width:100%;height:70px;background:#F9F3EC;color:#BC0E0E;display:flex;justify-content:flex-end;padding-left:240px;}
.jbp-nav{display:flex;}
.jbp-nav a{display:flex;align-items:center;padding:0 15px;font-family:'Industry','Arial',sans-serif;font-weight:500;font-size:16px;text-transform:uppercase;letter-spacing:.01em;color:#BC0E0E;text-decoration:none;white-space:nowrap;transition:color .15s,background .15s;}
.jbp-nav a:hover{color:#9B0D0D;background:#FBE5E5;}
.jbp-phone{display:flex;align-items:center;padding:0 25px;font-family:'Industry','Arial',sans-serif;font-weight:500;font-size:16px;color:#BC0E0E;text-decoration:none;white-space:nowrap;transition:color .15s,background .15s;}
.jbp-phone:hover{color:#9B0D0D;background:#FBE5E5;}
.jbp-phone svg{height:22px;width:22px;margin-right:6px;}
.jbp-cta{display:flex;align-items:center;padding:0 30px;background:#1560E6;color:#fff;font-family:'Industry','Arial',sans-serif;font-weight:500;font-size:16px;text-transform:uppercase;letter-spacing:.01em;text-decoration:none;white-space:nowrap;transition:background .15s;}
.jbp-cta:hover{background:#BC0E0E;}
.jbp-logo-sm{display:none;}
@media(max-width:1070px){
  .jbp-logo{display:none;}
  .jbp-bar{padding-left:16px;justify-content:space-between;align-items:center;}
  .jbp-nav{display:none;}
  .jbp-logo-sm{display:flex;align-items:center;}
  .jbp-logo-sm img{height:44px;width:auto;}
}

.jbp-role-select{width:100%;min-width:0;font-family:'Nunito',system-ui,sans-serif;font-size:17px;padding:12px 40px 12px 14px;border:1px solid rgba(35,31,32,0.25);border-radius:6px;background-color:#fff;color:#231F20;letter-spacing:0;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23231F20' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-size:14px;cursor:pointer;}
.jbp-btn-blue{transition:background-color .15s ease,color .15s ease;}.jbp-btn-blue:hover{background:#0A1B2E !important;color:#fff !important;}.jbp-btn-white{transition:background-color .15s ease,color .15s ease;}.jbp-btn-white:hover{background:#F9F3EC !important;color:#9B0D0D !important;}.jbp-navlink{transition:color .15s ease;}.jbp-navlink:hover{color:#BC0E0E !important;}.jbp-phone-dim{transition:color .15s ease;}.jbp-phone-dim:hover{color:rgba(255,255,255,0.78) !important;}

/* ================= MOBILE: header burger + content fixes ================= */
.jbp-mobile-actions{display:none;align-items:center;gap:8px;}
.jbp-icon-btn{display:flex;align-items:center;justify-content:center;height:40px;width:40px;border-radius:9999px;border:0;cursor:pointer;text-decoration:none;}
.jbp-icon-phone{background:#BC0E0E;color:#fff;}
.jbp-icon-cal{background:#1560E6;color:#fff;}
.jbp-icon-btn svg{height:18px;width:18px;}
.jbp-burger{display:flex;align-items:center;justify-content:center;height:40px;width:40px;background:transparent;border:0;color:#BC0E0E;cursor:pointer;}
.jbp-burger svg{height:26px;width:26px;}
.jbp-drawer-overlay{display:none;position:fixed;inset:0;z-index:70;background:rgba(5,13,24,0.6);opacity:0;pointer-events:none;transition:opacity .25s ease;}
.jbp-drawer-overlay.open{opacity:1;pointer-events:auto;}
.jbp-drawer{position:absolute;top:0;right:0;height:100%;width:85%;max-width:360px;background:#BC0E0E;box-shadow:-8px 0 30px rgba(0,0,0,.35);transform:translateX(100%);transition:transform .3s ease;display:flex;flex-direction:column;padding:20px;overflow-y:auto;}
.jbp-drawer-overlay.open .jbp-drawer{transform:translateX(0);}
.jbp-drawer-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.2);}
.jbp-drawer-head img{height:34px;width:auto;}
.jbp-drawer-close{display:flex;background:transparent;border:0;color:#fff;cursor:pointer;}
.jbp-drawer-close svg{height:24px;width:24px;}
.jbp-drawer-nav{display:flex;flex-direction:column;}
.jbp-drawer-nav a{padding:14px 2px;font-family:'Industry','Arial',sans-serif;font-weight:500;font-size:20px;text-transform:uppercase;letter-spacing:.02em;color:#fff;text-decoration:none;border-bottom:1px solid rgba(255,255,255,0.2);}
.jbp-drawer-phone{margin-top:22px;display:flex;align-items:center;justify-content:center;gap:8px;background:#fff;color:#BC0E0E;font-family:'Industry','Arial',sans-serif;font-weight:700;font-size:16px;padding:13px;border-radius:6px;text-decoration:none;}
.jbp-drawer-phone svg{height:18px;width:18px;}
.jbp-drawer-cta{margin-top:12px;display:flex;align-items:center;justify-content:center;background:#1560E6;color:#fff;font-family:'Industry','Arial',sans-serif;font-weight:700;font-size:15px;letter-spacing:.04em;text-transform:uppercase;padding:14px;border-radius:6px;text-decoration:none;}
.lbl-short{display:none;}
.jbp-carousel{position:relative;}
.jbp-car-prev,.jbp-car-next{display:none;align-items:center;justify-content:center;position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border:0;border-radius:9999px;background:rgba(10,27,46,0.72);color:#fff;font-size:26px;line-height:1;cursor:pointer;z-index:5;padding:0 0 4px;}
.jbp-car-prev{left:10px;} .jbp-car-next{right:10px;}

@media(max-width:1070px){
  .jbp-phone,.jbp-cta{display:none;}
  .jbp-mobile-actions{display:flex;}
  .jbp-drawer-overlay{display:block;}
}

@media(max-width:768px){
  /* 3 - hide duplicate sub-nav strip */
  .jbp-subnav{display:none !important;}
  /* 2 - hero buttons equal width + centered, short label */
  .jbp-hero-cta{flex-direction:column;align-items:stretch;}
  .jbp-hero-cta > a{width:100%;justify-content:center;text-align:center;}
  .lbl-full{display:none;} .lbl-short{display:inline;}
  /* 4 - conditions carousel */
  .jbp-conditions{display:flex !important;overflow-x:auto;scroll-snap-type:x mandatory;gap:0 !important;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
  .jbp-conditions::-webkit-scrollbar{display:none;}
  .jbp-conditions > div{flex:0 0 100% !important;scroll-snap-align:center;}
  .jbp-car-prev,.jbp-car-next{display:flex;}
  /* 5 - process vertical timeline, text right of number */
  .jbp-process-grid{grid-template-columns:1fr !important;gap:0 !important;}
  .jbp-process-line{display:none !important;}
  .jbp-step{display:grid !important;grid-template-columns:56px 1fr;column-gap:18px;row-gap:6px;position:relative;padding-bottom:34px;}
  .jbp-step > *:nth-child(1){grid-column:1;grid-row:1 / span 2;align-self:start;}
  .jbp-step > *:nth-child(2){grid-column:2;grid-row:1;align-self:center;}
  .jbp-step > *:nth-child(3){grid-column:2;grid-row:2;}
  .jbp-step:not(:last-child)::after{content:"";position:absolute;left:27px;top:62px;bottom:6px;width:2px;background:rgba(35,31,32,0.18);}
  /* 6 - resources: image after title, before text */
  .jbp-res-grid{display:flex !important;flex-direction:column;gap:22px !important;}
  .jbp-res-text{display:contents !important;}
  .jbp-res-text > div:first-child{order:1;}
  .jbp-res-text > h2{order:2;}
  .jbp-res-img{order:3;}
  .jbp-res-text > p{order:4;}
  .jbp-res-text > div:last-child{order:5;}
  /* 7 - final CTA: call block below form */
  .jbp-cta-grid{display:flex !important;flex-direction:column;gap:28px !important;}
  .jbp-cta-text{display:contents !important;}
  .jbp-cta-text > h2{order:1;}
  .jbp-cta-text > p:nth-of-type(1){order:2;}
  .jbp-cta-form{order:3;}
  .jbp-cta-text > div{order:4;}
  .jbp-cta-text > p:nth-of-type(2){order:5;}
  .jbp-cta-grid{padding:48px 22px !important;}
  .jbp-cta-form{margin-left:-22px !important;margin-right:-22px !important;padding:24px 22px !important;}
  .jbp-cta-call{flex-direction:column;align-items:flex-start !important;gap:6px !important;}
  .jbp-cta-call > a{white-space:nowrap;}
}
  .hoa-landing { margin: 0; background: #F9F3EC; -webkit-font-smoothing: antialiased; }
  .hoa-landing * { box-sizing: border-box; }
  .hoa-landing a { color: #BC0F0E; text-decoration: none; }
  .hoa-landing a:hover { color: #231F20; }
  .hoa-landing ::selection { background: #BC0F0E; color: #fff; }
`;

const BODY_HTML = `
  <header class="jbp-header">
  <div class="jbp-logo">
    <img class="jbp-logo-bg" src="/hoa-pipe-lining/team/assets/rectangle.webp" alt="" aria-hidden="true">
    <a class="jbp-logo-link" href="#" aria-label="J. Blanton Plumbing"><img src="/hoa-pipe-lining/team/assets/logo-text.webp" alt="J. Blanton Plumbing"></a>
  </div>
  <div class="jbp-bar">
    <a class="jbp-logo-sm" href="#" aria-label="J. Blanton Plumbing"><img src="/hoa-pipe-lining/team/assets/logo-text.webp" alt="J. Blanton Plumbing"></a>
    <nav class="jbp-nav">
      <a href="#why">Why J. Blanton</a><a href="#team">Our Team</a><a href="#services">Why Us</a><a href="#process">Our Process</a><a href="#resources">Resources</a>
    </nav>
    <a class="jbp-phone" href="tel:2246572472"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z"/></svg>(224) 657-2472</a>
    <a class="jbp-cta" href="#book">Schedule A Service</a>
    <div class="jbp-mobile-actions">
      <a class="jbp-icon-btn jbp-icon-phone" href="tel:2246572472" aria-label="Call (224) 657-2472"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z"/></svg></a>
      <a class="jbp-icon-btn jbp-icon-cal" href="#book" aria-label="Schedule a service"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></a>
      <button class="jbp-burger" type="button" aria-label="Open menu" aria-controls="jbp-drawer" aria-expanded="false"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
    </div>
  </div>
</header>
<div class="jbp-drawer-overlay" id="jbp-drawer">
  <div class="jbp-drawer" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="jbp-drawer-head">
      <img src="/hoa-pipe-lining/team/assets/logo-white.webp" alt="J. Blanton Plumbing">
      <button class="jbp-drawer-close" type="button" aria-label="Close menu"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <nav class="jbp-drawer-nav">
      <a href="#why">Why This Team</a>
      <a href="#team">The Specialists</a>
      <a href="#services">Why Boards Choose Us</a>
      <a href="#process">Our Process</a>
      <a href="#resources">Reserve Studies</a>
    </nav>
    <a class="jbp-drawer-phone" href="tel:2246572472"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z"/></svg>(224) 657-2472</a>
    <a class="jbp-drawer-cta" href="#book">Schedule a Service</a>
  </div>
</div>

  <section data-screen-label="01 Hero" style="position: relative; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(440px, 100%), 1fr)); min-height: 560px; background: #BC0F0E">
    <div style="position: relative; overflow: hidden; background: #0e1116; min-height: 380px">
      <iframe id="sewerSyncFrame" src="/hoa-pipe-lining/team/assets/sewer-camera-sync.html" title="Sewer camera position synced to street map" style="position: absolute; inset: 0; width: 100%; height: 100%; border: 0; display: block"></iframe>
    </div>
    <div style="position: relative; overflow: hidden; background: #BC0F0E; padding: 78px 72px; display: flex; flex-direction: column; justify-content: center; gap: 24px">
      <img src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.5; display: block; pointer-events: none">
      <h1 style="position: relative; margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 46px; line-height: 1.12; letter-spacing: -0.01em; color: #fff; max-width: 22ch; text-wrap: balance">Meet the HOA Sewer &amp; Drain Team</h1>
      <p style="position: relative; margin: 0; font-size: 18.5px; line-height: 1.6; color: #fff; max-width: 52ch">A dedicated team for condominium associations and townhome communities — diagnosing, documenting, and rehabilitating aging common area sewer infrastructure across Chicagoland.</p>
      <div class="jbp-hero-cta" style="position: relative; display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px">
        <a class="jbp-btn-blue" href="tel:2246572472" style="display: flex; align-items: center; gap: 10px; padding: 15px 26px; background: #1560E6; color: #fff; font-family: 'Nunito', system-ui, sans-serif; font-weight: 500; font-size: 18px; border-radius: 8px">
          <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" style="display: block"><path fill="currentColor" d="M20 10.999h2C22 5.869 18.127 2 12.99 2v2C17.052 4 20 6.943 20 10.999"></path><path fill="currentColor" d="M13 8c2.103 0 3 .897 3 3h2c0-3.225-1.775-5-5-5zm3.422 5.443a1 1 0 0 0-1.391.043l-2.393 2.461c-.576-.11-1.734-.471-2.926-1.66c-1.192-1.193-1.553-2.354-1.66-2.926l2.459-2.394a1 1 0 0 0 .043-1.391L6.859 3.513a1 1 0 0 0-1.391-.087l-2.17 1.861a1 1 0 0 0-.29.649c-.015.25-.301 6.172 4.291 10.766C11.305 20.707 16.323 21 17.705 21c.202 0 .326-.006.359-.008a1 1 0 0 0 .648-.291l1.86-2.171a1 1 0 0 0-.086-1.391z"></path></svg>
          (224) 657-2472
        </a>
        <a class="jbp-btn-white" href="#book" style="display: flex; align-items: center; padding: 15px 26px; background: #fff; color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 15px; letter-spacing: 0.02em; text-transform: uppercase; border-radius: 8px"><span class="lbl-full">Schedule A Consultation</span><span class="lbl-short">Schedule</span></a>
      </div>
    </div>
  </section>

  <div class="jbp-subnav" style="background: #ffffff; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); border-bottom: 1px solid rgba(35,31,32,0.12)">
    <a class="jbp-navlink" href="#why" style="padding: 26px 20px; text-align: center; border-right: 1px solid rgba(35,31,32,0.20); color: #231F20; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap">Why This Team</a>
    <a class="jbp-navlink" href="#team" style="padding: 26px 20px; text-align: center; border-right: 1px solid rgba(35,31,32,0.20); color: #231F20; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap">The Specialists</a>
    <a class="jbp-navlink" href="#process" style="padding: 26px 20px; text-align: center; border-right: 1px solid rgba(35,31,32,0.20); color: #231F20; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap">Our Process</a>
    <a class="jbp-navlink" href="#resources" style="padding: 26px 20px; text-align: center; color: #231F20; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 15px; letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap">Reserve Studies</a>
  </div>

  <div style="background: #ffffff; border-bottom: 1px solid rgba(35,31,32,0.12); display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr))">
    <div style="padding: 26px 30px; border-right: 1px solid rgba(35,31,32,0.12)"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 30px; line-height: 1">30 Years</div><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b; margin-top: 6px">In business in Chicagoland</div></div>
    <div style="padding: 26px 30px; border-right: 1px solid rgba(35,31,32,0.12)"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 30px; line-height: 1">150+</div><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b; margin-top: 6px">Pipe lining jobs monthly</div></div>
    <div style="padding: 26px 30px; border-right: 1px solid rgba(35,31,32,0.12)"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 30px; line-height: 1">14</div><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b; margin-top: 6px">Offices across Chicago &amp; suburbs</div></div>
    <div style="padding: 26px 30px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 30px; line-height: 1">24/7</div><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b; margin-top: 6px">Emergency response for clients</div></div>
  </div>

  <section id="why" data-screen-label="02 Why We Built This Team" style="padding: 96px 64px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: 72px; align-items: start; max-width: 1560px; margin: 0 auto">
    <div style="display: flex; flex-direction: column; gap: 22px">
      <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Why we built this team</div>
      <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 42px; line-height: 1.06; letter-spacing: -0.015em; max-width: 22ch">Why We Created a Dedicated HOA Sewer Team</h2>
      <p style="margin: 0; font-size: 19.5px; line-height: 1.62; color: #2b2b2b; max-width: 56ch">Most plumbing companies are designed to respond to service calls. They clear the immediate blockage, make the repair, and move on.</p>
      <p style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 22px; line-height: 1.35; color: #BC0F0E">Managing the sewer infrastructure of a condominium association is different.</p>
      <p style="margin: 0; font-size: 19.5px; line-height: 1.62; color: #2b2b2b; max-width: 56ch">A single property may contain hundreds of plumbing fixtures, multiple underground main lines, branch drains, vertical stacks, clean-outs, and decades of aging cast iron. These systems function as one interconnected network, where recurring backups often indicate larger infrastructure issues rather than isolated plumbing problems.</p>
      <p style="margin: 0; font-size: 19.5px; line-height: 1.62; color: #2b2b2b; max-width: 56ch">Our HOA Team was created to help boards and property managers understand the entire system, identify the true root cause of recurring issues, and develop long-term repair strategies that reduce emergencies and protect property values.</p>
    </div>

    <div style="background: #fff; border: 1px solid rgba(35,31,32,0.12); padding: 16px">
      <img src="/hoa-pipe-lining/team/assets/d5920152-3371-4cf6-965c-9b1a326e32cd.png" alt="Sewer map showing common area drainage network across buildings 11 and 12" style="width: 100%; height: auto; display: block">
      <div style="font-family: 'Industry', 'Arial', sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b6b6b; margin-top: 14px">Fig. 1 — Common area drainage network, mapped building by building</div>
    </div>
  </section>

  <section data-screen-label="03 Our Philosophy" style="background: #ffffff; padding: 96px 64px">
    <div style="max-width: 1560px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: 72px; align-items: center">
      <div style="display: flex; flex-direction: column; gap: 24px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Our philosophy</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 54px; line-height: 1.02; letter-spacing: -0.02em; max-width: 20ch">We Don't Chase Backups. We Solve Them.</h2>
        <p style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 24px; line-height: 1.35; color: #BC0F0E">Every recurring backup has a reason.</p>
        <p style="margin: 0; font-size: 19.5px; line-height: 1.62; color: #2b2b2b; max-width: 58ch">Our goal is not simply to clear the blockage. Our goal is to determine why it occurred, document the condition of the system, and recommend the most appropriate long-term solution.</p>
        <p style="margin: 0; font-size: 19.5px; line-height: 1.62; color: #2b2b2b; max-width: 58ch">This philosophy guides every inspection, reserve study, repair recommendation, and rehabilitation project we perform.</p>
      </div>
    </div>

    <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 14px; padding-top: 56px">
      <div style="font-family: 'Industry', 'Arial', sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b6b6b">Five conditions we identify in common area lines</div>
      <div class="jbp-carousel"><div class="jbp-conditions" id="conditions-track" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px">
        <div style="position: relative; overflow: hidden; background: #231F20; aspect-ratio: 4 / 3">
          <img src="/hoa-pipe-lining/team/assets/7908eedf-3f06-4238-84b2-7b5c63487dda.png" alt="Roots — camera inspection still" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block">
          <div style="position: absolute; left: 0; bottom: 0; padding: 7px 12px; background: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: #fff">Roots</div>
        </div>
        <div style="position: relative; overflow: hidden; background: #231F20; aspect-ratio: 4 / 3">
          <img src="/hoa-pipe-lining/team/assets/61dfcdb5-725a-4143-ab44-c857ccb1defb.png" alt="Hole — camera inspection still" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block">
          <div style="position: absolute; left: 0; bottom: 0; padding: 7px 12px; background: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: #fff">Hole</div>
        </div>
        <div style="position: relative; overflow: hidden; background: #231F20; aspect-ratio: 4 / 3">
          <img src="/hoa-pipe-lining/team/assets/128dd48d-0b2b-491a-9960-eb1ea31f5c6c.png" alt="Offset — camera inspection still" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block">
          <div style="position: absolute; left: 0; bottom: 0; padding: 7px 12px; background: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: #fff">Offset</div>
        </div>
        <div style="position: relative; overflow: hidden; background: #231F20; aspect-ratio: 4 / 3">
          <img src="/hoa-pipe-lining/team/assets/e8974606-610e-4d1c-8717-d4ec9fac782a.png" alt="Bellies — camera inspection still" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block">
          <div style="position: absolute; left: 0; bottom: 0; padding: 7px 12px; background: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: #fff">Bellies</div>
        </div>
        <div style="position: relative; overflow: hidden; background: #231F20; aspect-ratio: 4 / 3">
          <img src="/hoa-pipe-lining/team/assets/9200470a-7421-4b84-adce-37c9a52f5c02.png" alt="Scale — camera inspection still" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block">
          <div style="position: absolute; left: 0; bottom: 0; padding: 7px 12px; background: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: #fff">Scale</div>
        </div>
      </div>
      <button class="jbp-car-prev" type="button" aria-label="Previous">‹</button><button class="jbp-car-next" type="button" aria-label="Next">›</button></div><div style="font-size: 16.5px; line-height: 1.5; color: #3a3a3a">Real camera stills from Chicagoland HOA properties — roots, holes, offset joints, bellies, and scale buildup.</div>
    </div>
  </section>

  <section id="team" data-screen-label="04 Specialized Experts" style="padding: 96px 64px; max-width: 1560px; margin: 0 auto">
    <div style="display: flex; flex-direction: column; gap: 18px; max-width: 74ch; margin-bottom: 52px">
      <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">What makes our team different</div>
      <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 44px; line-height: 1.05; letter-spacing: -0.015em">Specialized Experts for Every Stage of the Project</h2>
      <p style="margin: 0; font-size: 19.5px; line-height: 1.6; color: #2b2b2b">Instead of assigning one technician to manage everything, our HOA projects are supported by specialists with dedicated responsibilities — and these are the people your board will actually talk to.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 26px">
      <div style="background: #fff; border: 1px solid rgba(35,31,32,0.12); display: flex; flex-direction: column">
        <img src="/hoa-pipe-lining/team/assets/0ae5d9c4-0541-4746-a523-b7a2c9eecee0.jpg" alt="Danyil" style="width: 100%; aspect-ratio: 3 / 4; object-fit: cover; object-position: center top; display: block">
        <div style="padding: 24px 24px 28px; display: flex; flex-direction: column; gap: 10px">
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 26px; line-height: 1.1">Danyil</h3>
          <p style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 16.5px; line-height: 1.35; color: #BC0F0E">Head of HOA Sewer “SEAL” Team</p>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Works with boards and property managers to understand the property’s history, recurring concerns, and long-term infrastructure goals.</p>
        </div>
      </div>
      <div style="background: #fff; border: 1px solid rgba(35,31,32,0.12); display: flex; flex-direction: column">
        <img src="/hoa-pipe-lining/team/assets/87ef1100-e5a4-4659-962a-68f16a5c69d7.jpg" alt="Dino" style="width: 100%; aspect-ratio: 3 / 4; object-fit: cover; object-position: center top; display: block">
        <div style="padding: 24px 24px 28px; display: flex; flex-direction: column; gap: 10px">
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 26px; line-height: 1.1">Dino</h3>
          <p style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 16.5px; line-height: 1.35; color: #BC0F0E">Mr. X-Ray Complex Sewer Infrastructures</p>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Oversees camera inspections and ensures findings are accurate, complete, and supported by documented evidence.</p>
        </div>
      </div>
      <div style="background: #fff; border: 1px solid rgba(35,31,32,0.12); display: flex; flex-direction: column">
        <img src="/hoa-pipe-lining/team/assets/8ad8a44d-de7e-4cf5-81e4-c9ebc42741d6.jpg" alt="Oswaldo" style="width: 100%; aspect-ratio: 3 / 4; object-fit: cover; object-position: center top; display: block">
        <div style="padding: 24px 24px 28px; display: flex; flex-direction: column; gap: 10px">
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 26px; line-height: 1.1">Oswaldo</h3>
          <p style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 16.5px; line-height: 1.35; color: #BC0F0E">Mr. Everything Is Set and Ready to Go</p>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Verifies repair plans in the field, oversees construction, and makes sure projects are completed according to plan.</p>
        </div>
      </div>
      <div style="background: #fff; border: 1px solid rgba(35,31,32,0.12); display: flex; flex-direction: column">
        <img src="/hoa-pipe-lining/team/assets/12d884c6-c356-4b80-b7b5-c4047a08f1ff.jpg" alt="Christian" style="width: 100%; aspect-ratio: 3 / 4; object-fit: cover; object-position: center top; display: block">
        <div style="padding: 24px 24px 28px; display: flex; flex-direction: column; gap: 10px">
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 26px; line-height: 1.1">Christian</h3>
          <p style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 16.5px; line-height: 1.35; color: #BC0F0E">Mr. Project Supervision and Making Customers Happy</p>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Coordinates scheduling, resident communication, permits, documentation, and project logistics.</p>
        </div>
      </div>
    </div>
  </section>

  <section id="services" data-screen-label="05 Why Associations Choose J. Blanton" style="position: relative; overflow: hidden; background: #BC0F0E; color: #fff; padding: 96px 64px">
    <img src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.35; display: block; pointer-events: none">
    <div style="position: relative; max-width: 1560px; margin: 0 auto">
      <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 56px; max-width: 62ch">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.82)">Why associations choose us</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 44px; line-height: 1.05; letter-spacing: -0.015em; color: #fff">Eight Reasons Boards Keep Us on the Project</h2>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 1px; background: rgba(255,255,255,0.45)">
        <div style="background: #ffffff; padding: 34px 28px 38px; display: flex; flex-direction: column; gap: 14px">
          <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.14em; color: #BC0F0E">01</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px; line-height: 1.2; color: #231F20">Dedicated HOA Sewer Team</h3>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Focused exclusively on common area sewer infrastructure.&nbsp;</p>
        </div>
        <div style="background: #ffffff; padding: 34px 28px 38px; display: flex; flex-direction: column; gap: 14px">
          <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.14em; color: #BC0F0E">02</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px; line-height: 1.2; color: #231F20">Specialized Diagnostic Process</h3>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">We investigate the root cause rather than simply treating symptoms.</p>
        </div>
        <div style="background: #ffffff; padding: 34px 28px 38px; display: flex; flex-direction: column; gap: 14px">
          <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.14em; color: #BC0F0E">03</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px; line-height: 1.2; color: #231F20">Interactive Digital Reports</h3>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Maps, HD video, findings, and recommendations in one place.</p>
        </div>
        <div style="background: #ffffff; padding: 34px 28px 38px; display: flex; flex-direction: column; gap: 14px">
          <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.14em; color: #BC0F0E">04</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px; line-height: 1.2; color: #231F20">Sewer and Drain Reserve Study</h3>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Understand the layout and condition of your infrastructure as a whole.</p>
        </div>
        <div style="background: #ffffff; padding: 34px 28px 38px; display: flex; flex-direction: column; gap: 14px">
          <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.14em; color: #BC0F0E">05</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px; line-height: 1.2; color: #231F20">Board Presentations</h3>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Helping boards understand technical findings in simple terms and make informed decisions.</p>
        </div>
        <div style="background: #ffffff; padding: 34px 28px 38px; display: flex; flex-direction: column; gap: 14px">
          <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.14em; color: #BC0F0E">06</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px; line-height: 1.2; color: #231F20">Long-Term Infrastructure Planning</h3>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Supporting maintenance and capital planning decisions for aging plumbing systems.<br></p>
        </div>
        <div style="background: #ffffff; padding: 34px 28px 38px; display: flex; flex-direction: column; gap: 14px">
          <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.14em; color: #BC0F0E">07</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px; line-height: 1.2; color: #231F20">Dedicated Project Management</h3>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">One coordinated team from initial inspection through project completion.</p>
        </div>
        <div style="background: #ffffff; padding: 34px 28px 38px; display: flex; flex-direction: column; gap: 14px">
          <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.14em; color: #BC0F0E">08</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px; line-height: 1.2; color: #231F20">UV Pipe Lining Specialists</h3>
          <p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Rehabilitating aging sewer systems with trenchless technology where appropriate.</p>
        </div>
      </div>
    </div>
  </section>

  <section data-screen-label="06 Who We Work With" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); align-items: center">
    <div style="position: relative; width: 100%; aspect-ratio: 3 / 2; overflow: hidden; background: #231F20">
      <img src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" alt="J. Blanton sewer and drain team on site" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block">
    </div>
    <div style="padding: 56px 64px; display: flex; flex-direction: column; gap: 20px">
      <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 34px; line-height: 1.08; letter-spacing: -0.015em">We Partner With</h2>
      <div style="display: flex; flex-direction: column; gap: 12px">
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 19px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700">✓</span>Condominium Associations</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 19px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700">✓</span>Townhome Communities</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 19px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700">✓</span>Apartment Buildings</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 19px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700">✓</span>Mixed-Use Properties</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 19px; line-height: 1.4"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700">✓</span>Property Management Companies</div>
      </div>
    </div>
  </section>

  <section style="background: #F9F3EC; padding: 64px; border-top: 1px solid rgba(35,31,32,0.12)">
    <div style="max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px">
      <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 30px; line-height: 1.1; letter-spacing: -0.015em">Common Reasons Clients Contact Us</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 12px 40px">
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 17px; line-height: 1.4"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px; line-height: 1">·</span>Recurring sewer backups</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 17px; line-height: 1.4"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px; line-height: 1">·</span>Aging cast iron drain systems</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 17px; line-height: 1.4"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px; line-height: 1">·</span>Frequent emergency repairs</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 17px; line-height: 1.4"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px; line-height: 1">·</span>Water damage from sewer failures</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 17px; line-height: 1.4"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px; line-height: 1">·</span>Capital improvement planning</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 17px; line-height: 1.4"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px; line-height: 1">·</span>Reserve study support</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 17px; line-height: 1.4"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px; line-height: 1">·</span>Pipe lining evaluations</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 17px; line-height: 1.4"><span style="color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px; line-height: 1">·</span>Resident drainage complaints</div>
      </div>
    </div>
  </section>

  <section id="process" data-screen-label="07 Our Process" style="background: #ffffff; padding: 96px 64px">
    <div style="max-width: 1560px; margin: 0 auto">
      <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 56px; max-width: 60ch">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Our process</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 44px; line-height: 1.05; letter-spacing: -0.015em">Five Steps, One Accountable Team</h2>
      </div>
      <div class="jbp-process-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr)); gap: 22px; position: relative">
        <div class="jbp-process-line" style="position: absolute; left: 0; right: 0; top: 27px; height: 2px; background: rgba(35,31,32,0.18)"></div>
        <div class="jbp-step" style="position: relative; display: flex; flex-direction: column; gap: 16px">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #BC0F0E; color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px">01</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 26px; line-height: 1.1">Evaluate</h3>
          <p style="margin: 0; font-size: 17.5px; line-height: 1.55; color: #3a3a3a">Site visit and infrastructure assessment.</p>
        </div>
        <div class="jbp-step" style="position: relative; display: flex; flex-direction: column; gap: 16px">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #BC0F0E; color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px">02</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 26px; line-height: 1.1">Diagnose</h3>
          <p style="margin: 0; font-size: 17.5px; line-height: 1.55; color: #3a3a3a">Camera inspection and root cause analysis.</p>
        </div>
        <div class="jbp-step" style="position: relative; display: flex; flex-direction: column; gap: 16px">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #BC0F0E; color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px">03</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 26px; line-height: 1.1">Document</h3>
          <p style="margin: 0; font-size: 17.5px; line-height: 1.55; color: #3a3a3a">Interactive digital report with video, maps, and recommendations.</p>
        </div>
        <div class="jbp-step" style="position: relative; display: flex; flex-direction: column; gap: 16px">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #BC0F0E; color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px">04</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 26px; line-height: 1.1">Plan</h3>
          <p style="margin: 0; font-size: 17.5px; line-height: 1.55; color: #3a3a3a">Prioritized repair strategy and budget guidance.</p>
        </div>
        <div class="jbp-step" style="position: relative; display: flex; flex-direction: column; gap: 16px">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #BC0F0E; color: #fff; display: flex; align-items: center; justify-content: center; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 20px">05</div>
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 26px; line-height: 1.1">Execute</h3>
          <p style="margin: 0; font-size: 17.5px; line-height: 1.55; color: #3a3a3a">Dedicated project management and specialized installation crews.</p>
        </div>
      </div>
    </div>
  </section>


  <section id="resources" data-screen-label="10 Resources" style="background: #ffffff; padding: 96px 64px">
    <div class="jbp-res-grid" style="max-width: 1560px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: 72px; align-items: center">
      <div class="jbp-res-text" style="display: flex; flex-direction: column; gap: 22px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Resources</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 42px; line-height: 1.05; letter-spacing: -0.015em">Download a Sample Sewer &amp; Drain Reserve Study</h2>
        <p style="margin: 0; font-size: 19.5px; line-height: 1.6; color: #2b2b2b; max-width: 52ch">See how we inspect, document, and prioritize common area sewer infrastructure — the same report format your board would receive.</p>
        <div style="display: flex; flex-wrap: wrap; gap: 14px; margin-top: 4px">
          <a class="jbp-btn-white" href="#book" style="padding: 16px 26px; background: #BC0F0E; color: #fff; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; border-radius: 8px">View Sample Report</a>
          <a class="jbp-btn-white" href="#book" style="padding: 16px 26px; border: 2px solid #231F20; color: #231F20; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; border-radius: 8px">Learn About Reserve Studies</a>
        </div>
      </div>
      <div class="jbp-res-img" style="background: #fff; border: 1px solid rgba(35,31,32,0.14); padding: 14px; display: flex; flex-direction: column; gap: 12px">
        <img src="/hoa-pipe-lining/team/assets/f97bb753-7336-4f0b-8ed3-8a75af263fc9.png" alt="Sewer and drain reserve study condition table, pipe by pipe" style="width: 100%; height: auto; display: block; border: 1px solid rgba(35,31,32,0.14)">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-size: 11px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">Condition findings — scale, holes, cracks, footage &amp; material, pipe by pipe</div>
      </div>
    </div>
  </section>

  <section id="book" data-screen-label="11 Final CTA" style="position: relative; background: #BC0F0E; padding: 0">
    <img src="/hoa-pipe-lining/team/assets/8ae5768c-fe1c-4957-b63c-8ced11711cd0.jpg" alt="Aerial view of a residential community" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block">
    <div style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(148,10,9,0.95) 0%, rgba(166,12,11,0.86) 55%, rgba(35,31,32,0.55) 100%)"></div>
    <div class="jbp-cta-grid" style="position: relative; max-width: 1560px; margin: 0 auto; padding: 104px 64px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 72px; align-items: start">
      <div class="jbp-cta-text" style="display: flex; flex-direction: column; gap: 24px">
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 48px; line-height: 1.03; letter-spacing: -0.02em; color: #fff; max-width: 22ch">Ready to Better Understand Your Sewer Infrastructure?</h2>
        <p style="margin: 0; font-size: 19.5px; line-height: 1.6; color: rgba(255,255,255,0.82); max-width: 54ch">Whether you're dealing with recurring backups, planning future capital improvements, or simply want a clearer picture of your building's plumbing system, our HOA Team is here to help.</p>
        <div class="jbp-cta-call" style="display: flex; align-items: center; gap: 16px; margin-top: 8px; padding-top: 26px; border-top: 1px solid rgba(255,255,255,0.20)">
          <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 12.5px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.55)">Or call the HOA line</div>
          <a class="jbp-phone-dim" href="tel:2246572472" style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 30px; color: #fff; letter-spacing: -0.01em">(224) 657-2472</a>
        </div>
        <p style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 18px; color: rgba(255,255,255,0.92)">Make a good call — for the whole association.</p>
      </div>
      <form id="hoa-form" class="jbp-cta-form" style="background: #F9F3EC; padding: 36px; min-width: 0; display: flex; flex-direction: column; gap: 18px">
        <div style="display: flex; flex-direction: column; gap: 6px">
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 26px; line-height: 1.1">Schedule a Consultation</h3>
          <p style="margin: 0; font-size: 16.5px; line-height: 1.5; color: #4a4a4a">An HOA advisor responds within one business day.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px">
          <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">Full name
            <input type="text" name="name" required="required" placeholder="Bruce Wayne" style="width: 100%; min-width: 0; font-family: 'Nunito', system-ui, sans-serif; font-size: 17px; padding: 12px 14px; border: 1px solid rgba(35,31,32,0.25); border-radius: 6px; background: #fff; color: #231F20; letter-spacing: 0">
          </label>
          <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">Role
            <select name="role" required class="jbp-role-select"><option>Board member</option>
              <option>Property manager</option>
              <option>Building engineer</option>
              <option>Other</option></select>
          </label>
          <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">Email
            <input type="email" name="email" required="required" placeholder="bruce@waynemanor.org" style="width: 100%; min-width: 0; font-family: 'Nunito', system-ui, sans-serif; font-size: 17px; padding: 12px 14px; border: 1px solid rgba(35,31,32,0.25); border-radius: 6px; background: #fff; color: #231F20; letter-spacing: 0">
          </label>
          <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">Phone
            <input type="tel" name="phone" placeholder="(312) 555-BATS" style="width: 100%; min-width: 0; font-family: 'Nunito', system-ui, sans-serif; font-size: 17px; padding: 12px 14px; border: 1px solid rgba(35,31,32,0.25); border-radius: 6px; background: #fff; color: #231F20; letter-spacing: 0">
          </label>
        </div>
        <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">Property / association name
          <input type="text" name="property" placeholder="Gotham Heights Condominium Assn." style="width: 100%; min-width: 0; font-family: 'Nunito', system-ui, sans-serif; font-size: 17px; padding: 12px 14px; border: 1px solid rgba(35,31,32,0.25); border-radius: 6px; background: #fff; color: #231F20; letter-spacing: 0">
        </label>
        <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">What's happening at the property?
          <textarea name="message" rows="3" placeholder="Recurring backups in Building C every time it rains. Cast iron, last rodded in March, residents on the first floor are getting worried…" style="width: 100%; min-width: 0; font-family: 'Nunito', system-ui, sans-serif; font-size: 17px; padding: 12px 14px; border: 1px solid rgba(35,31,32,0.25); border-radius: 6px; background: #fff; color: #231F20; letter-spacing: 0; resize: vertical"></textarea>
        </label>
        <button class="jbp-btn-blue" type="submit" style="margin-top: 4px; padding: 17px 26px; background: #1560E6; color: #fff; border: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; border-radius: 8px">Request HOA Consultation</button>
        <div id="hoa-success" style="display:none; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 16px; color: #1560E6">Thanks — an HOA advisor will follow up within one business day.</div>
      </form>
    </div>
  </section>
`;

export default function Page() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <div
        className="hoa-landing"
        style={{ color: '#231F20', overflowX: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: BODY_HTML }}
      />
      <HoaLandingScripts
        carousel={{
          trackSelector: '#conditions-track',
          prevSelector: '.jbp-car-prev',
          nextSelector: '.jbp-car-next',
        }}
        sewerCameraSync={{
          frameId: 'sewerSyncFrame',
          fallbackSrc: '/hoa-pipe-lining/team/assets/sewer-camera-sync.html',
        }}
      />
      <HoaClusterLinks current="team" />
    </>
  );
}
