import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND = process.env.OUTSYDE_BACKEND_URL;

function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    Cookie: `outsyde_access_token=${token}`,
  };
}

// POST /api/account/follow/:userId — follow a user
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const token = cookies().get('outsyde_access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${BACKEND}/api/users/${params.userId}/follow`, {
    method: 'POST',
    headers: authHeaders(token),
  });

  return NextResponse.json(
    res.ok ? { success: true } : { error: 'Failed to follow' },
    { status: res.ok ? 200 : res.status }
  );
}

// DELETE /api/account/follow/:userId — unfollow a user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const token = cookies().get('outsyde_access_token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${BACKEND}/api/users/${params.userId}/follow`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

  return NextResponse.json(
    res.ok ? { success: true } : { error: 'Failed to unfollow' },
    { status: res.ok ? 200 : res.status }
  );
}