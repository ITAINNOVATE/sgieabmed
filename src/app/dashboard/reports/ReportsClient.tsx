'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  BarChart3,
  FileText,
  TestTube2,
  Trash2,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  FileOutput,
  TrendingUp,
  RefreshCw,
  Calendar,
  Building2,
  DollarSign,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Flame,
  ArrowRightLeft,
  Clock,
  Layers,
} from 'lucide-react'
import {
  exportToCSV,
  exportToExcel,
  exportOfficialReportPDF,
} from "@/utils/exportUtils"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

interface Sample {
  id: string
  sample_number?: string
  commercial_name?: string
  quantity?: number
  status?: string
  storage_location?: string
  expiry_date?: string
  created_at?: string
  reception_ref?: string
  [key: string]: unknown
}

interface Movement {
  id: string
  movement_type?: string
  quantity?: number
  from_location?: string
  to_location?: string
  created_at?: string
  beneficiary?: string
  operator?: string
  product_name?: string
  sample_id?: string
  [key: string]: unknown
}

interface WasteBatch {
  id: string
  batch_number?: string
  commercial_name?: string
  waste_type?: string
  product_category?: string
  product_nature?: string
  destruction_motive?: string
  warehouse?: string
  quantity?: number
  unit?: string
  status?: string
  source_structure?: string
  source_structure_type?: string
  transfer_cost_mode?: string
  transfer_cost_amount?: number
  abmed_fee_8_percent?: number
  reception_date?: string
  date_reception?: string
  created_at?: string
  [key: string]: unknown
}

interface DestructionPlan {
  id: string
  plan_number?: string
  status?: string
  destruction_method?: string
  destruction_site?: string
  total_weight?: number
  execution_date?: string
  created_at?: string
  batches?: any[]
  [key: string]: unknown
}

interface ReceptionRecord {
  id: string
  rec_number?: string
  reception_number?: string
  supplier?: string
  manufacturer?: string
  country?: string
  type_reception?: string
  date_reception?: string
  created_at?: string
  status?: string
  check_conform?: boolean
  samples_data?: any[]
  [key: string]: unknown
}

interface Props {
  samples?: Sample[]
  movements?: Movement[]
  wasteBatches?: WasteBatch[]
  destructions?: DestructionPlan[]
}

const PIE_COLORS = ['#1B5C2E', '#22c55e', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6']

export default function ReportsClient({
  samples: initialSamples = [],
  movements: initialMovements = [],
  wasteBatches: initialWaste = [],
  destructions: initialDestructions = [],
}: Props) {
  // Navigation & Types de Rapports
  const [reportGroup, setReportGroup] = useState<'waste' | 'samples' | 'executive'>('waste')
  const [reportType, setReportType] = useState('waste_receptions')

  // Filtres
  const [periodPreset, setPeriodPreset] = useState('year_2026')
  const [customStartDate, setCustomStartDate] = useState('2026-01-01')
  const [customEndDate, setCustomEndDate] = useState('2026-12-31')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Données
  const [samples, setSamples] = useState<Sample[]>(initialSamples)
  const [receptions, setReceptions] = useState<ReceptionRecord[]>([])
  const [movements, setMovements] = useState<Movement[]>(initialMovements)
  const [wasteBatches, setWasteBatches] = useState<WasteBatch[]>(initialWaste)
  const [destructions, setDestructions] = useState<DestructionPlan[]>(initialDestructions)
  const [isSyncing, setIsSyncing] = useState(false)
  const hasLoadedOnceRef = useRef(false)

  // Chargement des données unifiées
  const loadReportsData = useCallback(async (manual = false) => {
    if (typeof window === 'undefined') return
    if (manual) setIsSyncing(true)

    const isWiped = localStorage.getItem('all_data_wiped') === 'true'
    let sampleOverrides: Record<string, any> = {}
    let deletedIds: string[] = []
    try {
      const ov = localStorage.getItem('local_sample_overrides')
      if (ov) sampleOverrides = JSON.parse(ov)
      deletedIds = JSON.parse(localStorage.getItem('reception_deleted_ids') || '[]')
    } catch (e) {}

    const sampleMap = new Map<string, any>()
    const recMap = new Map<string, any>()
    const mvtMap = new Map<string, any>()
    const wasteMap = new Map<string, any>()
    const destMap = new Map<string, any>()

    if (!isWiped) {
      try {
        const localRecs = JSON.parse(
          localStorage.getItem('reception_history_records') ||
          localStorage.getItem('local_receptions_history') ||
          '[]'
        )
        if (Array.isArray(localRecs)) {
          localRecs.forEach((r: any) => {
            const rKey = r.rec_number || r.reception_number || r.id
            if (!rKey || deletedIds.includes(rKey)) return
            recMap.set(rKey, r)

            let sList = Array.isArray(r.samples_data) ? r.samples_data : []
            if (sList.length === 0) {
              const rawDetails = localStorage.getItem('reception_draft_details_' + rKey)
              if (rawDetails) {
                try {
                  const parsed = JSON.parse(rawDetails)
                  if (Array.isArray(parsed?.formData?.samples)) sList = parsed.formData.samples
                } catch (e) {}
              }
            }
            sList.forEach((s: any, idx: number) => {
              if (!s.commercial_name) return
              const sid = s.sample_number || s.id || `ECH-${String(rKey).replace('REC-', '')}-${idx + 1}`
              if (deletedIds.includes(sid)) return
              const ov = sampleOverrides[sid] || sampleOverrides[s.sample_number] || {}
              sampleMap.set(sid, {
                id: sid,
                sample_number: sid,
                commercial_name: s.commercial_name || 'Échantillon',
                quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.qty ?? s.quantity ?? s.received_quantity ?? 1),
                status: ov.status || s.status || 'Disponible',
                storage_location: ov.storage_location || s.location || s.storage_location || 'Magasin Central',
                expiry_date: s.expiry_date || s.expiry || '2027-12-31',
                created_at: r.date_reception || r.created_at || new Date().toISOString(),
                reception_ref: rKey,
              })
            })
          })
        }

        const localMvts = JSON.parse(localStorage.getItem('local_movements_history') || '[]')
        if (Array.isArray(localMvts)) {
          localMvts.forEach((m: any) => {
            if (m.id) mvtMap.set(m.id, m)
          })
        }

        const localWaste = JSON.parse(localStorage.getItem('waste_batches_custom_v1') || '[]')
        if (Array.isArray(localWaste)) {
          localWaste.forEach((w: any) => {
            const k = w.batch_number || w.id
            if (k) wasteMap.set(k, w)
          })
        }

        const localDest = JSON.parse(localStorage.getItem('destruction_plans_custom_v1') || '[]')
        if (Array.isArray(localDest)) {
          localDest.forEach((d: any) => {
            const k = d.plan_number || d.id
            if (k) destMap.set(k, d)
          })
        }
      } catch (e) {}

      if (!hasLoadedOnceRef.current && (sampleMap.size > 0 || wasteMap.size > 0)) {
        setSamples(Array.from(sampleMap.values()))
        setReceptions(Array.from(recMap.values()))
        setMovements(Array.from(mvtMap.values()))
        setWasteBatches(Array.from(wasteMap.values()))
        setDestructions(Array.from(destMap.values()))
        hasLoadedOnceRef.current = true
      }
    }

    try {
      const supabase = createClient()
      const [sRes, rRes, mRes, wRes, dRes] = await Promise.all([
        supabase.from('samples').select('*'),
        supabase.from('receptions').select('*'),
        supabase.from('movements').select('*'),
        supabase.from('waste_batches').select('*'),
        supabase.from('destruction_plans').select('*'),
      ])

      if (rRes.data && rRes.data.length > 0) {
        rRes.data.forEach((r: any) => {
          const rKey = r.rec_number || r.reception_number || r.id
          if (!rKey || deletedIds.includes(rKey)) return
          recMap.set(rKey, r)
          if (Array.isArray(r.samples_data)) {
            r.samples_data.forEach((s: any, idx: number) => {
              if (!s.commercial_name) return
              const sid = s.sample_number || s.id || `ECH-${String(rKey).replace('REC-', '')}-${idx + 1}`
              if (!sampleMap.has(sid) && !deletedIds.includes(sid)) {
                const ov = sampleOverrides[sid] || {}
                sampleMap.set(sid, {
                  id: sid,
                  sample_number: sid,
                  commercial_name: s.commercial_name || 'Échantillon',
                  quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.qty ?? s.quantity ?? 1),
                  status: ov.status || s.status || 'Disponible',
                  storage_location: ov.storage_location || s.location || 'Magasin Central',
                  expiry_date: s.expiry_date || '2027-12-31',
                  created_at: r.date_reception || r.created_at || new Date().toISOString(),
                  reception_ref: rKey,
                })
              }
            })
          }
        })
      }

      if (sRes.data && sRes.data.length > 0) {
        sRes.data.forEach((s: any) => {
          const sid = s.sample_number || s.id
          if (!sid || deletedIds.includes(sid)) return
          const ov = sampleOverrides[sid] || sampleOverrides[s.id] || {}
          sampleMap.set(sid, {
            ...s,
            quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.quantity ?? 1),
            status: ov.status || s.status || 'Disponible',
          })
        })
      }

      if (mRes.data && mRes.data.length > 0) {
        mRes.data.forEach((m: any) => {
          if (m.id) mvtMap.set(m.id, m)
        })
      }

      if (wRes.data && wRes.data.length > 0) {
        wRes.data.forEach((w: any) => {
          const k = w.batch_number || w.id
          if (k) wasteMap.set(k, w)
        })
      }

      if (dRes.data && dRes.data.length > 0) {
        dRes.data.forEach((d: any) => {
          const k = d.plan_number || d.id
          if (k) destMap.set(k, d)
        })
      }

      hasLoadedOnceRef.current = true
      setSamples(Array.from(sampleMap.values()))
      setReceptions(Array.from(recMap.values()))
      setMovements(Array.from(mvtMap.values()))
      setWasteBatches(Array.from(wasteMap.values()))
      setDestructions(Array.from(destMap.values()))
    } catch (err) {
      console.warn("Sync fallback in ReportsClient:", err)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    loadReportsData()
  }, [loadReportsData])

  useRealtimeSync({
    tables: ['samples', 'receptions', 'movements', 'waste_batches', 'destruction_plans'],
    onSync: loadReportsData,
    pollIntervalMs: 8000,
  })

  // Calcul des bornes de dates selon le preset
  const dateRange = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    let start = new Date(currentYear, 0, 1)
    let end = new Date(currentYear, 11, 31, 23, 59, 59)
    let label = 'Exercice en cours'

    switch (periodPreset) {
      case 'today': {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        label = "Aujourd'hui (" + now.toLocaleDateString('fr-FR') + ")"
        break
      }
      case 'week': {
        const day = now.getDay()
        const diff = now.getDate() - day + (day === 0 ? -6 : 1)
        start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0)
        end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59)
        label = 'Cette semaine'
        break
      }
      case 'month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        label = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
        break
      }
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3)
        start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0)
        end = new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59)
        label = `T${q + 1} ${currentYear}`
        break
      }
      case 'year_2025': {
        start = new Date(2025, 0, 1, 0, 0, 0)
        end = new Date(2025, 11, 31, 23, 59, 59)
        label = 'Exercice 2025'
        break
      }
      case 'year_2026': {
        start = new Date(2026, 0, 1, 0, 0, 0)
        end = new Date(2026, 11, 31, 23, 59, 59)
        label = 'Exercice 2026'
        break
      }
      case 'custom': {
        start = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date(2020, 0, 1)
        end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date()
        label = `Du ${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')}`
        break
      }
      default: {
        start = new Date(currentYear, 0, 1, 0, 0, 0)
        end = new Date(currentYear, 11, 31, 23, 59, 59)
        label = `Année Civile ${currentYear}`
        break
      }
    }

    return { start, end, label }
  }, [periodPreset, customStartDate, customEndDate])

  // Helper de filtrage par date
  const isDateInRange = useCallback((dateStr?: string | null) => {
    if (!dateStr) return true
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return true
      return d >= dateRange.start && d <= dateRange.end
    } catch {
      return true
    }
  }, [dateRange])

  // Helper de filtrage par magasin
  const isWarehouseMatch = useCallback((wh?: string | null) => {
    if (selectedWarehouse === 'all') return true
    if (!wh) return selectedWarehouse === 'Magasin Cotonou'
    return wh.toLowerCase().includes(selectedWarehouse.toLowerCase())
  }, [selectedWarehouse])

  // Filtrage des collections selon la période et le magasin
  const filteredWaste = useMemo(() => {
    return wasteBatches.filter((w) => {
      const d = w.reception_date || w.date_reception || w.created_at
      const dateOk = isDateInRange(d)
      const whOk = isWarehouseMatch(w.warehouse)
      const catOk = selectedCategory === 'all' || (w.product_category || '').includes(selectedCategory)
      return dateOk && whOk && catOk
    })
  }, [wasteBatches, isDateInRange, isWarehouseMatch, selectedCategory])

  const filteredSamples = useMemo(() => {
    return samples.filter((s) => {
      const d = s.created_at
      const dateOk = isDateInRange(d)
      const whOk = isWarehouseMatch(s.storage_location)
      return dateOk && whOk
    })
  }, [samples, isDateInRange, isWarehouseMatch])

  const filteredReceptions = useMemo(() => {
    return receptions.filter((r) => {
      const d = r.date_reception || r.created_at
      return isDateInRange(d)
    })
  }, [receptions, isDateInRange])

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const d = m.created_at
      const dateOk = isDateInRange(d)
      const whOk = isWarehouseMatch(m.from_location) || isWarehouseMatch(m.to_location)
      return dateOk && whOk
    })
  }, [movements, isDateInRange, isWarehouseMatch])

  const filteredDestructions = useMemo(() => {
    return destructions.filter((d) => {
      const dt = d.execution_date || d.created_at
      return isDateInRange(dt)
    })
  }, [destructions, isDateInRange])

  // Indicateurs & KPIs dynamiques calculés
  const kpis = useMemo(() => {
    // 1. Échantillons
    const totalSamplesStock = samples.reduce((acc, s) => acc + (Number(s.quantity) || 1), 0)
    const samplesReceivedInPeriod = filteredSamples.length

    // 2. Déchets Reçus
    const totalWasteKg = filteredWaste.reduce((acc, w) => acc + (Number(w.quantity) || 0), 0)
    const totalWasteTonnes = (totalWasteKg / 1000).toFixed(2)

    // 3. Déchets Détruits
    const totalDestroyedKg = filteredDestructions
      .filter((d) => (d.status || '').toLowerCase().includes('exé') || (d.status || '').toLowerCase().includes('exec') || (d.status || '').toLowerCase().includes('détruit'))
      .reduce((acc, d) => acc + (Number(d.total_weight) || 0), 0)

    // 4. Bilan Financier (Cessions & Redevance 8%)
    const totalTransferCostFCFA = filteredWaste.reduce((acc, w) => {
      return acc + (Number(w.transfer_cost_amount) || 0)
    }, 0)

    const totalAbmedFeeFCFA = filteredWaste.reduce((acc, w) => {
      if (w.abmed_fee_8_percent !== undefined && w.abmed_fee_8_percent !== null) {
        return acc + Number(w.abmed_fee_8_percent)
      }
      return acc + Math.round((Number(w.transfer_cost_amount) || 0) * 0.08)
    }, 0)

    // 5. Mouvements & Conformité
    const mvtCount = filteredMovements.length
    const nonConformSamples = filteredSamples.filter((s) => (s.status || '').toLowerCase().includes('quarantaine')).length
    const conformityRate = filteredSamples.length === 0 ? 100 : Math.round(((filteredSamples.length - nonConformSamples) / filteredSamples.length) * 100)

    return {
      totalSamplesStock,
      samplesReceivedInPeriod,
      totalWasteKg,
      totalWasteTonnes,
      totalDestroyedKg,
      totalTransferCostFCFA,
      totalAbmedFeeFCFA,
      mvtCount,
      conformityRate,
    }
  }, [samples, filteredSamples, filteredWaste, filteredDestructions, filteredMovements])

  // Données de graphiques
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {}
    filteredWaste.forEach((w) => {
      const cat = w.product_category || 'Non catégorisé'
      const simpleCat = cat.split('-')[0].trim()
      map[simpleCat] = (map[simpleCat] || 0) + (Number(w.quantity) || 0)
    })
    return Object.entries(map).map(([name, weight]) => ({ name, weight }))
  }, [filteredWaste])

  const sampleStatusData = useMemo(() => {
    const counts = {
      'En stock': filteredSamples.filter((s) => s.status === 'Disponible' || s.status === 'En stock' || !s.status).length,
      'Quarantaine': filteredSamples.filter((s) => (s.status || '').toLowerCase().includes('quarantaine')).length,
      'En analyse': filteredSamples.filter((s) => (s.status || '').toLowerCase().includes('analyse')).length,
      'Périmé': filteredSamples.filter((s) => (s.status || '').toLowerCase().includes('périmé') || (s.status || '').toLowerCase().includes('expire')).length,
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredSamples])

  // Configuration détaillée des rapports disponibles
  const reportDefinitions: Record<
    string,
    {
      title: string
      group: 'waste' | 'samples' | 'executive'
      description: string
      getRows: () => { headers: string[]; rows: any[][]; exportData: Record<string, any>[] }
    }
  > = useMemo(() => {
    return {
      waste_receptions: {
        title: "Registre Chronologique des Réceptions de Déchets",
        group: "waste",
        description: "Historique complet des réceptions avec structure déposante, nature, poids et valorisation financière.",
        getRows: () => {
          const headers = [
            "Date Réception",
            "N° Lot Déchet",
            "Désignation",
            "Structure Déposante",
            "Catégorie ABMed",
            "Poids (Kg)",
            "Coût Cession (FCFA)",
            "Redevance 8% (FCFA)",
            "Magasin",
          ]
          const exportData: Record<string, any>[] = filteredWaste.map((w) => {
            const dateStr = w.reception_date || w.date_reception || w.created_at ? new Date(w.reception_date || w.date_reception || w.created_at || '').toLocaleDateString('fr-FR') : '-'
            const fee = w.abmed_fee_8_percent !== undefined ? Number(w.abmed_fee_8_percent) : Math.round((Number(w.transfer_cost_amount) || 0) * 0.08)
            return {
              "Date Réception": dateStr,
              "N° Lot Déchet": w.batch_number || w.id,
              "Désignation": w.commercial_name || w.waste_type || "Déchets pharmaceutiques",
              "Structure Déposante": w.source_structure || "Structure non déclarée",
              "Catégorie ABMed": (w.product_category || "Non classé").substring(0, 32),
              "Poids (Kg)": `${Number(w.quantity) || 0} kg`,
              "Coût Cession (FCFA)": (Number(w.transfer_cost_amount) || 0).toLocaleString('fr-FR'),
              "Redevance 8% (FCFA)": fee.toLocaleString('fr-FR'),
              "Magasin": w.warehouse || "Magasin Cotonou",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      waste_financial: {
        title: "Bilan Financier des Cessions & Redevances ABMed (8%)",
        group: "waste",
        description: "Valorisation financière des cessions de déchets et calcul de la redevance légale de 8% due à l'ABMed.",
        getRows: () => {
          const headers = [
            "N° Lot Déchet",
            "Date Réception",
            "Structure Déposante",
            "Mode de Cession",
            "Poids (Kg)",
            "Montant Cession (FCFA)",
            "Redevance 8% ABMed (FCFA)",
            "Statut Décharge",
          ]
          const exportData: Record<string, any>[] = filteredWaste.map((w) => {
            const dateStr = w.reception_date || w.date_reception || w.created_at ? new Date(w.reception_date || w.date_reception || w.created_at || '').toLocaleDateString('fr-FR') : '-'
            const fee = w.abmed_fee_8_percent !== undefined ? Number(w.abmed_fee_8_percent) : Math.round((Number(w.transfer_cost_amount) || 0) * 0.08)
            return {
              "N° Lot Déchet": w.batch_number || w.id,
              "Date Réception": dateStr,
              "Structure Déposante": w.source_structure || "Officine / Grossiste",
              "Mode de Cession": w.transfer_cost_mode || "À titre onéreux",
              "Poids (Kg)": `${Number(w.quantity) || 0} kg`,
              "Montant Cession (FCFA)": (Number(w.transfer_cost_amount) || 0).toLocaleString('fr-FR'),
              "Redevance 8% ABMed (FCFA)": fee.toLocaleString('fr-FR'),
              "Statut Décharge": w.status || "Réceptionné",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      waste_categories: {
        title: "Ventilation des Déchets par Catégories Officielles ABMed (Cat. 1 à 5)",
        group: "waste",
        description: "Répartition analytique des masses et valorisations financières selon la nomenclature réglementaire.",
        getRows: () => {
          const headers = [
            "Catégorie Réglementaire",
            "Nombre de Lots",
            "Poids Total (Kg)",
            "Poids (Tonnes)",
            "Montant Cession (FCFA)",
            "Redevance ABMed (8%)",
            "Part du Tonnage (%)",
          ]
          const catMap: Record<string, { count: number; weight: number; cost: number; fee: number }> = {}
          let totalWeightAll = 0

          filteredWaste.forEach((w) => {
            const cat = w.product_category || 'Non classé'
            const wt = Number(w.quantity) || 0
            const cost = Number(w.transfer_cost_amount) || 0
            const fee = w.abmed_fee_8_percent !== undefined ? Number(w.abmed_fee_8_percent) : Math.round(cost * 0.08)

            totalWeightAll += wt
            if (!catMap[cat]) catMap[cat] = { count: 0, weight: 0, cost: 0, fee: 0 }
            catMap[cat].count += 1
            catMap[cat].weight += wt
            catMap[cat].cost += cost
            catMap[cat].fee += fee
          })

          const exportData: Record<string, any>[] = Object.entries(catMap).map(([cat, val]) => {
            const pct = totalWeightAll > 0 ? ((val.weight / totalWeightAll) * 100).toFixed(1) : '0'
            return {
              "Catégorie Réglementaire": cat,
              "Nombre de Lots": String(val.count),
              "Poids Total (Kg)": `${val.weight.toLocaleString('fr-FR')} kg`,
              "Poids (Tonnes)": `${(val.weight / 1000).toFixed(2)} T`,
              "Montant Cession (FCFA)": val.cost.toLocaleString('fr-FR'),
              "Redevance ABMed (8%)": val.fee.toLocaleString('fr-FR'),
              "Part du Tonnage (%)": `${pct} %`,
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      waste_seizures: {
        title: "Registre des Produits Saisis & Rappels de Lots",
        group: "waste",
        description: "Traçabilité des produits pharmaceutiques séquestrés pour saisie, contentieux ou rappel de lot fabricant.",
        getRows: () => {
          const headers = [
            "N° Lot Déchet",
            "Désignation Produit",
            "Typologie / Motif",
            "Structure / Origine",
            "Poids (Kg)",
            "Magasin de Séquestre",
            "Date Constat",
            "Statut Légal",
          ]
          const seizureBatches = filteredWaste.filter((w) => {
            const m = (w.destruction_motive || '').toLowerCase()
            return m.includes('saisi') || m.includes('rappel') || m.includes('contentieux') || m.includes('douane')
          })
          const exportData: Record<string, any>[] = seizureBatches.map((w) => {
            return {
              "N° Lot Déchet": w.batch_number || w.id,
              "Désignation Produit": w.commercial_name || w.waste_type || "Produit sous séquestre",
              "Typologie / Motif": w.destruction_motive || "Produit saisi",
              "Structure / Origine": w.source_structure || "Origine saisie",
              "Poids (Kg)": `${Number(w.quantity) || 0} kg`,
              "Magasin de Séquestre": w.warehouse || "Magasin Cotonou",
              "Date Constat": w.reception_date || w.created_at ? new Date(w.reception_date || w.created_at || '').toLocaleDateString('fr-FR') : '-',
              "Statut Légal": w.status || "Séquestré / En attente jugement",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      waste_destructions: {
        title: "Opérations de Destruction & PV Délivrés",
        group: "waste",
        description: "Bilan des campagnes d'incinération, broyage et neutralisation physique avec PV officiels d'huissier.",
        getRows: () => {
          const headers = [
            "N° Plan Destruction",
            "Date d'Exécution",
            "Site de Destruction",
            "Méthode Employée",
            "Poids Traité (Kg)",
            "Statut d'Exécution",
            "Attestation / PV",
          ]
          const exportData: Record<string, any>[] = filteredDestructions.map((d) => {
            const dtStr = d.execution_date || d.created_at ? new Date(d.execution_date || d.created_at || '').toLocaleDateString('fr-FR') : '-'
            return {
              "N° Plan Destruction": d.plan_number || d.id,
              "Date d'Exécution": dtStr,
              "Site de Destruction": d.destruction_site || "Incinérateur Spécialisé ABMed",
              "Méthode Employée": d.destruction_method || "Incinération à haute température",
              "Poids Traité (Kg)": `${Number(d.total_weight) || 0} kg`,
              "Statut d'Exécution": d.status || "Exécuté",
              "Attestation / PV": "Certificat PSQIF délivré",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      samples_receptions: {
        title: "Registre des Réceptions d'Échantillons",
        group: "samples",
        description: "Dossiers de dépôt d'échantillons pharmaceutiques pour enregistrement, contrôle qualité et analyse LNC.",
        getRows: () => {
          const headers = [
            "N° Réception",
            "Date",
            "Demandeur / Fabricant",
            "Pays d'Origine",
            "Motif de Dépôt",
            "Nb Produits",
            "Conformité Physique",
            "Statut Dossier",
          ]
          const exportData: Record<string, any>[] = filteredReceptions.map((r) => {
            const dtStr = r.date_reception || r.created_at ? new Date(r.date_reception || r.created_at || '').toLocaleDateString('fr-FR') : '-'
            const count = Array.isArray(r.samples_data) ? r.samples_data.length : 1
            return {
              "N° Réception": r.rec_number || r.reception_number || r.id,
              "Date": dtStr,
              "Demandeur / Fabricant": `${r.supplier || 'Demandeur'}${r.manufacturer ? ` (${r.manufacturer})` : ''}`,
              "Pays d'Origine": r.country || "Bénin",
              "Motif de Dépôt": r.type_reception || "Contrôle Qualité / AMM",
              "Nb Produits": String(count),
              "Conformité Physique": r.check_conform !== false ? "Conforme" : "Réserves",
              "Statut Dossier": r.status || "Validée",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      samples_stock: {
        title: "État Détaillé du Stock & Échantillothèque",
        group: "samples",
        description: "Inventaire dynamique des échantillons conservés en chambre froide, salle climatisée et armoires sécurisées.",
        getRows: () => {
          const headers = [
            "N° Échantillon",
            "Nom Commercial / Produit",
            "Quantité en Stock",
            "Statut",
            "Emplacement de Stockage",
            "Date de Péremption",
            "Réf. Dossier Réception",
          ]
          const exportData: Record<string, any>[] = filteredSamples.map((s) => {
            return {
              "N° Échantillon": s.sample_number || s.id,
              "Nom Commercial / Produit": s.commercial_name || "Échantillon pharmaceutique",
              "Quantité en Stock": String(s.quantity ?? 1),
              "Statut": s.status || "Disponible",
              "Emplacement de Stockage": s.storage_location || "Magasin Central",
              "Date de Péremption": s.expiry_date || "2027-12-31",
              "Réf. Dossier Réception": s.reception_ref || "-",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      samples_movements: {
        title: "Journal des Mouvements & Sorties (LNC, Dotations Personnel)",
        group: "samples",
        description: "Traçabilité des sorties pour essais en laboratoire LNC, transferts internes et dotations du personnel.",
        getRows: () => {
          const headers = [
            "Date & Heure",
            "Type de Mouvement",
            "Produit / Échantillon",
            "Quantité",
            "Origine",
            "Destination / Bénéficiaire",
            "Opérateur ABMed",
          ]
          const exportData: Record<string, any>[] = filteredMovements.map((m) => {
            const dtStr = m.created_at ? new Date(m.created_at).toLocaleString('fr-FR') : '-'
            return {
              "Date & Heure": dtStr,
              "Type de Mouvement": m.movement_type || "Transfert",
              "Produit / Échantillon": m.product_name || m.sample_id || "Échantillon",
              "Quantité": String(m.quantity ?? 1),
              "Origine": m.from_location || "Échantillothèque",
              "Destination / Bénéficiaire": m.to_location || m.beneficiary || "Laboratoire LNC",
              "Opérateur ABMed": m.operator || "Agent SGIE",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      samples_expirations: {
        title: "Veille & Calendrier des Échéances de Péremption",
        group: "samples",
        description: "Contrôle préventif des échantillons approchant de leur date limite d'utilisation.",
        getRows: () => {
          const headers = [
            "N° Échantillon",
            "Nom Commercial",
            "Quantité",
            "Date de Péremption",
            "Statut Validité",
            "Emplacement",
            "Recommandation",
          ]
          const exportData: Record<string, any>[] = filteredSamples.map((s) => {
            const isExp = (s.status || '').toLowerCase().includes('périmé')
            return {
              "N° Échantillon": s.sample_number || s.id,
              "Nom Commercial": s.commercial_name || "Échantillon",
              "Quantité": String(s.quantity ?? 1),
              "Date de Péremption": s.expiry_date || "2027-12-31",
              "Statut Validité": isExp ? "Périmé" : "Valide",
              "Emplacement": s.storage_location || "Magasin Central",
              "Recommandation": isExp ? "Transférer en Destruction Déchets" : "Conserver en échantillothèque",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      executive_summary: {
        title: "Bilan Général Consolidé SGIE (Direction Générale)",
        group: "executive",
        description: "Synthèse décisionnelle consolidant les tonnages, valorisations financières et indicateurs de performance.",
        getRows: () => {
          const headers = [
            "Indicateur Stratégique",
            "Valeur Constatée",
            "Unité",
            "Périmètre Géographique",
            "Observation / Conformité",
          ]
          const exportData: Record<string, any>[] = [
            {
              "Indicateur Stratégique": "Stock Total d'Échantillons Actifs",
              "Valeur Constatée": String(kpis.totalSamplesStock),
              "Unité": "Unités",
              "Périmètre Géographique": selectedWarehouse === 'all' ? "National" : selectedWarehouse,
              "Observation / Conformité": "Conforme aux normes de conservation BPL",
            },
            {
              "Indicateur Stratégique": "Échantillons Réceptionnés sur la Période",
              "Valeur Constatée": String(kpis.samplesReceivedInPeriod),
              "Unité": "Lots / Dossiers",
              "Périmètre Géographique": selectedWarehouse === 'all' ? "National" : selectedWarehouse,
              "Observation / Conformité": "Prise en charge intégrale SGIE",
            },
            {
              "Indicateur Stratégique": "Taux de Conformité des Échantillons",
              "Valeur Constatée": `${kpis.conformityRate} %`,
              "Unité": "Pourcentage",
              "Périmètre Géographique": "Laboratoires & Dépôts",
              "Observation / Conformité": kpis.conformityRate >= 95 ? "Excellent niveau de qualité" : "Vigilance sur quarantaines",
            },
            {
              "Indicateur Stratégique": "Masse Totale des Déchets Réceptionnés",
              "Valeur Constatée": `${kpis.totalWasteKg.toLocaleString('fr-FR')} kg (${kpis.totalWasteTonnes} T)`,
              "Unité": "Kg / Tonnes",
              "Périmètre Géographique": selectedWarehouse === 'all' ? "National" : selectedWarehouse,
              "Observation / Conformité": "Enregistré avec bordereaux officiels",
            },
            {
              "Indicateur Stratégique": "Masse Totale Neutralisée / Détruite",
              "Valeur Constatée": `${kpis.totalDestroyedKg.toLocaleString('fr-FR')} kg`,
              "Unité": "Kg",
              "Périmètre Géographique": "Sites d'incinération agréés",
              "Observation / Conformité": "Destruction conforme avec PV de contrôle",
            },
            {
              "Indicateur Stratégique": "Valeur Totale Déclarée des Cessions",
              "Valeur Constatée": `${kpis.totalTransferCostFCFA.toLocaleString('fr-FR')} FCFA`,
              "Unité": "FCFA",
              "Périmètre Géographique": "Structures Déposantes",
              "Observation / Conformité": "Base imposable de la redevance",
            },
            {
              "Indicateur Stratégique": "Redevance ABMed (8%) Cumulée",
              "Valeur Constatée": `${kpis.totalAbmedFeeFCFA.toLocaleString('fr-FR')} FCFA`,
              "Unité": "FCFA",
              "Périmètre Géographique": "Trésorerie ABMed",
              "Observation / Conformité": "Recouvrement légal au profit de l'Autorité",
            },
            {
              "Indicateur Stratégique": "Mouvements & Dotations Traçabilités",
              "Valeur Constatée": String(kpis.mvtCount),
              "Unité": "Opérations",
              "Périmètre Géographique": "Plateforme SGIE",
              "Observation / Conformité": "Traçabilité sans discontinuité",
            },
          ]
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },
    }
  }, [
    filteredWaste,
    filteredSamples,
    filteredReceptions,
    filteredMovements,
    filteredDestructions,
    kpis,
    selectedWarehouse,
  ])

  // Données actives pour le rapport actuellement sélectionné
  const currentReportData = useMemo(() => {
    const def = reportDefinitions[reportType] || reportDefinitions.waste_receptions
    return def.getRows()
  }, [reportDefinitions, reportType])

  // Données filtrées pour la prévisualisation dans la table (avec recherche textuelle)
  const previewRows = useMemo(() => {
    if (!searchQuery.trim()) return currentReportData.exportData
    const q = searchQuery.toLowerCase()
    return currentReportData.exportData.filter((row) => {
      return Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    })
  }, [currentReportData, searchQuery])

  // Gestion des exports
  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    const def = reportDefinitions[reportType] || reportDefinitions.waste_receptions
    const { headers, exportData, rows } = currentReportData
    const filename = `ABMed_Rapport_${reportType}_${dateRange.label.replace(/[^a-zA-Z0-9]/g, '_')}`

    if (format === 'CSV') {
      exportToCSV(exportData, headers, filename)
      toast.success(`Fichier CSV téléchargé avec succès !`)
    } else if (format === 'Excel') {
      exportToExcel(exportData, headers, filename)
      toast.success(`Classeur Excel (.xlsx) téléchargé avec succès !`)
    } else if (format === 'PDF') {
      const isWide = headers.length > 5
      exportOfficialReportPDF({
        title: def.title,
        subtitle: def.description,
        periodLabel: dateRange.label,
        warehouseLabel: selectedWarehouse === 'all' ? 'Tous les Magasins' : selectedWarehouse,
        kpis: [
          { label: "Enregistrements", value: String(exportData.length) },
          { label: "Tonnage Déchets", value: `${(kpis.totalWasteKg / 1000).toFixed(2)} T` },
          { label: "Cession Déclarée", value: `${kpis.totalTransferCostFCFA.toLocaleString('fr-FR')} F` },
          { label: "Redevance ABMed (8%)", value: `${kpis.totalAbmedFeeFCFA.toLocaleString('fr-FR')} F` },
          { label: "Conformité", value: `${kpis.conformityRate} %` },
        ],
        headers,
        rows,
        filename,
        orientation: isWide ? 'l' : 'p',
      })
      toast.success(`Rapport Officiel PDF généré et téléchargé !`)
    }
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 1. EN-TÊTE PRINCIPAL ABMED AVEC ACTIONS D'EXPORT */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-1 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                Rapports & Statistiques Réglementaires
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300">
                  SGIE ABMed
                </Badge>
              </h2>
              <p className="text-muted-foreground text-xs">
                Extraction périodique, valorisation financière (8%), traçabilité des destructions et synthèses décisionnelles.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadReportsData(true)}
            disabled={isSyncing}
            className="h-8 text-xs font-bold gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('CSV')}
            className="h-8 text-xs font-bold gap-1 shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('Excel')}
            className="h-8 text-xs font-bold gap-1 text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border-emerald-300 shadow-2xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" /> Excel (.xlsx)
          </Button>

          <Button
            size="sm"
            onClick={() => handleExport('PDF')}
            className="h-8 text-xs font-bold gap-1.5 bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-sm"
          >
            <FileOutput className="h-3.5 w-3.5" />
            Générer Rapport PDF Officiel
          </Button>
        </div>
      </div>

      {/* 2. BARRE DE FILTRES PÉRIODIQUES & MULTI-CRITÈRES */}
      <Card className="border border-border/70 rounded-xl bg-card shadow-2xs">
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
            
            {/* Période Preset */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-[#1B5C2E]" />
                Période d&apos;extraction
              </label>
              <Select value={periodPreset} onValueChange={(val) => setPeriodPreset(val || 'year_2026')}>
                <SelectTrigger className="h-8 text-xs bg-background font-medium">
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                  <SelectItem value="week">Cette semaine en cours</SelectItem>
                  <SelectItem value="month">Ce mois-ci</SelectItem>
                  <SelectItem value="quarter">Ce trimestre</SelectItem>
                  <SelectItem value="year_2026">Exercice 2026 (Année en cours)</SelectItem>
                  <SelectItem value="year_2025">Exercice 2025 (Clôturé)</SelectItem>
                  <SelectItem value="custom">Période personnalisée (Dates)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dates début et fin si Personnalisé */}
            {periodPreset === 'custom' ? (
              <>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Date début</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Date fin</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            ) : (
              <div className="md:col-span-3 flex items-center">
                <div className="px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border/60 text-xs text-muted-foreground w-full">
                  <span className="font-semibold text-foreground">Plage active : </span>
                  <span className="text-[#1B5C2E] font-bold">{dateRange.label}</span>
                </div>
              </div>
            )}

            {/* Magasin / Entrepôt */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3 text-[#1B5C2E]" />
                Site / Magasin
              </label>
              <Select value={selectedWarehouse} onValueChange={(val) => setSelectedWarehouse(val || 'all')}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Magasin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les Magasins (National)</SelectItem>
                  <SelectItem value="Magasin Cotonou">Magasin Cotonou (Siège)</SelectItem>
                  <SelectItem value="Magasin Parakou">Magasin Parakou (Nord)</SelectItem>
                  <SelectItem value="Autres">Autres sites & dépôts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Catégorie Produits Déchets */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Layers className="h-3 w-3 text-[#1B5C2E]" />
                Catégorie ABMed
              </label>
              <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || 'all')}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  <SelectItem value="Catégorie 1">Cat. 1 - Chimiques & toxiques</SelectItem>
                  <SelectItem value="Catégorie 2">Cat. 2 - Solides & gélules</SelectItem>
                  <SelectItem value="Catégorie 3">Cat. 3 - Liquides & sirops</SelectItem>
                  <SelectItem value="Catégorie 4">Cat. 4 - Aérosols & gaz</SelectItem>
                  <SelectItem value="Catégorie 5">Cat. 5 - Stupéfiants & psycho.</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* 3. CARTES KPI DYNAMIQUES FILTRÉES (6 INDICATEURS STRATÉGIQUES) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        
        {/* KPI 1 : Stock & Réceptions Échantillons */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E]">
              <TestTube2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                Échantillons Stock
              </p>
              <h3 className="text-base font-black text-foreground">
                {kpis.totalSamplesStock}
              </h3>
              <p className="text-[9px] text-emerald-700 font-medium">
                +{kpis.samplesReceivedInPeriod} reçus
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2 : Masse Déchets Reçus */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Trash2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                Déchets Reçus
              </p>
              <h3 className="text-base font-black text-foreground truncate">
                {kpis.totalWasteKg.toLocaleString('fr-FR')} <span className="text-[10px] font-semibold text-muted-foreground">kg</span>
              </h3>
              <p className="text-[9px] text-amber-700 font-medium">
                {kpis.totalWasteTonnes} Tonnes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3 : Masse Déchets Détruits */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
              <Flame className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                Masse Détruite
              </p>
              <h3 className="text-base font-black text-foreground truncate">
                {kpis.totalDestroyedKg.toLocaleString('fr-FR')} <span className="text-[10px] font-semibold text-muted-foreground">kg</span>
              </h3>
              <p className="text-[9px] text-red-600 font-medium">
                {filteredDestructions.length} opérations
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4 : Total Coût Cession Déclaré */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                Cessions Déclarées
              </p>
              <h3 className="text-sm font-black text-foreground truncate">
                {kpis.totalTransferCostFCFA.toLocaleString('fr-FR')}
              </h3>
              <p className="text-[9px] text-blue-600 font-medium truncate">
                Base imposable FCFA
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 5 : Redevance ABMed (8%) */}
        <Card className="shadow-2xs border border-emerald-500/30 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#1B5C2E] text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 truncate">
                Redevance ABMed (8%)
              </p>
              <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-100 truncate">
                {kpis.totalAbmedFeeFCFA.toLocaleString('fr-FR')} <span className="text-[9px]">F</span>
              </h3>
              <p className="text-[9px] text-emerald-700 font-bold truncate">
                Exigible / Encaissé
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 6 : Conformité & Mouvements */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                Conformité Qualité
              </p>
              <h3 className="text-base font-black text-foreground">
                {kpis.conformityRate}%
              </h3>
              <p className="text-[9px] text-purple-600 font-medium">
                {kpis.mvtCount} mouvements
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 4. SÉLECTION DU RAPPORT VIA ONGLETS ET MENU DÉTAILLÉ */}
      <Card className="border border-border/70 rounded-xl bg-card shadow-2xs">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#1B5C2E]" />
                Catalogue des Rapports Réglementaires ABMed
              </CardTitle>
              <CardDescription className="text-xs">
                {reportDefinitions[reportType]?.title} — {reportDefinitions[reportType]?.description}
              </CardDescription>
            </div>

            {/* Onglets de groupes de rapports */}
            <Tabs
              value={reportGroup}
              onValueChange={(val) => {
                const g = val as 'waste' | 'samples' | 'executive'
                setReportGroup(g)
                if (g === 'waste') setReportType('waste_receptions')
                if (g === 'samples') setReportType('samples_receptions')
                if (g === 'executive') setReportType('executive_summary')
              }}
              className="w-full md:w-auto"
            >
              <TabsList className="h-8 bg-muted/60 p-0.5">
                <TabsTrigger value="waste" className="text-xs font-bold px-2.5 py-1">
                  Déchets Pharmaceutiques
                </TabsTrigger>
                <TabsTrigger value="samples" className="text-xs font-bold px-2.5 py-1">
                  Échantillons & Contrôles
                </TabsTrigger>
                <TabsTrigger value="executive" className="text-xs font-bold px-2.5 py-1">
                  Synthèse Direction Générale
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-2 space-y-3">
          
          {/* Sous-sélecteur de type de rapport selon l'onglet actif */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {reportGroup === 'waste' && (
              <>
                <Button
                  variant={reportType === 'waste_receptions' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReportType('waste_receptions')}
                  className={`h-7 text-xs font-semibold ${reportType === 'waste_receptions' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
                >
                  Registre des Réceptions
                </Button>
                <Button
                  variant={reportType === 'waste_financial' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReportType('waste_financial')}
                  className={`h-7 text-xs font-semibold ${reportType === 'waste_financial' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
                >
                  Bilan Financier & Redevance 8%
                </Button>
                <Button
                  variant={reportType === 'waste_categories' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReportType('waste_categories')}
                  className={`h-7 text-xs font-semibold ${reportType === 'waste_categories' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
                >
                  Ventilation Catégories (1 à 5)
                </Button>
                <Button
                  variant={reportType === 'waste_seizures' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReportType('waste_seizures')}
                  className={`h-7 text-xs font-semibold ${reportType === 'waste_seizures' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
                >
                  Produits Saisis & Rappels de Lots
                </Button>
                <Button
                  variant={reportType === 'waste_destructions' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReportType('waste_destructions')}
                  className={`h-7 text-xs font-semibold ${reportType === 'waste_destructions' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
                >
                  Registre des Destructions & PV
                </Button>
              </>
            )}

            {reportGroup === 'samples' && (
              <>
                <Button
                  variant={reportType === 'samples_receptions' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReportType('samples_receptions')}
                  className={`h-7 text-xs font-semibold ${reportType === 'samples_receptions' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
                >
                  Réceptions & Dossiers Déposés
                </Button>
                <Button
                  variant={reportType === 'samples_stock' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReportType('samples_stock')}
                  className={`h-7 text-xs font-semibold ${reportType === 'samples_stock' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
                >
                  État du Stock Échantillothèque
                </Button>
                <Button
                  variant={reportType === 'samples_movements' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReportType('samples_movements')}
                  className={`h-7 text-xs font-semibold ${reportType === 'samples_movements' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
                >
                  Mouvements & Sorties (LNC/Personnel)
                </Button>
                <Button
                  variant={reportType === 'samples_expirations' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReportType('samples_expirations')}
                  className={`h-7 text-xs font-semibold ${reportType === 'samples_expirations' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
                >
                  Veille des Péremptions
                </Button>
              </>
            )}

            {reportGroup === 'executive' && (
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs font-semibold bg-[#1B5C2E] text-white"
              >
                Bilan Consolidé SGIE (Direction Générale)
              </Button>
            )}
          </div>

          {/* 5. TABLEAU DE PRÉVISUALISATION DYNAMIQUE DES DONNÉES */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filtrer dans ce rapport..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-background"
                  />
                </div>
                <Badge variant="outline" className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                  {previewRows.length} lignes
                </Badge>
              </div>

              <div className="text-[11px] text-muted-foreground font-medium">
                Période active : <span className="text-[#1B5C2E] font-bold">{dateRange.label}</span>
              </div>
            </div>

            <div className="border border-border/70 rounded-lg overflow-x-auto bg-card shadow-2xs max-h-[380px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-xs">
                  <TableRow>
                    {currentReportData.headers.map((h, idx) => (
                      <TableHead key={idx} className="py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={currentReportData.headers.length} className="text-center py-8 text-xs text-muted-foreground">
                        Aucun enregistrement ne correspond aux filtres et à la période sélectionnée ({dateRange.label}).
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewRows.map((row, rIdx) => (
                      <TableRow key={rIdx} className="hover:bg-muted/30 text-xs transition-colors">
                        {currentReportData.headers.map((h, cIdx) => {
                          const val = String(row[h] || '-')
                          const isCurrency = h.includes('FCFA') || h.includes('Montant') || h.includes('Redevance')
                          const isWeight = h.includes('Kg') || h.includes('Poids') || h.includes('Tonnes')

                          return (
                            <TableCell key={cIdx} className={`py-1.5 whitespace-nowrap ${isCurrency || isWeight ? 'font-semibold' : ''}`}>
                              {h.includes('Statut') || h.includes('Conformité') ? (
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1.5 py-0 ${
                                    val.toLowerCase().includes('conforme') || val.toLowerCase().includes('disponible') || val.toLowerCase().includes('exécuté') || val.toLowerCase().includes('valide')
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : val.toLowerCase().includes('périmé') || val.toLowerCase().includes('détruit') || val.toLowerCase().includes('saisi')
                                      ? 'bg-red-50 text-red-800 border-red-300'
                                      : 'bg-amber-50 text-amber-800 border-amber-300'
                                  }`}
                                >
                                  {val}
                                </Badge>
                              ) : isCurrency && val !== '-' && val !== '0' ? (
                                <span className="text-[#1B5C2E] font-bold">{val}</span>
                              ) : (
                                val
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* 6. SECTION STATISTIQUES GRAPHIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        
        {/* Graphique 1: Répartition Tonnage par Catégorie ABMed */}
        <Card className="border border-border/70 rounded-xl bg-card shadow-2xs">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Masse par Catégorie ABMed (Kg)</span>
              <Badge variant="outline" className="text-[9px] text-[#1B5C2E] border-[#1B5C2E]/30">
                Période : {dateRange.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val) => [`${Number(val).toLocaleString('fr-FR')} Kg`, 'Masse']}
                    contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                  />
                  <Bar dataKey="weight" fill="#1B5C2E" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Graphique 2: Statuts des Échantillons & Qualité */}
        <Card className="border border-border/70 rounded-xl bg-card shadow-2xs">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Répartition Statuts Échantillons</span>
              <span className="text-[10px] text-muted-foreground font-normal">Échantillothèque</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sampleStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={26}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {sampleStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-border/40 text-[10px]">
              {sampleStatusData.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center p-1 rounded-sm bg-muted/30">
                  <span className="text-muted-foreground truncate text-[9px]">{item.name}</span>
                  <span className="font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  )
}
