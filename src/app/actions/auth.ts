'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    // Si la connexion échoue, on redirige vers le login avec un paramètre d'erreur
    return redirect('/?error=Identifiants invalides')
  }

  const cookieStore = await cookies()
  cookieStore.set('eged_user_logged', 'true', { path: '/', maxAge: 86400, sameSite: 'lax' })

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete('eged_user_logged')
  redirect('/')
}
