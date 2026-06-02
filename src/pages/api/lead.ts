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

  const { company, email, volume, asset } = body;
  if (!company || !email || !volume || !asset) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400 });
  }

  // Save to Supabase
  const supabase = getServiceClient(env);
  const { error } = await supabase.from('business_leads').insert({
    company: company.trim(),
    email: email.trim().toLowerCase(),
    volume,
    asset,
    status: 'new',
  });

  if (error) {
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500 });
  }

  // Send notification email via Cloudflare Email Workers
  try {
    const notifyEmail = env.NOTIFY_EMAIL ?? 'contact@crypto2cash.io';
    const { EmailMessage } = await import('cloudflare:email');
    const { createMimeMessage } = await import('mimetext');

    const msg = createMimeMessage();
    msg.setSender({ name: 'Crypto2Cash Leads', addr: 'contact@crypto2cash.io' });
    msg.setRecipient(notifyEmail);
    msg.setSubject(`New Lead: ${company} — ${volume} ${asset}`);
    msg.addMessage({
      contentType: 'text/plain',
      data: `New business lead received:\n\nCompany: ${company}\nEmail: ${email}\nVolume: ${volume}\nAsset: ${asset}\n\nLog in to Supabase to view and manage leads.`,
    });

    const message = new EmailMessage('contact@crypto2cash.io', notifyEmail, msg.asRaw());
    await (env as any).SEND_EMAIL.send(message);
  } catch {
    // Email failure does not block lead capture
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}