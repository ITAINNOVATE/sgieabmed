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
  Package, Boxes, Scale, ShieldAlert, CheckCircle2, AlertTriangle, 
  Layers, PackagePlus, ArrowLeftRight, CheckSquare, Sparkles, Filter
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { exportToExcel, exportToPDF, exportWasteReceptionSlipPDF } from "@/utils/exportUtils"
import { Checkbox } from "@/components/ui/checkbox"
import { LabelPrintDialog } from "@/components/label-print-dialog"
import { WasteLocationDialog } from "@/components/waste-location-dialog"
import { WasteGroupingDialog, GroupedWastePackage } from "@/components/waste-grouping-dialog"
import { WastePackageDetailDialog } from "@/components/waste-package-detail-dialog"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { WASTE_ZONES, normalizeWasteLocation } from "@/utils/waste-locations"

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
  grouped_package_id?: string | null
  package_number?: string | null
}

const DEFAULT_INITIAL_PACKAGES: GroupedWastePackage[] = []

export default function WasteStockPage() {
  const [activeTab, setActiveTab] = useState<"detail" | "grouped">("detail")
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [data, setData] = useState<WasteStockItem[]>([])
  const [packages, setPackages] = useState<GroupedWastePackage[]>([])
  const [loading, setLoading] = useState(false)

  // Filtres
  const [globalSearch, setGlobalSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [groupingFilter, setGroupingFilter] = useState<"all" | "disponible" | "groupe">("all")
  
  // Sélection pour regroupement
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  // Dialogues
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printDialogItems, setPrintDialogItems] = useState<WasteStockItem[]>([])
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false)
  const [locationBatch, setLocationBatch] = useState<WasteStockItem | null>(null)
  const [isGroupingDialogOpen, setIsGroupingDialogOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<GroupedWastePackage | null>(null)
  const [isPackageDetailOpen, setIsPackageDetailOpen] = useState(false)

  const hasLoadedOnceRef = useRef(false)

  // 1. Chargement des données (Batches & Packages)
  const fetchData = useCallback(async () => {
    // A. Packages groupés
    let localPackages: GroupedWastePackage[] = []
    try {
      const storedPkgs = localStorage.getItem("waste_grouped_packages_v1")
      if (storedPkgs) {
        const parsed = JSON.parse(storedPkgs)
        localPackages = parsed.map((p: GroupedWastePackage) => ({
          ...p,
          current_location: normalizeWasteLocation(p.current_location, p.package_type),
        }))
      }
    } catch (e) {
      localPackages = []
    }
    setPackages(localPackages)

    // B. Batches de déchets
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

    // S'assurer que les lots inclus dans les packages initiaux portent bien l'identifiant du package et l'emplacement normalisé
    const finalBatches = Array.from(batchMap.values()).map(batch => {
      const parentPkg = localPackages.find(p => p.item_ids && p.item_ids.includes(batch.id))
      if (parentPkg) {
        return {
          ...batch,
          grouped_package_id: parentPkg.id,
          package_number: parentPkg.package_number,
          current_location: parentPkg.current_location,
        }
      }
      return {
        ...batch,
        current_location: batch.current_location && !/localiser|non d[ée]fini/i.test(batch.current_location)
          ? normalizeWasteLocation(batch.current_location, batch.waste_type)
          : batch.current_location,
      }
    })

    setData(finalBatches)
    setLoading(false)
    hasLoadedOnceRef.current = true
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Synchronisation temps réel
  useRealtimeSync({
    tables: ["waste_batches", "waste_movements", "destruction_plans"],
    onSync: fetchData,
    pollIntervalMs: 6000,
  })

  // 2. Filtrage pour Stocks en détail
  const filteredDetailData = useMemo(() => {
    let list = data

    // Filtre de groupement
    if (groupingFilter === "disponible") {
      list = list.filter((item) => !item.grouped_package_id && !item.package_number)
    } else if (groupingFilter === "groupe") {
      list = list.filter((item) => Boolean(item.grouped_package_id || item.package_number))
    }

    // Filtre Statut
    if (statusFilter !== "all") {
      list = list.filter((item) => {
        if (statusFilter === "a_localiser") {
          return !item.current_location || item.current_location.toLowerCase().includes("non") || item.current_location.toLowerCase().includes("localiser")
        }
        return item.status === statusFilter
      })
    }

    // Filtre Type
    if (typeFilter !== "all") {
      list = list.filter((item) => item.waste_type === typeFilter)
    }

    // Recherche globale
    if (globalSearch.trim() !== "") {
      const q = globalSearch.toUpperCase()
      list = list.filter((item) =>
        (item.batch_number || "").toUpperCase().includes(q) ||
        (item.waste_type || "").toUpperCase().includes(q) ||
        (item.commercial_name || "").toUpperCase().includes(q) ||
        (item.source_structure || "").toUpperCase().includes(q) ||
        (item.depositor_name || "").toUpperCase().includes(q) ||
        (item.current_location || "").toUpperCase().includes(q) ||
        (item.package_number || "").toUpperCase().includes(q)
      )
    }

    return list
  }, [data, globalSearch, statusFilter, typeFilter, groupingFilter])

  // 3. Filtrage pour Stocks Groupés
  const filteredPackages = useMemo(() => {
    if (globalSearch.trim() === "") return packages
    const q = globalSearch.toUpperCase()
    return packages.filter(p =>
      p.package_number.toUpperCase().includes(q) ||
      p.package_name.toUpperCase().includes(q) ||
      p.package_type.toUpperCase().includes(q) ||
      p.current_location.toUpperCase().includes(q)
    )
  }, [packages, globalSearch])

  // Statistiques KPIs
  const totalWeightKg = useMemo(() => {
    return data.reduce((acc, curr) => {
      const qty = Number(curr.quantity) || 0
      return acc + qty
    }, 0)
  }, [data])

  const totalGroupedWeightKg = useMemo(() => {
    return packages.reduce((acc, curr) => acc + (Number(curr.total_weight) || 0), 0)
  }, [packages])

  const unlocatedCount = useMemo(() => {
    return data.filter(
      (b) => !b.current_location || b.current_location.toLowerCase().includes("non") || b.current_location.toLowerCase().includes("localiser")
    ).length
  }, [data])

  const looseAvailableCount = useMemo(() => {
    return data.filter((b) => !b.grouped_package_id && !b.package_number).length
  }, [data])

  // Déduplication des types pour le filtre
  const uniqueWasteTypes = useMemo(() => {
    const set = new Set<string>()
    data.forEach((b) => {
      if (b.waste_type) set.add(b.waste_type)
    })
    return Array.from(set)
  }, [data])

  // Lots sélectionnés pour le regroupement
  const selectedItemsForGrouping = useMemo(() => {
    const selectedIndexes = Object.keys(rowSelection).filter(k => rowSelection[k])
    return selectedIndexes.map(idx => filteredDetailData[Number(idx)]).filter(Boolean)
  }, [rowSelection, filteredDetailData])

  // GESTION DU REGROUPEMENT VALIDÉ (NOUVEAU COLIS OU AJOUT À UN COLIS EXISTANT)
  const handleGroupingSuccess = (newPkg: GroupedWastePackage, isUpdate?: boolean) => {
    if (isUpdate) {
      setPackages(prev => prev.map(p => p.id === newPkg.id ? newPkg : p))
    } else {
      setPackages(prev => [newPkg, ...prev])
    }

    // Mettre à jour les batches individuels avec le numéro du colis
    setData(prev => {
      const updated = prev.map(item => {
        if (newPkg.item_ids.includes(item.id)) {
          return {
            ...item,
            grouped_package_id: newPkg.id,
            package_number: newPkg.package_number,
            current_location: newPkg.current_location,
          }
        }
        return item
      })
      return updated
    })

    setRowSelection({})
    setActiveTab("grouped")
  }

  // DISSOUDRE / DÉGROUPER UN COLIS
  const handleUngroupPackage = (pkg: GroupedWastePackage) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir dissoudre le colis ${pkg.package_number} ?\nTous les lots de déchets redeviendront des lots en détail autonomes.`)) {
      return
    }

    const updatedPackages = packages.filter(p => p.id !== pkg.id)
    setPackages(updatedPackages)
    try {
      localStorage.setItem("waste_grouped_packages_v1", JSON.stringify(updatedPackages))
    } catch (e) {}

    setData(prev => {
      const updated = prev.map(item => {
        if (pkg.item_ids.includes(item.id) || item.grouped_package_id === pkg.id) {
          return {
            ...item,
            grouped_package_id: null,
            package_number: null,
          }
        }
        return item
      })
      try {
        localStorage.setItem("waste_batches_custom_v1", JSON.stringify(updated))
      } catch (e) {}
      return updated
    })

    setSelectedPackage(null)
    setIsPackageDetailOpen(false)
    toast.success(`Le colis ${pkg.package_number} a été dissous. Les ${pkg.items?.length || 0} lots sont retournés dans les stocks en détail.`)
  }

  // IMPRESSION A4 PLACARD D'UN COLIS GROUPÉ
  const handlePrintPackageLabel = (pkg: GroupedWastePackage) => {
    const pseudoItem: WasteStockItem = {
      id: pkg.id,
      batch_number: pkg.package_number,
      waste_type: `COLIS GROUPÉ — ${pkg.package_type}`,
      commercial_name: pkg.package_name,
      original_batch: `${pkg.items?.length || pkg.item_ids?.length || 1} lots détaillés inclus`,
      quantity: pkg.total_weight,
      unit: pkg.unit || "Kg",
      current_location: pkg.current_location,
      status: pkg.status || "En stock",
      source_structure: "Regroupement Interne ABMed",
      packaging: pkg.package_type,
      destruction_motive: `Colis de regroupement (${pkg.items?.length || 0} lots)`,
      created_at: pkg.created_at,
    }
    setPrintDialogItems([pseudoItem])
    setIsPrintDialogOpen(true)
  }

  // EXPORT EXCEL
  const handleExportExcel = () => {
    if (activeTab === "detail") {
      const headers = [
        "N° Lot Déchet",
        "Colis / Sac",
        "Classification",
        "Dénomination",
        "Lot d'origine",
        "Quantité",
        "Unité",
        "Provenance",
        "Apporteur",
        "Emplacement",
        "Statut",
      ]
      const exportRows = filteredDetailData.map((b) => ({
        "N° Lot Déchet": b.batch_number,
        "Colis / Sac": b.package_number || "En détail (Non groupé)",
        "Classification": b.waste_type,
        "Dénomination": b.commercial_name || "—",
        "Lot d'origine": b.original_batch || "—",
        "Quantité": b.quantity,
        "Unité": b.unit,
        "Provenance": b.source_structure || "Interne ABMed",
        "Apporteur": b.depositor_name || "—",
        "Emplacement": b.current_location || "Non assigné",
        "Statut": b.status,
      }))
      exportToExcel(exportRows, headers, "stocks_dechets_en_detail")
      toast.success("Export Excel des stocks en détail généré avec succès !")
    } else {
      const headers = [
        "N° Colis / Sac",
        "Libellé du Colis",
        "Conditionnement",
        "Nombre de lots",
        "Poids Total (Kg)",
        "Emplacement",
        "Statut",
        "Date de création",
      ]
      const exportRows = filteredPackages.map((p) => ({
        "N° Colis / Sac": p.package_number,
        "Libellé du Colis": p.package_name,
        "Conditionnement": p.package_type,
        "Nombre de lots": p.items?.length || p.item_ids?.length || 0,
        "Poids Total (Kg)": p.total_weight,
        "Emplacement": p.current_location,
        "Statut": p.status,
        "Date de création": p.created_at ? new Date(p.created_at).toLocaleDateString("fr-FR") : "",
      }))
      exportToExcel(exportRows, headers, "stocks_dechets_groupes")
      toast.success("Export Excel des stocks groupés généré avec succès !")
    }
  }

  // EXPORT PDF
  const handleExportPDF = () => {
    if (activeTab === "detail") {
      const headers = ["N° Lot", "Colis", "Classification", "Quantité", "Emplacement", "Statut"]
      const rows = filteredDetailData.map((item) => [
        item.batch_number,
        item.package_number || "Détail",
        item.waste_type,
        `${item.quantity} ${item.unit || "Kg"}`,
        item.current_location || "Non défini",
        item.status,
      ])
      exportToPDF("ABMed — Registre du Stock des Déchets (En Détail)", headers, rows, "stock_dechets_detail")
    } else {
      const headers = ["N° Colis / Sac", "Libellé", "Contenant", "Nb Lots", "Poids Total", "Emplacement"]
      const rows = filteredPackages.map((p) => [
        p.package_number,
        p.package_name,
        p.package_type,
        `${p.items?.length || p.item_ids?.length || 0} lots`,
        `${p.total_weight} Kg`,
        p.current_location,
      ])
      exportToPDF("ABMed — Registre des Colis & Sacs Groupés de Déchets", headers, rows, "stock_dechets_groupes")
    }
    toast.success("Rapport PDF généré avec succès !")
  }

  // COLONNES POUR STOCKS EN DÉTAIL
  const detailColumns: ColumnDef<WasteStockItem>[] = useMemo(() => [
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
      id: "grouping_status",
      header: "Colis / Sac",
      cell: ({ row }) => {
        const pkgNumber = row.original.package_number
        if (pkgNumber) {
          const parentPkg = packages.find(p => p.package_number === pkgNumber || p.id === row.original.grouped_package_id)
          return (
            <button
              onClick={() => {
                if (parentPkg) {
                  setSelectedPackage(parentPkg)
                  setIsPackageDetailOpen(true)
                }
              }}
              className="text-left group cursor-pointer"
              title="Cliquer pour voir le colis groupé"
            >
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-mono gap-1 group-hover:bg-purple-100">
                <Package className="h-3 w-3" /> {pkgNumber}
              </Badge>
            </button>
          )
        }
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[9.5px]">
            Libre (En détail)
          </Badge>
        )
      },
    },
    {
      accessorKey: "source_structure",
      header: "Provenance",
      cell: ({ row }) => (
        <div className="flex flex-col min-w-[120px]">
          <span className="font-medium text-xs text-foreground truncate max-w-[160px]">{row.original.source_structure || "Interne ABMed"}</span>
          {row.original.depositor_name && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">{row.original.depositor_name}</span>
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
          className="-ml-3 text-xs p-1 h-auto font-semibold hover:bg-transparent"
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
      accessorKey: "current_location",
      header: "Emplacement",
      cell: ({ row }) => {
        const loc = row.getValue("current_location") as string
        const isUnassigned = !loc || loc.toLowerCase().includes("non") || loc.toLowerCase().includes("localiser")
        return (
          <button 
            onClick={() => {
              setLocationBatch(row.original)
              setIsLocationDialogOpen(true)
            }}
            className="text-left group cursor-pointer"
            title="Cliquer pour modifier l'emplacement"
          >
            {isUnassigned ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold gap-1 hover:bg-amber-100">
                <AlertTriangle className="h-3 w-3" /> À localiser
              </Badge>
            ) : (
              <div className="font-mono text-[11px] text-muted-foreground group-hover:text-red-600 transition-colors truncate max-w-[140px] flex items-center gap-1">
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
      cell: ({ row }) => {
        const item = row.original
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
                <DropdownMenuItem 
                  className="cursor-pointer text-xs" 
                  onClick={() => {
                    setLocationBatch(item)
                    setIsLocationDialogOpen(true)
                  }}
                >
                  <MapPin className="mr-2 h-3.5 w-3.5 text-orange-500" /> Assigner / Déplacer
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer text-xs" 
                  onClick={() => {
                    setPrintDialogItems([item])
                    setIsPrintDialogOpen(true)
                  }}
                >
                  <Printer className="mr-2 h-3.5 w-3.5 text-slate-700" /> Imprimer fiche A4 déchet
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                  <Link href="/dashboard/waste/movements">
                    <History className="mr-2 h-3.5 w-3.5 text-purple-600" /> Historique des mouvements
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
                      recipient_agent: "Admin EGED",
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
                      setData((prev) => prev.filter((b) => b.id !== item.id && b.batch_number !== item.batch_number))
                      toast.success(`Lot de déchet ${item.batch_number} retiré du stock.`)
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
  ], [packages])

  // TABLE REACT POUR STOCKS EN DÉTAIL
  const table = useReactTable({
    data: filteredDetailData,
    columns: detailColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  })

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* ALERTE CONTEXTUELLE SI LOTS NON LOCALISÉS */}
      {unlocatedCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 shadow-2xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {unlocatedCount} lot{unlocatedCount > 1 ? "s" : ""} de déchet en attente d&apos;assignation d&apos;emplacement
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Cliquez sur le badge <strong>« À localiser »</strong> pour définir la zone de stockage dans le magasin déchet.
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
                Gestion des stocks en détail, regroupement en sacs/fûts pour colis volumineux et préparation à l&apos;incinération.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CARTES KPIS DE SYNTHÈSE DU STOCK DÉCHETS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="rounded-xl border border-border/60 shadow-2xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Lots en Stock</span>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-black text-foreground">{data.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {looseAvailableCount} en détail libre • {data.length - looseAvailableCount} groupés
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/60 shadow-2xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Masse Totale Stockée</span>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-black text-foreground">
              {Math.round(totalWeightKg).toLocaleString("fr-FR")} <span className="text-xs font-normal text-muted-foreground">Kg</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Poids brut cumulé</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/60 shadow-2xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Colis & Sacs Groupés</span>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-black text-purple-700 dark:text-purple-400">{packages.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {Math.round(totalGroupedWeightKg)} Kg en grands colis
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/60 shadow-2xs">
          <CardHeader className="p-3.5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">À Regrouper / Dispo</span>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{looseAvailableCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Lots prêts à être mis en sac/fût</p>
          </CardContent>
        </Card>
      </div>

      {/* ONGLET PRINCIPAL : DEUX GROUPES (STOCKS EN DÉTAIL & STOCKS GROUPÉS) */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-4">
        
        {/* SÉLECTEUR D'ONGLET */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <TabsList className="bg-muted/60 p-1.5 rounded-xl h-auto border border-border/60 gap-1">
            <TabsTrigger 
              value="detail" 
              className="rounded-lg text-sm font-bold gap-2.5 py-2.5 px-6 h-11 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Stocks en détail
              <Badge variant="secondary" className="text-xs ml-1 px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold">
                {data.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger 
              value="grouped" 
              className="rounded-lg text-sm font-bold gap-2.5 py-2.5 px-6 h-11 cursor-pointer data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Stocks Groupés (Colis & Sacs)
              <Badge variant="secondary" className="text-xs ml-1 px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
                {packages.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {activeTab === "detail" && selectedItemsForGrouping.length > 0 && (
            <Button
              size="sm"
              onClick={() => setIsGroupingDialogOpen(true)}
              className="h-9 text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-2 shadow-sm animate-in fade-in"
            >
              <Layers className="h-4 w-4" />
              Regrouper en Grand Colis / Sac ({selectedItemsForGrouping.length} sélectionnés)
            </Button>
          )}
        </div>

        {/* -------------------- CONTENU ONGLET 1 : STOCKS EN DÉTAIL -------------------- */}
        <TabsContent value="detail" className="space-y-4 mt-0">
          
          {/* BARRE D'ACTIONS GROUPÉES SI SÉLECTION ACTIVE */}
          {selectedItemsForGrouping.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <Badge className="bg-red-600 text-white font-bold">{selectedItemsForGrouping.length}</Badge>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {selectedItemsForGrouping.length} lot{selectedItemsForGrouping.length > 1 ? "s" : ""} en détail sélectionné{selectedItemsForGrouping.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Poids total estimé : {Math.round(selectedItemsForGrouping.reduce((a, b) => a + (Number(b.quantity) || 0), 0) * 10) / 10} Kg
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => setIsGroupingDialogOpen(true)}
                  className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5 cursor-pointer shadow-xs"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Mettre dans un même Colis / Sac
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPrintDialogItems(selectedItemsForGrouping)
                    setIsPrintDialogOpen(true)
                  }}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-700" />
                  Imprimer Fiches A4
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRowSelection({})}
                  className="h-8 text-xs text-muted-foreground cursor-pointer"
                >
                  Désélectionner
                </Button>
              </div>
            </div>
          )}

          {/* BARRE DE RECHERCHE ET FILTRES */}
          <Card className="rounded-xl border border-border/60 shadow-2xs">
            <CardContent className="p-3.5 space-y-3">
              <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher lot, produit, provenance, sac..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="pl-8 text-xs h-8.5 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                  {/* FILTRE DE GROUPEMENT */}
                  <Select value={groupingFilter} onValueChange={(val: any) => setGroupingFilter(val || "all")}>
                    <SelectTrigger className="text-xs h-8.5 w-44 rounded-lg">
                      <SelectValue placeholder="État du groupage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Tous les stocks détails</SelectItem>
                      <SelectItem value="disponible" className="text-xs">Disponibles (Non groupés)</SelectItem>
                      <SelectItem value="groupe" className="text-xs">Déjà en colis / sac</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* FILTRE STATUT */}
                  <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                    <SelectTrigger className="text-xs h-8.5 w-38 rounded-lg">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Tous les statuts</SelectItem>
                      <SelectItem value="Déclaré" className="text-xs">Déclaré</SelectItem>
                      <SelectItem value="En attente de destruction" className="text-xs">En attente de destruction</SelectItem>
                      <SelectItem value="Quarantaine" className="text-xs">Quarantaine</SelectItem>
                      <SelectItem value="a_localiser" className="text-xs text-amber-700">À localiser</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* FILTRE CLASSIFICATION */}
                  <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
                    <SelectTrigger className="text-xs h-8.5 w-44 rounded-lg">
                      <SelectValue placeholder="Classification" />
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
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TABLEAU DES STOCKS EN DÉTAIL */}
          <Card className="rounded-xl border border-border/60 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="text-xs font-bold text-muted-foreground h-9">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={detailColumns.length} className="h-32 text-center text-xs text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-5 w-5 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
                          <p>Chargement des stocks de déchets en détail...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows?.length ? (
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
                      <TableCell colSpan={detailColumns.length} className="h-32 text-center text-xs text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Boxes className="h-8 w-8 text-muted-foreground/40" />
                          <p className="font-semibold text-foreground">Aucun lot de déchet en détail trouvé</p>
                          <p className="text-[11px]">Ajustez vos filtres ou enregistrez une nouvelle réception.</p>
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
                Affichage de {table.getRowModel().rows.length} sur {filteredDetailData.length} lot{filteredDetailData.length > 1 ? "s" : ""}
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
        </TabsContent>

        {/* -------------------- CONTENU ONGLET 2 : STOCKS GROUPÉS (COLIS & SACS) -------------------- */}
        <TabsContent value="grouped" className="space-y-4 mt-0">
          
          {/* BANDEAU D'EXPLICATION & CRÉATION DE COLIS */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-600/10 text-purple-700 dark:text-purple-300">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-950 dark:text-purple-200">
                  Gestion des Colis & Sacs Groupés de Déchets
                </p>
                <p className="text-[11px] text-purple-800 dark:text-purple-400 mt-0.5">
                  Chaque colis regroupe plusieurs lots de déchets sous un identifiant unique (sac, fût ou carton scellé) avec sa propre fiche A4 placard.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setActiveTab("detail")
                toast.info("Cochez les lots en détail que vous souhaitez rassembler dans un colis, puis cliquez sur 'Regrouper en Grand Colis'.")
              }}
              className="text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="h-4 w-4" />
              Nouveau Colis depuis Détail
            </Button>
          </div>

          {/* TABLEAU DES COLIS GROUPÉS */}
          <Card className="rounded-xl border border-border/60 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-muted-foreground h-9">Référence / N° Colis</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground h-9">Conditionnement</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground h-9 text-center">Lots Inclus</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground h-9 text-right">Poids Total</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground h-9">Emplacement</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground h-9">Statut</TableHead>
                    <TableHead className="text-xs font-bold text-muted-foreground h-9 text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPackages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-36 text-center text-xs text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Package className="h-8 w-8 text-muted-foreground/40" />
                          <p className="font-semibold text-foreground">Aucun colis ou sac groupé créé</p>
                          <p className="text-[11px] max-w-md">
                            Basculez sur l&apos;onglet <strong>« Stocks en détail »</strong>, cochez les lots souhaités puis cliquez sur <strong>« Regrouper en Grand Colis / Sac »</strong>.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab("detail")}
                            className="mt-1 text-xs gap-1.5"
                          >
                            <Boxes className="h-3.5 w-3.5 text-red-600" />
                            Voir les stocks en détail
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPackages.map((pkg) => {
                      const itemsCount = pkg.items?.length || pkg.item_ids?.length || 0
                      return (
                        <TableRow key={pkg.id} className="hover:bg-muted/30 transition-colors text-xs">
                          {/* N° Colis */}
                          <TableCell className="py-3 font-mono font-black text-red-700 dark:text-red-400">
                            <div className="flex items-center gap-1.5">
                              <Package className="h-4 w-4 text-purple-600 shrink-0" />
                              <span>{pkg.package_number}</span>
                            </div>
                          </TableCell>

                          {/* Contenant */}
                          <TableCell className="py-3">
                            <div className="font-semibold text-foreground leading-tight">{pkg.package_type}</div>
                          </TableCell>

                          {/* Nombre de lots inclus */}
                          <TableCell className="py-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedPackage(pkg)
                                setIsPackageDetailOpen(true)
                              }}
                              className="cursor-pointer group"
                              title="Cliquer pour voir la composition du colis"
                            >
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 font-bold group-hover:bg-purple-100 gap-1">
                                <Boxes className="h-3 w-3" /> {itemsCount} lot{itemsCount > 1 ? "s" : ""}
                              </Badge>
                            </button>
                          </TableCell>

                          {/* Poids Total */}
                          <TableCell className="py-3 text-right font-black tabular-nums text-foreground">
                            {pkg.total_weight} <span className="text-[10px] font-normal text-muted-foreground">{pkg.unit || "Kg"}</span>
                          </TableCell>

                          {/* Emplacement */}
                          <TableCell className="py-3">
                            <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-1 truncate max-w-[170px]" title={pkg.current_location}>
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{pkg.current_location || "Magasin Déchets"}</span>
                            </div>
                          </TableCell>

                          {/* Statut */}
                          <TableCell className="py-3">
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold">
                              {pkg.status || "Groupé (En stock)"}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 text-right pr-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPackage(pkg)
                                  setIsPackageDetailOpen(true)
                                }}
                                className="h-7 text-xs px-2.5 font-semibold gap-1 cursor-pointer"
                                title="Voir le contenu du colis"
                              >
                                <Eye className="h-3.5 w-3.5 text-blue-600" />
                                Contenu
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => handlePrintPackageLabel(pkg)}
                                className="h-7 text-xs px-2.5 font-bold bg-red-600 hover:bg-red-700 text-white gap-1 cursor-pointer shadow-2xs"
                                title="Imprimer la fiche A4 placard du colis"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Fiche A4
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg cursor-pointer">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem 
                                    className="cursor-pointer text-xs"
                                    onClick={() => {
                                      setSelectedPackage(pkg)
                                      setIsPackageDetailOpen(true)
                                    }}
                                  >
                                    <Eye className="mr-2 h-3.5 w-3.5 text-blue-600" /> Voir composition
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="cursor-pointer text-xs"
                                    onClick={() => handlePrintPackageLabel(pkg)}
                                  >
                                    <Printer className="mr-2 h-3.5 w-3.5 text-red-600" /> Imprimer Fiche A4
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs font-medium"
                                    onClick={() => handleUngroupPackage(pkg)}
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Dégrouper le colis
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOGUE D'ASSIGNATION D'EMPLACEMENT */}
      <WasteLocationDialog
        open={isLocationDialogOpen}
        onOpenChange={setIsLocationDialogOpen}
        batch={locationBatch}
        onSuccess={() => {
          fetchData()
        }}
      />

      {/* DIALOGUE DE REGROUPEMENT EN COLIS / SAC */}
      <WasteGroupingDialog
        open={isGroupingDialogOpen}
        onOpenChange={setIsGroupingDialogOpen}
        selectedItems={selectedItemsForGrouping}
        existingPackages={packages}
        onSuccess={handleGroupingSuccess}
      />

      {/* DIALOGUE DE DÉTAIL D'UN COLIS GROUPÉ */}
      <WastePackageDetailDialog
        open={isPackageDetailOpen}
        onOpenChange={setIsPackageDetailOpen}
        pkg={selectedPackage}
        onPrintLabel={handlePrintPackageLabel}
        onUngroup={handleUngroupPackage}
        onAssignLocation={(pkg) => {
          const pseudoItem: WasteStockItem = {
            id: pkg.id,
            batch_number: pkg.package_number,
            waste_type: pkg.package_type,
            commercial_name: pkg.package_name,
            quantity: pkg.total_weight,
            unit: pkg.unit || "Kg",
            source_structure: "ABMed",
            current_location: pkg.current_location,
            status: pkg.status,
          }
          setLocationBatch(pseudoItem)
          setIsLocationDialogOpen(true)
        }}
      />

      {/* DIALOGUE D'IMPRESSION RÉGLEMENTAIRE (A4 DÉCHETS) */}
      <LabelPrintDialog
        isOpen={isPrintDialogOpen}
        onClose={() => setIsPrintDialogOpen(false)}
        type="waste"
        items={printDialogItems}
      />
    </div>
  )
}
