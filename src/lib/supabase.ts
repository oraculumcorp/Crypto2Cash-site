import { createClient } from '@supabase/supabase-js';

// PUBLIC client — anon key, crypto2cash schema
export function getPublicClient(env: any) {
  const url = env.PUBLIC_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase public credentials');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'crypto2cash' },
    global: { headers: { 'x-application-name': 'crypto2cash-web' } },
  });
}

// SERVICE client — full access, ONLY use in Workers/API routes
export function getServiceClient(env: any) {
  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service credentials');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'crypto2cash' },
  });
}

export interface BusinessLead {
  id: string;
  company: string;
  email: string;
  volume: string;
  asset: string;
  status: string;
  created_at: string;
}

export interface ApiWaitlist {
  id: string;
  email: string;
  company: string;
  use_case: string;
  created_at: string;
}

export interface Provider {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  content: string;
  category: string;
  author: string;
  published: boolean;
  published_at: string;
  created_at: string;
}
