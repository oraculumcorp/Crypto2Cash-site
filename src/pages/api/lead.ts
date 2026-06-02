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

  const { company, email, volume, asset } = body;
  if (!company || !email || !volume || !asset) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 });
  }

  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_ANON_KEY;

  const res = await fetch(`${url}/rest/v1/business_leads`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Accept-Profile': 'crypto2cash',
      'Content-Profile': 'crypto2cash',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      company: company.trim(),
      email: email.trim().toLowerCase(),
      volume,
      asset,
      status: 'new',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Supabase error:', err);
    return new Response(JSON.stringify({ error: 'Database error', detail: err }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}