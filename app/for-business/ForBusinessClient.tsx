"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./for-business.module.css";
import { APPLY_HREF, FAQS, FEATURE_GROUPS, PLANS, type Cell } from "./plans-content";

const FINDER_WHY = [
  "Everything you need to sell, take bookings and get paid, at the lowest price.",
  "Your own website, the Authority badge and the insights to grow, with room for up to 8 staff.",
  "Unlimited staff plus forecasts, peak times and year over year growth.",
];

const FINDER_QUESTIONS: { key: "team" | "site" | "data"; label: string; options: string[] }[] = [
  { key: "team", label: "How many people work in your business?", options: ["Just me, or up to 3", "4 to 8", "More than 8"] },
  { key: "site", label: "Do you want your own website and a verified badge?", options: ["Not right now", "Yes, I want both"] },
  { key: "data", label: "How much do you want to know about your numbers?", options: ["Just the basics", "Trends and who my customers are", "Forecasts and my busiest times"] },
];

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

function isOff(c: Cell) {
  return c.kind === "no";
}

function TableCell({ cell }: { cell: Cell }) {
  if (cell.kind === "yes") return <span className={styles.yes} aria-label="Included">✓</span>;
  if (cell.kind === "no") return <span className={styles.no} aria-label="Not included">✕</span>;
  if (cell.kind === "soon") return <span className={styles.soon}>Coming soon</span>;
  return (
    <>
      <span className={styles.val}>{cell.text}</span>
      {cell.soon && (<><br /><span className={styles.soon}>Coming soon</span></>)}
    </>
  );
}

export default function ForBusinessClient() {
  const [plan, setPlan] = useState(1);
  const [answers, setAnswers] = useState<Partial<Record<"team" | "site" | "data", number>>>({});
  const [sales, setSales] = useState(2000);
  const [showSticky, setShowSticky] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const compareRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const hero = heroRef.current;
      const cta = ctaRef.current;
      if (!hero || !cta) return;
      const pastHero = hero.getBoundingClientRect().bottom < 0;
      const atCta = cta.getBoundingClientRect().top < window.innerHeight;
      setShowSticky(pastHero && !atCta);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const showPlan = (p: number) => {
    setPlan(p);
    compareRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const answered = Object.keys(answers).length === FINDER_QUESTIONS.length;
  const recommended = answered ? Math.max(answers.team ?? 0, answers.site ?? 0, answers.data ?? 0) : 1;

  const allRows = FEATURE_GROUPS.flatMap((g) => g.rows);
  const included = allRows.filter((r) => !isOff(r.cells[plan])).length;

  return (
    <div className={styles.page}>
      {/* Fonts load the same way as app/page.tsx */}
      <style
        dangerouslySetInnerHTML={{
          __html: "@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');",
        }}
      />
      <header ref={heroRef} className={styles.hero}>
        <span className={styles.eyebrow}>Outsyde for business</span>
        <h1>
          Get booked. Get paid.
          <br />
          <span>Get discovered.</span>
        </h1>
        <p className={styles.lead}>
          Sell your products, take bookings with deposits, and reach new customers on the Outsyde app and website.
          Simple monthly plans, and you keep 98% of every sale.
        </p>
        <div className={styles.heroActions}>
          <a className={`${styles.btn} ${styles.btnGold}`} href="#plans">See the plans</a>
          <a className={`${styles.btn} ${styles.btnGhost}`} href="#finder">Help me choose</a>
        </div>
        <div className={styles.proof}>
          <div><b>98%</b><span>of every sale paid to you</span></div>
          <div><b>$29</b><span>plans start per month</span></div>
          <div><b>3 plans</b><span>change anytime</span></div>
        </div>
      </header>

      <main className={styles.wrap}>
        <section id="plans" className={styles.section} aria-labelledby="plans-title">
          <h2 id="plans-title" className={styles.sectionTitle}>Pick your plan</h2>
          <p className={styles.sectionSub}>Every plan lets you sell, take bookings and get paid. Upgrade as you grow.</p>
          <div className={styles.cards}>
            {PLANS.map((p, i) => (
              <div key={p.name} className={`${styles.card} ${p.featured ? styles.featured : ""}`}>
                {p.featured && <span className={styles.tag}>Most popular</span>}
                <h3>{p.name}</h3>
                <div className={styles.price}>${p.price}<small> per month</small></div>
                <p className={styles.best}>{p.best}</p>
                <ul>{p.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
                <button
                  type="button"
                  className={`${styles.btn} ${p.featured ? styles.btnGold : styles.btnGhost}`}
                  onClick={() => showPlan(i)}
                >
                  See everything in {p.name}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section id="finder" className={`${styles.section} ${styles.noPrint}`} aria-labelledby="finder-title">
          <h2 id="finder-title" className={styles.sectionTitle}>Not sure which plan?</h2>
          <p className={styles.sectionSub}>Answer three quick questions and we will point you to the right one.</p>
          <div className={styles.finder}>
            {FINDER_QUESTIONS.map((q) => (
              <div key={q.key} className={styles.q}>
                <div className={styles.qLabel}>{q.label}</div>
                <div className={styles.opts}>
                  {q.options.map((o, v) => (
                    <button
                      key={o}
                      type="button"
                      className={styles.opt}
                      aria-pressed={answers[q.key] === v}
                      onClick={() => setAnswers((a) => ({ ...a, [q.key]: v }))}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className={`${styles.result} ${answered ? styles.show : ""}`} aria-live="polite">
              {answered && (
                <>
                  <div>
                    <div className={styles.rPlan}>We recommend {PLANS[recommended].name}</div>
                    <div className={styles.rWhy}>{FINDER_WHY[recommended]}</div>
                  </div>
                  <button type="button" className={`${styles.btn} ${styles.btnGold}`} onClick={() => showPlan(recommended)}>
                    See what is included
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <section id="compare" ref={compareRef} className={styles.section} aria-labelledby="compare-title">
          <h2 id="compare-title" className={styles.sectionTitle}>Compare every feature</h2>
          <p className={styles.sectionSub}>A straight answer on what each plan includes.</p>

          <div className={styles.mobileCompare}>
            <div className={styles.tabs} role="tablist" aria-label="Choose a plan">
              {PLANS.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  role="tab"
                  aria-selected={plan === i}
                  className={styles.tab}
                  onClick={() => setPlan(i)}
                >
                  {p.name}
                  <small>${p.price}/mo</small>
                </button>
              ))}
            </div>
            <p className={styles.mSummary}>
              <b>{PLANS[plan].name}</b> includes <b>{included} of {allRows.length}</b> features. Tap another plan to compare.
            </p>
            <div role="tabpanel">
              {FEATURE_GROUPS.map((g) => (
                <div key={g.title} className={styles.mGroup}>
                  <h4>{g.title}</h4>
                  {g.rows.map((r) => {
                    const c = r.cells[plan];
                    const off = isOff(c);
                    return (
                      <div key={r.name} className={`${styles.mRow} ${off ? styles.off : ""}`}>
                        {off
                          ? <span className={styles.no} aria-label="Not included">✕</span>
                          : <span className={styles.yes} aria-label="Included">✓</span>}
                        <div className={styles.txt}>
                          <span className={styles.fn}>{r.name}</span>
                          {r.desc && <span className={styles.fd}>{r.desc}</span>}
                          {(c.kind === "value" || c.kind === "soon") && (
                            <div className={styles.pill}>
                              {c.kind === "value" && <span className={styles.val}>{c.text}</span>}
                              {(c.kind === "soon" || (c.kind === "value" && c.soon)) && <span className={styles.soon}>Coming soon</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.desktopCompare}>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    {PLANS.map((p) => (
                      <th key={p.name} scope="col" className={p.featured ? styles.fc : undefined}>
                        {p.name}<span className={styles.thPrice}>${p.price}/mo</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_GROUPS.map((g) => [
                    <tr key={g.title} className={styles.group}><td colSpan={4}>{g.title}</td></tr>,
                    ...g.rows.map((r) => (
                      <tr key={g.title + r.name}>
                        <td>
                          <span className={styles.fn}>{r.name}</span>
                          {r.desc && <span className={styles.fd}>{r.desc}</span>}
                        </td>
                        {r.cells.map((c, i) => (
                          <td key={i} className={PLANS[i].featured ? styles.fc : undefined}><TableCell cell={c} /></td>
                        ))}
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
            <div className={styles.legend}>
              <span><span className={styles.yes}>✓</span> Included</span>
              <span><span className={styles.no}>✕</span> Not included</span>
              <span><span className={styles.soon}>Coming soon</span> Part of the plan once it launches</span>
            </div>
          </div>
        </section>

        <section id="calc" className={`${styles.section} ${styles.noPrint}`} aria-labelledby="calc-title">
          <h2 id="calc-title" className={styles.sectionTitle}>See what you take home</h2>
          <p className={styles.sectionSub}>Type in your monthly sales and see your payout.</p>
          <div className={styles.calc}>
            <div className={styles.panel}>
              <label htmlFor="fb-sales" className={styles.calcLabel}>Your monthly sales</label>
              <div className={styles.moneyIn}>
                <span>$</span>
                <input
                  id="fb-sales"
                  inputMode="numeric"
                  autoComplete="off"
                  value={sales ? sales.toLocaleString("en-US") : ""}
                  onChange={(e) => setSales(Math.min(1000000, parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 0))}
                  aria-describedby="fb-calc-help"
                />
              </div>
              <input
                type="range"
                className={styles.range}
                min={0}
                max={20000}
                step={100}
                value={Math.min(sales, 20000)}
                onChange={(e) => setSales(+e.target.value)}
                aria-label="Monthly sales slider"
              />
              <div className={styles.opts} style={{ marginTop: 10 }}>
                {[1000, 5000, 10000].map((amt) => (
                  <button key={amt} type="button" className={styles.opt} onClick={() => setSales(amt)}>{fmt(amt)}</button>
                ))}
              </div>
              <p id="fb-calc-help" className={styles.calcNote}>Use the price of your services and products before the customer service fee.</p>
            </div>
            <div className={styles.panel} aria-live="polite">
              <div className={styles.calcRow}><span>Your customers pay, including the 8% service fee</span><b>{fmt(sales * 1.08)}</b></div>
              <div className={styles.calcRow}><span>Outsyde platform fee, 2%</span><b>{fmt(sales * 0.02)}</b></div>
              <div className={`${styles.calcRow} ${styles.hl}`}><span>Paid out to you</span><b>{fmt(sales * 0.98)}</b></div>
              <p className={styles.calcNote}>The service fee is added on top of your price, so it never comes out of your pocket. Plan prices are billed separately.</p>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="benefit-title">
          <h2 id="benefit-title" className={styles.sectionTitle}>How each plan helps your business</h2>
          <p className={styles.sectionSub}>What you actually get out of it, in plain terms.</p>
          <div className={styles.benefitGrid}>
            <article className={styles.panel}>
              <h3>Starter</h3>
              <div className={styles.who}>For businesses getting set up to sell and book online</div>
              <p>Starter puts your products and services in front of Outsyde shoppers and lets them book and pay you without the back and forth of texts and DMs. Deposits protect your time, and every payment lands in your bank through Stripe.</p>
              <p>Your customers earn loyalty points every time they buy from you, which gives them a reason to come back. You also get a clear overview of your revenue, orders, bookings and rating, so you always know where you stand.</p>
            </article>
            <article className={`${styles.panel} ${styles.panelFeatured}`}>
              <h3>Growth</h3>
              <div className={styles.who}>For businesses ready to build a brand and grow with data</div>
              <p>Growth gives you your own website, connected to your Outsyde store and bookings, so you have a professional home online without paying a designer. The Authority badge shows new customers you are a verified business they can trust.</p>
              <p>You also see what is working. Charts show your sales over time, booking health shows how many visits turn into bookings and how often people cancel, and you learn who your customers are, where they are, and which services earn you the most. Room for up to 8 team members lets you grow your staff too.</p>
            </article>
            <article className={styles.panel}>
              <h3>Pro</h3>
              <div className={styles.who}>For established businesses that want every advantage</div>
              <p>Pro includes everything in Growth and removes the limit on staff, so your whole team can work from one account. You see your busiest booking times, so you can staff up and price smart, and a revenue forecast helps you plan ahead.</p>
              <p>Year over year growth shows how far you have come. As influencer placements, shoot credits and marketing services launch, Pro members get the most of them and the biggest discount.</p>
            </article>
          </div>
        </section>

        <section className={`${styles.section} ${styles.infoGrid}`} aria-label="Fees and getting started">
          <div className={styles.panel}>
            <h3>Simple, fair fees</h3>
            <p>Fees are the same on every plan. Your customer pays a small service fee on top of your price, and Outsyde keeps 2% of your sale.</p>
            <div className={styles.split}>
              <div><b>8%</b><span>Paid by your customer</span></div>
              <div><b>2%</b><span>Outsyde platform fee</span></div>
              <div><b>98%</b><span>Paid out to you</span></div>
            </div>
            <p>Example: on a $100 service, your customer pays $108 and you receive $98.</p>
          </div>
          <div className={styles.panel}>
            <h3>Getting started</h3>
            <ol className={styles.steps}>
              <li>Apply as a business on Outsyde.</li>
              <li>Once you are approved, connect Stripe so you can get paid.</li>
              <li>Choose your plan and add your products and services.</li>
              <li>Go live and start taking orders and bookings.</li>
            </ol>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.pointsBlock}`} aria-labelledby="points-title">
          <h3 id="points-title">Loyalty points your customers love</h3>
          <p>Points accumulate with every transaction across all Outsyde powered stores. Redeem them at checkout for a discount on your next purchase.</p>
          <p>Points are added automatically with every purchase. The more you shop, the more you save.</p>
        </section>

        <section className={`${styles.section} ${styles.faq}`} aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.sectionTitle}>Questions businesses ask</h2>
          <p className={styles.sectionSub}>Quick answers before you apply.</p>
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>

        <section ref={ctaRef} className={styles.cta} aria-labelledby="cta-title">
          <h2 id="cta-title">Ready to grow<br />Outsyde?</h2>
          <p>Apply today and our team will help you get set up.</p>
          <a className={`${styles.btn} ${styles.btnGold}`} href={APPLY_HREF}>Apply as a business</a>
        </section>
      </main>

      <footer className={styles.footer}>
        Outsyde LLC · <Link href="/">goutsyde.com</Link> · Questions? <a href="mailto:info@goutsyde.com">info@goutsyde.com</a>
      </footer>

      <div className={`${styles.sticky} ${showSticky ? styles.stickyShow : ""}`} aria-hidden={!showSticky}>
        <div className={styles.sTxt}><b>Plans from $29 a month</b>Keep 98% of every sale</div>
        <a className={`${styles.btn} ${styles.btnGold}`} href={APPLY_HREF} tabIndex={showSticky ? 0 : -1}>Apply now</a>
      </div>
    </div>
  );
}
