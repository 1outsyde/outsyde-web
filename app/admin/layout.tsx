import { redirect } from "next/navigation";
import { hasAdminTokenCookie } from "@/lib/admin-auth";
import AdminNav from "./AdminNav";

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
      {/* Phone and tablet (below 1024px, same width as the AdminNav phone menu): 16px side padding and a
          one line title. !important is needed to beat the inline styles; desktop is untouched. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@media (max-width: 1023px) {
  .admin-header { padding: 0 16px !important; position: relative; }
  .admin-title { white-space: nowrap; flex: none; }
  .admin-main { padding: 20px 16px 32px !important; }
}`,
        }}
      />
      <div
        className="admin-header"
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
          className="admin-title"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "20px",
            letterSpacing: "0.1em",
            color: "#E8B930",
          }}
        >
          OUTSYDE ADMIN
        </span>
        <AdminNav />
      </div>
      <div className="admin-main" style={{ padding: "32px" }}>{children}</div>
    </div>
  );
}