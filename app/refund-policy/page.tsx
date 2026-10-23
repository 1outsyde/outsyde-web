import LegalLayout, { LegalSectionBlock as Section } from "@/components/LegalLayout";

export const metadata = {
  title: "Refund Policy",
  description: "How refunds work for bookings, product orders and event tickets on Outsyde.",
  alternates: { canonical: "/refund-policy" },
};

const SECTIONS = [
  { id: "marketplace", label: "1. Outsyde Is a Marketplace" },
  { id: "service-fee", label: "2. Service Fee" },
  { id: "bookings", label: "3. Bookings and Appointments" },
  { id: "products", label: "4. Product Orders" },
  { id: "events", label: "5. Event Tickets" },
  { id: "rewards", label: "6. Outsyde Loyalty Rewards" },
  { id: "issued", label: "7. How Refunds Are Issued" },
  { id: "request", label: "8. Requesting a Refund" },
  { id: "disputes", label: "9. Chargebacks and Disputes" },
  { id: "changes", label: "10. Changes to This Policy" },
  { id: "contact", label: "11. Contact" },
];

export default function RefundPolicyPage() {
  return (
    <LegalLayout title={["Refund", "Policy"]} current="/refund-policy" updated="October 23, 2026" sections={SECTIONS}>
      <p>
        This Refund Policy explains how refunds work for purchases made through Outsyde LLC (&quot;Outsyde,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), including the Outsyde mobile application, goutsyde.com and every Outsyde powered vendor website (together, the &quot;Platform&quot;). This policy is part of our <a href="/terms">Terms of Service</a>. By booking, buying or purchasing tickets on the Platform, you agree to it.
      </p>

      <div className="legal-summary">
        <h2>The Short Version</h2>
        <ul>
          <li>The service fee is never refundable.</li>
          <li>Deposits are non refundable once a booking is confirmed.</li>
          <li>If a vendor cancels your appointment, you are refunded automatically, less the service fee.</li>
          <li>If you cancel, miss or break a vendor&apos;s policy, that vendor&apos;s policy decides any refund.</li>
          <li>Product refunds are guaranteed only when the seller is at fault, not the carrier.</li>
        </ul>
      </div>

      <Section id="marketplace" title="1. Outsyde Is a Marketplace">
        <p>Every business, photographer, seller and event organizer on the Platform (each a &quot;Vendor&quot;) is an independent business. Vendors are not employees, agents or partners of Outsyde. Outsyde provides the Platform and processes payments and refunds on behalf of Vendors, but each refund is funded by the Vendor responsible for the purchase, not by Outsyde.</p>
        <p>Each Vendor may publish its own terms and cancellation policy. <strong>Before you book or buy, please review the policy of the Vendor you are purchasing from.</strong> Where this Refund Policy and a Vendor&apos;s policy differ, this Refund Policy controls on the points it covers.</p>
      </Section>

      <Section id="service-fee" title="2. Service Fee">
        <p>A service fee is charged on transactions made through the Platform. <strong>The service fee is non refundable in all cases</strong>, including bookings with or without a deposit, product orders and event tickets, except where a refund of the fee is required by law.</p>
      </Section>

      <Section id="bookings" title="3. Bookings and Appointments">
        <h3>A. Deposits</h3>
        <p>When a service requires a deposit, the deposit is non refundable once your booking is confirmed.</p>
        <h3>B. If the Vendor Cancels</h3>
        <p>If a Vendor cancels a confirmed booking before the scheduled appointment, you will automatically receive a refund of the full amount you paid through the Platform, less the service fee. You do not need to request this refund.</p>
        <h3>C. If You Cancel, Miss or Arrive Late</h3>
        <p>If you cancel, do not show up, arrive late or otherwise do not follow a Vendor&apos;s terms or cancellation policy, that Vendor&apos;s policy determines whether any refund is owed and in what amount.</p>
        <h3>D. Requests Awaiting Approval</h3>
        <p>Some Vendors approve each booking by hand. For these bookings your card is authorized but not charged until the Vendor accepts. If the Vendor declines, or the request expires, the authorization is released and you are not charged.</p>
        <h3>E. Amounts Paid in Person</h3>
        <p>Outsyde can only refund amounts paid through the Platform. Any balance you pay directly to a Vendor is a matter between you and that Vendor.</p>
      </Section>

      <Section id="products" title="4. Product Orders">
        <p>A refund for a product order is guaranteed only when the problem is the fault of the Vendor, for example:</p>
        <ul>
          <li>You received the wrong item.</li>
          <li>Items were missing from your order.</li>
          <li>The item was defective or damaged before it was shipped.</li>
          <li>The Vendor cancels your order before it ships.</li>
        </ul>
        <p>Problems caused by the shipping carrier, including delays, loss or damage after your order is handed to the carrier, are not covered by this guarantee. See our <a href="/shipping-policy">Shipping Policy</a>. Requests must be made within 14 days of delivery. Any other return or exchange is subject to the Vendor&apos;s own policy.</p>
      </Section>

      <Section id="events" title="5. Event Tickets">
        <p>Each event organizer sets the refund policy for their event, which is shown on the event page before you buy. Once an event is published, its refund policy may only be changed to become more flexible for ticket holders. If the organizer cancels the event, you will receive a refund of the ticket price, less the service fee.</p>
      </Section>

      <Section id="rewards" title="6. Outsyde Loyalty Rewards">
        <p>Points earned through the Outsyde loyalty rewards program are tied to the purchase that earned them. When a purchase is refunded, the points earned on it are removed from your account. If you redeemed points on a purchase that is fully refunded, the redeemed reward may be returned to your account.</p>
      </Section>

      <Section id="issued" title="7. How Refunds Are Issued">
        <p>Approved refunds are returned to the original payment method. Refunds generally appear within 5 to 10 business days, depending on your bank or card issuer. A refund will never exceed the amount you paid through the Platform.</p>
      </Section>

      <Section id="request" title="8. Requesting a Refund">
        <p>Please contact the Vendor first through Outsyde messages. If the matter is not resolved, email us at <a href="mailto:info@goutsyde.com">info@goutsyde.com</a> with your order or booking number, and we will review the request under this policy.</p>
      </Section>

      <Section id="disputes" title="9. Chargebacks and Disputes">
        <p>We ask that you contact the Vendor or Outsyde before disputing a charge with your bank. If a dispute is filed, Outsyde may share the transaction record, booking details and communications with our payment processor to respond to it.</p>
      </Section>

      <Section id="changes" title="10. Changes to This Policy">
        <p>We may update this Refund Policy from time to time. The updated version takes effect when posted, as shown by the Last Updated date above, and applies to purchases made after that date.</p>
      </Section>

      <Section id="contact" title="11. Contact">
        <p>
          Outsyde LLC<br />
          54 State Street, Ste 804 #13315, Albany, New York 12207, US<br />
          Email: <a href="mailto:info@goutsyde.com">info@goutsyde.com</a>
        </p>
      </Section>
    </LegalLayout>
  );
}
