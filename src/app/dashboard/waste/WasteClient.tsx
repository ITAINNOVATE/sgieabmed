"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { 
  getRegisteredCentersSync, 
  getRegisteredCenters, 
  buildCenterCodeMap, 
  Center 
} from "@/utils/centers-storage"
import { 
  Plus, Trash2, Search, Filter, Eye, Printer, 
  AlertTriangle, ArrowLeftRight, 
  CheckCircle2, Box, LayoutDashboard, List, FileText, Download, Pencil,
  Building2, Calendar, CalendarDays, RotateCcw, Boxes, ChevronDown, ChevronRight,
  FolderOpen, ShieldCheck, Clock, ExternalLink, Paperclip, X
} from "lucide-react"
import { toast } from "sonner"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip
} from "recharts"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LabelPrintDialog } from "@/components/label-print-dialog"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { exportWasteReceptionSlipPDF } from "@/utils/exportUtils"
import { broadcastDataMutation } from "@/utils/realtimeBus"
import "@/utils/waste-locations"

const WASTE_CATEGORIES_COLORS = ['#E53935', '#FB8C00', '#1E88E5', '#43A047']
const WASTE_STATUS_COLORS = ['#1E88E5', '#FB8C00', '#43A047', '#D81B60', '#E53935']

const MONTHS_LIST = [
  { value: "all", label: "Tous les mois" },
  { value: "1", label: "01 - Janvier" },
  { value: "2", label: "02 - Février" },
  { value: "3", label: "03 - Mars" },
  { value: "4", label: "04 - Avril" },
  { value: "5", label: "05 - Mai" },
  { value: "6", label: "06 - Juin" },
  { value: "7", label: "07 - Juillet" },
  { value: "8", label: "08 - Août" },
  { value: "9", label: "09 - Septembre" },
  { value: "10", label: "10 - Octobre" },
  { value: "11", label: "11 - Novembre" },
  { value: "12", label: "12 - Décembre" },
]

export interface WasteReceptionGroup {
  reception_number: string
  reception_date: string
  reception_time?: string
  source_structure: string
  source_structure_code?: string
  center_code?: string
  source_type?: string
  city?: string
  depositor_name?: string
  depositor_phone?: string
  depositor_id_card?: string
  transfer_cost_mode?: string
  transfer_cost_amount?: number
  abmed_fee_8_percent?: number
  delivery_slip_ref?: string
  recipient_agent?: string
  warehouse?: string
  status: string
  batches: any[]
  total_weight: number
  total_items: number
  created_at?: string
  attached_docs?: any[]
}

export default function WasteClient({ 
  initialBatches = [], 
  destructions = [] 
}: { 
  initialBatches?: any[], 
  destructions?: any[] 
}) {
  const [batches, setBatches] = useState<any[]>(() => {
    return initialBatches && initialBatches.length > 0 ? initialBatches : []
  })
  const [registeredCenters, setRegisteredCenters] = useState<Center[]>(() => getRegisteredCentersSync())
  const hasLoadedOnceRef = useRef(false)

  // 1. Vue active : 'centers' (Par Centre), 'batches' (Éclatées lot par lot), 'analytics' (Indicateurs)
  const [activeView, setActiveView] = useState<'centers' | 'batches' | 'analytics'>('centers')
  
  // Sous-mode dans la vue "Par Centre" : 'receptions_list' ou 'grouped_by_center'
  const [centersSubView, setCentersSubView] = useState<'receptions_list' | 'grouped_by_center'>('receptions_list')

  // 2. Filtres en haut (Jour, Mois, Année, Centre, Statut, Recherche)
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [selectedDay, setSelectedDay] = useState<string>("")
  const [selectedCenter, setSelectedCenter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")

  // 3. État d'ouverture de la modale de réception (pour voir l'éclaté d'une réception spécifique)
  const [selectedReception, setSelectedReception] = useState<WasteReceptionGroup | null>(null)

  // 4. Sélection & impression d'étiquettes
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printDialogItems, setPrintDialogItems] = useState<any[]>([])

  // Charger les centres enregistrés
  useEffect(() => {
    getRegisteredCenters().then(setRegisteredCenters)
  }, [])

  const centerCodeMap = useMemo(() => buildCenterCodeMap(registeredCenters), [registeredCenters])

  // Chargement et synchronisation des lots de déchets
  const fetchBatches = async () => {
    let localBatches: any[] = []
    let deletedIds: string[] = []
    try {
      deletedIds = JSON.parse(localStorage.getItem('reception_deleted_ids') || '[]')
      const stored = localStorage.getItem('waste_batches_custom_v1')
      if (stored) {
        localBatches = JSON.parse(stored)
        if (!hasLoadedOnceRef.current && localBatches.length > 0) {
          const validLocal = localBatches.filter(
            (b: any) => !deletedIds.includes(b.id) && !deletedIds.includes(b.batch_number) && !deletedIds.includes(b.reception_number)
          )
          setBatches(validLocal)
          hasLoadedOnceRef.current = true
        }
      }
    } catch (e) {}

    let remoteBatches: any[] = []
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('waste_batches')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        remoteBatches = data
      }
    } catch (err) {
      console.warn("Erreur fetch remote waste_batches:", err)
    }

    const batchMap = new Map<string, any>()
    localBatches.forEach((b: any) => {
      const key = b.batch_number || b.id
      if (key && !deletedIds.includes(b.id) && !deletedIds.includes(b.batch_number) && !deletedIds.includes(b.reception_number)) {
        batchMap.set(key, b)
      }
    })
    remoteBatches.forEach((b: any) => {
      const key = b.batch_number || b.id
      if (key && !deletedIds.includes(b.id) && !deletedIds.includes(b.batch_number) && !deletedIds.includes(b.reception_number)) {
        batchMap.set(key, b)
      }
    })

    hasLoadedOnceRef.current = true
    if (batchMap.size > 0) {
      const mergedList = Array.from(batchMap.values())
      setBatches(mergedList)
      try {
        localStorage.setItem('waste_batches_custom_v1', JSON.stringify(mergedList))
      } catch (e) {}
    }

    // Auto-synchronisation en lot non-bloquante
    const unsyncedBatches = localBatches.filter(
      (lb: any) => lb.batch_number && !remoteBatches.some((rb: any) => rb.batch_number === lb.batch_number)
    )
    if (unsyncedBatches.length > 0) {
      const supabase = createClient()
      const payload = unsyncedBatches.map((lb: any) => ({
        batch_number: lb.batch_number,
        reception_number: lb.reception_number || null,
        reception_date: lb.reception_date || null,
        reception_time: lb.reception_time || null,
        delivery_slip_ref: lb.delivery_slip_ref || null,
        recipient_agent: lb.recipient_agent || 'Admin EGED',
        source_structure: lb.source_structure || 'Structure Déposante',
        source_structure_code: lb.source_structure_code || lb.center_code || null,
        source_type: lb.source_type || 'Officine',
        city: lb.city || 'Cotonou',
        depositor_name: lb.depositor_name || '',
        depositor_phone: lb.depositor_phone || '',
        depositor_id_card: lb.depositor_id_card || '',
        waste_type: lb.waste_type || 'Déchets pharmaceutiques',
        commercial_name: lb.commercial_name || '',
        original_batch: lb.original_batch || '',
        sample_id: lb.sample_id || null,
        quantity: Number(lb.quantity) || 1,
        unit: lb.unit || 'Kg',
        packaging: lb.packaging || 'Carton',
        packaging_condition: lb.packaging_condition || 'Conforme',
        destruction_motive: lb.destruction_motive || 'Péremption',
        current_location: lb.current_location || 'MAGASIN DES DECHETS',
        status: lb.status || 'Déclaré',
        observations: lb.observations || '',
      }))
      supabase.from('waste_batches').upsert(payload, { onConflict: 'batch_number' })
        .then(({ error }) => {
          if (!error) {
            broadcastDataMutation({
              entity: "waste_batches",
              action: "catchup_sync",
              id: `synced-${unsyncedBatches.length}`,
            })
          }
        })
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [])

  // Synchronisation temps réel automatique pour les déchets
  useRealtimeSync({
    tables: ['waste_batches', 'destruction_plans', 'waste_movements'],
    onSync: fetchBatches,
    pollIntervalMs: 6000,
  })

  // Années disponibles calculées dynamiquement depuis les données
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>(["2026", "2025", "2024"])
    batches.forEach((b) => {
      const dt = b.reception_date || b.date_reception || b.created_at
      if (dt) {
        try {
          const yr = new Date(dt).getFullYear()
          if (!isNaN(yr) && yr > 2000) yearsSet.add(String(yr))
        } catch (e) {}
      }
    })
    return Array.from(yearsSet).sort().reverse()
  }, [batches])

  // Filtrage multi-critères : Jour, Mois, Année, Centre, Statut, Recherche
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      const resolvedCode = batch.center_code || (batch.source_structure ? centerCodeMap.get(batch.source_structure.trim().toUpperCase()) : null)
      
      // 1. Filtre par Date (Jour, Mois, Année)
      const dateStr = batch.reception_date || batch.date_reception || batch.created_at
      if (dateStr) {
        try {
          const d = new Date(dateStr)
          if (!isNaN(d.getTime())) {
            // Filtre Jour précis
            if (selectedDay) {
              const batchDay = dateStr.slice(0, 10)
              if (batchDay !== selectedDay) return false
            }
            // Filtre Année
            if (selectedYear !== "all") {
              if (d.getFullYear() !== Number(selectedYear)) return false
            }
            // Filtre Mois
            if (selectedMonth !== "all") {
              if (d.getMonth() + 1 !== Number(selectedMonth)) return false
            }
          }
        } catch (e) {}
      } else {
        // Si aucune date renseignée et qu'un filtre temporel est actif, on exclut
        if (selectedDay || selectedYear !== "all" || selectedMonth !== "all") return false
      }

      // 2. Filtre par Centre
      if (selectedCenter !== "all") {
        const matchesCode = resolvedCode && resolvedCode.toLowerCase() === selectedCenter.toLowerCase()
        const matchesName = batch.source_structure && batch.source_structure.toLowerCase().includes(selectedCenter.toLowerCase())
        if (!matchesCode && !matchesName) return false
      }

      // 3. Filtre par Statut
      if (statusFilter !== "all" && batch.status !== statusFilter) {
        return false
      }

      // 4. Recherche textuelle globale
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchesBatch = (batch.batch_number || '').toLowerCase().includes(q)
        const matchesRec = (batch.reception_number || '').toLowerCase().includes(q)
        const matchesType = (batch.waste_type || '').toLowerCase().includes(q)
        const matchesProd = (batch.commercial_name || '').toLowerCase().includes(q)
        const matchesCenter = (batch.source_structure || '').toLowerCase().includes(q)
        const matchesCode = resolvedCode && resolvedCode.toLowerCase().includes(q)
        const matchesDepositor = (batch.depositor_name || '').toLowerCase().includes(q)
        const matchesLoc = (batch.current_location || '').toLowerCase().includes(q)

        if (!matchesBatch && !matchesRec && !matchesType && !matchesProd && !matchesCenter && !matchesCode && !matchesDepositor && !matchesLoc) {
          return false
        }
      }

      return true
    })
  }, [batches, selectedYear, selectedMonth, selectedDay, selectedCenter, statusFilter, searchTerm, centerCodeMap])

  // REGROUPEMENT DES LOTS PAR RÉCEPTION (Bordereau / Dépôt fait par un Centre)
  const receptionGroups = useMemo(() => {
    const map = new Map<string, WasteReceptionGroup>()

    filteredBatches.forEach((batch) => {
      // Clé unique de la réception
      const recKey = batch.reception_number || batch.delivery_slip_ref || `REC-${batch.source_structure || 'ABMED'}-${(batch.reception_date || batch.created_at || '').slice(0, 10)}`
      const resolvedCode = batch.center_code || (batch.source_structure ? centerCodeMap.get(batch.source_structure.trim().toUpperCase()) : null) || 'CTR-2026'

      if (!map.has(recKey)) {
        // Tenter de charger les détails du brouillon s'ils existent localement
        let attachedDocs: any[] = []
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("waste_reception_draft_details_" + recKey)
            if (raw) {
              const parsed = JSON.parse(raw)
              attachedDocs = parsed.attachedDocs || parsed.formData?.attachedDocs || []
            }
          } catch (e) {}
        }
        if (Array.isArray(batch.attached_docs) && batch.attached_docs.length > 0) {
          attachedDocs = [...attachedDocs, ...batch.attached_docs]
        }

        map.set(recKey, {
          reception_number: batch.reception_number || recKey,
          reception_date: batch.reception_date || (batch.created_at ? batch.created_at.slice(0, 10) : ''),
          reception_time: batch.reception_time || '',
          source_structure: batch.source_structure || 'Structure Déposante',
          source_structure_code: resolvedCode,
          center_code: resolvedCode,
          source_type: batch.source_type || 'Établissement Pharmaceutique',
          city: batch.city || 'Cotonou',
          depositor_name: batch.depositor_name || '',
          depositor_phone: batch.depositor_phone || '',
          depositor_id_card: batch.depositor_id_card || '',
          transfer_cost_mode: batch.transfer_cost_mode || '',
          transfer_cost_amount: Number(batch.transfer_cost_amount) || 0,
          abmed_fee_8_percent: Number(batch.abmed_fee_8_percent) || 0,
          delivery_slip_ref: batch.delivery_slip_ref || '',
          recipient_agent: batch.recipient_agent || 'Agent eGED ABMed',
          warehouse: batch.warehouse || batch.current_location || 'Magasin des Déchets',
          status: batch.status || 'Déclaré',
          batches: [],
          total_weight: 0,
          total_items: 0,
          created_at: batch.created_at,
          attached_docs: attachedDocs,
        })
      }

      const grp = map.get(recKey)!
      grp.batches.push(batch)
      grp.total_weight += Number(batch.quantity) || 0
      grp.total_items += 1
    })

    return Array.from(map.values()).sort((a, b) => {
      const da = new Date(a.reception_date || a.created_at || 0).getTime()
      const db = new Date(b.reception_date || b.created_at || 0).getTime()
      return db - da
    })
  }, [filteredBatches, centerCodeMap])

  // REGROUPEMENT PAR CENTRE APPORTEUR (Synthèse par structure)
  const receptionsByCenter = useMemo(() => {
    const map = new Map<string, {
      center_name: string
      center_code: string
      city: string
      receptions: WasteReceptionGroup[]
      total_weight: number
      total_batches: number
      total_fee: number
      last_date: string
    }>()

    receptionGroups.forEach((rec) => {
      const centerKey = (rec.center_code || rec.source_structure || 'INCONNU').trim().toUpperCase()
      if (!map.has(centerKey)) {
        map.set(centerKey, {
          center_name: rec.source_structure,
          center_code: rec.center_code || 'CTR-2026',
          city: rec.city || 'Cotonou',
          receptions: [],
          total_weight: 0,
          total_batches: 0,
          total_fee: 0,
          last_date: rec.reception_date || '',
        })
      }
      const cGrp = map.get(centerKey)!
      cGrp.receptions.push(rec)
      cGrp.total_weight += rec.total_weight
      cGrp.total_batches += rec.total_items
      cGrp.total_fee += rec.abmed_fee_8_percent || Math.round((rec.transfer_cost_amount || 0) * 0.08)
      if (rec.reception_date && (!cGrp.last_date || rec.reception_date > cGrp.last_date)) {
        cGrp.last_date = rec.reception_date
      }
    })

    return Array.from(map.values()).sort((a, b) => b.total_weight - a.total_weight)
  }, [receptionGroups])

  // Indicateurs globaux des réceptions filtrées
  const statsOverview = useMemo(() => {
    const totalWeightKg = Math.round(filteredBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) * 100) / 100
    const totalReceptions = receptionGroups.length
    const totalCenters = receptionsByCenter.length
    const totalFeeFCFA = filteredBatches.reduce((acc, b) => {
      if (b.abmed_fee_8_percent !== undefined) return acc + Number(b.abmed_fee_8_percent)
      return acc + Math.round((Number(b.transfer_cost_amount) || 0) * 0.08)
    }, 0)

    return {
      totalWeightKg,
      totalWeightTonnes: (totalWeightKg / 1000).toFixed(2),
      totalReceptions,
      totalCenters,
      totalFeeFCFA,
    }
  }, [filteredBatches, receptionGroups, receptionsByCenter])

  // Sélection globale des lots pour l'impression
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredBatches.map(b => b.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id))
    }
  }

  const handleOpenPrintDialog = () => {
    const itemsToPrint = batches.filter(b => selectedIds.includes(b.id))
    if (itemsToPrint.length === 0) {
      toast.error("Veuillez sélectionner au moins un lot de déchet à imprimer.")
      return
    }
    setPrintDialogItems(itemsToPrint)
    setIsPrintDialogOpen(true)
  }

  // Téléchargement du récépissé officiel complet d'une réception (avec tous ses lots éclatés)
  const handleDownloadReceptionSlip = (rec: WasteReceptionGroup) => {
    exportWasteReceptionSlipPDF({
      reception_number: rec.reception_number,
      reception_date: rec.reception_date ? new Date(rec.reception_date).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR"),
      reception_time: rec.reception_time || "",
      warehouse: rec.warehouse || "Magasin Central ABMed",
      delivery_slip_ref: rec.delivery_slip_ref || "N/A",
      recipient_agent: rec.recipient_agent || "Agent eGED ABMed",
      source_structure: rec.source_structure || "Structure Déposante",
      center_code: rec.center_code || undefined,
      source_type: rec.source_type || "Établissement Pharmaceutique",
      city: rec.city || "Cotonou",
      depositor_name: rec.depositor_name || "N/A",
      depositor_phone: rec.depositor_phone || "N/A",
      depositor_id_card: rec.depositor_id_card || "N/A",
      transfer_cost_mode: rec.transfer_cost_mode || undefined,
      transfer_cost_amount: rec.transfer_cost_amount || undefined,
      abmed_fee_8_percent: rec.abmed_fee_8_percent || undefined,
      general_observations: `Réception officielle de ${rec.batches.length} lot(s) de déchets pharmaceutiques. Poids total brut pesé : ${rec.total_weight} kg.`,
      items: rec.batches.map((b) => ({
        batch_number: b.batch_number,
        waste_type: b.waste_type || "Déchets pharmaceutiques",
        commercial_name: b.commercial_name || b.waste_type || "Déchets pharmaceutiques",
        product_category: b.product_category || undefined,
        original_batch: b.original_batch || "-",
        quantity: Number(b.quantity) || 0,
        unit: b.unit || "Kg",
        packaging: b.packaging_type || b.packaging || "Carton scellé",
        location: b.current_location || "MAGASIN DES DECHETS",
        observations: b.rejection_reason || b.observations || "Conforme aux normes",
      })),
    })
    toast.success(`Récépissé officiel ${rec.reception_number} téléchargé (PDF)`)
  }

  // Réinitialisation de tous les filtres
  const handleResetFilters = () => {
    setSelectedYear("all")
    setSelectedMonth("all")
    setSelectedDay("")
    setSelectedCenter("all")
    setStatusFilter("all")
    setSearchTerm("")
    toast.info("Filtres réinitialisés")
  }

  const isAnyFilterActive = selectedYear !== "all" || selectedMonth !== "all" || selectedDay !== "" || selectedCenter !== "all" || statusFilter !== "all" || searchTerm.trim() !== ""

  // Données graphiques pour l'onglet Indicateurs
  const wasteByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    filteredBatches.forEach(b => {
      const cat = b.product_category || b.waste_type || 'Autres'
      const key = cat.split('-')[0].trim().substring(0, 24)
      map[key] = (map[key] || 0) + (Number(b.quantity) || 0)
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [filteredBatches])

  const wasteByStatus = useMemo(() => {
    const counts = {
      'Déclarés': filteredBatches.filter(b => b.status === 'Déclaré').length,
      'En contrôle': filteredBatches.filter(b => b.status === 'En contrôle').length,
      'Validés': filteredBatches.filter(b => b.status === 'Validé').length,
      'En attente destruction': filteredBatches.filter(b => b.status === 'En attente de destruction').length,
      'Détruits': filteredBatches.filter(b => b.status === 'Détruit').length,
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredBatches])

  const totalWasteKg = Math.round(batches.filter(b => b.status !== 'Détruit').reduce((s, b) => s + (Number(b.quantity) || 0), 0) * 100) / 100
  const storageOccupancyPct = (totalWasteKg / 45000) * 100
  const storageOccupancyStr = totalWasteKg > 0 ? (storageOccupancyPct < 0.01 ? "< 0.01" : storageOccupancyPct.toFixed(2)) : "0"

  const wasteAlerts = [
    { text: `Taux d'occupation du magasin : ${storageOccupancyStr}% (Capacité autorisée : 45 Tonnes — ${totalWasteKg} kg stockés)`, date: "Temps réel", type: (storageOccupancyPct >= 80 ? "warning" : "info") as "warning" | "info" | "error" },
    { text: "3 lots de déchets dépassent le délai légal de stockage (90j)", date: "En cours", type: "error" as const },
    { text: "Campagne de neutralisation planifiée sur site agréé", date: "Planifié", type: "warning" as const },
  ]

  return (
    <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 1. EN-TÊTE PRINCIPAL DU MODULE TOUTES LES RÉCEPTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Toutes les Réceptions des Déchets
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Historique complet des réceptions effectuées par centre apporteur et traçabilité détaillée des lots déclarés.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* BASCULEUR DE VUES PRINCIPALES REQUIS PAR L'UTILISATEUR */}
          <div className="bg-muted/70 p-1 rounded-xl flex items-center border border-border/60 gap-1 shadow-2xs">
            <Button 
              variant={activeView === 'centers' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveView('centers')}
              className={`h-8 px-3 text-xs font-bold gap-1.5 rounded-lg transition-all ${
                activeView === 'centers' 
                  ? 'bg-red-600 text-white shadow-xs hover:bg-red-700' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Réceptions par Centre</span>
              <Badge className="ml-1 text-[9px] px-1 py-0 bg-white/20 text-white border-0">
                {receptionGroups.length}
              </Badge>
            </Button>

            <Button 
              variant={activeView === 'batches' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveView('batches')}
              className={`h-8 px-3 text-xs font-bold gap-1.5 rounded-lg transition-all ${
                activeView === 'batches' 
                  ? 'bg-red-600 text-white shadow-xs hover:bg-red-700' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Réceptions Éclatées</span>
              <Badge className="ml-1 text-[9px] px-1 py-0 bg-white/20 text-white border-0">
                {filteredBatches.length}
              </Badge>
            </Button>

            <Button 
              variant={activeView === 'analytics' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveView('analytics')}
              className={`h-8 px-3 text-xs font-bold gap-1.5 rounded-lg transition-all ${
                activeView === 'analytics' 
                  ? 'bg-red-600 text-white shadow-xs hover:bg-red-700' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Indicateurs</span>
            </Button>
          </div>

          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-xs text-xs font-bold gap-1.5 h-8 px-3 border-0 rounded-lg" asChild>
            <Link href="/dashboard/waste/new">
              <Plus className="h-3.5 w-3.5" /> Nouvelle Réception
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. BARRE SUPÉRIEURE DE FILTRES : PAR JOUR, MOIS, ANNÉE, CENTRE, STATUT & RECHERCHE */}
      <Card className="border border-border/70 rounded-xl bg-card shadow-2xs overflow-hidden">
        <div className="p-3 bg-muted/30 border-b border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Filter className="h-3.5 w-3.5 text-red-600" />
            <span>Filtres de Sélection Périodique & Centre</span>
          </div>

          {/* Raccourcis Rapides de Période */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedDay(new Date().toISOString().slice(0, 10)); setSelectedYear("all"); setSelectedMonth("all"); }}
              className={`h-6 text-[10.5px] px-2 font-bold ${selectedDay === new Date().toISOString().slice(0, 10) ? 'bg-red-50 text-red-700 border-red-300' : ''}`}
            >
              Aujourd&apos;hui
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedDay(""); setSelectedYear(String(new Date().getFullYear())); setSelectedMonth(String(new Date().getMonth() + 1)); }}
              className={`h-6 text-[10.5px] px-2 font-bold ${selectedMonth === String(new Date().getMonth() + 1) && !selectedDay ? 'bg-red-50 text-red-700 border-red-300' : ''}`}
            >
              Ce mois-ci
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedDay(""); setSelectedYear("2026"); setSelectedMonth("all"); }}
              className={`h-6 text-[10.5px] px-2 font-bold ${selectedYear === "2026" && selectedMonth === "all" && !selectedDay ? 'bg-red-50 text-red-700 border-red-300' : ''}`}
            >
              Année 2026
            </Button>
            {isAnyFilterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-6 text-[10.5px] px-2 text-red-600 hover:text-red-700 font-bold gap-1 ml-1"
                title="Effacer tous les filtres"
              >
                <RotateCcw className="h-3 w-3" /> Réinitialiser
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-end">
          
          {/* A. Recherche Textuelle */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Search className="h-3 w-3 text-red-600" />
              Recherche globale
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Récépissé, lot, produit, déposant..."
                className="pl-8 bg-background h-8 text-xs w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* B. Filtre Année */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3 text-red-600" />
              Année
            </label>
            <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val || "all"); setSelectedDay(""); }}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les années</SelectItem>
                {availableYears.map(yr => (
                  <SelectItem key={yr} value={yr}>Exercice {yr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* C. Filtre Mois */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-red-600" />
              Mois
            </label>
            <Select value={selectedMonth} onValueChange={(val) => { setSelectedMonth(val || "all"); setSelectedDay(""); }}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_LIST.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* D. Filtre Jour Précis (Date picker) */}
          <div className="md:col-span-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                Jour précis
              </label>
              {selectedDay && (
                <button
                  type="button"
                  onClick={() => setSelectedDay("")}
                  className="text-[10px] text-red-600 hover:underline font-semibold"
                >
                  Effacer
                </button>
              )}
            </div>
            <Input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>

          {/* E. Filtre par Centre Apporteur */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Building2 className="h-3 w-3 text-red-600" />
              Centre Apporteur
            </label>
            <Select value={selectedCenter} onValueChange={(val) => setSelectedCenter(val || "all")}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Centre apporteur" />
              </SelectTrigger>
              <SelectContent className="max-w-md">
                <SelectItem value="all">Tous les centres apporteurs</SelectItem>
                {registeredCenters.map(c => (
                  <SelectItem key={c.id} value={c.center_code}>
                    {c.name} ({c.center_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>

      {/* 3. SYNTHÈSE CHIFFRÉE DE LA SÉLECTION EN COURS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl border border-border/70 bg-card shadow-2xs">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Réceptions de Centres</p>
          <p className="text-lg font-black text-foreground">{statsOverview.totalReceptions}</p>
          <p className="text-[10px] text-muted-foreground">{statsOverview.totalCenters} centre(s) déposant(s)</p>
        </div>

        <div className="p-3 rounded-xl border border-border/70 bg-card shadow-2xs">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Lots Déchets Réceptionnés</p>
          <p className="text-lg font-black text-foreground">{filteredBatches.length}</p>
          <p className="text-[10px] text-emerald-700 font-semibold">Lots éclatés</p>
        </div>

        <div className="p-3 rounded-xl border border-border/70 bg-card shadow-2xs">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Poids Total Réceptionné</p>
          <p className="text-lg font-black text-foreground">{statsOverview.totalWeightKg.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">kg</span></p>
          <p className="text-[10px] text-amber-600 font-semibold">{statsOverview.totalWeightTonnes} Tonnes</p>
        </div>

        <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-2xs">
          <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Redevance 8% ABMeD</p>
          <p className="text-base font-black text-[#1B5C2E] dark:text-emerald-300">{statsOverview.totalFeeFCFA.toLocaleString('fr-FR')} <span className="text-[10px] font-normal">FCFA</span></p>
          <p className="text-[10px] text-emerald-700 font-bold">Droit réglementaire</p>
        </div>
      </div>

      {/* 4. VUE 1 : LES RÉCEPTIONS PAR CENTRE (REQUIS PAR L'UTILISATEUR) */}
      {activeView === 'centers' && (
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
          <CardHeader className="p-3.5 pb-2.5 border-b border-border/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#1B5C2E]" />
                  Réceptions Effectuées par Centre Apporteur ({receptionGroups.length} bordereaux)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Cliquez sur une réception pour <strong>ouvrir son éclaté</strong> et consulter les lots, pesées et documents.
                </CardDescription>
              </div>

              {/* Sous-basculeur d'affichage par Centre ou Liste de Récépissés */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto bg-muted/60 p-0.5 rounded-lg border border-border/50 text-xs">
                <Button
                  variant={centersSubView === 'receptions_list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCentersSubView('receptions_list')}
                  className={`h-7 px-2.5 text-[11px] font-bold rounded-md ${
                    centersSubView === 'receptions_list' ? 'bg-[#1B5C2E] text-white hover:bg-[#154824]' : 'text-muted-foreground'
                  }`}
                >
                  Vue par Récépissé ({receptionGroups.length})
                </Button>
                <Button
                  variant={centersSubView === 'grouped_by_center' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCentersSubView('grouped_by_center')}
                  className={`h-7 px-2.5 text-[11px] font-bold rounded-md ${
                    centersSubView === 'grouped_by_center' ? 'bg-[#1B5C2E] text-white hover:bg-[#154824]' : 'text-muted-foreground'
                  }`}
                >
                  Regroupé par Centre ({receptionsByCenter.length})
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            {centersSubView === 'receptions_list' ? (
              /* A. TABLEAU DES RÉCEPTIONS PAR BORDEREAU / CENTRE */
              <Table className="min-w-[850px] w-full">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[140px] px-3 py-2.5 text-[10.5px] font-bold uppercase">N° Récépissé</TableHead>
                    <TableHead className="w-[100px] px-2 py-2.5 text-[10.5px] font-bold uppercase">Date Dépôt</TableHead>
                    <TableHead className="w-[26%] px-3 py-2.5 text-[10.5px] font-bold uppercase">Centre Apporteur & CTR</TableHead>
                    <TableHead className="w-[18%] px-2 py-2.5 text-[10.5px] font-bold uppercase">Déposant / Contact</TableHead>
                    <TableHead className="w-[90px] px-2 py-2.5 text-[10.5px] font-bold uppercase text-center">Lots Inclus</TableHead>
                    <TableHead className="w-[100px] px-2 py-2.5 text-[10.5px] font-bold uppercase text-right">Poids Total</TableHead>
                    <TableHead className="w-[100px] px-2 py-2.5 text-[10.5px] font-bold uppercase text-center">Statut</TableHead>
                    <TableHead className="w-[160px] px-3 py-2.5 text-[10.5px] font-bold uppercase text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receptionGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-20 text-center text-xs text-muted-foreground">
                        Aucune réception de déchets trouvée avec les filtres sélectionnés.
                      </TableCell>
                    </TableRow>
                  ) : (
                    receptionGroups.map((rec) => (
                      <TableRow 
                        key={rec.reception_number} 
                        className="text-xs hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedReception(rec)}
                      >
                        <TableCell className="px-3 py-2.5 font-bold font-mono text-[11.5px] text-foreground">
                          {rec.reception_number}
                        </TableCell>
                        <TableCell className="px-2 py-2.5 text-muted-foreground whitespace-nowrap">
                          {rec.reception_date ? new Date(rec.reception_date).toLocaleDateString('fr-FR') : '-'}
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground text-xs">
                              {rec.source_structure}
                            </span>
                            {rec.center_code && (
                              <Badge variant="secondary" className="text-[9.5px] font-mono font-bold px-1.5 py-0 bg-emerald-50 text-emerald-800 border-emerald-300">
                                {rec.center_code}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10.5px] text-muted-foreground block mt-0.5">
                            {rec.source_type} • {rec.city}
                          </span>
                        </TableCell>
                        <TableCell className="px-2 py-2.5 text-muted-foreground">
                          <span className="font-medium text-foreground block truncate" title={rec.depositor_name}>
                            {rec.depositor_name || "Non spécifié"}
                          </span>
                          {rec.depositor_phone && (
                            <span className="text-[10px] text-muted-foreground block">
                              Tél: {rec.depositor_phone}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-2.5 text-center whitespace-nowrap">
                          <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-[10px] font-bold">
                            {rec.batches.length} lot(s)
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-2.5 text-right font-black text-foreground whitespace-nowrap">
                          {rec.total_weight.toLocaleString('fr-FR')} kg
                        </TableCell>
                        <TableCell className="px-2 py-2.5 text-center whitespace-nowrap">
                          <Badge 
                            variant="outline"
                            className="text-[9.5px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border-emerald-300"
                          >
                            {rec.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right pr-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Bouton pour ouvrir l'éclaté */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedReception(rec)}
                              className="h-7 px-2.5 text-[11px] font-bold bg-white text-[#1B5C2E] border-emerald-300 hover:bg-emerald-50 gap-1 shadow-2xs"
                              title="Ouvrir la réception et consulter son éclaté de lots"
                            >
                              <Boxes className="h-3 w-3 text-[#1B5C2E]" />
                              Voir l&apos;éclaté
                            </Button>

                            {/* Téléchargement PDF */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadReceptionSlip(rec)}
                              className="h-7 px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                              title="Télécharger l'attestation officielle en PDF"
                            >
                              <Download className="h-3 w-3" />
                            </Button>

                            {/* Modification */}
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              className="h-7 px-2 text-[11px] font-bold text-amber-700 hover:bg-amber-50"
                              title="Modifier cette réception"
                            >
                              <Link href={`/dashboard/waste/new?edit=${rec.reception_number}`}>
                                <Pencil className="h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : (
              /* B. VUE REGROUPÉE PAR CENTRE APPORTEUR */
              <div className="p-3.5 space-y-3">
                {receptionsByCenter.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    Aucun centre apporteur trouvé pour ces critères de recherche.
                  </div>
                ) : (
                  receptionsByCenter.map((c) => (
                    <Card key={c.center_code} className="border border-border/70 rounded-xl overflow-hidden shadow-2xs bg-card">
                      <div className="p-3.5 bg-muted/30 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#1B5C2E]">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-foreground">{c.center_name}</h4>
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-[10px] font-bold">
                                {c.center_code}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {c.city} • Dernier dépôt : {c.last_date ? new Date(c.last_date).toLocaleDateString('fr-FR') : 'Non renseigné'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Masse Cumulée</span>
                            <span className="text-sm font-black text-[#1B5C2E]">{c.total_weight.toLocaleString('fr-FR')} kg</span>
                          </div>
                          <Badge variant="outline" className="text-xs font-bold px-2 py-1">
                            {c.receptions.length} réception(s)
                          </Badge>
                        </div>
                      </div>

                      {/* Liste des réceptions de ce centre */}
                      <div className="divide-y divide-border/40">
                        {c.receptions.map((r) => (
                          <div 
                            key={r.reception_number} 
                            onClick={() => setSelectedReception(r)}
                            className="p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-muted/20 cursor-pointer transition-colors text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-foreground text-xs">{r.reception_number}</span>
                                <span className="text-muted-foreground">• Date : {r.reception_date ? new Date(r.reception_date).toLocaleDateString('fr-FR') : '-'}</span>
                                <Badge className="bg-purple-50 text-purple-800 border-purple-200 text-[9.5px]">
                                  {r.batches.length} lot(s) éclatés
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Déposant : {r.depositor_name || "N/A"} {r.depositor_phone ? `(${r.depositor_phone})` : ''} • Poids : <strong className="text-foreground">{r.total_weight} kg</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedReception(r)}
                                className="h-7 text-xs font-bold gap-1 text-[#1B5C2E] border-emerald-300 hover:bg-emerald-50"
                              >
                                <Boxes className="h-3 w-3" /> Ouvrir l&apos;éclaté
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadReceptionSlip(r)}
                                className="h-7 text-xs"
                                title="Télécharger PDF"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. VUE 2 : LES RÉCEPTIONS ÉCLATÉES (LOT PAR LOT COMME C'ÉTAIT LÀ) */}
      {activeView === 'batches' && (
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
          <CardHeader className="p-3 pb-2 border-b border-border/50">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Lots de Déchets Éclatés en Stock ({filteredBatches.length})
                </CardTitle>
                {selectedIds.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleOpenPrintDialog}
                    className="h-7 text-xs font-bold gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Printer className="h-3.5 w-3.5" /> Étiquettes ({selectedIds.length})
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Affichage détaillé par lot individuel</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[760px] w-full">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-9 px-2 py-2 text-center">
                    <Checkbox 
                      checked={selectedIds.length === filteredBatches.length && filteredBatches.length > 0} 
                      onCheckedChange={handleSelectAll} 
                    />
                  </TableHead>
                  <TableHead className="w-[130px] px-2 py-2 text-[11px] font-bold uppercase">N° Lot Déchet</TableHead>
                  <TableHead className="w-[20%] px-2 py-2 text-[11px] font-bold uppercase">Provenance / Apporteur</TableHead>
                  <TableHead className="w-[24%] px-2 py-2 text-[11px] font-bold uppercase">Classification / Produit</TableHead>
                  <TableHead className="w-[75px] px-2 py-2 text-[11px] font-bold uppercase text-right">Quantité</TableHead>
                  <TableHead className="w-[16%] px-2 py-2 text-[11px] font-bold uppercase">Localisation</TableHead>
                  <TableHead className="w-[100px] px-1 py-2 text-[11px] font-bold uppercase text-center">Statut</TableHead>
                  <TableHead className="w-[125px] px-2 py-2 text-[11px] font-bold uppercase text-right pr-3">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-16 text-center text-xs text-muted-foreground">
                      Aucun lot de déchet trouvé avec les filtres sélectionnés.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBatches.map((batch) => (
                    <TableRow key={batch.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="w-9 px-2 py-2 text-center">
                        <Checkbox 
                          checked={selectedIds.includes(batch.id)} 
                          onCheckedChange={(checked) => handleSelectOne(batch.id, !!checked)} 
                        />
                      </TableCell>
                      <TableCell className="px-2 py-2 font-bold text-foreground font-mono text-[11.5px] truncate" title={batch.batch_number}>
                        {batch.batch_number}
                      </TableCell>
                      <TableCell className="px-2 py-2 min-w-0">
                        {batch.source_structure ? (
                          (() => {
                            const resolvedCode = batch.center_code || centerCodeMap.get(batch.source_structure.trim().toUpperCase())
                            return (
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-foreground truncate block" title={batch.source_structure}>
                                    {batch.source_structure}
                                  </span>
                                  {resolvedCode && (
                                    <Badge variant="secondary" className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border-emerald-300">
                                      {resolvedCode}
                                    </Badge>
                                  )}
                                </div>
                                {batch.depositor_name && (
                                  <span className="block text-[10px] text-muted-foreground truncate" title={`Apporté par : ${batch.depositor_name}`}>
                                    Apporté par : {batch.depositor_name}
                                  </span>
                                )}
                              </div>
                            )
                          })()
                        ) : (
                          <span className="text-muted-foreground italic truncate block">Interne ABMed</span>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-2 min-w-0">
                        <span className="line-clamp-2 leading-tight text-xs text-foreground font-medium" title={batch.commercial_name || batch.waste_type}>
                          {batch.commercial_name || batch.waste_type}
                        </span>
                        {batch.product_category && (
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {batch.product_category}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-2 text-right font-bold tabular-nums text-xs whitespace-nowrap">
                        {batch.quantity} {batch.unit || 'Kg'}
                      </TableCell>
                      <TableCell className="px-2 py-2 min-w-0">
                        <span className="text-xs text-muted-foreground truncate block font-medium" title={batch.current_location || 'Magasin des Déchets'}>
                          {batch.current_location || 'Magasin des Déchets'}
                        </span>
                      </TableCell>
                      <TableCell className="px-1 py-2 text-center whitespace-nowrap">
                        <Badge 
                          variant="outline"
                          className={`text-[10px] font-semibold px-1.5 py-0.5 border ${
                            batch.status === 'En attente de destruction' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                            batch.status === 'Détruit' ? 'bg-[#1B5C2E]/10 text-[#1B5C2E] border-[#1B5C2E]/30' :
                            batch.status === 'Validé' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 
                            'bg-blue-50 text-blue-800 border-blue-300'
                          }`}
                          title={batch.status}
                        >
                          {batch.status === 'En attente de destruction' ? 'Attente destr.' : batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-2 text-right pr-3 min-w-0">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6.5 px-2 text-[10.5px] bg-white hover:bg-[#1B5C2E]/10 text-[#1B5C2E] border-[#1B5C2E]/30 font-bold gap-1 shadow-2xs cursor-pointer"
                            onClick={() => {
                              exportWasteReceptionSlipPDF({
                                reception_number: batch.reception_number || `BORD-${batch.batch_number || "DEC"}`,
                                reception_date: batch.reception_date ? new Date(batch.reception_date).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR"),
                                reception_time: batch.reception_time || "",
                                delivery_slip_ref: batch.delivery_slip_ref || "N/A",
                                recipient_agent: batch.recipient_agent || "Agent ABMed",
                                source_structure: batch.source_structure || "Interne ABMed",
                                center_code: batch.center_code || (batch.source_structure ? centerCodeMap.get(batch.source_structure.trim().toUpperCase()) : undefined),
                                source_type: batch.source_type || "Établissement Pharmaceutique",
                                city: batch.city || "Cotonou",
                                depositor_name: batch.depositor_name || "N/A",
                                depositor_phone: batch.depositor_phone || "N/A",
                                depositor_id_card: batch.depositor_id_card || "N/A",
                                general_observations: batch.notes || "Lot réceptionné conformément aux procédures ABMed.",
                                items: [
                                  {
                                    batch_number: batch.batch_number,
                                    waste_type: batch.waste_type || "Médicaments Périmés",
                                    commercial_name: batch.commercial_name || batch.waste_type || "Déchets Pharmaceutiques",
                                    original_batch: batch.original_batch || "-",
                                    quantity: Number(batch.quantity) || 0,
                                    unit: batch.unit || "Kg",
                                    packaging: batch.packaging_type || batch.packaging || "Carton scellé",
                                    location: batch.current_location || "MAGASIN DES DECHETS",
                                    observations: batch.rejection_reason || batch.notes || "Péremption / Non-conformité"
                                  }
                                ]
                              })
                              toast.success(`Attestation ${batch.batch_number} téléchargée (PDF)`)
                            }}
                            title="Télécharger l'attestation de réception des déchets en PDF"
                          >
                            <Download className="h-3 w-3 text-[#1B5C2E]" />
                            PDF
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild 
                            className="h-6.5 px-2 text-[10.5px] text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300 font-bold gap-0.5"
                            title="Modifier cette réception, rectifier les données ou ajouter des documents"
                          >
                            <Link href={`/dashboard/waste/new?edit=${batch.reception_number || batch.batch_number}`}>
                              <Pencil className="h-3 w-3 mr-0.5 text-amber-600" /> Modifier
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            asChild 
                            className="h-6.5 px-1.5 text-[10.5px] text-red-600 font-bold hover:bg-red-50"
                            title="Consulter les détails du déchet"
                          >
                            <Link href={`/dashboard/waste/${batch.id}`}>
                              <Eye className="h-3 w-3 mr-0.5" /> Voir
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 6. VUE 3 : INDICATEURS & GRAPHIQUES */}
      {activeView === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">DÉCHETS PAR CATÉGORIE (KG)</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="flex items-center justify-between h-[130px]">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={wasteByCategory} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none" isAnimationActive={false}>
                        {wasteByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={WASTE_CATEGORIES_COLORS[index % WASTE_CATEGORIES_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '6px', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-1 pl-2">
                  {wasteByCategory.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: WASTE_CATEGORIES_COLORS[idx % WASTE_CATEGORIES_COLORS.length] }}></span>
                        <span className="text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <span className="font-bold text-foreground ml-1">{item.value} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">STATUT DU STOCK DÉCHETS</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="flex items-center justify-between h-[130px]">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={wasteByStatus} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none" isAnimationActive={false}>
                        {wasteByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={WASTE_STATUS_COLORS[index % WASTE_STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ borderRadius: '6px', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-1 pl-1">
                  {wasteByStatus.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 truncate">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: WASTE_STATUS_COLORS[idx % WASTE_STATUS_COLORS.length] }}></span>
                        <span className="text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <span className="font-bold text-foreground ml-1">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ALERTES DÉCHETS (PSQIF)</CardTitle>
              <Link href="/dashboard/alerts" className="text-[10px] font-semibold text-[#E53935] hover:underline">Voir tout</Link>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1.5">
              {wasteAlerts.map((al, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px] gap-2 pb-1 border-b border-border/30 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <div className={`p-0.5 rounded-md shrink-0 ${al.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                    <span className="font-medium text-foreground truncate">{al.text}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0">{al.date}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 7. MODALE D'OUVERTURE DE LA RÉCEPTION (VISUALISATION DE L'ÉCLATÉ DES DÉCHETS) */}
      <Dialog open={!!selectedReception} onOpenChange={(open) => !open && setSelectedReception(null)}>
        {selectedReception && (
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">
            {/* En-tête vert officiel ABMeD */}
            <div className="bg-[#1B5C2E] text-white p-4 sm:p-5 rounded-t-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-mono font-bold">
                    RÉCÉPISSÉ DÉCHARGE OFFICIEL
                  </Badge>
                  <span className="text-xs text-emerald-200">
                    {selectedReception.reception_date ? new Date(selectedReception.reception_date).toLocaleDateString('fr-FR') : '-'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black mt-1">
                  {selectedReception.reception_number}
                </h3>
                <p className="text-xs text-white/90">
                  Centre Apporteur : <strong className="text-white">{selectedReception.source_structure}</strong> {selectedReception.center_code ? `(${selectedReception.center_code})` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                <Button
                  size="sm"
                  className="bg-white text-[#1B5C2E] hover:bg-white/90 font-bold text-xs gap-1.5 shadow-sm"
                  onClick={() => handleDownloadReceptionSlip(selectedReception)}
                >
                  <Download className="h-3.5 w-3.5 text-[#1B5C2E]" />
                  Télécharger Récépissé (PDF)
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="bg-emerald-900/40 text-white border-white/40 hover:bg-white/20 font-bold text-xs gap-1"
                >
                  <Link href={`/dashboard/waste/new?edit=${selectedReception.reception_number}`}>
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Link>
                </Button>
              </div>
            </div>

            {/* Corps du dialogue : Métadonnées + L'Éclaté des Déchets */}
            <div className="p-4 sm:p-6 space-y-4">
              
              {/* Informations du Centre et du Déposant */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Structure / Centre</span>
                  <span className="font-bold text-foreground text-sm">{selectedReception.source_structure}</span>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Code CTR : <span className="font-mono font-bold text-emerald-700">{selectedReception.center_code}</span> • {selectedReception.city}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Transporteur / Déposant</span>
                  <span className="font-semibold text-foreground">{selectedReception.depositor_name || "Non spécifié"}</span>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Tél : {selectedReception.depositor_phone || "-"}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Bilan de la Réception</span>
                  <span className="font-bold text-foreground text-sm">
                    {selectedReception.total_weight.toLocaleString('fr-FR')} kg ({selectedReception.batches.length} lots)
                  </span>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                    Redevance 8% : {selectedReception.abmed_fee_8_percent ? `${selectedReception.abmed_fee_8_percent.toLocaleString('fr-FR')} FCFA` : 'Calculé sur récépissé'}
                  </div>
                </div>
              </div>

              {/* TABLEAU DE L'ÉCLATÉ DES DÉCHETS INCLUS DANS CETTE RÉCEPTION */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-[#1B5C2E]" />
                    L&apos;Éclaté des Déchets ({selectedReception.batches.length} lots apportés)
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Poids total cumulé : <strong className="text-foreground">{selectedReception.total_weight.toLocaleString('fr-FR')} kg</strong>
                  </span>
                </div>

                <div className="border border-border/70 rounded-xl overflow-x-auto shadow-2xs max-h-[300px] overflow-y-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-xs">
                      <TableRow>
                        <TableHead className="text-[10px] font-bold uppercase py-2">N° Lot Déchet</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase py-2">Désignation / Nom Commercial</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase py-2">Catégorie Officielle</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase py-2 text-right">Poids (Kg)</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase py-2">Conditionnement</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase py-2">Emplacement</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase py-2 text-center">Statut</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase py-2 text-right pr-3">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReception.batches.map((b: any, bIdx: number) => (
                        <TableRow key={b.id || bIdx} className="hover:bg-muted/30 text-xs">
                          <TableCell className="font-mono font-bold text-foreground whitespace-nowrap">
                            {b.batch_number}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {b.commercial_name || b.waste_type || "Déchet pharmaceutique"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[11px]">
                            {b.product_category || "Non classé"}
                          </TableCell>
                          <TableCell className="text-right font-black text-foreground tabular-nums whitespace-nowrap">
                            {Number(b.quantity) || 0} {b.unit || 'Kg'}
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {b.packaging_type || b.packaging || "Carton scellé"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[11px] whitespace-nowrap">
                            {b.current_location || "Magasin Déchets"}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            <Badge variant="outline" className="text-[9.5px] font-semibold">
                              {b.status || "Déclaré"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-3 whitespace-nowrap">
                            <Button variant="ghost" size="sm" asChild className="h-6.5 px-2 text-[10.5px] text-red-600 font-bold hover:bg-red-50">
                              <Link href={`/dashboard/waste/${b.id}`}>
                                <Eye className="h-3 w-3 mr-0.5" /> Voir
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pièces jointes & Documents s'il y en a */}
              {selectedReception.attached_docs && selectedReception.attached_docs.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Paperclip className="h-3 w-3 text-[#1B5C2E]" />
                    Documents Joints & Justificatifs du Centre ({selectedReception.attached_docs.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedReception.attached_docs.map((doc: any, dIdx: number) => (
                      <div key={dIdx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-muted/30 text-xs">
                        <FileText className="h-3.5 w-3.5 text-red-600" />
                        <span className="font-medium text-foreground truncate max-w-[200px]" title={doc.name}>
                          {doc.name || `Document-${dIdx + 1}`}
                        </span>
                        {doc.data_url && (
                          <a 
                            href={doc.data_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-emerald-700 hover:underline font-bold text-[10.5px] ml-1"
                          >
                            Ouvrir
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <DialogFooter className="p-4 bg-muted/20 border-t border-border/50 flex flex-row justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Bordereau archivé et sécurisé eGED ABMed
              </span>
              <Button variant="outline" size="sm" onClick={() => setSelectedReception(null)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* 8. DIALOGUE D'IMPRESSION D'ÉTIQUETTES */}
      <LabelPrintDialog 
        isOpen={isPrintDialogOpen}
        onClose={() => {
          setIsPrintDialogOpen(false)
          setPrintDialogItems([])
          setSelectedIds([])
        }}
        type="waste"
        items={printDialogItems}
      />
    </div>
  )
}
