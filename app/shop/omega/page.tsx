// app/shop/omega/page.tsx
"use client";
import { useState, FormEvent } from "react";

const SERVICES_META = [
  { plate: "FREE", name: "Free Consultation", price: "$0", period: "", featured: true, action: "consultation" as const,
    items: ["Goal assessment", "Fitness & lifestyle discussion", "Personalized coaching recommendations"],
    cta: "Book Consultation" },
  { plate: "150", name: "Group Training", price: "$150", period: "/mo", featured: false, action: "contact" as const,
    items: ["Coach-led group workouts", "Accountability and support", "Structured training program"],
    cta: "Join the Group" },
  { plate: "200", name: "1-on-1 Personal Training", price: "$200", period: "/mo", featured: false, action: "contact" as const,
    items: ["Personalized training sessions", "Individual coaching", "Progress tracking & adjustments"],
    cta: "Go One-on-One" },
  { plate: "50", name: "Personalized Meal Plan", price: "$50", period: "", featured: false, action: "mealplan" as const,
    items: ["Customized nutrition plan for your goals", "Tailored to your lifestyle & diet"],
    cta: "Add Meal Plan" },
];

const STEPS = [
  { n: "01", title: "Book Your Consultation", body: "Free sit-down. We talk goals, history, and what's actually realistic for your life — no sales pitch." },
  { n: "02", title: "Get Your Plan", body: "Group, 1-on-1, or both — plus a meal plan if you want it. Built around your schedule, not a template." },
  { n: "03", title: "Show Up & Grind", body: "Coached sessions, tracked progress, adjustments made in real time. You put in the work — Omega makes sure it counts." },
];

const ALLERGY_OPTIONS = ["Dairy", "Gluten", "Nuts", "Shellfish", "Soy", "Eggs"];
const GOAL_OPTIONS = ["Lose Weight", "Build Muscle", "Maintain & Tone", "Improve Athletic Performance", "General Health"];
const ACTIVITY_OPTIONS = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"];
const DIET_OPTIONS = ["No restrictions", "Vegetarian", "Vegan", "Pescatarian", "Keto", "Halal", "Kosher", "Other"];

type ModalType = "consultation" | "mealplan" | null;
type Status = "idle" | "submitting" | "success" | "error";

export default function OmegaLifestyleCoaching() {
  const [cartOpen, setCartOpen] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@300;400;500;600&display=swap');

.oly-root *, .oly-root *::before, .oly-root *::after { box-sizing:border-box; margin:0; padding:0; }

.oly-root{
  --black:#0a0a0a;
  --near-black:#141414;
  --steel:#1c1c1c;
  --steel-line:rgba(245,244,242,.1);
  --red:#E2231A;
  --red-dark:#a8170f;
  --white:#F5F4F2;
  --white-dim:rgba(245,244,242,.62);
  --display:'Anton',Impact,sans-serif;
  --utility:'Barlow Condensed',sans-serif;
  --body:'Barlow',system-ui,sans-serif;

  background:var(--black);
  color:var(--white);
  font-family:var(--body);
  min-height:100vh;
}

/* ---------- MARKETPLACE BAR ---------- */
.oly-root .oly-topbar{
  display:flex; align-items:center; justify-content:space-between;
  padding:16px 32px; border-bottom:1px solid var(--steel-line);
  background:var(--black);
}
.oly-root .oly-topbar a.oly-back{
  font-family:var(--utility); font-weight:600; font-size:13px; letter-spacing:.04em;
  color:var(--white-dim); text-decoration:none; transition:color .2s;
}
.oly-root .oly-topbar a.oly-back:hover{ color:var(--red); }
.oly-root .oly-topbar-center{
  font-family:var(--utility); font-weight:600; font-size:13px; letter-spacing:.08em; text-transform:uppercase;
  color:var(--white);
}
.oly-root .oly-topbar-cart{
  font-family:var(--utility); font-weight:600; font-size:13px; letter-spacing:.04em;
  color:var(--white-dim); background:none; border:none; cursor:pointer; transition:color .2s;
}
.oly-root .oly-topbar-cart:hover{ color:var(--red); }

/* ---------- VENDOR BADGE ---------- */
.oly-root .oly-badge-row{ display:flex; justify-content:center; padding:20px 24px 0; }
.oly-root .oly-badge{
  display:inline-flex; align-items:center; gap:8px;
  font-family:var(--utility); font-size:11px; letter-spacing:.14em; text-transform:uppercase; font-weight:600;
  color:var(--white-dim); border:1px solid var(--steel-line); border-radius:20px; padding:6px 16px;
}
.oly-root .oly-badge .dot{ width:6px; height:6px; border-radius:50%; background:var(--red); }

/* ---------- HERO ---------- */
.oly-root .oly-hero{
  position:relative; max-width:1160px; margin:0 auto;
  padding:40px 32px 60px; text-align:center;
  display:flex; flex-direction:column; align-items:center;
}
.oly-root .oly-hero-logo{
  width:150px; height:150px; object-fit:contain; margin-bottom:20px;
  filter:drop-shadow(0 0 24px rgba(226,35,26,.25));
}
.oly-root .oly-hero h1{
  font-family:var(--display); font-weight:400; font-size:clamp(52px,9vw,108px);
  line-height:.92; text-transform:uppercase; letter-spacing:.01em;
  margin-bottom:8px;
}
.oly-root .oly-hero h1 .oly-red{ color:var(--red); }
.oly-root .oly-hero-sub{
  font-family:var(--utility); font-weight:600; font-size:14px; letter-spacing:.22em; text-transform:uppercase;
  color:var(--white-dim); margin-bottom:26px;
}
.oly-root .oly-hero p{
  max-width:520px; font-size:16px; font-weight:300; line-height:1.7; color:var(--white-dim); margin-bottom:34px;
}
.oly-root .oly-hero-ctas{ display:flex; gap:14px; flex-wrap:wrap; justify-content:center; }

.oly-root .oly-btn{
  display:inline-block; padding:15px 32px; font-family:var(--utility); font-weight:700;
  font-size:14px; letter-spacing:.08em; text-transform:uppercase;
  text-decoration:none; border:2px solid transparent; cursor:pointer;
  clip-path:polygon(6% 0,100% 0,94% 100%,0 100%);
  transition:transform .15s ease, background .2s ease, border-color .2s ease, color .2s ease;
}
.oly-root .oly-btn:hover{ transform:translateY(-2px); }
.oly-root .oly-btn-red{ background:var(--red); color:var(--white); }
.oly-root .oly-btn-red:hover{ background:var(--red-dark); }
.oly-root .oly-btn-outline{ background:transparent; color:var(--white); border-color:var(--white); }
.oly-root .oly-btn-outline:hover{ border-color:var(--red); color:var(--red); }
.oly-root .oly-btn:disabled{ opacity:.5; cursor:not-allowed; transform:none; }

/* ---------- STRIP ---------- */
.oly-root .oly-strip{ background:var(--red); color:var(--black); padding:10px 0; overflow:hidden; white-space:nowrap; }
.oly-root .oly-strip-track{
  display:inline-block; font-family:var(--utility); font-weight:700; font-size:13px; letter-spacing:.12em; text-transform:uppercase;
  animation:oly-marquee 22s linear infinite;
}
.oly-root .oly-strip-track span{ padding:0 24px; }
@keyframes oly-marquee{ from{ transform:translateX(0);} to{ transform:translateX(-50%);} }
@media (prefers-reduced-motion: reduce){ .oly-root .oly-strip-track{ animation:none; } }

/* ---------- PHILOSOPHY ---------- */
.oly-root .oly-philosophy{
  max-width:1160px; margin:0 auto; padding:80px 32px;
  display:grid; grid-template-columns:1fr 1fr; gap:56px; align-items:center;
}
@media (max-width:860px){ .oly-root .oly-philosophy{ grid-template-columns:1fr; } }
.oly-root .oly-philosophy-media{
  position:relative; aspect-ratio:1/1; background:var(--steel);
  clip-path:polygon(4% 0,100% 0,96% 100%,0 100%);
  display:flex; align-items:center; justify-content:center;
  border:1px solid var(--steel-line);
}
.oly-root .oly-philosophy-media img{ width:62%; height:auto; object-fit:contain; }
.oly-root .oly-kicker{
  font-family:var(--utility); font-weight:700; font-size:12px; letter-spacing:.2em; text-transform:uppercase;
  color:var(--red); margin-bottom:14px; display:block;
}
.oly-root .oly-philosophy h2{
  font-family:var(--display); font-weight:400; font-size:clamp(30px,4vw,44px); text-transform:uppercase; line-height:1.04;
  margin-bottom:18px;
}
.oly-root .oly-philosophy p{ font-size:15px; font-weight:300; line-height:1.8; color:var(--white-dim); margin-bottom:14px; max-width:480px; }

/* ---------- STEPS ---------- */
.oly-root .oly-steps{ background:var(--near-black); border-top:1px solid var(--steel-line); border-bottom:1px solid var(--steel-line); padding:80px 32px; }
.oly-root .oly-steps-inner{ max-width:1160px; margin:0 auto; }
.oly-root .oly-steps-head{ text-align:center; margin-bottom:52px; }
.oly-root .oly-steps-head h2{ font-family:var(--display); font-weight:400; font-size:clamp(30px,4.5vw,48px); text-transform:uppercase; }
.oly-root .oly-steps-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:36px; }
@media (max-width:800px){ .oly-root .oly-steps-grid{ grid-template-columns:1fr; } }
.oly-root .oly-step .oly-step-n{
  font-family:var(--display); font-weight:400; font-size:56px; color:var(--red); line-height:1; margin-bottom:14px;
  -webkit-text-stroke:1px var(--red);
}
.oly-root .oly-step h3{ font-family:var(--utility); font-weight:700; font-size:19px; letter-spacing:.03em; text-transform:uppercase; margin-bottom:10px; }
.oly-root .oly-step p{ font-size:14px; font-weight:300; color:var(--white-dim); line-height:1.7; }

/* ---------- SERVICES ---------- */
.oly-root .oly-services{ max-width:1160px; margin:0 auto; padding:88px 32px 100px; }
.oly-root .oly-services-head{ text-align:center; margin-bottom:52px; }
.oly-root .oly-services-head h2{ font-family:var(--display); font-weight:400; font-size:clamp(32px,5vw,54px); text-transform:uppercase; }
.oly-root .oly-services-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
@media (max-width:1000px){ .oly-root .oly-services-grid{ grid-template-columns:repeat(2,1fr); } }
@media (max-width:560px){ .oly-root .oly-services-grid{ grid-template-columns:1fr; } }

.oly-root .oly-card{
  background:var(--steel); border:1px solid var(--steel-line);
  padding:30px 22px; display:flex; flex-direction:column; gap:18px; position:relative;
  transition:border-color .2s ease, transform .2s ease;
}
.oly-root .oly-card:hover{ border-color:var(--red); transform:translateY(-4px); }
.oly-root .oly-card.oly-featured{ border-color:var(--red); background:linear-gradient(180deg, rgba(226,35,26,.12), var(--steel) 40%); }

.oly-root .oly-plate{
  width:64px; height:64px; border-radius:50%; border:4px solid var(--red);
  display:flex; align-items:center; justify-content:center; flex-direction:column;
  font-family:var(--display); font-weight:400; color:var(--white); background:var(--black);
}
.oly-root .oly-plate .num{ font-size:16px; line-height:1; }
.oly-root .oly-plate .unit{ font-family:var(--utility); font-size:8px; letter-spacing:.08em; color:var(--white-dim); margin-top:1px; }

.oly-root .oly-card-name{ font-family:var(--utility); font-weight:700; font-size:19px; letter-spacing:.02em; text-transform:uppercase; }
.oly-root .oly-card-price{ display:flex; align-items:baseline; gap:4px; }
.oly-root .oly-card-price .amount{ font-family:var(--display); font-size:32px; color:var(--red); }
.oly-root .oly-card-price .period{ font-family:var(--utility); font-size:12px; color:var(--white-dim); }
.oly-root .oly-card-list{ list-style:none; display:flex; flex-direction:column; gap:9px; flex:1; }
.oly-root .oly-card-list li{ font-size:13px; font-weight:300; color:var(--white-dim); line-height:1.6; padding-left:14px; position:relative; }
.oly-root .oly-card-list li::before{ content:"›"; position:absolute; left:0; color:var(--red); font-weight:700; }
.oly-root .oly-card .oly-btn{ text-align:center; padding:12px 20px; font-size:12px; }

/* ---------- CTA BAND ---------- */
.oly-root .oly-cta-band{ background:var(--red); padding:76px 32px; text-align:center; position:relative; overflow:hidden; }
.oly-root .oly-cta-band h2{
  font-family:var(--display); font-weight:400; font-size:clamp(30px,5.5vw,58px); text-transform:uppercase;
  color:var(--black); max-width:760px; margin:0 auto 28px; line-height:1;
}
.oly-root .oly-cta-band-ctas{ display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
.oly-root .oly-cta-band .oly-btn-outline{ border-color:var(--black); color:var(--black); }
.oly-root .oly-cta-band .oly-btn-outline:hover{ border-color:var(--white); color:var(--white); background:var(--black); }
.oly-root .oly-cta-band .oly-btn-red{ background:var(--black); color:var(--white); }
.oly-root .oly-cta-band .oly-btn-red:hover{ background:var(--near-black); }

/* ---------- FOOTER ---------- */
.oly-root .oly-footer{ padding:48px 32px 32px; text-align:center; }
.oly-root .oly-footer img{ width:56px; height:56px; object-fit:contain; margin-bottom:16px; }
.oly-root .oly-footer p{ font-family:var(--utility); font-size:12px; letter-spacing:.04em; color:var(--white-dim); margin-bottom:6px; }
.oly-root .oly-footer a{ color:var(--white-dim); text-decoration:none; }
.oly-root .oly-footer a:hover{ color:var(--red); }

/* ---------- CART DRAWER ---------- */
.oly-root .oly-cart-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:200; display:flex; justify-content:flex-end; }
.oly-root .oly-cart-panel{ width:min(360px,88vw); height:100%; background:var(--near-black); border-left:1px solid var(--steel-line); padding:24px; display:flex; flex-direction:column; }
.oly-root .oly-cart-panel-head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
.oly-root .oly-cart-panel-head h3{ font-family:var(--utility); font-weight:700; font-size:16px; text-transform:uppercase; letter-spacing:.05em; }
.oly-root .oly-cart-panel-head button{ background:none; border:none; color:var(--white); font-size:20px; cursor:pointer; }
.oly-root .oly-cart-panel p{ font-size:13px; color:var(--white-dim); }

/* ---------- FORM MODALS ---------- */
.oly-root .oly-modal-overlay{
  position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:300;
  display:flex; align-items:center; justify-content:center; padding:24px; overflow-y:auto;
}
.oly-root .oly-modal{
  width:100%; max-width:560px; background:var(--near-black); border:1px solid var(--steel-line);
  padding:36px; margin:auto; max-height:90vh; overflow-y:auto;
}
.oly-root .oly-modal-head{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; }
.oly-root .oly-modal-head h3{ font-family:var(--display); font-weight:400; font-size:28px; text-transform:uppercase; line-height:1; }
.oly-root .oly-modal-head button{ background:none; border:none; color:var(--white-dim); font-size:26px; line-height:1; cursor:pointer; }
.oly-root .oly-modal-head button:hover{ color:var(--red); }
.oly-root .oly-modal-sub{ font-size:13px; color:var(--white-dim); font-weight:300; margin-bottom:26px; line-height:1.6; }

.oly-root .oly-field{ margin-bottom:18px; }
.oly-root .oly-field label{
  display:block; font-family:var(--utility); font-weight:600; font-size:11px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--white-dim); margin-bottom:8px;
}
.oly-root .oly-field input[type="text"],
.oly-root .oly-field input[type="email"],
.oly-root .oly-field input[type="tel"],
.oly-root .oly-field input[type="date"],
.oly-root .oly-field input[type="time"],
.oly-root .oly-field select,
.oly-root .oly-field textarea{
  width:100%; background:var(--steel); border:1px solid var(--steel-line); color:var(--white);
  font-family:var(--body); font-size:14px; padding:12px 14px; outline:none;
  transition:border-color .2s;
}
.oly-root .oly-field input:focus,
.oly-root .oly-field select:focus,
.oly-root .oly-field textarea:focus{ border-color:var(--red); }
.oly-root .oly-field textarea{ resize:vertical; min-height:80px; font-family:var(--body); }
.oly-root .oly-row-2{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
@media (max-width:480px){ .oly-root .oly-row-2{ grid-template-columns:1fr; } }

.oly-root .oly-checks{ display:flex; flex-wrap:wrap; gap:10px; }
.oly-root .oly-check{
  display:flex; align-items:center; gap:7px; background:var(--steel); border:1px solid var(--steel-line);
  padding:8px 12px; cursor:pointer; font-size:13px; color:var(--white-dim); transition:border-color .2s, color .2s;
}
.oly-root .oly-check input{ accent-color:var(--red); }
.oly-root .oly-check.checked{ border-color:var(--red); color:var(--white); }

.oly-root .oly-form-submit{ width:100%; text-align:center; margin-top:8px; }
.oly-root .oly-form-msg{ font-size:13px; margin-top:14px; text-align:center; }
.oly-root .oly-form-msg.error{ color:var(--red); }
.oly-root .oly-form-msg.success{ color:#7CCB7C; }
`,
        }}
      />

      <div className="oly-root">
        {/* MARKETPLACE BAR */}
        <div className="oly-topbar">
          <a href="/shop" className="oly-back">&larr; Marketplace</a>
          <div className="oly-topbar-center">Omega Lifestyle</div>
          <button className="oly-topbar-cart" onClick={() => setCartOpen(true)}>Cart</button>
        </div>

        {/* BADGE */}
        <div className="oly-badge-row">
          <span className="oly-badge">
            <span className="dot" />
            Presented by Outsyde · Fitness &amp; Coaching Vendor
          </span>
        </div>

        {/* HERO */}
        <section className="oly-hero">
          <img className="oly-hero-logo" src="/omega-card.jpg" alt="Omega Lifestyle" />
          <h1>Train <span className="oly-red">Different</span></h1>
          <p className="oly-hero-sub">Strength &middot; Structure &middot; Accountability</p>
          <p>
            Omega Lifestyle Coaching builds fitness and nutrition around your
            real life. No gimmicks, no cookie-cutter programs — just a coach
            who shows up for you every session.
          </p>
          <div className="oly-hero-ctas">
            <button className="oly-btn oly-btn-red" onClick={() => setModal("consultation")}>Book Free Consultation</button>
            <a href="#services" className="oly-btn oly-btn-outline">View Pricing</a>
          </div>
        </section>

        {/* STRIP */}
        <div className="oly-strip">
          <div className="oly-strip-track">
            <span>NO EXCUSES</span><span>&middot;</span>
            <span>SHOW UP</span><span>&middot;</span>
            <span>TRACK PROGRESS</span><span>&middot;</span>
            <span>TRAIN DIFFERENT</span><span>&middot;</span>
            <span>NO EXCUSES</span><span>&middot;</span>
            <span>SHOW UP</span><span>&middot;</span>
            <span>TRACK PROGRESS</span><span>&middot;</span>
            <span>TRAIN DIFFERENT</span><span>&middot;</span>
          </div>
        </div>

        {/* PHILOSOPHY */}
        <section className="oly-philosophy">
          <div className="oly-philosophy-media">
            <img src="/omega-card.jpg" alt="Omega Lifestyle logo" />
          </div>
          <div>
            <span className="oly-kicker">The Approach</span>
            <h2>Coaching built around your actual life</h2>
            <p>
              Omega doesn't hand out generic plans. Every client starts with a
              free consultation to talk goals, history, and what's realistic
              — then gets a program built to fit their schedule, not the
              other way around.
            </p>
            <p>
              Whether you train in a group, one-on-one, or add a nutrition
              plan on top, every session is coached, tracked, and adjusted as
              you progress.
            </p>
          </div>
        </section>

        {/* STEPS */}
        <section className="oly-steps">
          <div className="oly-steps-inner">
            <div className="oly-steps-head">
              <span className="oly-kicker" style={{ textAlign: "center" }}>How It Works</span>
              <h2>Getting Started</h2>
            </div>
            <div className="oly-steps-grid">
              {STEPS.map((s) => (
                <div className="oly-step" key={s.n}>
                  <div className="oly-step-n">{s.n}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="oly-services" id="services">
          <div className="oly-services-head">
            <span className="oly-kicker" style={{ textAlign: "center" }}>Services &amp; Pricing</span>
            <h2>Pick Your Program</h2>
          </div>
          <div className="oly-services-grid">
            {SERVICES_META.map((s) => (
              <div key={s.name} className={`oly-card${s.featured ? " oly-featured" : ""}`}>
                <div className="oly-plate">
                  <span className="num">{s.plate}</span>
                  {s.plate !== "FREE" && <span className="unit">LB</span>}
                </div>
                <div className="oly-card-name">{s.name}</div>
                <div className="oly-card-price">
                  <span className="amount">{s.price}</span>
                  {s.period && <span className="period">{s.period}</span>}
                </div>
                <ul className="oly-card-list">
                  {s.items.map((item) => (<li key={item}>{item}</li>))}
                </ul>
                {s.action === "consultation" && (
                  <button className="oly-btn oly-btn-red" onClick={() => setModal("consultation")}>{s.cta}</button>
                )}
                {s.action === "mealplan" && (
                  <button className="oly-btn oly-btn-outline" onClick={() => setModal("mealplan")}>{s.cta}</button>
                )}
                {s.action === "contact" && (
                  <a href="/shop/omega/book" className="oly-btn oly-btn-outline">{s.cta}</a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA BAND */}
        <section className="oly-cta-band">
          <h2>Stop planning. Start training.</h2>
          <div className="oly-cta-band-ctas">
            <button className="oly-btn oly-btn-red" onClick={() => setModal("consultation")}>Book Free Consultation</button>
            <a href="/shop" className="oly-btn oly-btn-outline">Explore the Marketplace</a>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="oly-footer">
          <img src="/omega-card.jpg" alt="Omega Lifestyle" />
          <p>&copy; {new Date().getFullYear()} Omega Lifestyle Coaching &middot; Sold via Go OutsYde Platform</p>
          <p><a href="/shop">&larr; Back to all vendors</a></p>
        </footer>

        {/* CART DRAWER */}
        {cartOpen && (
          <div className="oly-cart-overlay" onClick={() => setCartOpen(false)}>
            <div className="oly-cart-panel" onClick={(e) => e.stopPropagation()}>
              <div className="oly-cart-panel-head">
                <h3>Your Cart</h3>
                <button onClick={() => setCartOpen(false)}>&times;</button>
              </div>
              <p>Your cart is empty.</p>
            </div>
          </div>
        )}

        {/* CONSULTATION MODAL */}
        {modal === "consultation" && (
          <ConsultationModal onClose={() => setModal(null)} />
        )}

        {/* MEAL PLAN MODAL */}
        {modal === "mealplan" && (
          <MealPlanModal onClose={() => setModal(null)} />
        )}
      </div>
    </>
  );
}

function ConsultationModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      preferredDate: form.get("preferredDate"),
      preferredTime: form.get("preferredTime"),
      goals: form.get("goals"),
      heardAbout: form.get("heardAbout"),
    };
    try {
      const res = await fetch("/api/omega-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="oly-modal-overlay" onClick={onClose}>
      <div className="oly-modal" onClick={(e) => e.stopPropagation()}>
        <div className="oly-modal-head">
          <h3>Book Consultation</h3>
          <button onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <p className="oly-modal-sub">
          Free 30-minute sit-down to talk goals and figure out the right program for you.
        </p>

        {status === "success" ? (
          <p className="oly-form-msg success">
            You're booked! Omega will reach out shortly to confirm your time.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="oly-row-2">
              <div className="oly-field">
                <label htmlFor="c-name">Name</label>
                <input id="c-name" name="name" type="text" required />
              </div>
              <div className="oly-field">
                <label htmlFor="c-phone">Phone</label>
                <input id="c-phone" name="phone" type="tel" required />
              </div>
            </div>
            <div className="oly-field">
              <label htmlFor="c-email">Email</label>
              <input id="c-email" name="email" type="email" required />
            </div>
            <div className="oly-row-2">
              <div className="oly-field">
                <label htmlFor="c-date">Preferred Date</label>
                <input id="c-date" name="preferredDate" type="date" required />
              </div>
              <div className="oly-field">
                <label htmlFor="c-time">Preferred Time</label>
                <input id="c-time" name="preferredTime" type="time" required />
              </div>
            </div>
            <div className="oly-field">
              <label htmlFor="c-goals">What are your goals?</label>
              <textarea id="c-goals" name="goals" placeholder="e.g. Lose weight, build strength, train for an event..." required />
            </div>
            <div className="oly-field">
              <label htmlFor="c-heard">How did you hear about Omega? (optional)</label>
              <input id="c-heard" name="heardAbout" type="text" />
            </div>

            <button type="submit" className="oly-btn oly-btn-red oly-form-submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Sending..." : "Book Free Consultation"}
            </button>
            {status === "error" && <p className="oly-form-msg error">{errorMsg}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

function MealPlanModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);

  function toggleAllergy(item: string) {
    setAllergies((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    const form = new FormData(e.currentTarget);
    const otherAllergy = (form.get("allergiesOther") as string) || "";
    const allAllergies = [...allergies, ...(otherAllergy ? [otherAllergy] : [])];
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      goal: form.get("goal"),
      activityLevel: form.get("activityLevel"),
      allergies: allAllergies.length ? allAllergies.join(", ") : "None listed",
      dietaryPreference: form.get("dietaryPreference"),
      notes: form.get("notes"),
    };
    try {
      const res = await fetch("/api/omega-mealplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="oly-modal-overlay" onClick={onClose}>
      <div className="oly-modal" onClick={(e) => e.stopPropagation()}>
        <div className="oly-modal-head">
          <h3>Meal Plan Intake</h3>
          <button onClick={onClose} aria-label="Close">&times;</button>
        </div>
        <p className="oly-modal-sub">
          Tell us your goals and any allergies so Omega can build your $50
          personalized nutrition plan.
        </p>

        {status === "success" ? (
          <p className="oly-form-msg success">
            Got it! Omega will follow up with your personalized meal plan soon.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="oly-row-2">
              <div className="oly-field">
                <label htmlFor="m-name">Name</label>
                <input id="m-name" name="name" type="text" required />
              </div>
              <div className="oly-field">
                <label htmlFor="m-phone">Phone</label>
                <input id="m-phone" name="phone" type="tel" required />
              </div>
            </div>
            <div className="oly-field">
              <label htmlFor="m-email">Email</label>
              <input id="m-email" name="email" type="email" required />
            </div>

            <div className="oly-field">
              <label htmlFor="m-goal">What shape are you going for?</label>
              <select id="m-goal" name="goal" required defaultValue="">
                <option value="" disabled>Select a goal</option>
                {GOAL_OPTIONS.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>
            </div>

            <div className="oly-field">
              <label htmlFor="m-activity">Current Activity Level</label>
              <select id="m-activity" name="activityLevel" defaultValue="">
                <option value="" disabled>Select activity level</option>
                {ACTIVITY_OPTIONS.map((a) => (<option key={a} value={a}>{a}</option>))}
              </select>
            </div>

            <div className="oly-field">
              <label>Allergies &amp; Food Intolerances</label>
              <div className="oly-checks">
                {ALLERGY_OPTIONS.map((item) => (
                  <label key={item} className={`oly-check${allergies.includes(item) ? " checked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={allergies.includes(item)}
                      onChange={() => toggleAllergy(item)}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>
            <div className="oly-field">
              <label htmlFor="m-allergies-other">Other allergies (optional)</label>
              <input id="m-allergies-other" name="allergiesOther" type="text" placeholder="Anything not listed above" />
            </div>

            <div className="oly-field">
              <label htmlFor="m-diet">Dietary Preference</label>
              <select id="m-diet" name="dietaryPreference" required defaultValue="">
                <option value="" disabled>Select a preference</option>
                {DIET_OPTIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
              </select>
            </div>

            <div className="oly-field">
              <label htmlFor="m-notes">Additional Notes (optional)</label>
              <textarea id="m-notes" name="notes" placeholder="Foods you hate, meals-per-day preference, anything else..." />
            </div>

            <button type="submit" className="oly-btn oly-btn-red oly-form-submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Sending..." : "Submit Meal Plan Request"}
            </button>
            {status === "error" && <p className="oly-form-msg error">{errorMsg}</p>}
          </form>
        )}
      </div>
    </div>
  );
}