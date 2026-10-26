import { createClient } from "@/utils/supabase/client"
import { broadcastDataMutation } from "@/utils/realtimeBus"
import { GroupedWastePackage } from "@/components/waste-grouping-dialog"
import { WasteStockItem } from "@/app/dashboard/waste/stock/page"
import { normalizeWasteLocation } from "@/utils/waste-locations"
import { getCurrentUser } from "@/app/dashboard/admin/adminMockData"

/**
 * Récupère tous les colis groupés enregistrés dans Supabase Cloud
 * (stockés sous forme de mouvements officiels de type "Regroupement en colis").
 */
export async function fetchCloudGroupedPackages(): Promise<GroupedWastePackage[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("waste_movements")
      .select("*")
      .eq("type", "Regroupement en colis")
      .order("created_at", { ascending: false })

    if (error || !data || data.length === 0) {
      return []
    }

    const packages: GroupedWastePackage[] = []
    data.forEach((mvt: any) => {
      try {
        if (!mvt.observations) return
        const parsed = JSON.parse(mvt.observations)
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
  updatedBatchesList?: WasteStockItem[]
): Promise<boolean> {
  const supabase = createClient()

  // 1. Déterminer l'opérateur connecté (ex: Maëlle DOSSOU-YOVO)
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

  // 2. Sauvegarde locale immédiate (optimiste)
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

      // Mettre à jour les lots locaux
      const storedBatchesStr = localStorage.getItem("waste_batches_custom_v1")
      if (storedBatchesStr) {
        const storedBatches: WasteStockItem[] = JSON.parse(storedBatchesStr)
        const updatedBatches = storedBatches.map(b => {
          if (pkg.item_ids.includes(b.id) || (pkg.items && pkg.items.some(it => it.batch_number === b.batch_number))) {
            return {
              ...b,
              grouped_package_id: pkg.id,
              package_number: pkg.package_number,
              current_location: pkg.current_location,
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

  // 3. Sauvegarde Cloud dans waste_movements
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

    // 4. Mettre à jour les lots individuels dans waste_batches Cloud
    const batchNumbers = (pkg.items || []).map(i => i.batch_number).filter(Boolean)
    if (batchNumbers.length > 0) {
      await supabase
        .from("waste_batches")
        .update({
          current_location: pkg.current_location,
          observations: `[COLIS: ${pkg.package_number}]`,
        })
        .in("batch_number", batchNumbers)
    }

    // 5. Diffusion temps réel instantanée multi-postes
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
 * Dissout / supprime un colis groupé dans Supabase Cloud et libère ses lots
 */
export async function deleteGroupedPackageFromCloud(pkg: GroupedWastePackage): Promise<boolean> {
  const supabase = createClient()

  // 1. Mise à jour locale immédiate
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const storedPkgsStr = localStorage.getItem("waste_grouped_packages_v1")
      if (storedPkgsStr) {
        const storedPkgs: GroupedWastePackage[] = JSON.parse(storedPkgsStr)
        const filtered = storedPkgs.filter(p => p.id !== pkg.id && p.package_number !== pkg.package_number)
        localStorage.setItem("waste_grouped_packages_v1", JSON.stringify(filtered))
      }

      const storedBatchesStr = localStorage.getItem("waste_batches_custom_v1")
      if (storedBatchesStr) {
        const storedBatches: WasteStockItem[] = JSON.parse(storedBatchesStr)
        const updatedBatches = storedBatches.map(b => {
          if (pkg.item_ids.includes(b.id) || b.grouped_package_id === pkg.id || b.package_number === pkg.package_number) {
            return {
              ...b,
              grouped_package_id: undefined,
              package_number: undefined,
            }
          }
          return b
        })
        localStorage.setItem("waste_batches_custom_v1", JSON.stringify(updatedBatches))
      }
    } catch (localErr) {
      console.warn("[waste-packages-sync] Erreur suppression locale colis:", localErr)
    }
  }

  // 2. Suppression dans waste_movements Cloud
  try {
    await supabase
      .from("waste_movements")
      .delete()
      .eq("mvt_number", `PKG-${pkg.package_number}`)

    // 3. Libérer les lots individuels dans waste_batches Cloud
    const batchNumbers = (pkg.items || []).map(i => i.batch_number).filter(Boolean)
    if (batchNumbers.length > 0) {
      await supabase
        .from("waste_batches")
        .update({
          observations: "",
        })
        .in("batch_number", batchNumbers)
    }

    // 4. Diffusion temps réel instantanée multi-postes
    broadcastDataMutation({
      entity: "waste_batches,waste_movements,grouped_packages",
      action: "package_delete",
      id: pkg.package_number,
    })

    return true
  } catch (cloudErr) {
    console.error("[waste-packages-sync] Erreur suppression cloud colis:", cloudErr)
    return false
  }
}

/**
 * Fusionne intelligemment les colis locaux et distants et synchronise les manquants
 */
export async function syncLocalAndCloudPackages(
  localPkgs: GroupedWastePackage[]
): Promise<GroupedWastePackage[]> {
  const remotePkgs = await fetchCloudGroupedPackages()

  const pkgMap = new Map<string, GroupedWastePackage>()

  // A. Commencer par les colis distants (source de vérité Cloud)
  remotePkgs.forEach((rp) => {
    const key = rp.package_number || rp.id
    if (key) pkgMap.set(key, rp)
  })

  // B. Fusionner les colis locaux non encore envoyés
  const unsyncedLocals: GroupedWastePackage[] = []
  localPkgs.forEach((lp) => {
    const key = lp.package_number || lp.id
    if (key && !pkgMap.has(key)) {
      pkgMap.set(key, lp)
      unsyncedLocals.push(lp)
    }
  })

  const merged = Array.from(pkgMap.values())

  // C. Sauvegarder dans le localStorage local
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem("waste_grouped_packages_v1", JSON.stringify(merged))
    } catch (e) {}
  }

  // D. Envoyer en tâche de fond les locaux manquants vers le Cloud
  if (unsyncedLocals.length > 0) {
    Promise.allSettled(unsyncedLocals.map(lp => saveGroupedPackageToCloud(lp))).then(() => {
      console.log(`[waste-packages-sync] ${unsyncedLocals.length} colis locaux synchronisés avec succès vers Supabase Cloud.`)
    })
  }

  return merged
}
