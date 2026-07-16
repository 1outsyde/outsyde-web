// app/signup/page.tsx
// Role picker — /signup
//
// Matches the mobile app's "Join Outsyde" screen: pick a path, then land on
// the role-specific signup form. Only Business is wired to a real flow right
// now — Consumer and Photographer signup don't exist on the website yet, so
// they honestly route to /coming-soon instead of pretending to work.

"use client";

export default function SignupRolePickerPage() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
:root{
  --black:#000000; --gold:#E8B930; --cream:#F5F0E6;
  --emerald:#1A3C34; --emerald-light:#244e44; --off-black:#04100d;
  --serif:'Bebas Neue',Impact,sans-serif; --sans:'Hanken Grotesk',system-ui,sans-serif;
}
html{scroll-behavior:smooth;}
body{font-family:var(--sans);background:var(--black);color:var(--cream);overflow-x:hidden;}

.bs-wrap{position:relative;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:56px 24px;overflow:hidden;}
.bs-bg{position:absolute;inset:0;background:var(--off-black);overflow:hidden;z-index:0;}
.bs-bg::before{content:'';position:absolute;inset:-25%;background:radial-gradient(ellipse 70% 65% at 22% 58%,rgba(26,60,52,.9) 0%,transparent 52%),radial-gradient(ellipse 55% 45% at 78% 22%,rgba(232,185,48,.1) 0%,transparent 48%),radial-gradient(ellipse 60% 70% at 62% 85%,rgba(26,60,52,.55) 0%,transparent 52%),#04100d;}
.bs-veil{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.3),rgba(0,0,0,.72));z-index:1;}
.bs-inner{position:relative;z-index:2;max-width:480px;width:100%;}

.bs-logo{display:inline-flex;align-items:center;gap:12px;margin-bottom:28px;}
.bs-y{width:42px;height:42px;background:var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:24px;color:var(--black);}
.bs-word{font-family:var(--serif);font-size:22px;letter-spacing:.16em;color:var(--cream);text-transform:uppercase;}

.bs-eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;}
.bs-h1{font-family:var(--serif);font-size:clamp(34px,6vw,44px);letter-spacing:.03em;color:var(--cream);margin-bottom:10px;text-transform:uppercase;}
.bs-sub{font-size:14px;line-height:1.65;color:rgba(245,240,230,.65);max-width:380px;margin:0 auto 32px;text-align:center;}

.role-card{display:flex;align-items:center;gap:16px;background:rgba(255,255,255,.05);border:1px solid rgba(245,240,230,.12);border-radius:8px;padding:18px 20px;text-align:left;text-decoration:none;margin-bottom:12px;transition:border-color .18s,background .18s,transform .15s;}
.role-card:hover{border-color:var(--gold);background:rgba(255,255,255,.08);transform:translateY(-1px);}
.role-icon{width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;}
.role-icon.consumer{background:rgba(26,60,52,.5);}
.role-icon.business{background:rgba(232,185,48,.16);}
.role-icon.photographer{background:rgba(255,255,255,.08);}
.role-text{flex:1;min-width:0;}
.role-title{font-size:15px;font-weight:600;color:var(--cream);margin-bottom:2px;}
.role-desc{font-size:12.5px;line-height:1.4;color:rgba(245,240,230,.55);}
.role-arrow{color:rgba(245,240,230,.35);font-size:16px;flex-shrink:0;}

.bs-signup-link{display:block;margin-top:22px;font-size:12px;color:rgba(245,240,230,.5);}
.bs-signup-link a{color:var(--gold);text-decoration:none;}
.bs-signup-link a:hover{text-decoration:underline;}

.bs-back{display:inline-block;margin-top:32px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.45);text-decoration:none;transition:color .2s;}
.bs-back:hover{color:var(--gold);}
`,
        }}
      />

      <main className="bs-wrap">
        <div className="bs-bg" aria-hidden="true" />
        <div className="bs-veil" aria-hidden="true" />

        <div className="bs-inner">
          <a href="/" className="bs-logo" aria-label="Go OutsYde home">
            <span className="bs-y" aria-hidden="true">Y</span>
            <span className="bs-word">Go OutsYde</span>
          </a>

          <p className="bs-eyebrow">Join Outsyde</p>
          <h1 className="bs-h1">Choose Your Path</h1>
          <p className="bs-sub">Pick how you want to get started.</p>

         <a href="/consumer-signup" className="role-card">
            <span className="role-icon consumer" aria-hidden="true">🛍️</span>
            <span className="role-text">
              <span className="role-title">Consumer</span>
              <span className="role-desc">Browse, book sessions and shop local talent</span>
            </span>
            <span className="role-arrow" aria-hidden="true">→</span>
          </a>

          <a href="/business-signup" className="role-card">
            <span className="role-icon business" aria-hidden="true">💼</span>
            <span className="role-text">
              <span className="role-title">Business</span>
              <span className="role-desc">Sell products and services to your community</span>
            </span>
            <span className="role-arrow" aria-hidden="true">→</span>
          </a>

          <a href="/photographer-signup" className="role-card">
            <span className="role-icon photographer" aria-hidden="true">📷</span>
            <span className="role-text">
              <span className="role-title">Photographer</span>
              <span className="role-desc">Offer photography and creative services</span>
            </span>
            <span className="role-arrow" aria-hidden="true">→</span>
          </a>

          <p className="bs-signup-link">
            Already have an account? <a href="/login">Sign in</a>
          </p>

          <a href="/" className="bs-back">← Back to Home</a>
        </div>
      </main>
    </>
  );
}