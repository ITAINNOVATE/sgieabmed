"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MapPin, AlertTriangle, CheckCircle2, Loader2, ChevronRight } from "lucide-react"

interface SampleLocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sample: { id: string; sample_number: string; commercial_name: string; batch_number?: string } | null
  onSuccess?: () => void
}

interface Room    { id: string; name: string }
interface Zone    { id: string; name: string; room_id: string }
interface Cabinet { id: string; name: string; zone_id: string }
interface Shelf   { id: string; name: string; cabinet_id: string; is_full: boolean; capacity_max: number | null; sample_count?: number }

export function SampleLocationDialog({ open, onOpenChange, sample, onSuccess }: SampleLocationDialogProps) {
  const supabase = createClient()

  const [rooms,    setRooms]    = useState<Room[]>([])
  const [zones,    setZones]    = useState<Zone[]>([])
  const [cabinets, setCabinets] = useState<Cabinet[]>([])
  const [shelves,  setShelves]  = useState<Shelf[]>([])

  const [selectedRoom,    setSelectedRoom]    = useState("")
  const [selectedZone,    setSelectedZone]    = useState("")
  const [selectedCabinet, setSelectedCabinet] = useState("")
  const [selectedShelf,   setSelectedShelf]   = useState("")
  const [positionDetail,  setPositionDetail]  = useState("")
  const [stillAvailable,  setStillAvailable]  = useState<"yes" | "no">("yes")

  const [filteredZones,    setFilteredZones]    = useState<Zone[]>([])
  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([])
  const [filteredShelves,  setFilteredShelves]  = useState<Shelf[]>([])

  const [isSaving, setIsSaving] = useState(false)
  const [shelfSampleCount, setShelfSampleCount] = useState<number | null>(null)

  // Load all hierarchy on open
  useEffect(() => {
    if (!open) return
    async function load() {
      const [{ data: r }, { data: z }, { data: c }, { data: s }] = await Promise.all([
        supabase.from('rooms').select('id, name').order('name'),
        supabase.from('zones').select('id, name, room_id').order('name'),
        supabase.from('cabinets').select('id, name, zone_id').order('name'),
        supabase.from('shelves').select('id, name, cabinet_id, is_full, capacity_max').eq('is_full', false).order('name'),
      ])
      setRooms(r || [])
      setZones(z || [])
      setCabinets(c || [])
      setShelves(s || [])
    }
    load()
    // reset
    setSelectedRoom(""); setSelectedZone(""); setSelectedCabinet(""); setSelectedShelf("")
    setPositionDetail(""); setStillAvailable("yes"); setShelfSampleCount(null)
  }, [open])

  // Filter cascade
  useEffect(() => {
    if (selectedRoom) {
      setFilteredZones(zones.filter(z => z.room_id === selectedRoom))
      setSelectedZone(""); setSelectedCabinet(""); setSelectedShelf("")
      setFilteredCabinets([]); setFilteredShelves([])
    }
  }, [selectedRoom, zones])

  useEffect(() => {
    if (selectedZone) {
      setFilteredCabinets(cabinets.filter(c => c.zone_id === selectedZone))
      setSelectedCabinet(""); setSelectedShelf("")
      setFilteredShelves([])
    }
  }, [selectedZone, cabinets])

  useEffect(() => {
    if (selectedCabinet) {
      setFilteredShelves(shelves.filter(s => s.cabinet_id === selectedCabinet))
      setSelectedShelf("")
    }
  }, [selectedCabinet, shelves])

  // Load sample count for selected shelf
  useEffect(() => {
    if (!selectedShelf) { setShelfSampleCount(null); return }
    async function countSamples() {
      const { count } = await supabase
        .from('samples')
        .select('id', { count: 'exact', head: true })
        .eq('shelf_id', selectedShelf)
        .neq('status', 'Rejeté')
      setShelfSampleCount(count ?? 0)
    }
    countSamples()
  }, [selectedShelf])

  const selectedShelfData = filteredShelves.find(s => s.id === selectedShelf)

  const handleConfirm = async () => {
    if (!sample || !selectedShelf) return
    setIsSaving(true)
    try {
      // Update sample location
      const { error: sampleError } = await supabase
        .from('samples')
        .update({
          shelf_id: selectedShelf,
          position_details: positionDetail || null,
          status: 'Disponible',
          current_location: buildLocationPath(),
        })
        .eq('id', sample.id)
      if (sampleError) throw sampleError

      // If operator says shelf is now full → mark it
      if (stillAvailable === "no") {
        const { error: shelfError } = await supabase
          .from('shelves')
          .update({ is_full: true })
          .eq('id', selectedShelf)
        if (shelfError) throw shelfError
      }

      // Record movement
      await supabase.from('movements').insert({
        mvt_number: `MVT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        sample_id: sample.id,
        movement_type: 'Transfert',
        quantity: 1,
        reason: 'Localisation initiale',
        destination: buildLocationPath(),
        observations: `Emplacement assigné : ${buildLocationPath()}${positionDetail ? ` — Position : ${positionDetail}` : ''}`,
      })

      toast.success(`Emplacement assigné à ${sample.sample_number}`, {
        description: buildLocationPath()
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error("Erreur lors de l'assignation : " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const buildLocationPath = () => {
    const room    = rooms.find(r => r.id === selectedRoom)?.name || ""
    const zone    = filteredZones.find(z => z.id === selectedZone)?.name || ""
    const cabinet = filteredCabinets.find(c => c.id === selectedCabinet)?.name || ""
    const shelf   = filteredShelves.find(s => s.id === selectedShelf)?.name || ""
    return [room, zone, cabinet, shelf].filter(Boolean).join(" › ")
  }

  const isValid = selectedShelf !== ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Assigner un emplacement
          </DialogTitle>
          <DialogDescription>
            {sample && (
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono">{sample.sample_number}</Badge>
                <span className="font-medium text-foreground">{sample.commercial_name}</span>
                {sample.batch_number && <span className="text-muted-foreground text-xs">— Lot : {sample.batch_number}</span>}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cascade selectors */}
          <div className="grid grid-cols-2 gap-3">
            {/* Salle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">1. Salle</Label>
              <Select value={selectedRoom} onValueChange={(v) => setSelectedRoom(v || "")}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Zone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">2. Zone</Label>
              <Select value={selectedZone} onValueChange={(v) => setSelectedZone(v || "")} disabled={!selectedRoom}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredZones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Armoire */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">3. Armoire / Frigo</Label>
              <Select value={selectedCabinet} onValueChange={(v) => setSelectedCabinet(v || "")} disabled={!selectedZone}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredCabinets.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Étagère */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">4. Étagère</Label>
              <Select value={selectedShelf} onValueChange={(v) => setSelectedShelf(v || "")} disabled={!selectedCabinet}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredShelves.length === 0 && selectedCabinet && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Toutes les étagères sont pleines</div>
                  )}
                  {filteredShelves.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Position detail */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">5. Position exacte (optionnel)</Label>
            <Input
              placeholder="ex: A-01, Bac 3, Rangée gauche..."
              value={positionDetail}
              onChange={e => setPositionDetail(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Shelf info */}
          {selectedShelf && shelfSampleCount !== null && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex items-start gap-3">
              <div className="mt-0.5 text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{buildLocationPath()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {shelfSampleCount} échantillon{shelfSampleCount > 1 ? 's' : ''} actuellement stocké{shelfSampleCount > 1 ? 's' : ''}
                  {selectedShelfData?.capacity_max ? ` / ${selectedShelfData.capacity_max} max` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Capacity question */}
          {selectedShelf && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Cet emplacement peut-il encore recevoir d'autres échantillons ?
              </p>
              <RadioGroup value={stillAvailable} onValueChange={(v: "yes" | "no") => setStillAvailable(v)} className="space-y-2">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setStillAvailable("yes")}>
                  <RadioGroupItem value="yes" id="loc-yes" />
                  <Label htmlFor="loc-yes" className="cursor-pointer flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span><strong>Oui</strong> — Maintenir cet emplacement disponible</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setStillAvailable("no")}>
                  <RadioGroupItem value="no" id="loc-no" />
                  <Label htmlFor="loc-no" className="cursor-pointer flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span><strong>Non</strong> — Marquer comme complet (ne plus proposer)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Annuler</Button>
          <Button onClick={handleConfirm} disabled={!isValid || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Confirmer l'emplacement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
