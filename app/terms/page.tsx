export const metadata = {
  title: 'Terms of Service | Outsyde',
  description: 'Outsyde Terms of Service — last updated July 2026.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif', color: '#C9A84C' }}>
          Terms of Service
        </h1>
        <p className="text-sm text-gray-400 mb-12">Last Updated: July 25, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-gray-300 leading-relaxed">

          <p>Welcome to Outsyde LLC ("Outsyde," "we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of the Outsyde mobile application, website, and related services (collectively, the "Platform").</p>
          <p>By accessing or using Outsyde, you agree to be bound by these Terms and our <a href="/privacy" className="underline text-yellow-400">Privacy Policy</a>, which is incorporated herein by reference. If you do not agree, do not use the Platform.</p>
          <p>By creating an account or using the Platform, you also consent to receive electronic communications, notices, and agreements digitally, and agree that electronic records satisfy any legal requirement that such communications be in writing.</p>

          <Section title="1. About Outsyde">
            <p>Outsyde is a technology-based multi-vendor marketplace, booking, and discovery platform that connects consumers with independent local businesses, vendors, photographers, influencers, creatives, and service providers ("Providers").</p>
            <p>Outsyde does not provide services or sell products directly unless explicitly stated. All services and products are offered by independent third-party Providers using the Platform.</p>
            <p>Outsyde acts solely as a facilitator and intermediary — not as a service provider, employer, agent, or partner of any Provider.</p>
          </Section>

          <Section title="2. Eligibility">
            <p>You must be at least 18 years old to use Outsyde. By using the Platform, you represent that:</p>
            <ul>
              <li>You are legally capable of entering into a binding agreement</li>
              <li>All information you provide is accurate, current, and complete</li>
              <li>You are not prohibited from using the Platform under any applicable law</li>
            </ul>
          </Section>

          <Section title="3. User Accounts">
            <p>You are responsible for safeguarding your login credentials and for all activity that occurs under your account.</p>
            <p>Outsyde may suspend, restrict, or terminate accounts for:</p>
            <ul>
              <li>Fraud, misrepresentation, or impersonation</li>
              <li>Violation of these Terms or applicable law</li>
              <li>Abuse, harassment, or platform manipulation</li>
              <li>Circumvention of fees, payments, or platform systems</li>
              <li>Activity that poses risk to users, Providers, or the Platform</li>
            </ul>
            <p>Outsyde may request identity verification, business documentation, tax information, or bank verification at any time. Failure to provide requested verification may result in restricted or suspended access.</p>
          </Section>

          <Section title="4. User Roles & Role-Specific Terms">
            <SubSection title="A. Consumers (Clients / Customers)">
              <p>Consumers may browse, book services, purchase products, and interact with Providers through the Platform. Consumers acknowledge that:</p>
              <ul>
                <li>All services and products are provided by independent third-party Providers</li>
                <li>Outsyde is not responsible for fulfillment, quality, safety, or outcomes</li>
                <li>Refunds and cancellations are governed by Provider policies and these Terms</li>
                <li>Reviews submitted must reflect genuine personal experiences</li>
              </ul>
            </SubSection>
            <SubSection title="B. Businesses & Vendors">
              <p>By using Outsyde as a business or vendor, you agree that:</p>
              <ul>
                <li>You are a legally registered or operating business</li>
                <li>You are solely responsible for product quality, accuracy of listings, fulfillment, shipping, inventory management, taxes, licenses, and legal compliance</li>
                <li>You will only list and sell products you legally own or have the right to sell</li>
                <li>You will accurately describe all products and services</li>
                <li>You will fulfill orders promptly and provide tracking information when applicable</li>
                <li>Outsyde does not store, handle, or ship inventory</li>
                <li>Outsyde is not liable for customer disputes, chargebacks, or business losses</li>
              </ul>
            </SubSection>
            <SubSection title="C. Photographers & Service Providers">
              <p>Photographers and service providers operate as independent contractors. They acknowledge that:</p>
              <ul>
                <li>They are solely responsible for their own equipment, conduct, safety, and deliverables</li>
                <li>Outsyde does not guarantee bookings, clients, or income</li>
                <li>Failure to fulfill confirmed bookings may result in refund obligations, account penalties, or removal</li>
                <li>They must complete Stripe Connect onboarding before accepting payments</li>
              </ul>
            </SubSection>
            <SubSection title="D. Staff Members">
              <p>Business owners may invite staff members to operate under their business account. Staff members:</p>
              <ul>
                <li>Are not employees of Outsyde</li>
                <li>Are granted limited, role-specific access to the Platform</li>
                <li>May have access revoked by the business owner or by Outsyde at any time</li>
                <li>Are responsible for their own tax obligations</li>
              </ul>
              <p>The business owner retains oversight of all staff activity and revenue on the Platform.</p>
            </SubSection>
            <SubSection title="E. Influencers & Promoters">
              <p>Influencers acknowledge that:</p>
              <ul>
                <li>Participation requires approval and is subject to eligibility requirements</li>
                <li>Earnings are commission-based and not guaranteed</li>
                <li>Compensation is processed through Stripe Connect</li>
                <li>Misrepresentation or fraudulent promotion may result in forfeiture of earnings and removal</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="5. Subscriptions & Vendor Billing">
            <p>Outsyde offers monthly subscription plans to businesses to access platform features. Current tiers are Starter, Growth, and Pro.</p>
            <ul>
              <li>Subscriptions are billed monthly on a recurring basis and automatically renew</li>
              <li>Subscription fees are non-refundable except as required by law</li>
              <li>You may cancel at any time; cancellation takes effect at the end of the current billing cycle</li>
              <li>Failed payments may result in account suspension or feature restrictions</li>
              <li>Outsyde reserves the right to change pricing with reasonable notice</li>
            </ul>
          </Section>

          <Section title="6. Payments, Stripe & Platform Fees">
            <p>All payments are processed through Stripe, Inc. Outsyde does not store payment card information.</p>
            <p>Platform fees are charged on all transactions and are non-refundable except where required by law. Circumventing Outsyde fees or the Stripe payment system is strictly prohibited.</p>
            <p>Payouts to Providers are processed through Stripe Connect on Stripe's standard schedule. Outsyde is not responsible for Stripe delays, holds, or reversals.</p>
            <p><strong>Outside Points:</strong> Outsyde operates a loyalty rewards program. Points have no cash value, are non-transferable, and may be modified or discontinued at any time with notice.</p>
          </Section>

          <Section title="7. Bookings, Cancellations & Refunds">
            <ul>
              <li>Refunds on cancellations are determined by the Provider's published cancellation policy</li>
              <li>Full, partial, or no refunds may apply depending on how far in advance a cancellation is made</li>
              <li>If a Provider cancels a confirmed booking, the consumer receives a full refund</li>
              <li>No-shows are subject to the Provider's cancellation policy</li>
              <li>Shipping estimates are not guaranteed; Outsyde is not liable for carrier errors or delays</li>
              <li>Event tickets are non-refundable unless the event is cancelled by the organizer</li>
            </ul>
          </Section>

          <Section title="8. Independent Contractor Status">
            <p>All Providers on Outsyde operate as independent contractors. Nothing in these Terms creates an employer-employee relationship, partnership, joint venture, or agency relationship. Providers are solely responsible for their own taxes, insurance, licenses, and legal compliance.</p>
          </Section>

          <Section title="9. Prohibited Businesses & Listings">
            <p>Outsyde reserves the right to prohibit, remove, or restrict any business, listing, or account involving illegal drugs, controlled substances, firearms, counterfeit goods, adult services, pyramid schemes, hate speech, gambling, fake documents, or any product or service that violates payment processor or app store requirements.</p>
          </Section>

          <Section title="10. Messaging & Communication">
            <p>Messages may be monitored for safety and compliance. Harassment, spam, and off-platform solicitation to avoid fees are prohibited.</p>
          </Section>

          <Section title="11. Content & Media Rights">
            <p>You retain ownership of content you upload. By uploading content, you grant Outsyde a non-exclusive, royalty-free, worldwide license to host, display, and use that content to operate and promote the Platform.</p>
            <p>Outsyde owns all rights to its name, logo, branding, software, interface, and code. Nothing in these Terms transfers any Outsyde intellectual property to you.</p>
          </Section>

          <Section title="12. Reviews & Ratings">
            <p>You may not post fake, incentivized, or fabricated reviews, or review a Provider for an experience you did not have. Outsyde reserves the right to remove reviews that violate these Terms. Reviews may be revoked if the associated transaction is refunded.</p>
          </Section>

          <Section title="13. Taxes">
            <p>Consumers may be charged applicable sales tax where required by law. Providers are solely responsible for reporting and remitting their own income and self-employment taxes. Outsyde may issue tax forms (e.g., 1099-K) where required by law.</p>
          </Section>

          <Section title="14. Fraud Prevention">
            <p>Outsyde reserves the right to investigate suspicious activity, freeze transactions pending review, request verification, report illegal activity to law enforcement, and suspend accounts involved in fraud.</p>
          </Section>

          <Section title="15. Mobile Application">
            <p>Your use of the app is also subject to the terms of the Apple App Store or Google Play Store. By using the app, you consent to push notifications (disableable in device settings), location access for discovery features, and camera access for content creation.</p>
          </Section>

          <Section title="16. Platform Availability">
            <p>Outsyde provides the Platform on an "as available" basis and is not liable for losses resulting from downtime, maintenance, third-party outages, or events beyond our control.</p>
          </Section>

          <Section title="17. Disclaimers">
            <p className="uppercase text-xs tracking-wide">The platform is provided "as is" and "as available." Outsyde disclaims all warranties, express or implied. Outsyde does not guarantee results, earnings, bookings, sales, or any specific outcome from use of the Platform.</p>
          </Section>

          <Section title="18. Limitation of Liability">
            <p className="uppercase text-xs tracking-wide">To the maximum extent permitted by law, Outsyde shall not be liable for indirect, incidental, special, consequential, or punitive damages. Outsyde's total liability shall not exceed amounts paid to Outsyde in the twelve months preceding the claim.</p>
          </Section>

          <Section title="19. Indemnification">
            <p>You agree to indemnify and hold harmless Outsyde LLC from any claims arising from your use of the Platform, your services or products, or your violation of these Terms.</p>
          </Section>

          <Section title="20. Prohibited Conduct">
            <p>You may not commit fraud, harass users, upload illegal content, manipulate reviews, bypass payments, solicit users off-platform, or create multiple accounts to evade suspension. Violations may result in immediate termination.</p>
          </Section>

          <Section title="21. Termination">
            <p>Outsyde may suspend or terminate access at any time for violations of these Terms. You may request account deletion through the app. Deletion requests are subject to a 30-day grace period.</p>
          </Section>

          <Section title="22. Governing Law & Dispute Resolution">
            <p>These Terms are governed by the laws of the State of New York. Disputes shall be resolved through binding individual arbitration, except where prohibited by law. You waive any right to class action litigation.</p>
          </Section>

          <Section title="23. Changes to Terms">
            <p>Outsyde may update these Terms at any time. Continued use after the effective date of any update constitutes acceptance.</p>
          </Section>

          <Section title="24. Entire Agreement">
            <p>These Terms, together with our <a href="/privacy" className="underline text-yellow-400">Privacy Policy</a>, constitute the entire agreement between you and Outsyde LLC regarding your use of the Platform.</p>
          </Section>

          <Section title="25. Contact">
            <p>Outsyde LLC<br />Email: <a href="mailto:info@goutsyde.com" className="underline text-yellow-400">info@goutsyde.com</a><br />Website: <a href="https://goutsyde.com" className="underline text-yellow-400">https://goutsyde.com</a></p>
          </Section>

        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3 text-white" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-base font-medium mb-2 text-gray-200">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}