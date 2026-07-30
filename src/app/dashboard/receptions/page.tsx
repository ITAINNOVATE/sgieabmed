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

  const filteredReceptions = receptions.filter(rec => {
    const matchesSearch = 
      rec.rec_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.supplier && rec.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "validee" && rec.status === "Validée") ||
      (statusFilter === "en_attente" && (rec.status === "En cours" || rec.status === "En attente" || !rec.status))
      
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
              <h3 className="text-xl font-black text-foreground">124</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">En attente d'inspection</p>
              <h3 className="text-xl font-black text-foreground">3</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Historique des arrivages</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
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
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="validee">Validées</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
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
                  <TableHead className="py-2 text-[11px] font-bold uppercase">N° Bon</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Date</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Fournisseur</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-center">Nb. Échantillons</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Statut</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">Chargement...</TableCell></TableRow>
                ) : filteredReceptions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">Aucune réception enregistrée.</TableCell></TableRow>
                ) : (
                  filteredReceptions.slice(0, 5).map((rec) => (
                    <TableRow key={rec.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-bold text-foreground py-2">{rec.rec_number}</TableCell>
                      <TableCell className="py-2 text-muted-foreground">{new Date(rec.date_reception).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="py-2">{rec.supplier || 'N/A'}</TableCell>
                      <TableCell className="py-2 text-center font-bold">{rec.samples?.[0]?.count ?? 0}</TableCell>
                      <TableCell className="py-2">
                        <Badge className={`text-[10px] ${rec.status === "Validée" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {rec.status || 'En attente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right pr-4">
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-[#1B5C2E] font-bold hover:bg-[#1B5C2E]/10">
                          Ouvrir <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
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
