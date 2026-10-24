"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MapPin, CheckCircle2, Loader2, ArrowLeftRight } from "lucide-react"

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

const PREDEFINED_WASTE_ZONES = [
  { id: "zone-a", name: "Local Déchets A1 — Médicaments Solides", code: "LOC-A1" },
  { id: "zone-a2", name: "Local Déchets A2 — Médicaments Liquides & Sirops", code: "LOC-A2" },
  { id: "zone-dasri", name: "Local DASRI B — Déchets d'Activités de Soins Infectieux", code: "LOC-DASRI" },
  { id: "zone-c", name: "Zone Quarantaine C2 — Attente Tri & Expertise", code: "LOC-QC2" },
  { id: "zone-chim", name: "Local Sécurisé D — Produits Chimiques & Toxiques", code: "LOC-TOX" },
  { id: "zone-froid", name: "Chambre Froide Déchets F — Thermosensibles (2-8°C)", code: "LOC-FROID" },
  { id: "zone-mag", name: "Magasin Central des Déchets — Zone Générale", code: "LOC-MAG" },
]

export function WasteLocationDialog({ open, onOpenChange, batch, onSuccess }: WasteLocationDialogProps) {
  const supabase = createClient()

  const [selectedZone, setSelectedZone] = useState("")
  const [positionDetail, setPositionDetail] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open || !batch) return
    const cur = batch.current_location || ""
    const matchedZone = PREDEFINED_WASTE_ZONES.find(z => cur.includes(z.name) || cur.includes(z.code))
    if (matchedZone) {
      setSelectedZone(matchedZone.name)
      const detail = cur.replace(matchedZone.name, "").replace(/^[\s—\-:,]+/, "").trim()
      setPositionDetail(detail)
    } else {
      setSelectedZone(cur ? cur : PREDEFINED_WASTE_ZONES[0].name)
      setPositionDetail("")
    }
  }, [open, batch])

  const handleSave = async () => {
    if (!batch) return
    if (!selectedZone) {
      toast.error("Veuillez sélectionner une zone de stockage.")
      return
    }

    const finalLocation = positionDetail.trim() 
      ? `${selectedZone} (${positionDetail.trim()})`
      : selectedZone

    setIsSaving(true)

    try {
      // 1. Mise à jour locale (localStorage)
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          const stored = localStorage.getItem("waste_batches_custom_v1")
          if (stored) {
            const list = JSON.parse(stored)
            const idx = list.findIndex((b: any) => b.id === batch.id || b.batch_number === batch.batch_number)
            if (idx !== -1) {
              list[idx].current_location = finalLocation
              localStorage.setItem("waste_batches_custom_v1", JSON.stringify(list))
            }
          }

          // Enregistrement d'un mouvement de transfert interne
          const mvts = JSON.parse(localStorage.getItem("waste_movements_custom_v1") || "[]")
          const newMvt = {
            id: `mvt-loc-${Date.now()}`,
            mvt_number: `MVT-W-${Date.now().toString().slice(-5)}`,
            date: new Date().toISOString(),
            type: "Transfert interne",
            batch: batch.batch_number,
            waste_type: batch.waste_type || "Déchet pharmaceutique",
            quantity: `${batch.quantity || 1} ${batch.unit || 'Kg'}`,
            operator: "Marie ADANDE",
            origin: batch.current_location || "Non défini",
            destination: finalLocation,
            observations: `Déplacement vers ${finalLocation}`,
            signature_hash: `SIG-LOC-${Date.now().toString().slice(-6)}`
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

        await supabase.from("waste_movements").insert({
          mvt_number: `MVT-W-${Date.now().toString().slice(-5)}`,
          date: new Date().toISOString(),
          type: "Transfert interne",
          batch: batch.batch_number,
          waste_type: batch.waste_type || "Déchet pharmaceutique",
          quantity: `${batch.quantity || 1} ${batch.unit || 'Kg'}`,
          operator: "Marie ADANDE",
          origin: batch.current_location || "Non défini",
          destination: finalLocation,
          observations: `Déplacement vers ${finalLocation}`
        })
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <MapPin className="h-5 w-5 text-red-600" />
            Assigner un emplacement dans le local déchets
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Localisez et classez ce lot de déchet dans le magasin ou la zone de quarantaine de l'ABMed.
          </DialogDescription>
        </DialogHeader>

        {batch && (
          <div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">N° Lot Déchet :</span>
              <span className="font-mono font-bold text-foreground">{batch.batch_number}</span>
            </div>
            {batch.waste_type && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Type de déchet :</span>
                <span className="font-medium text-foreground">{batch.waste_type}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Emplacement actuel :</span>
              <Badge variant="outline" className="text-[11px] bg-background">
                {batch.current_location || "Non défini / À localiser"}
              </Badge>
            </div>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Zone / Local de destination *</Label>
            <Select value={selectedZone} onValueChange={(val) => setSelectedZone(val || "")}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Sélectionnez une zone du magasin déchet" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_WASTE_ZONES.map((zone) => (
                  <SelectItem key={zone.id} value={zone.name} className="text-xs">
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Précision d'emplacement <span className="text-muted-foreground font-normal">(Fût, Bac, Palette, Allée)</span>
            </Label>
            <Input
              placeholder="Ex: Fût F-04, Palette P-12, Bac étanche B-02"
              value={positionDetail}
              onChange={(e) => setPositionDetail(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Annuler
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold gap-1.5"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Enregistrer l'emplacement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
