'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { api } from '@/lib/api';

type User = {
  user_id: string; store_name: string; ai_model: string; ai_mode: string;
  subscription_status: string; subscription_expires_at: string | null;
  plan: string; is_admin: boolean; created_at: string;
};

const AI_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku (اقتصادي)' },
  { value: 'claude-sonnet-4-6', label: 'Sonnet (متوازن)' },
  { value: 'claude-opus-4-8', label: 'Opus (متميز)' },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-700',
};

export default function UsersPage() {
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        api.getAdminUsers(user.id).then(setUsers).catch(console.error);
      }
    });
  }, []);

  async function updateUser(targetId: string, data: Record<string, unknown>) {
    setSaving(targetId);
    const updated = await api.updateUser(userId, targetId, data);
    setUsers(prev => prev.map(u => u.user_id === targetId ? { ...u, ...updated } : u));
    setSaving(null);
  }

  return (
    <div dir="rtl" className="max-w-5xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-800">المستخدمون ({users.length})</h1>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 text-gray-600">المتجر</th>
              <th className="text-right px-4 py-3 text-gray-600">الحالة</th>
              <th className="text-right px-4 py-3 text-gray-600">الانتهاء</th>
              <th className="text-right px-4 py-3 text-gray-600">الموديل</th>
              <th className="text-right px-4 py-3 text-gray-600">حالة الاشتراك</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.user_id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{user.store_name || 'غير محدد'}</div>
                  <div className="text-xs text-gray-400">{user.user_id.slice(0, 8)}...</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[user.subscription_status] || STATUS_COLORS.inactive}`}>
                    {user.subscription_status === 'active' ? 'نشط' : user.subscription_status === 'expired' ? 'منتهي' : 'غير نشط'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {user.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString('ar') : '-'}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.ai_model}
                    onChange={e => updateUser(user.user_id, { ai_model: e.target.value })}
                    disabled={saving === user.user_id}
                    className="text-xs border rounded-lg px-2 py-1 focus:outline-none"
                  >
                    {AI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.subscription_status}
                    onChange={e => updateUser(user.user_id, { subscription_status: e.target.value })}
                    disabled={saving === user.user_id}
                    className="text-xs border rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="expired">منتهي</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="p-8 text-gray-400 text-center">لا يوجد مستخدمون</div>}
      </div>
    </div>
  );
}
