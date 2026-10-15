// components/ExistingAccountHint.tsx
// Shown under a signup error when the backend says "Email already registered".
// Some of those accounts were created for the person (e.g. imported signups) and have no password
// yet — /claim emails them a code to finish. Accounts that do have a password just sign in.

const linkStyle: React.CSSProperties = { color: "#E8B930", textDecoration: "underline", textUnderlineOffset: 3 };

export function isAlreadyRegistered(message: string | null | undefined): boolean {
  return typeof message === "string" && /already registered/i.test(message);
}

export default function ExistingAccountHint({ email }: { email: string }) {
  const claimHref = `/claim${email.trim() ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : ""}`;
  return (
    <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: "rgba(245,240,230,.8)", textAlign: "left" }}>
      Already have an account with this email? <a href="/login" style={linkStyle}>Sign in</a>. Never created a
      password? <a href={claimHref} style={linkStyle}>Finish your account</a>.
    </p>
  );
}
