'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createStandaloneClient } from '@supabase/supabase-js'

// STANDALONE CLIENT FOR CREATING USERS WITHOUT LOGGING OUT THE ADMIN
function getStandaloneClient() {
  return createStandaloneClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  )
}

// Helper to verify that the current user is an admin
async function verifyAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // Allow both standard 'Administrateur' and new 'Administrateur système' / 'Administrateur fonctionnel'
  const isAdmin = profile && (
    profile.role === 'Administrateur' || 
    profile.role === 'Administrateur système' || 
    profile.role.startsWith('ADMIN')
  )

  if (!isAdmin) throw new Error('Accès refusé : Habilitation insuffisante')
  return user.id
}

// SERVER ACTION: Create user in Supabase Auth & insert profile in public.users
export async function createUserAction(payload: {
  first_name: string
  last_name: string
  matricule: string
  fonction: string
  department_id: string
  role: string
  phone: string
  email: string
  username: string
}) {
  try {
    await verifyAdmin()

    // 1. Generate a temporary password
    const tempPass = 'Temp-' + Math.floor(100000 + Math.random() * 900000)

    // 2. Sign up the user via the standalone client (so session cookies are not set/modified)
    const standaloneSupabase = getStandaloneClient()
    const { data: authData, error: authError } = await standaloneSupabase.auth.signUp({
      email: payload.email,
      password: tempPass,
      options: {
        data: {
          username: payload.username,
          first_name: payload.first_name,
          last_name: payload.last_name
        }
      }
    })

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || "Erreur d'inscription Auth" }
    }

    const newUserId = authData.user.id

    // 3. Insert profile details into public.users using regular client (inheriting RLS)
    const supabase = await createServerClient()
    const { error: profileError } = await supabase.from('users').insert({
      id: newUserId,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      role: payload.role,
      matricule: payload.matricule,
      fonction: payload.fonction,
      department_id: payload.department_id || null,
      phone: payload.phone,
      status: 'Actif',
      must_change_password: true,
      is_deleted: false
    })

    if (profileError) {
      console.error("Profile insertion error:", profileError.message)
      // Attempt clean up of auth user (standard effort, since we can't admin-delete without service key easily)
      return { success: false, error: `Profil non créé : ${profileError.message}` }
    }

    return { success: true, tempPass }
  } catch (error: any) {
    return { success: false, error: error.message || 'Erreur inconnue' }
  }
}

// SERVER ACTION: Reset password (sends email link)
export async function resetPasswordAction(email: string) {
  try {
    await verifyAdmin()
    const supabase = await createServerClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
