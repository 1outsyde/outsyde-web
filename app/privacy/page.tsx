export const metadata = {
  title: 'Privacy Policy | Outsyde',
  description: 'Outsyde Privacy Policy — last updated July 2026.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif', color: '#C9A84C' }}>
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-400 mb-12">Last Updated: July 25, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-gray-300 leading-relaxed">

          <p>Welcome to Outsyde LLC ("Outsyde," "we," "our," or "us"). Outsyde values your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, store, and protect information when you use the Outsyde mobile application, website, and related services (collectively, the "Platform").</p>
          <p>By creating an account or using the Platform, you agree to this Privacy Policy.</p>

          <Section title="1. Information We Collect">
            <SubSection title="A. Account Information (All Users)">
              <p>When creating an account, we collect:</p>
              <ul>
                <li>Full name (first and last)</li>
                <li>Username (public handle)</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Password (encrypted; never stored in plaintext)</li>
                <li>Profile photo</li>
                <li>Date of birth</li>
                <li>Gender (optional)</li>
                <li>Ethnicity (optional)</li>
                <li>Shopping frequency and lifestyle preferences (optional)</li>
              </ul>
            </SubSection>
            <SubSection title="B. Consumer-Specific Information">
              <ul>
                <li>Home address: Street address, apartment/unit, city, state, ZIP code, and country</li>
                <li>Billing address: Separate billing address if different from home address</li>
                <li>Shipping addresses: Saved for order delivery</li>
                <li>Selected industries, niches, and values: Used to personalize your experience</li>
                <li>Household size, income range, education level, and occupation (optional)</li>
              </ul>
            </SubSection>
            <SubSection title="C. Business (Vendor) Information">
              <ul>
                <li>Business name, category, tagline, and description</li>
                <li>Business address, city, state, ZIP code, and country</li>
                <li>Business type, years in business, and employee count</li>
                <li>Website URL and social media handles</li>
                <li>Service listings, product listings, hours of operation</li>
                <li>Brand colors, logo, cover images, and cover videos</li>
                <li>Stripe Connect account status and onboarding information</li>
              </ul>
            </SubSection>
            <SubSection title="D. Photographer-Specific Information">
              <ul>
                <li>Display name and biography</li>
                <li>Studio name and address (if applicable)</li>
                <li>Shoot location type, travel radius, and pricing</li>
                <li>Specialties, equipment level, and experience level</li>
                <li>Portfolio URL, portfolio images and videos</li>
                <li>Delivery turnaround time</li>
              </ul>
            </SubSection>
            <SubSection title="E. Payment and Financial Information">
              <p>Payments are processed by Stripe. Outsyde does not store full credit card numbers, CVV codes, or bank account credentials. We store:</p>
              <ul>
                <li>Stripe Customer ID — a token reference for saved payment methods</li>
                <li>Stripe Payment Method ID — a token reference for your default saved card</li>
                <li>Stripe Connect Account ID — for businesses, photographers, staff, and influencers who receive payouts</li>
                <li>Payment Intent IDs — references linking transactions to bookings or orders</li>
                <li>Computed fee breakdowns — platform fee, vendor net, and payout amounts</li>
              </ul>
              <p>Stripe may collect additional identity and financial verification information through their hosted onboarding flow, governed by Stripe's Privacy Policy (stripe.com/privacy).</p>
            </SubSection>
            <SubSection title="F. Booking Information">
              <ul>
                <li>Appointment dates, times, and duration</li>
                <li>Selected services and assigned staff members</li>
                <li>Booking status and history (confirmed, cancelled, rescheduled)</li>
                <li>Cancellation and refund history</li>
                <li>Notes associated with appointments</li>
                <li>Customer service address (when service is performed at your location)</li>
              </ul>
            </SubSection>
            <SubSection title="G. Order Information">
              <ul>
                <li>Products purchased and quantities</li>
                <li>Order history and transaction amounts</li>
                <li>Shipping address at time of order</li>
                <li>Carrier, tracking, delivery, and fulfillment status</li>
                <li>Refund and return status</li>
              </ul>
            </SubSection>
            <SubSection title="H. Location Information">
              <p>With your permission, Outsyde may collect location data to display nearby businesses, pre-fill forms, improve discovery, and record service locations for bookings. We collect:</p>
              <ul>
                <li>GPS coordinates (latitude and longitude) — when you use location-enabled features</li>
                <li>Address-derived coordinates — geocoded via Google Places API when you enter an address</li>
                <li>City and state — reverse-geocoded from GPS during signup for form pre-fill</li>
              </ul>
              <p>Location permissions may be disabled at any time through your device settings.</p>
            </SubSection>
            <SubSection title="I. Media and Uploaded Files">
              <p>We collect images and videos you upload, including profile photos, cover photos, business logos, product images, portfolio media, and feed posts.</p>
              <p>Images are stored by Cloudflare R2. Videos are hosted and streamed by Mux. When you delete a video, we instruct Mux to delete the asset from their servers.</p>
            </SubSection>
            <SubSection title="J. Staff Member Information">
              <p>Staff members of a business provide: display name, biography, profile photo, email, phone, assigned services, role, availability, and Stripe Connect account information for direct payouts.</p>
            </SubSection>
            <SubSection title="K. Influencer Information">
              <p>Influencer Program applicants provide: Instagram and TikTok handles, total follower count, and a biography.</p>
            </SubSection>
            <SubSection title="L. Messaging">
              <p>Messages exchanged through the Platform are stored in plaintext in our database. Messages are not end-to-end encrypted. Users should avoid sharing passwords, financial details, or government IDs through Platform messaging.</p>
            </SubSection>
            <SubSection title="M. Automatically Collected Information">
              <p>When you use Outsyde we automatically collect:</p>
              <ul>
                <li>Device type and operating system</li>
                <li>IP address</li>
                <li>App usage sessions and timestamps</li>
                <li>Expo push notification token (device-level identifier)</li>
                <li>Log files and error reports</li>
                <li>Behavioral engagement data (watch time, completion rate, share rate, save rate, comment rate, like rate) — used solely to personalize your feed; retained for up to your last 100 interactions; not sold to advertisers</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul>
              <li>Create and manage your account</li>
              <li>Process bookings, marketplace purchases, and payments</li>
              <li>Facilitate vendor and staff payouts via Stripe Connect</li>
              <li>Deliver orders and provide shipping updates</li>
              <li>Provide customer support and resolve disputes</li>
              <li>Verify accounts and prevent fraud</li>
              <li>Personalize your discovery feed and recommendations</li>
              <li>Operate loyalty and rewards programs (Outside Points)</li>
              <li>Send transactional communications and push notifications</li>
              <li>Sync booking events to your Google Calendar (if you connect it)</li>
              <li>Improve Platform performance and search functionality</li>
              <li>Generate analytics for vendors about their own business performance</li>
              <li>Enforce our Terms of Service and comply with legal obligations</li>
            </ul>
          </Section>

          <Section title="3. Push Notifications">
            <p>If enabled, Outsyde may send push notifications regarding bookings, orders, messages, promotions, and security alerts.</p>
            <p>Push notifications are delivered via Expo's push notification infrastructure. Your device's Expo push token is stored in our database and transmitted to Expo's servers solely to deliver notifications to your device.</p>
            <p>You may disable notifications at any time through your device settings.</p>
          </Section>

          <Section title="4. Third-Party Services">
            <p>Outsyde integrates with the following third-party service providers. Each provider maintains its own privacy practices.</p>
            <ul>
              <li><strong>Stripe</strong> — Payment processing, saved cards, vendor/staff payouts (Stripe Connect), KYC onboarding</li>
              <li><strong>Mux</strong> — Video hosting and streaming</li>
              <li><strong>Cloudflare R2</strong> — Image storage (profile photos, banners, product images, post images)</li>
              <li><strong>Resend</strong> — Transactional email delivery (booking confirmations, invites, password resets)</li>
              <li><strong>Expo Push Notifications</strong> — Mobile push notification delivery (uses your Expo push token)</li>
              <li><strong>Google Places API</strong> — Address autocomplete and geocoding (coordinates stored in our database)</li>
              <li><strong>Google OAuth</strong> — Sign-in with Google (name, email, profile photo URL, and Google account ID)</li>
              <li><strong>Apple Sign-In</strong> — Sign-in with Apple (Apple ID, name if provided, and email address)</li>
              <li><strong>Google Calendar API</strong> — Booking calendar sync for providers (booking details written to your connected calendar)</li>
              <li><strong>Neon</strong> — Managed PostgreSQL database hosting (all user data stored in our database is hosted on Neon's infrastructure)</li>
              <li><strong>Render</strong> — Backend server hosting (all server traffic passes through Render's infrastructure)</li>
            </ul>
          </Section>

          <Section title="5. Sharing Your Information">
            <p>We may share your information with:</p>
            <ul>
              <li><strong>Service Providers</strong> — The third-party services listed in Section 4, as necessary to operate the Platform</li>
              <li><strong>Vendors and Service Providers on the Platform</strong> — When you place an order or booking, relevant details (name, shipping address, contact) are shared with the fulfilling party</li>
              <li><strong>Other Users</strong> — Public information such as your name, username, profile photo, bio, reviews, ratings, and public listings</li>
              <li><strong>Legal Authorities</strong> — When required by law, legal process, or governmental request</li>
              <li><strong>Business Transfers</strong> — In connection with a merger, acquisition, financing, or sale of assets</li>
            </ul>
          </Section>

          <Section title="6. Reviews and Ratings">
            <p>Reviews you submit may become publicly visible on vendor or staff profiles. Vendors and staff may respond to reviews. We reserve the right to remove reviews that violate our policies.</p>
          </Section>

          <Section title="7. Influencer Referral Tracking">
            <p>If you use an influencer referral or promo code, Outsyde records the referral event including the associated click, purchase, and revenue attributed to that code. This data is used to calculate influencer commissions.</p>
          </Section>

          <Section title="8. Data Security">
            <p>We implement administrative, technical, and physical safeguards to protect your information, including encrypted credential storage and PCI-compliant payment processing via Stripe.</p>
            <p>No internet transmission or electronic storage system can be guaranteed completely secure. We encourage you to use a strong, unique password and contact us immediately if you suspect unauthorized access.</p>
          </Section>

          <Section title="9. Data Retention">
            <p>We retain your information only as long as necessary to provide our services, resolve disputes, detect fraud, meet legal and tax obligations, and enforce our agreements.</p>
            <p>Some financial and transaction records may be retained as required by law even after account deletion.</p>
          </Section>

          <Section title="10. Account Deletion" id="account-deletion">
            <p>You may request deletion of your account directly through the app under Settings → Account → Delete Account, or by contacting us at <a href="mailto:info@goutsyde.com" className="underline text-yellow-400">info@goutsyde.com</a>.</p>
            <p>Following a deletion request, your account is scheduled for permanent removal after a 30-day grace period, during which you may cancel the request. After the grace period, personal information will be deleted or anonymized where reasonably possible.</p>
            <p>Certain records may be retained for tax compliance, fraud prevention, legal obligations, or dispute resolution. Active orders, bookings, or outstanding Stripe balances may delay deletion.</p>
          </Section>

          <Section title="11. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Restrict or object to certain processing</li>
              <li>Export your information where applicable</li>
              <li>Opt out of certain marketing communications</li>
            </ul>
            <p>To exercise any of these rights, contact us at <a href="mailto:info@goutsyde.com" className="underline text-yellow-400">info@goutsyde.com</a>.</p>
          </Section>

          <Section title="12. Children's Privacy">
            <p>Outsyde is not intended for individuals under 18 years of age. We do not knowingly collect personal information from minors. If we become aware that such information has been collected, we will take appropriate steps to delete it promptly.</p>
          </Section>

          <Section title="13. Sensitive Personal Information">
            <p>During signup, consumers may optionally provide gender, ethnicity, and demographic information. This information is used solely to personalize your experience and generate aggregate, anonymized platform insights. We do not sell this information or use it for targeted advertising.</p>
          </Section>

          <Section title="14. Cookies and Tracking Technologies">
            <p>Our website may use cookies and similar technologies to remember preferences, maintain sessions, analyze traffic, and improve performance. Users may manage cookie preferences through their browser settings.</p>
          </Section>

          <Section title="15. New York SHIELD Act">
            <p>For users located in New York, Outsyde maintains reasonable administrative, technical, and physical safeguards designed to protect private information in compliance with the New York SHIELD Act.</p>
          </Section>

          <Section title="16. Changes to This Privacy Policy">
            <p>We may update this Privacy Policy periodically. When material changes occur, we will update the "Last Updated" date and, where appropriate, notify users through the Platform. Continued use of Outsyde after changes become effective constitutes acceptance of the updated Privacy Policy.</p>
          </Section>

          <Section title="17. Contact Information">
            <p>
              Outsyde LLC<br />
              Email: <a href="mailto:info@goutsyde.com" className="underline text-yellow-400">info@goutsyde.com</a><br />
              Website: <a href="https://goutsyde.com" className="underline text-yellow-400">https://goutsyde.com</a>
            </p>
          </Section>

        </div>
      </div>
    </main>
  )
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id}>
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