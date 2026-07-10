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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Download, FileText, Plus, Search, Eye, Edit, Trash, History } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

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
}

export const columns: ColumnDef<Sample>[] = [
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
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      let variant: "default" | "secondary" | "destructive" | "outline" = "default"
      if (status === "Rejeté") variant = "destructive"
      else if (status === "En quarantaine") variant = "secondary"
      else if (status === "À localiser") variant = "outline"
      return (
        <Badge variant={variant} className={
          status === "En quarantaine" ? "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300" :
          status === "À localiser" ? "bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200" :
          status === "Rejeté" ? "" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200"
        }>
          {status}
        </Badge>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const sample = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Menu</span><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild><Link href={`/dashboard/samples/${sample.id}`}><Eye className="mr-2 h-4 w-4"/> Consulter</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href={`/dashboard/samples/${sample.id}/edit`}><Edit className="mr-2 h-4 w-4"/> Modifier</Link></DropdownMenuItem>
            <DropdownMenuItem asChild onClick={() => toast.info("Naviguez vers l'onglet Historique de la fiche échantillon.")}><Link href={`/dashboard/samples/${sample.id}`}><History className="mr-2 h-4 w-4"/> Historique</Link></DropdownMenuItem>
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
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: samples, error } = await supabase.from('samples').select('*').order('created_at', { ascending: false })
      if (samples) setData(samples)
      setLoading(false)
    }
    fetchData()
  }, [])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
  })

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Répertoire des Échantillons</h2>
          <p className="text-muted-foreground text-sm">Gestion complète du stock pharmaceutique.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="shadow-sm"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          <Button variant="outline" className="shadow-sm"><FileText className="mr-2 h-4 w-4" /> Export PDF</Button>
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
    </div>
  )
}
