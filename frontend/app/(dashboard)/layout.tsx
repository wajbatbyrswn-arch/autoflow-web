'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/inbox', label: 'الرسائل', icon: '💬' },
  { href: '/knowledge-base', label: 'المنتجات', icon: '📦' },
  { href: '/orders', label: 'الطلبات', icon: '🛒' },
  { href: '/settings', label: 'الإعدادات', icon: '⚙️' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_status, is_admin')
        .eq('user_id', user.id)
        .single();
      if (!profile || profile.subscription_status !== 'active') {
        router.push('/activate');
      }
      setIsAdmin(profile?.is_admin || false);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="flex h-screen bg-gray-100" dir="rtl">
      {/* Sidebar */}
      <aside className="w-56 bg-white shadow-md flex flex-col">
        <div className="p-5 border-b">
          <h1 className="text-xl font-bold text-blue-600">AutoFlow</h1>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                pathname === item.href ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin/codes"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                pathname.startsWith('/admin') ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>🔑</span>
              <span>لوحة الإدارة</span>
            </Link>
          )}
        </nav>
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 rounded-xl hover:bg-gray-50 transition"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
