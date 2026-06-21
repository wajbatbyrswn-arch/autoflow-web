'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { api } from '@/lib/api';

type Profile = {
  store_name: string; store_description: string; nashir_api_key: string;
  ai_mode: string; ai_model: string; custom_system_prompt: string;
};

export default function SettingsPage() {
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<Profile>({
    store_name: '', store_description: '', nashir_api_key: '',
    ai_mode: 'copilot', ai_model: 'claude-haiku-4-5-20251001', custom_system_prompt: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
      if (data) setProfile(prev => ({ ...prev, ...data }));
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from('user_profiles').update({
      store_name: profile.store_name,
      store_description: profile.store_description,
      nashir_api_key: profile.nashir_api_key,
      ai_mode: profile.ai_mode,
      custom_system_prompt: profile.custom_system_prompt,
    }).eq('user_id', userId);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  }

  async function testNashirConnection() {
    if (!profile.nashir_api_key) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('https://nashir.ai/api/v1/accounts', {
        headers: { 'Authorization': `Bearer ${profile.nashir_api_key}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(`✅ متصل! ${data.data?.length || 0} حساب(ات) مربوطة`);
      } else {
        setTestResult('❌ API key غير صحيح');
      }
    } catch {
      setTestResult('❌ فشل الاتصال');
    }
    setTesting(false);
  }

  return (
    <div dir="rtl" className="max-w-2xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-800">الإعدادات</h1>

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700 border-b pb-2">معلومات المتجر</h2>
          <input value={profile.store_name} onChange={e => setProfile(p => ({...p, store_name: e.target.value}))}
            placeholder="اسم المتجر" className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <textarea value={profile.store_description} onChange={e => setProfile(p => ({...p, store_description: e.target.value}))}
            placeholder="وصف المتجر (يساعد الذكاء الاصطناعي على الرد بشكل أدق)" rows={3}
            className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700 border-b pb-2">ربط ناشر</h2>
          <div className="flex gap-2">
            <input value={profile.nashir_api_key} onChange={e => setProfile(p => ({...p, nashir_api_key: e.target.value}))}
              placeholder="Nashir API Key (up_...)" type="password"
              className="flex-1 border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
            <button type="button" onClick={testNashirConnection} disabled={testing || !profile.nashir_api_key}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-200 transition disabled:opacity-50 whitespace-nowrap">
              {testing ? 'جارٍ...' : 'اختبار الاتصال'}
            </button>
          </div>
          {testResult && <p className="text-sm">{testResult}</p>}
          <p className="text-xs text-gray-400">أنشئ حساباً على nashir.ai وربط حساباتك الاجتماعية، ثم أضف API key من الإعدادات.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-gray-700 border-b pb-2">إعدادات الذكاء الاصطناعي</h2>
          <div className="flex gap-3">
            {[{ value: 'copilot', label: 'Copilot', desc: 'يقترح الرد للموظف' }, { value: 'autopilot', label: 'Auto-Pilot', desc: 'يرد تلقائياً' }].map(opt => (
              <button key={opt.value} type="button" onClick={() => setProfile(p => ({...p, ai_mode: opt.value}))}
                className={`flex-1 p-4 rounded-xl border-2 text-right transition ${profile.ai_mode === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
          <textarea value={profile.custom_system_prompt} onChange={e => setProfile(p => ({...p, custom_system_prompt: e.target.value}))}
            placeholder="بروميت مخصص (اختياري) - اتركه فارغاً لاستخدام الإعدادات الافتراضية" rows={4}
            className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs" />
        </section>

        <button type="submit" disabled={saving}
          className="bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50">
          {saving ? 'جارٍ الحفظ...' : saved ? '✅ تم الحفظ' : 'حفظ الإعدادات'}
        </button>
      </form>
    </div>
  );
}
