import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const cookie = req.headers.get('cookie') ?? '';

  let res: Response;
  try {
    res = await fetch(
      `${process.env.OUTSYDE_API_URL}/api/vendor/stripe-dashboard-link`,
      {
        headers: {
          cookie,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Service unavailable.' }, { status: 500 });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
