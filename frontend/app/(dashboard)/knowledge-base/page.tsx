'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { api } from '@/lib/api';

type Product = {
  id: string; name: string; description: string; price: number | null;
  currency: string; stock_status: string; category: string;
};
const empty = { name: '', description: '', price: '', currency: 'JOD', stock_status: 'available', category: '' };

export default function KnowledgeBasePage() {
  const [userId, setUserId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        api.getProducts(user.id).then(setProducts).catch(console.error);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const data = { ...form, price: form.price ? Number(form.price) : null, user_id: userId };
    if (editing) {
      const updated = await api.updateProduct(editing, data);
      setProducts(prev => prev.map(p => p.id === editing ? updated : p));
      setEditing(null);
    } else {
      const created = await api.createProduct(data);
      setProducts(prev => [created, ...prev]);
    }
    setForm(empty);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف هذا المنتج؟')) return;
    await api.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  function startEdit(p: Product) {
    setEditing(p.id);
    setForm({ name: p.name, description: p.description || '', price: p.price?.toString() || '', currency: p.currency, stock_status: p.stock_status, category: p.category || '' });
  }

  return (
    <div dir="rtl" className="max-w-4xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-800">قاعدة المعرفة - المنتجات</h1>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-700 mb-4">{editing ? 'تعديل المنتج' : 'إضافة منتج'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
            placeholder="اسم المنتج *" className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2" />
          <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
            placeholder="وصف المنتج" className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2" rows={2} />
          <input type="number" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))}
            placeholder="السعر" className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={form.stock_status} onChange={e => setForm(p => ({...p, stock_status: e.target.value}))}
            className="border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="available">متوفر</option>
            <option value="out_of_stock">غير متوفر</option>
          </select>
          <div className="col-span-2 flex gap-3">
            <button type="submit" disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? '...' : editing ? 'حفظ التعديلات' : 'إضافة'}
            </button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(empty); }}
              className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition">إلغاء</button>}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 text-gray-600">المنتج</th>
              <th className="text-right px-4 py-3 text-gray-600">السعر</th>
              <th className="text-right px-4 py-3 text-gray-600">الحالة</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{p.name}</div>
                  {p.description && <div className="text-gray-400 text-xs">{p.description}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.price ? `${p.price} ${p.currency}` : '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${p.stock_status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.stock_status === 'available' ? 'متوفر' : 'غير متوفر'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => startEdit(p)} className="text-blue-600 hover:underline text-xs">تعديل</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">حذف</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <div className="p-8 text-gray-400 text-center">لا توجد منتجات بعد. أضف منتجاتك ليعرفها الذكاء الاصطناعي.</div>}
      </div>
    </div>
  );
}
