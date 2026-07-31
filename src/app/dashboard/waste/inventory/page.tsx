"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClipboardCheck, AlertTriangle, CheckCircle2, Search, Trash2, Plus, Eye } from "lucide-react"

const MOCK_WASTE_INVENTORIES = [
  { id: '1', inv_number: 'INV-W-2026-001', date: '2026-01-15T08:00:00.000Z', location: 'Local Déchets A1', system_weight: 150, physical_weight: 148, diff: -2, status: 'Validé avec écart', items_count: 12 },
  { id: '2', inv_number: 'INV-W-2026-002', date: '2026-02-10T10:30:00.000Z', location: 'Zone Quarantaine C2', system_weight: 45, physical_weight: 45, diff: 0, status: 'Validé', items_count: 5 },
  { id: '3', inv_number: 'INV-W-2026-003', date: '2026-03-01T09:00:00.000Z', location: 'Local DASRI B', system_weight: 230, physical_weight: 230, diff: 0, status: 'Validé', items_count: 18 },
  { id: '4', inv_number: 'INV-W-2026-004', date: '2026-03-20T14:15:00.000Z', location: 'Local Déchets A2', system_weight: 92, physical_weight: 90, diff: -2, status: 'En cours', items_count: 8 },
]

export default function WasteInventoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredInventories = MOCK_WASTE_INVENTORIES.filter(inv => {
    const matchesSearch = 
      inv.inv_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.location.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-red-600" />
            Inventaires & Contrôles des Déchets
          </h2>
          <p className="text-muted-foreground text-xs">Contrôle périodique des masses, contenants et décompte des lots du local déchet.</p>
        </div>
        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-2xs text-xs font-bold gap-1.5 h-8 px-3 border-0">
          <Plus className="h-3.5 w-3.5" /> Lancer un inventaire déchet
        </Button>
      </div>

      {/* KPI METRIQUES INVENTAIRES DÉCHETS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-red-500/10 p-2 rounded-lg"><ClipboardCheck className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inventaires Déchets 2026</p>
              <h3 className="text-xl font-black text-foreground">4 Réalisés</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Taux de Conformité Masse</p>
              <h3 className="text-xl font-black text-foreground">98.8%</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Écarts Relevés (Pertes/Séchage)</p>
              <h3 className="text-xl font-black text-foreground">-4 Kg Total</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLEAU DES INVENTAIRES DÉCHETS (COMPACT 1-ÉCRAN) */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sessions d'Inventaires des Déchets ({filteredInventories.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par N°, zone..."
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
                  <TableHead className="py-2 text-[11px] font-bold uppercase pl-4">N° Inventaire Déchet</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Date</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Zone Stockage Déchet</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Masse Système</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Masse Pesée</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Écart Masse</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Statut</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventories.slice(0, 5).map((inv) => (
                  <TableRow key={inv.id} className="text-xs hover:bg-muted/30">
                    <TableCell className="pl-4 font-bold text-foreground font-mono py-2">{inv.inv_number}</TableCell>
                    <TableCell className="py-2 text-muted-foreground">{new Date(inv.date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="py-2 font-semibold">{inv.location}</TableCell>
                    <TableCell className="py-2 text-right tabular-nums font-medium">{inv.system_weight} Kg</TableCell>
                    <TableCell className="py-2 text-right tabular-nums font-medium">{inv.physical_weight} Kg</TableCell>
                    <TableCell className="py-2 text-right tabular-nums font-bold">
                      <span className={inv.diff === 0 ? "text-emerald-700" : "text-red-600"}>
                        {inv.diff > 0 ? `+${inv.diff}` : inv.diff} Kg
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge className={`text-[10px] ${
                        inv.status === 'Validé' ? 'bg-emerald-100 text-emerald-800' :
                        inv.status === 'Validé avec écart' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right pr-4">
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-red-600 font-bold hover:bg-red-50">
                        <Eye className="h-3.5 w-3.5 mr-1" /> Détail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
