import { NextResponse } from 'next/server';
import { getSessionCookieConfig } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  const cookie = getSessionCookieConfig();

  response.cookies.set({
    ...cookie,
    value: '',
    maxAge: 0,
  });

  return response;
}
