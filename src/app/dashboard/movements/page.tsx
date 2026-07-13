"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRightLeft, ArrowUpRight, ArrowDownRight, Plus, ShieldAlert, CheckCircle2, RotateCcw, Search, Filter } from "lucide-react"

export default function MovementsPage() {
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const supabase = createClient()

  useEffect(() => {
    async function fetchMovements() {
      const { data, error } = await supabase
        .from('movements')
        .select(`
          id, mvt_number, movement_date, movement_type, quantity,
          samples ( commercial_name, batch_number )
        `)
        .order('movement_date', { ascending: false });

      if (data) setMovements(data);
      setLoading(false);
    }
    fetchMovements();
  }, [])

  const filteredMovements = movements.filter(mvt => {
    const matchesSearch = 
      (mvt.mvt_number && mvt.mvt_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      mvt.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mvt.samples && mvt.samples.commercial_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mvt.samples && mvt.samples.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()))
      
    const matchesType = typeFilter === "all" || mvt.movement_type === typeFilter
    
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Historique des mouvements</h2>
          <p className="text-muted-foreground text-sm">Traçabilité complète des entrées, sorties et transferts.</p>
        </div>
        <Button className="shadow-sm" asChild><Link href="/dashboard/movements/new"><Plus className="mr-2 h-4 w-4" /> Enregistrer un mouvement</Link></Button>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base font-semibold">Historique des Opérations</CardTitle>
                <CardDescription>Consultez les dernières opérations effectuées sur le stock.</CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par produit, lot, N°..."
                  className="pl-9 bg-background h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
                <SelectTrigger className="h-9 w-full sm:w-44 bg-background">
                  <SelectValue placeholder="Type de mouvement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="Entrée">Entrée</SelectItem>
                  <SelectItem value="Sortie">Sortie</SelectItem>
                  <SelectItem value="Transfert">Transfert</SelectItem>
                  <SelectItem value="Mise en quarantaine">Mise en quarantaine</SelectItem>
                  <SelectItem value="Libération de quarantaine">Libération de quarantaine</SelectItem>
                  <SelectItem value="Destruction">Destruction</SelectItem>
                  <SelectItem value="Retour d'analyse">Retour d'analyse</SelectItem>
                  <SelectItem value="Correction d'inventaire">Correction d'inventaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border/50">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>N° Mouvement</TableHead>
                  <TableHead>Date et Heure</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Produit / Lot</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead>Opérateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">Chargement des mouvements...</TableCell></TableRow>
                ) : filteredMovements.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun mouvement enregistré.</TableCell></TableRow>
                ) : (
                  filteredMovements.map((mvt) => (
                    <TableRow key={mvt.id}>
                      <TableCell className="font-medium">{mvt.mvt_number || mvt.id.substring(0,8)}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(mvt.movement_date || mvt.created_at || Date.now()).toLocaleString("fr-FR")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          ["Sortie", "Destruction"].includes(mvt.movement_type) ? 'text-destructive border-destructive/30 bg-destructive/5' : 
                          ["Entrée", "Retour d'analyse"].includes(mvt.movement_type) ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5' : 
                          mvt.movement_type === 'Mise en quarantaine' ? 'text-warning border-warning/30 bg-warning/5' :
                          'text-primary border-primary/30 bg-primary/5'
                        }>
                          {["Sortie", "Destruction"].includes(mvt.movement_type) && <ArrowUpRight className="mr-1 h-3 w-3" />}
                          {["Entrée", "Retour d'analyse"].includes(mvt.movement_type) && <ArrowDownRight className="mr-1 h-3 w-3" />}
                          {mvt.movement_type === 'Transfert' && <ArrowRightLeft className="mr-1 h-3 w-3" />}
                          {mvt.movement_type === 'Mise en quarantaine' && <ShieldAlert className="mr-1 h-3 w-3" />}
                          {mvt.movement_type === 'Libération de quarantaine' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {mvt.movement_type === "Correction d'inventaire" && <RotateCcw className="mr-1 h-3 w-3" />}
                          {mvt.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{mvt.samples?.commercial_name} <span className="text-muted-foreground text-xs font-normal ml-2">Lot: {mvt.samples?.batch_number}</span></TableCell>
                      <TableCell className="text-right font-medium">{mvt.quantity}</TableCell>
                      <TableCell className="text-sm">Système / Opérateur</TableCell>
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
