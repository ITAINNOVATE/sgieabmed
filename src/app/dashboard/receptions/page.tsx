"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PackageCheck, Plus, Clock, CheckCircle2, ArrowRight, Search, Filter, Trash2, ShieldCheck, Download } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useEffect, useState, Suspense, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { exportReceptionVoucherPDF } from "@/utils/exportUtils"
import { broadcastDataMutation } from "@/utils/realtimeBus"

function ReceptionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')

  const [receptions, setReceptions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const hasLoadedOnceRef = useRef(false)
  const supabase = createClient()

  const handleDownloadAttestation = (rec: any) => {
    try {
      let fullRecData: any = { ...rec }
      let samplesList: any[] = []

      // Chercher d'abord les détails complets en cache local
      const savedDraft = localStorage.getItem('reception_draft_details_' + rec.rec_number)
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft)
        if (parsed?.formData) {
          fullRecData = { ...fullRecData, ...parsed.formData, status: rec.status || parsed.status }
          if (Array.isArray(parsed.formData.samples) && parsed.formData.samples.length > 0) {
            samplesList = parsed.formData.samples
          }
        }
      }

      if (samplesList.length === 0 && Array.isArray(rec.samples_data) && rec.samples_data.length > 0) {
        samplesList = rec.samples_data
      }

      if (samplesList.length === 0) {
        const count = Array.isArray(rec.samples)
          ? (rec.samples[0]?.count ?? rec.samples.length)
          : (rec.samples?.count ?? (typeof rec.samples === 'number' ? rec.samples : 1))
        samplesList = [
          {
            commercial_name: rec.commercial_name || `Lot d'échantillons (${rec.supplier || 'ABMed'})`,
            dci: rec.dci || "Contrôle Qualité Réglementaire",
            category: rec.category || "Médicament",
            batch: rec.batch_number || `LOT-${(rec.rec_number || '2026').slice(-4)}`,
            exp_date: rec.expiry_date || "-",
            qty: count || 1,
            unit: "Échantillon(s)"
          }
        ]
      }

      exportReceptionVoucherPDF(fullRecData, samplesList)
      toast.success(`Attestation ${rec.rec_number} téléchargée (PDF)`)
    } catch (err) {
      console.error("Erreur téléchargement attestation:", err)
      toast.error("Erreur lors de la génération de l'attestation PDF")
    }
  }

  const handleDeleteReception = async (rec: any) => {
    if (!confirm(`Voulez-vous vraiment supprimer la réception ${rec.rec_number} ?`)) return

    // 1. Mise à jour optimiste immédiate (0ms d'attente)
    setReceptions(prev => prev.filter(item => item.rec_number !== rec.rec_number && item.id !== rec.id))
    toast.success(`Réception ${rec.rec_number} supprimée`)

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

    // 2. Suppression Supabase Cloud en parallèle (sans bloquer l'interface)
    Promise.all([
      supabase.from('receptions').delete().or(`rec_number.eq.${rec.rec_number},id.eq.${rec.id}`),
      supabase.from('samples').delete().eq('reception_ref', rec.rec_number),
      supabase.from('movements').delete().eq('reference_document', rec.rec_number),
    ]).catch(err => console.error("Erreur suppression Cloud:", err))

    broadcastDataMutation({
      entity: "receptions,samples,movements",
      action: "delete",
      id: rec.rec_number,
    })
  }

  const handleValidateReception = async (rec: any) => {
    let validatorName = "Admin EGED (Administrateur Système)"
    try {
      const stored = localStorage.getItem("eged_current_user_v1")
      if (stored) {
        const u = JSON.parse(stored)
        validatorName = `${u.name || (u.first_name + ' ' + u.last_name)} (${u.role || 'Administrateur Système'})`
      }
    } catch (e) {}
    const validationDate = new Date().toISOString().split('T')[0]

    // 1. Mise à jour optimiste immédiate (0ms d'attente)
    setReceptions(prev => prev.map(item => {
      if (item.rec_number === rec.rec_number || item.id === rec.id) {
        return { ...item, status: 'Validée', validator_name: validatorName, validation_date: validationDate }
      }
      return item
    }))
    toast.success(`Réception ${rec.rec_number} validée avec succès ! (Statut: Finalisé)`)

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

      const localMovements = JSON.parse(localStorage.getItem('local_movements_history') || '[]')
      const updatedMovements = localMovements.map((m: any) => {
        if (m.id?.includes(rec.rec_number) || m.reference_document === rec.rec_number || m.sample_number?.includes(rec.rec_number.replace('REC-', ''))) {
          return { ...m, status: 'Validé', new_status: 'Disponible' }
        }
        return m
      })
      localStorage.setItem('local_movements_history', JSON.stringify(updatedMovements))
    } catch (e) {}

    // 2. Mise à jour Supabase Cloud en parallèle
    Promise.all([
      supabase.from('receptions').update({
        status: 'Validée',
        validator_name: validatorName,
        validation_date: validationDate,
      }).or(`rec_number.eq.${rec.rec_number},id.eq.${rec.id}`),
      supabase.from('samples').update({ status: 'Disponible' }).eq('reception_ref', rec.rec_number),
      supabase.from('movements').update({ status: 'Validé' }).eq('reference_document', rec.rec_number),
    ]).catch(err => console.error("Erreur validation Cloud:", err))

    broadcastDataMutation({
      entity: "receptions,samples,movements",
      action: "validate",
      id: rec.rec_number,
    })
  }

  const handleFilterClick = (filter: string) => {
    setStatusFilter(filter)
    if (filter === 'all') {
      router.replace('/dashboard/receptions')
    } else {
      router.replace(`/dashboard/receptions?status=${filter}`)
    }
  }

  const fetchData = async () => {
    const isWiped = typeof window !== 'undefined' && localStorage.getItem('all_data_wiped') === 'true'
    if (isWiped) {
      setReceptions([])
      setLoading(false)
      hasLoadedOnceRef.current = true
      return
    }

    let deletedIds: string[] = []
    let syncedIds: string[] = []
    let localData: any[] = []
    try {
      deletedIds = JSON.parse(localStorage.getItem('reception_deleted_ids') || '[]')
      syncedIds = JSON.parse(localStorage.getItem('reception_synced_cloud_ids') || '[]')
      localData = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
    } catch (e) {}

    // Scanner localStorage pour tout reception_draft_details_*
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('reception_draft_details_')) {
          const raw = localStorage.getItem(key)
          if (raw) {
            const parsed = JSON.parse(raw)
            const recNum = parsed.formData?.rec_number
            if (recNum && !deletedIds.includes(recNum)) {
              const sampleCount = (parsed.formData?.samples || []).filter((s: any) => s.commercial_name && s.commercial_name.trim() !== "").length || 1
              localData.push({
                id: recNum,
                rec_number: recNum,
                date_reception: parsed.formData?.date_reception || new Date().toISOString().split('T')[0],
                supplier: parsed.formData?.supplier || "DEMANDEUR NON PRÉCISÉ",
                status: parsed.status || parsed.formData?.status || "En attente de validation",
                inspector: parsed.formData?.inspector || "Admin EGED",
                created_at: parsed.formData?.created_at || new Date().toISOString(),
                samples: [{ count: sampleCount }],
              })
            }
          }
        }
      }
    } catch (e) {}

    // Affichage instantané (0ms) depuis le cache local uniquement au tout premier chargement
    if (!hasLoadedOnceRef.current && localData.length > 0) {
      const quickMap = new Map<string, any>()
      localData.forEach(item => {
        if (item.rec_number && !deletedIds.includes(item.rec_number) && !deletedIds.includes(item.id)) {
          quickMap.set(item.rec_number, item)
        }
      })
      setReceptions(Array.from(quickMap.values()).sort((a, b) => {
        const timeA = new Date(a.created_at || a.date_reception || 0).getTime()
        const timeB = new Date(b.created_at || b.date_reception || 0).getTime()
        return timeB - timeA
      }))
      setLoading(false)
      hasLoadedOnceRef.current = true
    }

    // 1. Données distantes Supabase (Source de vérité Cloud)
    let remoteData: any[] = []
    let remoteFetchSuccess = false
    try {
      const { data, error } = await supabase
        .from('receptions')
        .select('id, rec_number, date_reception, supplier, status, inspector, created_at, samples_data')
        .order('created_at', { ascending: false })
      if (!error && Array.isArray(data)) {
        remoteFetchSuccess = true
        remoteData = data.map((item: any) => ({
          ...item,
          samples: [{ count: (Array.isArray(item.samples_data) && item.samples_data.length > 0 ? item.samples_data.length : 1) }]
        }))
        let syncedUpdated = false
        remoteData.forEach((r: any) => {
          if (r.rec_number && !syncedIds.includes(r.rec_number)) {
            syncedIds.push(r.rec_number)
            syncedUpdated = true
          }
        })
        if (syncedUpdated) {
          try {
            localStorage.setItem('reception_synced_cloud_ids', JSON.stringify(syncedIds))
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Erreur chargement distant réceptions:", err)
    }

    // Purge locale des réceptions supprimées sur un autre navigateur/ordinateur
    if (remoteFetchSuccess) {
      const remoteRecNumbers = new Set(remoteData.map((r: any) => r.rec_number))
      let purgedAny = false
      localData = localData.filter((item: any) => {
        if (item.rec_number && syncedIds.includes(item.rec_number) && !remoteRecNumbers.has(item.rec_number)) {
          if (!deletedIds.includes(item.rec_number)) deletedIds.push(item.rec_number)
          try {
            localStorage.removeItem('reception_draft_details_' + item.rec_number)
          } catch (e) {}
          purgedAny = true
          return false
        }
        return true
      })
      if (purgedAny) {
        try {
          localStorage.setItem('reception_deleted_ids', JSON.stringify(deletedIds))
          localStorage.setItem('reception_history_records', JSON.stringify(localData))
        } catch (e) {}
      }
    }

    // Fusionner et afficher immédiatement avant la synchronisation montante en arrière-plan
    const mergedMap = new Map<string, any>()
    remoteData.forEach(item => {
      if (!deletedIds.includes(item.rec_number) && !deletedIds.includes(item.id)) {
        mergedMap.set(item.rec_number, item)
      }
    })
    localData.forEach(item => {
      if (item.rec_number && !deletedIds.includes(item.rec_number) && !deletedIds.includes(item.id)) {
        const existing = mergedMap.get(item.rec_number)
        if (existing) {
          const finalStatus = (existing.status === "Validée" || item.status === "Validée")
            ? "Validée"
            : (existing.status || item.status)
          mergedMap.set(item.rec_number, {
            ...item,
            ...existing,
            status: finalStatus,
          })
        } else {
          mergedMap.set(item.rec_number, item)
        }
      }
    })

    const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
      const timeA = new Date(a.created_at || a.date_reception || 0).getTime()
      const timeB = new Date(b.created_at || b.date_reception || 0).getTime()
      return timeB - timeA
    })

    hasLoadedOnceRef.current = true
    setReceptions(mergedList)
    setLoading(false)

    // Synchronisation montante non-bloquante en arrière-plan (uniquement pour les réceptions pas encore dans Supabase)
    ;(async () => {
      for (const item of localData) {
        const remoteItem = remoteData.find((r: any) => r.rec_number === item.rec_number)
        const raw = typeof window !== 'undefined' ? localStorage.getItem('reception_draft_details_' + item.rec_number) : null

        if (!deletedIds.includes(item.rec_number) && !remoteItem && !syncedIds.includes(item.rec_number)) {
          try {
            let fd: any = {}
            let validSamples: any[] = []
            if (raw) {
              try {
                const parsed = JSON.parse(raw)
                fd = parsed.formData || {}
                if (Array.isArray(fd.samples)) {
                  validSamples = fd.samples.filter((s: any) => s.commercial_name && s.commercial_name.trim() !== '')
                }
              } catch (e) {}
            }

            const payloadToInsert: any = {
              rec_number: item.rec_number,
              date_reception: fd.date_reception || item.date_reception || new Date().toISOString().split('T')[0],
              time_reception: fd.time_reception || '08:00',
              ref_document: fd.ref_document || null,
              type_reception: fd.type_reception || null,
              inspector: fd.inspector || item.inspector || "Admin EGED",
              status: remoteItem?.status === 'Validée' ? 'Validée' : (item.status || fd.status || "En attente de validation"),
              supplier: fd.supplier || item.supplier || "DEMANDEUR NON PRÉCISÉ",
              manufacturer: fd.manufacturer || null,
              country: fd.country || null,
              city: fd.city || null,
              contact_person: fd.contact_person || null,
              phone: fd.phone || null,
              check_packaging: !!fd.check_packaging,
              check_boxes: !!fd.check_boxes,
              check_seals: !!fd.check_seals,
              check_qty: !!fd.check_qty,
              check_docs: !!fd.check_docs,
              check_damage: !!fd.check_damage,
              check_conform: !!fd.check_conform,
              anomalies: fd.anomalies || null,
              measures: fd.measures || null,
              validator_name: fd.validator_name || null,
              validation_date: fd.validation_date && fd.validation_date.trim() !== '' ? fd.validation_date : null,
              samples_data: validSamples.length > 0 ? validSamples : (remoteItem?.samples_data || [{ commercial_name: `ÉCHANTILLON ${item.supplier || ''}`.trim(), qty: 1 }]),
            }

            const { error: upsertErr } = await supabase.from('receptions').upsert(payloadToInsert, { onConflict: 'rec_number' })
            if (!upsertErr && !syncedIds.includes(item.rec_number)) {
              syncedIds.push(item.rec_number)
              localStorage.setItem('reception_synced_cloud_ids', JSON.stringify(syncedIds))
            }

            if (validSamples.length > 0) {
              const samplesBatch = validSamples.map((s: any, idx: number) => ({
                sample_number: s.sample_number || `ECH-${item.rec_number.replace('REC-', '')}-${idx + 1}`,
                reception_ref: item.rec_number,
                commercial_name: s.commercial_name,
                dci: s.dci || null,
                dosage: s.dosage || null,
                batch_number: s.batch || 'LOT-TEMP',
                quantity: Number(s.qty) || 1,
                status: payloadToInsert.status === 'Validée' ? 'Disponible' : 'À localiser',
                expiry_date: s.exp_date && s.exp_date.trim() !== '' ? s.exp_date : null,
                current_location: s.location || 'Zone de Réception / Quarantaine',
                manufacturer_name: fd.manufacturer || null,
                supplier_name: fd.supplier || item.supplier || null,
              }))
              await supabase.from('samples').upsert(samplesBatch, { onConflict: 'sample_number' })
            }
          } catch (syncErr) {
            console.warn("Échec auto-migration réception vers Supabase:", syncErr)
          }
        }
      }
    })()
  }

  useEffect(() => {
    if (statusParam === 'en_attente') {
      setStatusFilter('en_attente')
    } else if (statusParam === 'en_cours') {
      setStatusFilter('en_cours')
    } else if (statusParam === 'finalise') {
      setStatusFilter('finalise')
    } else {
      setStatusFilter('all')
    }
  }, [statusParam])

  useEffect(() => {
    fetchData()
  }, [])

  // Synchronisation temps réel automatique multi-ordinateurs
  useRealtimeSync({
    tables: ['receptions', 'samples'],
    onSync: fetchData,
    pollIntervalMs: 6000,
  })

  const filteredReceptions = receptions.filter(rec => {
    const matchesSearch = 
      rec.rec_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.supplier && rec.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rec.inspector && rec.inspector.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const isFinalized = rec.status === "Validée" || rec.status === "Finalisé" || rec.status === "Finalisée"
    const isPendingValidation = !isFinalized
    const isInProgress = rec.status === "En cours" || rec.status === "Brouillon"

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
        <Card 
          className={`shadow-2xs border border-border/70 rounded-xl bg-card cursor-pointer transition-all hover:border-[#1B5C2E]/60 ${statusFilter === 'all' ? 'ring-2 ring-[#1B5C2E]' : ''}`}
          onClick={() => handleFilterClick("all")}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-[#1B5C2E]/10 p-2 rounded-lg"><PackageCheck className="h-5 w-5 text-[#1B5C2E]" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Toutes les réceptions</p>
              <h3 className="text-xl font-black text-foreground">{receptions.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`shadow-2xs border border-border/70 rounded-xl bg-card cursor-pointer transition-all hover:border-amber-500/60 ${statusFilter === 'en_attente' ? 'ring-2 ring-amber-500 bg-amber-50/15' : ''}`}
          onClick={() => handleFilterClick("en_attente")}
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Réceptions en instance (À valider)</p>
              <h3 className="text-xl font-black text-amber-600">
                {receptions.filter(r => !['Validée', 'Finalisé', 'Finalisée'].includes(r.status)).length}
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
                  onClick={() => handleFilterClick("all")}
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
                  onClick={() => handleFilterClick("en_cours")}
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
                      : "text-amber-600 dark:text-amber-400 hover:!bg-[#1B5C2E] hover:!text-white"
                  }`}
                  onClick={() => handleFilterClick("en_attente")}
                >
                  En instance ({receptions.filter(r => !['Validée', 'Finalisé', 'Finalisée'].includes(r.status)).length})
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
                  onClick={() => handleFilterClick("finalise")}
                >
                  Finalisé
                </Button>
              </div>

              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-8 bg-background h-8 text-xs"
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
                    const isPendingValidation = !isFinalized

                    let statusLabel = isFinalized ? "Finalisé" : "En attente de validation"
                    let statusBadgeClass = isFinalized
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                      : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"

                    return (
                      <TableRow key={rec.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-bold text-foreground py-2">{rec.rec_number}</TableCell>
                        <TableCell className="py-2 text-muted-foreground">
                          {rec.date_reception ? new Date(rec.date_reception).toLocaleDateString("fr-FR") : '-'}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{rec.supplier || 'N/A'}</span>
                            {rec.inspector && (
                              <span className="text-[10px] text-muted-foreground font-medium">Soumis par : {rec.inspector}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-center font-bold">
                          {Array.isArray(rec.samples) ? (rec.samples[0]?.count ?? rec.samples.length) : (rec.samples?.count ?? (typeof rec.samples === 'number' ? rec.samples : 1))}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className={`text-[10px] font-semibold border ${statusBadgeClass}`}>
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right pr-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 sm:px-2.5 bg-white hover:bg-[#1B5C2E]/10 text-[#1B5C2E] border-[#1B5C2E]/30 font-bold gap-1 shadow-2xs cursor-pointer"
                              onClick={() => handleDownloadAttestation(rec)}
                              title="Télécharger l'attestation de réception en PDF"
                            >
                              <Download className="h-3.5 w-3.5 text-[#1B5C2E]" />
                              <span className="hidden sm:inline">Attestation</span>
                              <span className="sm:hidden">PDF</span>
                            </Button>
                            {isPendingValidation && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2 sm:px-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300 font-bold gap-1 shadow-2xs cursor-pointer"
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

export default function ReceptionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-sm">Chargement des réceptions...</div>}>
      <ReceptionsContent />
    </Suspense>
  )
}
