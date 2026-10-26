"use client"

import { createClient } from "@/utils/supabase/client"

export interface MutationPayload {
  entity: string
  action?: string
  id?: string
  user?: string
  timestamp?: number
  [key: string]: unknown
}

// Canal natif navigateur pour synchronisation 0ms entre onglets
let nativeBroadcastChannel: BroadcastChannel | null = null
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    nativeBroadcastChannel = new BroadcastChannel("sgie_realtime_bus")
  } catch (e) {
    console.warn("[RealtimeBus] BroadcastChannel non supporté:", e)
  }
}

// Canal Supabase Realtime Broadcast partagé (WebSocket multi-ordinateurs)
let globalSupabaseChannel: any = null

export function getGlobalBroadcastChannel() {
  if (typeof window === "undefined") return null
  if (!globalSupabaseChannel) {
    try {
      const supabase = createClient()
      globalSupabaseChannel = supabase.channel("sgie-global-live-sync", {
        config: {
          broadcast: { self: false, ack: false },
        },
      })
      globalSupabaseChannel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("[RealtimeBus] Connecté au réseau WebSocket global SGIE")
        }
      })
    } catch (e) {
      console.warn("[RealtimeBus] Erreur initialisation canal Supabase:", e)
    }
  }
  return globalSupabaseChannel
}

/**
 * Diffuse instantanément une modification à tous les composants, tous les onglets
 * et tous les postes connectés à la plateforme.
 */
export function broadcastDataMutation(payload: MutationPayload) {
  if (typeof window === "undefined") return

  const fullPayload: MutationPayload = {
    ...payload,
    timestamp: payload.timestamp || Date.now(),
  }

  // 1. Émission locale immédiate (même onglet)
  try {
    window.dispatchEvent(new CustomEvent("eged-data-updated", { detail: fullPayload }))
    window.dispatchEvent(new CustomEvent("sgie-sync-event", { detail: fullPayload }))
  } catch (e) {}

  // 2. Émission inter-onglets (même ordinateur, 0ms)
  try {
    if (nativeBroadcastChannel) {
      nativeBroadcastChannel.postMessage(fullPayload)
    }
  } catch (e) {}

  // 3. Émission WebSocket Supabase Realtime Broadcast (tous les postes dans le monde, <50ms)
  try {
    const channel = getGlobalBroadcastChannel()
    if (channel) {
      channel.send({
        type: "broadcast",
        event: "sgie_mutation",
        payload: fullPayload,
      })
    }
  } catch (e) {
    console.warn("[RealtimeBus] Échec broadcast Supabase:", e)
  }
}

// -------------------------------------------------------------
// Intercepteur transparent de localStorage pour auto-propager
// toute opération sans modifier le code existant
// -------------------------------------------------------------
let isInterceptorInstalled = false
export function installLocalStorageSyncInterceptor() {
  if (typeof window === "undefined" || isInterceptorInstalled) return
  isInterceptorInstalled = true

  const originalSetItem = localStorage.setItem
  const originalRemoveItem = localStorage.removeItem

  const criticalKeyPrefixes = [
    "reception",
    "waste",
    "sample",
    "mvt",
    "movement",
    "destruction",
    "invent",
    "magasin",
    "location",
  ]

  let throttleTimer: any = null
  let pendingKeys: string[] = []

  const triggerBroadcast = (key: string, action: string) => {
    pendingKeys.push(key)
    if (throttleTimer) return
    throttleTimer = setTimeout(() => {
      const keysSnapshot = [...pendingKeys]
      pendingKeys = []
      throttleTimer = null

      broadcastDataMutation({
        entity: keysSnapshot.join(","),
        action,
      })
    }, 40)
  }

  localStorage.setItem = function (key: string, value: string) {
    originalSetItem.apply(this, [key, value])
    const lowerKey = key.toLowerCase()
    if (criticalKeyPrefixes.some((prefix) => lowerKey.includes(prefix))) {
      triggerBroadcast(key, "set")
    }
  }

  localStorage.removeItem = function (key: string) {
    originalRemoveItem.apply(this, [key])
    const lowerKey = key.toLowerCase()
    if (criticalKeyPrefixes.some((prefix) => lowerKey.includes(prefix))) {
      triggerBroadcast(key, "remove")
    }
  }
}

// Installation automatique dès le chargement client
if (typeof window !== "undefined") {
  installLocalStorageSyncInterceptor()
  getGlobalBroadcastChannel()
}
