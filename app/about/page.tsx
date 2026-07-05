// app/about/page.tsx
// Go OutsYde — About page (matches home page design system)
// Paste this whole file into: outsyde-web/app/about/page.tsx
//
// Uses the same fonts/colors/nav/footer pattern as app/page.tsx so it feels
// like one continuous site. Swap image URLs for real photography when ready.

"use client";

import { useEffect, useState } from "react";

export default function About() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 55);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
  --serif:'Bebas Neue',Impact,sans-serif; --sans:'Hanken Grotesk',system-ui,sans-serif;
  --serif-editorial:'Cormorant Garamond',Georgia,serif;
}
html{scroll-behavior:smooth;}
body{font-family:var(--sans);background:var(--black);color:var(--cream);overflow-x:hidden;}

/* ── NAV (shared with home) ── */
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

/* ── ABOUT HERO ── */
#about-hero{position:relative;padding:200px 52px 100px;text-align:center;overflow:hidden;background:var(--off-black);}
#about-hero::before{content:'';position:absolute;inset:-25%;background:radial-gradient(ellipse 60% 55% at 25% 30%,rgba(26,60,52,.85) 0%,transparent 55%),radial-gradient(ellipse 50% 45% at 80% 70%,rgba(232,185,48,.08) 0%,transparent 50%),#04100d;z-index:0;}
.about-hero-inner{position:relative;z-index:2;max-width:820px;margin:0 auto;}
.about-eyebrow{font-size:10.5px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);margin-bottom:22px;}
.about-hero-inner h1{font-family:var(--serif);font-size:clamp(52px,8vw,96px);font-weight:400;line-height:.92;letter-spacing:.03em;text-transform:uppercase;color:var(--cream);margin-bottom:26px;}
.about-hero-inner h1 .gold{color:var(--gold);}
.about-hero-inner p{font-size:clamp(14px,1.6vw,17px);font-weight:300;color:rgba(245,240,230,.72);line-height:1.75;max-width:640px;margin:0 auto;}

/* ── AUDIENCE SPLIT (matches tri-panel pattern) ── */
#audience-split{display:grid;grid-template-columns:repeat(2,1fr);}
.aud-panel{position:relative;overflow:hidden;padding:64px 52px;min-height:480px;display:flex;flex-direction:column;justify-content:center;}
.aud-panel.emerald-bg{background:linear-gradient(150deg,var(--emerald) 0%,var(--off-black) 100%);}
.aud-panel.dark-bg{background:#0a0a0a;border-left:0.5px solid rgba(232,185,48,.12);}
.aud-tag{display:inline-block;padding:5px 13px;border-radius:2px;margin-bottom:20px;font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;font-weight:600;background:var(--gold-soft);color:var(--gold);border:0.5px solid rgba(232,185,48,.3);width:fit-content;}
.aud-panel h2{font-family:var(--serif);font-size:clamp(32px,4vw,46px);font-weight:400;letter-spacing:.02em;text-transform:uppercase;color:var(--cream);line-height:1.02;margin-bottom:20px;}
.aud-panel p{font-size:14px;font-weight:300;line-height:1.8;color:rgba(245,240,230,.62);max-width:420px;}
.aud-panel ul{list-style:none;margin-top:26px;display:flex;flex-direction:column;gap:12px;}
.aud-panel li{font-size:13px;color:rgba(245,240,230,.68);padding-left:20px;position:relative;line-height:1.6;}
.aud-panel li::before{content:'—';position:absolute;left:0;color:var(--gold);}

/* ── MARQUEE ── */
#about-marquee{border-top:0.5px solid rgba(232,185,48,.18);border-bottom:0.5px solid rgba(232,185,48,.18);background:var(--black);padding:20px 0;overflow:hidden;}
.marquee-track{display:flex;width:max-content;animation:marqueeRoll 26s linear infinite;}
.marquee-item{font-family:var(--serif);font-size:24px;font-weight:300;letter-spacing:.1em;text-transform:uppercase;color:var(--cream);white-space:nowrap;padding:0 26px;}
.marquee-sep{color:var(--gold);}
@keyframes marqueeRoll{from{transform:translateX(0);}to{transform:translateX(-50%);}}

/* ── MISSION BAND ── */
#mission-band{background:var(--emerald);padding:100px 52px;text-align:center;}
.mission-inner{max-width:760px;margin:0 auto;}
.mission-inner .about-eyebrow{color:var(--gold);}
.mission-inner h2{font-family:var(--serif-editorial);font-style:italic;font-weight:400;font-size:clamp(30px,4vw,44px);color:var(--cream);line-height:1.4;margin:18px 0 0;}
.mission-inner h2 .gold{color:var(--gold);font-style:normal;}

/* ── WHY SECTION ── */
#why{background:var(--black);padding:100px 52px;}
.why-head{text-align:center;margin-bottom:60px;}
.why-head h2{font-family:var(--serif);font-size:clamp(36px,5vw,58px);font-weight:300;letter-spacing:.03em;color:var(--cream);}
.why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;max-width:1200px;margin:0 auto;background:rgba(232,185,48,.12);}
.why-card{background:#060a09;padding:44px 38px;transition:background .3s;}
.why-card:hover{background:#0a1512;}
.why-num{font-family:var(--serif);font-size:15px;color:var(--gold);letter-spacing:.1em;margin-bottom:18px;display:block;}
.why-card h3{font-family:var(--serif);font-size:24px;font-weight:400;letter-spacing:.02em;text-transform:uppercase;color:var(--cream);margin-bottom:12px;line-height:1.1;}
.why-card p{font-size:13px;font-weight:300;line-height:1.75;color:rgba(245,240,230,.55);}

/* ── CTA BAND (matches business-band) ── */
#about-cta{background:var(--emerald);padding:88px 52px;display:flex;align-items:center;justify-content:space-between;gap:44px;flex-wrap:wrap;}
.about-cta-text h2{font-family:var(--serif);font-size:clamp(34px,4.5vw,56px);font-weight:400;color:var(--cream);line-height:1.0;letter-spacing:.02em;text-transform:uppercase;margin-bottom:12px;}
.about-cta-text h2 em{font-style:normal;color:var(--gold);}
.about-cta-text p{font-size:14px;color:rgba(245,240,230,.6);max-width:440px;line-height:1.7;}
.about-cta-ctas{display:flex;gap:14px;flex-wrap:wrap;}
.btn-about-cta{padding:16px 32px;border-radius:3px;font-size:11.5px;letter-spacing:.13em;text-transform:uppercase;font-weight:600;text-decoration:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:9px;transition:all .22s;}
.btn-about-cta:hover{transform:translateY(-2px);}
.btn-about-gold{background:var(--gold);color:var(--black);}
.btn-about-gold:hover{background:#f2c835;}
.btn-about-ghost{background:transparent;color:var(--cream);border:1px solid rgba(245,240,230,.35);}
.btn-about-ghost:hover{border-color:var(--gold);color:var(--gold);}

/* ── FOOTER (shared with home) ── */
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
  #about-hero{padding:150px 24px 72px;}
  #audience-split{grid-template-columns:1fr;} .aud-panel{padding:48px 28px;min-height:auto;} .aud-panel.dark-bg{border-left:none;border-top:0.5px solid rgba(232,185,48,.12);}
  #mission-band{padding:64px 24px;}
  #why{padding:64px 24px;} .why-grid{grid-template-columns:1fr;}
  #about-cta{padding:64px 24px;flex-direction:column;}
  footer{padding:52px 24px 28px;} .footer-grid{grid-template-columns:1fr 1fr;gap:36px;} .footer-brand-col{grid-column:1 / -1;}
}
@media (max-width:620px){
  .about-cta-ctas{flex-direction:column;width:100%;} .about-cta-ctas a{justify-content:center;}
  .footer-grid{grid-template-columns:1fr;}
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
          <a href="/#photographers">Photographers</a>
          <a href="/#business-band">For Businesses</a>
        </div>
        <div className="nav-actions">
          <a href="/coming-soon">Log In</a>
          <a href="/shop" className="nav-cta">Shop Now</a>
        </div>
      </nav>

      {/* ══ ABOUT HERO ══ */}
      <section id="about-hero" aria-label="About Go OutsYde">
        <div className="about-hero-inner">
          <p className="about-eyebrow">Our Story</p>
          <h1>
            Culture Meets <span className="gold">Commerce</span>
          </h1>
          <p>
            At OutsYde, we believe in the power of authentic storytelling and the strength of
            community. We&apos;re more than a platform — we&apos;re a marketplace and creative
            hub built to spotlight the local gems overshadowed by big corporations and
            oversaturated tourist spots, while giving photographers, creators, and small
            businesses the tools to thrive.
          </p>
        </div>
      </section>

      {/* ══ AUDIENCE SPLIT ══ */}
      <div id="audience-split" aria-label="Who OutsYde is for">
        <div className="aud-panel emerald-bg">
          <span className="aud-tag">For Locals &amp; Travelers</span>
          <h2>Like a Lavished Local</h2>
          <p>
            Every neighborhood has an identity shaped by the people who live there — not by
            the chains lining the main strip. OutsYde helps you skip the tourist traps and
            find what locals actually love, so you learn a community instead of just passing
            through it.
          </p>
          <ul>
            <li>Discover local brands, vendors, and creators near you</li>
            <li>Book a neighborhood photographer for your next shoot</li>
            <li>Shop a curated collection you won&apos;t find anywhere else</li>
          </ul>
        </div>
        <div className="aud-panel dark-bg">
          <span className="aud-tag">For Businesses &amp; Creators</span>
          <h2>Get Discovered, Get Booked</h2>
          <p>
            Being great shouldn&apos;t mean staying invisible. OutsYde puts local businesses,
            photographers, and independent vendors in front of an audience that&apos;s
            specifically looking for the real thing — not just whoever has the biggest sign.
          </p>
          <ul>
            <li>List your business or products with no upfront cost</li>
            <li>Join our photographer collective and start receiving bookings</li>
            <li>Reach customers who value authenticity over popularity</li>
          </ul>
        </div>
      </div>

      {/* ══ MARQUEE ══ */}
      <div id="about-marquee" aria-hidden="true">
        <div className="marquee-track">
          <span className="marquee-item">Culture Meets Commerce <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Like a Lavished Local <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Shop Local <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Discover Your Community <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Go OutsYde <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Culture Meets Commerce <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Like a Lavished Local <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Shop Local <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Discover Your Community <span className="marquee-sep">•</span></span>
          <span className="marquee-item">Go OutsYde <span className="marquee-sep">•</span></span>
        </div>
      </div>

      {/* ══ MISSION ══ */}
      <section id="mission-band" aria-label="Our mission">
        <div className="mission-inner">
          <p className="about-eyebrow">Our Mission</p>
          <h2>
            To help people find the businesses that make a community
            <span className="gold"> special</span> — and help those businesses get the
            spotlight, tools, and support they deserve.
          </h2>
        </div>
      </section>

      {/* ══ WHY ══ */}
      <section id="why" aria-label="Why choose OutsYde">
        <div className="why-head">
          <h2>Why OutsYde</h2>
        </div>
        <div className="why-grid">
          <div className="why-card">
            <span className="why-num">01</span>
            <h3>Real Local Discovery</h3>
            <p>Find the businesses locals love, not just what has the biggest tourist crowd.</p>
          </div>
          <div className="why-card">
            <span className="why-num">02</span>
            <h3>One-Stop Creative Hub</h3>
            <p>Book photographers, influencers, and marketing experts all in one place.</p>
          </div>
          <div className="why-card">
            <span className="why-num">03</span>
            <h3>Curated Marketplace</h3>
            <p>Discover unique products from independent vendors you won&apos;t find anywhere else.</p>
          </div>
          <div className="why-card">
            <span className="why-num">04</span>
            <h3>Built for Small Business</h3>
            <p>Tailored plans designed to fit real budgets and real growth goals.</p>
          </div>
          <div className="why-card">
            <span className="why-num">05</span>
            <h3>A Spotlight for the Overshadowed</h3>
            <p>We elevate the local gems that get lost next to big corporations.</p>
          </div>
          <div className="why-card">
            <span className="why-num">06</span>
            <h3>Community Focus</h3>
            <p>Collaboration, growth, and authentic connections — that&apos;s the whole point.</p>
          </div>
        </div>
      </section>

      {/* ══ CTA BAND ══ */}
      <div id="about-cta" aria-label="Join OutsYde">
        <div className="about-cta-text">
          <h2>Come Experience It <em>OutsYde</em></h2>
          <p>
            Whether you&apos;re a startup looking for creative services, a vendor ready to
            showcase your products, or a traveler looking to learn a community instead of
            just passing through — OutsYde is here to help you succeed.
          </p>
        </div>
        <div className="about-cta-ctas">
          <a href="/shop" className="btn-about-cta btn-about-gold">Shop Now →</a>
          <a href="/coming-soon" className="btn-about-cta btn-about-ghost">Partner With Us</a>
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
              <li><a href="/business-signup">Join the Marketplace</a></li>
              <li><a href="/business-signup">List Your Services</a></li>
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