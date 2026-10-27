"use client"

import { useState, useEffect, useRef } from "react"
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
  Package, Boxes, Scale, Trash2, Layers, CheckCircle2, 
  MapPin, AlertTriangle, Undo2, Pencil, Save
} from "lucide-react"
import { toast } from "sonner"
import { WasteStockItem } from "@/app/dashboard/waste/stock/page"
import { GroupedWastePackage, PACKAGE_CONTAINERS } from "./waste-grouping-dialog"
import { WASTE_LOCATION_OPTIONS, normalizeWasteLocation } from "@/utils/waste-locations"
import { saveGroupedPackageToCloud } from "@/utils/waste-packages-sync"

export interface WastePackageEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pkg: GroupedWastePackage | null
  onSuccess: (updatedPkg: GroupedWastePackage, removedItems: WasteStockItem[]) => void
}

export function WastePackageEditDialog({
  open,
  onOpenChange,
  pkg,
  onSuccess
}: WastePackageEditDialogProps) {
  const [packageType, setPackageType] = useState("")
  const [currentLocation, setCurrentLocation] = useState("")
  const [observations, setObservations] = useState("")
  const [activeItems, setActiveItems] = useState<WasteStockItem[]>([])
  const [removedItems, setRemovedItems] = useState<WasteStockItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const prevPkgIdRef = useRef<string | null>(null)

  // Initialisation à l'ouverture du dialogue avec le colis sélectionné
  useEffect(() => {
    if (open && pkg) {
      if (prevPkgIdRef.current !== pkg.id) {
        prevPkgIdRef.current = pkg.id
        setPackageType(pkg.package_type || PACKAGE_CONTAINERS[0].label)
        setCurrentLocation(normalizeWasteLocation(pkg.current_location, pkg.package_type))
        setObservations(pkg.observations || "")
        setActiveItems(Array.isArray(pkg.items) ? [...pkg.items] : [])
        setRemovedItems([])
      }
    } else if (!open) {
      prevPkgIdRef.current = null
    }
  }, [open, pkg])

  if (!pkg) return null

  // Calcul dynamique du poids total actuel selon les lots conservés
  const currentTotalWeight = Math.round(
    activeItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0) * 100
  ) / 100

  // Retirer un stock détail du colis
  const handleRemoveItem = (itemToRemove: WasteStockItem) => {
    setActiveItems(prev => prev.filter(it => it.id !== itemToRemove.id && it.batch_number !== itemToRemove.batch_number))
    setRemovedItems(prev => {
      if (prev.some(it => it.id === itemToRemove.id || it.batch_number === itemToRemove.batch_number)) {
        return prev
      }
      return [...prev, itemToRemove]
    })
    toast.info(`Lot ${itemToRemove.batch_number} retiré du colis (sera libéré à l'enregistrement).`)
  }

  // Restaurer un stock détail retiré
  const handleRestoreItem = (itemToRestore: WasteStockItem) => {
    setRemovedItems(prev => prev.filter(it => it.id !== itemToRestore.id && it.batch_number !== itemToRestore.batch_number))
    setActiveItems(prev => {
      if (prev.some(it => it.id === itemToRestore.id || it.batch_number === itemToRestore.batch_number)) {
        return prev
      }
      return [...prev, itemToRestore]
    })
    toast.success(`Lot ${itemToRestore.batch_number} réintégré dans le colis.`)
  }

  // Soumission et enregistrement des modifications
  const handleSubmit = async () => {
    if (activeItems.length === 0) {
      toast.error("Impossible d'enregistrer un colis sans aucun lot de déchet. Utilisez 'Dégrouper le colis' pour le dissoudre complètement.")
      return
    }

    setIsSubmitting(true)

    try {
      const updatedPackage: GroupedWastePackage = {
        ...pkg,
        package_type: packageType,
        package_name: `${packageType} (${activeItems.length} lots)`,
        observations: observations.trim() || undefined,
        current_location: currentLocation,
        total_weight: currentTotalWeight,
        items: activeItems,
        item_ids: activeItems.map(i => i.id),
      }

      const removedIds = removedItems.map(i => i.id)

      // Sauvegarde dans Supabase Cloud + localStorage + synchronisation temps réel
      await saveGroupedPackageToCloud(updatedPackage, removedIds)

      toast.success(
        removedItems.length > 0
          ? `Colis ${pkg.package_number} modifié : ${removedItems.length} lot(s) retiré(s) et retourné(s) dans le stock en détail.`
          : `Colis ${pkg.package_number} mis à jour avec succès.`
      )

      onSuccess(updatedPackage, removedItems)
      onOpenChange(false)
    } catch (err) {
      console.error("Erreur enregistrement modification colis:", err)
      toast.error("Une erreur est survenue lors de l'enregistrement des modifications.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <Pencil className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-black tracking-tight font-mono">
                    Modifier le Colis {pkg.package_number}
                  </DialogTitle>
                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 font-bold">
                    Regroupement
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Modifiez le conditionnement, le commentaire ou retirez des lots de déchets associés.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-bold bg-muted/40 font-mono">
                Poids : {currentTotalWeight} {pkg.unit || "Kg"}
              </Badge>
              <Badge variant="outline" className="text-xs font-bold bg-purple-50 text-purple-800 border-purple-200">
                {activeItems.length} lot{activeItems.length > 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* SECTION 1 : MODIFICATION DU CONDITIONNEMENT & EMPLACEMENT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-muted/20 p-3.5 rounded-xl border border-border/60">
            {/* Conditionnement */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-purple-600" />
                Conditionnement choisi :
              </Label>
              <Select value={packageType} onValueChange={(val) => setPackageType(val || "")}>
                <SelectTrigger className="text-xs h-9 bg-background">
                  <SelectValue placeholder="Sélectionner le contenant" />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGE_CONTAINERS.map((cont) => (
                    <SelectItem key={cont.id} value={cont.label} className="text-xs">
                      {cont.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Emplacement de stockage */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                Emplacement de stockage :
              </Label>
              <Select value={currentLocation} onValueChange={(val) => setCurrentLocation(val || "")}>
                <SelectTrigger className="text-xs h-9 bg-background">
                  <SelectValue placeholder="Sélectionner un emplacement" />
                </SelectTrigger>
                <SelectContent>
                  {WASTE_LOCATION_OPTIONS.map((loc) => (
                    <SelectItem key={loc} value={loc} className="text-xs">
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SECTION 2 : MODIFICATION DU COMMENTAIRE / OBSERVATIONS */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-amber-600" />
              Commentaire & Observations du regroupement :
            </Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Ex: Lots regroupés pour incinération par filière cytotoxique. Fût scellé et étiqueté..."
              className="text-xs min-h-[75px] bg-background resize-y"
            />
          </div>

          {/* SECTION 3 : GESTION DES STOCKS DÉTAIL ASSOCIÉS (RETIRER UN LOT) */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Boxes className="h-3.5 w-3.5 text-red-600" />
                  Stocks détail associés au colis ({activeItems.length})
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Cliquez sur <strong>« Retirer du colis »</strong> pour dissocier un lot de déchet. Il redeviendra un stock en détail autonome.
                </p>
              </div>

              {removedItems.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 font-bold w-fit">
                  {removedItems.length} lot(s) en attente de libération
                </Badge>
              )}
            </div>

            {/* Alerte si aucun lot restant */}
            {activeItems.length === 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>Tous les lots ont été retirés. Veuillez conserver au moins un lot ou dissoudre le colis.</span>
              </div>
            )}

            {/* Tableau des lots actifs dans le colis */}
            <div className="border border-border/70 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b text-[10px] uppercase font-bold text-muted-foreground sticky top-0">
                  <tr>
                    <th className="p-2.5">N° Lot Déchet</th>
                    <th className="p-2.5">Désignation & Type</th>
                    <th className="p-2.5">Provenance</th>
                    <th className="p-2.5 text-right">Poids</th>
                    <th className="p-2.5 text-right pr-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {activeItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground text-xs italic">
                        Aucun lot actif restant dans ce colis.
                      </td>
                    </tr>
                  ) : (
                    activeItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="p-2.5 font-mono font-bold text-red-700 dark:text-red-400">
                          {item.batch_number}
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-foreground">{item.commercial_name || item.waste_type}</div>
                          <div className="text-[10px] text-muted-foreground">{item.waste_type}</div>
                        </td>
                        <td className="p-2.5 text-muted-foreground text-[11px]">
                          {item.source_structure || "ABMed"}
                        </td>
                        <td className="p-2.5 font-bold text-right tabular-nums text-foreground">
                          {item.quantity} {item.unit || "Kg"}
                        </td>
                        <td className="p-2.5 text-right pr-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item)}
                            className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold gap-1"
                            title="Retirer ce lot du colis pour le libérer en stock détail"
                          >
                            <Trash2 className="h-3 w-3" />
                            Retirer
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Lots retirés lors de cette session de modification */}
            {removedItems.length > 0 && (
              <div className="mt-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Undo2 className="h-3.5 w-3.5" />
                    Lots retirés lors de cette modification ({removedItems.length}) :
                  </span>
                  <span className="text-[10px] text-amber-800 italic">
                    Ces lots redeviendront cochables et regroupables en détail
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {removedItems.map((item) => (
                    <div
                      key={item.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background border border-amber-300 text-xs shadow-2xs"
                    >
                      <span className="font-mono font-bold text-amber-900">{item.batch_number}</span>
                      <span className="text-[11px] text-muted-foreground">({item.quantity} {item.unit || "Kg"})</span>
                      <button
                        type="button"
                        onClick={() => handleRestoreItem(item)}
                        className="text-amber-800 hover:text-amber-950 font-bold ml-1 text-[11px] underline cursor-pointer"
                        title="Annuler le retrait de ce lot"
                      >
                        Annuler
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs w-full sm:w-auto"
          >
            Annuler
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || activeItems.length === 0}
            className="text-xs font-bold bg-[#1B5C2E] hover:bg-[#144723] text-white gap-1.5 shadow-xs w-full sm:w-auto"
          >
            <Save className="h-3.5 w-3.5" />
            {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
