"use client"

import { createClient } from "@/utils/supabase/client"
import { broadcastDataMutation } from "@/utils/realtimeBus"
import { DEFAULT_OFFICIAL_CENTERS } from "./centers-seed"

export interface Center {
  id: string
  center_code: string // Ex: "CTR-2026-0001"
  name: string
  center_type: string
  city: string
  country?: string
  address?: string
  contact_person?: string
  phone?: string
  email?: string
  password?: string // Mot de passe d'accès pour le centre
  account_status?: "Actif" | "Suspendu"
  last_login?: string
  created_at: string
  updated_at?: string
}

/**
 * Génère le mot de passe initial sécurisé par défaut pour un centre apporteur
 * Ex: CTR-2026-0001 -> AbMed@CTR20260001!
 */
export function getCenterDefaultPassword(centerCode: string): string {
  const clean = (centerCode || "CTR").replace(/[^a-zA-Z0-9]/g, "")
  return `AbMed@${clean}!`
}

export const CENTER_TYPES = [
  "Officine privée de pharmacie",
  "Établissement hospitalier / Clinique",
  "Zone Sanitaire",
  "Promoteur d'essai clinique",
  "Grossiste-répartiteur pharmaceutique",
  "Laboratoire d'analyses médicales",
  "Industrie / Fabricant pharmaceutique",
  "Organisme de santé publique / ONG",
  "Site d'essai clinique",
  "Autre structure sanitaire",
]

export const LOCAL_STORAGE_CENTERS_KEY = "registered_centers_v1"

/**
 * Génère le prochain identifiant unique pour un nouveau centre (ex: CTR-2026-0001)
 */
export function generateNextCenterCode(existingCenters: Center[], customYear?: number): string {
  const currentYear = customYear || new Date().getFullYear()
  const prefix = `CTR-${currentYear}-`

  let maxNum = 0
  if (Array.isArray(existingCenters)) {
    for (const c of existingCenters) {
      if (!c.center_code) continue
      const match = c.center_code.match(/^CTR-(\d{4})-(\d+)$/)
      if (match) {
        const year = parseInt(match[1], 10)
        const seq = parseInt(match[2], 10)
        if (year === currentYear && !isNaN(seq) && seq > maxNum) {
          maxNum = seq
        }
      }
    }
  }

  const nextSeq = maxNum + 1
  return `${prefix}${nextSeq.toString().padStart(4, "0")}`
}

// Cache en mémoire pour éliminer les latences et les sauts d'affichage
let memoryCentersCache: Center[] | null = null

/**
 * Récupère instantanément les centres depuis la mémoire ou le localStorage (synchrone)
 */
export function getRegisteredCentersSync(): Center[] {
  if (memoryCentersCache && memoryCentersCache.length > 0) {
    return memoryCentersCache
  }

  // Base officielle garantie (46 structures répertoriées avec mots de passe par défaut)
  const defaultList: Center[] = DEFAULT_OFFICIAL_CENTERS.map(c => ({
    ...c,
    password: c.password || getCenterDefaultPassword(c.center_code),
    account_status: c.account_status || "Actif"
  }))

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CENTERS_KEY)
      if (stored) {
        const parsed: Center[] = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const centerMap = new Map<string, Center>()
          defaultList.forEach(c => centerMap.set(c.center_code, c))
          parsed.forEach(c => {
            if (c.center_code) {
              const base = centerMap.get(c.center_code)
              centerMap.set(c.center_code, {
                ...(base || c),
                ...c,
                password: c.password || base?.password || getCenterDefaultPassword(c.center_code),
                account_status: c.account_status || base?.account_status || "Actif"
              })
            }
          })
          const merged = Array.from(centerMap.values())
          memoryCentersCache = merged
          return merged
        }
      }
      localStorage.setItem(LOCAL_STORAGE_CENTERS_KEY, JSON.stringify(defaultList))
    } catch (e) {}
  }
  memoryCentersCache = defaultList
  return defaultList
}

/**
 * Construit une table de correspondance Nom normalisé -> Code CTR
 */
export function buildCenterCodeMap(centers: Center[]): Map<string, string> {
  const map = new Map<string, string>()
  centers.forEach((c) => {
    if (c.center_code && c.name) {
      map.set(c.name.trim().toUpperCase(), c.center_code)
      if (c.id) map.set(c.id, c.center_code)
    }
  })
  return map
}

/**
 * Résout le code CTR d'un centre à partir de son nom ou de son code
 */
export function resolveCenterCode(nameOrCode?: string | null, centers?: Center[]): string | null {
  if (!nameOrCode) return null
  const clean = nameOrCode.trim()
  if (clean.startsWith("CTR-")) return clean
  const list = centers || getRegisteredCentersSync()
  const found = list.find(
    (c) => c.center_code === clean || c.name.trim().toUpperCase() === clean.toUpperCase() || c.id === clean
  )
  return found?.center_code || null
}

/**
 * Récupère tous les centres répertoriés (Supabase + localStorage avec synchronisation transparente)
 */
export async function getRegisteredCenters(): Promise<Center[]> {
  const baseList = getRegisteredCentersSync()
  const centerMap = new Map<string, Center>()
  baseList.forEach(c => centerMap.set(c.center_code, c))

  // 1. Synchroniser avec Supabase Cloud si disponible
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("centers")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && Array.isArray(data) && data.length > 0) {
      data.forEach((item: any) => {
        const c: Center = {
          id: item.id || `center-${Date.now()}-${Math.random()}`,
          center_code: item.center_code || item.id,
          name: item.name || "Centre sans nom",
          center_type: item.center_type || "Officine privée de pharmacie",
          city: item.city || "Cotonou",
          country: item.country || "Bénin",
          address: item.address || "",
          contact_person: item.contact_person || "",
          phone: item.phone || "",
          email: item.email || "",
          password: item.password || getCenterDefaultPassword(item.center_code),
          account_status: item.account_status || "Actif",
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || item.created_at || new Date().toISOString(),
        }
        centerMap.set(c.center_code, c)
      })
    }
  } catch (err) {
    console.warn("Notice fetch centers Supabase:", err)
  }

  // 2. Découverte automatique additive à partir des réceptions et lots existants
  if (typeof window !== "undefined") {
    const existingList = Array.from(centerMap.values())
    const autoDiscovered = autoDiscoverCentersFromExistingData(existingList)
    autoDiscovered.forEach((c) => {
      if (!centerMap.has(c.center_code)) {
        centerMap.set(c.center_code, c)
      }
    })
  }

  const list = Array.from(centerMap.values()).sort((a, b) => {
    return (a.center_code || "").localeCompare(b.center_code || "")
  })

  // Mettre à jour les caches
  memoryCentersCache = list
  if (typeof window !== "undefined" && list.length > 0) {
    try {
      localStorage.setItem(LOCAL_STORAGE_CENTERS_KEY, JSON.stringify(list))
    } catch (e) {}
  }

  return list
}

/**
 * Découvre automatiquement les centres déjà saisis dans les réceptions ou lots de déchets passés
 */
export function autoDiscoverCentersFromExistingData(existingList: Center[] = []): Center[] {
  if (typeof window === "undefined") return []
  const discovered: Center[] = []
  const seenNames = new Set<string>()

  // Ignorer les centres déjà connus
  existingList.forEach((e) => {
    if (e.name) seenNames.add(e.name.trim().toUpperCase())
  })

  try {
    // A. Depuis les réceptions d'échantillons
    const recStored = localStorage.getItem("reception_history_records")
    if (recStored) {
      const recs = JSON.parse(recStored)
      if (Array.isArray(recs)) {
        recs.forEach((r: any) => {
          const name = (r.supplier || "").trim()
          if (name && name !== "DEMANDEUR NON PRÉCISÉ" && !seenNames.has(name.toUpperCase())) {
            seenNames.add(name.toUpperCase())
            const code = generateNextCenterCode([...existingList, ...discovered])
            discovered.push({
              id: `ctr-auto-${Date.now()}-${discovered.length}`,
              center_code: r.center_code || code,
              name: name,
              center_type: r.source_type || "Officine privée de pharmacie",
              city: r.city || "Cotonou",
              country: r.country || "Bénin",
              contact_person: r.contact_person || r.inspector || "",
              phone: r.phone || "",
              email: r.email || "",
              created_at: r.date_reception ? new Date(r.date_reception).toISOString() : new Date().toISOString(),
            })
          }
        })
      }
    }

    // B. Depuis les lots de déchets
    const wasteStored = localStorage.getItem("waste_batches_custom_v1")
    if (wasteStored) {
      const batches = JSON.parse(wasteStored)
      if (Array.isArray(batches)) {
        batches.forEach((b: any) => {
          const name = (b.source_structure || "").trim()
          if (name && name !== "Interne ABMed" && !seenNames.has(name.toUpperCase())) {
            seenNames.add(name.toUpperCase())
            const code = generateNextCenterCode([...existingList, ...discovered])
            discovered.push({
              id: `ctr-auto-${Date.now()}-${discovered.length}`,
              center_code: b.center_code || code,
              name: name,
              center_type: b.source_type || "Officine privée de pharmacie",
              city: b.city || "Cotonou",
              country: "Bénin",
              contact_person: b.depositor_name || "",
              phone: b.depositor_phone || "",
              created_at: b.reception_date ? new Date(b.reception_date).toISOString() : new Date().toISOString(),
            })
          }
        })
      }
    }
  } catch (e) {
    console.warn("Erreur auto-découverte centres:", e)
  }

  return discovered
}

/**
 * Enregistre ou met à jour un centre dans localStorage et Supabase Cloud
 */
export async function saveCenter(centerData: Partial<Center>): Promise<Center> {
  const existingList = await getRegisteredCenters()
  const cleanName = (centerData.name || "").trim().toUpperCase()

  // Vérifier si un centre avec le même code ou même nom existe déjà
  let target = existingList.find(
    (c) => (centerData.center_code && c.center_code === centerData.center_code) ||
           (centerData.id && c.id === centerData.id) ||
           (cleanName && c.name.trim().toUpperCase() === cleanName)
  )

  const centerCode = target?.center_code || centerData.center_code || generateNextCenterCode(existingList)
  const id = target?.id || centerData.id || `ctr-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`

  const updatedCenter: Center = {
    id: id,
    center_code: centerCode,
    name: centerData.name ? centerData.name.trim() : (target?.name || "Centre Inconnu"),
    center_type: centerData.center_type || target?.center_type || "Officine privée de pharmacie",
    city: centerData.city || target?.city || "Cotonou",
    country: centerData.country || target?.country || "Bénin",
    address: centerData.address ?? target?.address ?? "",
    contact_person: centerData.contact_person ?? target?.contact_person ?? "",
    phone: centerData.phone ?? target?.phone ?? "",
    email: centerData.email ?? target?.email ?? "",
    password: centerData.password || target?.password || getCenterDefaultPassword(centerCode),
    account_status: centerData.account_status || target?.account_status || "Actif",
    last_login: centerData.last_login || target?.last_login,
    created_at: target?.created_at || centerData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 1. Sauvegarde locale
  const filtered = existingList.filter((c) => c.center_code !== centerCode && c.id !== id)
  const newList = [updatedCenter, ...filtered]
  memoryCentersCache = newList

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_CENTERS_KEY, JSON.stringify(newList))
    } catch (e) {}
  }

  // 2. Synchronisation Cloud Supabase
  try {
    const supabase = createClient()
    await supabase.from("centers").upsert(
      {
        id: updatedCenter.id,
        center_code: updatedCenter.center_code,
        name: updatedCenter.name,
        center_type: updatedCenter.center_type,
        city: updatedCenter.city,
        country: updatedCenter.country,
        address: updatedCenter.address,
        contact_person: updatedCenter.contact_person,
        phone: updatedCenter.phone,
        email: updatedCenter.email,
        updated_at: updatedCenter.updated_at,
      },
      { onConflict: "center_code" }
    )
  } catch (err) {
    console.warn("Échec upsert center Supabase:", err)
  }

  // Notifier l'application en temps réel
  broadcastDataMutation({ entity: "centers", action: "save" })

  return updatedCenter
}

/**
 * Supprime un centre du registre
 */
export async function deleteCenter(centerIdOrCode: string): Promise<boolean> {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CENTERS_KEY)
      if (stored) {
        const list: Center[] = JSON.parse(stored)
        const updated = list.filter((c) => c.id !== centerIdOrCode && c.center_code !== centerIdOrCode)
        memoryCentersCache = updated
        localStorage.setItem(LOCAL_STORAGE_CENTERS_KEY, JSON.stringify(updated))
      }
    } catch (e) {}
  }

  try {
    const supabase = createClient()
    await supabase.from("centers").delete().or(`id.eq.${centerIdOrCode},center_code.eq.${centerIdOrCode}`)
  } catch (e) {
    console.warn("Supabase center delete notice:", e)
  }

  broadcastDataMutation({ entity: "centers", action: "delete" })
  return true
}

export interface CenterDetailedStats {
  center: Center
  samplesReceptionsCount: number
  samplesCount: number
  wasteBatchesCount: number
  wasteTotalWeightKg: number
  lastActivityDate: string | null
  receptions: any[]
  wasteBatches: any[]
}

/**
 * Calcule les données consolidées par centre (échantillons + déchets)
 */
export function calculateCentersData(
  centers: Center[],
  receptions: any[],
  wasteBatches: any[]
): CenterDetailedStats[] {
  return centers.map((center) => {
    const code = (center.center_code || "").trim().toUpperCase()
    const name = (center.name || "").trim().toUpperCase()

    // 1. Réceptions d'échantillons associées
    const matchedReceptions = receptions.filter((r) => {
      const rCode = (r.center_code || "").trim().toUpperCase()
      const rName = (r.supplier || r.source_structure || "").trim().toUpperCase()
      return (code && rCode === code) || (name && rName === name)
    })

    let samplesCount = 0
    matchedReceptions.forEach((r) => {
      if (Array.isArray(r.samples_data)) {
        samplesCount += r.samples_data.length
      } else if (Array.isArray(r.samples)) {
        samplesCount += (r.samples[0]?.count ?? r.samples.length)
      } else {
        samplesCount += 1
      }
    })

    // 2. Lots de déchets associés
    const matchedWasteBatches = wasteBatches.filter((b) => {
      const bCode = (b.center_code || "").trim().toUpperCase()
      const bName = (b.source_structure || "").trim().toUpperCase()
      return (code && bCode === code) || (name && bName === name)
    })

    const wasteTotalWeightKg = matchedWasteBatches.reduce((acc, b) => {
      const qty = parseFloat(b.quantity) || 0
      return acc + qty
    }, 0)

    // 3. Dernière date d'activité
    const dates: string[] = []
    matchedReceptions.forEach((r) => {
      if (r.date_reception) dates.push(r.date_reception)
    })
    matchedWasteBatches.forEach((b) => {
      if (b.reception_date) dates.push(b.reception_date)
    })

    dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    const lastActivityDate = dates.length > 0 ? dates[0] : null

    return {
      center,
      samplesReceptionsCount: matchedReceptions.length,
      samplesCount,
      wasteBatchesCount: matchedWasteBatches.length,
      wasteTotalWeightKg: Math.round(wasteTotalWeightKg * 100) / 100,
      lastActivityDate,
      receptions: matchedReceptions,
      wasteBatches: matchedWasteBatches,
    }
  })
}
