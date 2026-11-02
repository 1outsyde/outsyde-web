import Link from "next/link";
import { TICKET_TERMS_LEAD } from "../_shared/format";

/** "By getting tickets or RSVPing (By paying), you agree to the Terms of Service and the Refund Policy." Links open a new tab. */
export default function TicketTerms({ kind }: { kind: keyof typeof TICKET_TERMS_LEAD }) {
  const link = { color: "#E8B930", fontWeight: 600 } as const;
  return (
    <p className="ev-muted" data-testid={`ticket-terms-${kind}`} style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "#B8B0A0" }}>
      {TICKET_TERMS_LEAD[kind]}
      <Link href="/terms" target="_blank" rel="noopener" style={link}>Terms of Service</Link>
      {" and the "}
      <Link href="/refund-policy" target="_blank" rel="noopener" style={link}>Refund Policy</Link>
      .
    </p>
  );
}
