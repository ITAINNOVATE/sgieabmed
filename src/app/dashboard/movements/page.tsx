"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowRightLeft, ArrowUpRight, ArrowDownRight, Plus } from "lucide-react"

export default function MovementsPage() {
  const movements = [
    { id: "MVT-890", date: "Aujourd'hui, 10:23", type: "Sortie", product: "Paracétamol 500mg", quantity: 50, user: "Dr. Kadia Barry" },
    { id: "MVT-889", date: "Hier, 14:10", type: "Entrée", product: "Vaccin Anti-Rabique", quantity: 200, user: "M. Ousmane Sylla" },
    { id: "MVT-888", date: "Hier, 09:45", type: "Transfert", product: "Ibuprofène 400mg", quantity: 15, user: "M. Ousmane Sylla" },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Registre des Mouvements</h2>
          <p className="text-muted-foreground text-sm">Traçabilité complète des entrées, sorties et transferts.</p>
        </div>
        <Button className="shadow-sm"><Plus className="mr-2 h-4 w-4" /> Enregistrer un mouvement</Button>
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
                {movements.map((mvt, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{mvt.id}</TableCell>
                    <TableCell className="text-muted-foreground">{mvt.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        mvt.type === 'Sortie' ? 'text-destructive border-destructive/30 bg-destructive/5' : 
                        mvt.type === 'Entrée' ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5' : 
                        'text-primary border-primary/30 bg-primary/5'
                      }>
                        {mvt.type === 'Sortie' && <ArrowUpRight className="mr-1 h-3 w-3" />}
                        {mvt.type === 'Entrée' && <ArrowDownRight className="mr-1 h-3 w-3" />}
                        {mvt.type === 'Transfert' && <ArrowRightLeft className="mr-1 h-3 w-3" />}
                        {mvt.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{mvt.product}</TableCell>
                    <TableCell className="text-right font-medium">{mvt.quantity}</TableCell>
                    <TableCell className="text-sm">{mvt.user}</TableCell>
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
