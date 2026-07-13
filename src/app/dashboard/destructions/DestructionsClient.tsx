"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Flame, Search, Filter, Eye, MoreHorizontal, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function DestructionsClient({ initialPlans }: { initialPlans: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredPlans = initialPlans.filter(plan => {
    const matchesSearch = 
      plan.plan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.status.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesStatus = statusFilter === "all" || plan.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'En préparation': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">{status}</Badge>
      case 'Validation Responsable': return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">{status}</Badge>
      case 'Validation Qualité': return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">{status}</Badge>
      case 'En attente exécution': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">{status}</Badge>
      case 'Exécuté': return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">{status}</Badge>
      case 'Archivé': return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">{status}</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center">
            <Flame className="mr-3 h-6 w-6 text-orange-500" />
            Plans de Destruction
          </h2>
          <p className="text-muted-foreground mt-1">Gérez la planification et la validation des destructions à quatre yeux.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button asChild className="gap-2 shadow-md bg-orange-600 hover:bg-orange-700 text-white">
            <Link href="/dashboard/destructions/new"><Plus className="h-4 w-4" /> Nouveau Plan</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm bg-orange-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><AlertTriangle className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Destructions en attente</p>
              <h3 className="text-2xl font-bold">{initialPlans.filter(p => ['Validation Responsable', 'Validation Qualité', 'En attente exécution'].includes(p.status)).length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-blue-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><ShieldCheck className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">En cours de validation</p>
              <h3 className="text-2xl font-bold">{initialPlans.filter(p => ['Validation Responsable', 'Validation Qualité'].includes(p.status)).length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-emerald-50/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Destructions exécutées</p>
              <h3 className="text-2xl font-bold">{initialPlans.filter(p => p.status === 'Exécuté' || p.status === 'Archivé').length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Plans de destruction</CardTitle>
              <CardDescription>Liste des opérations planifiées et leur statut de validation.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un plan..."
                  className="pl-9 bg-background h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="h-9 w-full sm:w-44 bg-background">
                  <SelectValue placeholder="Statut d'approbation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="En préparation">En préparation</SelectItem>
                  <SelectItem value="Validation Responsable">Validation Responsable</SelectItem>
                  <SelectItem value="Validation Qualité">Validation Qualité</SelectItem>
                  <SelectItem value="En attente exécution">En attente exécution</SelectItem>
                  <SelectItem value="Exécuté">Exécuté</SelectItem>
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
                  <TableHead>N° Plan</TableHead>
                  <TableHead>Date planifiée</TableHead>
                  <TableHead>Nb. de lots</TableHead>
                  <TableHead>Volume total</TableHead>
                  <TableHead>Statut d'approbation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                      Aucun plan de destruction trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((plan) => {
                    const totalQty = plan.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;
                    const itemsCount = plan.items?.length || 0;
                    
                    return (
                    <TableRow key={plan.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium font-mono text-xs">{plan.plan_number}</TableCell>
                      <TableCell>{plan.planned_date ? new Date(plan.planned_date).toLocaleDateString('fr-FR') : '-'}</TableCell>
                      <TableCell>{itemsCount} lot(s)</TableCell>
                      <TableCell>{totalQty} {plan.items?.[0]?.waste_batch?.unit || 'unités'}</TableCell>
                      <TableCell>{getStatusBadge(plan.status)}</TableCell>
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
                              <Link href={`/dashboard/destructions/${plan.id}`}><Eye className="mr-2 h-4 w-4" /> Voir détails / Valider</Link>
                            </DropdownMenuItem>
                            {plan.status === 'En préparation' && (
                              <DropdownMenuItem className="cursor-pointer">
                                Soumettre pour validation
                              </DropdownMenuItem>
                            )}
                            {plan.status === 'Exécuté' && (
                              <DropdownMenuItem className="cursor-pointer text-blue-600">
                                Télécharger le certificat
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )})
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
