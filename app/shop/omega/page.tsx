// app/shop/omega/page.tsx
// Placeholder storefront for Omega Lifestyle - swap this out once the real store is built.

"use client";

export default function OmegaComingSoon() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');

.og-root *, .og-root *::before, .og-root *::after { box-sizing:border-box; margin:0; padding:0; }
.og-root{
  --mk-black:#000000; --mk-gold:#E8B930; --mk-cream:#F5F0E6; --mk-muted:rgba(245,240,230,.6);
  font-family:'Hanken Grotesk',system-ui,sans-serif; background:var(--mk-black); color:var(--mk-cream);
  min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center; padding:24px;
}
.og-logo{width:140px;height:140px;object-fit:contain;margin-bottom:28px;}
.og-eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--mk-gold);margin-bottom:16px;}
.og-root h1{font-family:'Bebas Neue',Impact,sans-serif;font-size:clamp(40px,7vw,72px);letter-spacing:.04em;text-transform:uppercase;margin-bottom:16px;}
.og-root p{font-size:14px;font-weight:300;color:var(--mk-muted);max-width:480px;line-height:1.7;margin-bottom:32px;}
.og-back{display:inline-block;border:1px solid rgba(245,240,230,.4);color:var(--mk-cream);padding:12px 26px;border-radius:3px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;transition:border-color .2s,color .2s;}
.og-back:hover{border-color:var(--mk-gold);color:var(--mk-gold);}
`,
        }}
      />
      <div className="og-root">
        <img className="og-logo" src="/omega-card.jpg" alt="Omega Lifestyle" />
        <p className="og-eyebrow">Coming Soon</p>
        <h1>Omega Lifestyle</h1>
        <p>
          Our storefront is in the works. Strength training gear and apparel for
          the everyday lifter - landing on OutsYde soon.
        </p>
        <a href="/shop" className="og-back">&larr; Back to Marketplace</a>
      </div>
    </>
  );
}