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

import {
  getLocalRooms, getLocalZones, getLocalCabinets, getLocalShelves, updateLocalShelf
} from "@/utils/locations-storage"

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
  const [resetKey,        setResetKey]        = useState(0)

  const [filteredZones,    setFilteredZones]    = useState<Zone[]>([])
  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([])
  const [filteredShelves,  setFilteredShelves]  = useState<Shelf[]>([])

  const [isSaving, setIsSaving] = useState(false)
  const [shelfSampleCount, setShelfSampleCount] = useState<number | null>(null)

  // Load all hierarchy on open
  useEffect(() => {
    if (!open) return
    async function load() {
      // Charger les données locales d'abord
      const localR = getLocalRooms()
      const localZ = getLocalZones()
      const localC = getLocalCabinets()
      const localS = getLocalShelves()

      let rList: Room[] = [...localR]
      let zList: Zone[] = [...localZ]
      let cList: Cabinet[] = [...localC]
      let sList: Shelf[] = localS.map(s => ({
        ...s,
        is_full: !!s.is_full,
        capacity_max: s.capacity_max ?? null
      }))

      try {
        const [{ data: r }, { data: z }, { data: c }, { data: s }] = await Promise.all([
          supabase.from('rooms').select('id, name').order('name'),
          supabase.from('zones').select('id, name, room_id').order('name'),
          supabase.from('cabinets').select('id, name, zone_id').order('name'),
          supabase.from('shelves').select('id, name, cabinet_id, is_full, capacity_max').eq('is_full', false).order('name'),
        ])
        if (r && r.length > 0) {
          const ids = new Set(rList.map(item => item.id))
          r.forEach(item => { if (!ids.has(item.id)) rList.push(item) })
        }
        if (z && z.length > 0) {
          const ids = new Set(zList.map(item => item.id))
          z.forEach(item => { if (!ids.has(item.id)) zList.push(item) })
        }
        if (c && c.length > 0) {
          const ids = new Set(cList.map(item => item.id))
          c.forEach(item => { if (!ids.has(item.id)) cList.push(item) })
        }
        if (s && s.length > 0) {
          const ids = new Set(sList.map(item => item.id))
          s.forEach(item => { if (!ids.has(item.id)) sList.push(item) })
        }
      } catch {
        // Mode hors-ligne / fallback local
      }

      setRooms(rList)
      setZones(zList)
      setCabinets(cList)
      setShelves(sList.filter(s => !s.is_full))
    }
    load()
    // reset
    setSelectedRoom(""); setSelectedZone(""); setSelectedCabinet(""); setSelectedShelf("")
    setPositionDetail(""); setStillAvailable("yes"); setShelfSampleCount(null)
  }, [open, supabase])

  // Filter cascade
  useEffect(() => {
    if (selectedRoom) {
      setFilteredZones(zones.filter(z => z.room_id === selectedRoom))
      setSelectedZone(""); setSelectedCabinet(""); setSelectedShelf("")
      setFilteredCabinets([]); setFilteredShelves([])
      setResetKey(k => k + 1) // force remount des selects enfants
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
      try {
        const { count } = await supabase
          .from('samples')
          .select('id', { count: 'exact', head: true })
          .eq('shelf_id', selectedShelf)
          .neq('status', 'Rejeté')
        if (count !== null && count !== undefined) {
          setShelfSampleCount(count)
          return
        }
      } catch {}

      // Fallback local counting
      let count = 0
      if (typeof window !== "undefined") {
        try {
          const overrides = JSON.parse(localStorage.getItem('local_sample_overrides') || '{}')
          Object.values(overrides).forEach((item: any) => {
            if (item && item.shelf_id === selectedShelf && item.status !== 'Rejeté') count++
          })
        } catch {}
      }
      setShelfSampleCount(count)
    }
    countSamples()
  }, [selectedShelf, supabase])

  const selectedShelfData = filteredShelves.find(s => s.id === selectedShelf)

  const handleConfirm = async () => {
    if (!sample || !selectedShelf) return
    setIsSaving(true)
    const locationPath = buildLocationPath()
    const mvtNumber = `MVT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`

    try {
      // 1. Tenter la mise à jour Supabase avec timeout court
      try {
        await Promise.race([
          supabase
            .from('samples')
            .update({
              shelf_id: selectedShelf,
              position_details: positionDetail || null,
              status: 'Disponible',
              current_location: locationPath,
            })
            .eq('id', sample.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
        ])
      } catch {}

      // 2. Si étagère déclarée pleine
      if (stillAvailable === "no") {
        try {
          await supabase.from('shelves').update({ is_full: true }).eq('id', selectedShelf)
        } catch {}
        updateLocalShelf(selectedShelf, { is_full: true })
      }

      // 3. Enregistrer le mouvement dans Supabase
      try {
        await supabase.from('movements').insert({
          mvt_number: mvtNumber,
          sample_id: sample.id,
          movement_type: 'Transfert',
          quantity: 1,
          reason: 'Localisation initiale',
          destination: locationPath,
          observations: `Emplacement assigné : ${locationPath}${positionDetail ? ` — Position : ${positionDetail}` : ''}`,
        })
      } catch {}

      // 4. Persistance garantie dans localStorage (overrides et historique mouvements)
      if (typeof window !== "undefined") {
        try {
          const overrides = JSON.parse(localStorage.getItem('local_sample_overrides') || '{}')
          const overrideVal = {
            ...(overrides[sample.id] || {}),
            shelf_id: selectedShelf,
            position_details: positionDetail || null,
            status: 'Disponible',
            current_location: locationPath,
          }
          overrides[sample.id] = overrideVal
          if (sample.sample_number) overrides[sample.sample_number] = overrideVal
          localStorage.setItem('local_sample_overrides', JSON.stringify(overrides))

          const localMovements = JSON.parse(localStorage.getItem('local_movements_history') || '[]')
          localMovements.unshift({
            id: `mvt_${Date.now()}`,
            mvt_number: mvtNumber,
            sample_id: sample.id,
            sample_number: sample.sample_number,
            commercial_name: sample.commercial_name,
            batch_number: sample.batch_number,
            movement_type: 'Transfert',
            quantity: 1,
            reason: 'Localisation initiale',
            destination: locationPath,
            observations: `Emplacement assigné : ${locationPath}${positionDetail ? ` — Position : ${positionDetail}` : ''}`,
            movement_date: new Date().toISOString(),
          })
          localStorage.setItem('local_movements_history', JSON.stringify(localMovements))
        } catch {}
      }

      toast.success(`Emplacement assigné à ${sample.sample_number}`, {
        description: locationPath
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
          {/* Cascade selectors — native <select> pour éviter le bug UUID de Radix */}
          <div className="grid grid-cols-2 gap-3">

            {/* 1. Salle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">1. Salle</Label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Choisir...</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Zone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">2. Zone</Label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                disabled={!selectedRoom}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{!selectedRoom ? "Choisir d'abord une salle" : "Choisir..."}</option>
                {filteredZones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>

            {/* 3. Armoire */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">3. Armoire / Frigo</Label>
              <select
                value={selectedCabinet}
                onChange={(e) => setSelectedCabinet(e.target.value)}
                disabled={!selectedZone}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{!selectedZone ? "Choisir d'abord une zone" : "Choisir..."}</option>
                {filteredCabinets.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 4. Étagère */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">4. Étagère</Label>
              <select
                value={selectedShelf}
                onChange={(e) => setSelectedShelf(e.target.value)}
                disabled={!selectedCabinet}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{!selectedCabinet ? "Choisir d'abord une armoire" : "Choisir..."}</option>
                {filteredShelves.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Position detail */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">5. Position exacte (optionnel)</Label>
            <Input
              placeholder=""
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
