"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"

interface UseRealtimeSyncOptions {
  tables: string[]
  onSync: () => void | Promise<void>
  pollIntervalMs?: number
  enabled?: boolean
}

/**
 * Hook de synchronisation automatique multi-ordinateurs en temps réel
 * - Écoute les modifications Supabase Realtime (WebSocket PostgreSQL Changes)
 * - Rafraîchit au retour du focus sur la fenêtre / onglet (visibilitychange)
 * - Effectue un re-polling périodique léger en fallback réseau
 */
export function useRealtimeSync({
  tables,
  onSync,
  pollIntervalMs = 8000,
  enabled = true,
}: UseRealtimeSyncOptions) {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const supabase = createClient()
    const tablesKey = tables.join("-")
    const channelName = `realtime-sync-${tablesKey}-${Math.floor(Math.random() * 100000)}`
    const channel = supabase.channel(channelName)

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          console.log(`[RealtimeSync] Modification détectée sur la table ${table} (${payload.eventType})`)
          try {
            onSyncRef.current()
          } catch (e) {
            console.warn("[RealtimeSync] Erreur lors du rappel onSync:", e)
          }
        }
      )
    })

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[RealtimeSync] Abonnement actif pour: [${tables.join(", ")}]`)
      }
    })

    // 2. Polling périodique de sécurité (pour les environnements avec proxy/firewall limitant les WebSockets)
    const intervalId = setInterval(() => {
      try {
        onSyncRef.current()
      } catch (e) {}
    }, pollIntervalMs)

    // 3. Réactualisation automatique quand l'utilisateur change d'onglet ou revient sur la fenêtre
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        try {
          onSyncRef.current()
        } catch (e) {}
      }
    }
    const handleFocus = () => {
      try {
        onSyncRef.current()
      } catch (e) {}
    }

    // 4. Écoute inter-onglets du même poste
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.includes("reception") || e.key.includes("waste") || e.key.includes("sample") || e.key.includes("destruction") || e.key.includes("mvt"))) {
        try {
          onSyncRef.current()
        } catch (e) {}
      }
    }

    window.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("storage", handleStorageChange)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("storage", handleStorageChange)
      supabase.removeChannel(channel)
    }
  }, [tables.join(","), pollIntervalMs, enabled])
}
