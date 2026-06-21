const NASHIR_BASE = 'https://nashir.ai/api/v1';

async function nashirFetch(apiKey: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${NASHIR_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Nashir API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getUnreadMessages(apiKey: string, offset = 0) {
  return nashirFetch(apiKey, `/messages?is_read=false&limit=50&offset=${offset}`);
}

export async function getUnreadComments(apiKey: string, offset = 0) {
  return nashirFetch(apiKey, `/comments?is_read=false&limit=50&offset=${offset}`);
}

export async function replyToMessage(apiKey: string, messageId: number, message: string, pageId?: string) {
  return nashirFetch(apiKey, `/messages/${messageId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message, ...(pageId ? { pageId } : {}) }),
  });
}

export async function replyToComment(apiKey: string, commentId: number, message: string, pageId?: string) {
  return nashirFetch(apiKey, `/comments/${commentId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message, ...(pageId ? { pageId } : {}) }),
  });
}

export async function markMessageRead(apiKey: string, messageId: number) {
  return nashirFetch(apiKey, `/messages/${messageId}/read`, { method: 'PATCH' });
}

export async function getConnectedAccounts(apiKey: string) {
  return nashirFetch(apiKey, '/accounts');
}
