import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND = process.env.OUTSYDE_BACKEND_URL;

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  const cookieStore = cookies();
  const token = cookieStore.get('outsyde_access_token')?.value;

  // Auth headers — forwarded only if a session exists (viewer may be logged out)
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
    authHeaders['Cookie'] = `outsyde_access_token=${token}`;
  }

  // ── 1. Resolve user by username via unified search ────────────────────────
  // Backend has no GET /api/users?username= endpoint.
  // GET /api/users/check-username/:username only returns { available: boolean }.
  // We use GET /api/search?q=:username&scope=consumers which returns user objects.
  //
  // TODO: Ask backend to add GET /api/users/by-username/:username for a direct,
  // unambiguous lookup. When that exists, replace the search call below with:
  //   fetch(`${BACKEND}/api/users/by-username/${encodeURIComponent(username)}`, ...)
  const searchRes = await fetch(
    `${BACKEND}/api/search?q=${encodeURIComponent(username)}&scope=consumers&limit=10`,
    { headers: authHeaders, cache: 'no-store' }
  );

  if (!searchRes.ok) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const searchData = await searchRes.json();

  // The unified search returns an array of results — find an exact username match
  const results: any[] = searchData.users ?? searchData.results ?? searchData ?? [];
  const user = results.find(
    (u: any) =>
      (u.username ?? '').toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userId = user.id ?? user.userId ?? user._id;

  // ── 2. Fetch full public profile via GET /api/users/:id ───────────────────
  // This returns: id, name, username, bio, profileImageUrl, coverMediaUrl,
  // coverMediaType, city, state, isVendor, isPhotographer, followerCount, followingCount
  const profileRes = await fetch(
    `${BACKEND}/api/users/${userId}`,
    { headers: authHeaders, cache: 'no-store' }
  );

  if (!profileRes.ok) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const profileData = await profileRes.json();
  const fullUser = profileData.user ?? profileData;

  // ── 3. Fetch posts via GET /api/profiles/:userId/posts ────────────────────
  const postsRes = await fetch(
    `${BACKEND}/api/profiles/${userId}/posts`,
    { headers: authHeaders, cache: 'no-store' }
  );
  const postsData = postsRes.ok ? await postsRes.json() : { posts: [] };

  // ── 4. Check follow state via GET /api/follows/check/:targetUserId ────────
  // Only available when the viewer is authenticated.
  // Returns: { success: boolean, isFollowing: boolean }
  let isFollowing = false;
  if (token) {
    const followCheckRes = await fetch(
      `${BACKEND}/api/follows/check/${userId}`,
      { headers: authHeaders, cache: 'no-store' }
    );
    if (followCheckRes.ok) {
      const followData = await followCheckRes.json();
      isFollowing = followData.isFollowing ?? false;
    }
  }

  return NextResponse.json({
    user: fullUser,
    posts: postsData.posts ?? [],
    isFollowing,
    viewerAuthenticated: !!token,
  });
}