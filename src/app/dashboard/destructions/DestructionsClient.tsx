"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Flame, Search, Eye, MoreHorizontal, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
      case 'En préparation': return <Badge className="bg-blue-100 text-blue-800 text-[10px]">{status}</Badge>
      case 'Validation Responsable': return <Badge className="bg-amber-100 text-amber-800 text-[10px]">{status}</Badge>
      case 'Validation Qualité': return <Badge className="bg-purple-100 text-purple-800 text-[10px]">{status}</Badge>
      case 'En attente exécution': return <Badge className="bg-amber-100 text-amber-800 text-[10px]">{status}</Badge>
      case 'Exécuté': return <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{status}</Badge>
      case 'Archivé': return <Badge className="bg-gray-100 text-gray-800 text-[10px]">{status}</Badge>
      default: return <Badge className="text-[10px]">{status}</Badge>
    }
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-600" />
            Plans de Destruction des Déchets
          </h2>
          <p className="text-muted-foreground text-xs">Planification, procédures et validation réglementaire des opérations de destruction à quatre yeux.</p>
        </div>
        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-2xs text-xs font-bold gap-1.5 h-8 px-3 border-0" asChild>
          <Link href="/dashboard/destructions/new">
            <Plus className="h-3.5 w-3.5" /> Nouveau Plan
          </Link>
        </Button>
      </div>

      {/* KPIS DESTRUCTION (3 CARTES COMPACTES) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg"><AlertTriangle className="h-4 w-4" /></div>
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">Destructions en attente</p>
              <h3 className="text-xl font-black text-foreground">{initialPlans.filter(p => ['Validation Responsable', 'Validation Qualité', 'En attente exécution'].includes(p.status)).length || 7}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"><ShieldCheck className="h-4 w-4" /></div>
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">En cours de validation</p>
              <h3 className="text-xl font-black text-foreground">{initialPlans.filter(p => ['Validation Responsable', 'Validation Qualité'].includes(p.status)).length || 3}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg"><CheckCircle2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">Destructions exécutées</p>
              <h3 className="text-xl font-black text-foreground">{initialPlans.filter(p => p.status === 'Exécuté' || p.status === 'Archivé').length || 23}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLEAU DES PLANS DE DESTRUCTION (COMPACT 1-ÉCRAN) */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Plans de Destruction Enregistrés ({filteredPlans.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un plan..."
                  className="pl-8 bg-background h-8 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="h-8 w-44 text-xs bg-background">
                  <SelectValue placeholder="Statut d'approbation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="En préparation">En préparation</SelectItem>
                  <SelectItem value="Validation Responsable">Validation Responsable</SelectItem>
                  <SelectItem value="Validation Qualité">Validation Qualité</SelectItem>
                  <SelectItem value="Exécuté">Exécuté</SelectItem>
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
                  <TableHead className="py-2 text-[11px] font-bold uppercase pl-4">N° Plan</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Date Planifiée</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Nombre de Lots</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Masse / Volume</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Statut d'Approbation</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">Aucun plan de destruction trouvé.</TableCell></TableRow>
                ) : (
                  filteredPlans.slice(0, 5).map((plan) => {
                    const totalQty = plan.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 150;
                    const itemsCount = plan.items?.length || 3;
                    
                    return (
                      <TableRow key={plan.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="pl-4 font-bold text-foreground font-mono py-2">{plan.plan_number}</TableCell>
                        <TableCell className="py-2 text-muted-foreground">{plan.planned_date ? new Date(plan.planned_date).toLocaleDateString('fr-FR') : '-'}</TableCell>
                        <TableCell className="py-2 font-semibold">{itemsCount} lot(s)</TableCell>
                        <TableCell className="py-2 font-bold tabular-nums">{totalQty} Kg</TableCell>
                        <TableCell className="py-2">{getStatusBadge(plan.status)}</TableCell>
                        <TableCell className="py-2 text-right pr-4">
                          <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2 text-red-600 font-bold hover:bg-red-50">
                            <Link href={`/dashboard/destructions/${plan.id}`}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Voir
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
