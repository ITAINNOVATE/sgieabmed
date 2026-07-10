"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PackageCheck, Plus, Clock, CheckCircle2, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function ReceptionsPage() {
  const receptions = [
    { id: "REC-2026-089", date: "09/07/2026", supplier: "Sanofi Aventis", items: 4, status: "En attente d'inspection", priority: "Haute" },
    { id: "REC-2026-088", date: "08/07/2026", supplier: "Pfizer", items: 12, status: "Validé", priority: "Normale" },
    { id: "REC-2026-087", date: "05/07/2026", supplier: "Moderna", items: 2, status: "Validé", priority: "Normale" },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Réceptions</h2>
          <p className="text-muted-foreground text-sm">Gestion des entrées d'échantillons et inspections à réception.</p>
        </div>
        <Button className="shadow-sm" asChild>
          <Link href="/dashboard/receptions/new">
            <Plus className="mr-2 h-4 w-4" /> Enregistrer une réception
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl"><PackageCheck className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Réceptions du mois</p>
              <h3 className="text-2xl font-bold">124</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-warning/10 p-3 rounded-xl"><Clock className="h-6 w-6 text-warning" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">En attente d'inspection</p>
              <h3 className="text-2xl font-bold">3</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historique des arrivages</CardTitle>
          <CardDescription>Suivez l'état de traitement des lots reçus.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border/50">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>N° Bon de réception</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fournisseur / Labo</TableHead>
                  <TableHead className="text-center">Nb. Échantillons</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receptions.map((rec, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{rec.id}</TableCell>
                    <TableCell>{rec.date}</TableCell>
                    <TableCell>{rec.supplier}</TableCell>
                    <TableCell className="text-center font-medium">{rec.items}</TableCell>
                    <TableCell>
                      <Badge variant={rec.status === "Validé" ? "default" : "secondary"}>
                        {rec.status === "Validé" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="w-full">Ouvrir <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
