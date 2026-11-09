import type { GroupedWastePackage } from "@/components/waste-grouping-dialog"

export type WasteStockItem = {
  id: string
  batch_number: string
  reception_number?: string
  reception_date?: string
  source_structure: string
  center_code?: string
  source_type?: string
  depositor_name?: string
  depositor_phone?: string
  waste_type: string
  commercial_name?: string
  original_batch?: string
  sample_id?: string | null
  quantity: number
  unit: string
  packaging?: string
  packaging_condition?: string
  destruction_motive?: string
  current_location: string
  status: string
  observations?: string
  destruction_plan_ref?: string
  created_at?: string
  grouped_package_id?: string | null
  package_number?: string | null
}

/**
 * Détermine si un lot de déchet est déjà regroupé dans un colis ou sac
 */
export function isItemAlreadyGrouped(item: WasteStockItem, packagesList: GroupedWastePackage[] = []): boolean {
  if (!item) return false
  if (item.grouped_package_id || item.package_number) return true
  if (packagesList && packagesList.length > 0) {
    return packagesList.some(
      (pkg) =>
        pkg.item_ids?.includes(item.id) ||
        (pkg.items && pkg.items.some((it: any) => it.batch_number === item.batch_number || it.id === item.id))
    )
  }
  return false
}
