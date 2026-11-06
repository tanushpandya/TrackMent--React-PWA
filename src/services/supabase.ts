import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cqpjehsbpjeqomwlshob.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_YLdlqjzPnNeJrUN4K6AvIw_b1nhe5MX';

export const PROOFS_BUCKET = 'project-proofs';
export const STUDENT_DOMAIN = 'rvce.edu.in';
export const FACULTY_DOMAIN = 'rvce.edu.in';
export const MAX_FILE_SIZE_BYTES = 52428800; // 50MB

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
