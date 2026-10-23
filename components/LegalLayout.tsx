// components/LegalLayout.tsx
// Shared on-brand layout for goutsyde.com legal pages (Terms, Privacy,
// Refund Policy, Shipping Policy). Matches the approved Oct 2026 mockup:
// black ground, gold #E8B930, cream #F5F0E6, Bebas Neue display, Hanken
// Grotesk body. The site Navbar comes from app/layout.tsx.
//
// Fonts load through a Google Fonts stylesheet (same source the homepage
// uses) with Impact / system-ui fallbacks, so headings never fall back to
// a serif if the stylesheet fails.

import type { ReactNode } from "react";
import { LEGAL_PAGES, type LegalHref } from "@/lib/legal-pages";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap";

const CSS = `
.legal-root{--lg-black:#000000;--lg-off:#060e0c;--lg-gold:#E8B930;--lg-gold-hi:#F2C835;--lg-cream:#F5F0E6;
  --lg-display:'Bebas Neue',Impact,'Arial Narrow',sans-serif;--lg-body:'Hanken Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif;
  min-height:100vh;background:var(--lg-black);color:var(--lg-cream);font-family:var(--lg-body);}
.legal-root a{color:var(--lg-gold);}
.legal-root a:hover{color:var(--lg-gold-hi);}
.legal-hero{background:var(--lg-off);border-bottom:1px solid rgba(245,240,230,.07);}
.legal-wrap{max-width:1200px;margin:0 auto;padding-left:24px;padding-right:24px;}
.legal-hero .legal-wrap{padding-top:72px;padding-bottom:48px;}
.legal-eyebrow{margin:0 0 18px;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--lg-gold);font-weight:600;}
.legal-title{margin:0;font-family:var(--lg-display);font-weight:400;font-size:clamp(56px,9vw,112px);line-height:.9;letter-spacing:.03em;text-transform:uppercase;color:var(--lg-cream);}
.legal-title span{color:var(--lg-gold);}
.legal-updated{margin:22px 0 0;font-size:14px;color:rgba(245,240,230,.6);}
.legal-pills{margin-top:36px;display:flex;flex-wrap:wrap;gap:8px;}
.legal-root .legal-pill{font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:rgba(245,240,230,.7);border:1px solid rgba(245,240,230,.18);border-radius:999px;padding:12px 18px;text-decoration:none;}
.legal-root .legal-pill:hover{color:var(--lg-cream);border-color:rgba(245,240,230,.4);}
.legal-root .legal-pill[aria-current="page"]{color:#000;background:var(--lg-gold);border-color:var(--lg-gold);}
.legal-main{display:flex;flex-wrap:wrap;gap:56px;align-items:flex-start;padding-top:56px;padding-bottom:96px;}
.legal-toc{flex:1 1 220px;max-width:280px;}
.legal-toc-label{margin:0 0 16px;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--lg-gold);font-weight:600;}
.legal-toc ol{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px;border-left:1px solid rgba(245,240,230,.1);}
.legal-root .legal-toc a{display:block;padding:8px 14px;font-size:14px;color:rgba(245,240,230,.62);text-decoration:none;}
.legal-root .legal-toc a:hover{color:var(--lg-cream);}
.legal-article{flex:999 1 560px;min-width:0;max-width:760px;display:flex;flex-direction:column;gap:48px;}
.legal-article section{display:flex;flex-direction:column;gap:14px;scroll-margin-top:84px;}
.legal-article h2{margin:0;font-family:var(--lg-display);font-weight:400;font-size:34px;letter-spacing:.04em;color:var(--lg-cream);}
.legal-article h3{margin:8px 0 0;font-size:17px;font-weight:600;color:var(--lg-cream);}
.legal-article p{margin:0;font-size:16px;line-height:1.75;color:rgba(245,240,230,.78);}
.legal-article ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:10px;list-style:disc;}
.legal-article li{font-size:16px;line-height:1.7;color:rgba(245,240,230,.78);}
.legal-article li::marker{color:var(--lg-gold);}
.legal-article strong{color:var(--lg-cream);font-weight:600;}
.legal-summary{border:1px solid rgba(232,185,48,.3);background:rgba(232,185,48,.06);border-radius:8px;padding:28px 28px 30px;display:flex;flex-direction:column;gap:16px;}
.legal-article .legal-summary h2{font-size:30px;letter-spacing:.06em;color:var(--lg-gold);}
.legal-footer{border-top:.5px solid rgba(245,240,230,.07);}
.legal-footer .legal-wrap{padding-top:48px;padding-bottom:32px;display:flex;flex-wrap:wrap;gap:24px 40px;justify-content:space-between;align-items:center;}
.legal-footer nav{display:flex;flex-wrap:wrap;gap:12px 24px;}
.legal-root .legal-footer nav a{font-size:13px;color:rgba(245,240,230,.6);text-decoration:none;}
.legal-root .legal-footer nav a:hover,.legal-root .legal-footer nav a[aria-current="page"]{color:var(--lg-cream);}
.legal-footer small{font-size:12px;color:rgba(245,240,230,.5);}
`;

export type LegalSection = { id: string; label: string };

export default function LegalLayout({
  title,
  current,
  updated,
  sections,
  children,
}: {
  title: [string, string];
  current: LegalHref;
  updated: string;
  sections: LegalSection[];
  children: ReactNode;
}) {
  return (
    <div className="legal-root">
      <link rel="stylesheet" href={FONTS_HREF} precedence="default" />
      <style>{CSS}</style>

      <section className="legal-hero">
        <div className="legal-wrap">
          <p className="legal-eyebrow">Legal</p>
          <h1 className="legal-title">
            {title[0]} <span>{title[1]}</span>
          </h1>
          <p className="legal-updated">Last Updated: {updated}</p>
          <nav aria-label="Legal pages" className="legal-pills">
            {LEGAL_PAGES.map((p) => (
              <a key={p.href} href={p.href} className="legal-pill" aria-current={p.href === current ? "page" : undefined}>
                {p.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <main className="legal-wrap legal-main">
        <aside className="legal-toc" aria-label="On this page">
          <p className="legal-toc-label">On this page</p>
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.label}</a>
              </li>
            ))}
          </ol>
        </aside>
        <article className="legal-article">{children}</article>
      </main>

      <footer className="legal-footer">
        <div className="legal-wrap">
          <nav aria-label="Legal">
            {LEGAL_PAGES.map((p) => (
              <a key={p.href} href={p.href} aria-current={p.href === current ? "page" : undefined}>
                {p.label}
              </a>
            ))}
            <a href="/contact">Contact Us</a>
          </nav>
          <small>© {new Date().getFullYear()} Go OutsYde. All rights reserved.</small>
        </div>
      </footer>
    </div>
  );
}

/** A numbered legal section with an anchor id for the "On this page" menu. */
export function LegalSectionBlock({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
