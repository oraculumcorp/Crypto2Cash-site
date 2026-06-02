import type { APIContext } from 'astro';
import { isAllowedOrigin, isValidEmail } from '../../lib/security';

export const prerender = false;

export async function POST({ request, locals }: APIContext) {
  const env = (locals as any).runtime?.env ?? {};
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const allowed = env.ALLOWED_ORIGINS?.split(',') ?? ['https://crypto2cash.io'];
  const isAllowed = !origin || isAllowedOrigin(origin, allowed) ||
    allowed.some((o: string) => referer?.startsWith(o));
  if (!isAllowed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { email, company, use_case } = body;
  if (!email || !isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400 });
  }

  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_ANON_KEY;

  const res = await fetch(`${url}/rest/v1/c2c_api_waitlist`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      company: company?.trim() ?? null,
      use_case: use_case?.trim() ?? null,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Supabase error:', err);
    return new Response(JSON.stringify({ error: 'Database error', detail: err }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}