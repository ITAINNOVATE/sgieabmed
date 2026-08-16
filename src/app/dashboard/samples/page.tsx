"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Download, FileText, Plus, Search, Eye, Edit, Trash, Trash2, History, Printer, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { exportToExcel, exportToPDF } from "@/utils/exportUtils"
import { clearAllTestData } from "@/utils/clean-test-data"
import { Checkbox } from "@/components/ui/checkbox"
import { LabelPrintDialog } from "@/components/label-print-dialog"
import { SampleLocationDialog } from "@/components/sample-location-dialog"

export type Sample = {
  id: string
  sample_number: string
  reception_ref: string
  commercial_name: string
  dci: string
  batch_number: string
  quantity: number
  status: string
  expiry_date: string
  current_location: string
  shelf_id?: string | null
}

export const columns: ColumnDef<Sample>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "sample_number",
    header: "N° Échantillon",
    cell: ({ row }) => <div className="font-semibold text-xs text-foreground font-mono">{row.getValue("sample_number")}</div>,
  },
  {
    accessorKey: "commercial_name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-3 text-xs p-1 h-auto font-semibold">
          Produit (Nom / DCI) <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="flex flex-col min-w-[140px]">
        <span className="font-bold text-xs text-foreground leading-tight">{row.original.commercial_name}</span>
        <span className="text-[11px] text-muted-foreground leading-tight">{row.original.dci || "—"}</span>
      </div>
    )
  },
  {
    accessorKey: "batch_number",
    header: "Lot",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.getValue("batch_number")}</span>
  },
  {
    accessorKey: "quantity",
    header: "Quantité",
    cell: ({ row }) => <span className="font-bold text-xs">{row.getValue("quantity")}</span>
  },
  {
    accessorKey: "expiry_date",
    header: "Péremption",
    cell: ({ row }) => {
      const val = row.getValue("expiry_date") as string
      if (!val) return <span className="text-muted-foreground text-xs">—</span>
      const date = new Date(val)
      return <div className="text-xs text-muted-foreground">{date.toLocaleDateString("fr-FR")}</div>
    }
  },
  {
    accessorKey: "current_location",
    header: "Emplacement",
    cell: ({ row }) => {
      const loc = row.getValue("current_location") as string
      return <div className="font-mono text-[11px] text-muted-foreground truncate max-w-[140px]">{loc || "Non défini"}</div>
    }
  },
  {
    id: "actions",
    header: () => <span className="text-right block pr-2">Actions</span>,
    cell: ({ row, table }) => {
      const sample = row.original
      const meta = table.options.meta as any
      return (
        <div className="text-right pr-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-muted">
                <span className="sr-only">Menu actions</span>
                <MoreHorizontal className="h-4 w-4 text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions Échantillon</div>
              <DropdownMenuItem asChild className="cursor-pointer text-xs">
                <Link href={`/dashboard/samples/${sample.id}`}><Eye className="mr-2 h-3.5 w-3.5 text-emerald-600"/> Voir le détail</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer text-xs">
                <Link href={`/dashboard/samples/${sample.id}/edit`}><Edit className="mr-2 h-3.5 w-3.5 text-blue-600"/> Modifier</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild onClick={() => toast.info("Naviguez vers l'onglet Historique de la fiche échantillon.")} className="cursor-pointer text-xs">
                <Link href={`/dashboard/samples/${sample.id}`}><History className="mr-2 h-3.5 w-3.5 text-purple-600"/> Historique & Mouvements</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => meta?.onAssignLocation(sample)}>
                <MapPin className="mr-2 h-3.5 w-3.5 text-orange-500"/> Assigner un emplacement
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => meta?.onPrintLabel(sample)}>
                <Printer className="mr-2 h-3.5 w-3.5 text-slate-700"/> Étiqueter (Imprimer / PDF)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs" onClick={async () => {
                if (window.confirm("Êtes-vous sûr de vouloir supprimer cet échantillon ?")) {
                  const supabase = createClient()
                  await supabase.from('samples').delete().eq('id', sample.id)
                  toast.success("Échantillon supprimé")
                  window.location.reload()
                }
              }}>
                <Trash className="mr-2 h-3.5 w-3.5"/> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]

const DEFAULT_SAMPLES: Sample[] = [
  {
    id: 'sample-1',
    sample_number: 'ECH-2026-8832',
    reception_ref: 'REC-2026-001',
    commercial_name: 'AMOXICILLINE 500MG',
    dci: 'AMOXICILLINE',
    batch_number: 'LOT-8832',
    quantity: 150,
    status: 'Disponible',
    expiry_date: '2028-11-30',
    current_location: 'MAG-A1-E3',
  },
  {
    id: 'sample-2',
    sample_number: 'ECH-2026-1192',
    reception_ref: 'REC-2026-002',
    commercial_name: 'PARACÉTAMOL 1G',
    dci: 'PARACÉTAMOL',
    batch_number: 'LOT-1192',
    quantity: 50,
    status: 'Disponible',
    expiry_date: '2027-08-15',
    current_location: 'MAG-A2-E1',
  },
  {
    id: 'sample-3',
    sample_number: 'ECH-2026-9920',
    reception_ref: 'REC-2026-003',
    commercial_name: 'IBUPROFÈNE 400MG',
    dci: 'IBUPROFÈNE',
    batch_number: 'LOT-9920',
    quantity: 20,
    status: 'En quarantaine',
    expiry_date: '2027-05-20',
    current_location: 'QUAR-01',
  },
  {
    id: 'sample-4',
    sample_number: 'ECH-2026-7331',
    reception_ref: 'REC-2026-004',
    commercial_name: 'CÉFOTAXIME 1G',
    dci: 'CÉFOTAXIME',
    batch_number: 'LOT-7331',
    quantity: 10,
    status: 'Disponible',
    expiry_date: '2028-03-10',
    current_location: 'MAG-A3-E2',
  },
  {
    id: 'sample-5',
    sample_number: 'ECH-2026-4410',
    reception_ref: 'REC-2026-005',
    commercial_name: 'ARTEMETHER + LUMEFANTRINE 80/480MG',
    dci: 'ARTEMETHER / LUMEFANTRINE',
    batch_number: 'LOT-4410',
    quantity: 200,
    status: 'Disponible',
    expiry_date: '2029-01-31',
    current_location: 'MAG-B1-E4',
  },
]

export default function SamplesDataTable() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [data, setData] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [globalSearch, setGlobalSearch] = useState("")
  const [rowSelection, setRowSelection] = useState({})
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printDialogItems, setPrintDialogItems] = useState<Sample[]>([])
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false)
  const [locationSample, setLocationSample] = useState<Sample | null>(null)

  const fetchData = useCallback(async () => {
    let remoteSamples: Sample[] = []
    try {
      const supabase = createClient()
      const fetchPromise = supabase.from('samples').select('*').order('created_at', { ascending: false })
      const timeoutPromise = new Promise<any>((resolve) => setTimeout(() => resolve({ data: null }), 1500))
      
      const res = await Promise.race([fetchPromise, timeoutPromise])
      if (res && res.data && res.data.length > 0) {
        remoteSamples = res.data
      }
    } catch (e) {
      console.warn("Supabase fetch failed or timed out:", e)
    }

    let localSamples: Sample[] = []
    try {
      const historyRecords = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
      const deletedIds = JSON.parse(localStorage.getItem('reception_deleted_ids') || '[]')

      historyRecords.forEach((rec: any) => {
        if (deletedIds.includes(rec.rec_number) || deletedIds.includes(rec.id)) return

        const rawDetails = localStorage.getItem('reception_draft_details_' + rec.rec_number)
        if (rawDetails) {
          const parsed = JSON.parse(rawDetails)
          if (parsed.formData && parsed.formData.samples) {
            parsed.formData.samples.forEach((s: any, idx: number) => {
              if (s.commercial_name && s.commercial_name.trim() !== '') {
                const dciStr = Array.isArray(s.dci_list)
                  ? s.dci_list.map((d: any) => `${d.dci} ${d.dosage || ''}`).join(', ')
                  : (s.dci || '')

                localSamples.push({
                  id: `local-sample-${rec.rec_number}-${idx}`,
                  sample_number: `ECH-${rec.rec_number.replace('REC-', '')}-${idx + 1}`,
                  reception_ref: rec.rec_number,
                  commercial_name: s.commercial_name.toUpperCase(),
                  dci: (dciStr || s.commercial_name).toUpperCase(),
                  batch_number: (s.batch || 'LOT-TEMP').toUpperCase(),
                  quantity: Number(s.qty) || 1,
                  status: rec.status === 'Finalisé' ? 'Disponible' : (rec.status || 'Disponible'),
                  expiry_date: s.expiry_date || s.expiryDate || s.exp_date || '2028-12-31',
                  current_location: s.location || 'Magasin Central (Zone A)',
                })
              }
            })
          }
        }
      })
    } catch (e) {}

    try {
      const sampleMap = new Map<string, Sample>()
      DEFAULT_SAMPLES.forEach(s => sampleMap.set(s.id, s))
      localSamples.forEach(s => sampleMap.set(s.id, s))
      remoteSamples.forEach(s => sampleMap.set(s.id || s.sample_number, s))

      // Appliquer les mises à jour de stock issues des mouvements validés
      const overrides = JSON.parse(localStorage.getItem('local_sample_overrides') || '{}')
      const localMovements = JSON.parse(localStorage.getItem('local_movements_history') || '[]')

      sampleMap.forEach((sample, key) => {
        const comboKey = sample.commercial_name && sample.batch_number 
          ? `${sample.commercial_name.toUpperCase()}___${sample.batch_number.toUpperCase()}`
          : null;

        // 1. Chercher dans local_sample_overrides par clé, id, N° d'échantillon, Nom produit ou clé combinée
        let override = overrides[key] || 
                       (sample.id ? overrides[sample.id] : null) || 
                       (sample.sample_number ? overrides[sample.sample_number] : null) ||
                       (sample.commercial_name ? overrides[sample.commercial_name.toUpperCase()] : null) ||
                       (comboKey ? overrides[comboKey] : null);

        // 2. Si pas trouvé dans overrides, chercher le tout dernier mouvement validé dans local_movements_history
        if (!override && localMovements.length > 0) {
          const matchingMvt = localMovements.find((m: any) => {
            if (m.sample_id && sample.id && m.sample_id === sample.id) return true;
            if (m.sample_number && sample.sample_number && m.sample_number === sample.sample_number) return true;
            if (m.commercial_name && sample.commercial_name && m.commercial_name.toUpperCase() === sample.commercial_name.toUpperCase()) {
              if (!m.batch_number || !sample.batch_number || m.batch_number.toUpperCase() === sample.batch_number.toUpperCase()) {
                return true;
              }
            }
            return false;
          });

          if (matchingMvt && typeof matchingMvt.new_quantity === 'number') {
            override = {
              quantity: matchingMvt.new_quantity,
              status: matchingMvt.new_status || sample.status,
              current_location: matchingMvt.new_location || sample.current_location
            };
          }
        }

        if (override) {
          sampleMap.set(key, { 
            ...sample, 
            quantity: override.quantity !== undefined ? Number(override.quantity) : sample.quantity,
            status: override.status || sample.status,
            current_location: override.current_location || sample.current_location
          });
        }
      });

      setData(Array.from(sampleMap.values()))
    } catch (e) {
      console.warn("Error processing samples data:", e);
      setData(DEFAULT_SAMPLES)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredData = useMemo(() => {
    if (!globalSearch) return data
    const q = globalSearch.toUpperCase()
    return data.filter((item) => 
      (item.commercial_name || "").toUpperCase().includes(q) ||
      (item.dci || "").toUpperCase().includes(q) ||
      (item.sample_number || "").toUpperCase().includes(q) ||
      (item.batch_number || "").toUpperCase().includes(q) ||
      (item.current_location || "").toUpperCase().includes(q)
    )
  }, [data, globalSearch])

  const unlocatedCount = useMemo(() => data.filter(s => s.status === 'À localiser').length, [data])

  const tableMeta = useMemo(() => ({
    onPrintLabel: (sample: Sample) => {
      setPrintDialogItems([sample])
      setIsPrintDialogOpen(true)
    },
    onAssignLocation: (sample: Sample) => {
      setLocationSample(sample)
      setIsLocationDialogOpen(true)
    }
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
    meta: tableMeta
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedItems = selectedRows.map(row => row.original)

  const handleExportExcel = () => {
    if (data.length === 0) {
      toast.warning("Aucun échantillon à exporter.")
      return
    }
    const excelData = data.map(item => ({
      "N° Échantillon": item.sample_number,
      "Réf Réception": item.reception_ref || "N/A",
      "Nom Commercial": item.commercial_name,
      "DCI": item.dci,
      "Lot": item.batch_number,
      "Quantité": item.quantity,
      "Péremption": new Date(item.expiry_date).toLocaleDateString("fr-FR"),
      "Emplacement": item.current_location || "Non défini",
      "Statut": item.status
    }))
    
    exportToExcel(excelData, ["N° Échantillon", "Réf Réception", "Nom Commercial", "DCI", "Lot", "Quantité", "Péremption", "Emplacement", "Statut"], "liste_echantillons")
    toast.success("Fichier Excel exporté avec succès !")
  }

  const handleExportPDF = () => {
    if (data.length === 0) {
      toast.warning("Aucun échantillon à exporter.")
      return
    }
    const headers = ["N° Échantillon", "Réf Réception", "Nom Commercial", "DCI", "Lot", "Qté", "Péremption", "Statut"]
    const rows = data.map(item => [
      item.sample_number,
      item.reception_ref || "N/A",
      item.commercial_name,
      item.dci,
      item.batch_number,
      String(item.quantity),
      new Date(item.expiry_date).toLocaleDateString("fr-FR"),
      item.status
    ])
    
    exportToPDF("ABMed - Liste et Inventaire des Échantillons", headers, rows, "liste_echantillons")
    toast.success("Rapport PDF exporté avec succès !")
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {unlocatedCount > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <MapPin className="h-5 w-5 text-orange-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              {unlocatedCount} échantillon{unlocatedCount > 1 ? 's' : ''} en attente de localisation
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">Cliquez sur le badge <strong>«À localiser»</strong> ou utilisez le menu ⋯ pour assigner un emplacement.</p>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Liste des échantillons</h2>
          <p className="text-muted-foreground text-sm">Gestion complète du stock pharmaceutique.</p>
        </div>
        <div className="flex gap-2">
          {selectedItems.length > 0 && (
            <Button 
              onClick={() => {
                setPrintDialogItems(selectedItems)
                setIsPrintDialogOpen(true)
              }}
              className="shadow-md bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl"
            >
              <Printer className="h-4 w-4" /> Étiqueter ({selectedItems.length})
            </Button>
          )}
          <Button variant="outline" className="shadow-sm rounded-xl" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" /> Export Excel</Button>
          <Button variant="outline" className="shadow-sm rounded-xl" onClick={handleExportPDF}><FileText className="mr-2 h-4 w-4" /> Export PDF</Button>
          <Button 
            variant="outline" 
            className="shadow-sm rounded-xl text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={async () => {
              if (window.confirm("Êtes-vous sûr de vouloir effacer toutes les données de test ? Cette action réinitialisera les mouvements et les stocks.")) {
                await clearAllTestData()
                toast.success("Toutes les données de test ont été effacées avec succès !")
                fetchData()
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Effacer données de test
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center p-4 border-b border-border/50 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="RECHERCHER PAR PRODUIT, DCI, N° ÉCHANTILLON, LOT..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-9 h-9 text-xs uppercase"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto h-9"><ChevronDown className="mr-2 h-4 w-4" /> Colonnes</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => {
                  return (
                    <DropdownMenuCheckboxItem key={column.id} className="capitalize" checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">Chargement des données...</TableCell></TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="group hover:bg-muted/10">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">Aucun échantillon trouvé.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-end space-x-2 p-4 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Précédent</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Suivant</Button>
          </div>
        </CardContent>
      </Card>

      <LabelPrintDialog 
        isOpen={isPrintDialogOpen}
        onClose={() => {
          setIsPrintDialogOpen(false)
          setPrintDialogItems([])
          setRowSelection({})
        }}
        type="sample"
        items={printDialogItems}
      />

      <SampleLocationDialog
        open={isLocationDialogOpen}
        onOpenChange={setIsLocationDialogOpen}
        sample={locationSample}
        onSuccess={() => {
          setLocationSample(null)
          fetchData()
        }}
      />
    </div>
  )
}
