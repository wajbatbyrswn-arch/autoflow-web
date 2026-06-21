'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { api } from '@/lib/api';

type Order = {
  id: string; customer_name: string; product_name: string; quantity: number;
  total_price: number | null; status: string; notes: string; created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار', confirmed: 'مؤكد', shipped: 'تم الشحن', cancelled: 'ملغي',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const [userId, setUserId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('');
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        api.getOrders(user.id).then(setOrders).catch(console.error);
      }
    });
  }, []);

  async function changeStatus(id: string, status: string) {
    const updated = await api.updateOrderStatus(id, status);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: updated.status } : o));
  }

  const filtered = filter ? orders.filter(o => o.status === filter) : orders;

  return (
    <div dir="rtl" className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">الطلبات ({orders.length})</h1>
        <div className="flex gap-2">
          {['', 'pending', 'confirmed', 'shipped', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${filter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>
              {s ? STATUS_LABELS[s] : 'الكل'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-right px-4 py-3 text-gray-600">العميل</th>
              <th className="text-right px-4 py-3 text-gray-600">المنتج</th>
              <th className="text-right px-4 py-3 text-gray-600">الإجمالي</th>
              <th className="text-right px-4 py-3 text-gray-600">الحالة</th>
              <th className="px-4 py-3 text-gray-600">تغيير الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{order.customer_name || 'غير محدد'}</td>
                <td className="px-4 py-3 text-gray-600">{order.product_name || 'طلب عام'}</td>
                <td className="px-4 py-3 text-gray-600">{order.total_price ? `${order.total_price} JOD` : '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={order.status}
                    onChange={e => changeStatus(order.id, e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 focus:outline-none"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-gray-400 text-center">لا توجد طلبات</div>}
      </div>
    </div>
  );
}
