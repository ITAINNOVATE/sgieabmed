"use client"

import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Package, Boxes, Scale, Trash2, Layers, CheckCircle2
} from "lucide-react"
import { toast } from "sonner"
import { WasteStockItem } from "@/app/dashboard/waste/stock/page"

export interface GroupedWastePackage {
  id: string
  package_number: string
  package_name: string
  package_type: string
  total_weight: number
  unit: string
  current_location: string
  status: string
  created_at: string
  created_by?: string
  observations?: string
  item_ids: string[]
  items: WasteStockItem[]
}

export interface WasteGroupingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: WasteStockItem[]
  existingPackages?: GroupedWastePackage[]
  onSuccess: (pkg: GroupedWastePackage, isUpdate?: boolean) => void
}

const PACKAGE_CONTAINERS = [
  { id: "sac", label: "Grand sac hermétique étanche (DASRI / Solides)", defaultName: "Sac étanche de déchets pharmaceutiques" },
  { id: "fut_200", label: "Fût plastique étanche PEHD (200 Litres)", defaultName: "Fût étanche 200L" },
  { id: "fut_60", label: "Fût plastique étanche (60 Litres)", defaultName: "Fût étanche 60L" },
  { id: "carton", label: "Carton renforcé sécurisé & scellé", defaultName: "Carton sécurisé de regroupement" },
  { id: "bac", label: "Bac rigide de stockage & manutention", defaultName: "Bac de regroupement" },
  { id: "palette", label: "Palette sécurisée sous film rétractable", defaultName: "Palette de stockage filmée" },
]

const PREDEFINED_ZONES = [
  "Local Déchets A1 — Emplacement Sacs & Fûts",
  "Local Déchets A2 — Médicaments Liquides & Sirops",
  "Local DASRI B — Déchets d'Activités de Soins",
  "Zone Quarantaine C2 — Attente Tri",
  "Chambre Froide Déchets F — Thermosensibles",
  "Magasin Central Déchets — Zone Palettes",
]

export function WasteGroupingDialog({
  open,
  onOpenChange,
  selectedItems: initialSelected,
  existingPackages = [],
  onSuccess
}: WasteGroupingDialogProps) {
  const [itemsToGroup, setItemsToGroup] = useState<WasteStockItem[]>([])
  const [groupingMode, setGroupingMode] = useState<"new" | "existing">("new")
  const [selectedExistingPackageId, setSelectedExistingPackageId] = useState<string>("")
  const [packageType, setPackageType] = useState(PACKAGE_CONTAINERS[0].label)
  const [packageName, setPackageName] = useState("")
  const [location, setLocation] = useState(PREDEFINED_ZONES[0])
  const [observations, setObservations] = useState("")
  const [customPackageNumber, setCustomPackageNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialisation automatique dès l'ouverture de la boîte de dialogue
  useEffect(() => {
    if (open) {
      const list = [...initialSelected]
      setItemsToGroup(list)
      setGroupingMode("new")
      setSelectedExistingPackageId(existingPackages[0]?.id || "")

      // Génération automatique d'une référence de colis unique
      const year = new Date().getFullYear()
      const existingNums = new Set(existingPackages.map(p => p.package_number.toUpperCase()))
      const seq = String(existingPackages.length + 1).padStart(2, "0")
      let randomDigits = Math.floor(1000 + Math.random() * 9000)
      let uniqueRef = `COLIS-${year}-${seq}-${randomDigits}`
      while (existingNums.has(uniqueRef)) {
        randomDigits = Math.floor(1000 + Math.random() * 9000)
        uniqueRef = `COLIS-${year}-${seq}-${randomDigits}`
      }
      setCustomPackageNumber(uniqueRef)

      setPackageName("")
      setPackageType(PACKAGE_CONTAINERS[0].label)
      setLocation(list[0]?.current_location || PREDEFINED_ZONES[0])
      setObservations("")
    }
  }, [open, initialSelected, existingPackages])

  // Calcul réel du poids total des lots sélectionnés
  const totalSelectedWeight = itemsToGroup.reduce((acc, curr) => {
    const qty = Number(curr.quantity) || 0
    return acc + qty
  }, 0)

  const selectedExistingPkg = existingPackages.find(p => p.id === selectedExistingPackageId) || null

  const handleRemoveItem = (id: string) => {
    if (itemsToGroup.length <= 1) {
      toast.error("Veuillez conserver au moins un lot de déchet à regrouper.")
      return
    }
    setItemsToGroup(prev => prev.filter(it => it.id !== id))
  }

  const handleSubmit = async () => {
    if (itemsToGroup.length === 0) {
      toast.error("Aucun lot de déchet sélectionné pour le regroupement.")
      return
    }

    setIsSubmitting(true)

    try {
      // CAS 1 : AJOUTER DANS UN COLIS EXISTANT
      if (groupingMode === "existing") {
        if (!selectedExistingPkg) {
          toast.error("Veuillez sélectionner un colis existant dans la liste déroulante.")
          setIsSubmitting(false)
          return
        }

        const existingItems = selectedExistingPkg.items || []
        const existingItemIds = new Set(existingItems.map(i => i.id))
        const newItemsToAppend = itemsToGroup.filter(i => !existingItemIds.has(i.id))
        const mergedItems = [...existingItems, ...newItemsToAppend]
        const mergedItemIds = mergedItems.map(i => i.id)
        const updatedTotalWeight = mergedItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)

        const updatedPackage: GroupedWastePackage = {
          ...selectedExistingPkg,
          total_weight: Math.round(updatedTotalWeight * 100) / 100,
          item_ids: mergedItemIds,
          items: mergedItems,
        }

        if (typeof window !== "undefined" && window.localStorage) {
          const storedPackagesStr = localStorage.getItem("waste_grouped_packages_v1")
          const storedPackages: GroupedWastePackage[] = storedPackagesStr ? JSON.parse(storedPackagesStr) : []
          const existsInStorage = storedPackages.some(p => p.id === updatedPackage.id)
          const updatedPackagesList = existsInStorage
            ? storedPackages.map(p => p.id === updatedPackage.id ? updatedPackage : p)
            : [updatedPackage, ...storedPackages]
          localStorage.setItem("waste_grouped_packages_v1", JSON.stringify(updatedPackagesList))

          const storedBatchesStr = localStorage.getItem("waste_batches_custom_v1")
          if (storedBatchesStr) {
            const storedBatches: WasteStockItem[] = JSON.parse(storedBatchesStr)
            const updatedBatches = storedBatches.map(b => {
              if (mergedItemIds.includes(b.id)) {
                return {
                  ...b,
                  grouped_package_id: updatedPackage.id,
                  package_number: updatedPackage.package_number,
                  current_location: updatedPackage.current_location,
                }
              }
              return b
            })
            localStorage.setItem("waste_batches_custom_v1", JSON.stringify(updatedBatches))
          }
        }

        toast.success(`${itemsToGroup.length} lot(s) ajouté(s) au colis ${updatedPackage.package_number} ! Poids total : ${updatedPackage.total_weight} Kg`)
        onSuccess(updatedPackage, true)
        onOpenChange(false)
        return
      }

      // CAS 2 : CRÉER UN NOUVEAU COLIS
      const finalPkgNumber = customPackageNumber.trim() || `COLIS-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
      const finalPkgName = packageName.trim() || `${packageType.split("(")[0].trim()} — ${itemsToGroup[0]?.waste_type || "Déchets"}`

      const newPackage: GroupedWastePackage = {
        id: `pkg-${Date.now()}`,
        package_number: finalPkgNumber,
        package_name: finalPkgName,
        package_type: packageType,
        total_weight: Math.round(totalSelectedWeight * 100) / 100,
        unit: "Kg",
        current_location: location.trim(),
        status: "Groupé (En stock)",
        created_at: new Date().toISOString(),
        created_by: "Responsable Déchets ABMed",
        observations: observations.trim() || undefined,
        item_ids: itemsToGroup.map(it => it.id),
        items: itemsToGroup,
      }

      if (typeof window !== "undefined" && window.localStorage) {
        const storedPackagesStr = localStorage.getItem("waste_grouped_packages_v1")
        const storedPackages: GroupedWastePackage[] = storedPackagesStr ? JSON.parse(storedPackagesStr) : []
        storedPackages.unshift(newPackage)
        localStorage.setItem("waste_grouped_packages_v1", JSON.stringify(storedPackages))

        const storedBatchesStr = localStorage.getItem("waste_batches_custom_v1")
        if (storedBatchesStr) {
          const storedBatches: WasteStockItem[] = JSON.parse(storedBatchesStr)
          const updatedBatches = storedBatches.map(b => {
            if (newPackage.item_ids.includes(b.id)) {
              return {
                ...b,
                grouped_package_id: newPackage.id,
                package_number: newPackage.package_number,
                current_location: newPackage.current_location,
              }
            }
            return b
          })
          localStorage.setItem("waste_batches_custom_v1", JSON.stringify(updatedBatches))
        }
      }

      toast.success(`Colis ${newPackage.package_number} créé avec succès ! (${itemsToGroup.length} lots, ${newPackage.total_weight} Kg)`)
      onSuccess(newPackage, false)
      onOpenChange(false)
    } catch (e) {
      console.error("Erreur lors de l'enregistrement du colis groupé:", e)
      toast.error("Erreur lors de l'enregistrement du colis.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/10 text-red-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">
                Regrouper en Grand Colis / Sac de Déchets
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Rassemblez les lots de détails sélectionnés dans un contenant existant ou dans un nouveau colis pour faciliter le stockage.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* BANDEAU RÉCAPITULATIF DE LA SÉLECTION EN TEMPS RÉEL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Boxes className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Lots sélectionnés</span>
                <span className="text-base font-black text-foreground">
                  {itemsToGroup.length} article{itemsToGroup.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Scale className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Poids total cumulé</span>
                <span className="text-base font-black text-foreground">
                  {Math.round(totalSelectedWeight * 100) / 100} Kg
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Package className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">N° Colis / Sac</span>
                <span className="text-sm font-black font-mono text-foreground">
                  {groupingMode === "existing"
                    ? (selectedExistingPkg?.package_number || "Sélectionner...")
                    : customPackageNumber}
                </span>
              </div>
            </div>
          </div>

          {/* CHOIX DU MODE : AJOUTER DANS UN COLIS EXISTANT OU CRÉER UN NOUVEAU COLIS */}
          <div className="space-y-2 p-3.5 bg-muted/30 border border-border/70 rounded-xl">
            <Label className="text-xs font-bold text-foreground block">
              Ajouter dans un colis existant ?
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setGroupingMode("new")}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  groupingMode === "new"
                    ? "bg-red-50 dark:bg-red-950/30 border-red-500 ring-1 ring-red-500 text-red-950 dark:text-red-200"
                    : "bg-background border-border/70 hover:bg-muted/50 text-foreground"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                  groupingMode === "new" ? "border-red-600 bg-red-600 text-white" : "border-muted-foreground"
                }`}>
                  {groupingMode === "new" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-xs font-bold">Non — Nouveau colis / sac</div>
                  <div className="text-[10px] text-muted-foreground">Créer un nouveau colis avec référence unique automatique</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (existingPackages.length === 0) {
                    toast.info("Aucun colis existant disponible. Créez d'abord un nouveau colis.")
                    return
                  }
                  setGroupingMode("existing")
                  if (!selectedExistingPackageId && existingPackages[0]) {
                    setSelectedExistingPackageId(existingPackages[0].id)
                  }
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  groupingMode === "existing"
                    ? "bg-purple-50 dark:bg-purple-950/30 border-purple-500 ring-1 ring-purple-500 text-purple-950 dark:text-purple-200"
                    : "bg-background border-border/70 hover:bg-muted/50 text-foreground"
                }`}
              >
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                  groupingMode === "existing" ? "border-purple-600 bg-purple-600 text-white" : "border-muted-foreground"
                }`}>
                  {groupingMode === "existing" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-xs font-bold">Oui — Colis existant ({existingPackages.length})</div>
                  <div className="text-[10px] text-muted-foreground">Choisir un colis existant dans la liste déroulante</div>
                </div>
              </button>
            </div>
          </div>

          {/* FORMULAIRE SELON LE MODE CHOISI */}
          {groupingMode === "existing" ? (
            <div className="space-y-3 p-4 bg-purple-50/40 dark:bg-purple-950/15 border border-purple-200 dark:border-purple-900/40 rounded-xl">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Choisir le Colis / Sac existant <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={selectedExistingPackageId}
                  onValueChange={(val) => setSelectedExistingPackageId(val || "")}
                >
                  <SelectTrigger className="text-xs h-9 bg-background rounded-lg font-semibold">
                    <SelectValue placeholder="Sélectionner un colis dans la liste..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingPackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id} className="text-xs">
                        {pkg.package_number} — {pkg.package_name} ({pkg.items?.length || 0} lots • {pkg.total_weight} Kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedExistingPkg && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-purple-200/60 text-xs">
                  <div className="p-2.5 bg-background rounded-lg border border-border/60">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Contenant & Emplacement</span>
                    <span className="font-semibold text-foreground block truncate mt-0.5">{selectedExistingPkg.package_type}</span>
                    <span className="text-[10px] text-muted-foreground block truncate">{selectedExistingPkg.current_location}</span>
                  </div>
                  <div className="p-2.5 bg-background rounded-lg border border-border/60">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total articles après ajout</span>
                    <span className="font-black text-purple-700 text-sm block mt-0.5">
                      {(selectedExistingPkg.items?.length || 0) + itemsToGroup.length} lots
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {selectedExistingPkg.items?.length || 0} déjà dedans + {itemsToGroup.length} ajouté(s)
                    </span>
                  </div>
                  <div className="p-2.5 bg-background rounded-lg border border-border/60">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Nouveau poids total du colis</span>
                    <span className="font-black text-emerald-700 text-sm block mt-0.5">
                      {Math.round(((Number(selectedExistingPkg.total_weight) || 0) + totalSelectedWeight) * 100) / 100} Kg
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {selectedExistingPkg.total_weight} Kg + {Math.round(totalSelectedWeight * 100) / 100} Kg
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">
                      Référence / Numéro du Colis
                    </Label>
                    <Badge variant="outline" className="text-[9.5px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold py-0">
                      Unique Auto
                    </Badge>
                  </div>
                  <Input
                    value={customPackageNumber}
                    onChange={(e) => setCustomPackageNumber(e.target.value)}
                    className="text-xs h-9 rounded-lg font-mono font-bold bg-muted/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Type de contenant / Conditionnement <span className="text-red-500">*</span>
                  </Label>
                  <Select value={packageType} onValueChange={(val) => setPackageType(val || "")}>
                    <SelectTrigger className="text-xs h-9 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGE_CONTAINERS.map(c => (
                        <SelectItem key={c.id} value={c.label} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Libellé / Nom du Colis ou Sac
                  </Label>
                  <Input
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    className="text-xs h-9 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Emplacement de stockage du Colis <span className="text-red-500">*</span>
                  </Label>
                  <Select value={location} onValueChange={(val) => setLocation(val || "")}>
                    <SelectTrigger className="text-xs h-9 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_ZONES.map(z => (
                        <SelectItem key={z} value={z} className="text-xs">
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Observations & Instructions particulières (facultatif)
                </Label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="text-xs min-h-[56px] rounded-lg resize-none"
                />
              </div>
            </div>
          )}

          {/* LISTE DÉTAILLÉE DES LOTS INCLUS DANS LE COLIS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-red-600" /> Lots de détails à inclure ({itemsToGroup.length})
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Vous pouvez retirer un lot avant validation
              </span>
            </div>

            <div className="border border-border/70 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b text-[10px] uppercase font-bold text-muted-foreground sticky top-0">
                  <tr>
                    <th className="p-2.5">N° Lot</th>
                    <th className="p-2.5">Classification / Produit</th>
                    <th className="p-2.5">Provenance</th>
                    <th className="p-2.5 text-right">Poids</th>
                    <th className="p-2.5 text-center w-10">Retirer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {itemsToGroup.map(item => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="p-2.5 font-mono font-bold text-red-700 dark:text-red-400">
                        {item.batch_number}
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-foreground">{item.commercial_name || item.waste_type}</div>
                        <div className="text-[10px] text-muted-foreground">{item.waste_type}</div>
                      </td>
                      <td className="p-2.5 text-muted-foreground truncate max-w-[140px]">
                        {item.source_structure || "Interne ABMed"}
                      </td>
                      <td className="p-2.5 font-bold text-right tabular-nums text-foreground">
                        {item.quantity} {item.unit || "Kg"}
                      </td>
                      <td className="p-2.5 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer"
                          title="Retirer du colis"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex flex-row items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs cursor-pointer"
          >
            Annuler
          </Button>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || itemsToGroup.length === 0}
            className={`text-xs font-bold text-white gap-1.5 cursor-pointer shadow-xs ${
              groupingMode === "existing"
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {groupingMode === "existing"
              ? `Ajouter au Colis ${selectedExistingPkg?.package_number || ""} (${itemsToGroup.length} lot${itemsToGroup.length > 1 ? "s" : ""})`
              : `Créer le Colis Groupé (${itemsToGroup.length} lot${itemsToGroup.length > 1 ? "s" : ""} • ${Math.round(totalSelectedWeight * 100) / 100} Kg)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
