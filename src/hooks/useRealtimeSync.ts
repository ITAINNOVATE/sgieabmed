"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  getGlobalBroadcastChannel,
  installLocalStorageSyncInterceptor,
  syncPendingLocalDataToCloud,
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

function checkIfEventIsRelevant(entity: string, tables: string[]): boolean {
  if (!entity || tables.length === 0 || tables.includes("*") || tables.includes("all")) {
    return true
  }
  const lowEntity = entity.toLowerCase()
  if (lowEntity.includes("global") || lowEntity.includes("all")) return true

  return tables.some((t) => {
    const lowTable = t.toLowerCase()
    if (lowEntity.includes(lowTable) || lowTable.includes(lowEntity)) return true

    // Correspondances sémantiques entre entités liées
    if (lowTable.includes("appointment") || lowTable.includes("rdv") || lowTable.includes("sched")) {
      return (
        lowEntity.includes("sched") ||
        lowEntity.includes("rdv") ||
        lowEntity.includes("appoint") ||
        lowEntity.includes("waste_movements") ||
        lowEntity.includes("center")
      )
    }
    if (lowTable.includes("waste_movements")) {
      return (
        lowEntity.includes("sched") ||
        lowEntity.includes("rdv") ||
        lowEntity.includes("appoint") ||
        lowEntity.includes("waste") ||
        lowEntity.includes("package") ||
        lowEntity.includes("colis") ||
        lowEntity.includes("destruction")
      )
    }
    if (lowTable.includes("center") || lowTable.includes("centre")) {
      return (
        lowEntity.includes("center") ||
        lowEntity.includes("centre") ||
        lowEntity.includes("reception") ||
        lowEntity.includes("waste") ||
        lowEntity.includes("appointment")
      )
    }
    if (lowTable.includes("waste")) {
      return (
        lowEntity.includes("waste") ||
        lowEntity.includes("batch") ||
        lowEntity.includes("package") ||
        lowEntity.includes("colis") ||
        lowEntity.includes("destruction") ||
        lowEntity.includes("center")
      )
    }
    if (lowTable.includes("sample") || lowTable.includes("echantillon")) {
      return (
        lowEntity.includes("sample") ||
        lowEntity.includes("mvt") ||
        lowEntity.includes("movement") ||
        lowEntity.includes("location") ||
        lowEntity.includes("shelf") ||
        lowEntity.includes("inventory") ||
        lowEntity.includes("center")
      )
    }
    if (lowTable.includes("reception")) {
      return (
        lowEntity.includes("reception") ||
        lowEntity.includes("sample") ||
        lowEntity.includes("waste") ||
        lowEntity.includes("center")
      )
    }
    if (lowTable.includes("destruction")) {
      return lowEntity.includes("destruction") || lowEntity.includes("waste")
    }
    if (lowTable.includes("user") || lowTable.includes("role") || lowTable.includes("permission")) {
      return (
        lowEntity.includes("user") ||
        lowEntity.includes("role") ||
        lowEntity.includes("permission") ||
        lowEntity.includes("security")
      )
    }

    return false
  })
}

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    // S'assurer que l'intercepteur de stockage local est actif
    installLocalStorageSyncInterceptor()
    syncPendingLocalDataToCloud()

    const supabase = createClient()
    const tablesKey = tables.join("-")

    // 1. Abonnement au canal Broadcast Global Supabase (tous les postes, <50ms)
    const broadcastChannel = getGlobalBroadcastChannel()
    const handleBroadcastMsg = (payload: any) => {
      const entity = (payload?.payload?.entity || payload?.entity || "").toLowerCase()
      if (checkIfEventIsRelevant(entity, tables)) {
        triggerSync.current()
      }
    }

    if (broadcastChannel) {
      broadcastChannel.on(
        "broadcast",
        { event: "sgie_mutation" },
        handleBroadcastMsg
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
          if (checkIfEventIsRelevant(entity, tables)) {
            triggerSync.current()
          }
        }
      } catch (e) {}
    }

    // 4. Écoute des événements locaux
    const handleLocalSyncEvent = (e: any) => {
      const entity = e?.detail?.entity || ""
      if (checkIfEventIsRelevant(entity, tables)) {
        triggerSync.current()
      }
    }
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) {
        triggerSync.current()
        return
      }
      if (checkIfEventIsRelevant(e.key, tables)) {
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
