import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mvmsakbqqekdvneennig.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_tzwOWfcH6sQ7gXMi2U8PmA_bH72o9IN'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
