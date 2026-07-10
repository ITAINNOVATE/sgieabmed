"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowRightLeft, ArrowUpRight, ArrowDownRight, Plus, ShieldAlert, CheckCircle2, RotateCcw } from "lucide-react"

export default function MovementsPage() {
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Registre des Mouvements</h2>
          <p className="text-muted-foreground text-sm">Traçabilité complète des entrées, sorties et transferts.</p>
        </div>
        <Button className="shadow-sm" asChild><Link href="/dashboard/movements/new"><Plus className="mr-2 h-4 w-4" /> Enregistrer un mouvement</Link></Button>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center"><ArrowRightLeft className="mr-2 h-5 w-5 text-primary" /> Historique des Opérations</CardTitle>
          <CardDescription>Consultez les dernières opérations effectuées sur le stock.</CardDescription>
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
                ) : movements.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun mouvement enregistré.</TableCell></TableRow>
                ) : (
                  movements.map((mvt) => (
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
