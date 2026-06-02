import type { APIContext } from 'astro';
import { getServiceClient } from '../../lib/supabase';
import { isAllowedOrigin, isValidEmail } from '../../lib/security';

export const prerender = false;

export async function POST({ request, locals }: APIContext) {
  const env = (locals as any).runtime?.env ?? {};
  const origin = request.headers.get('origin');
  const allowed = env.ALLOWED_ORIGINS?.split(',') ?? ['https://crypto2cash.io'];
  if (!isAllowedOrigin(origin, allowed)) {
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

  const supabase = getServiceClient(env);
  const { error } = await supabase.from('api_waitlist').insert({
    email: email.trim().toLowerCase(),
    company: company?.trim() ?? null,
    use_case: use_case?.trim() ?? null,
  });

  if (error?.code === '23505') {
    return new Response(JSON.stringify({ success: true, duplicate: true }), { status: 200 });
  }
  if (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
