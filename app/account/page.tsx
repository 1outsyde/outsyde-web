"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserProfile {
  id: number;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username: string;
  bio?: string;
  profileImageUrl?: string;
  coverMediaUrl?: string;
  city?: string;
  state?: string;
  loyaltyPoints?: number;
  isVendor?: boolean;
  isPhotographer?: boolean;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editFields, setEditFields] = useState({
    bio: "",
    profileImageUrl: "",
    coverMediaUrl: "",
  });

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      if (!me.authenticated) { router.push("/login"); return; }

      const profileRes = await fetch("/api/account/profile");
      if (profileRes.ok) {
        const data = await profileRes.json();
        const user = data.user || data;
        setProfile(user);
        setEditFields({
          bio: user.bio || "",
          profileImageUrl: user.profileImageUrl || "",
          coverMediaUrl: user.coverMediaUrl || "",
        });
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editFields),
    });
    if (res.ok) {
      const data = await res.json();
      const updated = data.user || data;
      setProfile((p) => p ? { ...p, ...updated } : updated);
      setEditing(false);
    } else {
      setSaveError("Failed to save. Try again.");
    }
    setSaving(false);
  }

  const pts = profile?.loyaltyPoints ?? 0;
  const displayName =
    profile?.name ||
    `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() ||
    profile?.username ||
    "—";
  const location = [profile?.city, profile?.state].filter(Boolean).join(", ");

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #000; color: #F5F0E6; font-family: 'Hanken Grotesk', 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }

    .nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 56px; height: 66px;
      border-bottom: 1px solid rgba(245,240,230,0.08);
      position: sticky; top: 0; z-index: 50;
      background: rgba(0,0,0,0.9); backdrop-filter: blur(10px);
    }
    .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.12em; color: #E8B930; }
    .nav-links { display: flex; gap: 32px; }
    .nav-links a { font-size: 13px; letter-spacing: 0.04em; color: rgba(245,240,230,0.55); transition: color .15s; }
    .nav-links a:hover { color: #F5F0E6; }
    .nav-right { display: flex; gap: 10px; align-items: center; }
    .nav-icon {
      width: 36px; height: 36px; border-radius: 50%;
      border: 1px solid rgba(245,240,230,0.12);
      display: flex; align-items: center; justify-content: center;
      color: rgba(245,240,230,0.5); font-size: 15px; cursor: pointer;
    }

    .cover {
      position: relative; width: 100%; height: 280px;
      background: linear-gradient(120deg, #1A1208 0%, #0D0D00 100%);
      overflow: hidden;
    }
    .cover img { width: 100%; height: 100%; object-fit: cover; }
    .cover-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85) 100%);
    }
    .cover-edit-btn {
      position: absolute; right: 24px; top: 20px;
      background: rgba(0,0,0,0.55); border: 1px solid rgba(245,240,230,0.15);
      color: #F5F0E6; font-size: 12px; padding: 8px 14px; border-radius: 999px;
      display: flex; gap: 6px; align-items: center; cursor: pointer;
      backdrop-filter: blur(6px); font-family: inherit; letter-spacing: 0.04em;
    }

    .wrap { max-width: 1100px; margin: 0 auto; padding: 0 56px; }

    .profile-header {
      display: flex; align-items: flex-end; justify-content: space-between;
      margin-top: -72px; position: relative; z-index: 5;
      padding-bottom: 24px; border-bottom: 1px solid rgba(245,240,230,0.08);
      flex-wrap: wrap; gap: 20px;
    }
    .id-block { display: flex; align-items: flex-end; gap: 22px; }
    .avatar {
      width: 144px; height: 144px; border-radius: 50%;
      border: 4px solid #000;
      background: linear-gradient(150deg, #1A3C34, #0a1f1a);
      box-shadow: 0 0 0 1px rgba(232,185,48,0.2);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Bebas Neue', sans-serif; font-size: 52px;
      color: rgba(232,185,48,0.4); flex-shrink: 0; overflow: hidden; position: relative;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-status {
      position: absolute; right: 8px; bottom: 8px; width: 16px; height: 16px;
      background: #4CD37B; border-radius: 50%; border: 3px solid #000;
    }
    .id-text { padding-bottom: 8px; }
    .id-name { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 0.04em; line-height: 1; }
    .id-meta {
      display: flex; align-items: center; gap: 10px;
      margin-top: 6px; color: rgba(245,240,230,0.5); font-size: 13px;
    }
    .id-meta .sep { opacity: 0.3; }
    .id-bio { margin-top: 10px; color: rgba(245,240,230,0.7); font-size: 14px; max-width: 460px; line-height: 1.6; }

    .header-actions { display: flex; gap: 10px; padding-bottom: 8px; align-items: flex-end; }
    .btn {
      font-family: inherit; font-size: 13px; font-weight: 600; padding: 10px 18px;
      border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 7px;
      letter-spacing: 0.03em; border: 1px solid transparent; transition: all .15s;
    }
    .btn-gold { background: #E8B930; color: #000; }
    .btn-gold:hover { background: #F5CC50; }
    .btn-ghost { background: transparent; border-color: rgba(245,240,230,0.15); color: #F5F0E6; }
    .btn-ghost:hover { border-color: rgba(245,240,230,0.3); }

    .stats-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 0; border-bottom: 1px solid rgba(245,240,230,0.08);
      flex-wrap: wrap; gap: 18px;
    }
    .stats { display: flex; gap: 44px; }
    .stat .num { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 0.04em; }
    .stat .lbl { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(245,240,230,0.35); margin-top: 2px; }

    .points-pill {
      display: flex; align-items: center; gap: 10px;
      background: rgba(232,185,48,0.08); border: 1px solid rgba(232,185,48,0.2);
      padding: 10px 18px; border-radius: 999px; cursor: pointer; transition: background .15s;
    }
    .points-pill:hover { background: rgba(232,185,48,0.14); }
    .points-pill .star { color: #E8B930; font-size: 15px; }
    .points-pill .pts-num { font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: #E8B930; letter-spacing: 0.06em; }
    .points-pill .pts-lbl { font-size: 11.5px; color: rgba(245,240,230,0.5); }

    .tabs-bar { display: flex; border-bottom: 1px solid rgba(245,240,230,0.08); margin-top: 4px; }
    .tab-link {
      font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 0.1em;
      color: rgba(245,240,230,0.35); padding: 16px 24px; border-bottom: 2px solid transparent;
      margin-bottom: -1px; cursor: pointer; text-decoration: none; transition: color .15s;
    }
    .tab-link:hover { color: rgba(245,240,230,0.7); }
    .tab-link.active { color: #E8B930; border-bottom-color: #E8B930; }

    .section-content { padding: 28px 0 80px; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.75);
      display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px;
    }
    .modal {
      background: #111; border: 1px solid rgba(245,240,230,0.1); border-radius: 12px;
      width: 100%; max-width: 520px; padding: 36px;
    }
    .modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.08em; margin-bottom: 24px; }
    .field-group { margin-bottom: 18px; }
    .field-label { display: block; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(245,240,230,0.4); margin-bottom: 8px; }
    .field-input, .field-textarea {
      width: 100%; background: rgba(245,240,230,0.05); border: 1px solid rgba(245,240,230,0.1);
      border-radius: 6px; color: #F5F0E6; font-family: inherit; font-size: 14px;
      padding: 10px 14px; outline: none; transition: border .15s;
    }
    .field-input:focus, .field-textarea:focus { border-color: rgba(232,185,48,0.4); }
    .field-textarea { resize: vertical; min-height: 90px; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 26px; }
    .error-msg { color: #ff6b6b; font-size: 13px; margin-top: 10px; }

    .empty-state {
      border: 1px dashed rgba(245,240,230,0.1); border-radius: 8px;
      padding: 64px 32px; text-align: center;
    }
    .empty-icon { font-size: 36px; margin-bottom: 14px; opacity: 0.35; }
    .empty-text { color: rgba(245,240,230,0.35); font-size: 14px; }

    .skeleton { background: rgba(245,240,230,0.06); border-radius: 4px; animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    @media (max-width: 720px) {
      .nav { padding: 0 20px; }
      .nav-links { display: none; }
      .wrap { padding: 0 20px; }
      .id-block { flex-direction: column; align-items: flex-start; gap: 14px; }
      .avatar { width: 108px; height: 108px; font-size: 40px; }
      .stats-row { flex-direction: column; align-items: flex-start; }
      .tabs-bar { overflow-x: auto; }
    }
  `;

  if (loading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <nav className="nav"><span className="nav-logo">OUTSYDE</span></nav>
        <div className="cover" />
        <div className="wrap">
          <div className="profile-header">
            <div className="id-block">
              <div className="avatar skeleton" style={{ opacity: 0.3 }} />
              <div className="id-text" style={{ paddingBottom: 8 }}>
                <div className="skeleton" style={{ width: 200, height: 32, borderRadius: 4, marginBottom: 10 }} />
                <div className="skeleton" style={{ width: 150, height: 14, borderRadius: 4 }} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!profile) return null;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {editing && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setEditing(false)}>
          <div className="modal">
            <div className="modal-title">Edit Profile</div>
            <div className="field-group">
              <label className="field-label">Profile Photo URL</label>
              <input className="field-input" value={editFields.profileImageUrl}
                onChange={(e) => setEditFields((f) => ({ ...f, profileImageUrl: e.target.value }))}
                placeholder="https://..." />
            </div>
            <div className="field-group">
              <label className="field-label">Cover Image URL</label>
              <input className="field-input" value={editFields.coverMediaUrl}
                onChange={(e) => setEditFields((f) => ({ ...f, coverMediaUrl: e.target.value }))}
                placeholder="https://..." />
            </div>
            <div className="field-group">
              <label className="field-label">Bio</label>
              <textarea className="field-textarea" value={editFields.bio}
                onChange={(e) => setEditFields((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Tell the community a bit about yourself..." maxLength={300} />
            </div>
            {saveError && <div className="error-msg">{saveError}</div>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-gold" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="nav">
        <a href="/"><span className="nav-logo">OUTSYDE</span></a>
        <div className="nav-links">
          <a href="/">Home</a>
          <a href="/shop">Shop</a>
          <a href="/photographers">Photographers</a>
        </div>
        <div className="nav-right">
          <div className="nav-icon">⌕</div>
          <div className="nav-icon">♡</div>
        </div>
      </nav>

      <div className="cover">
        {profile.coverMediaUrl && <img src={profile.coverMediaUrl} alt="cover" />}
        <div className="cover-overlay" />
        <button className="cover-edit-btn" onClick={() => setEditing(true)}>✎ Edit Cover</button>
      </div>

      <div className="wrap">
        <div className="profile-header">
          <div className="id-block">
            <div className="avatar">
              {profile.profileImageUrl
                ? <img src={profile.profileImageUrl} alt={displayName} />
                : initials}
              <div className="avatar-status" />
            </div>
            <div className="id-text">
              <div className="id-name">{displayName}</div>
              <div className="id-meta">
                <span>@{profile.username}</span>
                {location && <><span className="sep">·</span><span>📍 {location}</span></>}
                {profile.isVendor && <><span className="sep">·</span><span style={{ color: "#E8B930" }}>Vendor</span></>}
                {profile.isPhotographer && <><span className="sep">·</span><span style={{ color: "#E8B930" }}>Photographer</span></>}
              </div>
              {profile.bio && <div className="id-bio">{profile.bio}</div>}
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-ghost">Share Profile</button>
            <button className="btn btn-gold" onClick={() => setEditing(true)}>✎ Edit Profile</button>
          </div>
        </div>

        <div className="stats-row">
          <div className="stats">
            <div className="stat"><div className="num">0</div><div className="lbl">Followers</div></div>
            <div className="stat"><div className="num">0</div><div className="lbl">Posts</div></div>
            <div className="stat"><div className="num">0</div><div className="lbl">Following</div></div>
          </div>
          <Link href="/account/points" className="points-pill">
            <span className="star">★</span>
            <span className="pts-num">{pts.toLocaleString()}</span>
            <span className="pts-lbl">Outsyde Points</span>
          </Link>
        </div>

        <div className="tabs-bar">
          <Link href="/account" className="tab-link active">Posts</Link>
          <Link href="/account/bookings" className="tab-link">Bookings</Link>
          <Link href="/account/orders" className="tab-link">Orders</Link>
          <Link href="/account/points" className="tab-link">Points</Link>
        </div>

        <div className="section-content">
          <div className="empty-state">
            <div className="empty-icon">📸</div>
            <div className="empty-text">No posts yet. Share your first outsyde experience.</div>
          </div>
        </div>
      </div>
    </>
  );
}