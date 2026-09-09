"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion"
import {
  MapPin, Plus, Building2, Layers3, Package, BookOpen,
  AlertTriangle, CheckCircle2, TrendingUp, Loader2, RefreshCw, Lock, Trash2
} from "lucide-react"
import {
  getLocalRooms, saveLocalRoom, deleteLocalRoom,
  getLocalZones, saveLocalZone, deleteLocalZone,
  getLocalCabinets, saveLocalCabinet, deleteLocalCabinet,
  getLocalShelves, saveLocalShelf, updateLocalShelf, deleteLocalShelf,
  StorageRoom, StorageZone, StorageCabinet, StorageShelf
} from "@/utils/locations-storage"

interface Room    { id: string; name: string; description?: string }
interface Zone    { id: string; name: string; room_id: string }
interface Cabinet { id: string; name: string; zone_id: string }
interface Shelf   { id: string; name: string; cabinet_id: string; is_full: boolean; capacity_max: number | null; sample_count?: number }

interface ShelfWithSamples extends Shelf {
  sample_count: number
  samples: { id: string; sample_number: string; commercial_name: string; status: string }[]
}
interface CabinetWithShelves extends Cabinet {
  shelves: ShelfWithSamples[]
}
interface ZoneWithCabinets extends Zone {
  cabinets: CabinetWithShelves[]
}
interface RoomWithZones extends Room {
  zones: ZoneWithCabinets[]
  totalSamples: number
  totalCapacity: number
  fullShelves: number
  totalShelves: number
}

// ---- AddRoomDialog ----
function AddRoomDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    // Tentative en arrière-plan vers Supabase sans bloquer l'UI
    try {
      await Promise.race([
        supabase.from('rooms').insert({ name: name.trim(), description: desc.trim() || null }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800))
      ]).catch(() => {})
    } catch {
      // Supabase indisponible ou schéma non initialisé
    }

    // Persistance locale garantie et instantanée
    saveLocalRoom(name, desc)
    setSaving(false)
    toast.success("Salle créée avec succès : " + name.trim())
    setOpen(false)
    setName("")
    setDesc("")
    onSuccess()
  }

  return (
    <>
      <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Building2 className="h-4 w-4" /> Ajouter une salle
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle salle de stockage</DialogTitle>
            <DialogDescription>Ajouter une salle ou un espace physique de stockage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Nom *</Label><Input placeholder="Ex: ECHANTIOTHEQUE PRINCIPALE" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-1"><Label>Description</Label><Input placeholder="Ex: Salle principale de stockage" value={desc} onChange={e => setDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---- AddZoneDialog ----
function AddZoneDialog({ rooms, onSuccess }: { rooms: Room[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!name.trim() || !roomId) return
    setSaving(true)

    try {
      await Promise.race([
        supabase.from('zones').insert({ name: name.trim(), room_id: roomId }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800))
      ]).catch(() => {})
    } catch {}

    saveLocalZone(name, roomId)
    setSaving(false)
    toast.success("Zone créée avec succès : " + name.trim())
    setOpen(false)
    setName("")
    setRoomId("")
    onSuccess()
  }

  return (
    <>
      <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Layers3 className="h-4 w-4" /> Ajouter une zone
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle zone</DialogTitle>
            <DialogDescription>Subdiviser une salle en zones de stockage distinctes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Salle *</Label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">Choisir une salle...</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1"><Label>Nom de la zone *</Label><Input placeholder="Ex: Zone A" value={name} onChange={e => setName(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !roomId || saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---- AddCabinetDialog ----
function AddCabinetDialog({ rooms, zones, onSuccess }: { rooms: Room[]; zones: Zone[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [zoneId, setZoneId] = useState("")
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const filteredZones = zones.filter(z => z.room_id === roomId)

  const handleSave = async () => {
    if (!name.trim() || !zoneId) return
    setSaving(true)

    try {
      await Promise.race([
        supabase.from('cabinets').insert({ name: name.trim(), zone_id: zoneId }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800))
      ]).catch(() => {})
    } catch {}

    saveLocalCabinet(name, zoneId)
    setSaving(false)
    toast.success("Armoire créée avec succès : " + name.trim())
    setOpen(false)
    setName("")
    setRoomId("")
    setZoneId("")
    onSuccess()
  }

  return (
    <>
      <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Package className="h-4 w-4" /> Ajouter une armoire
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle armoire / réfrigérateur</DialogTitle>
            <DialogDescription>Ajouter un meuble de stockage dans une zone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Salle *</Label>
              <select
                value={roomId}
                onChange={e => { setRoomId(e.target.value); setZoneId("") }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">Choisir une salle...</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Zone *</Label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                disabled={!roomId}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">{!roomId ? "Sélectionnez d'abord une salle" : "Choisir une zone..."}</option>
                {filteredZones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1"><Label>Nom de l'armoire *</Label><Input placeholder="Ex: Armoire A1" value={name} onChange={e => setName(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !zoneId || saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---- AddShelfDialog ----
function AddShelfDialog({ rooms, zones, cabinets, onSuccess }: { rooms: Room[]; zones: Zone[]; cabinets: Cabinet[]; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [zoneId, setZoneId] = useState("")
  const [cabinetId, setCabinetId] = useState("")
  const [capacityMax, setCapacityMax] = useState("")
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const filteredZones    = zones.filter(z => z.room_id === roomId)
  const filteredCabinets = cabinets.filter(c => c.zone_id === zoneId)

  const handleSave = async () => {
    if (!name.trim() || !cabinetId) return
    setSaving(true)
    const cap = capacityMax ? parseInt(capacityMax) : null

    try {
      await Promise.race([
        supabase.from('shelves').insert({
          name: name.trim(),
          cabinet_id: cabinetId,
          capacity_max: cap,
          is_full: false
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800))
      ]).catch(() => {})
    } catch {}

    saveLocalShelf(name, cabinetId, cap)
    setSaving(false)
    toast.success("Étagère créée avec succès : " + name.trim())
    setOpen(false)
    setName("")
    setRoomId("")
    setZoneId("")
    setCabinetId("")
    setCapacityMax("")
    onSuccess()
  }

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <BookOpen className="h-4 w-4" /> Ajouter une étagère
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle étagère / niveau</DialogTitle>
            <DialogDescription>Ajouter un emplacement de stockage dans une armoire.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Salle *</Label>
              <select
                value={roomId}
                onChange={e => { setRoomId(e.target.value); setZoneId(""); setCabinetId("") }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">Choisir une salle...</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Zone *</Label>
              <select
                value={zoneId}
                onChange={e => { setZoneId(e.target.value); setCabinetId("") }}
                disabled={!roomId}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">{!roomId ? "Sélectionnez d'abord une salle" : "Choisir une zone..."}</option>
                {filteredZones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Armoire *</Label>
              <select
                value={cabinetId}
                onChange={(e) => setCabinetId(e.target.value)}
                disabled={!zoneId}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">{!zoneId ? "Sélectionnez d'abord une zone" : "Choisir une armoire..."}</option>
                {filteredCabinets.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1"><Label>Nom de l'étagère *</Label><Input placeholder="Ex: Étagère 1" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-1">
              <Label>Capacité max (optionnel)</Label>
              <Input type="number" placeholder="Ex: 50" value={capacityMax} onChange={e => setCapacityMax(e.target.value)} min={1} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !cabinetId || saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---- Shelf progress bar ----
function ShelfOccupancyBar({ shelf }: { shelf: ShelfWithSamples }) {
  const count = shelf.sample_count
  const max   = shelf.capacity_max

  if (shelf.is_full) {
    return (
      <div className="flex items-center gap-2">
        <Progress value={100} className="h-1.5 flex-1 [&>div]:bg-red-500" />
        <Badge variant="destructive" className="text-[10px] shrink-0 gap-1 px-1.5"><Lock className="h-2.5 w-2.5" /> Complet</Badge>
      </div>
    )
  }

  if (!max) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-muted/60 flex items-center justify-center">
          <div className="h-full w-0 rounded-full bg-emerald-500" />
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{count} stocké{count > 1 ? 's' : ''}</span>
      </div>
    )
  }

  const pct = Math.min(Math.round((count / max) * 100), 100)
  const colorClass = pct >= 90 ? "[&>div]:bg-red-500" : pct >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"

  return (
    <div className="flex items-center gap-2">
      <Progress value={pct} className={`h-1.5 flex-1 ${colorClass}`} />
      <span className={`text-[11px] shrink-0 font-medium ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{count}/{max}</span>
    </div>
  )
}

// ---- Main Page ----
export default function LocationsPage() {
  const supabase = createClient()
  const [rooms,    setRooms]    = useState<RoomWithZones[]>([])
  const [rawRooms,    setRawRooms]    = useState<Room[]>([])
  const [rawZones,    setRawZones]    = useState<Zone[]>([])
  const [rawCabinets, setRawCabinets] = useState<Cabinet[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)

    // Charger d'abord les données locales garanties
    const localR = getLocalRooms()
    const localZ = getLocalZones()
    const localC = getLocalCabinets()
    const localS = getLocalShelves()

    let remoteR: Room[] = []
    let remoteZ: Zone[] = []
    let remoteC: Cabinet[] = []
    let remoteS: Shelf[] = []
    let remoteSamples: any[] = []

    try {
      const [{ data: r }, { data: z }, { data: c }, { data: s }, { data: samples }] = await Promise.all([
        supabase.from('rooms').select('*').order('name'),
        supabase.from('zones').select('*').order('name'),
        supabase.from('cabinets').select('*').order('name'),
        supabase.from('shelves').select('*').order('name'),
        supabase.from('samples').select('id, sample_number, commercial_name, status, shelf_id').neq('is_deleted', true),
      ])
      if (r) remoteR = r
      if (z) remoteZ = z
      if (c) remoteC = c
      if (s) remoteS = s
      if (samples) remoteSamples = samples
    } catch {
      // Supabase inaccessible ou tables manquantes
    }

    // Fusionner les salles
    const roomMap = new Map<string, Room>()
    localR.forEach(item => roomMap.set(item.id, item))
    remoteR.forEach(item => {
      if (!roomMap.has(item.id)) roomMap.set(item.id, item)
    })
    const roomsData = Array.from(roomMap.values())

    // Fusionner les zones
    const zoneMap = new Map<string, Zone>()
    localZ.forEach(item => zoneMap.set(item.id, item))
    remoteZ.forEach(item => {
      if (!zoneMap.has(item.id)) zoneMap.set(item.id, item)
    })
    const zonesData = Array.from(zoneMap.values())

    // Fusionner les armoires
    const cabMap = new Map<string, Cabinet>()
    localC.forEach(item => cabMap.set(item.id, item))
    remoteC.forEach(item => {
      if (!cabMap.has(item.id)) cabMap.set(item.id, item)
    })
    const cabinetsData = Array.from(cabMap.values())

    // Fusionner les étagères
    const shelfMap = new Map<string, Shelf>()
    localS.forEach(item => shelfMap.set(item.id, {
      ...item,
      is_full: !!item.is_full,
      capacity_max: item.capacity_max ?? null,
    }))
    remoteS.forEach(item => {
      if (!shelfMap.has(item.id)) shelfMap.set(item.id, item)
    })
    const shelvesData = Array.from(shelfMap.values())

    setRawRooms(roomsData)
    setRawZones(zonesData)
    setRawCabinets(cabinetsData)

    // Fusionner les échantillons (Supabase + localStorage)
    const sampleMap = new Map<string, any>()
    remoteSamples.forEach(smp => sampleMap.set(smp.id || smp.sample_number, smp))

    if (typeof window !== "undefined") {
      try {
        const historyRecords = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
        historyRecords.forEach((rec: any) => {
          if (rec.samples && Array.isArray(rec.samples)) {
            rec.samples.forEach((smp: any) => {
              const sid = smp.id || smp.sample_number
              if (sid && !sampleMap.has(sid)) {
                sampleMap.set(sid, smp)
              }
            })
          }
        })

        const overrides = JSON.parse(localStorage.getItem('local_sample_overrides') || '{}')
        Object.entries(overrides).forEach(([key, val]: [string, any]) => {
          if (sampleMap.has(key)) {
            sampleMap.set(key, { ...sampleMap.get(key), ...val })
          } else if (val.shelf_id) {
            sampleMap.set(key, { id: key, ...val })
          }
        })
      } catch {}
    }

    const allSamples = Array.from(sampleMap.values())

    // Compter les échantillons par étagère
    const samplesByShelf: Record<string, typeof allSamples> = {}
    allSamples.forEach(smp => {
      if (smp.shelf_id) {
        if (!samplesByShelf[smp.shelf_id]) samplesByShelf[smp.shelf_id] = []
        samplesByShelf[smp.shelf_id].push(smp)
      }
    })

    // Construire la hiérarchie enrichie
    const enrichedRooms: RoomWithZones[] = roomsData.map(room => {
      const roomZones: ZoneWithCabinets[] = zonesData
        .filter(z => z.room_id === room.id)
        .map(zone => {
          const zoneCabinets: CabinetWithShelves[] = cabinetsData
            .filter(c => c.zone_id === zone.id)
            .map(cabinet => {
              const cabinetShelves: ShelfWithSamples[] = shelvesData
                .filter(sh => sh.cabinet_id === cabinet.id)
                .map(shelf => ({
                  ...shelf,
                  sample_count: samplesByShelf[shelf.id]?.length || 0,
                  samples: samplesByShelf[shelf.id] || []
                }))
              return { ...cabinet, shelves: cabinetShelves }
            })
          return { ...zone, cabinets: zoneCabinets }
        })

      const allShelves = roomZones.flatMap(z => z.cabinets.flatMap(c => c.shelves))
      return {
        ...room,
        zones: roomZones,
        totalSamples:  allShelves.reduce((acc, s) => acc + s.sample_count, 0),
        totalCapacity: allShelves.reduce((acc, s) => acc + (s.capacity_max || 0), 0),
        fullShelves:   allShelves.filter(s => s.is_full).length,
        totalShelves:  allShelves.length,
      }
    })

    setRooms(enrichedRooms)
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  const globalSamples  = rooms.reduce((a, r) => a + r.totalSamples, 0)
  const globalCapacity = rooms.reduce((a, r) => a + r.totalCapacity, 0)
  const globalFull     = rooms.reduce((a, r) => a + r.fullShelves, 0)

  const handleDeleteRoom = (e: React.MouseEvent, roomId: string, name: string) => {
    e.stopPropagation()
    if (confirm(`Êtes-vous sûr de vouloir supprimer la salle "${name}" et tout son contenu ?`)) {
      deleteLocalRoom(roomId)
      loadData()
      toast.success(`Salle "${name}" supprimée`)
    }
  }

  const handleDeleteZone = (e: React.MouseEvent, zoneId: string, name: string) => {
    e.stopPropagation()
    if (confirm(`Supprimer la zone "${name}" et ses armoires ?`)) {
      deleteLocalZone(zoneId)
      loadData()
      toast.success(`Zone "${name}" supprimée`)
    }
  }

  const handleDeleteCabinet = (cabinetId: string, name: string) => {
    if (confirm(`Supprimer l'armoire "${name}" et ses étagères ?`)) {
      deleteLocalCabinet(cabinetId)
      loadData()
      toast.success(`Armoire "${name}" supprimée`)
    }
  }

  const handleDeleteShelf = (shelfId: string, name: string) => {
    if (confirm(`Supprimer l'étagère "${name}" ?`)) {
      deleteLocalShelf(shelfId)
      loadData()
      toast.success(`Étagère "${name}" supprimée`)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des Emplacements</h2>
          <p className="text-muted-foreground text-sm mt-1">Structure hiérarchique et taux d'occupation des échantillonthèques.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={loadData} className="gap-2"><RefreshCw className="h-4 w-4" /> Actualiser</Button>
          <AddRoomDialog onSuccess={loadData} />
          <AddZoneDialog rooms={rawRooms} onSuccess={loadData} />
          <AddCabinetDialog rooms={rawRooms} zones={rawZones} onSuccess={loadData} />
          <AddShelfDialog rooms={rawRooms} zones={rawZones} cabinets={rawCabinets} onSuccess={loadData} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg"><Building2 className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Salles</p><p className="text-2xl font-bold">{rawRooms.length}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Échantillons stockés</p><p className="text-2xl font-bold">{globalSamples}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Étagères pleines</p><p className="text-2xl font-bold text-amber-700">{globalFull}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Capacité totale définie</p>
              <p className="text-2xl font-bold">{globalCapacity > 0 ? globalCapacity : "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une salle, zone, armoire ou étagère..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground gap-3">
          <Loader2 className="h-6 w-6 animate-spin" /> Chargement de la structure...
        </div>
      ) : rooms.length === 0 ? (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Aucune salle configurée</p>
            <p className="text-sm">Commencez par créer une salle de stockage en cliquant sur "Ajouter une salle".</p>
          </CardContent>
        </Card>
      ) : (
        /* Room accordion */
        <Accordion className="space-y-4">
          {rooms
            .filter(room => !search || room.name.toLowerCase().includes(search.toLowerCase()) ||
              room.zones.some(z => z.name.toLowerCase().includes(search.toLowerCase()) ||
              z.cabinets.some(c => c.name.toLowerCase().includes(search.toLowerCase()) ||
              c.shelves.some(s => s.name.toLowerCase().includes(search.toLowerCase())))))
            .map(room => (
            <Card key={room.id} className="border-border/50 shadow-sm overflow-hidden">
              <AccordionItem value={room.id} className="border-none">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
                  <div className="flex items-center gap-4 flex-1 text-left">
                    <div className="bg-primary/10 p-2.5 rounded-xl">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base">{room.name}</h3>
                      {room.description && <p className="text-xs text-muted-foreground">{room.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 mr-4">
                      <Badge variant="outline" className="text-xs">{room.totalSamples} échantillons</Badge>
                      {room.fullShelves > 0 && <Badge variant="secondary" className="text-xs bg-red-50 text-red-700 border-red-200">{room.fullShelves} étagère{room.fullShelves > 1 ? 's' : ''} pleine{room.fullShelves > 1 ? 's' : ''}</Badge>}
                      <Badge variant="secondary" className="text-xs">{room.totalShelves} étagère{room.totalShelves !== 1 ? 's' : ''}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                        title="Supprimer la salle"
                        onClick={(e) => handleDeleteRoom(e, room.id, room.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-6 pb-4 space-y-4">
                    {room.zones.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucune zone dans cette salle. Ajoutez une zone pour commencer.</p>
                    ) : (
                      room.zones.map(zone => (
                        <div key={zone.id} className="border border-border/50 rounded-xl overflow-hidden">
                          <div className="bg-muted/30 px-4 py-2.5 flex items-center gap-2">
                            <Layers3 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-sm">{zone.name}</span>
                            <div className="ml-auto flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{zone.cabinets.length} armoire{zone.cabinets.length !== 1 ? 's' : ''}</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-red-600 rounded"
                                title="Supprimer la zone"
                                onClick={(e) => handleDeleteZone(e, zone.id, zone.name)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="divide-y divide-border/30">
                            {zone.cabinets.length === 0 ? (
                              <p className="text-xs text-muted-foreground p-3">Aucune armoire. Ajoutez une armoire dans cette zone.</p>
                            ) : (
                              zone.cabinets.map(cabinet => (
                                <div key={cabinet.id} className="p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Package className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium text-sm">{cabinet.name}</span>
                                    <div className="ml-auto flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">{cabinet.shelves.length} étagère{cabinet.shelves.length !== 1 ? 's' : ''}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-red-600 rounded"
                                        title="Supprimer l'armoire"
                                        onClick={() => handleDeleteCabinet(cabinet.id, cabinet.name)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-2 pl-6">
                                    {cabinet.shelves.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">Aucune étagère. Ajoutez une étagère dans cette armoire.</p>
                                    ) : (
                                      cabinet.shelves.map(shelf => (
                                        <div key={shelf.id} className={`flex items-center gap-3 p-2 rounded-lg ${shelf.is_full ? 'bg-red-50/60 dark:bg-red-950/20' : 'bg-background'}`}>
                                          <BookOpen className={`h-3.5 w-3.5 shrink-0 ${shelf.is_full ? 'text-red-500' : 'text-emerald-600'}`} />
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-sm font-medium">{shelf.name}</span>
                                              {shelf.is_full && <Lock className="h-3 w-3 text-red-500" />}
                                            </div>
                                            <ShelfOccupancyBar shelf={shelf} />
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-red-600 rounded opacity-60 hover:opacity-100"
                                            title="Supprimer l'étagère"
                                            onClick={() => handleDeleteShelf(shelf.id, shelf.name)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Card>
          ))}
        </Accordion>
      )}
    </div>
  )
}
