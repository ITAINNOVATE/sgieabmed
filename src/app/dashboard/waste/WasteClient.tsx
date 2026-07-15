"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Trash2, Search, Filter, Flame, Eye, MoreHorizontal, Printer, Download } from "lucide-react"
import { toast } from "sonner"
import { generateQRCodeDataUrl } from "@/utils/qrCode"
import { printLabel, downloadLabelPDF } from "@/utils/printUtils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function WasteClient({ initialBatches }: { initialBatches: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredBatches = initialBatches.filter(batch => {
    const matchesSearch = 
      batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.waste_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch.sample && batch.sample.commercial_name?.toLowerCase().includes(searchTerm.toLowerCase()))
      
    const matchesStatus = statusFilter === "all" || batch.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Déclaré': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'En contrôle': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Validé': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'En attente de destruction': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Détruit': return 'bg-red-100 text-red-800 border-red-200'
      case 'Archivé': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center">
            <Trash2 className="mr-3 h-6 w-6 text-primary" />
            Liste des déchets
          </h2>
          <p className="text-muted-foreground mt-1">Gérez le cycle de vie, la déclaration et le contrôle des déchets (PSQIF).</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" asChild className="gap-2 bg-background shadow-sm">
            <Link href="/dashboard/destructions"><Flame className="h-4 w-4 text-orange-500" /> Planifier Destruction</Link>
          </Button>
          <Button asChild className="gap-2 shadow-md">
            <Link href="/dashboard/waste/new"><Plus className="h-4 w-4" /> Déclarer un lot</Link>
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Lots de déchets enregistrés</CardTitle>
              <CardDescription>Liste exhaustive des déchets en attente ou détruits.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher (N° lot, type, nom...)"
                  className="pl-9 bg-background h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="h-9 w-full sm:w-44 bg-background">
                  <SelectValue placeholder="Statut du déchet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="Déclaré">Déclaré</SelectItem>
                  <SelectItem value="En contrôle">En contrôle</SelectItem>
                  <SelectItem value="Validé">Validé</SelectItem>
                  <SelectItem value="En attente de destruction">En attente de destruction</SelectItem>
                  <SelectItem value="Détruit">Détruit</SelectItem>
                  <SelectItem value="Archivé">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>N° Lot</TableHead>
                  <TableHead>Type de déchet</TableHead>
                  <TableHead>Produit d'origine</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                      Aucun déchet enregistré.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBatches.map((batch) => (
                    <TableRow key={batch.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium font-mono text-xs">{batch.batch_number}</TableCell>
                      <TableCell>{batch.waste_type}</TableCell>
                      <TableCell>
                        {batch.sample ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">{batch.sample.commercial_name}</span>
                            <span className="text-xs text-muted-foreground">{batch.sample.batch_number}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Non lié à un produit du stock</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono bg-background">
                          {batch.quantity} {batch.unit}
                        </Badge>
                      </TableCell>
                      <TableCell>{batch.current_location || <span className="text-muted-foreground italic">Non défini</span>}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(batch.status)} font-medium`} variant="outline">
                          {batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Actions</div>
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`/dashboard/waste/${batch.id}`}><Eye className="mr-2 h-4 w-4" /> Voir détails</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer" onClick={async () => {
                              const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eged-abmed.gov.bj'
                              const url = `${origin}/dashboard/waste/${batch.id}`
                              const qrUrl = await generateQRCodeDataUrl(url)
                              if (qrUrl) {
                                printLabel({
                                  itemNumber: batch.batch_number,
                                  productName: batch.sample ? `DECHET : ${batch.sample.commercial_name}` : `DECHET : ${batch.waste_type}`,
                                  batchNumber: batch.sample?.batch_number || 'N/A',
                                  qrCodeUrl: qrUrl
                                })
                                toast.success("Impression de l'étiquette lancée")
                              }
                            }}>
                              <Printer className="mr-2 h-4 w-4" /> Imprimer l&apos;étiquette
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={async () => {
                              const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eged-abmed.gov.bj'
                              const url = `${origin}/dashboard/waste/${batch.id}`
                              const qrUrl = await generateQRCodeDataUrl(url)
                              if (qrUrl) {
                                downloadLabelPDF({
                                  itemNumber: batch.batch_number,
                                  productName: batch.sample ? `DECHET : ${batch.sample.commercial_name}` : `DECHET : ${batch.waste_type}`,
                                  batchNumber: batch.sample?.batch_number || 'N/A',
                                  qrCodeUrl: qrUrl
                                })
                              }
                            }}>
                              <Download className="mr-2 h-4 w-4" /> Télécharger l&apos;étiquette (PDF)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
