"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ClipboardCheck, AlertTriangle, CheckCircle2, Clock, Search, 
  Trash2, Plus, Eye, Scale, ArrowUpDown 
} from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

interface WasteInventoryItem {
  id: string
  batch_number: string
  commercial_name: string
  waste_type: string
  packaging?: string
  current_location?: string
  system_quantity: number
  physical_quantity: number | null
  discrepancy_reason?: string | null
}

interface WasteInventory {
  id: string
  inv_number: string
  name: string
  inventory_type: string
  location: string
  status: string
  created_at: string
  date?: string
  completed_at: string | null
  system_weight: number
  physical_weight: number
  diff: number
  items_count: number
  controller?: string
  observations?: string
  items: WasteInventoryItem[]
}

const MOCK_WASTE_INVENTORIES: WasteInventory[] = []

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'En cours':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1 shrink-0 whitespace-nowrap text-[10px]">
          <Clock className="h-3 w-3 shrink-0" />
          En cours
        </Badge>
      )
    case 'Validé':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 shrink-0 whitespace-nowrap text-[10px]">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Validé
        </Badge>
      )
    case 'Validé avec écart':
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1 shrink-0 whitespace-nowrap text-[10px]">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Validé avec écart
        </Badge>
      )
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>
  }
}

export default function WasteInventoryPage() {
  const [inventories, setInventories] = useState<WasteInventory[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const hasLoadedOnceRef = useRef(false)
  const supabase = createClient()

  const parseWasteInventoryRecord = (inv: any): WasteInventory => {
    let items: WasteInventoryItem[] = Array.isArray(inv.items) ? inv.items : []
    let completed_at: string | null = inv.completed_at || null
    let notes: string = inv.observations || ''

    if (typeof inv.observations === 'string' && inv.observations.trim().startsWith('{')) {
      try {
        const parsedObs = JSON.parse(inv.observations)
        if (Array.isArray(parsedObs.items)) items = parsedObs.items
        if (parsedObs.completed_at) completed_at = parsedObs.completed_at
        if (parsedObs.notes) notes = parsedObs.notes
      } catch (e) {}
    }

    const sysWeight = inv.system_weight !== undefined 
      ? Number(inv.system_weight) 
      : items.reduce((sum, it) => sum + (Number(it.system_quantity) || 0), 0)

    const physWeight = inv.physical_weight !== undefined 
      ? Number(inv.physical_weight) 
      : items.reduce((sum, it) => sum + (it.physical_quantity !== null ? Number(it.physical_quantity) : Number(it.system_quantity) || 0), 0)

    const diff = inv.diff !== undefined 
      ? Number(inv.diff) 
      : Math.round((physWeight - sysWeight) * 100) / 100

    return {
      id: inv.id || inv.inv_number,
      inv_number: inv.inv_number || inv.id || 'INV-W-2026',
      name: inv.name || inv.inv_number || 'Session d\'inventaire déchet',
      inventory_type: inv.inventory_type || 'Périodique',
      location: inv.location || 'MAGASIN DES DECHETS',
      status: inv.status || 'En cours',
      created_at: inv.created_at || inv.date || new Date().toISOString(),
      date: inv.date || inv.created_at || new Date().toISOString(),
      completed_at,
      system_weight: Math.round(sysWeight * 100) / 100,
      physical_weight: Math.round(physWeight * 100) / 100,
      diff,
      items_count: Number(inv.items_count) || items.length,
      controller: inv.controller || 'Admin EGED',
      observations: notes,
      items,
    }
  }

  const fetchWasteInventories = useCallback(async () => {
    const isWiped = typeof window !== 'undefined' && localStorage.getItem('all_data_wiped') === 'true'

    let localList: WasteInventory[] = []
    try {
      const stored = localStorage.getItem('waste_inventories_custom_v1')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          localList = parsed.map(parseWasteInventoryRecord)
          if (!hasLoadedOnceRef.current && localList.length > 0) {
            setInventories(localList)
            hasLoadedOnceRef.current = true
          }
        }
      }
    } catch (e) {}

    let remoteList: WasteInventory[] = []
    try {
      const { data, error } = await supabase
        .from('inventories')
        .select('*')
        .like('inv_number', 'INV-W-%')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        remoteList = data.map(parseWasteInventoryRecord)
      }
    } catch (e) {
      console.warn("Supabase fetch waste inventories notice:", e)
    }

    const invMap = new Map<string, WasteInventory>()
    localList.forEach((inv) => invMap.set(inv.id, inv))
    remoteList.forEach((inv) => {
      const existing = invMap.get(inv.id)
      invMap.set(inv.id, {
        ...existing,
        ...inv,
        status: existing?.status === 'Validé' || inv.status === 'Validé' ? 'Validé' : inv.status,
        items: inv.items && inv.items.length > 0 ? inv.items : (existing?.items || []),
      })
    })

    const merged = Array.from(invMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    hasLoadedOnceRef.current = true
    setInventories(merged.length > 0 ? merged : (isWiped ? [] : MOCK_WASTE_INVENTORIES))
  }, [supabase])

  useEffect(() => {
    fetchWasteInventories()
  }, [fetchWasteInventories])

  useRealtimeSync({
    tables: ['inventories', 'waste_batches'],
    onSync: fetchWasteInventories,
    pollIntervalMs: 6000,
  })

  const total = inventories.length
  const inProgress = inventories.filter((i) => i.status === 'En cours').length
  const validated = inventories.filter((i) => i.status === 'Validé' || i.status === 'Validé avec écart').length
  const allItems = inventories.flatMap((i) => i.items ?? [])
  const discrepancyItemsCount = allItems.filter(
    (item) => item.physical_quantity !== null && item.system_quantity !== item.physical_quantity
  ).length
  const totalDiffKg = inventories.reduce((sum, inv) => sum + (inv.diff || 0), 0)

  const filteredInventories = inventories.filter((inv) => {
    const matchesSearch = 
      (inv.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.inv_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.location || '').toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Scale className="h-5 w-5 text-red-600" />
            Inventaires & Contrôles des Déchets
          </h2>
          <p className="text-muted-foreground text-xs">Contrôle physique périodique des stocks de déchets, pesée contradictoire et traçabilité des écarts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs font-bold gap-1.5 h-8 px-3"
            onClick={async () => {
              if (window.confirm("Êtes-vous sûr de vouloir effacer l'historique des sessions d'inventaire déchet ?")) {
                localStorage.removeItem('waste_inventories_custom_v1')
                try {
                  await supabase.from('inventories').delete().like('inv_number', 'INV-W-%')
                } catch (e) {}
                setInventories([])
                toast.success("Sessions d'inventaires déchets réinitialisées avec succès.")
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" /> Effacer inventaires
          </Button>
          <Button asChild size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-2xs text-xs font-bold gap-1.5 h-8 px-3 border-0">
            <Link href="/dashboard/waste/inventory/new">
              <Plus className="h-3.5 w-3.5" /> Démarrer un inventaire déchet
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIS COMPACTS SANS SCROLL */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600"><ClipboardCheck className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total Inventaires Déchets</p>
              <h3 className="text-xl font-black text-foreground">{total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><Clock className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">En cours</p>
              <h3 className="text-xl font-black text-foreground">{inProgress}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Validés</p>
              <h3 className="text-xl font-black text-foreground">{validated}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${totalDiffKg === 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Écarts Relevés</p>
              <h3 className={`text-xl font-black ${totalDiffKg === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {discrepancyItemsCount > 0 ? `${discrepancyItemsCount} lot(s)` : `${totalDiffKg > 0 ? `+${totalDiffKg}` : totalDiffKg} Kg`}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLEAU DES INVENTAIRES DÉCHETS */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-red-600" /> Registre des Sessions d'Inventaire des Déchets ({filteredInventories.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, réf..."
                  className="pl-8 bg-background h-8 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="h-8 w-36 text-xs bg-background">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="Validé">Validé</SelectItem>
                  <SelectItem value="Validé avec écart">Validé avec écart</SelectItem>
                  <SelectItem value="En cours">En cours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="py-2 text-[11px] font-bold uppercase pl-4">Nom de la session / N°</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Type</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Zone Déchet</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Statut</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Date Début</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Date Clôture</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Lots Contrôlés</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Masse SI / Pesée (Écart)</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground font-medium">
                      Aucune session d'inventaire déchet trouvée.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventories.map((inv) => {
                    const itemCount = inv.items?.length || inv.items_count || 0
                    const discrepancies = (inv.items ?? []).filter(
                      (item) => item.physical_quantity !== null && item.system_quantity !== item.physical_quantity
                    ).length

                    return (
                      <TableRow key={inv.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="pl-4 py-2">
                          <div className="font-bold text-foreground">{inv.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{inv.inv_number}</div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[10px] bg-background">{inv.inventory_type}</Badge>
                        </TableCell>
                        <TableCell className="py-2 font-medium">{inv.location}</TableCell>
                        <TableCell className="py-2">{getStatusBadge(inv.status)}</TableCell>
                        <TableCell className="py-2 text-muted-foreground">{formatDate(inv.created_at)}</TableCell>
                        <TableCell className="py-2 text-muted-foreground">{formatDate(inv.completed_at)}</TableCell>
                        <TableCell className="py-2 font-medium">
                          {itemCount} lot(s) {discrepancies > 0 && <span className="text-red-600 font-bold ml-1">({discrepancies} écart)</span>}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                          <span className="text-muted-foreground">{inv.system_weight} Kg</span> / <span className="font-bold text-foreground">{inv.physical_weight} Kg</span>
                          <span className={`ml-1.5 font-bold ${inv.diff === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            ({inv.diff > 0 ? `+${inv.diff}` : inv.diff} Kg)
                          </span>
                        </TableCell>
                        <TableCell className="py-2 text-right pr-4">
                          <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2 text-red-600 font-bold hover:bg-red-50">
                            <Link href={`/dashboard/waste/inventory/${inv.id}`}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Consulter
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
