import { createClient } from "@/utils/supabase/client"
import { broadcastDataMutation } from "@/utils/realtimeBus"
import { GroupedWastePackage } from "@/components/waste-grouping-dialog"
import { WasteStockItem } from "@/app/dashboard/waste/stock/page"
import { normalizeWasteLocation } from "@/utils/waste-locations"
import { getCurrentUser } from "@/app/dashboard/admin/adminMockData"

const BUILTIN_DISSOLVED_PACKAGES = ["COLIS-2026-31-8204", "pkg-1793030452370"]

/**
 * Récupère l'ensemble des numéros et identifiants de colis dissous (tombstones)
 * stockés localement dans le navigateur.
 */
export function getLocalDissolvedPackageNumbers(): Set<string> {
  const set = new Set<string>(BUILTIN_DISSOLVED_PACKAGES)
  if (typeof window === "undefined" || !window.localStorage) return set
  try {
    const raw = localStorage.getItem("waste_packages_deleted_ids")
    if (!raw) return set
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        if (typeof item === "string" && item.trim()) set.add(item.trim())
      })
    }
    return set
  } catch {
    return set
  }
}

/**
 * Enregistre un colis comme dissous localement et purge immédiatement le stockage local
 */
export function recordLocalDissolvedPackage(packageNumber: string, id?: string) {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    const set = getLocalDissolvedPackageNumbers()
    if (packageNumber) set.add(packageNumber)
    if (id) set.add(id)
    localStorage.setItem("waste_packages_deleted_ids", JSON.stringify(Array.from(set)))

    // 1. Retirer immédiatement du localStorage waste_grouped_packages_v1
    const storedPkgsStr = localStorage.getItem("waste_grouped_packages_v1")
    if (storedPkgsStr) {
      const storedPkgs: GroupedWastePackage[] = JSON.parse(storedPkgsStr)
      const filtered = storedPkgs.filter(
        p => !set.has(p.package_number) && (!p.id || !set.has(p.id))
      )
      localStorage.setItem("waste_grouped_packages_v1", JSON.stringify(filtered))
    }

    // 2. Libérer immédiatement les lots dans waste_batches_custom_v1
    const storedBatchesStr = localStorage.getItem("waste_batches_custom_v1")
    if (storedBatchesStr) {
      const storedBatches: WasteStockItem[] = JSON.parse(storedBatchesStr)
      const updatedBatches = storedBatches.map(b => {
        if (
          (packageNumber && b.package_number === packageNumber) ||
          (id && b.grouped_package_id === id) ||
          (b.observations && packageNumber && b.observations.includes(packageNumber))
        ) {
          return {
            ...b,
            grouped_package_id: undefined,
            package_number: undefined,
            observations: (b.observations || "").replace(new RegExp(`\\[COLIS:\\s*${packageNumber}\\]`, "g"), "").trim(),
          }
        }
        return b
      })
      localStorage.setItem("waste_batches_custom_v1", JSON.stringify(updatedBatches))
    }
  } catch (e) {
    console.warn("[waste-packages-sync] Erreur recordLocalDissolvedPackage:", e)
  }
}

/**
 * Récupère tous les colis groupés actifs enregistrés dans Supabase Cloud,
 * en ignorant formellement tout colis dissous (tombstone).
 */
export async function fetchCloudGroupedPackages(): Promise<GroupedWastePackage[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("waste_movements")
      .select("*")
      .in("type", ["Regroupement en colis", "Colis dissous"])
      .order("created_at", { ascending: false })
      .order("mvt_number", { ascending: false })

    if (error || !data || data.length === 0) {
      return []
    }

    // Récupérer et consolider tous les colis dissous (Cloud + Local)
    const dissolvedSet = getLocalDissolvedPackageNumbers()
    data.forEach((mvt: any) => {
      if (mvt.type === "Colis dissous") {
        if (mvt.batch) dissolvedSet.add(mvt.batch)
        try {
          const obs = JSON.parse(mvt.observations || "{}")
          if (obs.package_number) dissolvedSet.add(obs.package_number)
          if (obs.id) dissolvedSet.add(obs.id)
        } catch {}
      }
    })

    // Mettre à jour le tombstone local
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem("waste_packages_deleted_ids", JSON.stringify(Array.from(dissolvedSet)))
      } catch {}
    }

    const packages: GroupedWastePackage[] = []
    const staleMovementIdsToDelete: string[] = []

    data.forEach((mvt: any) => {
      if (mvt.type !== "Regroupement en colis") return

      try {
        if (!mvt.observations) return
        const parsed = JSON.parse(mvt.observations)
        const pkgNum = parsed?.package_number || mvt.batch
        const pkgId = parsed?.id || mvt.id

        // Si le colis a été dissous, ne JAMAIS le restaurer
        if (dissolvedSet.has(pkgNum) || dissolvedSet.has(pkgId)) {
          staleMovementIdsToDelete.push(mvt.id)
          return
        }

        if (parsed && (parsed.package_number || mvt.batch)) {
          const pkg: GroupedWastePackage = {
            id: parsed.id || mvt.id,
            package_number: parsed.package_number || mvt.batch,
            package_name: parsed.package_name || mvt.commercial_name || mvt.batch,
            package_type: parsed.package_type || mvt.waste_type || "Colis groupé",
            total_weight: Number(parsed.total_weight) || Number(String(mvt.quantity || "").replace(/[^0-9.]/g, "")) || 0,
            unit: parsed.unit || "Kg",
            current_location: normalizeWasteLocation(parsed.current_location || mvt.destination, parsed.package_type || mvt.waste_type),
            status: parsed.status || "Groupé (En stock)",
            created_at: parsed.created_at || mvt.date || mvt.created_at,
            created_by: parsed.created_by || mvt.operator || "Agent ABMed",
            observations: parsed.observations || undefined,
            item_ids: Array.isArray(parsed.item_ids) ? parsed.item_ids : [],
            items: Array.isArray(parsed.items) ? parsed.items : [],
          }
          packages.push(pkg)
        }
      } catch (err) {
        console.warn("[waste-packages-sync] Erreur parsing colis:", err)
      }
    })

    // Purge en arrière-plan de toute ligne "Regroupement en colis" fantôme qui subsisterait
    if (staleMovementIdsToDelete.length > 0) {
      supabase.from("waste_movements").delete().in("id", staleMovementIdsToDelete).then()
    }

    return packages
  } catch (err) {
    console.error("[waste-packages-sync] Erreur fetchCloudGroupedPackages:", err)
    return []
  }
}

/**
 * Enregistre ou met à jour un colis groupé dans Supabase Cloud,
 * met à jour les lots individuels dans waste_batches et diffuse la modification.
 */
export async function saveGroupedPackageToCloud(
  pkg: GroupedWastePackage,
  removedItemIds?: string[],
  updatedBatchesList?: WasteStockItem[]
): Promise<boolean> {
  const supabase = createClient()

  // 1. Si ce colis avait été marqué dissous précédemment, le réhabiliter
  const dissolvedSet = getLocalDissolvedPackageNumbers()
  if (dissolvedSet.has(pkg.package_number) || dissolvedSet.has(pkg.id)) {
    dissolvedSet.delete(pkg.package_number)
    dissolvedSet.delete(pkg.id)
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem("waste_packages_deleted_ids", JSON.stringify(Array.from(dissolvedSet)))
      } catch {}
    }
    // Nettoyer le tombstone cloud éventuel
    try {
      await supabase
        .from("waste_movements")
        .delete()
        .eq("mvt_number", `DISSOLVED-${pkg.package_number}`)
    } catch {}
  }

  // 2. Déterminer l'opérateur connecté (ex: Maëlle DOSSOU-YOVO)
  let operatorName = pkg.created_by
  if (!operatorName || operatorName.includes("Responsable Déchets ABMed") || operatorName.includes("Admin EGED")) {
    try {
      const u = getCurrentUser()
      if (u && u.first_name) {
        operatorName = `${u.first_name} ${u.last_name} (${u.role || u.fonction || "Agent ABMed"})`
      }
    } catch (e) {}
  }
  if (!operatorName) {
    operatorName = "Maëlle DOSSOU-YOVO (Agent Déchets)"
  }

  const pkgWithOperator: GroupedWastePackage = {
    ...pkg,
    created_by: operatorName,
  }

  // 3. Sauvegarde locale immédiate (optimiste)
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const storedPkgsStr = localStorage.getItem("waste_grouped_packages_v1")
      const storedPkgs: GroupedWastePackage[] = storedPkgsStr ? JSON.parse(storedPkgsStr) : []
      const existingIdx = storedPkgs.findIndex(p => p.id === pkg.id || p.package_number === pkg.package_number)
      if (existingIdx !== -1) {
        storedPkgs[existingIdx] = pkgWithOperator
      } else {
        storedPkgs.unshift(pkgWithOperator)
      }
      localStorage.setItem("waste_grouped_packages_v1", JSON.stringify(storedPkgs))

      // Mettre à jour les lots locaux (lient les lots conservés et libèrent les lots retirés)
      const storedBatchesStr = localStorage.getItem("waste_batches_custom_v1")
      if (storedBatchesStr) {
        const storedBatches: WasteStockItem[] = JSON.parse(storedBatchesStr)
        const updatedBatches = storedBatches.map(b => {
          const isNowInPkg = pkg.item_ids.includes(b.id) || (pkg.items && pkg.items.some(it => it.batch_number === b.batch_number))
          if (isNowInPkg) {
            return {
              ...b,
              grouped_package_id: pkg.id,
              package_number: pkg.package_number,
              current_location: pkg.current_location,
            }
          } else if (
            (removedItemIds && (removedItemIds.includes(b.id) || (b.batch_number && removedItemIds.includes(b.batch_number)))) ||
            b.grouped_package_id === pkg.id ||
            b.package_number === pkg.package_number
          ) {
            // Ce lot a été retiré de ce colis : il redevient immédiatement un stock de détail autonome
            return {
              ...b,
              grouped_package_id: undefined,
              package_number: undefined,
              observations: (b.observations || "").replace(new RegExp(`\\[COLIS:\\s*${pkg.package_number}\\]`, "g"), "").trim(),
            }
          }
          return b
        })
        localStorage.setItem("waste_batches_custom_v1", JSON.stringify(updatedBatches))
      }
    } catch (localErr) {
      console.warn("[waste-packages-sync] Erreur sauvegarde locale:", localErr)
    }
  }

  // 4. Sauvegarde Cloud dans waste_movements
  const mvtPayload = {
    mvt_number: `PKG-${pkg.package_number}`,
    date: pkg.created_at || new Date().toISOString(),
    type: "Regroupement en colis",
    batch: pkg.package_number,
    waste_type: pkg.package_type,
    commercial_name: pkg.package_name || pkg.package_number,
    quantity: `${pkg.total_weight} ${pkg.unit || "Kg"}`,
    operator: operatorName,
    origin: (pkg.items || []).map(i => i.batch_number).filter(Boolean).join(", ") || null,
    destination: pkg.current_location,
    observations: JSON.stringify(pkgWithOperator),
  }

  try {
    const { error: mvtError } = await supabase
      .from("waste_movements")
      .upsert([mvtPayload], { onConflict: "mvt_number" })

    if (mvtError) {
      console.warn("[waste-packages-sync] Erreur upsert movement colis:", mvtError)
    }

    // 5. Mettre à jour les lots individuels dans waste_batches Cloud (en préservant [FIN:...] et les observations existantes)
    const batchNumbers = (pkg.items || []).map(i => i.batch_number).filter(Boolean)
    if (batchNumbers.length > 0) {
      const { data: existingRows } = await supabase
        .from("waste_batches")
        .select("id, batch_number, observations")
        .in("batch_number", batchNumbers)

      if (existingRows && existingRows.length > 0) {
        await Promise.all(
          existingRows.map((row: any) => {
            const cleanedObs = (row.observations || "").replace(/\s*\[COLIS:[^\]]*\]/gi, "").trim()
            const newObs = cleanedObs
              ? `${cleanedObs} [COLIS: ${pkg.package_number}]`
              : `[COLIS: ${pkg.package_number}]`
            return supabase
              .from("waste_batches")
              .update({
                current_location: pkg.current_location,
                observations: newObs,
              })
              .eq("id", row.id)
          })
        )
      }
    }

    if (removedItemIds && removedItemIds.length > 0) {
      try {
        const { data: remRows } = await supabase
          .from("waste_batches")
          .select("id, observations")
          .in("id", removedItemIds)

        if (remRows && remRows.length > 0) {
          await Promise.all(
            remRows.map((row: any) => {
              const cleanedObs = (row.observations || "").replace(/\s*\[COLIS:[^\]]*\]/gi, "").trim()
              return supabase
                .from("waste_batches")
                .update({ observations: cleanedObs })
                .eq("id", row.id)
            })
          )
        }
      } catch {}
    }

    // 6. Diffusion temps réel instantanée multi-postes
    broadcastDataMutation({
      entity: "waste_batches,waste_movements,grouped_packages",
      action: "package_save",
      id: pkg.package_number,
      user: operatorName,
    })

    return true
  } catch (cloudErr) {
    console.error("[waste-packages-sync] Erreur cloud save colis:", cloudErr)
    return false
  }
}

/**
 * Dissout / supprime un colis groupé dans Supabase Cloud et libère tous ses lots
 * de manière définitive et permanente (avec pose de tombstone).
 */
export async function deleteGroupedPackageFromCloud(pkg: GroupedWastePackage): Promise<boolean> {
  const supabase = createClient()

  // 1. Enregistrement local immédiat du colis comme dissous et purge du cache local
  recordLocalDissolvedPackage(pkg.package_number, pkg.id)

  // 2. Déterminer l'opérateur
  let operatorName = "Agent Déchets ABMed"
  try {
    const u = getCurrentUser()
    if (u && u.first_name) {
      operatorName = `${u.first_name} ${u.last_name} (${u.role || u.fonction || "Agent ABMed"})`
    }
  } catch {}

  try {
    // 3. Supprimer tout mouvement actif de type "Regroupement en colis"
    await supabase
      .from("waste_movements")
      .delete()
      .or(`mvt_number.eq.PKG-${pkg.package_number},batch.eq.${pkg.package_number},mvt_number.eq.${pkg.package_number}`)

    // 4. Poser un tombstone indélébile dans waste_movements Cloud
    // Cela garantit que TOUS les autres clients, postes ou scripts de rattrapage
    // sauront que ce colis a été volontairement dissous et ne le ressusciteront JAMAIS.
    await supabase
      .from("waste_movements")
      .upsert([
        {
          mvt_number: `DISSOLVED-${pkg.package_number}`,
          date: new Date().toISOString(),
          type: "Colis dissous",
          batch: pkg.package_number,
          waste_type: pkg.package_type || "Colis groupé",
          commercial_name: `Colis ${pkg.package_number} (Dissous)`,
          quantity: "0 Kg",
          operator: operatorName,
          observations: JSON.stringify({
            dissolved_at: new Date().toISOString(),
            package_number: pkg.package_number,
            id: pkg.id,
            dissolved_by: operatorName,
          }),
        }
      ], { onConflict: "mvt_number" })

    // 5. Libérer tous les lots individuels dans waste_batches Cloud (en préservant [FIN:...] et notes)
    const batchNumbers = (pkg.items || []).map(i => i.batch_number).filter(Boolean)
    const { data: taggedRows } = await supabase
      .from("waste_batches")
      .select("id, batch_number, observations")
      .ilike("observations", `%${pkg.package_number}%`)

    let explicitRows: any[] = []
    if (batchNumbers.length > 0) {
      const { data: bRows } = await supabase
        .from("waste_batches")
        .select("id, batch_number, observations")
        .in("batch_number", batchNumbers)
      if (bRows) explicitRows = bRows
    }

    const rowMap = new Map<string, any>()
    ;(taggedRows || []).forEach((r: any) => rowMap.set(r.id, r))
    explicitRows.forEach((r: any) => rowMap.set(r.id, r))

    if (rowMap.size > 0) {
      await Promise.all(
        Array.from(rowMap.values()).map((row: any) => {
          const cleanedObs = (row.observations || "").replace(/\s*\[COLIS:[^\]]*\]/gi, "").trim()
          return supabase
            .from("waste_batches")
            .update({ observations: cleanedObs })
            .eq("id", row.id)
        })
      )
    }

    // 6. Diffusion temps réel instantanée multi-postes
    broadcastDataMutation({
      entity: "waste_batches,waste_movements,grouped_packages",
      action: "package_delete",
      id: pkg.package_number,
      user: operatorName,
    })

    return true
  } catch (cloudErr) {
    console.error("[waste-packages-sync] Erreur suppression cloud colis:", cloudErr)
    return false
  }
}

/**
 * Fusionne intelligemment les colis locaux et distants et synchronise les manquants,
 * en filtrant rigoureusement tout colis dissous.
 */
export async function syncLocalAndCloudPackages(
  localPkgs: GroupedWastePackage[]
): Promise<GroupedWastePackage[]> {
  const dissolvedSet = getLocalDissolvedPackageNumbers()
  const remotePkgs = await fetchCloudGroupedPackages()

  const pkgMap = new Map<string, GroupedWastePackage>()
  const registeredNumbers = new Set<string>()
  const registeredIds = new Set<string>()

  // A. Commencer par les colis distants valides (source de vérité Cloud)
  remotePkgs.forEach((rp) => {
    const isDissolved = 
      (rp.package_number && dissolvedSet.has(rp.package_number)) || 
      (rp.id && dissolvedSet.has(rp.id))

    if (!isDissolved) {
      const canonicalKey = rp.package_number || rp.id
      if (canonicalKey) {
        pkgMap.set(canonicalKey, rp)
        if (rp.package_number) registeredNumbers.add(rp.package_number)
        if (rp.id) registeredIds.add(rp.id)
      }
    }
  })

  // B. Fusionner les colis locaux non encore envoyés qui NE SONT PAS dissous
  const unsyncedLocals: GroupedWastePackage[] = []
  localPkgs.forEach((lp) => {
    const isDissolved = 
      (lp.package_number && dissolvedSet.has(lp.package_number)) || 
      (lp.id && dissolvedSet.has(lp.id))

    if (!isDissolved) {
      const alreadyInCloud = 
        (lp.package_number && registeredNumbers.has(lp.package_number)) || 
        (lp.id && registeredIds.has(lp.id))

      if (!alreadyInCloud) {
        const canonicalKey = lp.package_number || lp.id
        if (canonicalKey && !pkgMap.has(canonicalKey)) {
          pkgMap.set(canonicalKey, lp)
          if (lp.package_number) registeredNumbers.add(lp.package_number)
          if (lp.id) registeredIds.add(lp.id)
          unsyncedLocals.push(lp)
        }
      }
    }
  })

  // Tri déterministe rigoureux : date desc, puis package_number desc
  const merged = Array.from(pkgMap.values())
  merged.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime()
    const timeB = new Date(b.created_at || 0).getTime()
    if (timeB !== timeA) return timeB - timeA
    return (b.package_number || "").localeCompare(a.package_number || "")
  })

  // C. Sauvegarder dans le localStorage local la liste propre
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem("waste_grouped_packages_v1", JSON.stringify(merged))
    } catch (e) {}
  }

  // D. Envoyer en tâche de fond uniquement les locaux réels qui ne sont pas dissous
  if (unsyncedLocals.length > 0) {
    const safeLocals = unsyncedLocals.filter(
      lp => !dissolvedSet.has(lp.package_number) && (!lp.id || !dissolvedSet.has(lp.id))
    )
    if (safeLocals.length > 0) {
      Promise.allSettled(safeLocals.map(lp => saveGroupedPackageToCloud(lp))).then(() => {
        console.log(`[waste-packages-sync] ${safeLocals.length} colis locaux synchronisés vers Supabase Cloud.`)
      })
    }
  }

  return merged
}
