// ===== CONTACT PAGE — INTERNAL ALERT =====
export async function sendContactInquiry(p: {
  name: string;
  email: string;
  inquiryType: string;
  message: string;
}) {
  const labelMap: Record<string, string> = {
    general: "General Inquiry",
    business: "Business Partnership / Vendor Interest",
    photographer: "Photographer Inquiry",
    support: "Support / Order Issue",
  };
  const label = labelMap[p.inquiryType] ?? p.inquiryType;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
    <tr><td align="center" style="padding:0 0 32px 0;">
      <h1 style="color:#E8B930;font-size:28px;letter-spacing:4px;margin:0;text-transform:uppercase;">GO OUTSYDE</h1>
      <p style="color:#666;font-size:11px;letter-spacing:2px;margin:4px 0 0 0;text-transform:uppercase;">Like A Lavished Local</p></td></tr>
    <tr><td style="background-color:#E8B930;padding:16px 24px;border-radius:4px 4px 0 0;">
      <h2 style="color:#0a0a0a;margin:0;font-size:18px;">📬 New Contact Inquiry — ${label}</h2></td></tr>
    <tr><td style="background-color:#141414;padding:24px;border-radius:0 0 4px 4px;">
      <p style="color:#999;margin:0 0 6px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">From</p>
      <p style="color:#ffffff;margin:0 0 4px 0;font-size:16px;font-weight:600;">${p.name}</p>
      <p style="color:#ccc;margin:0 0 24px 0;font-size:13px;">${p.email}</p>
      <p style="color:#999;margin:0 0 6px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Inquiry Type</p>
      <p style="color:#E8B930;margin:0 0 24px 0;font-size:14px;font-weight:600;">${label}</p>
      <p style="color:#999;margin:0 0 6px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Message</p>
      <p style="color:#ffffff;margin:0;font-size:14px;line-height:1.7;">${p.message.replace(/\n/g, "<br>")}</p>
      <p style="color:#666;margin:24px 0 0 0;font-size:12px;">Reply directly to this email to reach ${p.name}.</p>
    </td></tr>
    <tr><td align="center" style="padding:24px 0 0 0;"><p style="color:#444;font-size:11px;margin:0;">© ${new Date().getFullYear()} Go Outsyde. All rights reserved.</p></td></tr>
  </table></td></tr></table></body></html>`;

  return sendEmail({
    to: "info@goutsyde.com",
    reply_to: p.email,
    subject: `📬 Contact: ${label} — ${p.name}`,
    html,
  });
}