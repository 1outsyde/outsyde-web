import { redirect } from "next/navigation";
import { hasAdminTokenCookie } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasToken = await hasAdminTokenCookie();

  if (!hasToken) {
    redirect("/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#F5F0E6" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 32px",
          height: "60px",
          borderBottom: "1px solid rgba(245,240,230,0.08)",
        }}
      >
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "20px",
            letterSpacing: "0.1em",
            color: "#E8B930",
          }}
        >
          OUTSYDE ADMIN
        </span>
      </div>
      <div style={{ padding: "32px" }}>{children}</div>
    </div>
  );
}