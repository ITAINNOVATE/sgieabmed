"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { 
  Plus, Flame, Search, Eye, MoreHorizontal, CheckCircle2, 
  AlertTriangle, ShieldCheck, Pencil, Trash2, Calendar
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { broadcastDataMutation } from "@/utils/realtimeBus"
import { recordAuditLog } from "@/app/dashboard/admin/adminMockData"
import { toast } from "sonner"
import "@/utils/waste-locations"

export function extractPlanDates(plan: any): { startDate: string; endDate: string; isPeriod: boolean } {
  if (plan.planned_start_date && plan.planned_end_date) {
    return {
      startDate: plan.planned_start_date,
      endDate: plan.planned_end_date,
      isPeriod: plan.planned_start_date !== plan.planned_end_date
    }
  }
  if (plan.observations && typeof plan.observations === "string" && plan.observations.startsWith("[PERIODE:")) {
    const match = plan.observations.match(/^\[PERIODE:([^_]+)__([^\]]+)\]/)
    if (match) {
      return {
        startDate: match[1],
        endDate: match[2],
        isPeriod: match[1] !== match[2]
      }
    }
  }
  const single = plan.planned_date || plan.created_at?.slice(0, 10) || ""
  return {
    startDate: single,
    endDate: single,
    isPeriod: false
  }
}

export default function DestructionsClient({ initialPlans }: { initialPlans: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [plansList, setPlansList] = useState<any[]>(() => {
    return initialPlans && initialPlans.length > 0 ? initialPlans : []
  })
  const hasLoadedOnceRef = useRef(false)

  const fetchPlans = async () => {
    let localPlans: any[] = []
    try {
      const stored = localStorage.getItem('destruction_plans_custom_v1')
      if (stored) {
        localPlans = JSON.parse(stored)
        if (!hasLoadedOnceRef.current && localPlans.length > 0) {
          setPlansList(localPlans)
          hasLoadedOnceRef.current = true
        }
      }
    } catch (e) {}

    let remotePlans: any[] = []
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('destruction_plans')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        remotePlans = data
      }
    } catch (e) {
      console.warn("Erreur fetch remote destruction_plans:", e)
    }

    const planMap = new Map<string, any>()
    localPlans.forEach((p: any) => {
      const key = p.plan_number || p.id
      if (key) planMap.set(key, p)
    })
    remotePlans.forEach((p: any) => {
      const key = p.plan_number || p.id
      if (key) {
        const local = planMap.get(key)
        planMap.set(key, {
          ...p,
          ...local,
          planned_start_date: local?.planned_start_date || p.planned_start_date,
          planned_end_date: local?.planned_end_date || p.planned_end_date,
          items: Array.isArray(p.items_data) && p.items_data.length > 0 ? p.items_data : (local?.items || p.items || [])
        })
      }
    })

    hasLoadedOnceRef.current = true
    if (planMap.size > 0) {
      setPlansList(Array.from(planMap.values()))
    }

    // Auto-synchronisation en lot non-bloquante en arrière-plan
    const unsyncedPlans = localPlans.filter(
      (lp: any) => lp.plan_number && !remotePlans.some((rp: any) => rp.plan_number === lp.plan_number)
    )
    if (unsyncedPlans.length > 0) {
      const supabase = createClient()
      const payload = unsyncedPlans.map((lp: any) => ({
        plan_number: lp.plan_number,
        planned_date: lp.planned_start_date || lp.planned_date,
        execution_date: lp.execution_date || null,
        destruction_method: lp.destruction_method || 'Incinération',
        destruction_site: lp.destruction_site || 'Centre Agréé',
        supervisor_name: lp.supervisor_name || 'Admin EGED',
        observations: lp.observations || '',
        certificate_number: lp.certificate_number || null,
        status: lp.status || 'En préparation',
        items_data: lp.items || lp.items_data || [],
      }))
      supabase.from('destruction_plans').upsert(payload, { onConflict: 'plan_number' }).then(() => {})
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  // Synchronisation temps réel automatique des plans de destruction
  useRealtimeSync({
    tables: ['destruction_plans', 'waste_batches', 'waste_movements'],
    onSync: fetchPlans,
    pollIntervalMs: 3000,
  })

  // SUPPRESSION D'UN PLAN DE DESTRUCTION
  const handleDeletePlan = async (plan: any) => {
    const isExecuted = plan.status === 'Exécuté' || plan.status === 'Archivé'
    const confirmMsg = isExecuted
      ? `Attention : Le plan ${plan.plan_number} est déjà marqué comme "${plan.status}". Confirmez-vous sa suppression ?`
      : `Confirmez-vous la suppression du plan de destruction ${plan.plan_number} ?\n\nLes lots de déchets associés seront immédiatement réintégrés dans les stocks actifs de déchets.`

    if (!confirm(confirmMsg)) return

    try {
      // 1. Mise à jour de l'état React local immédiat
      setPlansList(prev => prev.filter(p => p.id !== plan.id && p.plan_number !== plan.plan_number))

      // 2. Supprimer du LocalStorage
      try {
        const stored = localStorage.getItem('destruction_plans_custom_v1')
        if (stored) {
          const list = JSON.parse(stored)
          const updated = list.filter((p: any) => p.id !== plan.id && p.plan_number !== plan.plan_number)
          localStorage.setItem('destruction_plans_custom_v1', JSON.stringify(updated))
        }

        // 3. Réintégrer les lots de déchets dans waste_batches
        const storedBatches = localStorage.getItem('waste_batches_custom_v1')
        if (storedBatches) {
          const batches = JSON.parse(storedBatches)
          const updatedBatches = batches.map((b: any) => {
            if (b.destruction_plan_ref === plan.plan_number || (plan.items && plan.items.some((it: any) => it.waste_batch_id === b.id || it.waste_batch?.batch_number === b.batch_number))) {
              return { ...b, status: "Déclaré", destruction_plan_ref: null }
            }
            return b
          })
          localStorage.setItem('waste_batches_custom_v1', JSON.stringify(updatedBatches))
        }
      } catch (e) {}

      // 4. Suppression Supabase Cloud asynchrone
      const supabase = createClient()
      await Promise.all([
        supabase.from('destruction_plans').delete().or(`id.eq.${plan.id},plan_number.eq.${plan.plan_number}`),
        supabase.from('waste_batches').update({ status: 'Déclaré', destruction_plan_ref: null }).eq('destruction_plan_ref', plan.plan_number)
      ]).catch(err => console.warn("Notice delete Supabase destruction:", err))

      // 5. Enregistrement dans le Journal d'Audit
      recordAuditLog(
        "Suppression Plan Destruction",
        "Destruction Déchets",
        `Suppression du plan de destruction ${plan.plan_number} (${plan.items?.length || 0} lot(s) libéré(s) en stock)`,
        "Agent ABMeD"
      )

      // 6. Broadcast temps réel
      broadcastDataMutation({
        entity: "destruction_plans,waste_batches,waste_movements,audit",
        action: "delete",
        id: plan.plan_number
      })

      toast.success(`Plan de destruction ${plan.plan_number} supprimé avec succès.`)
    } catch (err: any) {
      console.error(err)
      toast.error(`Erreur lors de la suppression : ${err?.message || err}`)
    }
  }

  const filteredPlans = plansList.filter(plan => {
    const matchesSearch = 
      plan.plan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (plan.destruction_site && plan.destruction_site.toLowerCase().includes(searchTerm.toLowerCase()))
      
    const matchesStatus = statusFilter === "all" || plan.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'En préparation': return <Badge className="bg-blue-100 text-blue-800 text-[10px]">{status}</Badge>
      case 'Validation Responsable': return <Badge className="bg-amber-100 text-amber-800 text-[10px]">{status}</Badge>
      case 'Validation Qualité': return <Badge className="bg-purple-100 text-purple-800 text-[10px]">{status}</Badge>
      case 'En attente exécution': return <Badge className="bg-amber-100 text-amber-800 text-[10px]">{status}</Badge>
      case 'Exécuté': return <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{status}</Badge>
      case 'Archivé': return <Badge className="bg-gray-100 text-gray-800 text-[10px]">{status}</Badge>
      default: return <Badge className="text-[10px]">{status}</Badge>
    }
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-600" />
            Plans de Destruction des Déchets
          </h2>
          <p className="text-muted-foreground text-xs">
            Planification par période, procédures et validation réglementaire des opérations de destruction à quatre yeux.
          </p>
        </div>
        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-2xs text-xs font-bold gap-1.5 h-8 px-3 border-0 cursor-pointer" asChild>
          <Link href="/dashboard/destructions/new">
            <Plus className="h-3.5 w-3.5" /> Nouveau Plan
          </Link>
        </Button>
      </div>

      {/* KPIS DESTRUCTION (3 CARTES COMPACTES) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg"><AlertTriangle className="h-4 w-4" /></div>
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">Destructions en attente</p>
              <h3 className="text-xl font-black text-foreground">{plansList.filter(p => ['Validation Responsable', 'Validation Qualité', 'En attente exécution'].includes(p.status)).length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"><ShieldCheck className="h-4 w-4" /></div>
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">En cours de validation</p>
              <h3 className="text-xl font-black text-foreground">{plansList.filter(p => ['Validation Responsable', 'Validation Qualité'].includes(p.status)).length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg"><CheckCircle2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">Destructions exécutées</p>
              <h3 className="text-xl font-black text-foreground">{plansList.filter(p => p.status === 'Exécuté' || p.status === 'Archivé').length}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLEAU DES PLANS DE DESTRUCTION (AVEC PÉRIODE PLANIFIÉE ET BOUTONS MODIFIER / SUPPRIMER) */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Plans de Destruction Enregistrés ({filteredPlans.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un plan..."
                  className="pl-8 bg-background h-8 text-xs w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="h-8 w-full sm:w-44 text-xs bg-background">
                  <SelectValue placeholder="Statut d'approbation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="En préparation">En préparation</SelectItem>
                  <SelectItem value="Validation Responsable">Validation Responsable</SelectItem>
                  <SelectItem value="Validation Qualité">Validation Qualité</SelectItem>
                  <SelectItem value="En attente exécution">En attente exécution</SelectItem>
                  <SelectItem value="Exécuté">Exécuté</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[820px] w-full text-xs">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="py-2 text-[11px] font-bold uppercase pl-4">N° Plan</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Période Planifiée</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Nombre de Lots</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Masse Totale</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Statut d&apos;Approbation</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">Aucun plan de destruction trouvé.</TableCell></TableRow>
                ) : (
                  filteredPlans.map((plan) => {
                    const totalQty = plan.items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0) || plan.total_weight || 150
                    const itemsCount = plan.items?.length || 3
                    const dates = extractPlanDates(plan)
                    const isExecuted = plan.status === 'Exécuté' || plan.status === 'Archivé'
                    
                    return (
                      <TableRow key={plan.id} className="text-xs hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-4 font-bold text-foreground font-mono py-2 whitespace-nowrap">
                          {plan.plan_number}
                        </TableCell>
                        
                        {/* PÉRIODE PLANIFIÉE (DATE DÉBUT & DATE FIN) */}
                        <TableCell className="py-2 whitespace-nowrap">
                          {dates.isPeriod ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">
                                Du {new Date(dates.startDate).toLocaleDateString('fr-FR')} au {new Date(dates.endDate).toLocaleDateString('fr-FR')}
                              </span>
                              <span className="text-[10px] text-muted-foreground">Période d&apos;incinération</span>
                            </div>
                          ) : dates.startDate ? (
                            <span className="font-semibold text-foreground">
                              Le {new Date(dates.startDate).toLocaleDateString('fr-FR')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </TableCell>

                        <TableCell className="py-2 font-semibold whitespace-nowrap">{itemsCount} lot(s)</TableCell>
                        <TableCell className="py-2 font-bold tabular-nums whitespace-nowrap">{Math.round(totalQty * 10) / 10} Kg</TableCell>
                        <TableCell className="py-2 whitespace-nowrap">{getStatusBadge(plan.status)}</TableCell>
                        
                        {/* ACTIONS : VOIR, MODIFIER, SUPPRIMER */}
                        <TableCell className="py-2 text-right pr-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              asChild 
                              className="h-7 text-xs px-2 text-[#1B5C2E] hover:text-[#1B5C2E] hover:bg-emerald-50 font-bold"
                            >
                              <Link href={`/dashboard/destructions/${plan.id || plan.plan_number}`}>
                                <Eye className="h-3.5 w-3.5 mr-1" /> Voir
                              </Link>
                            </Button>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              asChild 
                              className="h-7 text-xs px-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 font-bold"
                            >
                              <Link href={`/dashboard/destructions/new?edit=${encodeURIComponent(plan.plan_number || plan.id)}`}>
                                <Pencil className="h-3 w-3 mr-1" /> Modifier
                              </Link>
                            </Button>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeletePlan(plan)} 
                              className="h-7 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-bold cursor-pointer"
                              title="Supprimer ce plan de destruction"
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                            </Button>
                          </div>
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
