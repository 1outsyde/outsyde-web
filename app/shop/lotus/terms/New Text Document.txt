// app/shop/lotus/terms/page.tsx
// Lotus House Blends — Terms & Conditions / Privacy / Disclaimer
//
// WHERE THIS GOES:
//   Create folder:  outsyde-web/app/shop/lotus/terms/
//   Put this file inside as:  page.tsx
//   Loads at:  localhost:3000/shop/lotus/terms

export default function LotusTerms() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root{
  --outsyde-black:#000000; --outsyde-gold:#E8B930;
  --lhb-parchment:#F2EBD9; --lhb-cream:#EDE3CC; --lhb-lavender:#7B6BAF;
  --lhb-sage:#4A6741; --lhb-brown-dark:#2A1E0E; --lhb-brown-light:#C8A882; --lhb-moss:#1E3020;
  --lhb-text-dark:#1A1208; --lhb-text-mid:#4A3820; --lhb-text-muted:#7A6A50;
}
html{scroll-behavior:smooth;}
.lhb-legal{font-family:'Jost',sans-serif;background:var(--lhb-parchment);color:var(--lhb-text-dark);min-height:100vh;}

.outsyde-nav{background:var(--outsyde-black);padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.nav-logo{display:flex;align-items:center;gap:.75rem;text-decoration:none;}
.nav-y{font-family:'Cormorant Garamond',serif;font-size:2.2rem;font-weight:600;color:var(--outsyde-gold);line-height:1;}
.nav-wordmark{font-size:.65rem;letter-spacing:.28em;color:#888;font-weight:300;}
.nav-back{display:flex;align-items:center;gap:.5rem;color:#888;font-size:.72rem;letter-spacing:.12em;text-decoration:none;font-weight:300;transition:color .2s;}
.nav-back:hover{color:var(--outsyde-gold);}

.legal-hero{background:var(--lhb-moss);color:var(--lhb-parchment);padding:4.5rem 2rem 3.5rem;text-align:center;}
.legal-hero .eyebrow{font-size:.62rem;letter-spacing:.3em;text-transform:uppercase;color:var(--lhb-brown-light);margin-bottom:1rem;}
.legal-hero h1{font-family:'Cormorant Garamond',serif;font-size:clamp(2.6rem,5vw,4rem);font-weight:300;line-height:1.05;}
.legal-hero .sub{font-size:.82rem;color:rgba(242,235,217,.6);margin-top:1rem;letter-spacing:.04em;}

.legal-body{max-width:760px;margin:0 auto;padding:4rem 2rem 5rem;}
.legal-section{margin-bottom:3.5rem;}
.legal-section > h2{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:500;color:var(--lhb-brown-dark);padding-bottom:.6rem;margin-bottom:1.5rem;border-bottom:1px solid rgba(90,62,30,.18);}
.legal-section h3{font-family:'Jost',sans-serif;font-size:.92rem;font-weight:500;color:var(--lhb-sage);letter-spacing:.02em;margin:1.8rem 0 .5rem;}
.legal-section p{font-size:.9rem;line-height:1.85;color:var(--lhb-text-mid);font-weight:300;margin-bottom:.9rem;}
.legal-section p strong{color:var(--lhb-text-dark);font-weight:500;}
.legal-meta{font-size:.78rem;color:var(--lhb-text-muted);font-style:italic;margin-bottom:2rem;}
.contact-card{background:var(--lhb-cream);border:1px solid rgba(90,62,30,.15);padding:1.5rem 1.75rem;margin-top:1rem;}
.contact-card p{margin-bottom:.4rem;font-size:.86rem;}

.legal-footer{background:var(--lhb-brown-dark);color:rgba(200,168,130,.5);padding:2rem 2.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;font-size:.7rem;letter-spacing:.04em;}
.legal-footer a{color:var(--lhb-brown-light);text-decoration:underline;text-underline-offset:3px;}
.legal-footer a:hover{color:var(--lhb-parchment);}

@media(max-width:600px){ .outsyde-nav{padding:0 1.25rem;} .legal-body{padding:2.5rem 1.25rem 3.5rem;} }
`,
        }}
      />

      <div className="lhb-legal">
        <nav className="outsyde-nav">
          <a href="/" className="nav-logo">
            <span className="nav-y">Y</span>
            <span className="nav-wordmark">OUTSYDE</span>
          </a>
          <a href="/shop/lotus" className="nav-back">← Back to Lotus House Blends</a>
        </nav>

        <header className="legal-hero">
          <div className="eyebrow">Lotus House Blends</div>
          <h1>Terms, Privacy &amp; Disclaimer</h1>
          <div className="sub">Effective Date: November 4, 2025</div>
        </header>

        <div className="legal-body">
          {/* ===== TERMS & CONDITIONS ===== */}
          <section className="legal-section">
            <h2>Terms &amp; Conditions</h2>
            <p>Welcome to Lotus House Blends, an independent vendor hosted on the Outsyde Marketplace. These Terms and Conditions (&ldquo;Terms&rdquo;) explain how we operate, sell products, and serve our customers. By purchasing through our pages or using this website, you agree to these Terms and to Outsyde&rsquo;s Marketplace Terms. If you do not agree, please discontinue use of this website.</p>

            <h3>1. About Us &amp; Marketplace Partnership</h3>
            <p>All Lotus House Blends pages operate independently within the Outsyde Marketplace, which provides the platform for online sales. Lotus House Blends is fully responsible for its products, labeling, fulfillment, and customer service. Outsyde provides only the marketplace technology and secure checkout infrastructure.</p>

            <h3>2. Eligibility &amp; Website Use</h3>
            <p>You must be at least 18 years old or have the consent of a parent or legal guardian to make a purchase or use this website. By accessing or purchasing from Lotus House Blends pages, you agree to use the site lawfully and respectfully. Fraudulent, misleading, or abusive activity may result in restricted access or cancellation of orders.</p>

            <h3>3. Product Information</h3>
            <p>All products offered on this website are herbal wellness and lifestyle items intended for personal use. Descriptions, images, and educational content are for informational purposes only. We do not guarantee specific results or make medical claims. Individual responses may vary.</p>

            <h3>4. FDA Disclosure</h3>
            <p>Statements on this website have not been evaluated by the U.S. Food and Drug Administration. Our products are not intended to diagnose, treat, cure, or prevent any disease. Consult a licensed healthcare provider if you are pregnant, nursing, taking medication, or have medical concerns.</p>

            <h3>5. Purchases &amp; Payments</h3>
            <p>All purchases are securely processed through Stripe, integrated via the Outsyde platform. Payment information is handled directly by Stripe; Outsyde does not manage funds. Prices are listed in U.S. dollars and subject to change without notice. Lotus House Blends reserves the right to cancel any order for suspected fraud, improper payment, or inaccurate information. By submitting an order, you confirm that all information provided is true and complete.</p>

            <h3>6. Shipping &amp; Delivery</h3>
            <p>Orders are processed in the order received; processing times vary by inventory and demand. All orders are fulfilled directly by Lotus House Blends. Shipping costs and estimated delivery times are shown at checkout. Lotus House Blends is not responsible for delays or damage caused by shipping carriers, weather, or events beyond our control.</p>

            <h3>7. Returns &amp; Exchanges</h3>
            <p>Because our products are herbal and consumable, all sales are final. If you receive a damaged or incorrect item, contact lotushouseblends25@gmail.com within 7 days of receipt. We will review and assist where possible. Requests outside these conditions may be denied.</p>

            <h3>8. Intellectual Property</h3>
            <p>All trademarks, logos, product names, designs, images, and written content are the exclusive property of Lotus House Blends. You may not reproduce or distribute our materials without written consent. These Terms operate in coherence with Outsyde LLC&rsquo;s Marketplace Terms and Conditions.</p>

            <h3>9. Health &amp; Safety Disclaimer</h3>
            <p>Use of our products is at your own discretion and risk. Review ingredient lists carefully before use. Lotus House Blends is not responsible for allergic reactions, misuse, or misinterpretation. Discontinue use if irritation or discomfort occurs.</p>

            <h3>10. Limitation of Liability</h3>
            <p>To the fullest extent permitted by law: Lotus House Blends is solely responsible for its products, descriptions, labeling, fulfillment, and customer service. Payments are processed securely through Stripe and remitted directly to Lotus House Blends. We are not liable for any direct, indirect, incidental, or consequential damages arising from use of this website or products.</p>

            <h3>11. Indemnification</h3>
            <p>You agree to indemnify, defend, and hold harmless Lotus House Blends, its Managing Member, and affiliates from any claims or costs arising from your violation of these Terms or misuse of products.</p>

            <h3>12. Privacy</h3>
            <p>Your submission of personal information is governed by our Privacy Policy. By using this site, you consent to the collection and use of data as described there.</p>

            <h3>13. Governing Law</h3>
            <p>These Terms are governed by the laws of the Commonwealth of Virginia. All disputes will be resolved through binding arbitration in Virginia.</p>

            <h3>14. Changes to Terms</h3>
            <p>We may update or modify these Terms at any time without notice. The current version and effective date will always appear on this page. Continued use of this site means you accept the updated Terms.</p>

            <h3>15. Contact</h3>
            <div className="contact-card">
              <p>📧 lotushouseblends25@gmail.com</p>
              <p>📍 1418 Poindexter St, Ste 101, Chesapeake, VA 23324</p>
            </div>
          </section>

          {/* ===== PRIVACY POLICY ===== */}
          <section className="legal-section">
            <h2>Privacy Policy</h2>
            <p className="legal-meta">Effective Date: November 4, 2025</p>
            <p>Lotus House Blends (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard data when you visit our website or make a purchase through any Lotus House Blends pages hosted on the Outsyde Marketplace.</p>

            <h3>1. Information We Collect</h3>
            <p><strong>Personal information:</strong> name, email, shipping address, and phone number. <strong>Payment information:</strong> processed securely through Stripe; we do not store or handle payment details. <strong>Usage data:</strong> IP address, browser type, device info, and pages visited. <strong>Cookies &amp; tracking:</strong> used to improve site performance and user experience.</p>

            <h3>2. How We Use Information</h3>
            <p>Process orders and payments. Communicate about orders or promotions (with your consent). Improve site performance and comply with legal obligations.</p>

            <h3>3. Sharing of Information</h3>
            <p>We do not sell or rent data. Limited sharing may occur only with trusted vendors such as Stripe or shipping carriers, who are bound by confidentiality.</p>

            <h3>4. Cookies &amp; Analytics</h3>
            <p>Cookies help us understand user behavior. You can disable cookies in your browser, but some features may not work correctly.</p>

            <h3>5. Data Retention &amp; Security</h3>
            <p>We retain your data only as long as necessary for legal and operational purposes. Sensitive data is encrypted and secured with industry standards.</p>

            <h3>6. Your Rights</h3>
            <p>You may request access to, correction of, or deletion of your data by emailing lotushouseblends25@gmail.com.</p>

            <h3>7. Third-Party Links</h3>
            <p>Our pages may link to external sites. Lotus House Blends is not responsible for their privacy practices or content.</p>

            <h3>8. Children&rsquo;s Privacy</h3>
            <p>Our products and website are intended for adults 18+. We do not knowingly collect information from minors.</p>

            <h3>9. Updates to Policy</h3>
            <p>We may revise this Privacy Policy at any time. The latest version with effective date will appear on this page. Continued site use implies acceptance of the latest policy.</p>

            <h3>10. Contact Information</h3>
            <div className="contact-card">
              <p>📧 lotushouseblends25@gmail.com</p>
              <p>📍 1418 Poindexter St, Ste 101, Chesapeake, VA 23324</p>
            </div>
          </section>

          {/* ===== PRODUCT DISCLAIMER ===== */}
          <section className="legal-section">
            <h2>Product Disclaimer</h2>
            <p>Lotus House Blends products are created for holistic wellness and relaxation using natural herbs. These statements have not been evaluated by the FDA. Products are not intended to diagnose, treat, cure, or prevent disease. Consult a healthcare professional before use. Products are for lifestyle and personal enjoyment only.</p>
            <p>All products are intended for wellness and lifestyle enhancement. They are formulated with natural ingredients traditionally known for their properties but are not approved by the FDA. Products are for educational and personal use only. Consult a healthcare provider before use. For adult use only (18+). Keep out of reach of children. Lotus House Blends is not liable for misuse, misinterpretation, or allergic reactions.</p>
          </section>
        </div>

        <footer className="legal-footer">
          <span>© 2026 Lotus House Blends · Sold via Go Outsyde Platform</span>
          <span><a href="/shop/lotus">Back to Lotus House Blends</a></span>
        </footer>
      </div>
    </>
  );
}