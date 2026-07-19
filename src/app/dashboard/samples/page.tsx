"use client"

import { useState, useEffect } from "react"
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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Download, FileText, Plus, Search, Eye, Edit, Trash, History, Printer, MapPin } from "lucide-react"

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
    cell: ({ row }) => <div className="font-medium">{row.getValue("sample_number")}</div>,
  },
  {
    accessorKey: "reception_ref",
    header: "Origine (Réf)",
    cell: ({ row }) => <Badge variant="outline" className="font-mono text-xs">{row.getValue("reception_ref") || "REC-2026-..."}</Badge>,
  },
  {
    accessorKey: "commercial_name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4">
          Nom Commercial <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "dci",
    header: "DCI",
  },
  {
    accessorKey: "batch_number",
    header: "Lot",
  },
  {
    accessorKey: "quantity",
    header: "Quantité",
  },
  {
    accessorKey: "expiry_date",
    header: "Péremption",
    cell: ({ row }) => {
      const date = new Date(row.getValue("expiry_date"))
      return <div>{date.toLocaleDateString("fr-FR")}</div>
    }
  },
  {
    accessorKey: "current_location",
    header: "Emplacement",
    cell: ({ row }) => {
      const loc = row.getValue("current_location") as string
      return <div className="font-mono text-xs">{loc || "Non défini"}</div>
    }
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row, table }) => {
      const status = row.getValue("status") as string
      const sample = row.original
      const meta = table.options.meta as any
      let variant: "default" | "secondary" | "destructive" | "outline" = "default"
      if (status === "Rejeté") variant = "destructive"
      else if (status === "En quarantaine") variant = "secondary"
      else if (status === "À localiser") variant = "outline"

      if (status === "À localiser") {
        return (
          <button
            onClick={() => meta?.onAssignLocation(sample)}
            title="Cliquer pour assigner un emplacement"
          >
            <Badge variant="outline" className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-300 cursor-pointer flex items-center gap-1 transition-colors">
              <MapPin className="h-3 w-3" />
              À localiser
            </Badge>
          </button>
        )
      }

      return (
        <Badge variant={variant} className={
          status === "En quarantaine" ? "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300" :
          status === "Rejeté" ? "" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200"
        }>
          {status}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const sample = row.original
      const meta = table.options.meta as any
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Menu</span><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Actions</div>
            <DropdownMenuItem asChild><Link href={`/dashboard/samples/${sample.id}`}><Eye className="mr-2 h-4 w-4"/> Consulter</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href={`/dashboard/samples/${sample.id}/edit`}><Edit className="mr-2 h-4 w-4"/> Modifier</Link></DropdownMenuItem>
            <DropdownMenuItem asChild onClick={() => toast.info("Naviguez vers l'onglet Historique de la fiche échantillon.")}><Link href={`/dashboard/samples/${sample.id}`}><History className="mr-2 h-4 w-4"/> Historique</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => meta?.onAssignLocation(sample)}>
              <MapPin className="mr-2 h-4 w-4 text-orange-500"/> Assigner un emplacement
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => {
              meta?.onPrintLabel(sample)
            }}>
              <Printer className="mr-2 h-4 w-4"/> Étiqueter (Imprimer/PDF)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer" onClick={async () => {
              if (window.confirm("Êtes-vous sûr de vouloir supprimer cet échantillon ?")) {
                const supabase = createClient()
                await supabase.from('samples').delete().eq('id', sample.id)
                toast.success("Échantillon supprimé")
                window.location.reload()
              }
            }}><Trash className="mr-2 h-4 w-4"/> Supprimer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function SamplesDataTable() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [data, setData] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [rowSelection, setRowSelection] = useState({})
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printDialogItems, setPrintDialogItems] = useState<Sample[]>([])
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false)
  const [locationSample, setLocationSample] = useState<Sample | null>(null)
  const supabase = createClient()

  const fetchData = async () => {
    const { data: samples } = await supabase.from('samples').select('*').order('created_at', { ascending: false })
    if (samples) setData(samples)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const unlocatedCount = data.filter(s => s.status === 'À localiser').length

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, rowSelection },
    meta: {
      onPrintLabel: (sample: Sample) => {
        setPrintDialogItems([sample])
        setIsPrintDialogOpen(true)
      },
      onAssignLocation: (sample: Sample) => {
        setLocationSample(sample)
        setIsLocationDialogOpen(true)
      }
    }
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
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center p-4 border-b border-border/50 gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par DCI..."
                value={(table.getColumn("dci")?.getFilterValue() as string) ?? ""}
                onChange={(event) => table.getColumn("dci")?.setFilterValue(event.target.value)}
                className="pl-9 h-9"
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
