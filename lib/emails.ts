// ── PASTE THIS AT THE BOTTOM OF lib/emails.ts ────────────────────────────────

// ===== ROYAL ELITE MOVING — ESTIMATE REQUEST =====
export async function sendRoyalEliteEstimate(p: {
  name: string;
  email: string;
  phone: string;
  moveDate: string;
  moveType: string;
  homeSize: string;
  fromAddress: string;
  toAddress: string;
  floor: string;
  stops: string;
  notes: string;
}) {
  function row(label: string, value?: string): string {
    return `
      <tr>
        <td style="padding:9px 16px;border-bottom:1px solid #ece9f2;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a7fa0;white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:9px 16px;border-bottom:1px solid #ece9f2;font-size:14px;color:#1a1a1a;">${value || "&mdash;"}</td>
      </tr>`;
  }

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #ece9f2;border-radius:8px;overflow:hidden;">
    <div style="background:#3A1A5C;padding:24px;">
      <div style="color:#E2C361;font-size:11px;letter-spacing:.2em;text-transform:uppercase;">Royal Elite Moving &middot; via Outsyde</div>
      <div style="color:#ffffff;font-size:21px;font-weight:bold;margin-top:7px;">New Move Request</div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      ${row("Customer Name",      p.name || "New Customer")}
      ${row("Email",              p.email)}
      ${row("Phone",              p.phone)}
      ${row("Preferred Move Date",p.moveDate)}
      ${row("Move Type",          p.moveType)}
      ${row("Home Size",          p.homeSize)}
      ${row("Pickup Address",     p.fromAddress)}
      ${row("Drop-off Address",   p.toAddress)}
      ${row("Floor",              p.floor)}
      ${row("Additional Stops",   p.stops || "None")}
      ${row("Notes / Special Items", p.notes || "None")}
    </table>
    <div style="padding:16px 24px;font-size:12px;color:#999;border-top:1px solid #ece9f2;">
      Reply to this email to reach the customer directly at ${p.email}.
    </div>
  </div>`;

  return sendEmail({
    to: ["info@goutsyde.com", "Bprovisionproperties@yahoo.com"],
    reply_to: p.email,
    subject: `New Move Request — ${p.name || "Royal Elite Moving"}`,
    html,
  });
}