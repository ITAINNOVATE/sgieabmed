"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  getGlobalBroadcastChannel,
  installLocalStorageSyncInterceptor,
} from "@/utils/realtimeBus"

interface UseRealtimeSyncOptions {
  tables: string[]
  onSync: () => void | Promise<void>
  pollIntervalMs?: number
  enabled?: boolean
}

/**
 * Hook de synchronisation automatique multi-ordinateurs et multi-niveaux en temps réel
 * - Écoute Supabase Realtime Broadcast (latence < 50ms entre tous les ordinateurs connectés)
 * - Écoute Supabase PostgreSQL Changes (réplication base de données)
 * - Écoute le canal natif BroadcastChannel (0ms entre tous les onglets du même appareil)
 * - Écoute les événements intra-application immédiats
 * - Déclenche un re-polling régulier rapide (2s) en secours
 */
export function useRealtimeSync({
  tables,
  onSync,
  pollIntervalMs = 2000,
  enabled = true,
}: UseRealtimeSyncOptions) {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  const isSyncingRef = useRef(false)
  const pendingSyncRef = useRef(false)
  const debounceTimerRef = useRef<any>(null)

  // Exécution sécurisée avec anti-rebond et anti-chevauchement
  const triggerSync = useRef(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (isSyncingRef.current) {
        pendingSyncRef.current = true
        return
      }

      isSyncingRef.current = true
      try {
        await Promise.resolve(onSyncRef.current())
      } catch (e) {
        console.warn("[useRealtimeSync] Erreur lors de l'exécution de onSync:", e)
      } finally {
        isSyncingRef.current = false
        if (pendingSyncRef.current) {
          pendingSyncRef.current = false
          setTimeout(() => triggerSync.current(), 80)
        }
      }
    }, 50)
  })

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    // S'assurer que l'intercepteur de stockage local est actif
    installLocalStorageSyncInterceptor()

    const supabase = createClient()
    const tablesKey = tables.join("-")

    // 1. Abonnement au canal Broadcast Global Supabase (tous les postes, <50ms)
    const broadcastChannel = getGlobalBroadcastChannel()
    if (broadcastChannel) {
      broadcastChannel.on(
        "broadcast",
        { event: "sgie_mutation" },
        (payload: any) => {
          const entity = (payload?.payload?.entity || "").toLowerCase()
          const isRelevant =
            !entity ||
            tables.some((t) => entity.includes(t.toLowerCase())) ||
            tables.length === 0

          if (isRelevant) {
            triggerSync.current()
          }
        }
      )
    }

    // 2. Abonnement aux Postgres Changes directs sur les tables demandées
    const dbChannelName = `db-sync-${tablesKey}-${Math.floor(Math.random() * 10000)}`
    const dbChannel = supabase.channel(dbChannelName)

    tables.forEach((table) => {
      dbChannel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          triggerSync.current()
        }
      )
    })

    dbChannel.subscribe()

    // 3. Abonnement natif BroadcastChannel (0ms entre onglets sur la même machine)
    let nativeBc: BroadcastChannel | null = null
    if ("BroadcastChannel" in window) {
      try {
        nativeBc = new BroadcastChannel("sgie_realtime_bus")
        nativeBc.onmessage = (event) => {
          const entity = (event.data?.entity || "").toLowerCase()
          const isRelevant =
            !entity ||
            tables.some((t) => entity.includes(t.toLowerCase())) ||
            tables.length === 0

          if (isRelevant) {
            triggerSync.current()
          }
        }
      } catch (e) {}
    }

    // 4. Écoute des événements locaux
    const handleLocalSyncEvent = () => triggerSync.current()
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) {
        triggerSync.current()
        return
      }
      const lowerKey = e.key.toLowerCase()
      const isCritical = [
        "reception",
        "waste",
        "sample",
        "destruction",
        "mvt",
        "movement",
        "invent",
        "sgie",
      ].some((p) => lowerKey.includes(p))

      if (isCritical) {
        triggerSync.current()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerSync.current()
      }
    }

    const handleFocus = () => {
      triggerSync.current()
    }

    window.addEventListener("eged-data-updated", handleLocalSyncEvent)
    window.addEventListener("sgie-sync-event", handleLocalSyncEvent)
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    // 5. Polling régulier de secours (toutes les 2 secondes quand la fenêtre est active)
    const effectiveInterval = Math.min(pollIntervalMs, 2500)
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        triggerSync.current()
      }
    }, effectiveInterval)

    return () => {
      clearInterval(intervalId)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      window.removeEventListener("eged-data-updated", handleLocalSyncEvent)
      window.removeEventListener("sgie-sync-event", handleLocalSyncEvent)
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)

      if (nativeBc) {
        try {
          nativeBc.close()
        } catch (e) {}
      }
      try {
        supabase.removeChannel(dbChannel)
      } catch (e) {}
    }
  }, [tables.join(","), pollIntervalMs, enabled])
}
