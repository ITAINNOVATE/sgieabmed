'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function addSample(formData: FormData) {
  const supabase = await createClient()

  // Dans un cas réel, validez les données avec Zod
  const data = {
    sample_number: formData.get('sample_number'),
    commercial_name: formData.get('commercial_name'),
    dci: formData.get('dci'),
    pharmaceutical_form: formData.get('pharmaceutical_form'),
    dosage: formData.get('dosage'),
    batch_number: formData.get('batch_number'),
    expiry_date: formData.get('expiry_date'),
    quantity: parseInt(formData.get('quantity') as string) || 0,
    unit: formData.get('unit') || 'boîte',
    status: 'Disponible'
  }

  const { error } = await supabase.from('samples').insert([data])

  if (error) {
    console.error('Erreur insertion:', error)
    return { error: error.message }
  }

  redirect('/dashboard/samples')
}
