'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebar({ items }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white/80 px-4 py-6 shadow-sm backdrop-blur lg:flex">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-500">Consulting Center</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Admin Panel</h2>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sky-100 text-sky-700 shadow-inner'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="text-xs font-semibold text-slate-500">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
