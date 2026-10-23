import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendAuthHeaders } from '@/lib/admin-auth';
import { proxyToBackend } from '@/lib/backend-proxy';

const BACKEND = process.env.OUTSYDE_BACKEND_URL;

function buildAuthHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    Cookie: `outsyde_access_token=${token}`,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ targetUserId: string }> }
) {
  const { targetUserId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('outsyde_access_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${BACKEND}/api/follows`, {
    method: 'POST',
    headers: buildAuthHeaders(token),
    body: JSON.stringify({ targetUserId }),
  });

  const data = await res.json().catch(() => ({}));

  if (res.ok || res.status === 409) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: data.error ?? 'Failed to follow' },
    { status: res.status }
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ targetUserId: string }> }
) {
  const { targetUserId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('outsyde_access_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${BACKEND}/api/follows/${targetUserId}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(token),
  });

  const data = await res.json().catch(() => ({}));

  if (res.ok) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: data.error ?? 'Failed to unfollow' },
    { status: res.status }
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Does the signed-in viewer follow this id? Backend answers { success, isFollowing }, or 401 when signed out.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ targetUserId: string }> }
) {
  const { targetUserId } = await params;
  if (!UUID_RE.test(targetUserId)) {
    return NextResponse.json({ success: false, error: 'Not found.', code: 'NOT_FOUND' }, { status: 404 });
  }
  return proxyToBackend(`/api/follows/check/${targetUserId}`, {
    method: 'GET',
    headers: backendAuthHeaders(req) as Record<string, string>,
  });
}
