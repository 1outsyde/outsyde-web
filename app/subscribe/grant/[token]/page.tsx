"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "redirecting" };

export default function GrantRedemptionPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "Invalid link." });
      return;
    }

    async function redeem() {
      // Check auth state
      const statusRes = await fetch("/api/subscription/status");
      if (statusRes.status === 401) {
        const returnUrl = encodeURIComponent(`/subscribe/grant/${token}`);
        router.replace(`/login?return=${returnUrl}`);
        return;
      }

      // Redeem the token
      const redeemRes = await fetch("/api/subscription/grant-redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await redeemRes.json();

      if (!redeemRes.ok) {
        setState({
          status: "error",
          message: data.error ?? "This link is invalid or has expired.",
        });
        return;
      }

      setState({ status: "redirecting" });
      router.replace(`/subscription/manage?tier=${data.tierId}`);
    }

    redeem();
  }, [token, router]);

  if (state.status === "loading" || state.status === "redirecting") {
    return (
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          fontFamily: "sans-serif",
        }}
      >
        <p style={{ color: "#888" }}>
          {state.status === "loading"
            ? "Verifying your invitation…"
            : "Redirecting to your plan…"}
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        fontFamily: "sans-serif",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}
      >
        This link isn&apos;t valid
      </h1>
      <p
        style={{ color: "#888", maxWidth: "380px", lineHeight: 1.6 }}
      >
        {state.message}
      </p>
      <p style={{ marginTop: "1.5rem", color: "#888", fontSize: "0.875rem" }}>
        Need help?{" "}
        <a href="mailto:info@goutsyde.com" style={{ color: "#E8B930" }}>
          info@goutsyde.com
        </a>
      </p>
    </main>
  );
}
