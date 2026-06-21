import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Create profile on first login
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      await fetch(`${backendUrl}/api/activation/status?user_id=${user.id}`).catch(() => {});

      // Upsert user_profiles via Supabase directly (service role not available client-side, done via DB trigger)
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        store_name: user.user_metadata?.full_name || '',
      }, { onConflict: 'user_id', ignoreDuplicates: true });

      return NextResponse.redirect(`${origin}/activate`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
