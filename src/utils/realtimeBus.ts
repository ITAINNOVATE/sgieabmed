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
    nativeBroadcastChannel.onmessage = (event) => {
      const payload = event.data || {}
      try {
        window.dispatchEvent(new CustomEvent("eged-data-updated", { detail: payload }))
        window.dispatchEvent(new CustomEvent("sgie-sync-event", { detail: payload }))
      } catch (e) {}
    }
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

      // 1. Écouter les diffusions WebSocket transmises par les autres ordinateurs / téléphones
      globalSupabaseChannel.on("broadcast", { event: "sgie_mutation" }, (data: any) => {
        const payload = data?.payload || {}
        try {
          window.dispatchEvent(new CustomEvent("eged-data-updated", { detail: payload }))
          window.dispatchEvent(new CustomEvent("sgie-sync-event", { detail: payload }))
        } catch (e) {}
      })

      // 2. Écouter en direct toutes les réplications PostgreSQL Cloud de Supabase
      globalSupabaseChannel.on("postgres_changes", { event: "*", schema: "public" }, (data: any) => {
        const payload: MutationPayload = {
          entity: data.table || "database",
          action: data.eventType || "change",
          record: data.new || data.old,
          timestamp: Date.now()
        }
        try {
          window.dispatchEvent(new CustomEvent("eged-data-updated", { detail: payload }))
          window.dispatchEvent(new CustomEvent("sgie-sync-event", { detail: payload }))
        } catch (e) {}
      })

      // Inscription au canal une fois les gestionnaires d'événements attachés
      globalSupabaseChannel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("[RealtimeBus] Connecté au réseau WebSocket & PostgreSQL global SGIE")
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
    "center",
    "centre",
    "appointment",
    "sched",
    "rdv",
    "user",
    "role",
    "setting",
    "document",
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

/**
 * Rapatrie et synchronise immédiatement tout enregistrement local (déchets, réceptions, plans)
 * qui n'aurait pas encore été répliqué dans Supabase Cloud (rattrapage automatique multi-postes).
 */
export async function syncPendingLocalDataToCloud() {
  if (typeof window === "undefined") return
  try {
    const supabase = createClient()

    // 1. Rattrapage des réceptions de déchets (waste_batches)
    const localWasteStr = localStorage.getItem("waste_batches_custom_v1")
    if (localWasteStr) {
      const localBatches = JSON.parse(localWasteStr)
      if (Array.isArray(localBatches) && localBatches.length > 0) {
        const { data: remoteBatches } = await supabase.from("waste_batches").select("batch_number, observations")
        const remoteMap = new Map<string, string>()
        ;(remoteBatches || []).forEach((r: any) => {
          if (r.batch_number) remoteMap.set(r.batch_number, r.observations || "")
        })
        const unsynced = localBatches.filter((b: any) => {
          if (!b.batch_number) return false
          if (!remoteMap.has(b.batch_number)) return true
          const remoteObs = remoteMap.get(b.batch_number) || ""
          const localObs = b.observations || ""
          if (localObs.includes("[FIN:") && !remoteObs.includes("[FIN:")) return true
          return false
        })

        if (unsynced.length > 0) {
          const payload = unsynced.map((lb: any) => ({
            batch_number: lb.batch_number,
            reception_number: lb.reception_number || null,
            reception_date: lb.reception_date || null,
            reception_time: lb.reception_time || null,
            delivery_slip_ref: lb.delivery_slip_ref || null,
            recipient_agent: lb.recipient_agent || "Admin EGED",
            source_structure: lb.source_structure || "Structure Déposante",
            source_type: lb.source_type || "Officine",
            city: lb.city || "Cotonou",
            depositor_name: lb.depositor_name || "",
            depositor_phone: lb.depositor_phone || "",
            depositor_id_card: lb.depositor_id_card || "",
            waste_type: lb.waste_type || "Déchets pharmaceutiques",
            commercial_name: lb.commercial_name || "",
            original_batch: lb.original_batch || "",
            sample_id: lb.sample_id || null,
            quantity: Number(lb.quantity) || 1,
            unit: lb.unit || "Kg",
            packaging: lb.packaging || "Carton",
            packaging_condition: lb.packaging_condition || "Conforme",
            destruction_motive: lb.destruction_motive || "Péremption",
            current_location: lb.current_location || "MAGASIN DES DECHETS",
            status: lb.status || "Déclaré",
            observations: lb.observations || "",
          }))

          const { error } = await supabase.from("waste_batches").upsert(payload, { onConflict: "batch_number" })
          if (!error) {
            broadcastDataMutation({
              entity: "waste_batches",
              action: "catchup_sync",
              id: `count-${unsynced.length}`,
            })
          }
        }
      }
    }

    // 2. Rattrapage des réceptions classiques (receptions)
    const localRecsStr = localStorage.getItem("reception_history_records")
    if (localRecsStr) {
      const localRecs = JSON.parse(localRecsStr)
      if (Array.isArray(localRecs) && localRecs.length > 0) {
        const { data: remoteRecs } = await supabase.from("receptions").select("rec_number")
        const remoteRecSet = new Set((remoteRecs || []).map((r: any) => r.rec_number))
        const unsyncedRecs = localRecs.filter((r: any) => r.rec_number && !remoteRecSet.has(r.rec_number))

        if (unsyncedRecs.length > 0) {
          const recsPayload = unsyncedRecs.map((r: any) => ({
            rec_number: r.rec_number,
            date_reception: r.date_reception || new Date().toISOString().split("T")[0],
            time_reception: r.time_reception || "08:00",
            ref_document: r.ref_document || null,
            type_reception: r.type_reception || null,
            inspector: r.inspector || "Admin EGED",
            status: r.status || "En attente de validation",
            supplier: r.supplier || "Demandeur",
            manufacturer: r.manufacturer || null,
            country: r.country || null,
            city: r.city || null,
            contact_person: r.contact_person || null,
            phone: r.phone || null,
            samples_data: r.samples_data || [],
          }))
          const { error } = await supabase.from("receptions").upsert(recsPayload, { onConflict: "rec_number" })
          if (!error) {
            broadcastDataMutation({
              entity: "receptions",
              action: "catchup_sync",
              id: `count-${unsyncedRecs.length}`,
            })
          }
        }
      }
    }

    // 3. Rattrapage des colis groupés de déchets (waste_grouped_packages_v1)
    const localPackagesStr = localStorage.getItem("waste_grouped_packages_v1")
    if (localPackagesStr) {
      const localPkgs = JSON.parse(localPackagesStr)
      if (Array.isArray(localPkgs) && localPkgs.length > 0) {
        // A. Récupérer l'ensemble des colis dissous (Cloud + Local)
        const dissolvedSet = new Set<string>()
        try {
          const rawDel = localStorage.getItem("waste_packages_deleted_ids")
          if (rawDel) {
            const arr = JSON.parse(rawDel)
            if (Array.isArray(arr)) arr.forEach((x: string) => dissolvedSet.add(x))
          }
        } catch {}

        const { data: dissolvedMvts } = await supabase
          .from("waste_movements")
          .select("batch, observations")
          .eq("type", "Colis dissous")

        if (dissolvedMvts) {
          dissolvedMvts.forEach((m: any) => {
            if (m.batch) dissolvedSet.add(m.batch)
            try {
              const obs = JSON.parse(m.observations || "{}")
              if (obs.package_number) dissolvedSet.add(obs.package_number)
              if (obs.id) dissolvedSet.add(obs.id)
            } catch {}
          })
        }

        // B. Purger le localStorage de tout colis dissous
        const cleanLocalPkgs = localPkgs.filter(
          (p: any) => !dissolvedSet.has(p.package_number) && (!p.id || !dissolvedSet.has(p.id))
        )
        if (cleanLocalPkgs.length !== localPkgs.length) {
          localStorage.setItem("waste_grouped_packages_v1", JSON.stringify(cleanLocalPkgs))
        }

        // C. Vérifier les colis existants dans le Cloud
        const { data: remoteMvts } = await supabase
          .from("waste_movements")
          .select("batch")
          .eq("type", "Regroupement en colis")
        const remoteSet = new Set((remoteMvts || []).map((m: any) => m.batch))

        // D. Ne synchroniser vers le Cloud QUE les colis légitimes NON dissous
        const unsyncedPkgs = cleanLocalPkgs.filter(
          (p: any) =>
            p.package_number &&
            !remoteSet.has(p.package_number) &&
            !dissolvedSet.has(p.package_number) &&
            (!p.id || !dissolvedSet.has(p.id))
        )

        if (unsyncedPkgs.length > 0) {
          const mvtsPayload = unsyncedPkgs.map((pkg: any) => ({
            mvt_number: `PKG-${pkg.package_number}`,
            date: pkg.created_at || new Date().toISOString(),
            type: "Regroupement en colis",
            batch: pkg.package_number,
            waste_type: pkg.package_type || "Colis groupé",
            commercial_name: pkg.package_name || pkg.package_number,
            quantity: `${pkg.total_weight} ${pkg.unit || "Kg"}`,
            operator: pkg.created_by || "Maëlle DOSSOU-YOVO (Agent Déchets)",
            origin: (pkg.items || []).map((i: any) => i.batch_number).filter(Boolean).join(", ") || null,
            destination: pkg.current_location || "Magasin Déchets",
            observations: JSON.stringify(pkg),
          }))

          const { error } = await supabase.from("waste_movements").upsert(mvtsPayload, { onConflict: "mvt_number" })
          if (!error) {
            broadcastDataMutation({
              entity: "waste_movements,grouped_packages",
              action: "catchup_sync",
              id: `count-${unsyncedPkgs.length}`,
            })
          }
        }
      }
    }
  } catch (err) {
    console.warn("[RealtimeBus] Erreur rattrapage automatique Cloud:", err)
  }
}

// Installation automatique dès le chargement client
if (typeof window !== "undefined") {
  installLocalStorageSyncInterceptor()
  getGlobalBroadcastChannel()
  setTimeout(() => {
    syncPendingLocalDataToCloud()
  }, 1000)
  // Rattrapage périodique : toute saisie restée locale est renvoyée au Cloud sans attendre un rechargement
  setInterval(() => {
    syncPendingLocalDataToCloud()
  }, 60000)
  // Rattrapage immédiat au retour de connexion Internet ou au retour sur l'onglet
  window.addEventListener("online", () => {
    syncPendingLocalDataToCloud()
  })
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncPendingLocalDataToCloud()
    }
  })
}
