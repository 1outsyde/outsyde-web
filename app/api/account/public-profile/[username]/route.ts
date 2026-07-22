import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND = process.env.OUTSYDE_BACKEND_URL;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('outsyde_access_token')?.value;

  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
    authHeaders['Cookie'] = `outsyde_access_token=${token}`;
  }

  const searchRes = await fetch(
    `${BACKEND}/api/search?q=${encodeURIComponent(username)}&scope=consumers&limit=10`,
    { headers: authHeaders, cache: 'no-store' }
  );

  if (!searchRes.ok) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const searchData = await searchRes.json();
  const results: any[] = searchData.users ?? searchData.results ?? searchData ?? [];
  const user = results.find(
    (u: any) => (u.username ?? '').toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userId = user.id ?? user.userId ?? user._id;

  const profileRes = await fetch(
    `${BACKEND}/api/users/${userId}`,
    { headers: authHeaders, cache: 'no-store' }
  );

  if (!profileRes.ok) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const profileData = await profileRes.json();
  const fullUser = profileData.user ?? profileData;

  const postsRes = await fetch(
    `${BACKEND}/api/profiles/${userId}/posts`,
    { headers: authHeaders, cache: 'no-store' }
  );
  const postsData = postsRes.ok ? await postsRes.json() : { posts: [] };

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