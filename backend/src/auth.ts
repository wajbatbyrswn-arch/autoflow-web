import { supabaseAnon } from './supabase';

const cache = new Map<string, { userId: string; exp: number }>();

/** Verify a Supabase access token and return the user id (cached briefly). */
export async function verifyToken(token: string): Promise<string | null> {
  const cached = cache.get(token);
  if (cached && cached.exp > Date.now()) return cached.userId;

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) return null;

  cache.set(token, { userId: data.user.id, exp: Date.now() + 60_000 });
  return data.user.id;
}

export function getBearer(authHeader?: string): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
