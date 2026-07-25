'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

// ── Types ────────────────────────────────────────────────────────────────────

interface User {
  id?: string;
  userId?: string;
  name?: string;           // display name — users table uses `name`, not `displayName`
  username?: string;
  bio?: string;
  city?: string;
  state?: string;
  profileImageUrl?: string;
  avatarUrl?: string;      // alias the backend also returns
  coverMediaUrl?: string;
  coverMediaType?: 'image' | 'video';
  followerCount?: number;
  followingCount?: number;
  isVendor?: boolean;
  isPhotographer?: boolean;
}

interface Post {
  id?: string;
  _id?: string;
  mediaUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  mediaType?: 'image' | 'video';
  content?: string;
  likesCount?: number;
}

interface ProfileData {
  user: User;
  posts: Post[];
  isFollowing: boolean;
  viewerAuthenticated: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-3">
      <span className="text-white font-bold text-xl leading-none">{value ?? 0}</span>
      <span className="text-[#9CA3AF] text-[10px] uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/account/public-profile/${username}`);
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) throw new Error('Failed to load profile');
        const json: ProfileData = await res.json();
        setData(json);
        setIsFollowing(json.isFollowing);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username]);

  // ── Follow / Unfollow ──────────────────────────────────────────────────────
  const handleFollowToggle = useCallback(async () => {
    if (!data) return;

    if (!data.viewerAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    const userId = data.user.id ?? data.user.userId;
    setFollowLoading(true);

    // Optimistic update
    setIsFollowing(prev => !prev);

    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(`/api/account/follow/${userId}`, { method });
      if (!res.ok) {
        // Revert on failure
        setIsFollowing(prev => !prev);
      }
    } catch {
      setIsFollowing(prev => !prev);
    } finally {
      setFollowLoading(false);
    }
  }, [data, isFollowing]);

  // ── States ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4A017] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center gap-3">
        <p className="text-white text-lg font-semibold">User not found</p>
        <p className="text-[#6B7280] text-sm">@{username} doesn&apos;t exist on Outsyde.</p>
      </div>
    );
  }

  const { user, posts } = data;
  const coverIsVideo = user.coverMediaType === 'video' && user.coverMediaUrl;
  // Backend returns `name` as the display name field (not `displayName`)
  const displayName = user.name;
  // Backend returns both `profileImageUrl` and `avatarUrl`
  const avatar = user.profileImageUrl ?? user.avatarUrl;

  return (
    <div className="min-h-screen bg-[#0F0F0F]">

      {/* ── Cover media ───────────────────────────────────────────────────── */}
      <div className="relative w-full h-56 bg-[#1A1A1A] overflow-hidden">
        {coverIsVideo ? (
          <video
            src={user.coverMediaUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : user.coverMediaUrl ? (
          <Image
            src={user.coverMediaUrl}
            alt="Cover"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent" />
      </div>

      {/* ── Profile info ──────────────────────────────────────────────────── */}
      <div className="px-4 -mt-10 relative z-10">

        {/* Avatar + Follow button row */}
        <div className="flex items-end justify-between mb-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-[3px] border-[#D4A017] overflow-hidden bg-[#2A2A2A]">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={displayName ?? username}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#2A2A2A]">
                  <span className="text-2xl text-[#6B7280]">
                    {(displayName ?? username ?? '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0F0F0F]" />
          </div>

          {/* Follow button */}
          <button
            onClick={handleFollowToggle}
            disabled={followLoading}
            className={`
              px-6 py-2 rounded-full font-semibold text-sm transition-all
              ${isFollowing
                ? 'bg-transparent border border-[#D4A017] text-[#D4A017]'
                : 'bg-[#D4A017] text-black'
              }
              ${followLoading ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}
            `}
          >
            {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        {/* Name, username, location */}
        <h1 className="text-white font-bold text-2xl leading-tight">
          {displayName ?? username}
        </h1>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[#9CA3AF] text-sm">@{user.username ?? username}</span>
          {(user.city || user.state) && (
            <>
              <span className="text-[#4B5563]">·</span>
              <span className="text-sm text-[#9CA3AF]">
                📍 {[user.city, user.state].filter(Boolean).join(', ')}
              </span>
            </>
          )}
        </div>

        {/* Badges */}
        {(user.isVendor || user.isPhotographer) && (
          <div className="flex gap-2 mt-2">
            {user.isVendor && (
              <span className="px-2 py-0.5 rounded-full bg-[#D4A017]/20 text-[#D4A017] text-xs font-semibold">
                Vendor
              </span>
            )}
            {user.isPhotographer && (
              <span className="px-2 py-0.5 rounded-full bg-[#D4A017]/20 text-[#D4A017] text-xs font-semibold">
                Photographer
              </span>
            )}
          </div>
        )}

        {/* Bio */}
        {user.bio && (
          <p className="text-[#D1D5DB] text-sm mt-2 leading-relaxed">{user.bio}</p>
        )}

        {/* Stats row */}
        <div className="flex mt-4 bg-[#1A1A1A] rounded-xl overflow-hidden divide-x divide-[#2A2A2A]">
          <StatPill value={user.followerCount ?? 0} label="Followers" />
          <StatPill value={posts.length} label="Posts" />
          <StatPill value={user.followingCount ?? 0} label="Following" />
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex mt-5 border-b border-[#2A2A2A] px-4">
        {(['posts', 'reviews'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 pb-3 text-sm font-semibold capitalize transition-colors
              ${activeTab === tab
                ? 'text-[#D4A017] border-b-2 border-[#D4A017]'
                : 'text-[#6B7280]'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Posts grid ────────────────────────────────────────────────────── */}
      {activeTab === 'posts' && (
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {posts.length === 0 ? (
            <div className="col-span-3 py-16 flex flex-col items-center gap-2">
              <p className="text-[#6B7280] text-sm">No posts yet</p>
            </div>
          ) : (
            posts.map((post, i) => {
              const postId = post.id ?? post._id ?? String(i);
              // Backend returns mediaUrl (preferred) and imageUrl (legacy alias),
              // plus thumbnailUrl for videos
              const thumb = post.thumbnailUrl ?? post.mediaUrl ?? post.imageUrl;

              return (
                <div
                  key={postId}
                  className="relative aspect-square bg-[#1A1A1A] overflow-hidden group cursor-pointer"
                >
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={post.content ?? 'Post'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#2A2A2A]" />
                  )}

                  {/* Video badge */}
                  {post.mediaType === 'video' && (
                    <div className="absolute top-1.5 right-1.5">
                      <svg className="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </div>
                  )}

                  {/* Likes overlay on hover */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px]">♥ {post.likesCount ?? 0}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Reviews tab (placeholder) ──────────────────────────────────────── */}
      {activeTab === 'reviews' && (
        <div className="py-16 flex flex-col items-center gap-2">
          <p className="text-[#6B7280] text-sm">No reviews yet</p>
        </div>
      )}

      {/* ── Login prompt modal ────────────────────────────────────────────── */}
      {showLoginPrompt && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="bg-[#1A1A1A] rounded-t-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-white font-bold text-lg mb-1">Sign in to follow</h2>
            <p className="text-[#9CA3AF] text-sm mb-5">
              Create an account or sign in to follow {displayName ?? `@${username}`}.
            </p>
            <button
              onClick={() => router.push(`/login?redirect=/account/${username}`)}
              className="w-full bg-[#D4A017] text-black font-bold py-3 rounded-xl mb-3"
            >
              Sign In
            </button>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="w-full text-[#9CA3AF] text-sm py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

    </div>
  );
}