import type { Response } from 'express';

// userId -> set of SSE response streams
const clients = new Map<string, Set<Response>>();

export function addClient(userId: string, res: Response) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);
  res.on('close', () => {
    clients.get(userId)?.delete(res);
  });
}

/** Push an event to all live streams of a user. Mirrors Electron push channels. */
export function emit(userId: string, channel: string, data: any) {
  const set = clients.get(userId);
  if (!set) return;
  const payload = `data: ${JSON.stringify({ channel, data })}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch {}
  }
}
