import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export default async function Home() {
  const token = cookies().get(SESSION_COOKIE)?.value;

  if (token) {
    const session = await verifySessionToken(token);
    if (session) {
      redirect('/dashboard');
    }
  }

  redirect('/login');
}
