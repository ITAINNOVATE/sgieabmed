"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PackageCheck, Plus, Clock, CheckCircle2, ArrowRight } from "lucide-react"
import Link from "next/link"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

export default function ReceptionsPage() {
  const [receptions, setReceptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('receptions')
        .select(`
          id,
          rec_number,
          date_reception,
          supplier,
          status,
          samples ( count )
        `)
        .order('created_at', { ascending: false })
      
      if (data) {
        setReceptions(data)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Réception</h2>
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
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Chargement des données...</TableCell></TableRow>
                ) : receptions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucune réception trouvée.</TableCell></TableRow>
                ) : (
                  receptions.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">{rec.rec_number}</TableCell>
                      <TableCell>{new Date(rec.date_reception).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{rec.supplier || 'N/A'}</TableCell>
                      <TableCell className="text-center font-medium">{rec.samples?.[0]?.count ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={rec.status === "Validée" ? "default" : "secondary"}>
                          {rec.status === "Validée" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {rec.status || 'En attente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="w-full">Ouvrir <ArrowRight className="ml-2 h-4 w-4" /></Button>
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
