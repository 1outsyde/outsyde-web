// app/page.tsx
// Go OutsYde — Home page (converted from your HTML to Next.js)
// Paste this whole file into: outsyde-web/app/page.tsx (replace everything)
//
// NOTES:
// - Images are Unsplash placeholders for now — swap the URLs for your real
//   Lotus photography + photographer shots when ready.
// - Hero video: drop your file in /public and set the <source> src below.
// - Links like /shop, /login, /photographer-signup are future pages (they'll
//   404 until we build them) — that's expected.

"use client";

import { useEffect, useRef, useState } from "react";

const SLIDES = 4;

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [cur, setCur] = useState(0);
  const startX = useRef(0);

  // nav background on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 55);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // carousel autoplay (resets whenever the slide changes, incl. manual nav)
  useEffect(() => {
    const t = setTimeout(() => setCur((c) => (c + 1) % SLIDES), 5200);
    return () => clearTimeout(t);
  }, [cur]);

  const go = (i: number) => setCur(((i % SLIDES) + SLIDES) % SLIDES);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Hanken+Grotesk:wght@300;400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root{
  --black:#000000; --gold:#E8B930; --gold-soft:rgba(232,185,48,0.13);
  --cream:#F5F0E6; --emerald:#1A3C34; --emerald-mid:#224d43; --off-black:#060e0c;
  /* Outsyde brand fonts: Bebas (loud display) + Hanken (body) + Cormorant (editorial / Lotus) */
  --serif:'Bebas Neue',Impact,sans-serif; --sans:'Hanken Grotesk',system-ui,sans-serif;
  --serif-editorial:'Cormorant Garamond',Georgia,serif;
}
html{scroll-behavior:smooth;}
body{font-family:var(--sans);background:var(--black);color:var(--cream);overflow-x:hidden;}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}

#nav{position:fixed;top:0;left:0;right:0;z-index:200;padding:22px 52px;display:flex;align-items:center;gap:24px;transition:background .45s ease,padding .35s ease,border-color .45s ease;border-bottom:0.5px solid transparent;}
#nav.scrolled{background:rgba(0,0,0,.93);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);padding:14px 52px;border-bottom-color:rgba(232,185,48,.18);}
.nav-logo{display:flex;align-items:center;gap:11px;text-decoration:none;}
.nav-y-mark{width:40px;height:40px;object-fit:contain;flex-shrink:0;}
.nav-wordmark{line-height:1;}
.nav-wordmark strong{display:block;font-family:var(--serif);font-weight:300;font-size:19px;letter-spacing:.14em;color:var(--cream);text-transform:uppercase;}
.nav-wordmark span{display:block;font-size:8.5px;letter-spacing:.22em;color:var(--gold);text-transform:uppercase;margin-top:1px;}
.nav-links{flex:1;display:flex;justify-content:center;gap:34px;}
.nav-links a{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:rgba(245,240,230,.65);text-decoration:none;transition:color .2s;}
.nav-links a:hover{color:var(--gold);}
.nav-actions{display:flex;align-items:center;gap:22px;}
.nav-actions a{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:rgba(245,240,230,.65);text-decoration:none;transition:color .2s;}
.nav-actions a:hover{color:var(--cream);}
.nav-cta{padding:9px 20px;background:var(--gold);color:var(--black)!important;font-size:11px!important;letter-spacing:.1em!important;font-weight:600!important;border-radius:3px;transition:background .2s,transform .2s!important;}
.nav-cta:hover{background:#f2c835!important;transform:translateY(-1px);}

#hero{position:relative;height:100dvh;min-height:640px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;}
#hero-bg{position:absolute;inset:0;background:var(--off-black);overflow:hidden;}
#hero-bg::before{content:'';position:absolute;inset:-25%;background:radial-gradient(ellipse 70% 65% at 22% 58%,rgba(26,60,52,.9) 0%,transparent 52%),radial-gradient(ellipse 55% 45% at 78% 22%,rgba(232,185,48,.1) 0%,transparent 48%),radial-gradient(ellipse 60% 70% at 62% 85%,rgba(26,60,52,.55) 0%,transparent 52%),#04100d;animation:heroFlow 16s ease-in-out infinite alternate;will-change:transform;}
@keyframes heroFlow{0%{transform:translate(0%,0%) scale(1);}25%{transform:translate(-2.2%,1.8%) scale(1.04);}50%{transform:translate(2.1%,-1.2%) scale(1.08);}75%{transform:translate(-1.3%,2.4%) scale(1.05);}100%{transform:translate(1.8%,-2.1%) scale(1.10);}}
#hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.2s ease;}
#hero-video.loaded{opacity:.52;}
#hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.18) 0%,rgba(0,0,0,.38) 38%,rgba(0,0,0,.65) 72%,rgba(0,0,0,.88) 100%);}
#hero-content{position:relative;z-index:2;padding:0 28px;max-width:860px;}
.hero-eyebrow{font-size:10.5px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);margin-bottom:26px;opacity:0;animation:riseIn .9s .4s cubic-bezier(.22,1,.36,1) forwards;}
.hero-title{font-family:var(--serif);font-size:clamp(72px,11.5vw,148px);font-weight:400;line-height:.86;letter-spacing:.04em;text-transform:uppercase;color:var(--cream);margin-bottom:22px;opacity:0;animation:riseIn 1s .6s cubic-bezier(.22,1,.36,1) forwards;}
.hero-title .gold{color:var(--gold);}
.hero-desc{font-size:clamp(14px,1.7vw,16px);font-weight:300;color:rgba(245,240,230,.72);letter-spacing:.04em;line-height:1.7;margin-bottom:46px;opacity:0;animation:riseIn 1s .8s cubic-bezier(.22,1,.36,1) forwards;}
.hero-ctas{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;opacity:0;animation:riseIn .9s 1s cubic-bezier(.22,1,.36,1) forwards;}
.btn{display:inline-flex;align-items:center;gap:9px;padding:15px 30px;border-radius:3px;font-family:var(--sans);font-size:11.5px;letter-spacing:.13em;text-transform:uppercase;font-weight:600;text-decoration:none;border:none;cursor:pointer;transition:background .22s ease,border-color .22s ease,color .22s ease,transform .22s ease;}
.btn:hover{transform:translateY(-2px);}
.btn-gold{background:var(--gold);color:var(--black);}
.btn-gold:hover{background:#f2c835;}
.btn-outline{background:transparent;color:var(--cream);border:1px solid rgba(245,240,230,.4);}
.btn-outline:hover{border-color:var(--gold);color:var(--gold);}
.hero-partner-link{display:block;margin-top:18px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(245,240,230,.45);text-decoration:none;transition:color .2s;font-weight:400;}
.hero-partner-link:hover{color:var(--gold);}
.hero-scroll-cue{position:absolute;bottom:34px;left:50%;transform:translateX(-50%);z-index:2;display:flex;flex-direction:column;align-items:center;gap:8px;color:rgba(245,240,230,.38);font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;opacity:0;animation:riseIn 1s 1.8s forwards;}
.scroll-pulse{width:1px;height:44px;background:linear-gradient(to bottom,rgba(245,240,230,.45),transparent);animation:scrollAnim 2.2s ease-in-out infinite;}
@keyframes scrollAnim{0%,100%{opacity:.4;transform:scaleY(1);}50%{opacity:1;transform:scaleY(1.25);}}
@keyframes riseIn{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);}}

#triptych{display:grid;grid-template-columns:repeat(3,1fr);}
.tri-panel{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:52px 44px;min-height:500px;text-decoration:none;transition:filter .35s;}
#triptych:hover .tri-panel:not(:hover){filter:brightness(.82);}
.tri-panel-inner{position:relative;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:0;}
.tri-bg{position:absolute;inset:0;background-size:cover;background-position:center;transition:transform .7s ease;}
.tri-panel:hover .tri-bg{transform:scale(1.04);}
.tri-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.22) 55%,transparent 100%);}
.panel-biz .tri-overlay{background:linear-gradient(135deg,rgba(26,60,52,.9) 0%,rgba(0,0,0,.5) 100%);}
.panel-shop .tri-overlay{background:linear-gradient(135deg,rgba(0,0,0,.75) 0%,rgba(26,60,52,.4) 100%);}
.panel-photo .tri-overlay{background:linear-gradient(135deg,rgba(0,0,0,.88) 0%,rgba(26,60,52,.55) 100%);}
.panel-biz{background:#0a1e1a;}
.panel-shop{background:#111;}
.panel-photo{background:#06100d;}
.tri-num{position:absolute;top:30px;right:30px;font-family:var(--serif);font-size:72px;font-weight:300;line-height:1;letter-spacing:-0.02em;color:var(--gold);opacity:.1;pointer-events:none;z-index:1;}
.tri-tag{display:inline-block;padding:4px 11px;border-radius:2px;margin-bottom:14px;font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;font-weight:600;}
.panel-biz .tri-tag{background:var(--gold-soft);color:var(--gold);border:0.5px solid rgba(232,185,48,.3);}
.panel-shop .tri-tag{background:rgba(245,240,230,.1);color:var(--cream);border:0.5px solid rgba(245,240,230,.25);}
.panel-photo .tri-tag{background:var(--gold-soft);color:var(--gold);border:0.5px solid rgba(232,185,48,.3);}
.tri-heading{font-family:var(--serif);font-size:34px;font-weight:400;line-height:1.0;letter-spacing:.02em;text-transform:uppercase;color:var(--cream);margin-bottom:14px;}
.tri-desc{font-size:13.5px;font-weight:300;line-height:1.7;color:rgba(245,240,230,.62);margin-bottom:30px;max-width:300px;}
.tri-btns{display:flex;flex-direction:column;gap:10px;width:100%;}
.tri-btn{display:inline-flex;align-items:center;gap:9px;padding:13px 22px;border-radius:3px;align-self:flex-start;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;text-decoration:none;border:none;cursor:pointer;transition:all .22s;}
.tri-btn:hover{transform:translateX(4px);}
.tri-btn-arrow{transition:transform .22s;}
.tri-btn:hover .tri-btn-arrow{transform:translateX(3px);}
.btn-tri-gold{background:var(--gold);color:var(--black);}
.btn-tri-gold:hover{background:#f2c835;transform:translateX(4px);}
.btn-tri-outline-cream{background:transparent;color:var(--cream);border:1px solid rgba(245,240,230,.35);}
.btn-tri-outline-cream:hover{border-color:var(--gold);color:var(--gold);}

#marquee{border-top:0.5px solid rgba(232,185,48,.18);border-bottom:0.5px solid rgba(232,185,48,.18);background:var(--black);padding:20px 0;overflow:hidden;}
.marquee-track{display:flex;width:max-content;animation:marqueeRoll 28s linear infinite;}
.marquee-track:hover{animation-play-state:paused;}
.marquee-item{font-family:var(--serif);font-size:26px;font-weight:300;letter-spacing:.1em;text-transform:uppercase;color:var(--cream);white-space:nowrap;padding:0 28px;}
.marquee-sep{color:var(--gold);}
@keyframes marqueeRoll{from{transform:translateX(0);}to{transform:translateX(-50%);}}

#collection{background:var(--black);padding:88px 0 0;}
.collection-head{text-align:center;padding:0 52px 56px;}
.collection-head h2{font-family:var(--serif);font-size:clamp(38px,5vw,62px);font-weight:300;letter-spacing:.04em;color:var(--cream);margin-bottom:10px;}
.collection-head p{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.42);}
.carousel-outer{position:relative;overflow:hidden;}
.carousel-track{display:flex;transition:transform .72s cubic-bezier(.4,0,.2,1);}
.carousel-slide{flex:0 0 100%;height:74vh;min-height:520px;position:relative;overflow:hidden;display:flex;align-items:flex-end;}
.slide-bg{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1);transition:transform .72s ease;}
.carousel-slide.active .slide-bg{transform:scale(1.04);}
.slide-grad{position:absolute;inset:0;background:linear-gradient(to right,rgba(0,0,0,.78) 0%,rgba(0,0,0,.35) 55%,rgba(0,0,0,.05) 100%);}
.slide-content{position:relative;z-index:2;padding:60px 68px;max-width:540px;}
.slide-brand-label{font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--gold);margin-bottom:18px;display:flex;align-items:center;gap:12px;}
.slide-brand-label::before{content:'';display:block;width:28px;height:1px;background:var(--gold);}
.slide-title{font-family:var(--serif-editorial);font-size:clamp(56px,7vw,96px);font-weight:300;line-height:.9;letter-spacing:0;color:var(--cream);margin-bottom:28px;}
.slide-title em{font-style:italic;color:var(--gold);}
.slide-btns{display:flex;gap:12px;flex-wrap:wrap;}
.slide-cta{display:inline-flex;align-items:center;gap:9px;padding:14px 28px;background:var(--gold);color:var(--black);font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:600;text-decoration:none;border-radius:3px;transition:background .22s,transform .22s;border:none;cursor:pointer;}
.slide-cta:hover{background:#f2c835;transform:translateY(-2px);}
.slide-cta-secondary{display:inline-flex;align-items:center;gap:9px;padding:14px 22px;background:transparent;color:var(--cream);border:1px solid rgba(245,240,230,.38);font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:500;text-decoration:none;border-radius:3px;transition:all .22s;cursor:pointer;}
.slide-cta-secondary:hover{border-color:var(--gold);color:var(--gold);transform:translateY(-2px);}
.slide-join-bg{background:linear-gradient(135deg,var(--emerald) 0%,#061310 100%)!important;}
.carousel-nav{display:flex;align-items:center;justify-content:center;gap:20px;padding:44px 0;}
.c-btn{width:50px;height:50px;border-radius:50%;border:1px solid rgba(245,240,230,.28);background:transparent;color:var(--cream);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;transition:border-color .2s,color .2s,transform .2s;}
.c-btn:hover{border-color:var(--gold);color:var(--gold);transform:scale(1.08);}
.c-dots{display:flex;gap:8px;align-items:center;}
.c-dot{width:7px;height:7px;border-radius:50%;background:rgba(245,240,230,.25);border:none;cursor:pointer;transition:all .28s;}
.c-dot.active{background:var(--gold);width:26px;border-radius:3.5px;}

#photographers{background:#050d0b;padding:100px 52px;}
.photo-hd{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:60px;gap:28px;flex-wrap:wrap;}
.photo-hd-left h2{font-family:var(--serif);font-size:clamp(38px,5.5vw,68px);font-weight:300;letter-spacing:.02em;color:var(--cream);line-height:.95;margin-bottom:12px;}
.photo-hd-left p{font-size:14px;color:rgba(245,240,230,.5);max-width:380px;line-height:1.65;}
.photo-hd-right{display:flex;gap:12px;flex-wrap:wrap;}
.btn-book-now{padding:14px 28px;background:var(--gold);color:var(--black);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;text-decoration:none;border-radius:3px;transition:all .22s;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:8px;}
.btn-book-now:hover{background:#f2c835;transform:translateY(-2px);}
.btn-join-collective{padding:14px 28px;background:transparent;color:var(--cream);border:1px solid rgba(245,240,230,.3);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:500;text-decoration:none;border-radius:3px;transition:all .22s;cursor:pointer;display:inline-flex;align-items:center;gap:8px;}
.btn-join-collective:hover{border-color:var(--gold);color:var(--gold);transform:translateY(-2px);}
.photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-bottom:52px;}
.photo-card{position:relative;overflow:hidden;aspect-ratio:3/4;cursor:pointer;}
.photo-card-bg{position:absolute;inset:0;background:var(--emerald-mid);background-size:cover;background-position:center top;transition:transform .65s ease;}
.photo-card:hover .photo-card-bg{transform:scale(1.06);}
.photo-card-veil{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.08) 50%,transparent 100%);}
.photo-card-book{position:absolute;top:14px;right:14px;padding:7px 15px;background:var(--gold);color:var(--black);font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;text-decoration:none;border-radius:2px;opacity:0;transform:translateY(-6px);transition:opacity .25s,transform .25s;}
.photo-card:hover .photo-card-book{opacity:1;transform:translateY(0);}
.photo-card-info{position:absolute;bottom:0;left:0;right:0;padding:24px 22px;}
.photo-card-name{font-family:var(--serif);font-size:26px;font-weight:400;color:var(--cream);margin-bottom:4px;}
.photo-card-role{font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);}
.photo-cta-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;padding:36px 44px;background:rgba(26,60,52,.2);border:0.5px solid rgba(232,185,48,.12);border-radius:4px;}
.photo-cta-row p{font-size:14px;color:rgba(245,240,230,.6);max-width:400px;line-height:1.6;}
.photo-cta-row p strong{color:var(--cream);font-weight:500;}

#business-band{background:var(--emerald);padding:88px 52px;display:flex;align-items:center;justify-content:space-between;gap:44px;flex-wrap:wrap;}
.biz-band-text h2{font-family:var(--serif);font-size:clamp(38px,5vw,64px);font-weight:400;color:var(--cream);line-height:1.0;letter-spacing:.02em;text-transform:uppercase;margin-bottom:12px;}
.biz-band-text h2 em{font-style:normal;color:var(--gold);}
.biz-band-text p{font-size:14px;color:rgba(245,240,230,.6);max-width:480px;line-height:1.7;}
.biz-band-ctas{display:flex;gap:14px;flex-wrap:wrap;}
.btn-biz-cta{padding:16px 32px;border-radius:3px;font-size:11.5px;letter-spacing:.13em;text-transform:uppercase;font-weight:600;text-decoration:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:9px;transition:all .22s;}
.btn-biz-cta:hover{transform:translateY(-2px);}
.btn-biz-gold{background:var(--gold);color:var(--black);}
.btn-biz-gold:hover{background:#f2c835;}
.btn-biz-ghost{background:transparent;color:var(--cream);border:1px solid rgba(245,240,230,.35);}
.btn-biz-ghost:hover{border-color:var(--gold);color:var(--gold);}

footer{background:#000;border-top:0.5px solid rgba(232,185,48,.14);padding:72px 52px 36px;}
.footer-grid{display:grid;grid-template-columns:2.2fr 1fr 1fr 1fr;gap:52px;margin-bottom:56px;}
.footer-brand-col .ft-logo{display:flex;align-items:center;gap:10px;margin-bottom:18px;}
.ft-y{width:34px;height:34px;background:var(--gold);border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:19px;color:var(--black);font-weight:600;}
.ft-name{font-family:var(--serif);font-size:17px;letter-spacing:.12em;color:var(--cream);text-transform:uppercase;}
.footer-brand-col p{font-size:13px;color:rgba(245,240,230,.38);line-height:1.75;max-width:230px;}
.footer-brand-col .ft-social{display:flex;gap:14px;margin-top:22px;}
.ft-social a{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(245,240,230,.38);text-decoration:none;transition:color .2s;}
.ft-social a:hover{color:var(--gold);}
.footer-col h4{font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:22px;font-weight:600;}
.footer-col ul{list-style:none;display:flex;flex-direction:column;gap:11px;}
.footer-col a{font-size:13px;color:rgba(245,240,230,.42);text-decoration:none;transition:color .2s;}
.footer-col a:hover{color:var(--cream);}
.footer-bottom{border-top:0.5px solid rgba(245,240,230,.07);padding-top:26px;display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:rgba(245,240,230,.25);}

@media (max-width:960px){
  #nav{padding:16px 24px;} #nav.scrolled{padding:12px 24px;} .nav-links{display:none;}
  #triptych{grid-template-columns:1fr;} .tri-panel{min-height:340px;padding:44px 28px;} .tri-num{font-size:56px;}
  #photographers{padding:64px 24px;} .photo-grid{grid-template-columns:1fr;gap:3px;} .photo-card{aspect-ratio:4/3;}
  .photo-cta-row{padding:28px 24px;flex-direction:column;align-items:flex-start;}
  #business-band{padding:64px 24px;flex-direction:column;}
  footer{padding:52px 24px 28px;} .footer-grid{grid-template-columns:1fr 1fr;gap:36px;} .footer-brand-col{grid-column:1 / -1;}
}
@media (max-width:620px){
  .hero-title{font-size:72px;} .hero-ctas{flex-direction:column;align-items:center;}
  .hero-ctas .btn{width:100%;max-width:300px;justify-content:center;}
  .slide-content{padding:32px 28px;} .slide-title{font-size:56px;} .slide-btns{flex-direction:column;}
  .photo-hd{flex-direction:column;align-items:flex-start;} .photo-hd-right{flex-direction:column;width:100%;}
  .photo-hd-right a{width:100%;justify-content:center;} .footer-grid{grid-template-columns:1fr;}
}
`,
        }}
      />

      {/* ══ NAV ══ */}
      <nav id="nav" className={scrolled ? "scrolled" : ""} aria-label="Main navigation">
        <a href="/" className="nav-logo" aria-label="Go OutsYde home">
          <img src="/outsyde-y-transparent.png" className="nav-y-mark" alt="OutsYde" />
          <div className="nav-wordmark">
            <strong>Go OutsYde</strong>
            <span>Like a Lavished Local</span>
          </div>
        </a>
        <div className="nav-links">
          <a href="/shop">Shop</a>
          <a href="#photographers">Photographers</a>
          <a href="#business-band">For Businesses</a>
          <a href="#photographers">For Creators</a>
        </div>
        <div className="nav-actions">
          <a href="/coming-soon">Log In</a>
          <a href="/shop" className="nav-cta">Shop Now</a>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section id="hero" aria-label="Hero — Go OutsYde">
        <div id="hero-bg" aria-hidden="true" />
        {/* Drop your video file in /public and set src below, e.g. src="/hero.mp4" */}
        <video
          id="hero-video"
          autoPlay
          muted
          loop
          playsInline
          poster=""
          onCanPlay={(e) => e.currentTarget.classList.add("loaded")}
          aria-hidden="true"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div id="hero-overlay" aria-hidden="true" />
        <div id="hero-content">
          <p className="hero-eyebrow">Like a Lavished Local</p>
          <h1 className="hero-title">
            Go
            <br />
            <span className="gold">OutsYde</span>
          </h1>
          <p className="hero-desc">
            Culture meets commerce. Shop, book, and experience
            <br />
            local brands, artists, and photographers — all in one place.
          </p>
          <div className="hero-ctas">
            <a href="/shop" className="btn btn-gold">
              Shop Now →
            </a>
            <a href="#photographers" className="btn btn-outline">
              Book a Photographer
            </a>
            <a href="#business-band" className="hero-partner-link">
              Are you a business? Partner with us →
            </a>
          </div>
        </div>
        <div className="hero-scroll-cue" aria-hidden="true">
          <div className="scroll-pulse" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ══ AUDIENCE TRIPTYCH ══ */}
      <div id="triptych" aria-label="Who is OutsYde for">
        <div className="tri-panel panel-biz">
          <div className="tri-bg" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=75')" }} aria-hidden="true" />
          <div className="tri-overlay" aria-hidden="true" />
          <span className="tri-num" aria-hidden="true">01</span>
          <div className="tri-panel-inner">
            <span className="tri-tag">For Businesses</span>
            <h2 className="tri-heading">List Your Business on OutsYde</h2>
            <p className="tri-desc">Get your products, services, and bookings in front of OutsYde&apos;s audience of local culture-seekers and active buyers.</p>
            <div className="tri-btns">
              <a href="/coming-soon" className="tri-btn btn-tri-gold">
                Inquire to Join <span className="tri-btn-arrow">→</span>
              </a>
              <a href="/coming-soon" className="tri-btn btn-tri-outline-cream">How It Works</a>
            </div>
          </div>
        </div>

        <div className="tri-panel panel-shop">
          <div className="tri-bg" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=75')" }} aria-hidden="true" />
          <div className="tri-overlay" aria-hidden="true" />
          <span className="tri-num" aria-hidden="true">02</span>
          <div className="tri-panel-inner">
            <span className="tri-tag">For Shoppers</span>
            <h2 className="tri-heading">Discover. Shop. Experience.</h2>
            <p className="tri-desc">Browse curated products from local brands or instantly book a photographer for your next shoot — right here, right now.</p>
            <div className="tri-btns">
              <a href="/shop" className="tri-btn btn-tri-gold">
                Shop Now <span className="tri-btn-arrow">→</span>
              </a>
              <a href="#photographers" className="tri-btn btn-tri-outline-cream">Book a Photographer</a>
            </div>
          </div>
        </div>

        <div className="tri-panel panel-photo">
          <div className="tri-bg" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800&q=75')" }} aria-hidden="true" />
          <div className="tri-overlay" aria-hidden="true" />
          <span className="tri-num" aria-hidden="true">03</span>
          <div className="tri-panel-inner">
            <span className="tri-tag">For Photographers</span>
            <h2 className="tri-heading">Turn Your Lens Into Bookings</h2>
            <p className="tri-desc">Join OutsYde&apos;s collective of neighborhood photographers. Get discovered, get booked, and grow your client base — no middleman.</p>
            <div className="tri-btns">
              <a href="/coming-soon" className="tri-btn btn-tri-gold">
                Join as a Photographer <span className="tri-btn-arrow">→</span>
              </a>
              <a href="/coming-soon" className="tri-btn btn-tri-outline-cream">Learn More</a>
            </div>
          </div>
        </div>
      </div>

      {/* ══ MARQUEE ══ */}
      <div id="marquee" aria-hidden="true">
        <div className="marquee-track">
          <span className="marquee-item">Go OutsYde <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Like a Lavished Local <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Shop Local <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Book a Photographer <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Culture Meets Commerce <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Go OutsYde <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Like a Lavished Local <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Shop Local <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Book a Photographer <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Culture Meets Commerce <span className="marquee-sep">•</span></span>
        </div>
      </div>

      {/* ══ COLLECTION CAROUSEL ══ */}
      <section id="collection" aria-label="Explore the Collection">
        <div className="collection-head">
          <h2>Explore the Collection</h2>
          <p>Browse products from our brand partners</p>
        </div>

        <div className="carousel-outer">
          <div
            className="carousel-track"
            style={{ transform: `translateX(-${cur * 100}%)` }}
            onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - startX.current;
              if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
            }}
          >
            <div className={`carousel-slide${cur === 0 ? " active" : ""}`}>
              <div className="slide-bg" style={{ backgroundColor: "#2a1a0a", backgroundImage: "url('/lifestyle-ritual.jpg')", backgroundPosition: "center right" }} />
              <div className="slide-grad" />
              <div className="slide-content">
                <p className="slide-brand-label">Lotus House Blends</p>
                <h3 className="slide-title">Elegance<br /><em>&amp;</em><br />Serenity</h3>
                <div className="slide-btns">
                  <a href="/shop/lotus" className="slide-cta">Discover Lotus →</a>
                  <a href="/shop" className="slide-cta-secondary">View All Brands</a>
                </div>
              </div>
            </div>

            <div className={`carousel-slide${cur === 1 ? " active" : ""}`}>
              <div className="slide-bg" style={{ backgroundColor: "#161616", backgroundImage: "url('/lifestyle-model.jpg')" }} />
              <div className="slide-grad" />
              <div className="slide-content">
                <p className="slide-brand-label">Lotus House Blends</p>
                <h3 className="slide-title">Pure<br /><em>&amp;</em><br />Peaceful</h3>
                <div className="slide-btns">
                  <a href="/shop/lotus" className="slide-cta">Shop the Collection →</a>
                </div>
              </div>
            </div>

            <div className={`carousel-slide${cur === 2 ? " active" : ""}`}>
              <div className="slide-bg" style={{ backgroundColor: "#1c2420", backgroundImage: "url('/lifestyle-tea.jpg')" }} />
              <div className="slide-grad" />
              <div className="slide-content">
                <p className="slide-brand-label">Lotus House Blends</p>
                <h3 className="slide-title">Breathe<br /><em>&amp;</em><br />Unwind</h3>
                <div className="slide-btns">
                  <a href="/shop/lotus" className="slide-cta">Learn More →</a>
                </div>
              </div>
            </div>

            <div className={`carousel-slide${cur === 3 ? " active" : ""}`}>
              <div className="slide-bg slide-join-bg" />
              <div className="slide-content" style={{ maxWidth: "600px" }}>
                <p className="slide-brand-label">Partner With OutsYde</p>
                <h3 className="slide-title" style={{ color: "var(--gold)" }}>Your Brand<br /><em>Belongs</em><br />Here</h3>
                <div className="slide-btns">
                  <a href="/coming-soon" className="slide-cta">Inquire About Listing →</a>
                  <a href="/coming-soon" className="slide-cta-secondary">See How It Works</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="carousel-nav" aria-label="Carousel navigation">
          <button className="c-btn" onClick={() => go(cur - 1)} aria-label="Previous slide">←</button>
          <div className="c-dots">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                className={`c-dot${cur === i ? " active" : ""}`}
                onClick={() => go(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <button className="c-btn" onClick={() => go(cur + 1)} aria-label="Next slide">→</button>
        </nav>
      </section>

      {/* ══ PHOTOGRAPHERS ══ */}
      <section id="photographers" aria-label="Neighborhood Photographers">
        <div className="photo-hd">
          <div className="photo-hd-left">
            <h2>Neighborhood<br />Photographers</h2>
            <p>Emerging visionaries shaping the lens of New York. Bold, authentic, deeply connected to the pulse of the city.</p>
          </div>
          <div className="photo-hd-right">
            <a href="/coming-soon" className="btn-book-now">Book a Session →</a>
            <a href="/coming-soon" className="btn-join-collective">Join Our Collective →</a>
          </div>
        </div>

        <div className="photo-grid">
          <div className="photo-card">
            <div className="photo-card-bg" style={{ backgroundImage: "url('/photographer-gio.jpg')", backgroundPosition: "center top" }} />
            <div className="photo-card-veil" />
            <a href="/coming-soon" className="photo-card-book">Book Gio</a>
            <div className="photo-card-info">
              <p className="photo-card-name">Gio</p>
              <p className="photo-card-role">Event Photographer</p>
            </div>
          </div>

          <div className="photo-card">
            <div className="photo-card-bg" style={{ backgroundImage: "url('/photographer-tre4k.jpg')", backgroundPosition: "center top" }} />
            <div className="photo-card-veil" />
            <a href="/coming-soon" className="photo-card-book">Book Tre4k</a>
            <div className="photo-card-info">
              <p className="photo-card-name">Tre4k</p>
              <p className="photo-card-role">Focus Finder</p>
            </div>
          </div>

          <div className="photo-card">
            <div className="photo-card-bg" style={{ backgroundImage: "url('/photographer-gicasso.jpg')", backgroundPosition: "center top" }} />
            <div className="photo-card-veil" />
            <a href="/coming-soon" className="photo-card-book">Book Gicasso</a>
            <div className="photo-card-info">
              <p className="photo-card-name">Gicasso</p>
              <p className="photo-card-role">Attention Grabber</p>
            </div>
          </div>
        </div>

        <div className="photo-cta-row">
          <p><strong>Are you a photographer?</strong> Join OutsYde&apos;s collective and start receiving bookings directly through the platform. No upfront cost to list.</p>
          <a href="/coming-soon" className="btn-join-collective">Get Listed — It&apos;s Free →</a>
        </div>
      </section>

      {/* ══ BUSINESS JOIN BAND ══ */}
      <div id="business-band" aria-label="Partner with OutsYde">
        <div className="biz-band-text">
          <h2>Ready to Put Your Brand<br />on <em>OutsYde</em>?</h2>
          <p>Whether you&apos;re a local business looking to reach new customers or a creator wanting your products in front of the right audience — OutsYde is your platform.</p>
        </div>
        <div className="biz-band-ctas">
          <a href="/coming-soon" className="btn-biz-cta btn-biz-gold">Inquire About Listing →</a>
          <a href="/coming-soon" className="btn-biz-cta btn-biz-ghost">See How It Works</a>
        </div>
      </div>

      {/* ══ FOOTER ══ */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand-col">
            <div className="ft-logo">
              <div className="ft-y" aria-hidden="true">Y</div>
              <span className="ft-name">Go OutsYde</span>
            </div>
            <p>Culture meets commerce. Linking local businesses with artists and consumers — one place to shop, book, and experience it all.</p>
            <div className="ft-social" aria-label="Social media links">
              <a href="https://instagram.com/go.outsyde" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://tiktok.com/@go.outsyde" target="_blank" rel="noopener noreferrer">TikTok</a>
              <a href="https://x.com/go.outsyde" target="_blank" rel="noopener noreferrer">Twitter</a>
            </div>
          </div>

          <div className="footer-col">
            <h4>For Businesses</h4>
            <ul>
              <li><a href="/coming-soon">Join the Marketplace</a></li>
              <li><a href="/coming-soon">List Your Services</a></li>
              <li><a href="/coming-soon">Manage Bookings</a></li>
              <li><a href="/coming-soon">Partner With Us</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>For Shoppers</h4>
            <ul>
              <li><a href="/shop">Browse the Collection</a></li>
              <li><a href="/coming-soon">Book a Photographer</a></li>
              <li><a href="/coming-soon">Discover Local Brands</a></li>
              <li><a href="/coming-soon">My Account</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>For Photographers</h4>
            <ul>
              <li><a href="/coming-soon">Join Our Collective</a></li>
              <li><a href="/coming-soon">Start Taking Bookings</a></li>
              <li><a href="/coming-soon">Meet the Team</a></li>
              <li><a href="/coming-soon">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Go OutsYde. All rights reserved.</span>
          <span>Like a Lavished Local</span>
        </div>
      </footer>
    </>
  );
}