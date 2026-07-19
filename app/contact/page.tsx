"use client";

import { useState } from "react";

const INQUIRY_TYPES = [
  { value: "general", label: "General Inquiry" },
  { value: "business", label: "Business Partnership / Vendor Interest" },
  { value: "photographer", label: "Photographer Inquiry" },
  { value: "support", label: "Support / Order Issue" },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "", email: "", inquiryType: "", message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    setMsg("");
    if (!form.name.trim()) return error("Your name is required.");
    if (!form.email.includes("@")) return error("Enter a valid email.");
    if (!form.inquiryType) return error("Please select an inquiry type.");
    if (!form.message.trim()) return error("Please include a message.");

    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("done");
      } else {
        setStatus("error");
        setMsg(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMsg("Couldn't reach the server. Please try again.");
    }
  }

  function error(m: string) {
    setStatus("error");
    setMsg(m);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
:root{
  --black:#000000; --gold:#E8B930; --cream:#F5F0E6;
  --emerald:#1A3C34; --emerald-light:#244e44; --off-black:#04100d;
  --serif:'Bebas Neue',Impact,sans-serif; --sans:'Hanken Grotesk',system-ui,sans-serif;
}
body{font-family:var(--sans);background:var(--black);color:var(--cream);overflow-x:hidden;}
.ct-wrap{position:relative;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px 64px;overflow:hidden;}
.ct-bg{position:absolute;inset:0;background:var(--off-black);z-index:0;}
.ct-bg::before{content:'';position:absolute;inset:-25%;background:radial-gradient(ellipse 70% 65% at 22% 58%,rgba(26,60,52,.9) 0%,transparent 52%),radial-gradient(ellipse 55% 45% at 78% 22%,rgba(232,185,48,.1) 0%,transparent 48%),#04100d;animation:bgFlow 16s ease-in-out infinite alternate;will-change:transform;}
@keyframes bgFlow{0%{transform:translate(0,0) scale(1);}100%{transform:translate(-1.8%,2%) scale(1.1);}}
.ct-veil{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.35),rgba(0,0,0,.72));z-index:1;}
.ct-inner{position:relative;z-index:2;width:100%;max-width:600px;}
.ct-eyebrow{font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--gold);margin-bottom:14px;}
.ct-title{font-family:var(--serif);font-size:clamp(48px,10vw,88px);line-height:.9;letter-spacing:.03em;text-transform:uppercase;color:var(--cream);margin-bottom:16px;}
.ct-title .g{color:var(--gold);}
.ct-desc{font-size:14px;font-weight:300;line-height:1.75;color:rgba(245,240,230,.65);margin-bottom:48px;}
.ct-form{display:flex;flex-direction:column;gap:14px;}
.ct-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.ct-label{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(245,240,230,.5);margin-bottom:6px;}
.ct-input,.ct-select,.ct-textarea{width:100%;padding:14px 16px;border:1px solid rgba(245,240,230,.2);border-radius:4px;background:rgba(0,0,0,.4);color:var(--cream);font-size:14px;font-family:var(--sans);outline:none;transition:border-color .2s;}
.ct-input::placeholder,.ct-textarea::placeholder{color:rgba(245,240,230,.35);}
.ct-input:focus,.ct-select:focus,.ct-textarea:focus{border-color:var(--gold);}
.ct-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23E8B930' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;padding-right:40px;cursor:pointer;}
.ct-select option{background:#0a1a14;color:var(--cream);}
.ct-textarea{resize:vertical;min-height:140px;line-height:1.6;}
.ct-btn{padding:16px 32px;background:var(--gold);color:var(--black);border:none;border-radius:4px;font-family:var(--sans);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:background .2s,transform .2s,opacity .2s;align-self:flex-start;}
.ct-btn:hover:not(:disabled){background:#f2c835;transform:translateY(-2px);}
.ct-btn:disabled{opacity:.55;cursor:not-allowed;}
.ct-note{min-height:1.2rem;margin-top:4px;font-size:13px;}
.ct-note.err{color:#ff8080;}
.ct-success{text-align:center;padding:40px 0;}
.ct-success .chk{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:50%;background:var(--emerald);color:var(--gold);font-size:24px;margin-bottom:20px;}
.ct-success p{font-size:15px;color:var(--cream);line-height:1.7;max-width:400px;margin:0 auto;}
@media(max-width:520px){.ct-row{grid-template-columns:1fr;}}
@media(prefers-reduced-motion:reduce){.ct-bg::before{animation:none;}}
      `}} />

      <main className="ct-wrap">
        <div className="ct-bg" aria-hidden="true" />
        <div className="ct-veil" aria-hidden="true" />

        <div className="ct-inner">
          <p className="ct-eyebrow">Get In Touch</p>
          <h1 className="ct-title">Contact <span className="g">Us</span></h1>
          <p className="ct-desc">
            Whether you&apos;re a business looking to partner, a photographer ready to join the collective,
            or a shopper with a question — we&apos;re here.
          </p>

          {status === "done" ? (
            <div className="ct-success">
              <div className="chk" aria-hidden="true">✓</div>
              <p>We got your message. Someone from the OutsYde team will be in touch shortly.</p>
            </div>
          ) : (
            <div className="ct-form">
              <div className="ct-row">
                <div>
                  <label className="ct-label">Name</label>
                  <input className="ct-input" placeholder="Your name" value={form.name}
                    onChange={(e) => set("name", e.target.value)} />
                </div>
                <div>
                  <label className="ct-label">Email</label>
                  <input className="ct-input" type="email" placeholder="you@email.com" value={form.email}
                    onChange={(e) => set("email", e.target.value)} />
                </div>
              </div>

              <div>
                <label className="ct-label">What&apos;s this about?</label>
                <select className="ct-select" value={form.inquiryType}
                  onChange={(e) => set("inquiryType", e.target.value)}>
                  <option value="">Select an inquiry type</option>
                  {INQUIRY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ct-label">Message</label>
                <textarea className="ct-textarea" placeholder="Tell us what's on your mind…" value={form.message}
                  onChange={(e) => set("message", e.target.value)} />
              </div>

              <button className="ct-btn" onClick={submit} disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send Message"}
              </button>

              <div className={`ct-note${status === "error" ? " err" : ""}`}>{msg}</div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}