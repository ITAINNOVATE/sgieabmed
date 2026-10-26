"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building2, MapPin, AlertTriangle } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { WasteLocationDialog } from "@/components/waste-location-dialog"
import { WASTE_STORE_NAME, WASTE_ZONES, normalizeWasteLocation } from "@/utils/waste-locations"
import { syncLocalAndCloudPackages } from "@/utils/waste-packages-sync"

type LocatedItem = {
  id: string
  batch_number: string
  waste_type: string
  commercial_name?: string
  quantity: number
  unit: string
  current_location: string
  status?: string
  isPackage: boolean
  itemsCount?: number
  isUnlocated: boolean
  zoneLocation: string | null
}

const isUnlocatedLabel = (loc?: string | null) =>
  !loc || /localiser|non d[ée]fini/i.test(loc)

export default function WasteLocationsPage() {
  const [items, setItems] = useState<LocatedItem[]>([])
  const [activeZone, setActiveZone] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [locationTarget, setLocationTarget] = useState<LocatedItem | null>(null)
  const [isLocationOpen, setIsLocationOpen] = useState(false)

  const fetchData = useCallback(async () => {
    // Colis groupés (Synchronisation temps réel Cloud + Local)
    let packages: any[] = []
    try {
      packages = JSON.parse(localStorage.getItem("waste_grouped_packages_v1") || "[]")
    } catch {}

    try {
      packages = await syncLocalAndCloudPackages(packages)
    } catch (e) {
      console.warn("Erreur syncLocalAndCloudPackages locations:", e)
    }

    // Lots en détail (local + cloud)
    let localBatches: any[] = []
    try {
      localBatches = JSON.parse(localStorage.getItem("waste_batches_custom_v1") || "[]")
    } catch {}
    let remoteBatches: any[] = []
    try {
      const supabase = createClient()
      const { data } = await supabase.from("waste_batches").select("*")
      if (Array.isArray(data)) remoteBatches = data
    } catch {}

    const map = new Map<string, any>()
    ;[...localBatches, ...remoteBatches].forEach((b) => {
      const key = b.batch_number || b.id
      if (key) map.set(key, b)
    })

    const groupedIds = new Set<string>(packages.flatMap((p) => p.item_ids || []))

    const looseItems: LocatedItem[] = Array.from(map.values())
      .filter((b) => b.status !== "Détruit" && !groupedIds.has(b.id) && !b.grouped_package_id)
      .map((b) => {
        const unlocated = isUnlocatedLabel(b.current_location)
        return {
          id: b.id,
          batch_number: b.batch_number,
          waste_type: b.waste_type || "Déchet pharmaceutique",
          commercial_name: b.commercial_name,
          quantity: Number(b.quantity) || 0,
          unit: b.unit || "Kg",
          current_location: b.current_location || "",
          status: b.status,
          isPackage: false,
          isUnlocated: unlocated,
          zoneLocation: unlocated ? null : normalizeWasteLocation(b.current_location, b.waste_type),
        }
      })

    const packageItems: LocatedItem[] = packages.map((p) => ({
      id: p.id,
      batch_number: p.package_number,
      waste_type: p.package_type,
      quantity: Number(p.total_weight) || 0,
      unit: p.unit || "Kg",
      current_location: p.current_location || "",
      status: p.status,
      isPackage: true,
      itemsCount: p.items?.length || p.item_ids?.length || 0,
      isUnlocated: false,
      zoneLocation: normalizeWasteLocation(p.current_location, p.package_type),
    }))

    setItems([...packageItems, ...looseItems])
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtimeSync({
    tables: ["waste_batches", "waste_movements"],
    onSync: fetchData,
    pollIntervalMs: 3000,
  })

  const totalStoreWeightKg = useMemo(
    () => Math.round(items.reduce((s, i) => s + (Number(i.quantity) || 0), 0) * 100) / 100,
    [items]
  )
  const MAX_STORE_CAPACITY_KG = 45000 // 45 Tonnes
  const rawOccupancyRate = (totalStoreWeightKg / MAX_STORE_CAPACITY_KG) * 100
  const occupancyRatePct = totalStoreWeightKg > 0 
    ? (rawOccupancyRate < 0.01 ? "< 0.01" : (rawOccupancyRate < 1 ? rawOccupancyRate.toFixed(2) : rawOccupancyRate.toFixed(1)))
    : "0"

  const zoneStats = useMemo(
    () =>
      WASTE_ZONES.map((z) => {
        const inZone = items.filter((i) => i.zoneLocation === z.fullLocation)
        return {
          zone: z,
          count: inZone.length,
          packages: inZone.filter((i) => i.isPackage).length,
          weight: Math.round(inZone.reduce((s, i) => s + i.quantity, 0) * 100) / 100,
        }
      }),
    [items]
  )

  const unlocatedCount = items.filter((i) => i.isUnlocated).length

  const filtered = useMemo(() => {
    let list = items
    if (activeZone === "unlocated") list = list.filter((i) => i.isUnlocated)
    else if (activeZone !== "all") list = list.filter((i) => i.zoneLocation === activeZone)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (i) =>
          i.batch_number?.toLowerCase().includes(q) ||
          i.waste_type?.toLowerCase().includes(q) ||
          i.commercial_name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [items, activeZone, search])

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* EN-TÊTE */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Localisation des Déchets</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Magasin unique et zones réglementaires d&apos;orientation des déchets pharmaceutiques.
        </p>
      </div>

      {/* MAGASIN UNIQUE */}
      <Card className="rounded-xl border border-red-200 bg-red-50/40 dark:bg-red-950/20 shadow-2xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-700">Magasin unique officiel</div>
              <div className="text-lg font-black text-red-950 dark:text-red-200">{WASTE_STORE_NAME}</div>
              <div className="text-xs text-muted-foreground">
                Capacité totale réglementaire : <strong className="text-foreground">45 Tonnes</strong> (45 000 kg)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 md:gap-8">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Poids Total Stocké</div>
              <div className="text-base font-black text-foreground">{totalStoreWeightKg.toLocaleString('fr-FR')} kg</div>
              <div className="text-[10px] text-muted-foreground font-semibold">{(totalStoreWeightKg / 1000).toFixed(3)} Tonnes</div>
            </div>

            <div className="min-w-[130px]">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Taux de stockage (sur 45T)</div>
              <div className="text-base font-black text-[#1E88E5]">{occupancyRatePct} %</div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${rawOccupancyRate >= 85 ? 'bg-red-600' : (rawOccupancyRate >= 70 ? 'bg-amber-500' : 'bg-[#1E88E5]')}`}
                  style={{ width: `${Math.min(Math.max(rawOccupancyRate, totalStoreWeightKg > 0 ? 1 : 0), 100)}%` }}
                />
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Contenus en stock</div>
              <div className="font-black text-foreground text-base">{items.length}</div>
              <div className="text-[10px] text-muted-foreground">lots & colis</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LES 3 ZONES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {zoneStats.map(({ zone, count, packages, weight }) => {
          const isActive = activeZone === zone.fullLocation
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => setActiveZone(isActive ? "all" : zone.fullLocation)}
              className={`text-left rounded-xl border p-4 transition-all cursor-pointer bg-card ${
                isActive ? "border-red-600 ring-1 ring-red-600 shadow-xs" : "border-border/70 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-foreground">{zone.zoneName}</span>
                <Badge variant="outline" className={`text-[10px] font-bold ${zone.badgeColor}`}>
                  {zone.shortCode}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug min-h-[30px]">{zone.description}</p>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/60">
                <div>
                  <div className="text-lg font-black text-foreground">{count}</div>
                  <div className="text-[10px] text-muted-foreground">Total</div>
                </div>
                <div>
                  <div className="text-lg font-black text-purple-700">{packages}</div>
                  <div className="text-[10px] text-muted-foreground">Colis</div>
                </div>
                <div>
                  <div className="text-lg font-black text-emerald-700">{weight}</div>
                  <div className="text-[10px] text-muted-foreground">Kg</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {unlocatedCount > 0 && (
        <button
          type="button"
          onClick={() => setActiveZone(activeZone === "unlocated" ? "all" : "unlocated")}
          className="w-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-left cursor-pointer hover:bg-amber-100/60"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <span className="text-sm font-bold text-amber-900">
            {unlocatedCount} lot{unlocatedCount > 1 ? "s" : ""} en attente d&apos;orientation — cliquez pour les afficher
          </span>
        </button>
      )}

      {/* LISTE */}
      <Card className="rounded-xl border border-border/60 overflow-hidden shadow-2xs">
        <CardHeader className="p-3.5 flex flex-row items-center justify-between gap-3 border-b">
          <div className="text-sm font-bold text-foreground">
            {activeZone === "all"
              ? "Tous les emplacements"
              : activeZone === "unlocated"
              ? "Lots à orienter"
              : activeZone}
            <span className="text-muted-foreground font-normal"> ({filtered.length})</span>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="h-8 text-xs w-56"
          />
        </CardHeader>
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-bold h-9">Référence</TableHead>
              <TableHead className="text-xs font-bold h-9">Nature</TableHead>
              <TableHead className="text-xs font-bold h-9">Classification</TableHead>
              <TableHead className="text-xs font-bold h-9 text-right">Poids</TableHead>
              <TableHead className="text-xs font-bold h-9">Zone</TableHead>
              <TableHead className="text-xs font-bold h-9 text-right pr-4">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                  Aucun déchet dans cette zone.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((i) => {
                const zone = WASTE_ZONES.find((z) => z.fullLocation === i.zoneLocation)
                return (
                  <TableRow key={`${i.isPackage ? "pkg" : "lot"}-${i.id}`} className="text-xs">
                    <TableCell className="font-mono font-bold text-red-700">{i.batch_number}</TableCell>
                    <TableCell>
                      {i.isPackage ? (
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                          Colis ({i.itemsCount} lots)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Lot en détail</Badge>
                      )}
                    </TableCell>
                    <TableCell className="truncate max-w-[220px]">{i.commercial_name || i.waste_type}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {i.quantity} {i.unit}
                    </TableCell>
                    <TableCell>
                      {zone ? (
                        <Badge variant="outline" className={`text-[10px] font-bold ${zone.badgeColor}`}>
                          {zone.zoneName}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                          À orienter
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 cursor-pointer"
                        onClick={() => {
                          setLocationTarget(i)
                          setIsLocationOpen(true)
                        }}
                      >
                        <MapPin className="h-3.5 w-3.5 text-red-600" />
                        {zone ? "Réorienter" : "Orienter"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <WasteLocationDialog
        open={isLocationOpen}
        onOpenChange={setIsLocationOpen}
        batch={locationTarget}
        onSuccess={() => fetchData()}
      />
    </div>
  )
}
