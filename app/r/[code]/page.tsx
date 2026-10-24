import type { Metadata } from "next";
import Link from "next/link";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-stores";
import { normalizeReferralCode, signupHrefForCode, businessSignupHrefForCode, REFERRAL_COPY, BUSINESS_REFERRAL_COPY } from "@/lib/referral";

// Friend invite landing (2026-10-23). The share link from the backend is FRONTEND_URL/r/<CODE>.
// No backend call (there is no public code lookup) and no cookie: the code travels in the Join link.

export const metadata: Metadata = {
  title: "You're invited to Outsyde",
  description: "Join Outsyde with a friend's invite code.",
  robots: { index: false, follow: false },
};

const css = `
  .ri-wrap { min-height: calc(100vh - 66px); background: #000; color: #F5F0E6; font-family: 'Hanken Grotesk', 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; padding: 48px 20px 80px; }
  .ri-card { width: 100%; max-width: 520px; background: linear-gradient(135deg, rgba(232,185,48,0.12) 0%, rgba(232,185,48,0.03) 100%); border: 1px solid rgba(232,185,48,0.25); border-radius: 16px; padding: 40px 36px; display: flex; flex-direction: column; gap: 18px; }
  .ri-eyebrow { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(232,185,48,0.7); }
  .ri-title { font-family: 'Bebas Neue', sans-serif; font-size: 44px; letter-spacing: 0.04em; line-height: 1; color: #F5F0E6; }
  .ri-body { font-size: 15px; line-height: 1.6; color: rgba(245,240,230,0.75); }
  .ri-code { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-radius: 10px; background: rgba(245,240,230,0.04); border: 1px dashed rgba(232,185,48,0.4); }
  .ri-code-label { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(245,240,230,0.45); }
  .ri-code-value { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 0.12em; color: #E8B930; }
  .ri-join { display: block; text-align: center; background: #E8B930; color: #000; font-weight: 700; font-size: 15px; padding: 15px 20px; border-radius: 10px; text-decoration: none; }
  .ri-join:hover { background: #F2C94C; }
  .ri-join:focus-visible, .ri-ghost:focus-visible { outline: 2px solid #F5F0E6; outline-offset: 2px; }
  .ri-apps { display: flex; gap: 10px; flex-wrap: wrap; }
  .ri-ghost { flex: 1 1 180px; text-align: center; font-size: 13px; color: rgba(245,240,230,0.75); border: 1px solid rgba(245,240,230,0.15); border-radius: 10px; padding: 12px 14px; text-decoration: none; }
  .ri-ghost:hover { border-color: rgba(245,240,230,0.35); color: #F5F0E6; }
  .ri-biz { display: flex; flex-direction: column; gap: 10px; padding-top: 18px; border-top: 1px solid rgba(245,240,230,0.1); }
  .ri-biz-line { font-size: 14px; font-weight: 600; color: #F5F0E6; }
  .ri-biz .ri-ghost { flex: none; }
  .ri-fine { font-size: 12px; color: rgba(245,240,230,0.4); line-height: 1.5; }
  @media (max-width: 480px) { .ri-card { padding: 28px 22px; } .ri-title { font-size: 36px; } }
`;

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeReferralCode((await params).code);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <main className="ri-wrap">
        <div className="ri-card">
          <div className="ri-eyebrow">Friend invite</div>
          <h1 className="ri-title">{REFERRAL_COPY.invitedTitle}</h1>
          {code ? (
            <>
              <p className="ri-body">{REFERRAL_COPY.offer}</p>
              <div className="ri-code">
                <span className="ri-code-label">Invite code</span>
                <span className="ri-code-value">{code}</span>
              </div>
              <Link className="ri-join" href={signupHrefForCode(code)}>Join Outsyde</Link>
              <div className="ri-apps">
                <a className="ri-ghost" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">Get the app on iPhone</a>
                <a className="ri-ghost" href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">Get the app on Android</a>
              </div>
              <p className="ri-fine">{REFERRAL_COPY.fineprint}</p>
              <div className="ri-biz">
                <span className="ri-biz-line">{BUSINESS_REFERRAL_COPY.invitedLine}</span>
                <Link className="ri-ghost" href={businessSignupHrefForCode(code)}>{BUSINESS_REFERRAL_COPY.invitedButton}</Link>
                <p className="ri-fine">{BUSINESS_REFERRAL_COPY.invitedFineprint}</p>
              </div>
            </>
          ) : (
            <>
              <p className="ri-body">{REFERRAL_COPY.invalid}</p>
              <Link className="ri-join" href="/consumer-signup">Join Outsyde</Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
