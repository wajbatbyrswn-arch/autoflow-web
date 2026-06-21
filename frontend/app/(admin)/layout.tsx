'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('user_profiles').select('is_admin').eq('user_id', user.id).single();
      if (!data?.is_admin) { router.push('/inbox'); return; }
      setChecked(true);
    });
  }, []);

  if (!checked) return <div className="flex items-center justify-center h-screen text-gray-400">جارٍ التحقق...</div>;

  return (
    <div className="flex h-screen bg-gray-100" dir="rtl">
      <aside className="w-56 bg-white shadow-md flex flex-col">
        <div className="p-5 border-b">
          <h1 className="text-xl font-bold text-purple-600">AutoFlow Admin</h1>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {[{ href: '/admin/codes', label: 'أكواد التفعيل', icon: '🔑' }, { href: '/admin/users', label: 'المستخدمون', icon: '👥' }].map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${pathname === item.href ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span>{item.icon}</span><span>{item.label}</span>
            </Link>
          ))}
          <Link href="/inbox" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition mt-auto">
            <span>←</span><span>العودة للداشبورد</span>
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
