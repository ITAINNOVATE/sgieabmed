"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  ArrowLeft, Save, Flame, Trash2, Building2, Search, Filter, 
  CheckSquare, Square, Scale, MapPin, Calendar, ShieldAlert, Pencil
} from "lucide-react"

import { createClient } from "@/utils/supabase/client"
import { broadcastDataMutation } from "@/utils/realtimeBus"
import { recordAuditLog } from "@/app/dashboard/admin/adminMockData"
import { extractPlanDates } from "../DestructionsClient"

const formSchema = z.object({
  plan_number: z.string().min(1, "N° de plan requis"),
  planned_start_date: z.string().min(1, "Date de début requise"),
  planned_end_date: z.string().min(1, "Date de fin requise"),
  destruction_method: z.string().min(1, "Méthode requise"),
  destruction_site: z.string().min(1, "Site requis"),
  supervisor_name: z.string().min(1, "Superviseur requis"),
  observations: z.string().optional(),
  selected_batches: z.array(z.string()).min(1, "Veuillez sélectionner au moins un lot de déchets à détruire"),
}).refine((data) => {
  if (data.planned_start_date && data.planned_end_date) {
    return data.planned_end_date >= data.planned_start_date
  }
  return true
}, {
  message: "La date de fin doit être postérieure ou égale à la date de début",
  path: ["planned_end_date"]
})

type FormValues = z.infer<typeof formSchema>

function DestructionPlanFormContent() {
  const searchParams = useSearchParams()
  const editQuery = searchParams?.get("edit")
  const isEditMode = Boolean(editQuery)

  const [existingPlan, setExistingPlan] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [wasteBatches, setWasteBatches] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStructure, setSelectedStructure] = useState("all")
  const router = useRouter()
  const supabase = createClient()

  const todayStr = new Date().toISOString().split("T")[0]
  const defaultEndDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      plan_number: "DES-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000),
      planned_start_date: todayStr,
      planned_end_date: defaultEndDate,
      destruction_method: "Incinération haute température (>1200°C)",
      destruction_site: "Centre d'Incinération Agréé Cotonou",
      supervisor_name: "Admin EGED (Responsable Déchets ABMed)",
      observations: "",
      selected_batches: [],
    },
  })

  // 1. Charger les lots de déchets
  useEffect(() => {
    async function fetchWasteBatches() {
      let localAvailable: any[] = []
      try {
        const stored = localStorage.getItem("waste_batches_custom_v1")
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            localAvailable = parsed.filter((b: any) => b.status !== "Détruit")
            setWasteBatches(localAvailable)
          }
        }
      } catch (e) {}

      // Récupération Supabase
      try {
        const { data } = await supabase
          .from("waste_batches")
          .select("*")
          .neq("status", "Détruit")
        
        if (data && data.length > 0) {
          const mergedMap = new Map()
          localAvailable.forEach((b: any) => mergedMap.set(b.batch_number || b.id, b))
          data.forEach((cb: any) => {
            mergedMap.set(cb.batch_number || cb.id, cb)
          })
          setWasteBatches(Array.from(mergedMap.values()))
        }
      } catch (err) {
        console.warn("Supabase fetch waste batches notice:", err)
      }
    }
    fetchWasteBatches()
  }, [supabase])

  // 2. Charger le plan existant si en mode modification
  useEffect(() => {
    if (!editQuery) return

    async function loadPlanToEdit() {
      let targetPlan: any = null
      try {
        const stored = localStorage.getItem("destruction_plans_custom_v1")
        if (stored) {
          const list = JSON.parse(stored)
          targetPlan = list.find((p: any) => p.plan_number === editQuery || p.id === editQuery)
        }
      } catch (e) {}

      if (!targetPlan) {
        try {
          const { data } = await supabase
            .from("destruction_plans")
            .select("*")
            .or(`plan_number.eq.${editQuery},id.eq.${editQuery}`)
            .maybeSingle()
          if (data) targetPlan = data
        } catch (e) {}
      }

      if (targetPlan) {
        setExistingPlan(targetPlan)
        const dates = extractPlanDates(targetPlan)
        const batchIds: string[] = []

        if (Array.isArray(targetPlan.items)) {
          targetPlan.items.forEach((it: any) => {
            const bId = it.waste_batch_id || it.waste_batch?.id || it.id
            if (bId) batchIds.push(bId)
          })
        } else if (Array.isArray(targetPlan.items_data)) {
          targetPlan.items_data.forEach((it: any) => {
            const bId = it.waste_batch_id || it.waste_batch?.id || it.id
            if (bId) batchIds.push(bId)
          })
        }

        let cleanObs = targetPlan.observations || ""
        if (cleanObs.startsWith("[PERIODE:")) {
          cleanObs = cleanObs.replace(/^\[PERIODE:[^\]]+\]\s*/, "")
        }

        form.reset({
          plan_number: targetPlan.plan_number,
          planned_start_date: dates.startDate || todayStr,
          planned_end_date: dates.endDate || dates.startDate || defaultEndDate,
          destruction_method: targetPlan.destruction_method || "Incinération haute température (>1200°C)",
          destruction_site: targetPlan.destruction_site || "Centre d'Incinération Agréé Cotonou",
          supervisor_name: targetPlan.supervisor_name || "Admin EGED (Responsable Déchets ABMed)",
          observations: cleanObs,
          selected_batches: batchIds,
        })
      }
    }

    loadPlanToEdit()
  }, [editQuery, form, supabase, todayStr, defaultEndDate])

  // Liste des structures uniques
  const structuresList = useMemo(() => {
    const set = new Set<string>()
    wasteBatches.forEach((b) => {
      if (b.source_structure) set.add(b.source_structure)
    })
    return Array.from(set)
  }, [wasteBatches])

  // Filtrage des lots
  const filteredBatches = useMemo(() => {
    return wasteBatches.filter((b) => {
      const matchSearch =
        b.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.waste_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.commercial_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.source_structure && b.source_structure.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.reception_number && b.reception_number.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchStructure =
        selectedStructure === "all" || b.source_structure === selectedStructure

      return matchSearch && matchStructure
    })
  }, [wasteBatches, searchTerm, selectedStructure])

  const selectedBatchIds = form.watch("selected_batches") || []

  // Lots sélectionnés
  const selectedBatchesData = useMemo(() => {
    return wasteBatches.filter((b) => selectedBatchIds.includes(b.id) || selectedBatchIds.includes(b.batch_number))
  }, [wasteBatches, selectedBatchIds])

  const totalSelectedWeight = useMemo(() => {
    return selectedBatchesData.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)
  }, [selectedBatchesData])

  const structuresImpacted = useMemo(() => {
    const list = Array.from(new Set(selectedBatchesData.map((b) => b.source_structure).filter(Boolean)))
    return list.length > 0 ? list.join(", ") : "Dépôts internes ou directs"
  }, [selectedBatchesData])

  // Tout sélectionner / Tout désélectionner
  const handleToggleSelectAll = () => {
    if (selectedBatchIds.length === filteredBatches.length && filteredBatches.length > 0) {
      form.setValue("selected_batches", [])
    } else {
      form.setValue(
        "selected_batches",
        filteredBatches.map((b) => b.id)
      )
    }
  }

  // SOUMISSION DU FORMULAIRE (CRÉATION OU MODIFICATION)
  const onSubmit = async (values: FormValues) => {
    setIsSaving(true)

    try {
      const planIdToUse = existingPlan?.id || "plan-" + Date.now()
      const selectedItems = values.selected_batches.map((batchId) => {
        const batch = wasteBatches.find((b) => b.id === batchId || b.batch_number === batchId)
        return {
          id: "item-" + Date.now() + "-" + batchId,
          waste_batch_id: batch?.id || batchId,
          quantity: batch?.quantity || 0,
          waste_batch: {
            id: batch?.id || batchId,
            batch_number: batch?.batch_number || `DEC-${batchId}`,
            waste_type: batch?.waste_type || "Déchets pharmaceutiques",
            commercial_name: batch?.commercial_name || "",
            unit: batch?.unit || "Kg",
            source_structure: batch?.source_structure || "Structure Déposante",
            reception_number: batch?.reception_number || "REC-DECH",
            status: "En attente de destruction",
          },
        }
      })

      const totalPlanWeight = selectedItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)

      const savedPlan = {
        id: planIdToUse,
        plan_number: values.plan_number,
        planned_start_date: values.planned_start_date,
        planned_end_date: values.planned_end_date,
        planned_date: values.planned_start_date,
        destruction_method: values.destruction_method,
        destruction_site: values.destruction_site,
        supervisor_name: values.supervisor_name,
        observations: values.observations || "",
        execution_date: existingPlan?.execution_date || null,
        status: isEditMode ? (existingPlan?.status || "En préparation") : "En préparation",
        created_at: existingPlan?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_weight: Math.round(totalPlanWeight * 10) / 10,
        items: selectedItems,
        validations: existingPlan?.validations || [],
      }

      // 1. Sauvegarde locale (LocalStorage)
      try {
        const stored = localStorage.getItem("destruction_plans_custom_v1")
        const currentPlans = stored ? JSON.parse(stored) : []
        const updatedPlans = isEditMode
          ? currentPlans.map((p: any) => (p.plan_number === values.plan_number || p.id === planIdToUse ? savedPlan : p))
          : [savedPlan, ...currentPlans.filter((p: any) => p.plan_number !== values.plan_number)]
        localStorage.setItem("destruction_plans_custom_v1", JSON.stringify(updatedPlans))

        // Mettre à jour l'état des lots dans waste_batches_custom_v1
        const storedBatches = localStorage.getItem("waste_batches_custom_v1")
        if (storedBatches) {
          const localBatches = JSON.parse(storedBatches)
          const updated = localBatches.map((b: any) => {
            const isSelected = values.selected_batches.includes(b.id) || values.selected_batches.includes(b.batch_number)
            if (isSelected) {
              return { ...b, status: "En attente de destruction", destruction_plan_ref: values.plan_number }
            } else if (b.destruction_plan_ref === values.plan_number) {
              // Lot précédemment sélectionné qui a été retiré
              return { ...b, status: "Déclaré", destruction_plan_ref: null }
            }
            return b
          })
          localStorage.setItem("waste_batches_custom_v1", JSON.stringify(updated))
        }
      } catch (localErr) {
        console.warn("Erreur sauvegarde locale plan de destruction:", localErr)
      }

      // 2. Synchronisation Supabase en tâche de fond
      const selectedBatchNumbers = selectedItems.map(it => it.waste_batch.batch_number).filter(Boolean)
      const cloudPayload: any = {
        id: planIdToUse,
        plan_number: values.plan_number,
        planned_date: values.planned_start_date,
        destruction_method: values.destruction_method,
        destruction_site: values.destruction_site,
        supervisor_name: values.supervisor_name,
        observations: `[PERIODE:${values.planned_start_date}__${values.planned_end_date}] ${values.observations || ''}`.trim(),
        status: isEditMode ? (existingPlan?.status || "En préparation") : "En préparation",
        items_data: selectedItems,
      }

      const syncPromise = Promise.all([
        supabase.from("destruction_plans").upsert(cloudPayload, { onConflict: "plan_number" }),
        selectedBatchNumbers.length > 0
          ? supabase
              .from("waste_batches")
              .update({
                status: "En attente de destruction",
                destruction_plan_ref: values.plan_number,
              })
              .in("batch_number", selectedBatchNumbers)
          : Promise.resolve(),
      ]).catch((remoteErr) => {
        console.warn("Échec synchronisation Supabase destruction_plans:", remoteErr)
      })

      await Promise.race([syncPromise, new Promise(r => setTimeout(r, 600))])

      // 3. Diffusion temps réel
      broadcastDataMutation({
        entity: "destruction_plans,waste_batches,waste_movements,audit",
        action: isEditMode ? "update" : "create",
        id: values.plan_number
      })

      // 4. Enregistrement dans le Journal d'Audit
      try {
        recordAuditLog(
          isEditMode ? "Modification Plan Destruction" : "Création Plan Destruction",
          "Destruction Déchets",
          `${isEditMode ? "Modification" : "Création"} du plan ${values.plan_number} (Période : ${values.planned_start_date} au ${values.planned_end_date}, ${values.selected_batches.length} lot(s), Méthode : ${values.destruction_method}, Site : ${values.destruction_site}) - Superviseur : ${values.supervisor_name}`,
          values.supervisor_name || "Agent ABMeD"
        )
      } catch (e) {}

      toast.success(
        isEditMode
          ? `Plan de destruction ${values.plan_number} modifié avec succès !`
          : `Plan de destruction ${values.plan_number} créé avec succès avec ${values.selected_batches.length} lot(s) !`
      )
      router.push(`/dashboard/destructions/${planIdToUse}`)
    } catch (error: any) {
      console.error(error)
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl mx-auto pb-20">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-2xl border border-border/70 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0 rounded-xl">
            <Link href="/dashboard/destructions"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {isEditMode ? `Modifier le Plan ${form.watch("plan_number")}` : "Nouveau Plan de Destruction"}
              </h2>
              <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                Protocole Quatre Yeux
              </Badge>
              {isEditMode && (
                <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                  Mode Édition
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Définissez la période planifiée (début et fin), la méthode et les lots de déchets à détruire.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild className="h-9 text-xs px-3 cursor-pointer">
            <Link href="/dashboard/destructions">Annuler</Link>
          </Button>
          <Button 
            type="button" 
            size="sm"
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving || selectedBatchIds.length === 0} 
            className="h-9 text-xs font-bold px-4 bg-orange-600 hover:bg-orange-700 text-white shadow-sm gap-2 cursor-pointer"
          >
            {isSaving ? "Enregistrement..." : (
              <>
                <Save className="h-4 w-4" /> 
                {isEditMode ? "Enregistrer les modifications" : `Créer le plan (${selectedBatchIds.length} lot${selectedBatchIds.length > 1 ? 's' : ''})`}
              </>
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          {/* SECTION 1 : INFORMATIONS DU PLAN DE DESTRUCTION & PÉRIODE PLANIFIÉE */}
          <Card className="shadow-sm border border-border/70 rounded-2xl bg-card">
            <CardHeader className="p-4 pb-3 border-b border-border/50">
              <CardTitle className="flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Flame className="mr-2 h-4 w-4 text-orange-500" />
                1. Période Planifiée & Paramètres de la Session
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              
              <FormField control={form.control} name="plan_number" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">N° de Plan</FormLabel>
                  <FormControl><Input {...field} disabled className="font-mono font-bold bg-muted/40 h-9 text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* DATE DE DÉBUT DE PÉRIODE */}
              <FormField control={form.control} name="planned_start_date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Date de Début Planifiée <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl><Input type="date" {...field} className="h-9 text-xs bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* DATE DE FIN DE PÉRIODE */}
              <FormField control={form.control} name="planned_end_date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Date de Fin Planifiée <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl><Input type="date" {...field} className="h-9 text-xs bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="destruction_method" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Méthode de Destruction</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Méthode" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Incinération haute température (>1200°C)">Incinération haute température (&gt;1200°C)</SelectItem>
                      <SelectItem value="Neutralisation physico-chimique">Neutralisation physico-chimique</SelectItem>
                      <SelectItem value="Encapsulation & Enfouissement sanitaire">Encapsulation & Enfouissement sanitaire</SelectItem>
                      <SelectItem value="Inactivation à l'autoclave">Inactivation à l&apos;autoclave</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="destruction_site" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Site / Lieu de l&apos;Opération</FormLabel>
                  <FormControl><Input {...field} className="h-9 text-xs bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="supervisor_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Agent Superviseur ABMed</FormLabel>
                  <FormControl><Input {...field} className="h-9 text-xs bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="sm:col-span-2 lg:col-span-3">
                <FormField control={form.control} name="observations" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Remarques & Conditions Particulières</FormLabel>
                    <FormControl><Input {...field} placeholder="Précisions sur la logistique, équipe sur site..." className="h-9 text-xs bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

            </CardContent>
          </Card>

          {/* SECTION 2 : SÉLECTION DES DÉCHETS EN STOCK */}
          <Card className="shadow-sm border border-border/70 rounded-2xl bg-card overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <CardTitle className="flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Trash2 className="mr-2 h-4 w-4 text-orange-500" />
                    2. Sélection des Lots de Déchets à Détruire ({filteredBatches.length} lots disponibles)
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Sélectionnez les lots qui seront pris en charge lors de la période d&apos;incinération.
                  </CardDescription>
                </div>

                {/* RÉCAPITULATIF SÉLECTION */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 rounded-xl text-xs font-bold">
                    <Scale className="h-3.5 w-3.5" />
                    <span>Masse sélectionnée : {Math.round(totalSelectedWeight * 10) / 10} Kg</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleToggleSelectAll}
                    className="h-8 text-xs font-bold"
                  >
                    {selectedBatchIds.length === filteredBatches.length && filteredBatches.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
                  </Button>
                </div>
              </div>

              {/* FILTRES RAPIDES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher lot, produit, structure déposante..."
                    className="pl-8 h-8.5 text-xs bg-background"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={selectedStructure} onValueChange={(val) => setSelectedStructure(val || "all")}>
                  <SelectTrigger className="h-8.5 text-xs bg-background">
                    <SelectValue placeholder="Filtrer par structure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les structures déposantes</SelectItem>
                    {structuresList.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[380px]">
                <Table className="text-xs">
                  <TableHeader className="bg-muted/40 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center pl-3 py-2">
                        <input
                          type="checkbox"
                          className="rounded cursor-pointer"
                          checked={filteredBatches.length > 0 && selectedBatchIds.length === filteredBatches.length}
                          onChange={handleToggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="py-2 text-[11px] font-bold uppercase">N° Lot</TableHead>
                      <TableHead className="py-2 text-[11px] font-bold uppercase">Structure Déposante</TableHead>
                      <TableHead className="py-2 text-[11px] font-bold uppercase">Type de Déchet / Produit</TableHead>
                      <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Quantité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-20 text-center text-xs text-muted-foreground">
                          Aucun lot de déchet disponible pour cette recherche.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBatches.map((b) => {
                        const isChecked = selectedBatchIds.includes(b.id) || selectedBatchIds.includes(b.batch_number)
                        return (
                          <TableRow 
                            key={b.id || b.batch_number} 
                            className={`hover:bg-muted/30 transition-colors cursor-pointer ${isChecked ? "bg-orange-50/50 dark:bg-orange-950/20" : ""}`}
                            onClick={() => {
                              const bId = b.id
                              if (selectedBatchIds.includes(bId)) {
                                form.setValue("selected_batches", selectedBatchIds.filter((id) => id !== bId))
                              } else {
                                form.setValue("selected_batches", [...selectedBatchIds, bId])
                              }
                            }}
                          >
                            <TableCell className="text-center pl-3 py-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="rounded cursor-pointer"
                                checked={isChecked}
                                onChange={(e) => {
                                  const bId = b.id
                                  if (e.target.checked) {
                                    form.setValue("selected_batches", [...selectedBatchIds, bId])
                                  } else {
                                    form.setValue("selected_batches", selectedBatchIds.filter((id) => id !== bId))
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-mono font-bold text-foreground py-2 whitespace-nowrap">
                              {b.batch_number}
                            </TableCell>
                            <TableCell className="py-2 whitespace-nowrap">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {b.source_structure || "Dépôt direct"}
                              </span>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{b.waste_type}</span>
                                {b.commercial_name && (
                                  <span className="text-[10px] text-muted-foreground">{b.commercial_name}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-right pr-4 font-mono font-bold text-foreground whitespace-nowrap">
                              {b.quantity} {b.unit || "Kg"}
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

        </form>
      </Form>
    </div>
  )
}

export default function NewDestructionPlanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Chargement du formulaire de destruction...</div>}>
      <DestructionPlanFormContent />
    </Suspense>
  )
}
