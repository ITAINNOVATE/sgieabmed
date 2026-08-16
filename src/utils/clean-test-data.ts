"use client"

import { createClient } from "@/utils/supabase/client"

export async function clearAllTestData(): Promise<boolean> {
  try {
    // 1. Nettoyage du localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem('local_movements_history')
      localStorage.removeItem('local_sample_overrides')
      localStorage.removeItem('reception_history_records')
      localStorage.removeItem('reception_deleted_ids')

      // Nettoyer les clés de détails de brouillon de réception
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('reception_draft_details_') || key.startsWith('reception_'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
    }

    // 2. Nettoyage optionnel Supabase si disponible
    try {
      const supabase = createClient()
      await supabase.from('movements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    } catch (e) {
      // Ignorer si pas d'accès Supabase
    }

    return true
  } catch (error) {
    console.error("Erreur lors de la suppression des données de test:", error)
    return false
  }
}
