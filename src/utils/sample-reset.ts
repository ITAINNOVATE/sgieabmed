"use client"

import { createClient } from "@/utils/supabase/client"

// ─── REMISE À ZÉRO UNIQUE DES DONNÉES ÉCHANTILLONS (navigateur & Cloud) ───────────────────
// Changer SAMPLE_RESET_VERSION pour déclencher une nouvelle purge complète sur tous les postes.
export const SAMPLE_RESET_VERSION = "2026-10-25-admin-eged-v3"

const SAMPLE_LOCAL_KEYS = [
  "reception_history_records",
  "reception_deleted_ids",
  "reception_synced_cloud_ids",
  "local_movements_history",
  "local_sample_overrides",
  "local_inventory_sessions",
  "sample_inventories_custom_v1",
  "sample_documents_custom_v1",
]

export function runSampleResetOnce() {
  if (typeof window === "undefined" || !window.localStorage) return

  try {
    // Migrer immédiatement tout profil stocké avec "Marie ADANDE" vers "Admin EGED"
    try {
      const curr = localStorage.getItem("eged_current_user_v1")
      if (curr) {
        const parsed = JSON.parse(curr)
        if (parsed.first_name === "Marie" || parsed.last_name === "ADANDE" || parsed.username === "m.adande" || parsed.email === "marie.adande@abmed.bj") {
          localStorage.setItem("eged_current_user_v1", JSON.stringify({
            id: "usr-1",
            first_name: "Admin",
            last_name: "EGED",
            matricule: "ABM-ADMIN-01",
            fonction: "Administrateur Système & Sécurité",
            role: "Administrateur Système",
            phone: "+229 01 97 00 00 01",
            email: "admin@eged.bj",
            username: "admin",
            photo_url: "/avatar.png",
            status: "Actif"
          }))
        }
      }
    } catch (e) {}

    if (localStorage.getItem("sample_reset_version") === SAMPLE_RESET_VERSION) return

    // 1. Réinitialiser les listes et dictionnaires d'échantillons
    SAMPLE_LOCAL_KEYS.forEach((k) => {
      if (k === "local_sample_overrides") {
        localStorage.setItem(k, "{}")
      } else {
        localStorage.setItem(k, "[]")
      }
    })

    // 2. Supprimer les brouillons, autosaves et clés résiduelles
    localStorage.removeItem("reception_form_autosave")
    localStorage.removeItem("reception_last_created_number")

    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith("reception_draft_details_") ||
        key.startsWith("local_sample_") ||
        key.startsWith("local_movement_") ||
        key.startsWith("local_inventory_") ||
        (key.startsWith("sample_") && key !== "sample_reset_version" && !SAMPLE_LOCAL_KEYS.includes(key))
      )) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))

    // Marquer l'état effacé
    localStorage.setItem("all_data_wiped", "true")
    localStorage.setItem("sample_reset_version", SAMPLE_RESET_VERSION)

    // 3. Purge Supabase Cloud en arrière-plan (échantillons, réceptions, mouvements, inventaires)
    try {
      const supabase = createClient()
      Promise.allSettled([
        supabase.from("inventory_items").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("inventories").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("movements").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("samples").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("receptions").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      ]).catch((err) => console.warn("Supabase background sample reset notice:", err))
    } catch (e) {
      console.warn("Supabase sample reset init notice:", e)
    }
  } catch (err) {
    console.error("Erreur lors de la remise à zéro des échantillons:", err)
  }
}

// Déclenchement automatique au chargement côté client
if (typeof window !== "undefined") {
  runSampleResetOnce()
}
