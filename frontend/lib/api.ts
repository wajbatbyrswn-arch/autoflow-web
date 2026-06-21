const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Inbox
  getConversations: (userId: string) =>
    apiFetch(`/api/inbox/conversations?user_id=${userId}`),
  getMessages: (conversationId: string) =>
    apiFetch(`/api/inbox/messages?conversation_id=${conversationId}`),
  sendReply: (body: { user_id: string; conversation_id: string; nashir_message_id: string; message: string; is_comment?: boolean }) =>
    apiFetch('/api/inbox/reply', { method: 'POST', body: JSON.stringify(body) }),

  // Knowledge Base
  getProducts: (userId: string) => apiFetch(`/api/kb?user_id=${userId}`),
  createProduct: (data: Record<string, unknown>) => apiFetch('/api/kb', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Record<string, unknown>) => apiFetch(`/api/kb/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => apiFetch(`/api/kb/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: (userId: string, status?: string) =>
    apiFetch(`/api/orders?user_id=${userId}${status ? `&status=${status}` : ''}`),
  createOrder: (data: Record<string, unknown>) => apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderStatus: (id: string, status: string) =>
    apiFetch(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Activation
  activate: (userId: string, code: string) =>
    apiFetch('/api/activation/activate', { method: 'POST', body: JSON.stringify({ user_id: userId, code }) }),
  getActivationStatus: (userId: string) =>
    apiFetch(`/api/activation/status?user_id=${userId}`),

  // Admin
  generateCodes: (userId: string, durationDays: number, count: number) =>
    apiFetch('/api/admin/codes/generate', { method: 'POST', body: JSON.stringify({ user_id: userId, duration_days: durationDays, count }) }),
  getAdminCodes: (userId: string) => apiFetch(`/api/admin/codes?user_id=${userId}`),
  getAdminUsers: (userId: string) => apiFetch(`/api/admin/users?user_id=${userId}`),
  updateUser: (adminId: string, targetUserId: string, data: Record<string, unknown>) =>
    apiFetch(`/api/admin/users/${targetUserId}`, { method: 'PATCH', body: JSON.stringify({ user_id: adminId, ...data }) }),
};
