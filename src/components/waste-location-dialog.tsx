"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { MapPin, CheckCircle2, Loader2, Building2 } from "lucide-react"
import { WASTE_STORE_NAME, WASTE_ZONES, normalizeWasteLocation } from "@/utils/waste-locations"

export interface WasteLocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: {
    id: string
    batch_number: string
    waste_type?: string
    commercial_name?: string
    current_location?: string
    quantity?: number
    unit?: string
  } | null
  onSuccess?: (newLocation: string) => void
}

export function WasteLocationDialog({ open, onOpenChange, batch, onSuccess }: WasteLocationDialogProps) {
  const supabase = createClient()

  const [selectedZone, setSelectedZone] = useState(WASTE_ZONES[0].fullLocation)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || !batch) return
    const normalized = normalizeWasteLocation(batch.current_location, batch.waste_type)
    setSelectedZone(normalized)
  }, [open, batch])

  const handleSave = async () => {
    if (!batch) return
    if (!selectedZone) {
      toast.error("Veuillez choisir une zone du MAGASIN DES DECHETS.")
      return
    }

    const finalLocation = selectedZone
    setIsSaving(true)

    try {
      // 1. Mise à jour locale (localStorage : lots de détail + colis groupés)
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          // A. Si c'est un colis groupé, mettre à jour le colis et ses lots inclus
          let packageItemIds: string[] = []
          const storedPkgsStr = localStorage.getItem("waste_grouped_packages_v1")
          if (storedPkgsStr) {
            const pkgList = JSON.parse(storedPkgsStr)
            const pkgIdx = pkgList.findIndex(
              (p: any) => p.id === batch.id || p.package_number === batch.batch_number
            )
            if (pkgIdx !== -1) {
              pkgList[pkgIdx].current_location = finalLocation
              packageItemIds = pkgList[pkgIdx].item_ids || []
              if (Array.isArray(pkgList[pkgIdx].items)) {
                pkgList[pkgIdx].items = pkgList[pkgIdx].items.map((it: any) => ({
                  ...it,
                  current_location: finalLocation,
                }))
              }
              localStorage.setItem("waste_grouped_packages_v1", JSON.stringify(pkgList))
            }
          }

          // B. Mettre à jour le lot (ou les lots inclus dans le colis)
          const stored = localStorage.getItem("waste_batches_custom_v1")
          if (stored) {
            const list = JSON.parse(stored)
            const updatedList = list.map((b: any) => {
              if (
                b.id === batch.id ||
                b.batch_number === batch.batch_number ||
                packageItemIds.includes(b.id)
              ) {
                return { ...b, current_location: finalLocation }
              }
              return b
            })
            localStorage.setItem("waste_batches_custom_v1", JSON.stringify(updatedList))
          }

          // C. Enregistrement d'un mouvement d'orientation interne
          const mvts = JSON.parse(localStorage.getItem("waste_movements_custom_v1") || "[]")
          const newMvt = {
            id: `mvt-loc-${Date.now()}`,
            mvt_number: `MVT-W-${Date.now().toString().slice(-5)}`,
            date: new Date().toISOString(),
            type: "Orientation Magasin Déchets",
            batch: batch.batch_number,
            waste_type: batch.waste_type || "Déchet pharmaceutique",
            quantity: `${batch.quantity || 1} ${batch.unit || "Kg"}`,
            operator: "Marie ADANDE",
            origin: batch.current_location || WASTE_STORE_NAME,
            destination: finalLocation,
            observations: `Orientation dans ${finalLocation}`,
            signature_hash: `SIG-LOC-${Date.now().toString().slice(-6)}`,
          }
          localStorage.setItem("waste_movements_custom_v1", JSON.stringify([newMvt, ...mvts]))
        } catch (localErr) {
          console.warn("Erreur mise à jour locale déchet:", localErr)
        }
      }

      // 2. Mise à jour Supabase Cloud en arrière-plan
      try {
        await supabase
          .from("waste_batches")
          .update({ current_location: finalLocation })
          .or(`id.eq.${batch.id},batch_number.eq.${batch.batch_number}`)
      } catch (cloudErr) {
        console.warn("Erreur cloud update location déchet:", cloudErr)
      }

      toast.success(`Emplacement mis à jour : ${finalLocation}`)
      onSuccess?.(finalLocation)
      onOpenChange(false)
    } catch (err: any) {
      toast.error("Erreur lors de l'enregistrement de l'emplacement.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <MapPin className="h-5 w-5 text-red-600" />
            Orienter dans le {WASTE_STORE_NAME}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Sélectionnez obligatoirement l&apos;une des 3 zones réglementaires du <strong>{WASTE_STORE_NAME}</strong>.
          </DialogDescription>
        </DialogHeader>

        {batch && (
          <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Référence Lot / Colis :</span>
              <span className="font-mono font-bold text-foreground">{batch.batch_number}</span>
            </div>
            {batch.waste_type && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Classification :</span>
                <span className="font-medium text-foreground">{batch.waste_type}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Emplacement actuel :</span>
              <Badge variant="outline" className="text-[11px] bg-background">
                {batch.current_location || "À orienter"}
              </Badge>
            </div>
          </div>
        )}

        <div className="space-y-3.5 py-2">
          {/* MAGASIN UNIQUE */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Magasin de stockage (Unique)
            </Label>
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
              <Building2 className="h-4.5 w-4.5 text-red-600 shrink-0" />
              <span className="text-xs font-black tracking-wide text-red-950 dark:text-red-200">
                {WASTE_STORE_NAME}
              </span>
            </div>
          </div>

          {/* CHOIX OBLIGATOIRE PARMI LES 3 ZONES */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">
              Zone d&apos;orientation obligatoire <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-2">
              {WASTE_ZONES.map((zone) => {
                const isSelected = selectedZone === zone.fullLocation
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setSelectedZone(zone.fullLocation)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-red-50 dark:bg-red-950/30 border-red-600 ring-1 ring-red-600 shadow-2xs"
                        : "bg-background border-border/70 hover:bg-muted/40"
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-red-600 bg-red-600 text-white" : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-foreground">{zone.zoneName}</span>
                        <Badge variant="outline" className={`text-[10px] font-bold ${zone.badgeColor}`}>
                          {zone.shortCode}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {zone.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving} className="cursor-pointer">
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-1.5 cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Valider l&apos;orientation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
