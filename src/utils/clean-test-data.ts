"use client"

import { createClient } from "@/utils/supabase/client"

export async function clearAllTestData(): Promise<boolean> {
  try {
    // 1. Nettoyage du localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem('local_movements_history')
      localStorage.removeItem('local_sample_overrides')
      localStorage.removeItem('reception_history_records')
      localStorage.removeItem('reception_form_autosave')

      // Récupérer et nettoyer toutes les clés créées lors des tests de réception ou de mouvements
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('reception_') || 
          key.startsWith('local_') || 
          key.startsWith('sample_') ||
          key.includes('draft')
        )) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))

      // Enregistrer la liste des identifiants et mots clés de test supprimés
      const testDeletedList = ['GSJSJH', 'DJDK', 'ECH-2026-2632-1', 'REC-2026-2632']
      localStorage.setItem('reception_deleted_ids', JSON.stringify(testDeletedList))
    }

    // 2. Nettoyage Supabase si disponible
    try {
      const supabase = createClient()
      await supabase.from('movements').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('samples').delete().neq('id', 'sample-1').neq('id', 'sample-2').neq('id', 'sample-3').neq('id', 'sample-4').neq('id', 'sample-5')
      await supabase.from('receptions').delete().neq('id', 'rec-default-1').neq('id', 'rec-default-2').neq('id', 'rec-default-3')
    } catch (e) {
      console.warn("Supabase cleanup notice:", e)
    }

    return true
  } catch (error) {
    console.error("Erreur lors de la suppression des données de test:", error)
    return false
  }
}
