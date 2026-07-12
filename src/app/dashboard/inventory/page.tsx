"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ClipboardList, Play, CheckCircle2, AlertTriangle, Search, Filter } from "lucide-react"

export default function InventoryPage() {
  const discrepancies = [
    { lot: "LOT-992A", dci: "Amoxicilline", location: "Magasin Central > Zone A", stock_it: 500, stock_phys: 498, status: "Écart mineur" },
    { lot: "LOT-112B", dci: "Ibuprofène", location: "Magasin Central > Zone B", stock_it: 200, stock_phys: 200, status: "Conforme" },
    { lot: "LOT-334C", dci: "Vaccin Anti-Rabique", location: "Chambre Froide", stock_it: 50, stock_phys: 45, status: "Alerte critique" },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventaire</h2>
          <p className="text-muted-foreground text-sm">Supervision et rapprochement du stock physique et informatique.</p>
        </div>
        <Button className="shadow-sm"><Play className="mr-2 h-4 w-4" /> Démarrer un inventaire</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-border/50 bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <ClipboardList className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-2xl font-bold text-foreground">Inventaire Global 2026</h3>
            <p className="text-sm text-muted-foreground mt-1">En cours de réalisation (65% complété)</p>
            <div className="w-full bg-border rounded-full h-2 mt-4">
              <div className="bg-primary h-2 rounded-full" style={{ width: '65%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center"><AlertTriangle className="mr-2 h-4 w-4 text-warning" /> Analyse des Écarts</CardTitle>
            <CardDescription>Comparatif temps réel entre le système et le comptage physique</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un lot..." className="pl-9 h-9" />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9"><Filter className="h-4 w-4" /></Button>
            </div>
            <div className="overflow-x-auto rounded-md border border-border/50">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Lot / Produit</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead className="text-right">Stock SI</TableHead>
                    <TableHead className="text-right">Stock Physique</TableHead>
                    <TableHead className="text-right">Écart</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discrepancies.map((item, i) => {
                    const diff = item.stock_phys - item.stock_it;
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="font-medium">{item.lot}</div>
                          <div className="text-xs text-muted-foreground">{item.dci}</div>
                        </TableCell>
                        <TableCell className="text-xs">{item.location}</TableCell>
                        <TableCell className="text-right">{item.stock_it}</TableCell>
                        <TableCell className="text-right font-medium">{item.stock_phys}</TableCell>
                        <TableCell className={`text-right font-bold ${diff === 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </TableCell>
                        <TableCell>
                          <Badge variant={diff === 0 ? "default" : diff > -5 ? "secondary" : "destructive"}>{item.status}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-4">
               <Button variant="outline"><CheckCircle2 className="mr-2 h-4 w-4" /> Valider et générer rapport</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
