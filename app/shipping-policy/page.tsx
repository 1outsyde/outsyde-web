import LegalLayout, { LegalSectionBlock as Section } from "@/components/LegalLayout";

export const metadata = {
  title: "Shipping Policy",
  description: "How shipping, tracking and delivery work for products bought on Outsyde.",
  alternates: { canonical: "https://www.goutsyde.com/shipping-policy" },
};

const SECTIONS = [
  { id: "who-ships", label: "1. Who Ships Your Order" },
  { id: "tracking", label: "2. Tracking" },
  { id: "estimates", label: "3. Delivery Estimates" },
  { id: "carrier", label: "4. Carrier Responsibility" },
  { id: "address", label: "5. Shipping Address" },
  { id: "multiple", label: "6. Orders From Several Vendors" },
  { id: "problems", label: "7. Wrong, Missing or Defective Items" },
  { id: "changes", label: "8. Changes to This Policy" },
  { id: "contact", label: "9. Contact" },
];

export default function ShippingPolicyPage() {
  return (
    <LegalLayout title={["Shipping", "Policy"]} current="/shipping-policy" updated="October 23, 2026" sections={SECTIONS}>
      <p>
        This Shipping Policy applies to physical products purchased through Outsyde LLC (&quot;Outsyde,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), including the Outsyde mobile application, goutsyde.com and every Outsyde powered vendor website (together, the &quot;Platform&quot;). This policy is part of our <a href="/terms">Terms of Service</a> and should be read together with our <a href="/refund-policy">Refund Policy</a>.
      </p>

      <div className="legal-summary">
        <h2>The Short Version</h2>
        <ul>
          <li>Each vendor ships their own orders.</li>
          <li>Every shipment comes with a tracking number.</li>
          <li>Delivery dates are carrier estimates, not guarantees.</li>
          <li>Once your order is with the carrier, the carrier is responsible for it.</li>
        </ul>
      </div>

      <Section id="who-ships" title="1. Who Ships Your Order">
        <p>Every seller on the Platform (each a &quot;Vendor&quot;) is an independent business and ships its own orders. Outsyde does not store, pack or ship products. Shipping options, costs and processing times are shown on the product listing or at checkout.</p>
      </Section>

      <Section id="tracking" title="2. Tracking">
        <p>Vendors are required to provide a tracking number for every shipment. When your order ships, you will receive an email with the carrier and tracking number so you can follow your package. You will also be notified when your order is marked delivered.</p>
      </Section>

      <Section id="estimates" title="3. Delivery Estimates">
        <p>Delivery times are estimates provided by the carrier and are not guaranteed. Weather, holidays, carrier volume and other events outside the Vendor&apos;s control may cause delays.</p>
      </Section>

      <Section id="carrier" title="4. Carrier Responsibility">
        <p><strong>Risk of loss passes to you when the Vendor delivers your order to the carrier.</strong> From that point, the carrier is responsible for your package. Neither the Vendor nor Outsyde is responsible for delays, loss, theft, damage or misdelivery that occur while the package is in the carrier&apos;s possession or after the carrier marks it delivered.</p>
        <p>If your package is delayed, lost or damaged in transit, please contact the carrier using your tracking number. The Vendor will provide shipment details to support any claim you file with the carrier.</p>
      </Section>

      <Section id="address" title="5. Shipping Address">
        <p>You are responsible for entering a complete and accurate shipping address. Neither the Vendor nor Outsyde is responsible for orders sent to an address you provided that is incorrect or incomplete.</p>
      </Section>

      <Section id="multiple" title="6. Orders From Several Vendors">
        <p>When one checkout includes items from more than one Vendor, each Vendor ships its items separately. You may receive several packages, each with its own tracking number and delivery estimate.</p>
      </Section>

      <Section id="problems" title="7. Wrong, Missing or Defective Items">
        <p>If you receive the wrong item, an item is missing from your order, or an item was defective or damaged before it shipped, the Vendor is responsible. See section 4 of our <a href="/refund-policy#products">Refund Policy</a> for how to request a refund.</p>
      </Section>

      <Section id="changes" title="8. Changes to This Policy">
        <p>We may update this Shipping Policy from time to time. The updated version takes effect when posted, as shown by the Last Updated date above, and applies to orders placed after that date.</p>
      </Section>

      <Section id="contact" title="9. Contact">
        <p>
          Outsyde LLC<br />
          54 State Street, Ste 804 #13315, Albany, New York 12207, US<br />
          Email: <a href="mailto:info@goutsyde.com">info@goutsyde.com</a>
        </p>
      </Section>
    </LegalLayout>
  );
}
