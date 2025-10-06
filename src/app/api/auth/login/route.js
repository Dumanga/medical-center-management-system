import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createSessionToken, getSessionCookieConfig } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const body = await request.json();
    const username = body?.username?.trim();
    const password = body?.password;

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required.' }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });

    if (!admin) {
      return NextResponse.json({ message: 'Invalid username or password.' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid username or password.' }, { status: 401 });
    }

    const token = await createSessionToken(admin);
    const sessionCookie = getSessionCookieConfig();

    cookies().set({ ...sessionCookie, value: token });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error', error);
    return NextResponse.json({ message: 'Unable to process login at the moment.' }, { status: 500 });
  }
}
