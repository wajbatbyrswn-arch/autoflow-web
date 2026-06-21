'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { api } from '@/lib/api';

type Code = { id: string; code: string; duration_days: number; used_by: string | null; used_at: string | null; created_at: string; };

export default function CodesPage() {
  const [userId, setUserId] = useState('');
  const [codes, setCodes] = useState<Code[]>([]);
  const [count, setCount] = useState(1);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        api.getAdminCodes(user.id).then(setCodes).catch(console.error);
      }
    });
  }, []);

  async function handleGenerate() {
    setLoading(true);
    const newCodes = await api.generateCodes(userId, days, count);
    setCodes(prev => [...newCodes, ...prev]);
    setLoading(false);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const unused = codes.filter(c => !c.used_by);
  const used = codes.filter(c => c.used_by);

  return (
    <div dir="rtl" className="max-w-3xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-800">أكواد التفعيل</h1>

      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-gray-700">توليد أكواد جديدة</h2>
        <div className="flex gap-4 items-end">
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            عدد الأكواد
            <input type="number" min={1} max={10} value={count} onChange={e => setCount(Number(e.target.value))}
              className="border rounded-xl px-4 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-600">
            مدة الاشتراك (يوم)
            <input type="number" min={1} value={days} onChange={e => setDays(Number(e.target.value))}
              className="border rounded-xl px-4 py-2 w-28 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </label>
          <button onClick={handleGenerate} disabled={loading}
            className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition disabled:opacity-50">
            {loading ? 'جارٍ...' : 'توليد'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-gray-700">الأكواد غير المستخدمة ({unused.length})</h2>
        <div className="flex flex-wrap gap-2">
          {unused.map(c => (
            <button key={c.id} onClick={() => copyCode(c.code)}
              className={`font-mono text-sm px-4 py-2 rounded-xl border-2 transition ${copied === c.code ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-purple-400'}`}>
              {copied === c.code ? '✅ تم النسخ' : c.code}
              <span className="text-xs text-gray-400 mr-2">{c.duration_days}د</span>
            </button>
          ))}
          {unused.length === 0 && <p className="text-gray-400 text-sm">لا توجد أكواد متاحة</p>}
        </div>

        <h2 className="font-semibold text-gray-700 mt-2">المستخدمة ({used.length})</h2>
        <div className="flex flex-col gap-2">
          {used.map(c => (
            <div key={c.id} className="flex gap-3 text-sm text-gray-500">
              <span className="font-mono">{c.code}</span>
              <span>•</span>
              <span>استُخدم {c.used_at ? new Date(c.used_at).toLocaleDateString('ar') : '-'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
