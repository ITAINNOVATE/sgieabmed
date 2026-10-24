"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
} from "@tanstack/react-table"
import { 
  ArrowUpDown, MoreHorizontal, Download, FileText, Plus, Search, 
  Eye, Edit, Trash, Trash2, History, Printer, MapPin, Flame, 
  Package, Boxes, Scale, ShieldAlert, CheckCircle2, AlertTriangle, Layers
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { exportToExcel, exportToPDF, exportWasteReceptionSlipPDF } from "@/utils/exportUtils"
import { Checkbox } from "@/components/ui/checkbox"
import { LabelPrintDialog } from "@/components/label-print-dialog"
import { WasteLocationDialog } from "@/components/waste-location-dialog"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

export type WasteStockItem = {
  id: string
  batch_number: string
  reception_number?: string
  reception_date?: string
  source_structure: string
  source_type?: string
  depositor_name?: string
  depositor_phone?: string
  waste_type: string
  commercial_name?: string
  original_batch?: string
  sample_id?: string | null
  quantity: number
  unit: string
  packaging?: string
  packaging_condition?: string
  destruction_motive?: string
  current_location: string
  status: string
  observations?: string
  destruction_plan_ref?: string
  created_at?: string
}

export const columns: ColumnDef<WasteStockItem>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Sélectionner tout"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Sélectionner la ligne"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "batch_number",
    header: "N° Lot Déchet",
    cell: ({ row }) => (
      <div className="font-bold text-xs text-foreground font-mono flex items-center gap-1.5">
        <Boxes className="h-3.5 w-3.5 text-red-600 shrink-0" />
        <span>{row.getValue("batch_number")}</span>
      </div>
    ),
  },
  {
    accessorKey: "waste_type",
    header: ({ column }) => (
      <Button 
        variant="ghost" 
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
        className="-ml-3 text-xs p-1 h-auto font-semibold hover:bg-transparent"
      >
        Classification & Produit <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col min-w-[150px]">
        <span className="font-bold text-xs text-foreground leading-tight">{row.original.waste_type}</span>
        <span className="text-[11px] text-muted-foreground leading-tight truncate max-w-[200px]">
          {row.original.commercial_name ? `${row.original.commercial_name} (Lot: ${row.original.original_batch || '—'})` : (row.original.destruction_motive || "Péremption")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "source_structure",
    header: "Provenance / Structure",
    cell: ({ row }) => (
      <div className="flex flex-col min-w-[130px]">
        <span className="font-medium text-xs text-foreground truncate max-w-[170px]">{row.original.source_structure || "Interne ABMed"}</span>
        {row.original.depositor_name && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[170px]">Apporteur : {row.original.depositor_name}</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => (
      <Button 
        variant="ghost" 
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
        className="-ml-3 text-xs p-1 h-auto font-semibold hover:bg-transparent text-right"
      >
        Quantité / Poids <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-bold text-xs tabular-nums text-foreground">
        {row.original.quantity} <span className="text-[11px] font-medium text-muted-foreground">{row.original.unit || "Kg"}</span>
      </div>
    ),
  },
  {
    accessorKey: "packaging",
    header: "Conditionnement",
    cell: ({ row }) => (
      <span className="text-[11px] text-muted-foreground truncate max-w-[130px] block">
        {row.original.packaging || "Carton scellé"}
      </span>
    ),
  },
  {
    accessorKey: "current_location",
    header: "Emplacement",
    cell: ({ row, table }) => {
      const loc = row.getValue("current_location") as string
      const meta = table.options.meta as any
      const isUnassigned = !loc || loc.toLowerCase().includes("non") || loc.toLowerCase().includes("localiser")
      return (
        <button 
          onClick={() => meta?.onAssignLocation(row.original)}
          className="text-left group cursor-pointer"
          title="Cliquer pour modifier l'emplacement"
        >
          {isUnassigned ? (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold gap-1 hover:bg-amber-100">
              <AlertTriangle className="h-3 w-3" /> À localiser
            </Badge>
          ) : (
            <div className="font-mono text-[11px] text-muted-foreground group-hover:text-red-600 transition-colors truncate max-w-[150px] flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400 group-hover:text-red-600 shrink-0" />
              <span>{loc}</span>
            </div>
          )}
        </button>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const status = (row.getValue("status") as string) || "Déclaré"
      let badgeStyle = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
      if (status === "En attente de destruction") {
        badgeStyle = "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
      } else if (status === "Détruit") {
        badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
      } else if (status === "Quarantaine") {
        badgeStyle = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
      } else if (status === "Validé") {
        badgeStyle = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"
      }
      return (
        <Badge variant="outline" className={`text-[10px] font-semibold ${badgeStyle}`}>
          {status}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="text-right block pr-2">Actions</span>,
    cell: ({ row, table }) => {
      const item = row.original
      const meta = table.options.meta as any
      return (
        <div className="text-right pr-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-muted cursor-pointer">
                <span className="sr-only">Actions</span>
                <MoreHorizontal className="h-4 w-4 text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Actions Lot Déchet
              </div>
              <DropdownMenuItem asChild className="cursor-pointer text-xs">
                <Link href={`/dashboard/waste/${item.id}`}>
                  <Eye className="mr-2 h-3.5 w-3.5 text-blue-600" /> Voir la fiche détaillée
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => meta?.onAssignLocation(item)}>
                <MapPin className="mr-2 h-3.5 w-3.5 text-orange-500" /> Assigner / Déplacer
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => meta?.onPrintLabel(item)}>
                <Printer className="mr-2 h-3.5 w-3.5 text-slate-700" /> Imprimer étiquette déchet
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer text-xs">
                <Link href="/dashboard/waste/movements">
                  <History className="mr-2 h-3.5 w-3.5 text-purple-600" /> Historique des mouvements
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer text-xs text-red-600 font-medium">
                <Link href={`/dashboard/destructions/new?batch=${encodeURIComponent(item.batch_number)}`}>
                  <Flame className="mr-2 h-3.5 w-3.5 text-red-600" /> Planifier pour destruction
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer text-xs"
                onClick={() => {
                  exportWasteReceptionSlipPDF({
                    reception_number: item.reception_number || `BORD-${item.batch_number}`,
                    reception_date: item.reception_date ? new Date(item.reception_date).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR"),
                    reception_time: "08:00",
                    delivery_slip_ref: "N/A",
                    recipient_agent: "Marie ADANDE",
                    source_structure: item.source_structure || "Interne ABMed",
                    source_type: item.source_type || "Établissement Pharmaceutique",
                    city: "Cotonou",
                    depositor_name: item.depositor_name || "N/A",
                    depositor_phone: item.depositor_phone || "N/A",
                    depositor_id_card: "N/A",
                    general_observations: item.observations || "Lot réceptionné au local déchet.",
                    items: [
                      {
                        batch_number: item.batch_number,
                        waste_type: item.waste_type,
                        commercial_name: item.commercial_name || item.waste_type,
                        original_batch: item.original_batch || "-",
                        quantity: Number(item.quantity) || 0,
                        unit: item.unit || "Kg",
                        packaging: item.packaging || "Carton scellé",
                        location: item.current_location || "Magasin Déchets",
                        observations: item.observations || "Péremption"
                      }
                    ]
                  })
                  toast.success(`Attestation de réception ${item.batch_number} téléchargée`)
                }}
              >
                <Download className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Télécharger attestation (PDF)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs" 
                onClick={() => {
                  if (window.confirm(`Êtes-vous sûr de vouloir supprimer le lot de déchet ${item.batch_number} du stock ?`)) {
                    meta?.onDeleteBatch?.(item)
                  }
                }}
              >
                <Trash className="mr-2 h-3.5 w-3.5" /> Supprimer du stock
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]

export default function WasteStockPage() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [data, setData] = useState<WasteStockItem[]>([])
  const [loading, setLoading] = useState(false)
  const [globalSearch, setGlobalSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [rowSelection, setRowSelection] = useState({})
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printDialogItems, setPrintDialogItems] = useState<WasteStockItem[]>([])
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false)
  const [locationBatch, setLocationBatch] = useState<WasteStockItem | null>(null)
  const hasLoadedOnceRef = useRef(false)

  const fetchData = useCallback(async () => {
    let localBatches: WasteStockItem[] = []
    try {
      const stored = localStorage.getItem("waste_batches_custom_v1")
      if (stored) {
        localBatches = JSON.parse(stored)
      }
    } catch (e) {}

    let remoteBatches: WasteStockItem[] = []
    try {
      const supabase = createClient()
      const { data: sData } = await supabase
        .from("waste_batches")
        .select("*")
        .order("created_at", { ascending: false })
      if (sData && sData.length > 0) {
        remoteBatches = sData
      }
    } catch (e) {
      console.warn("Supabase fetch waste_batches notice:", e)
    }

    const batchMap = new Map<string, WasteStockItem>()
    localBatches.forEach((b) => {
      const key = b.batch_number || b.id
      if (key) batchMap.set(key, b)
    })
    remoteBatches.forEach((b) => {
      const key = b.batch_number || b.id
      if (key) batchMap.set(key, b)
    })

    const finalBatches = Array.from(batchMap.values())
    setData(finalBatches)
    setLoading(false)
    hasLoadedOnceRef.current = true
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Synchronisation temps réel pour le stock de déchets
  useRealtimeSync({
    tables: ["waste_batches", "waste_movements", "destruction_plans"],
    onSync: fetchData,
    pollIntervalMs: 6000,
  })

  // Filtrage combiné (Recherche textuelle + Statut + Type de déchet)
  const filteredData = useMemo(() => {
    let list = data

    if (statusFilter !== "all") {
      list = list.filter((item) => {
        if (statusFilter === "a_localiser") {
          return !item.current_location || item.current_location.toLowerCase().includes("non") || item.current_location.toLowerCase().includes("localiser")
        }
        return item.status === statusFilter
      })
    }

    if (typeFilter !== "all") {
      list = list.filter((item) => item.waste_type === typeFilter)
    }

    if (globalSearch.trim() !== "") {
      const q = globalSearch.toUpperCase()
      list = list.filter((item) =>
        (item.batch_number || "").toUpperCase().includes(q) ||
        (item.waste_type || "").toUpperCase().includes(q) ||
        (item.commercial_name || "").toUpperCase().includes(q) ||
        (item.source_structure || "").toUpperCase().includes(q) ||
        (item.depositor_name || "").toUpperCase().includes(q) ||
        (item.current_location || "").toUpperCase().includes(q) ||
        (item.destruction_motive || "").toUpperCase().includes(q)
      )
    }

    return list
  }, [data, globalSearch, statusFilter, typeFilter])

  // Statistiques KPIs
  const totalWeightKg = useMemo(() => {
    return data.reduce((acc, curr) => {
      const qty = Number(curr.quantity) || 0
      return acc + (curr.unit === "Kg" || curr.unit === "kg" ? qty : qty * 0.8)
    }, 0)
  }, [data])

  const unlocatedCount = useMemo(() => {
    return data.filter(
      (b) => !b.current_location || b.current_location.toLowerCase().includes("non") || b.current_location.toLowerCase().includes("localiser")
    ).length
  }, [data])

  const quarantineCount = useMemo(() => {
    return data.filter((b) => b.status === "Quarantaine" || (b.current_location && b.current_location.toLowerCase().includes("quarantaine"))).length
  }, [data])

  const readyForDestructionCount = useMemo(() => {
    return data.filter((b) => b.status === "En attente de destruction" || b.status === "Déclaré").length
  }, [data])

  // Déduplication des types pour le filtre
  const uniqueWasteTypes = useMemo(() => {
    const set = new Set<string>()
    data.forEach((b) => {
      if (b.waste_type) set.add(b.waste_type)
    })
    return Array.from(set)
  }, [data])

  const tableMeta = useMemo(() => ({
    onPrintLabel: (batch: WasteStockItem) => {
      setPrintDialogItems([batch])
      setIsPrintDialogOpen(true)
    },
    onAssignLocation: (batch: WasteStockItem) => {
      setLocationBatch(batch)
      setIsLocationDialogOpen(true)
    },
    onDeleteBatch: async (batch: WasteStockItem) => {
      setData((prev) => prev.filter((b) => b.id !== batch.id && b.batch_number !== batch.batch_number))
      toast.success(`Lot de déchet ${batch.batch_number} retiré du stock.`)

      try {
        const stored = localStorage.getItem("waste_batches_custom_v1")
        if (stored) {
          const list: WasteStockItem[] = JSON.parse(stored)
          const updated = list.filter((b) => b.id !== batch.id && b.batch_number !== batch.batch_number)
          localStorage.setItem("waste_batches_custom_v1", JSON.stringify(updated))
        }
      } catch (e) {}

      try {
        const supabase = createClient()
        await supabase.from("waste_batches").delete().or(`id.eq.${batch.id},batch_number.eq.${batch.batch_number}`)
      } catch (e) {}
    },
  }), [])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, rowSelection },
    meta: tableMeta,
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedItems = selectedRows.map((row) => row.original)

  const handleExportExcel = () => {
    if (data.length === 0) {
      toast.warning("Aucun lot de déchet à exporter.")
      return
    }
    const excelData = data.map((item) => ({
      "N° Lot Déchet": item.batch_number,
      "Classification": item.waste_type,
      "Désignation / Produit": item.commercial_name || "—",
      "Provenance / Structure": item.source_structure || "Interne ABMed",
      "Apporteur": item.depositor_name || "—",
      "Quantité": item.quantity,
      "Unité": item.unit || "Kg",
      "Conditionnement": item.packaging || "Carton",
      "Emplacement": item.current_location || "Non défini",
      "Statut": item.status,
      "Motif": item.destruction_motive || "Péremption",
    }))

    exportToExcel(
      excelData,
      ["N° Lot Déchet", "Classification", "Désignation / Produit", "Provenance / Structure", "Apporteur", "Quantité", "Unité", "Conditionnement", "Emplacement", "Statut", "Motif"],
      "stock_dechets_pharmaceutiques"
    )
    toast.success("Registre Excel du stock déchets exporté avec succès !")
  }

  const handleExportPDF = () => {
    if (data.length === 0) {
      toast.warning("Aucun lot de déchet à exporter.")
      return
    }
    const headers = ["N° Lot Déchet", "Classification", "Provenance", "Quantité", "Emplacement", "Statut"]
    const rows = data.map((item) => [
      item.batch_number,
      item.waste_type,
      item.source_structure || "Interne",
      `${item.quantity} ${item.unit || "Kg"}`,
      item.current_location || "Non défini",
      item.status,
    ])

    exportToPDF("ABMed — Registre Officiel du Stock des Déchets Pharmaceutiques", headers, rows, "stock_dechets_pharmaceutiques")
    toast.success("Rapport PDF du stock déchets généré avec succès !")
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* ALERTE CONTEXTUELLE SI LOTS NON LOCALISÉS */}
      {unlocatedCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 shadow-2xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {unlocatedCount} lot{unlocatedCount > 1 ? "s" : ""} de déchet en attente d'assignation d'emplacement
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Cliquez sur le badge <strong>« À localiser »</strong> ou utilisez le menu ⋯ pour définir la zone de stockage dans le magasin déchet.
            </p>
          </div>
        </div>
      )}

      {/* EN-TÊTE DE PAGE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/10 text-red-600">
              <Boxes className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Stock des Déchets Pharmaceutiques</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gestion complète du stock, cartographie des fûts/bacs, traçabilité et préparation à l'incinération.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-600" />
            Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="h-8 text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-red-600" />
            PDF
          </Button>

          <Button
            size="sm"
            asChild
            className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5 cursor-pointer shadow-xs"
          >
            <Link href="/dashboard/waste/new">
              <Plus className="h-4 w-4" />
              Nouvelle Réception Déchet
            </Link>
          </Button>
        </div>
      </div>

      {/* CARTES KPIS DE SYNTHÈSE DU STOCK DÉCHETS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="rounded-xl border border-border/60 shadow-2xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Lots en Stock</span>
            <Boxes className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-black text-foreground">{data.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Lots enregistrés actifs</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/60 shadow-2xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Masse Totale Estimée</span>
            <Scale className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-black text-foreground">
              {Math.round(totalWeightKg).toLocaleString("fr-FR")} <span className="text-xs font-normal text-muted-foreground">Kg</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Poids global cumulé</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/60 shadow-2xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">En Quarantaine</span>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400">{quarantineCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">En attente de validation/tri</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/60 shadow-2xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Prêts pour Destruction</span>
            <Flame className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-black text-purple-700 dark:text-purple-400">{readyForDestructionCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Disponibles pour plan d'incinération</p>
          </CardContent>
        </Card>
      </div>

      {/* BARRE DE FILTRES ET D'ACTIONS GROUPÉES */}
      <Card className="rounded-xl border border-border/60 shadow-2xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher par N° lot, type, produit, provenance, localisation..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-8 text-xs h-8.5 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="text-xs h-8.5 w-40 rounded-lg">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Tous les statuts</SelectItem>
                  <SelectItem value="Déclaré" className="text-xs">Déclaré (En stock)</SelectItem>
                  <SelectItem value="Quarantaine" className="text-xs">Quarantaine</SelectItem>
                  <SelectItem value="En attente de destruction" className="text-xs">En attente de destruction</SelectItem>
                  <SelectItem value="Détruit" className="text-xs">Détruit</SelectItem>
                  <SelectItem value="a_localiser" className="text-xs">⚠️ À localiser</SelectItem>
                </SelectContent>
              </Select>

              {uniqueWasteTypes.length > 0 && (
                <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
                  <SelectTrigger className="text-xs h-8.5 w-48 rounded-lg truncate">
                    <SelectValue placeholder="Toutes les classifications" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Toutes classifications</SelectItem>
                    {uniqueWasteTypes.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* BANDEAU D'ACTIONS SUR SÉLECTION MULTIPLE */}
          {selectedItems.length > 0 && (
            <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-2.5 px-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-600 text-white text-[11px] font-bold">
                  {selectedItems.length} lot{selectedItems.length > 1 ? "s" : ""} sélectionné{selectedItems.length > 1 ? "s" : ""}
                </Badge>
                <span className="text-xs text-muted-foreground hidden sm:inline">Actions groupées sur les déchets :</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPrintDialogItems(selectedItems)
                    setIsPrintDialogOpen(true)
                  }}
                  className="h-7 text-xs font-semibold gap-1 bg-white hover:bg-muted text-foreground border-red-200"
                >
                  <Printer className="h-3 w-3 text-slate-700" />
                  Imprimer {selectedItems.length} étiquette{selectedItems.length > 1 ? "s" : ""}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-7 text-xs font-semibold gap-1 bg-white hover:bg-muted text-red-600 border-red-200"
                >
                  <Link href={`/dashboard/destructions/new?batches=${selectedItems.map((s) => s.batch_number).join(",")}`}>
                    <Flame className="h-3 w-3 text-red-600" />
                    Créer plan de destruction
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TABLEAU DES STOCKS DÉCHETS (TANSTACK REACT TABLE) */}
      <Card className="rounded-xl border border-border/60 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/30 transition-colors text-xs"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-xs text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Boxes className="h-8 w-8 text-muted-foreground/40" />
                      <p className="font-semibold text-foreground">Aucun lot de déchet trouvé dans le stock</p>
                      <p className="text-[11px]">Enregistrez une réception ou ajustez les critères de recherche.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between p-3 border-t border-border/50 text-xs text-muted-foreground bg-muted/10">
          <div>
            Affichage de {table.getRowModel().rows.length} sur {filteredData.length} lot{filteredData.length > 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-7 text-xs px-2.5"
            >
              Précédent
            </Button>
            <span className="text-xs font-semibold text-foreground">
              Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount() || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-7 text-xs px-2.5"
            >
              Suivant
            </Button>
          </div>
        </div>
      </Card>

      {/* DIALOGUE D'ASSIGNATION D'EMPLACEMENT POUR DÉCHET */}
      <WasteLocationDialog
        open={isLocationDialogOpen}
        onOpenChange={setIsLocationDialogOpen}
        batch={locationBatch}
        onSuccess={(newLoc) => {
          fetchData()
        }}
      />

      {/* DIALOGUE D'IMPRESSION D'ÉTIQUETTES DÉCHETS (QR CODE & CODE-BARRES) */}
      <LabelPrintDialog
        isOpen={isPrintDialogOpen}
        onClose={() => setIsPrintDialogOpen(false)}
        type="waste"
        items={printDialogItems}
      />
    </div>
  )
}
