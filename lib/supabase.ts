import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'implicit',
      },
    });
  }
  return _supabase;
}

// 하위호환: 기존 코드에서 supabase를 직접 참조하는 경우
// 동일한 싱글톤 인스턴스를 반환 (Multiple GoTrueClient 방지)
export const supabase = (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey
  ? getSupabase()
  : null) as SupabaseClient;
