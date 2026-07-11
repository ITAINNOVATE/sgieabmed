"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Trash2, Search, Filter, Flame, Eye, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function WasteClient({ initialBatches }: { initialBatches: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredBatches = initialBatches.filter(batch => 
    batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.waste_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (batch.sample && batch.sample.commercial_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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
            Gestion des Déchets Pharmaceutiques
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
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher (N° lot, type, nom...)"
                  className="pl-9 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="shrink-0 bg-background"><Filter className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border/50 overflow-hidden">
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
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`/dashboard/waste/${batch.id}`}><Eye className="mr-2 h-4 w-4" /> Voir détails</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">
                              Contrôler le lot
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-blue-600">
                              Imprimer QR Code
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
