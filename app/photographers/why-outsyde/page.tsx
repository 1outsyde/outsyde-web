import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For Photographers",
  description:
    "Join OutsYde’s collective of neighborhood photographers. Get discovered by local clients, get booked on your terms, and keep more of every booking.",
  alternates: { canonical: "/photographers/why-outsyde" },
  openGraph: {
    title: "Your Lens. Your Business. | Outsyde",
    description:
      "Join OutsYde’s collective of neighborhood photographers. Get discovered, get booked, and keep more of every booking.",
    url: "https://www.goutsyde.com/photographers/why-outsyde",
  },
};

const JOIN_HREF = "https://www.goutsyde.com/photographer-signup";

export default function WhyOutsydePhotographersPage() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Hanken+Grotesk:wght@300;400;500;600;700;800&display=swap');

.wo-page{
  --black:#000000; --gold:#E8B930; --gold-soft:rgba(232,185,48,0.13);
  --cream:#F5F0E6; --emerald:#1A3C34; --off-black:#0a1e1a;
  --serif:'Bebas Neue',Impact,sans-serif; --sans:'Hanken Grotesk',system-ui,sans-serif;
  font-family:var(--sans); background:var(--black); color:var(--cream);
  overflow-x:hidden;
}
.wo-page *{ box-sizing:border-box; }
.wo-page a{ color:inherit; }

.wo-wrap{ width:min(1180px, calc(100% - 48px)); margin:0 auto; }

.wo-hero-band{ padding:36px 0 28px; }
.wo-hero{
  display:grid; grid-template-columns:1.05fr .95fr; gap:0;
  min-height:520px; border-radius:18px; overflow:hidden;
  background:#06110e; border:0.5px solid rgba(232,185,48,.16);
}
.wo-hero-copy{ display:flex; flex-direction:column; justify-content:center; padding:64px 56px; }
.wo-eyebrow{
  font-size:10.5px; letter-spacing:.28em; text-transform:uppercase; font-weight:600;
  color:var(--gold); margin-bottom:18px;
}
.wo-hero-copy h1{
  font-family:var(--serif); font-size:clamp(44px,6vw,76px); font-weight:400;
  line-height:.92; letter-spacing:.03em; text-transform:uppercase; color:var(--cream);
  margin:0 0 22px;
}
.wo-hero-copy p{
  font-size:15.5px; font-weight:300; line-height:1.75; color:rgba(245,240,230,.68);
  max-width:460px; margin:0 0 32px;
}
.wo-hero-visual{ position:relative; min-height:420px; }
.wo-hero-visual .wo-bg{
  position:absolute; inset:0;
  background-image:url('/panel-03-photographer.jpg');
  background-size:cover; background-position:center;
}
.wo-hero-visual .wo-veil{
  position:absolute; inset:0;
  background:linear-gradient(90deg, rgba(6,17,14,.55) 0%, rgba(0,0,0,.15) 40%, transparent 100%);
}

.wo-btn{
  display:inline-flex; align-items:center; gap:9px;
  padding:15px 26px; border-radius:3px; text-decoration:none;
  font-size:11.5px; letter-spacing:.13em; text-transform:uppercase; font-weight:700;
  transition:background .22s, transform .22s, border-color .22s, color .22s;
  width:fit-content;
}
.wo-btn:hover{ transform:translateY(-2px); }
.wo-btn-gold{ background:var(--gold); color:#000; }
.wo-btn-gold:hover{ background:#f2c835; }

.wo-stats{
  display:grid; grid-template-columns:repeat(3,1fr); gap:14px;
  padding:8px 0 40px;
}
.wo-stat{
  background:#0a1512; border:0.5px solid rgba(232,185,48,.12); border-radius:12px;
  padding:32px 24px; text-align:center;
}
.wo-stat strong{
  display:block; font-family:var(--serif); font-size:clamp(40px,5vw,56px);
  font-weight:400; color:var(--gold); letter-spacing:.02em; line-height:1; margin-bottom:10px;
}
.wo-stat span{
  display:block; font-size:10.5px; letter-spacing:.2em; text-transform:uppercase;
  color:rgba(245,240,230,.62); font-weight:600;
}

.wo-benefits{ padding:12px 0 56px; }
.wo-benefit-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.wo-card{
  background:#0a1512; border:0.5px solid rgba(232,185,48,.14); border-radius:14px;
  padding:36px 30px 40px; min-height:280px;
}
.wo-icon{
  width:36px; height:36px; margin-bottom:22px; color:var(--gold);
}
.wo-card h2{
  font-family:var(--serif); font-size:28px; font-weight:400; letter-spacing:.04em;
  text-transform:uppercase; color:var(--cream); margin:0 0 14px;
}
.wo-card p{
  font-size:14px; font-weight:300; line-height:1.75; color:rgba(245,240,230,.62); margin:0;
}

.wo-fee{
  display:flex; align-items:center; justify-content:space-between; gap:20px;
  padding:28px 36px; margin:0 0 64px;
  border:0.5px solid rgba(232,185,48,.35); border-radius:12px; background:#080f0d;
}
.wo-fee p{
  font-size:16px; font-weight:400; color:var(--cream); margin:0; line-height:1.5;
}
.wo-pill{
  flex-shrink:0; padding:8px 16px; border-radius:999px;
  background:var(--gold); color:#000;
  font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase;
}

.wo-cta{
  text-align:center; padding:72px 40px; margin:0 0 72px;
  border:0.5px solid rgba(232,185,48,.28); border-radius:16px; background:#06110e;
}
.wo-cta h2{
  font-family:var(--serif); font-size:clamp(40px,5.5vw,64px); font-weight:400;
  letter-spacing:.03em; text-transform:uppercase; color:var(--cream); margin:0 0 14px;
}
.wo-cta p{
  font-size:16px; font-weight:300; color:rgba(245,240,230,.62); margin:0 0 28px;
}
.wo-cta .wo-btn{ margin:0 auto; }

footer.wo-footer{ background:#000; border-top:0.5px solid rgba(232,185,48,.14); padding:72px 52px 36px; }
.wo-footer .footer-grid{ display:grid; grid-template-columns:2.2fr 1fr 1fr 1fr; gap:52px; margin-bottom:56px; }
.wo-footer .ft-logo{ display:flex; align-items:center; gap:10px; margin-bottom:18px; }
.wo-footer .ft-y{ width:34px; height:34px; background:var(--gold); border-radius:7px; display:flex; align-items:center; justify-content:center; font-family:var(--serif); font-size:19px; color:#000; font-weight:600; }
.wo-footer .ft-name{ font-family:var(--serif); font-size:17px; letter-spacing:.12em; color:var(--cream); text-transform:uppercase; }
.wo-footer .footer-brand-col p{ font-size:13px; color:rgba(245,240,230,.38); line-height:1.75; max-width:230px; margin:0; }
.wo-footer .ft-social{ display:flex; gap:14px; margin-top:22px; }
.wo-footer .ft-social a{ font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:rgba(245,240,230,.38); text-decoration:none; }
.wo-footer .ft-social a:hover{ color:var(--gold); }
.wo-footer .footer-col h4{ font-size:9.5px; letter-spacing:.22em; text-transform:uppercase; color:var(--gold); margin:0 0 22px; font-weight:600; }
.wo-footer .footer-col ul{ list-style:none; display:flex; flex-direction:column; gap:11px; margin:0; padding:0; }
.wo-footer .footer-col a{ font-size:13px; color:rgba(245,240,230,.42); text-decoration:none; }
.wo-footer .footer-col a:hover{ color:var(--cream); }
.wo-footer .footer-bottom{ border-top:0.5px solid rgba(245,240,230,.07); padding-top:26px; display:flex; align-items:center; justify-content:space-between; font-size:11.5px; color:rgba(245,240,230,.25); }
.wo-footer .footer-bottom a{ color:inherit; text-decoration:none; }
.wo-footer .footer-bottom a:hover{ color:var(--gold); }

@media (max-width:960px){
  .wo-wrap{ width:calc(100% - 32px); }
  .wo-hero{ grid-template-columns:1fr; min-height:0; }
  .wo-hero-copy{ padding:44px 28px 36px; }
  .wo-hero-visual{ min-height:320px; }
  .wo-stats, .wo-benefit-grid{ grid-template-columns:1fr; }
  .wo-fee{ flex-direction:column; align-items:flex-start; padding:24px 22px; }
  footer.wo-footer{ padding:52px 24px 28px; }
  .wo-footer .footer-grid{ grid-template-columns:1fr 1fr; gap:36px; }
  .wo-footer .footer-brand-col{ grid-column:1 / -1; }
}
@media (max-width:620px){
  .wo-cta{ padding:48px 22px; }
  .wo-footer .footer-grid{ grid-template-columns:1fr; }
  .wo-footer .footer-bottom{ flex-direction:column; gap:10px; align-items:flex-start; }
}
          `,
        }}
      />

      <div className="wo-page">
        <section className="wo-hero-band" aria-label="For Photographers">
          <div className="wo-wrap">
            <div className="wo-hero">
              <div className="wo-hero-copy">
                <p className="wo-eyebrow">For Photographers</p>
                <h1>Your Lens. Your Business.</h1>
                <p>
                  Join OutsYde&apos;s collective of neighborhood photographers. Get discovered
                  by local clients, get booked on your terms.
                </p>
                <a
                  href={JOIN_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wo-btn wo-btn-gold"
                >
                  Join as a Photographer <span aria-hidden="true">→</span>
                </a>
              </div>
              <div className="wo-hero-visual" aria-hidden="true">
                <div className="wo-bg" />
                <div className="wo-veil" />
              </div>
            </div>
          </div>
        </section>

        <section className="wo-wrap wo-stats" aria-label="Why OutsYde">
          <div className="wo-stat">
            <strong>100%</strong>
            <span>You keep your rate</span>
          </div>
          <div className="wo-stat">
            <strong>5%</strong>
            <span>Platform fee only</span>
          </div>
          <div className="wo-stat">
            <strong>0</strong>
            <span>Middlemen</span>
          </div>
        </section>

        <section className="wo-wrap wo-benefits" aria-label="What you get">
          <div className="wo-benefit-grid">
            <article className="wo-card">
              <svg className="wo-icon" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <circle cx="18" cy="18" r="7.5" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="18" cy="18" r="13" stroke="currentColor" strokeWidth="1.2" opacity=".55" />
                <circle cx="18" cy="18" r="2.2" fill="currentColor" />
              </svg>
              <h2>Get Discovered</h2>
              <p>
                Local clients searching for photographers in your area find your profile first.
                You show up where the culture already shops and books.
              </p>
            </article>
            <article className="wo-card">
              <svg className="wo-icon" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <rect x="8" y="8" width="20" height="20" rx="2" transform="rotate(45 18 18)" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <h2>Get Booked</h2>
              <p>
                Built-in booking — no middleman. Clients request you on OutsYde. You accept or
                decline from your dashboard. No chasing DMs.
              </p>
            </article>
            <article className="wo-card">
              <svg className="wo-icon" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <path d="M18 6 L30 18 L18 30 L6 18 Z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <h2>Get Paid</h2>
              <p>
                Set your own rates. Keep more of every booking — 5% platform fee only. Stripe
                handles payouts.
              </p>
            </article>
          </div>
        </section>

        <div className="wo-wrap">
          <div className="wo-fee">
            <p>No upfront cost to list. We only earn when you earn.</p>
            <span className="wo-pill">5% per booking</span>
          </div>
        </div>

        <section className="wo-wrap" aria-label="Join the collective">
          <div className="wo-cta">
            <h2>Ready to Shoot?</h2>
            <p>Your next client is already on OutsYde.</p>
            <a
              href={JOIN_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="wo-btn wo-btn-gold"
            >
              Join as a Photographer <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <footer className="wo-footer">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <div className="ft-logo">
                <div className="ft-y" aria-hidden="true">
                  Y
                </div>
                <span className="ft-name">Go OutsYde</span>
              </div>
              <p>
                Culture meets commerce. Linking local businesses with artists and consumers —
                one place to shop, book, and experience it all.
              </p>
              <div className="ft-social" aria-label="Social media links">
                <a href="https://instagram.com/go.outsyde" target="_blank" rel="noopener noreferrer">
                  Instagram
                </a>
                <a href="https://tiktok.com/@go.outsyde" target="_blank" rel="noopener noreferrer">
                  TikTok
                </a>
                <a href="https://x.com/go.outsyde" target="_blank" rel="noopener noreferrer">
                  Twitter
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h4>For Businesses</h4>
              <ul>
                <li>
                  <a href="/business-signup">Join the Marketplace</a>
                </li>
                <li>
                  <a href="/business-signup">List Your Services</a>
                </li>
                <li>
                  <a href="/coming-soon">Manage Bookings</a>
                </li>
                <li>
                  <a href="/coming-soon">Partner With Us</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>For Shoppers</h4>
              <ul>
                <li>
                  <a href="/shop">Browse the Collection</a>
                </li>
                <li>
                  <a href="/coming-soon">Book a Photographer</a>
                </li>
                <li>
                  <a href="/coming-soon">Discover Local Brands</a>
                </li>
                <li>
                  <a href="/login">My Account</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>For Photographers</h4>
              <ul>
                <li>
                  <a href={JOIN_HREF} target="_blank" rel="noopener noreferrer">
                    Join Our Collective
                  </a>
                </li>
                <li>
                  <a href="/photographers/why-outsyde">Why OutsYde</a>
                </li>
                <li>
                  <a href="/contact">Contact Us</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} Go OutsYde. All rights reserved. ·{" "}
              <a href="/about">About</a>
            </span>
            <span>Like a Lavished Local</span>
          </div>
        </footer>
      </div>
    </>
  );
}
