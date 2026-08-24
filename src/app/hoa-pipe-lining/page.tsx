import type { Metadata } from 'next';
import HoaLandingScripts from '@/components/hoa-pipe-lining/HoaLandingScripts';
import HoaClusterLinks from '@/components/hoa-pipe-lining/HoaClusterLinks';

// Brief 127 — Pillar page (/hoa-pipe-lining). Ported verbatim from the local
// static build at:
//   `JBP Web Migration/New Pages/Pipelining pillar page/clean/index.html`
// Only the footer + interactive <script> were removed (the shared SiteShell
// Footer and HoaLandingScripts/HoaClusterLinks replace them) and asset paths
// were made absolute. See CSS scoping notes below.

export const metadata: Metadata = {
  title: 'HOA Sewer Pipe Lining',
};

// Scoped copy of the source's base <style> (from <helmet>) + the
// <style id="jbp-brand"> block. Per Brief 127 gotcha #1, the element-level
// selectors (body, *, a, a:hover, ::selection) are prefixed with
// `.hoa-landing ` so they can't leak into the shared Footer or the rest of
// the app; the `x-dc{display:block;}` rule is dropped (that wrapper element
// no longer exists — it's replaced by the `.hoa-landing` div itself). The
// `.jbp-*` component classes and the class-keyed @media blocks are left
// exactly as authored. The `.jbp-footer*` rules and the two @media blocks
// that exist solely to restyle the removed <footer class="jbp-footer"> markup
// are dropped as dead weight (that markup no longer exists in this route).
const PAGE_CSS = `
  .hoa-landing { margin: 0; background: #F9F3EC; -webkit-font-smoothing: antialiased; }
  .hoa-landing * { box-sizing: border-box; }
  .hoa-landing a { color: #BC0E0E; text-decoration: none; }
  .hoa-landing a:hover { color: #9B0D0D; }
  .hoa-landing ::selection { background: #BC0F0E; color: #fff; }

@media(max-width:768px){
  [data-screen-label]{padding-left:22px !important;padding-right:22px !important;}
  .jbp-hero-cta{flex-direction:column;align-items:stretch;}
  .jbp-hero-cta > a{width:100%;justify-content:center;text-align:center;}
  .jbp-vs{grid-template-columns:1fr !important;}
  .jbp-vs > div:nth-child(2){padding:12px 0 !important;}
  .jbp-cta-grid{display:flex !important;flex-direction:column;gap:28px !important;}
  .jbp-cta-text{display:contents !important;}
  .jbp-cta-text > h2{order:1;} .jbp-cta-text > p{order:2;} .jbp-cta-form{order:3;} .jbp-cta-text > div{order:4;}
}

@media(max-width:768px){
  .jbp-hero-media{display:none !important;}
  section[data-screen-label="01 Hero"] > div{padding:40px 22px !important;}
  .jbp-process-grid{grid-template-columns:1fr !important;}
  .jbp-cta-grid{padding:48px 22px !important;}
  .jbp-cta-form{margin-left:-22px !important;margin-right:-22px !important;padding:24px 22px !important;}
  .jbp-cta-call{flex-direction:column;align-items:flex-start !important;gap:6px !important;}
  .jbp-cta-call > a{white-space:nowrap;}
}

@font-face{font-family:'Industry';src:url('/hoa-pipe-lining/assets/fonts/IMedium.otf') format('opentype');font-weight:500;font-display:swap;}
@font-face{font-family:'Industry';src:url('/hoa-pipe-lining/assets/fonts/IDemi.otf') format('opentype');font-weight:600;font-display:swap;}
@font-face{font-family:'Industry';src:url('/hoa-pipe-lining/assets/fonts/IBold.otf') format('opentype');font-weight:700;font-display:swap;}
@font-face{font-family:'Industry';src:url('/hoa-pipe-lining/assets/fonts/IBlack.otf') format('opentype');font-weight:800;font-display:swap;}
@font-face{font-family:'Industry';src:url('/hoa-pipe-lining/assets/fonts/IBlack.otf') format('opentype');font-weight:900;font-display:swap;}
@font-face{font-family:'Nunito';src:url('/hoa-pipe-lining/assets/fonts/Nunito-Variable.ttf') format('truetype');font-weight:300 800;font-display:swap;}
.hoa-landing{font-family:'Nunito',system-ui,sans-serif;}
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
.jbp-cta:hover{background:#BC0E0E;color:#fff;}
.jbp-logo-sm{display:none;}
.jbp-mobile-actions{display:none;align-items:center;gap:8px;}
.jbp-icon-btn{display:flex;align-items:center;justify-content:center;height:40px;width:40px;border-radius:9999px;border:0;cursor:pointer;text-decoration:none;}
.jbp-icon-phone{background:#BC0E0E;color:#fff;} .jbp-icon-cal{background:#1560E6;color:#fff;}
.jbp-icon-btn svg{height:18px;width:18px;}
.jbp-burger{display:flex;align-items:center;justify-content:center;height:40px;width:40px;background:transparent;border:0;color:#BC0E0E;cursor:pointer;}
.jbp-burger svg{height:26px;width:26px;}
.jbp-drawer-overlay{display:none;position:fixed;inset:0;z-index:70;background:rgba(5,13,24,0.6);opacity:0;pointer-events:none;transition:opacity .25s;}
.jbp-drawer-overlay.open{opacity:1;pointer-events:auto;}
.jbp-drawer{position:absolute;top:0;right:0;height:100%;width:85%;max-width:360px;background:#BC0E0E;box-shadow:-8px 0 30px rgba(0,0,0,.35);transform:translateX(100%);transition:transform .3s;display:flex;flex-direction:column;padding:20px;overflow-y:auto;}
.jbp-drawer-overlay.open .jbp-drawer{transform:translateX(0);}
.jbp-drawer-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.2);}
.jbp-drawer-head img{height:34px;width:auto;}
.jbp-drawer-close{display:flex;background:transparent;border:0;color:#fff;cursor:pointer;}
.jbp-drawer-close svg{height:24px;width:24px;}
.jbp-drawer-nav{display:flex;flex-direction:column;}
.jbp-drawer-nav a{padding:14px 2px;font-family:'Industry','Arial',sans-serif;font-weight:500;font-size:20px;text-transform:uppercase;letter-spacing:.02em;color:#fff;text-decoration:none;border-bottom:1px solid rgba(255,255,255,0.2);}
.jbp-drawer-nav a:hover{color:#fff;}
.jbp-drawer-phone{margin-top:22px;display:flex;align-items:center;justify-content:center;gap:8px;background:#fff;color:#BC0E0E;font-family:'Industry','Arial',sans-serif;font-weight:700;font-size:16px;padding:13px;border-radius:6px;text-decoration:none;}
.jbp-drawer-phone svg{height:18px;width:18px;}
.jbp-drawer-cta{margin-top:12px;display:flex;align-items:center;justify-content:center;background:#1560E6;color:#fff;font-family:'Industry','Arial',sans-serif;font-weight:700;font-size:15px;letter-spacing:.04em;text-transform:uppercase;padding:14px;border-radius:6px;text-decoration:none;}
.jbp-role-select{width:100%;min-width:0;font-family:'Nunito',system-ui,sans-serif;font-size:17px;padding:12px 40px 12px 14px;border:1px solid rgba(35,31,32,0.25);border-radius:6px;background-color:#fff;color:#231F20;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23231F20' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-size:14px;cursor:pointer;}
.jbp-btn-blue{transition:background-color .15s,color .15s;} .jbp-btn-blue:hover{background:#0A1B2E !important;color:#fff !important;}
.jbp-btn-white{transition:background-color .15s,color .15s;} .jbp-btn-white:hover{background:#F9F3EC !important;color:#9B0D0D !important;}
.jbp-navlink{transition:color .15s;} .jbp-navlink:hover{color:#BC0E0E !important;}
.jbp-phone-dim{transition:color .15s;} .jbp-phone-dim:hover{color:rgba(255,255,255,0.78) !important;}
@media(max-width:1070px){ .jbp-phone,.jbp-cta{display:none;} .jbp-mobile-actions{display:flex;} .jbp-drawer-overlay{display:block;}
  .jbp-logo{display:none;} .jbp-bar{padding-left:16px;justify-content:space-between;align-items:center;} .jbp-nav{display:none;}
  .jbp-logo-sm{display:flex;align-items:center;} .jbp-logo-sm img{height:44px;width:auto;} }
`;

// Body markup: header + mobile drawer + all 12 <section>s, ported verbatim
// from the source. The custom <footer class="jbp-footer">...</footer> block
// (including the old "Explore HOA pipe lining" cross-link line, the office
// grid, and the social icons) and the trailing <script> are removed — the
// shared site Footer (via SiteShell) + HoaClusterLinks below replace them.
// All `assets/...` references are rewritten to `/hoa-pipe-lining/assets/...`.
const BODY_HTML = `
  <header class="jbp-header">
  <div class="jbp-logo"><img class="jbp-logo-bg" src="/hoa-pipe-lining/assets/rectangle.webp" alt="" aria-hidden="true"><a class="jbp-logo-link" href="#" aria-label="J. Blanton Plumbing"><img src="/hoa-pipe-lining/assets/logo-text.webp" alt="J. Blanton Plumbing"></a></div>
  <div class="jbp-bar">
    <a class="jbp-logo-sm" href="#" aria-label="J. Blanton Plumbing"><img src="/hoa-pipe-lining/assets/logo-text.webp" alt="J. Blanton Plumbing"></a>
    <nav class="jbp-nav"><a href="#why">Why Lining</a><a href="#process">Our Process</a><a href="#experience">Experience</a><a href="#faq">FAQ</a><a href="#projects">Projects</a></nav>
    <a class="jbp-phone" href="tel:2246572472"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z"/></svg>(224) 657-2472</a>
    <a class="jbp-cta" href="#book">Schedule An Inspection</a>
    <div class="jbp-mobile-actions">
      <a class="jbp-icon-btn jbp-icon-phone" href="tel:2246572472" aria-label="Call (224) 657-2472"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z"/></svg></a>
      <a class="jbp-icon-btn jbp-icon-cal" href="#book" aria-label="Schedule an inspection"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></a>
      <button class="jbp-burger" type="button" aria-label="Open menu" aria-controls="jbp-drawer" aria-expanded="false"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
    </div>
  </div>
</header>
<div class="jbp-drawer-overlay" id="jbp-drawer"><div class="jbp-drawer" role="dialog" aria-modal="true" aria-label="Menu">
  <div class="jbp-drawer-head"><img src="/hoa-pipe-lining/assets/logo-white.webp" alt="J. Blanton Plumbing"><button class="jbp-drawer-close" type="button" aria-label="Close menu"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
  <nav class="jbp-drawer-nav"><a href="#why">Why Lining</a><a href="#process">Our Process</a><a href="#experience">Experience</a><a href="#faq">FAQ</a><a href="#projects">Projects</a></nav>
  <a class="jbp-drawer-phone" href="tel:2246572472"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z"/></svg>(224) 657-2472</a>
  <a class="jbp-drawer-cta" href="#book">Schedule An Inspection</a>
</div></div>

  <section data-screen-label="01 Hero" style="position: relative; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(440px, 100%), 1fr)); min-height: 560px; background: #BC0F0E">
    <div class="jbp-hero-media" style="position: relative; overflow: hidden; min-height: 380px">
      <img src="/hoa-pipe-lining/assets/photo-uv-liner.png" alt="Technician installing UV liner" style="width: 100%; height: 100%; object-fit: cover; display: block; position: absolute; inset: 0">
    </div>
    <div style="position: relative; overflow: hidden; background: #BC0F0E; padding: 78px 72px; display: flex; flex-direction: column; justify-content: center; gap: 24px">
      <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.82); position: relative">Sewer pipe lining for condominiums &amp; townhome associations</div>
      <h1 style="position: relative; margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 46px; line-height: 1.12; letter-spacing: -0.01em; color: #fff; max-width: 22ch; text-wrap: balance">Sewer Pipe Lining Designed for HOA Communities</h1>
      <p style="position: relative; margin: 0; font-size: 18.5px; line-height: 1.6; color: #fff; max-width: 52ch">Extend the life of your building's sewer system without major excavation. We deliver long-lasting repairs to condominiums, townhomes, and multi-unit communities with minimal disruption to residents.</p>
      <div class="jbp-hero-cta" style="position: relative; display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px">
        <a class="jbp-btn-blue" href="#book" style="display: flex; align-items: center; padding: 15px 26px; background: #1560E6; color: #fff; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 15px; letter-spacing: 0.02em; text-transform: uppercase; border-radius: 8px">Schedule An Inspection</a>
        <a class="jbp-btn-white" href="/hoa-pipe-lining/reserve-studies" style="display: flex; align-items: center; padding: 15px 26px; background: #fff; color: #BC0F0E; font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 15px; letter-spacing: 0.02em; text-transform: uppercase; border-radius: 8px">Request A Reserve Study</a>
      </div>
      <div style="position: relative; display: flex; flex-wrap: wrap; gap: 10px 26px; margin-top: 10px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.22)">
        <div style="font-family: 'Nunito', system-ui, sans-serif; font-weight: 500; font-size: 14px; color: rgba(255,255,255,0.9)">Minimal resident disruption</div>
        <div style="font-family: 'Nunito', system-ui, sans-serif; font-weight: 500; font-size: 14px; color: rgba(255,255,255,0.9)">50+ year design life</div>
        <div style="font-family: 'Nunito', system-ui, sans-serif; font-weight: 500; font-size: 14px; color: rgba(255,255,255,0.9)">Specialized HOA teams</div>
      </div>
    </div>
  </section>

  <div style="background: #ffffff; border-bottom: 1px solid rgba(35,31,32,0.12); display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr))">
    <div style="padding: 26px 30px; border-right: 1px solid rgba(35,31,32,0.12)"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 30px; line-height: 1">200+</div><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b; margin-top: 6px">Pipe liners installed monthly</div></div>
    <div style="padding: 26px 30px; border-right: 1px solid rgba(35,31,32,0.12)"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 30px; line-height: 1">50+ Years</div><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b; margin-top: 6px">Typical liner design life</div></div>
    <div style="padding: 26px 30px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 30px; line-height: 1">Thousands</div><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b; margin-top: 6px">Of successful installations</div></div>
  </div>

  <section id="why" data-screen-label="02 Why HOA Boards Choose Lining" style="background: #ffffff; padding: 96px 64px">
    <div style="max-width: 1560px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: 72px; align-items: center">
      <div style="display: flex; flex-direction: column; gap: 24px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Why HOA boards choose pipe lining</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 48px; line-height: 1.05; letter-spacing: -0.02em; max-width: 18ch">A Failing Sewer Doesn't Always Mean Full Replacement</h2>
        <p style="margin: 0; font-size: 19.5px; line-height: 1.62; color: #2b2b2b; max-width: 58ch">Pipe lining restores existing sewer pipes from the inside, creating a seamless structural liner that extends service life while avoiding the disruption of traditional excavation.</p>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px">
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-weight: 700">✓</span>Minimal wall and floor demolition</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-weight: 700">✓</span>Less disruption to residents</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-weight: 700">✓</span>Faster project completion</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-weight: 700">✓</span>Reduced restoration costs</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-weight: 700">✓</span>Long-term asset protection</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4"><span style="color: #BC0F0E; font-weight: 700">✓</span>Ideal for occupied communities</div>
      </div>
    </div>

    <div class="jbp-vs" style="max-width: 1560px; margin: 64px auto 0; display: grid; grid-template-columns: 1fr auto 1fr; gap: 0; align-items: stretch; background: #F9F3EC; border: 1px solid rgba(35,31,32,0.12)">
      <div style="padding: 40px 44px; display: flex; flex-direction: column; gap: 16px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b6b6b">Traditional replacement</div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 17px; line-height: 1.5; color: #3a3a3a">
          <div>Excavation required</div>
          <div>Large-scale restoration</div>
          <div>Long project timelines</div>
          <div>Significant resident disruption</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; justify-content: center; padding: 0 24px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 15px; color: #BC0F0E">VS</div>
      <div style="padding: 40px 44px; display: flex; flex-direction: column; gap: 16px; background: #ffffff">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: #BC0F0E">Pipe lining</div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 17px; line-height: 1.5; color: #231F20; font-weight: 500">
          <div>Existing pipe remains in place</div>
          <div>Minimal restoration</div>
          <div>Faster completion</div>
          <div>Residents experience less disruption</div>
        </div>
      </div>
    </div>
  </section>

  <section data-screen-label="03 Built for Condos and Townhomes" style="position: relative; overflow: hidden; background: #BC0F0E; color: #fff; padding: 96px 64px">
    <div style="position: relative; max-width: 1560px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: 72px">
      <div style="display: flex; flex-direction: column; gap: 20px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.82)">Built specifically for HOA communities</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 40px; line-height: 1.08; letter-spacing: -0.015em; color: #fff">Most Contractors Do Service Calls. HOA Projects Are Different.</h2>
        <p style="margin: 0; font-size: 18px; line-height: 1.6; color: rgba(255,255,255,0.86); max-width: 52ch">Every project requires coordination between residents, property managers, board members, maintenance staff, and multiple trades — all while working inside occupied homes. We've built our entire process around managing that complexity.</p>
      </div>
      <div style="display: flex; flex-direction: column; gap: 14px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.7)">Typical HOA challenges</div>
        <div style="display: flex; flex-direction: column; gap: 1px; background: rgba(255,255,255,0.22)">
          <div style="background: #A60C0B; padding: 14px 18px; font-size: 16.5px; line-height: 1.4">Coordinating access to dozens of residents</div>
          <div style="background: #A60C0B; padding: 14px 18px; font-size: 16.5px; line-height: 1.4">Working inside occupied units</div>
          <div style="background: #A60C0B; padding: 14px 18px; font-size: 16.5px; line-height: 1.4">Protecting finished interiors</div>
          <div style="background: #A60C0B; padding: 14px 18px; font-size: 16.5px; line-height: 1.4">Maintaining communication with management</div>
          <div style="background: #A60C0B; padding: 14px 18px; font-size: 16.5px; line-height: 1.4">Scheduling around resident availability</div>
          <div style="background: #A60C0B; padding: 14px 18px; font-size: 16.5px; line-height: 1.4">Completing projects in phases</div>
          <div style="background: #A60C0B; padding: 14px 18px; font-size: 16.5px; line-height: 1.4">Budget planning and reserve funding</div>
        </div>
      </div>
    </div>
  </section>

  <section id="process" data-screen-label="04 Our Proven Process" style="background: #ffffff; padding: 96px 64px">
    <div style="max-width: 1560px; margin: 0 auto">
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 62ch; margin-bottom: 56px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Our proven process</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 44px; line-height: 1.05; letter-spacing: -0.015em">Six Steps, Every Time</h2>
        <p style="margin: 0; font-size: 18px; line-height: 1.6; color: #3a3a3a">Every successful lining project begins long before the liner is installed. Our standardized process ensures every pipe is properly prepared, installed, inspected, and documented.</p>
      </div>
      <div class="jbp-process-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(35,31,32,0.12); border: 1px solid rgba(35,31,32,0.12)">
        <div style="background: #ffffff; padding: 30px 26px; display: flex; flex-direction: column; gap: 12px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 15px; color: #BC0F0E">01</div><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 19px; line-height: 1.25">Camera Inspection</h3><p style="margin: 0; font-size: 16px; line-height: 1.5; color: #3a3a3a">Identify defects, determine suitability for lining, and create a repair plan.</p></div>
        <div style="background: #ffffff; padding: 30px 26px; display: flex; flex-direction: column; gap: 12px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 15px; color: #BC0F0E">02</div><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 19px; line-height: 1.25">Professional Cleaning</h3><p style="margin: 0; font-size: 16px; line-height: 1.5; color: #3a3a3a">Heavy scale, roots, debris, and buildup are removed to prepare the pipe.</p></div>
        <div style="background: #ffffff; padding: 30px 26px; display: flex; flex-direction: column; gap: 12px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 15px; color: #BC0F0E">03</div><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 19px; line-height: 1.25">Quality Verification</h3><p style="margin: 0; font-size: 16px; line-height: 1.5; color: #3a3a3a">A second inspection confirms the pipe is ready before installation begins.</p></div>
        <div style="background: #ffffff; padding: 30px 26px; display: flex; flex-direction: column; gap: 12px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 15px; color: #BC0F0E">04</div><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 19px; line-height: 1.25">UV Liner Installation</h3><p style="margin: 0; font-size: 16px; line-height: 1.5; color: #3a3a3a">A structural liner is installed and cured to create a new pipe inside the old one.</p></div>
        <div style="background: #ffffff; padding: 30px 26px; display: flex; flex-direction: column; gap: 12px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 15px; color: #BC0F0E">05</div><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 19px; line-height: 1.25">Robotic Reinstatement</h3><p style="margin: 0; font-size: 16px; line-height: 1.5; color: #3a3a3a">Every branch connection is reopened using precision robotic cutting equipment.</p></div>
        <div style="background: #ffffff; padding: 30px 26px; display: flex; flex-direction: column; gap: 12px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 15px; color: #BC0F0E">06</div><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 19px; line-height: 1.25">Final Video Inspection</h3><p style="margin: 0; font-size: 16px; line-height: 1.5; color: #3a3a3a">Every installation is documented and verified before project completion.</p></div>
      </div>
    </div>
  </section>

  <section data-screen-label="05 Dedicated Crews" style="background: #F9F3EC; padding: 96px 64px; border-top: 1px solid rgba(35,31,32,0.12); border-bottom: 1px solid rgba(35,31,32,0.12)">
    <div style="max-width: 1560px; margin: 0 auto">
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 66ch; margin-bottom: 56px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Why our process produces better results</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 40px; line-height: 1.08; letter-spacing: -0.015em">Preparation Deserves Its Own Specialists</h2>
        <p style="margin: 0; font-size: 18px; line-height: 1.6; color: #3a3a3a">Many contractors clean and line a sewer on the same day, with the same crew. We separate the two — cleaning crews focus exclusively on preparing pipes, and only after a pipe meets our quality standards does the lining crew begin installation.</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(380px, 100%), 1fr)); gap: 32px">
        <div style="background: #ffffff; border: 1px solid rgba(35,31,32,0.12); display: flex; flex-direction: column">
          <div style="aspect-ratio: 16 / 9; overflow: hidden"><img src="/hoa-pipe-lining/assets/photo-hydro-jetting.png" alt="Hydro jetting cleaning" style="width: 100%; height: 100%; object-fit: cover; object-position: center 25%; display: block"></div>
          <div style="padding: 28px"><h3 style="margin: 0 0 10px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 22px">Dedicated Cleaning Teams</h3><p style="margin: 0; font-size: 16.5px; line-height: 1.55; color: #3a3a3a">Cleaning a sewer system properly requires specialized equipment, experience, and attention to detail. Separating this from installation gives every crew room to focus on what they do best.</p></div>
        </div>
        <div style="background: #ffffff; border: 1px solid rgba(35,31,32,0.12); display: flex; flex-direction: column">
          <div style="aspect-ratio: 16 / 9; overflow: hidden"><img src="/hoa-pipe-lining/assets/photo-lining-teams.png" alt="Specialized lining team preparing liner material" style="width: 100%; height: 100%; object-fit: cover; display: block"></div>
          <div style="padding: 28px"><h3 style="margin: 0 0 10px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 22px">Specialized Lining Teams</h3><p style="margin: 0; font-size: 16.5px; line-height: 1.55; color: #3a3a3a">Installing cured-in-place pipe is its own trade. Our lining technicians install every day using dedicated equipment and standardized procedures — improving consistency and efficiency.</p></div>
        </div>
      </div>
    </div>
  </section>

  <section data-screen-label="06 Robotic Reinstatement" style="background: #ffffff; padding: 96px 64px">
    <div style="max-width: 1560px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: 72px; align-items: center">
      <div style="display: flex; flex-direction: column; gap: 20px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Precision robotic reinstatement</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 40px; line-height: 1.08; letter-spacing: -0.015em; max-width: 16ch">One of the Most Important Quality Steps in the Project</h2>
        <p style="margin: 0; font-size: 18px; line-height: 1.6; color: #2b2b2b; max-width: 54ch">Every branch connection must be reopened after the liner cures. Using robotic cutting equipment, our technicians precisely reopen each connection to restore proper flow while maintaining the integrity of the new liner — helping ensure long-term system performance.</p>
      </div>
      <div style="position: relative; aspect-ratio: 4 / 3; overflow: hidden">
        <img src="/hoa-pipe-lining/assets/photo-robotic-cutter.png" alt="Robotic cutter control operating inside pipe" style="width: 100%; height: 100%; object-fit: cover; display: block">
      </div>
    </div>
  </section>

  <section id="experience" data-screen-label="07 Experience Matters" style="position: relative; overflow: hidden; background: #BC0F0E; color: #fff; padding: 96px 64px">
    <div style="position: relative; max-width: 1560px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: 72px; align-items: center">
      <div style="display: flex; flex-direction: column; gap: 20px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.82)">Experience matters</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 40px; line-height: 1.08; letter-spacing: -0.015em; color: #fff">Pipe Lining Isn't Something We Do Occasionally. It's What We Do Every Day.</h2>
        <p style="margin: 0; font-size: 18px; line-height: 1.6; color: rgba(255,255,255,0.86); max-width: 54ch">We're one of the Midwest's highest-volume pipe lining contractors, with specialized crews completing hundreds of installations each month. For HOA communities, that translates into consistency, predictable scheduling, and confidence in the team doing the work.</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: rgba(255,255,255,0.25)">
        <div style="background: #A60C0B; padding: 32px 28px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 40px; line-height: 1">200+</div><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.82); margin-top: 8px">Liners installed monthly</div></div>
        <div style="background: #A60C0B; padding: 32px 28px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 22px; line-height: 1.15">Dedicated Cleaning Crews</div></div>
        <div style="background: #A60C0B; padding: 32px 28px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 22px; line-height: 1.15">Dedicated Lining Crews</div></div>
        <div style="background: #A60C0B; padding: 32px 28px"><div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 22px; line-height: 1.15">Specialized Robotic Equipment</div></div>
      </div>
    </div>
  </section>

  <section data-screen-label="08 Technology" style="background: #ffffff; padding: 96px 64px">
    <div style="max-width: 1560px; margin: 0 auto">
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 62ch; margin-bottom: 48px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Technology that improves quality</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 40px; line-height: 1.08; letter-spacing: -0.015em">Our Investment in Trenchless Equipment</h2>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 1px; background: rgba(35,31,32,0.12); border: 1px solid rgba(35,31,32,0.12)">
        <div style="background: #ffffff; padding: 30px 26px; display: flex; flex-direction: column; gap: 10px"><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 18px">HD Sewer Cameras</h3><p style="margin: 0; font-size: 15.5px; line-height: 1.5; color: #3a3a3a">Accurate diagnosis before work begins.</p></div>
        <div style="background: #ffffff; padding: 30px 26px; display: flex; flex-direction: column; gap: 10px"><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 18px">UV Lining Systems</h3><p style="margin: 0; font-size: 15.5px; line-height: 1.5; color: #3a3a3a">Controlled curing for reliable installations.</p></div>
        <div style="background: #ffffff; padding: 30px 26px; display: flex; flex-direction: column; gap: 10px"><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 18px">Robotic Cutters</h3><p style="margin: 0; font-size: 15.5px; line-height: 1.5; color: #3a3a3a">Precision reopening of every branch connection.</p></div>
        <div style="background: #ffffff; padding: 30px 26px; display: flex; flex-direction: column; gap: 10px"><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 18px">Professional Cleaning Gear</h3><p style="margin: 0; font-size: 15.5px; line-height: 1.5; color: #3a3a3a">Proper surface preparation before lining.</p></div>
        <div style="background: #ffffff; padding: 30px 26px; display: flex; flex-direction: column; gap: 10px"><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 18px">Digital Documentation</h3><p style="margin: 0; font-size: 15.5px; line-height: 1.5; color: #3a3a3a">Before-and-after inspection video on every project.</p></div>
      </div>
    </div>
  </section>

  <section data-screen-label="09 Project Management" style="background: #F9F3EC; padding: 96px 64px; border-top: 1px solid rgba(35,31,32,0.12); border-bottom: 1px solid rgba(35,31,32,0.12)">
    <div style="max-width: 1560px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr)); gap: 72px; align-items: center">
      <div style="display: flex; flex-direction: column; gap: 20px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Designed around HOA project management</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 40px; line-height: 1.08; letter-spacing: -0.015em; max-width: 16ch">Successful Projects Require Communication, Not Just Technical Skill</h2>
        <p style="margin: 0; font-size: 18px; line-height: 1.6; color: #2b2b2b; max-width: 54ch">Every project is coordinated by a dedicated team that works with property managers, residents, maintenance staff, and board members throughout construction.</p>
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px">
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-weight: 700">✓</span>Resident scheduling</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-weight: 700">✓</span>Access coordination</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-weight: 700">✓</span>Daily communication</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-weight: 700">✓</span>Progress updates</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4; border-bottom: 1px solid rgba(35,31,32,0.10); padding-bottom: 12px"><span style="color: #BC0F0E; font-weight: 700">✓</span>Project documentation</div>
        <div style="display: flex; gap: 12px; align-items: baseline; font-size: 18px; line-height: 1.4"><span style="color: #BC0F0E; font-weight: 700">✓</span>Final close-out reports</div>
      </div>
    </div>
  </section>

  <section id="projects" data-screen-label="10 Recent HOA Projects" style="background: #ffffff; padding: 96px 64px">
    <div style="max-width: 1560px; margin: 0 auto">
      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 62ch; margin-bottom: 56px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Recent HOA projects</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 40px; line-height: 1.08; letter-spacing: -0.015em">Real Communities, Real Results</h2>
        <p style="margin: 0; font-size: 18px; line-height: 1.6; color: #3a3a3a">A sample of HOA and condo communities we've served across the Chicago suburbs.</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(340px, 100%), 1fr)); gap: 32px">
        <div style="background: #F9F3EC; border: 1px solid rgba(35,31,32,0.12); display: flex; flex-direction: column"><div style="aspect-ratio: 4 / 3; overflow: hidden"><img src="/hoa-pipe-lining/assets/project-arbors-buffalo-grove.png" alt="Arbors of Buffalo Grove" style="width: 100%; height: 100%; object-fit: cover; display: block"></div><div style="padding: 26px; display: flex; flex-direction: column; gap: 10px"><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px">Arbors of Buffalo Grove</h3><div style="font-family: 'Industry', 'Arial', sans-serif; font-size: 12px; letter-spacing: 0.04em; color: #6b6b6b; text-transform: uppercase">Buffalo Grove, IL</div></div></div>
<div style="background: #F9F3EC; border: 1px solid rgba(35,31,32,0.12); display: flex; flex-direction: column"><div style="aspect-ratio: 4 / 3; overflow: hidden"><img src="/hoa-pipe-lining/assets/project-central-village.png" alt="Central Village Condominiums" style="width: 100%; height: 100%; object-fit: cover; display: block"></div><div style="padding: 26px; display: flex; flex-direction: column; gap: 10px"><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px">Central Village Condominiums</h3><div style="font-family: 'Industry', 'Arial', sans-serif; font-size: 12px; letter-spacing: 0.04em; color: #6b6b6b; text-transform: uppercase">Mount Prospect, IL</div></div></div>
<div style="background: #F9F3EC; border: 1px solid rgba(35,31,32,0.12); display: flex; flex-direction: column"><div style="aspect-ratio: 4 / 3; overflow: hidden"><img src="/hoa-pipe-lining/assets/project-sherwood-gardens.png" alt="Sherwood Gardens Condo Association" style="width: 100%; height: 100%; object-fit: cover; display: block"></div><div style="padding: 26px; display: flex; flex-direction: column; gap: 10px"><h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px">Sherwood Gardens Condo Association</h3><div style="font-family: 'Industry', 'Arial', sans-serif; font-size: 12px; letter-spacing: 0.04em; color: #6b6b6b; text-transform: uppercase">La Grange Park, IL</div></div></div>
      </div>
    </div>
  </section>

  <section id="faq" data-screen-label="11 FAQ" style="background: #F9F3EC; padding: 96px 64px; border-top: 1px solid rgba(35,31,32,0.12)">
    <div style="max-width: 900px; margin: 0 auto">
      <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 48px">
        <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #BC0F0E">Frequently asked questions</div>
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 40px; line-height: 1.08; letter-spacing: -0.015em">Common Questions From HOA Boards</h2>
      </div>
      <div style="display: flex; flex-direction: column">
        <div style="padding: 26px 0; border-bottom: 1px solid rgba(35,31,32,0.14)"><h3 style="margin: 0 0 10px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px">How long does pipe lining last?</h3><p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Modern cured-in-place pipe lining systems are designed to provide decades of service and are commonly expected to last 50 years or more when properly installed.</p></div>
        <div style="padding: 26px 0; border-bottom: 1px solid rgba(35,31,32,0.14)"><h3 style="margin: 0 0 10px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px">Will residents have to move out?</h3><p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">In most cases, residents remain in their homes throughout the project. Temporary interruptions to plumbing service are coordinated in advance.</p></div>
        <div style="padding: 26px 0; border-bottom: 1px solid rgba(35,31,32,0.14)"><h3 style="margin: 0 0 10px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px">Can every sewer pipe be lined?</h3><p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Not every pipe is a candidate for lining. Our inspection determines whether pipe lining or replacement is the best long-term solution.</p></div>
        <div style="padding: 26px 0; border-bottom: 1px solid rgba(35,31,32,0.14)"><h3 style="margin: 0 0 10px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px">How long does installation take?</h3><p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Project timelines vary based on building size and complexity, but pipe lining is generally completed much faster than traditional replacement.</p></div>
        <div style="padding: 26px 0"><h3 style="margin: 0 0 10px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 700; font-size: 20px">What warranty is provided?</h3><p style="margin: 0; font-size: 17px; line-height: 1.55; color: #3a3a3a">Warranty terms vary by project. Our team will explain available warranty options during the proposal process.</p></div>
      </div>
    </div>
  </section>

  <section id="book" data-screen-label="12 Final CTA" style="position: relative; background: #BC0F0E; padding: 0">
    <div style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(148,10,9,0.97) 0%, rgba(166,12,11,0.9) 55%, rgba(35,31,32,0.7) 100%)"></div>
    <div class="jbp-cta-grid" style="position: relative; max-width: 1560px; margin: 0 auto; padding: 104px 64px; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 72px; align-items: start">
      <div class="jbp-cta-text" style="display: flex; flex-direction: column; gap: 24px">
        <h2 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 46px; line-height: 1.05; letter-spacing: -0.02em; color: #fff; max-width: 20ch">Protect Your Community's Sewer Infrastructure Before Small Problems Become Major Repairs</h2>
        <p style="margin: 0; font-size: 19px; line-height: 1.6; color: rgba(255,255,255,0.86); max-width: 54ch">Whether you're planning reserve projects or responding to active sewer issues, our HOA specialists can help you determine the most effective long-term solution.</p>
        <div class="jbp-cta-call" style="display: flex; align-items: center; gap: 16px; margin-top: 8px; padding-top: 26px; border-top: 1px solid rgba(255,255,255,0.20)">
          <div style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 12.5px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.55)">Or call the HOA line</div>
          <a class="jbp-phone-dim" href="tel:2246572472" style="font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 30px; color: #fff; letter-spacing: -0.01em">(224) 657-2472</a>
        </div>
      </div>
      <form id="hoa-form" class="jbp-cta-form" style="background: #F9F3EC; padding: 36px; min-width: 0; display: flex; flex-direction: column; gap: 18px">
        <div style="display: flex; flex-direction: column; gap: 6px">
          <h3 style="margin: 0; font-family: 'Industry', 'Arial', sans-serif; font-weight: 800; font-size: 26px; line-height: 1.1">Schedule An Inspection</h3>
          <p style="margin: 0; font-size: 16.5px; line-height: 1.5; color: #4a4a4a">An HOA advisor responds within one business day.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px">
          <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">Full name
            <input type="text" name="name" required="required" placeholder="Bruce Wayne" style="width: 100%; min-width: 0; font-family: 'Nunito', system-ui, sans-serif; font-size: 17px; padding: 12px 14px; border: 1px solid rgba(35,31,32,0.25); border-radius: 6px; background: #fff; color: #231F20">
          </label>
          <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">Role
            <select name="role" required class="jbp-role-select">
              <option>Board member</option>
              <option>Property manager</option>
              <option>Building engineer</option>
              <option>Other</option>
            </select>
          </label>
          <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">Email
            <input type="email" name="email" required="required" placeholder="bruce@waynemanor.org" style="width: 100%; min-width: 0; font-family: 'Nunito', system-ui, sans-serif; font-size: 17px; padding: 12px 14px; border: 1px solid rgba(35,31,32,0.25); border-radius: 6px; background: #fff; color: #231F20">
          </label>
          <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">Phone
            <input type="tel" name="phone" placeholder="(312) 555-2472" style="width: 100%; min-width: 0; font-family: 'Nunito', system-ui, sans-serif; font-size: 17px; padding: 12px 14px; border: 1px solid rgba(35,31,32,0.25); border-radius: 6px; background: #fff; color: #231F20">
          </label>
        </div>
        <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">Property / association name
          <input type="text" name="property" placeholder="Gotham Heights Condominium Assn." style="width: 100%; min-width: 0; font-family: 'Nunito', system-ui, sans-serif; font-size: 17px; padding: 12px 14px; border: 1px solid rgba(35,31,32,0.25); border-radius: 6px; background: #fff; color: #231F20">
        </label>
        <label style="display: flex; flex-direction: column; gap: 7px; font-family: 'Industry', 'Arial', sans-serif; font-weight: 500; font-size: 11.5px; letter-spacing: 0.10em; text-transform: uppercase; color: #6b6b6b">What's happening at the property?
          <textarea name="message" rows="3" placeholder="Recurring backups in Building C, cast iron, last rodded in March…" style="width: 100%; min-width: 0; font-family: 'Nunito', system-ui, sans-serif; font-size: 17px; padding: 12px 14px; border: 1px solid rgba(35,31,32,0.25); border-radius: 6px; background: #fff; color: #231F20; resize: vertical"></textarea>
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
      <div className="hoa-landing" dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
      <HoaLandingScripts />
      <HoaClusterLinks current="pillar" />
    </>
  );
}
