"use client"

import { useState } from "react"
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
  Package, Boxes, Scale, MapPin, AlertCircle, Plus, 
  Trash2, Layers, CheckCircle2, ShieldAlert, Sparkles 
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
  onSuccess: (newPackage: GroupedWastePackage) => void
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
  onSuccess
}: WasteGroupingDialogProps) {
  const [itemsToGroup, setItemsToGroup] = useState<WasteStockItem[]>([])
  const [packageType, setPackageType] = useState(PACKAGE_CONTAINERS[0].label)
  const [packageName, setPackageName] = useState("")
  const [location, setLocation] = useState(PREDEFINED_ZONES[0])
  const [observations, setObservations] = useState("")
  const [customPackageNumber, setCustomPackageNumber] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialisation à l'ouverture
  const handleOpenInit = () => {
    const list = [...initialSelected]
    setItemsToGroup(list)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    setCustomPackageNumber(`COLIS-2026-${randomSuffix}`)
    
    // Déterminer un nom par défaut selon les types
    const dominantType = list[0]?.waste_type || "Déchets"
    setPackageName(`Sac de regroupement — ${dominantType}`)
    setPackageType(PACKAGE_CONTAINERS[0].label)
    setLocation(list[0]?.current_location || PREDEFINED_ZONES[0])
    setObservations("")
  }

  // Calcul du poids total
  const totalWeight = itemsToGroup.reduce((acc, curr) => {
    const qty = Number(curr.quantity) || 0
    return acc + (curr.unit === "Kg" || curr.unit === "kg" ? qty : qty * 0.8)
  }, 0)

  const handleRemoveItem = (id: string) => {
    if (itemsToGroup.length <= 1) {
      toast.error("Un colis doit contenir au moins un lot de déchet.")
      return
    }
    setItemsToGroup(prev => prev.filter(it => it.id !== id))
  }

  const handleSubmit = async () => {
    if (itemsToGroup.length === 0) {
      toast.error("Veuillez sélectionner au moins un lot de déchet à regrouper.")
      return
    }
    if (!packageName.trim()) {
      toast.error("Veuillez spécifier un nom ou libellé pour ce colis.")
      return
    }

    setIsSubmitting(true)

    const finalPkgNumber = customPackageNumber.trim() || `COLIS-2026-${Date.now().toString().slice(-4)}`
    
    const newPackage: GroupedWastePackage = {
      id: `pkg-${Date.now()}`,
      package_number: finalPkgNumber,
      package_name: packageName.trim(),
      package_type: packageType,
      total_weight: Math.round(totalWeight * 100) / 100,
      unit: "Kg",
      current_location: location.trim(),
      status: "Groupé (En stock)",
      created_at: new Date().toISOString(),
      created_by: "Responsable Déchets ABMed",
      observations: observations.trim() || undefined,
      item_ids: itemsToGroup.map(it => it.id),
      items: itemsToGroup,
    }

    try {
      // 1. Sauvegarder dans localStorage (packages groupés)
      if (typeof window !== "undefined" && window.localStorage) {
        const storedPackagesStr = localStorage.getItem("waste_grouped_packages_v1")
        const storedPackages: GroupedWastePackage[] = storedPackagesStr ? JSON.parse(storedPackagesStr) : []
        storedPackages.unshift(newPackage)
        localStorage.setItem("waste_grouped_packages_v1", JSON.stringify(storedPackages))

        // 2. Mettre à jour les batches individuels avec le grouped_package_id
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
      onSuccess(newPackage)
      onOpenChange(false)
    } catch (e) {
      console.error("Erreur lors de la création du colis groupé:", e)
      toast.error("Erreur lors de l'enregistrement du colis.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(v) => {
        if (v) handleOpenInit()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-600/10 text-red-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">
                Regrouper en Grand Colis / Sac de Déchets
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Rassemblez les lots de détails sélectionnés dans un même contenant (sac, fût, carton) pour faciliter le stockage et la manutention.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* BANDEAU RÉCAPITULATIF DE LA SÉLECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Boxes className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Lots sélectionnés</span>
                <span className="text-base font-black text-foreground">{itemsToGroup.length} article{itemsToGroup.length > 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Scale className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Poids total cumulé</span>
                <span className="text-base font-black text-foreground">{Math.round(totalWeight * 10) / 10} Kg</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Package className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">N° Colis / Sac</span>
                <span className="text-sm font-black font-mono text-foreground">{customPackageNumber}</span>
              </div>
            </div>
          </div>

          {/* FORMULAIRE DE CONFIGURATION DU COLIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Libellé / Nom du Colis ou Sac <span className="text-red-500">*</span>
              </Label>
              <Input
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="Ex: Grand sac hermétique — Médicaments périmés"
                className="text-xs h-9 rounded-lg"
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

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Référence / Numéro du Colis
              </Label>
              <Input
                value={customPackageNumber}
                onChange={(e) => setCustomPackageNumber(e.target.value)}
                placeholder="COLIS-2026-XXXX"
                className="text-xs h-9 rounded-lg font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Observations & Instructions particulières (facultatif)
            </Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ex: Contient des ampoules en verre ou comprimés à manipuler avec précaution..."
              className="text-xs min-h-[60px] rounded-lg resize-none"
            />
          </div>

          {/* LISTE DÉTAILLÉE DES LOTS INCLUS DANS LE COLIS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-red-600" /> Lots de détails à inclure dans le colis ({itemsToGroup.length})
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
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
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
            className="text-xs"
          >
            Annuler
          </Button>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || itemsToGroup.length === 0}
            className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5 cursor-pointer shadow-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Créer le Colis Groupé ({itemsToGroup.length} lots)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
