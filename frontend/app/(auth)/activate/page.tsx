'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { api } from '@/lib/api';

export default function ActivatePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    // Check if already active
    const status = await api.getActivationStatus(user.id).catch(() => null);
    if (status?.subscription_status === 'active') {
      router.push('/inbox');
      return;
    }

    const result = await api.activate(user.id, code).catch((err: Error) => {
      setError(err.message);
      return null;
    });

    if (result?.success) {
      router.push('/inbox');
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center">تفعيل الاشتراك</h1>
        <p className="text-gray-500 text-center text-sm">
          أدخل كود التفعيل الذي تلقيته من فريق AutoFlow
        </p>
        <form onSubmit={handleActivate} className="flex flex-col gap-4">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            className="border border-gray-300 rounded-xl px-4 py-3 text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={8}
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'جارٍ التفعيل...' : 'تفعيل'}
          </button>
        </form>
        <button onClick={handleLogout} className="text-gray-400 text-sm text-center hover:underline">
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
