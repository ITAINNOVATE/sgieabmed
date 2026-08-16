"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PackageCheck, Plus, Clock, CheckCircle2, ArrowRight, Search, Filter, Trash2, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"

export default function ReceptionsPage() {
  const [receptions, setReceptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const supabase = createClient()

  const handleDeleteReception = async (rec: any) => {
    if (!confirm(`Voulez-vous vraiment supprimer la réception ${rec.rec_number} ?`)) return

    try {
      // 1. Supprimer de Supabase si présent
      await supabase.from('receptions').delete().or(`rec_number.eq.${rec.rec_number},id.eq.${rec.id}`)
      await supabase.from('samples').delete().eq('reception_ref', rec.rec_number)

      // 2. Mémoriser la suppression dans localStorage
      try {
        const deletedIds = JSON.parse(localStorage.getItem('reception_deleted_ids') || '[]')
        if (rec.rec_number && !deletedIds.includes(rec.rec_number)) deletedIds.push(rec.rec_number)
        if (rec.id && !deletedIds.includes(rec.id)) deletedIds.push(rec.id)
        localStorage.setItem('reception_deleted_ids', JSON.stringify(deletedIds))

        const localHistory = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
        const updatedHistory = localHistory.filter((item: any) => item.rec_number !== rec.rec_number && item.id !== rec.id)
        localStorage.setItem('reception_history_records', JSON.stringify(updatedHistory))
        localStorage.removeItem('reception_draft_details_' + rec.rec_number)
        localStorage.removeItem('reception_form_autosave')
      } catch (e) {}

      // 3. Mettre à jour l'état local
      setReceptions(prev => prev.filter(item => item.rec_number !== rec.rec_number && item.id !== rec.id))
      toast.success(`Réception ${rec.rec_number} supprimée`)
    } catch (err: any) {
      console.error(err)
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleValidateReception = async (rec: any) => {
    try {
      const validatorName = "Dr. Kadia BARRY (Responsable Qualité)"
      const validationDate = new Date().toISOString().split('T')[0]

      await supabase.from('receptions').update({
        status: 'Validée',
        validator_name: validatorName,
        validation_date: validationDate,
      }).or(`rec_number.eq.${rec.rec_number},id.eq.${rec.id}`)

      try {
        const localHistory = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
        const updatedHistory = localHistory.map((item: any) => {
          if (item.rec_number === rec.rec_number || item.id === rec.id) {
            return { ...item, status: 'Validée', validator_name: validatorName, validation_date: validationDate }
          }
          return item
        })
        localStorage.setItem('reception_history_records', JSON.stringify(updatedHistory))

        const rawDetails = localStorage.getItem('reception_draft_details_' + rec.rec_number)
        if (rawDetails) {
          const parsed = JSON.parse(rawDetails)
          parsed.status = 'Validée'
          if (parsed.formData) {
            parsed.formData.status = 'Validée'
            parsed.formData.validator_name = validatorName
            parsed.formData.validation_date = validationDate
          }
          localStorage.setItem('reception_draft_details_' + rec.rec_number, JSON.stringify(parsed))
        }
      } catch (e) {}

      setReceptions(prev => prev.map(item => {
        if (item.rec_number === rec.rec_number || item.id === rec.id) {
          return { ...item, status: 'Validée' }
        }
        return item
      }))

      toast.success(`Réception ${rec.rec_number} validée avec succès ! (Statut: Finalisé)`)
    } catch (err: any) {
      console.error(err)
      toast.error("Erreur lors de la validation")
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const statusParam = new URLSearchParams(window.location.search).get('status')
      if (statusParam === 'en_attente') {
        setStatusFilter('en_attente')
      }
    }
  }, [])

  useEffect(() => {
    async function fetchData() {
      if (typeof window !== 'undefined' && localStorage.getItem('all_data_wiped') === 'true') {
        setReceptions([])
        setLoading(false)
        return
      }

      let deletedIds: string[] = []
      try {
        deletedIds = JSON.parse(localStorage.getItem('reception_deleted_ids') || '[]')
      } catch (e) {}

      let remoteData: any[] = []
      try {
        const { data, error } = await supabase
          .from('receptions')
          .select('id, rec_number, date_reception, supplier, status, created_at')
          .order('created_at', { ascending: false })
        if (error) {
          console.warn("Erreur Supabase select réceptions:", error.message)
        }
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

      // Récupérer tout brouillon auto-sauvegardé en mémoire
      try {
        const autoSaved = localStorage.getItem('reception_form_autosave')
        if (autoSaved) {
          const parsed = JSON.parse(autoSaved)
          if (parsed.formData && parsed.formData.rec_number && !deletedIds.includes(parsed.formData.rec_number)) {
            const recovered = {
              id: parsed.formData.rec_number,
              rec_number: parsed.formData.rec_number,
              date_reception: parsed.formData.date_reception || new Date().toISOString().split('T')[0],
              supplier: parsed.formData.supplier || "SANINOVA",
              status: "En cours",
              inspector: parsed.formData.inspector || "Marie ADANDE",
              created_at: new Date().toISOString(),
              samples: [{ count: (parsed.formData.samples || []).length || 1 }],
            }
            localData.push(recovered)
          }
        }
      } catch (e) {}

      // Exemples de secours si aucun enregistrement trouvé
      const defaultRecords = [
        {
          id: "rec-default-1",
          rec_number: "REC-2026-3901",
          date_reception: "2026-08-12",
          supplier: "SANINOVA",
          status: "En cours",
          inspector: "Marie ADANDE",
          created_at: "2026-08-12T19:23:00Z",
          samples: [{ count: 2 }],
        },
        {
          id: "rec-default-2",
          rec_number: "REC-2026-1042",
          date_reception: "2026-08-11",
          supplier: "LABOREX BÉNIN",
          status: "Validée",
          inspector: "Marie ADANDE",
          created_at: "2026-08-11T14:30:00Z",
          samples: [{ count: 5 }],
        },
        {
          id: "rec-default-3",
          rec_number: "REC-2026-0815",
          date_reception: "2026-08-10",
          supplier: "UBIPHARMA",
          status: "Validée",
          inspector: "Dr. Kadia BARRY",
          created_at: "2026-08-10T09:15:00Z",
          samples: [{ count: 3 }],
        }
      ]

      // Fusionner les enregistrements sans doublons par rec_number
      const mergedMap = new Map<string, any>()
      defaultRecords.forEach(item => {
        if (!deletedIds.includes(item.rec_number) && !deletedIds.includes(item.id)) {
          mergedMap.set(item.rec_number, item)
        }
      })
      localData.forEach(item => {
        if (item.rec_number && !deletedIds.includes(item.rec_number) && !deletedIds.includes(item.id)) {
          mergedMap.set(item.rec_number, item)
        }
      })
      remoteData.forEach(item => {
        if (item.rec_number && !deletedIds.includes(item.rec_number) && !deletedIds.includes(item.id)) {
          mergedMap.set(item.rec_number, item)
        }
      })

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        const timeA = new Date(a.created_at || a.date_reception || 0).getTime()
        const timeB = new Date(b.created_at || b.date_reception || 0).getTime()
        return timeB - timeA
      })

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
    const isPendingValidation = rec.status === "En attente de validation" || rec.status === "Soumise" || rec.status === "En attente"
    const isInProgress = !isFinalized && !isPendingValidation

    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "finalise" && isFinalized) ||
      (statusFilter === "en_attente" && isPendingValidation) ||
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
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">En attente de validation</p>
              <h3 className="text-xl font-black text-foreground">
                {receptions.filter(r => r.status === "En attente de validation" || r.status === "Soumise" || r.status === "En attente").length}
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
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs px-2.5 rounded-md font-bold transition-all cursor-pointer ${
                    statusFilter === "all"
                      ? "!bg-[#1B5C2E] !text-white shadow-xs hover:!bg-[#154824] hover:!text-white focus:!text-white focus:!bg-[#1B5C2E] active:!text-white"
                      : "text-muted-foreground hover:!bg-[#1B5C2E] hover:!text-white"
                  }`}
                  onClick={() => setStatusFilter("all")}
                >
                  Tous
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs px-2.5 rounded-md font-bold transition-all cursor-pointer ${
                    statusFilter === "en_cours"
                      ? "!bg-[#1B5C2E] !text-white shadow-xs hover:!bg-[#154824] hover:!text-white focus:!text-white focus:!bg-[#1B5C2E] active:!text-white"
                      : "text-red-600 dark:text-red-400 hover:!bg-[#1B5C2E] hover:!text-white"
                  }`}
                  onClick={() => setStatusFilter("en_cours")}
                >
                  En cours
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs px-2.5 rounded-md font-bold transition-all cursor-pointer ${
                    statusFilter === "en_attente"
                      ? "!bg-[#1B5C2E] !text-white shadow-xs hover:!bg-[#154824] hover:!text-white focus:!text-white focus:!bg-[#1B5C2E] active:!text-white"
                      : "text-emerald-600 dark:text-emerald-400 hover:!bg-[#1B5C2E] hover:!text-white"
                  }`}
                  onClick={() => setStatusFilter("en_attente")}
                >
                  En attente de validation
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`h-7 text-xs px-2.5 rounded-md font-bold transition-all cursor-pointer ${
                    statusFilter === "finalise"
                      ? "!bg-[#1B5C2E] !text-white shadow-xs hover:!bg-[#154824] hover:!text-white focus:!text-white focus:!bg-[#1B5C2E] active:!text-white"
                      : "text-emerald-600 dark:text-emerald-400 hover:!bg-[#1B5C2E] hover:!text-white"
                  }`}
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
                    const isPendingValidation = rec.status === "En attente de validation" || rec.status === "Soumise" || rec.status === "En attente"

                    let statusLabel = "En cours"
                    let statusBadgeClass = "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800"

                    if (isFinalized) {
                      statusLabel = "Finalisé"
                      statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                    } else if (isPendingValidation) {
                      statusLabel = "En attente de validation"
                      statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                    }

                    return (
                      <TableRow key={rec.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-bold text-foreground py-2">{rec.rec_number}</TableCell>
                        <TableCell className="py-2 text-muted-foreground">
                          {rec.date_reception ? new Date(rec.date_reception).toLocaleDateString("fr-FR") : '-'}
                        </TableCell>
                        <TableCell className="py-2">{rec.supplier || 'N/A'}</TableCell>
                        <TableCell className="py-2 text-center font-bold">
                          {Array.isArray(rec.samples) ? (rec.samples[0]?.count ?? rec.samples.length) : (rec.samples?.count ?? (typeof rec.samples === 'number' ? rec.samples : 1))}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className={`text-[10px] font-semibold border ${statusBadgeClass}`}>
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right pr-4 flex items-center justify-end gap-1">
                          {isPendingValidation && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300 font-bold gap-1 shadow-2xs cursor-pointer"
                              onClick={() => handleValidateReception(rec)}
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                              Valider
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-[#1B5C2E] font-bold hover:bg-[#1B5C2E]/10" asChild>
                            <Link href={`/dashboard/receptions/new?id=${rec.rec_number || rec.id}`}>
                              Ouvrir <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                          {!isFinalized && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-destructive font-bold hover:bg-destructive/10 gap-1"
                              onClick={() => handleDeleteReception(rec)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Supprimer</span>
                            </Button>
                          )}
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
