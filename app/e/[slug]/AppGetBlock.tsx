// "Get the Outsyde app" block shown after paying or RSVPing (p4-quicksignup, Events canvas mockup 44).
// After a brand new account it also tells the person how to sign in to the app.
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-stores";

export default function AppGetBlock({ newAccountEmail, testId = "going-app" }: { newAccountEmail?: string | null; testId?: string }) {
  const link: React.CSSProperties = {
    minHeight: 46, borderRadius: 23, border: "1px solid #38383A", background: "#000", color: "#F5F0E6", fontSize: 14, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px", textAlign: "center",
  };
  return (
    <div data-testid={testId} style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 12, textAlign: "left", width: "100%" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div aria-hidden="true" style={{ width: 52, height: 52, flex: "none", borderRadius: 14, background: "#E8B930", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/outsyde-y-transparent.png" alt="" style={{ width: 34, height: 34, objectFit: "contain", filter: "brightness(0)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#F5F0E6" }}>Get the Outsyde app</div>
          <div style={{ fontSize: 13, color: "#B8B0A0", lineHeight: 1.4 }}>Your tickets, the event address on the day and reminders, all in one place.</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" style={link}>App Store</a>
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" style={link}>Google Play</a>
      </div>
      {newAccountEmail ? (
        <div style={{ fontSize: 12, color: "#8A8478", lineHeight: 1.45, overflowWrap: "anywhere" }}>
          Sign in with {newAccountEmail} and the password you just made. Your tickets are already there.
        </div>
      ) : null}
    </div>
  );
}
