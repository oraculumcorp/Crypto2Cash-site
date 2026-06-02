import type { APIContext } from 'astro';
import { getPublicClient } from '../../lib/supabase';
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

  const supabase = getPublicClient(env);
  const { error } = await supabase.from('business_leads').insert({
    company: company.trim(),
    email: email.trim().toLowerCase(),
    volume,
    asset,
    status: 'new',
  });

  if (error) {
    console.error('Supabase error:', JSON.stringify(error));
    return new Response(JSON.stringify({ error: 'Database error', detail: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}