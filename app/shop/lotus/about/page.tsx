// app/shop/lotus/about/page.tsx
// Lotus House Blends — Our Story / About
//
// WHERE THIS GOES:
//   Create folder:  outsyde-web/app/shop/lotus/about/
//   Put this file inside as:  page.tsx
//   Loads at:  localhost:3000/shop/lotus/about
//
// COMPLIANCE: copy adapted for platform — "pre-rolls"/"smoke session" -> "herbal cones"/
// "aromatherapy & incense". Soul of your original story kept intact.
//
// IMAGE: reuses /lifestyle-model.jpg already in /public (swap if you want a different shot)

export default function LotusAbout() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root{
  --outsyde-black:#000000; --outsyde-gold:#E8B930;
  --lhb-parchment:#F2EBD9; --lhb-cream:#EDE3CC; --lhb-lavender:#7B6BAF; --lhb-lavender-light:#C5BDDF;
  --lhb-sage:#4A6741; --lhb-brown-dark:#2A1E0E; --lhb-brown-light:#C8A882; --lhb-moss:#1E3020;
  --lhb-text-dark:#1A1208; --lhb-text-mid:#4A3820; --lhb-text-muted:#7A6A50;
}
html{scroll-behavior:smooth;}
.lhb-about{font-family:'Jost',sans-serif;background:var(--lhb-parchment);color:var(--lhb-text-dark);}

.outsyde-nav{background:var(--outsyde-black);padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.nav-logo{display:flex;align-items:center;gap:.75rem;text-decoration:none;}
.nav-y{font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:600;color:var(--outsyde-gold);line-height:1;}
.nav-wordmark{font-size:.65rem;letter-spacing:.28em;color:#888;font-weight:300;}
.nav-back{color:#888;font-size:.72rem;letter-spacing:.12em;text-decoration:none;font-weight:300;transition:color .2s;}
.nav-back:hover{color:var(--outsyde-gold);}

.about-hero{background:var(--lhb-moss);color:var(--lhb-parchment);padding:5.5rem 2rem 5rem;text-align:center;}
.about-hero .eyebrow{font-size:.62rem;letter-spacing:.32em;text-transform:uppercase;color:var(--lhb-brown-light);margin-bottom:1.25rem;}
.about-hero h1{font-family:'Cormorant Garamond',serif;font-size:clamp(3rem,6vw,5rem);font-weight:300;line-height:1.02;}
.about-hero h1 em{font-style:italic;color:var(--lhb-lavender-light);}
.about-hero .rule{width:50px;height:1px;background:var(--lhb-brown-light);margin:1.75rem auto;}
.about-hero .tagline{font-size:.9rem;color:rgba(242,235,217,.7);font-weight:300;letter-spacing:.06em;}

.story-split{display:grid;grid-template-columns:1fr 1fr;min-height:560px;}
.story-img{position:relative;overflow:hidden;background:var(--lhb-sage);}
.story-img img{width:100%;height:100%;object-fit:cover;object-position:center 20%;display:block;}
.story-text{padding:5rem 4.5rem;display:flex;flex-direction:column;justify-content:center;}
.story-text .label{font-size:.62rem;letter-spacing:.3em;text-transform:uppercase;color:var(--lhb-sage);margin-bottom:1.25rem;}
.story-text h2{font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,3vw,2.8rem);font-weight:400;color:var(--lhb-brown-dark);line-height:1.15;margin-bottom:1.5rem;}
.story-text h2 em{font-style:italic;color:var(--lhb-sage);}
.story-text p{font-size:.94rem;line-height:1.95;color:var(--lhb-text-mid);font-weight:300;margin-bottom:1.1rem;max-width:460px;}

.pullquote{background:var(--lhb-cream);padding:4.5rem 2rem;text-align:center;}
.pullquote p{font-family:'Cormorant Garamond',serif;font-size:clamp(1.6rem,3vw,2.4rem);font-style:italic;font-weight:300;color:var(--lhb-brown-dark);max-width:720px;margin:0 auto;line-height:1.4;}
.pullquote .mark{color:var(--lhb-lavender);}

.values{padding:5rem 2rem;max-width:1000px;margin:0 auto;}
.values-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2.5rem;}
.value{text-align:center;padding:0 1rem;}
.value .num{font-family:'Cormorant Garamond',serif;font-size:2.6rem;font-weight:300;color:var(--lhb-lavender);line-height:1;margin-bottom:.75rem;display:block;}
.value h3{font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:500;color:var(--lhb-brown-dark);margin-bottom:.6rem;}
.value p{font-size:.85rem;line-height:1.8;color:var(--lhb-text-muted);font-weight:300;}

.about-cta{background:var(--lhb-moss);color:var(--lhb-parchment);text-align:center;padding:5rem 2rem;}
.about-cta h2{font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,4vw,3rem);font-weight:300;margin-bottom:1.5rem;}
.about-cta .btns{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;}
.btn-lav{background:var(--lhb-lavender);color:#fff;padding:.9rem 2rem;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;transition:background .2s;}
.btn-lav:hover{background:#6558A0;}
.btn-ghost{background:transparent;color:var(--lhb-parchment);border:1px solid rgba(245,240,230,.4);padding:.9rem 2rem;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;transition:border-color .2s,color .2s;}
.btn-ghost:hover{border-color:var(--lhb-brown-light);color:var(--lhb-brown-light);}

.about-footer{background:var(--lhb-brown-dark);color:rgba(200,168,130,.5);padding:2rem 2.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;font-size:.7rem;}
.about-footer a{color:var(--lhb-brown-light);text-decoration:underline;text-underline-offset:3px;}
.about-footer a:hover{color:var(--lhb-parchment);}

@media(max-width:820px){
  .story-split{grid-template-columns:1fr;} .story-img{min-height:340px;} .story-text{padding:3rem 1.75rem;}
  .values-grid{grid-template-columns:1fr;gap:2rem;} .outsyde-nav{padding:0 1.25rem;}
}
`,
        }}
      />

      <div className="lhb-about">
        <nav className="outsyde-nav">
          <a href="/" className="nav-logo">
            <span className="nav-y">Y</span>
            <span className="nav-wordmark">OUTSYDE</span>
          </a>
          <a href="/shop/lotus" className="nav-back">← Back to Lotus House Blends</a>
        </nav>

        <header className="about-hero">
          <div className="eyebrow">Our Story</div>
          <h1>Pause. Breathe.<br /><em>Savor the moment.</em></h1>
          <div className="rule" />
          <div className="tagline">Lotus House Blends · Herbal · Botanical · Intentional</div>
        </header>

        <section className="story-split">
          <div className="story-img">
            <img src="/lifestyle-model.jpg" alt="Lotus House Blends ritual" />
          </div>
          <div className="story-text">
            <div className="label">The Brand</div>
            <h2>Nature&rsquo;s finest botanicals, brought into your <em>daily rituals</em></h2>
            <p>Lotus House Blends is a lifestyle and wellness brand dedicated to bringing nature&rsquo;s finest botanicals into your daily rituals. We handcraft small-batch teas, loose herbs, and herbal cones designed to soothe, energize, and inspire.</p>
            <p>Our herbal cones are crafted for relaxation and ambiance — made with pure, natural ingredients to be enjoyed as aromatherapy and incense. Each blend is thoughtfully curated to highlight the aromas, character, and benefits of the plants we source, ensuring a clean, mindful experience every time.</p>
          </div>
        </section>

        <section className="pullquote">
          <p>
            Whether you&rsquo;re sipping a calming tea, burning a fragrant cone to set the mood, or slowing down with a botanical ritual, Lotus House Blends invites you to <span className="mark">pause, breathe, and savor the moment.</span>
          </p>
        </section>

        <section className="values">
          <div className="values-grid">
            <div className="value">
              <span className="num">01</span>
              <h3>Natural</h3>
              <p>Pure herbs and botanicals only — sourced with care, never synthetic.</p>
            </div>
            <div className="value">
              <span className="num">02</span>
              <h3>Handcrafted</h3>
              <p>Small-batch blends, thoughtfully curated to honor each plant we source.</p>
            </div>
            <div className="value">
              <span className="num">03</span>
              <h3>Intentional</h3>
              <p>Rituals for every part of your day — morning clarity to evening calm.</p>
            </div>
          </div>
        </section>

        <section className="about-cta">
          <h2>Find your ritual</h2>
          <div className="btns">
            <a href="/shop/lotus#shop" className="btn-lav">Shop the Blends</a>
            <a href="/shop/lotus/wholesale" className="btn-ghost">Wholesale Inquiry</a>
          </div>
        </section>

        <footer className="about-footer">
          <span>© 2026 Lotus House Blends · Sold via Go Outsyde Platform</span>
          <span><a href="/shop/lotus">Back to Lotus House Blends</a></span>
        </footer>
      </div>
    </>
  );
}