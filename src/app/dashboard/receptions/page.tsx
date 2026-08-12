"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PackageCheck, Plus, Clock, CheckCircle2, ArrowRight, Search, Filter } from "lucide-react"
import Link from "next/link"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

export default function ReceptionsPage() {
  const [receptions, setReceptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      let remoteData: any[] = []
      try {
        const { data } = await supabase
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
        if (data && data.length > 0) {
          remoteData = data
        }
      } catch (err) {
        console.warn("Erreur chargement distant réceptions:", err)
      }

      let localData: any[] = []
      try {
        localData = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
      } catch (e) {}

      // Fusionner les enregistrements sans doublons par rec_number
      const mergedMap = new Map<string, any>()
      localData.forEach(item => {
        if (item.rec_number) mergedMap.set(item.rec_number, item)
      })
      remoteData.forEach(item => {
        if (item.rec_number) mergedMap.set(item.rec_number, item)
      })

      const mergedList = Array.from(mergedMap.values())
      setReceptions(mergedList)
      setLoading(false)
    }
    fetchData()
  }, [])

  const filteredReceptions = receptions.filter(rec => {
    const matchesSearch = 
      rec.rec_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.supplier && rec.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const isFinalized = rec.status === "Validée" || rec.status === "Finalisé" || rec.status === "Finalisée"
    const isInProgress = rec.status === "En cours" || rec.status === "Brouillon" || rec.status === "En attente" || !rec.status
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "finalise" && isFinalized) ||
      (statusFilter === "en_cours" && isInProgress)
      
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight">Réception des Échantillons</h2>
          <p className="text-muted-foreground text-xs">Gestion des entrées d'échantillons et inspections à réception.</p>
        </div>
        <Button size="sm" className="bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-2xs text-xs font-bold gap-1.5 h-8.5 px-3" asChild>
          <Link href="/dashboard/receptions/new">
            <Plus className="h-3.5 w-3.5" /> Enregistrer une réception
          </Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-[#1B5C2E]/10 p-2 rounded-lg"><PackageCheck className="h-5 w-5 text-[#1B5C2E]" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Réceptions du mois</p>
              <h3 className="text-xl font-black text-foreground">{receptions.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">En cours / En attente</p>
              <h3 className="text-xl font-black text-foreground">
                {receptions.filter(r => r.status === "En cours" || r.status === "Brouillon" || r.status === "En attente" || !r.status).length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Historique des arrivages</CardTitle>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Boutons de filtre de statut rapide */}
              <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border/50">
                <Button
                  type="button"
                  variant={statusFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5 rounded-md font-semibold"
                  onClick={() => setStatusFilter("all")}
                >
                  Tous
                </Button>
                <Button
                  type="button"
                  variant={statusFilter === "en_cours" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5 rounded-md font-semibold"
                  onClick={() => setStatusFilter("en_cours")}
                >
                  En cours
                </Button>
                <Button
                  type="button"
                  variant={statusFilter === "finalise" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5 rounded-md font-semibold"
                  onClick={() => setStatusFilter("finalise")}
                >
                  Finalisé
                </Button>
              </div>

              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-8 bg-background h-7 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">N° Bon</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Date</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Demandeur / Fournisseur</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-center">Nb. Échantillons</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Statut</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">Chargement...</TableCell></TableRow>
                ) : filteredReceptions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">Aucune réception trouvée.</TableCell></TableRow>
                ) : (
                  filteredReceptions.map((rec) => {
                    const isFinalized = rec.status === "Validée" || rec.status === "Finalisé" || rec.status === "Finalisée"
                    const displayStatus = isFinalized ? "Finalisé" : "En cours"
                    return (
                      <TableRow key={rec.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-bold text-foreground py-2">{rec.rec_number}</TableCell>
                        <TableCell className="py-2 text-muted-foreground">
                          {rec.date_reception ? new Date(rec.date_reception).toLocaleDateString("fr-FR") : '-'}
                        </TableCell>
                        <TableCell className="py-2">{rec.supplier || 'N/A'}</TableCell>
                        <TableCell className="py-2 text-center font-bold">{rec.samples?.[0]?.count ?? 0}</TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className={`text-[10px] font-semibold border ${isFinalized ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-amber-50 text-amber-700 border-amber-300"}`}>
                            {displayStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right pr-4">
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-[#1B5C2E] font-bold hover:bg-[#1B5C2E]/10" asChild>
                            <Link href={`/dashboard/receptions/new?id=${rec.id}`}>
                              Ouvrir <ArrowRight className="ml-1 h-3 w-3" />
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
