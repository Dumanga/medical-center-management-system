import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin-sidebar';
import LogoutButton from '@/components/logout-button';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'DB' },
  { href: '/patients', label: 'Patients', icon: 'PT' },
  { href: '/treatments', label: 'Treatments', icon: 'TR' },
  { href: '/appointments', label: 'Appointments', icon: 'AP' },
  { href: '/stocks', label: 'Stocks', icon: 'SK' },
  { href: '/sessions', label: 'Billing Sessions', icon: 'BS' },
  { href: '/reporting', label: 'Reporting', icon: 'RP' },
];

export default async function ProtectedLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    redirect('/login');
  }

  const session = await verifySessionToken(token);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <AdminSidebar items={NAV_ITEMS} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-sm text-slate-500">Welcome back,</p>
            <p className="text-base font-semibold text-slate-900">{session.username}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700 sm:inline-flex">
              Admin
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}


