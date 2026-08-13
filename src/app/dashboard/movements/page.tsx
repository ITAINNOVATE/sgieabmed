"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRightLeft, ArrowUpRight, ArrowDownRight, Plus, ShieldAlert, CheckCircle2, RotateCcw, Search } from "lucide-react"

const MOCK_MOVEMENTS = [
  { id: '1', mvt_number: 'MVT-2026-001', movement_date: '2026-01-15T10:00:00.000Z', movement_type: 'Entrée', quantity: 150, commercial_name: 'AMOXICILLINE 500MG', batch_number: 'LOT-8832', operator: 'JEAN DUPONT' },
  { id: '2', mvt_number: 'MVT-2026-002', movement_date: '2026-02-02T14:30:00.000Z', movement_type: 'Transfert', quantity: 50, commercial_name: 'PARACÉTAMOL 1G', batch_number: 'LOT-1192', operator: 'MARIE ADANDE' },
  { id: '3', mvt_number: 'MVT-2026-003', movement_date: '2026-02-18T09:15:00.000Z', movement_type: 'Mise en quarantaine', quantity: 20, commercial_name: 'IBUPROFÈNE 400MG', batch_number: 'LOT-9920', operator: 'CHANTAL HOUENOU' },
  { id: '4', mvt_number: 'MVT-2026-004', movement_date: '2026-03-05T11:00:00.000Z', movement_type: 'Sortie', quantity: 10, commercial_name: 'CÉFOTAXIME 1G', batch_number: 'LOT-7331', operator: 'PAUL AGOSSA' },
  { id: '5', mvt_number: 'MVT-2026-005', movement_date: '2026-03-22T15:45:00.000Z', movement_type: 'Libération de quarantaine', quantity: 20, commercial_name: 'IBUPROFÈNE 400MG', batch_number: 'LOT-9920', operator: 'DR. KADIA BARRY' },
]

export default function MovementsPage() {
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const supabase = createClient()

  useEffect(() => {
    async function fetchMovements() {
      const { data } = await supabase
        .from('movements')
        .select(`
          id, mvt_number, movement_date, movement_type, quantity,
          samples ( commercial_name, batch_number )
        `)
        .order('movement_date', { ascending: false });

      if (data && data.length > 0) {
        setMovements(data.map((m: any) => ({
          ...m,
          commercial_name: Array.isArray(m.samples) ? m.samples[0]?.commercial_name : m.samples?.commercial_name,
          batch_number: Array.isArray(m.samples) ? m.samples[0]?.batch_number : m.samples?.batch_number,
          operator: 'Système'
        })))
      } else {
        setMovements(MOCK_MOVEMENTS)
      }
      setLoading(false);
    }
    fetchMovements();
  }, [supabase])

  const filteredMovements = movements.filter(mvt => {
    const matchesSearch = 
      (mvt.mvt_number && mvt.mvt_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mvt.commercial_name && mvt.commercial_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mvt.batch_number && mvt.batch_number.toLowerCase().includes(searchTerm.toLowerCase()))
      
    const matchesType = typeFilter === "all" || mvt.movement_type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-[#1B5C2E]" />
            Mouvements & Cartographie Échantillons
          </h2>
          <p className="text-muted-foreground text-xs">Traçabilité complète des entrées, sorties, transferts et mises en quarantaine.</p>
        </div>
        <Button size="sm" className="bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-2xs text-xs font-bold gap-1.5 h-8 px-3 border-0" asChild>
          <Link href="/dashboard/movements/new">
            <Plus className="h-3.5 w-3.5" /> Enregistrer un mouvement
          </Link>
        </Button>
      </div>

      {/* CARTE DE TABLEAU COMPACT STATIQUE 1-ÉCRAN */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Historique des Opérations de Stock ({filteredMovements.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par produit, lot, N°..."
                  className="pl-8 bg-background h-8 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
                <SelectTrigger className="h-8 w-44 text-xs bg-background">
                  <SelectValue placeholder="Type de mouvement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="Entrée">Entrée</SelectItem>
                  <SelectItem value="Sortie">Sortie</SelectItem>
                  <SelectItem value="Déplacer vers autre localisation">Déplacer vers autre localisation</SelectItem>
                  <SelectItem value="Contrôle qualité">Contrôle qualité</SelectItem>
                  <SelectItem value="Mise en quarantaine">Mise en quarantaine</SelectItem>
                  <SelectItem value="Libération de quarantaine">Libération de quarantaine</SelectItem>
                  <SelectItem value="Transfert vers Magasin des déchets">Transfert vers Magasin des déchets</SelectItem>
                  <SelectItem value="Correction d'inventaire">Correction d'inventaire</SelectItem>
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
                  <TableHead className="py-2 text-[11px] font-bold uppercase pl-4">N° Mouvement</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Date & Heure</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Type Opération</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Échantillon / Lot</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Quantité</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Opérateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">Chargement des mouvements...</TableCell></TableRow>
                ) : filteredMovements.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">Aucun mouvement enregistré.</TableCell></TableRow>
                ) : (
                  filteredMovements.slice(0, 5).map((mvt) => (
                    <TableRow key={mvt.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="pl-4 font-bold text-foreground font-mono py-2">{mvt.mvt_number || mvt.id.substring(0,8)}</TableCell>
                      <TableCell className="py-2 text-muted-foreground">{new Date(mvt.movement_date || Date.now()).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="py-2">
                        <Badge className={`text-[10px] gap-1 ${
                          ["Sortie", "Transfert vers Magasin des déchets", "Destruction"].includes(mvt.movement_type) ? 'bg-red-100 text-red-800' : 
                          ["Entrée", "Contrôle qualité", "Retour d'analyse"].includes(mvt.movement_type) ? 'bg-emerald-100 text-emerald-800' : 
                          mvt.movement_type === 'Mise en quarantaine' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {["Sortie", "Transfert vers Magasin des déchets", "Destruction"].includes(mvt.movement_type) && <ArrowUpRight className="h-3 w-3" />}
                          {["Entrée", "Contrôle qualité", "Retour d'analyse"].includes(mvt.movement_type) && <ArrowDownRight className="h-3 w-3" />}
                          {["Déplacer vers autre localisation", "Transfert"].includes(mvt.movement_type) && <ArrowRightLeft className="h-3 w-3" />}
                          {mvt.movement_type === 'Mise en quarantaine' && <ShieldAlert className="h-3 w-3" />}
                          {mvt.movement_type === 'Libération de quarantaine' && <CheckCircle2 className="h-3 w-3" />}
                          {mvt.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 font-semibold text-foreground uppercase">
                        {mvt.commercial_name || 'Échantillon'} <span className="text-muted-foreground text-[11px] font-normal">(Lot: {mvt.batch_number || 'N/A'})</span>
                      </TableCell>
                      <TableCell className="py-2 text-right font-bold tabular-nums">{mvt.quantity}</TableCell>
                      <TableCell className="py-2 text-right pr-4 text-muted-foreground">{mvt.operator || 'Opérateur'}</TableCell>
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
