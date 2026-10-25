"use client"

import { createClient } from "@/utils/supabase/client"

export async function clearAllTestData(): Promise<boolean> {
  try {
    // 1. Nettoyage complet du localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem('all_data_wiped', 'true')
      localStorage.removeItem('local_movements_history')
      localStorage.removeItem('local_sample_overrides')
      localStorage.removeItem('reception_history_records')
      localStorage.removeItem('reception_form_autosave')
      localStorage.removeItem('waste_batches_custom_v1')
      localStorage.removeItem('destruction_plans_custom_v1')
      localStorage.removeItem('reception_deleted_ids')

      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('reception_') || 
          key.startsWith('local_') || 
          key.startsWith('sample_') ||
          key.startsWith('waste_') ||
          key.startsWith('destruction_') ||
          key.includes('draft')
        )) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))

      // Poser le drapeau d'effacement total
      localStorage.setItem('all_data_wiped', 'true')
    }

    // 2. Suppression des données de test dans Supabase (en conservant l'admin)
    try {
      const supabase = createClient()
      await supabase.from('destruction_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('destruction_validations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('destruction_plans').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('waste_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('inventories').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('movements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('samples').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('receptions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('users').delete()
        .neq('username', 'admin')
        .neq('username', 'm.adande')
        .neq('email', 'admin@eged.bj')
        .neq('email', 'admin@sgie.com')
    } catch (e) {
      console.warn("Supabase total cleanup notice:", e)
    }

    return true
  } catch (error) {
    console.error("Erreur lors de la suppression totale des données:", error)
    return false
  }
}

export function restoreDefaultDemoData() {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem('all_data_wiped')
    localStorage.removeItem('reception_deleted_ids')
  }
}
