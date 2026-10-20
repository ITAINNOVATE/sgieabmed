import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient<any>> | null = null

export function createClient(): ReturnType<typeof createBrowserClient<any>> {
  if (typeof window === 'undefined') {
    return createBrowserClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mvmsakbqqekdvneennig.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_tzwOWfcH6sQ7gXMi2U8PmA_bH72o9IN'
    )
  }
  if (!browserClient) {
    browserClient = createBrowserClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mvmsakbqqekdvneennig.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_tzwOWfcH6sQ7gXMi2U8PmA_bH72o9IN'
    )
  }
  return browserClient
}



