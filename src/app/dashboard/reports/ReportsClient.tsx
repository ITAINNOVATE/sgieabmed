'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
  CheckCircle2,
  Flame,
  ArrowRightLeft,
  Clock,
  Layers,
  Info,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
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

// -------------------------------------------------------------
// COMPOSANTS DE MINIATURES VISUELLES DE RAPPORTS (STYLE SCREENSHOT)
// -------------------------------------------------------------
function ReportThumbnail({ type }: { type: string }) {
  switch (type) {
    case 'waste_receptions':
      return (
        <div className="w-24 h-16 rounded border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-[#1B5C2E] rounded-xs mb-0.5 flex items-center px-1">
            <div className="h-1 w-6 bg-white/70 rounded-xs" />
          </div>
          <div className="space-y-0.5 flex-1">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex gap-1 items-center px-0.5">
              <div className="h-1 w-3 bg-slate-400 rounded-xs" />
              <div className="h-1 w-6 bg-slate-300 rounded-xs" />
              <div className="h-1 w-2 bg-emerald-500 rounded-xs ml-auto" />
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex gap-1 items-center px-0.5">
              <div className="h-1 w-4 bg-slate-400 rounded-xs" />
              <div className="h-1 w-5 bg-slate-300 rounded-xs" />
              <div className="h-1 w-2 bg-amber-500 rounded-xs ml-auto" />
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex gap-1 items-center px-0.5">
              <div className="h-1 w-3 bg-slate-400 rounded-xs" />
              <div className="h-1 w-7 bg-slate-300 rounded-xs" />
              <div className="h-1 w-2 bg-emerald-500 rounded-xs ml-auto" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-50 dark:bg-emerald-950/40 border-t border-emerald-200/50 flex justify-between items-center px-0.5">
            <div className="h-1 w-4 bg-emerald-600 rounded-xs" />
            <div className="h-1 w-3 bg-[#1B5C2E] rounded-xs" />
          </div>
        </div>
      )

    case 'waste_financial':
      return (
        <div className="w-24 h-16 rounded border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-emerald-700 rounded-xs flex items-center justify-between px-1">
            <div className="h-1 w-7 bg-white/80 rounded-xs" />
            <span className="text-[6px] text-white font-bold leading-none">8%</span>
          </div>
          <div className="flex gap-1 items-end h-7 pt-1 px-1">
            <div className="w-2.5 bg-slate-200 dark:bg-slate-700 rounded-xs h-3" />
            <div className="w-2.5 bg-slate-300 dark:bg-slate-600 rounded-xs h-5" />
            <div className="w-2.5 bg-emerald-500 rounded-xs h-6" />
            <div className="w-2.5 bg-[#1B5C2E] rounded-xs h-7" />
            <div className="w-2.5 bg-amber-500 rounded-xs h-4" />
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex items-center justify-between px-1">
            <span className="text-[5px] text-slate-500 font-bold">TOTAL FCFA</span>
            <div className="h-1 w-4 bg-emerald-600 rounded-xs" />
          </div>
        </div>
      )

    case 'samples_stock':
      return (
        <div className="w-24 h-16 rounded border border-border/80 bg-white dark:bg-slate-900 p-1 flex items-center justify-between shadow-2xs select-none pointer-events-none">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-600 flex items-center justify-center relative">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
          </div>
          <div className="flex-1 pl-1.5 space-y-1">
            <div className="space-y-0.5">
              <div className="flex justify-between text-[5px] text-slate-500">
                <span>Dispo</span>
                <span className="font-bold text-emerald-600">82%</span>
              </div>
              <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[82%]" />
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between text-[5px] text-slate-500">
                <span>Quar.</span>
                <span className="font-bold text-amber-500">18%</span>
              </div>
              <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-[18%]" />
              </div>
            </div>
          </div>
        </div>
      )

    case 'waste_categories':
      return (
        <div className="w-24 h-16 rounded border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-1.5 w-10 bg-slate-400 rounded-xs mb-0.5" />
          <div className="space-y-1 py-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[5px] text-slate-400 w-3">C1</span>
              <div className="h-1.5 bg-red-500 rounded-xs w-12" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[5px] text-slate-400 w-3">C2</span>
              <div className="h-1.5 bg-amber-500 rounded-xs w-16" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[5px] text-slate-400 w-3">C3</span>
              <div className="h-1.5 bg-emerald-500 rounded-xs w-10" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[5px] text-slate-400 w-3">C5</span>
              <div className="h-1.5 bg-purple-500 rounded-xs w-6" />
            </div>
          </div>
          <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-xs" />
        </div>
      )

    case 'samples_receptions':
      return (
        <div className="w-24 h-16 rounded border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-blue-700 rounded-xs mb-0.5 flex items-center px-1">
            <div className="h-1 w-8 bg-white/80 rounded-xs" />
          </div>
          <div className="space-y-0.5">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex items-center justify-between px-1">
              <div className="h-1 w-6 bg-slate-400 rounded-xs" />
              <div className="h-1 w-2 bg-blue-500 rounded-xs" />
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex items-center justify-between px-1">
              <div className="h-1 w-8 bg-slate-400 rounded-xs" />
              <div className="h-1 w-2 bg-blue-500 rounded-xs" />
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex items-center justify-between px-1">
              <div className="h-1 w-5 bg-slate-400 rounded-xs" />
              <div className="h-1 w-2 bg-emerald-500 rounded-xs" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-blue-50 dark:bg-blue-950/40 rounded-xs flex items-center justify-between px-1">
            <div className="h-1 w-4 bg-blue-600 rounded-xs" />
            <div className="h-1 w-3 bg-blue-400 rounded-xs" />
          </div>
        </div>
      )

    case 'waste_seizures':
      return (
        <div className="w-24 h-16 rounded border border-red-200 bg-red-50/40 dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-red-700 rounded-xs mb-0.5 flex items-center justify-between px-1">
            <div className="h-1 w-8 bg-white/80 rounded-xs" />
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <div className="space-y-0.5">
            <div className="h-1.5 w-full bg-red-100/70 dark:bg-red-950/40 rounded-xs flex items-center px-1 gap-1">
              <div className="w-1 h-1 bg-red-500 rounded-full" />
              <div className="h-1 w-10 bg-slate-400 rounded-xs" />
            </div>
            <div className="h-1.5 w-full bg-red-100/70 dark:bg-red-950/40 rounded-xs flex items-center px-1 gap-1">
              <div className="w-1 h-1 bg-red-500 rounded-full" />
              <div className="h-1 w-8 bg-slate-400 rounded-xs" />
            </div>
            <div className="h-1.5 w-full bg-red-100/70 dark:bg-red-950/40 rounded-xs flex items-center px-1 gap-1">
              <div className="w-1 h-1 bg-red-500 rounded-full" />
              <div className="h-1 w-11 bg-slate-400 rounded-xs" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-red-200/50 rounded-xs flex justify-end items-center px-1">
            <div className="h-1 w-5 bg-red-600 rounded-xs" />
          </div>
        </div>
      )

    case 'samples_movements':
      return (
        <div className="w-24 h-16 rounded border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-purple-700 rounded-xs mb-0.5 flex items-center px-1">
            <div className="h-1 w-7 bg-white/80 rounded-xs" />
          </div>
          <div className="flex items-center justify-around py-1">
            <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 flex items-center justify-center text-[7px] font-bold">
              IN
            </div>
            <div className="h-0.5 w-6 bg-purple-400 relative">
              <div className="absolute right-0 top-[-2px] w-1 h-1 border-t-2 border-r-2 border-purple-400 rotate-45" />
            </div>
            <div className="w-4 h-4 rounded bg-purple-600 text-white flex items-center justify-center text-[7px] font-bold">
              OUT
            </div>
          </div>
          <div className="h-1.5 w-full bg-purple-50 dark:bg-purple-950/30 rounded-xs flex items-center justify-between px-1">
            <div className="h-1 w-5 bg-purple-500 rounded-xs" />
            <div className="h-1 w-3 bg-purple-700 rounded-xs" />
          </div>
        </div>
      )

    case 'waste_destructions':
      return (
        <div className="w-24 h-16 rounded border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-amber-600 rounded-xs mb-0.5 flex items-center justify-between px-1">
            <div className="h-1 w-7 bg-white/80 rounded-xs" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
          </div>
          <div className="flex-1 flex flex-col justify-center items-center py-0.5">
            <div className="w-5 h-5 rounded-full border border-amber-500/40 flex items-center justify-center">
              <Flame className="w-3 h-3 text-amber-600" />
            </div>
            <span className="text-[5px] text-slate-500 font-bold mt-0.5">PV OFFICIEL</span>
          </div>
          <div className="h-1.5 w-full bg-amber-50 dark:bg-amber-950/30 rounded-xs flex justify-between items-center px-1">
            <div className="h-1 w-6 bg-amber-600 rounded-xs" />
            <div className="h-1 w-2 bg-amber-500 rounded-xs" />
          </div>
        </div>
      )

    case 'samples_expirations':
      return (
        <div className="w-24 h-16 rounded border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-orange-600 rounded-xs mb-0.5 flex items-center px-1">
            <div className="h-1 w-8 bg-white/80 rounded-xs" />
          </div>
          <div className="space-y-0.5 py-0.5">
            <div className="flex items-center gap-1">
              <div className="h-1.5 bg-emerald-500 rounded-xs w-14" />
              <span className="text-[4px] text-slate-400">&gt;6m</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 bg-amber-500 rounded-xs w-8" />
              <span className="text-[4px] text-slate-400">&lt;3m</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 bg-red-500 rounded-xs w-4" />
              <span className="text-[4px] text-red-500 font-bold">Périmé</span>
            </div>
          </div>
          <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-xs" />
        </div>
      )

    case 'executive_summary':
      return (
        <div className="w-24 h-16 rounded border border-emerald-500/40 bg-emerald-50/20 dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-[#1B5C2E] rounded-xs mb-0.5 flex items-center justify-between px-1">
            <div className="h-1 w-10 bg-white/80 rounded-xs" />
            <div className="h-1 w-2 bg-emerald-300 rounded-xs" />
          </div>
          <div className="grid grid-cols-2 gap-1 py-0.5">
            <div className="h-3 rounded-xs bg-slate-100 dark:bg-slate-800 p-0.5 flex flex-col justify-center">
              <div className="h-0.5 w-4 bg-slate-400 rounded-xs mb-0.5" />
              <div className="h-1 w-3 bg-[#1B5C2E] rounded-xs" />
            </div>
            <div className="h-3 rounded-xs bg-slate-100 dark:bg-slate-800 p-0.5 flex flex-col justify-center">
              <div className="h-0.5 w-4 bg-slate-400 rounded-xs mb-0.5" />
              <div className="h-1 w-3 bg-amber-500 rounded-xs" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-[#1B5C2E]/10 rounded-xs flex items-center justify-between px-1">
            <span className="text-[5px] text-[#1B5C2E] font-bold">SYNTHÈSE DG</span>
            <div className="h-1 w-3 bg-[#1B5C2E] rounded-xs" />
          </div>
        </div>
      )

    default:
      return (
        <div className="w-24 h-16 rounded border border-border/80 bg-white dark:bg-slate-900 p-1 flex items-center justify-center shadow-2xs">
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
      )
  }
}

export default function ReportsClient({
  samples: initialSamples = [],
  movements: initialMovements = [],
  wasteBatches: initialWaste = [],
  destructions: initialDestructions = [],
}: Props) {
  // Navigation & Rapport actif
  const [reportType, setReportType] = useState('waste_receptions')
  const [cardCategoryFilter, setCardCategoryFilter] = useState('all')
  const [cardSearchQuery, setCardSearchQuery] = useState('')

  // Filtres périodiques & critères du rapport sélectionné
  const [periodPreset, setPeriodPreset] = useState('year_2026')
  const [customStartDate, setCustomStartDate] = useState('2026-01-01')
  const [customEndDate, setCustomEndDate] = useState('2026-12-31')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [tableSearchQuery, setTableSearchQuery] = useState('')

  // Données locales et synchronisées
  const [samples, setSamples] = useState<Sample[]>(initialSamples)
  const [receptions, setReceptions] = useState<ReceptionRecord[]>([])
  const [movements, setMovements] = useState<Movement[]>(initialMovements)
  const [wasteBatches, setWasteBatches] = useState<WasteBatch[]>(initialWaste)
  const [destructions, setDestructions] = useState<DestructionPlan[]>(initialDestructions)
  const [isSyncing, setIsSyncing] = useState(false)
  const hasLoadedOnceRef = useRef(false)
  const reportViewerRef = useRef<HTMLDivElement>(null)

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
    const totalSamplesStock = samples.reduce((acc, s) => acc + (Number(s.quantity) || 1), 0)
    const samplesReceivedInPeriod = filteredSamples.length

    const totalWasteKg = filteredWaste.reduce((acc, w) => acc + (Number(w.quantity) || 0), 0)
    const totalWasteTonnes = (totalWasteKg / 1000).toFixed(2)

    const totalDestroyedKg = filteredDestructions
      .filter((d) => (d.status || '').toLowerCase().includes('exé') || (d.status || '').toLowerCase().includes('exec') || (d.status || '').toLowerCase().includes('détruit'))
      .reduce((acc, d) => acc + (Number(d.total_weight) || 0), 0)

    const totalTransferCostFCFA = filteredWaste.reduce((acc, w) => {
      return acc + (Number(w.transfer_cost_amount) || 0)
    }, 0)

    const totalAbmedFeeFCFA = filteredWaste.reduce((acc, w) => {
      if (w.abmed_fee_8_percent !== undefined && w.abmed_fee_8_percent !== null) {
        return acc + Number(w.abmed_fee_8_percent)
      }
      return acc + Math.round((Number(w.transfer_cost_amount) || 0) * 0.08)
    }, 0)

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

  // Définition des 10 Rapports
  const reportDefinitions: Record<
    string,
    {
      id: string
      title: string
      shortTitle: string
      category: 'waste' | 'samples' | 'financial' | 'executive'
      categoryLabel: string
      badgeColor: string
      infoText: string
      description: string
      getRows: () => { headers: string[]; rows: any[][]; exportData: Record<string, any>[] }
    }
  > = useMemo(() => {
    return {
      waste_receptions: {
        id: 'waste_receptions',
        title: "Tableau de bord de la réception des déchets pharmaceutiques",
        shortTitle: "Réceptions de déchets",
        category: 'waste',
        categoryLabel: "Déchets",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        infoText: "Rend compte des réceptions de déchets pharmaceutiques par structure déposante, nature, poids et valorisation financière de cession.",
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
        id: 'waste_financial',
        title: "Bilan financier des cessions et redevance ABMed (8%)",
        shortTitle: "Bilan financier & 8%",
        category: 'financial',
        categoryLabel: "Finances & 8%",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
        infoText: "Détaille la valeur totale de cession déclarée par les établissements et calcule la redevance légale de 8% due à l'ABMed.",
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

      samples_stock: {
        id: 'samples_stock',
        title: "Disponibilité des stocks d'échantillons au niveau de l'ABMed",
        shortTitle: "Disponibilité des stocks",
        category: 'samples',
        categoryLabel: "Échantillons",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
        infoText: "Suivi de l'état des stocks d'échantillons en stock, en analyse ou en quarantaine au niveau central et des sites régionaux.",
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

      waste_categories: {
        id: 'waste_categories',
        title: "Ventilation des déchets par Catégories officielles (Cat. 1 à 5)",
        shortTitle: "Catégories officielles",
        category: 'waste',
        categoryLabel: "Déchets",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        infoText: "Présente le tonnage et les parts relatives (%) pour les 5 catégories réglementaires de déchets pharmaceutiques.",
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

      samples_receptions: {
        id: 'samples_receptions',
        title: "État des réceptions d'échantillons au niveau national (LNC / AMM)",
        shortTitle: "Réceptions échantillons",
        category: 'samples',
        categoryLabel: "Échantillons",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
        infoText: "Recense l'ensemble des dépôts d'échantillons pour enregistrement, AMM ou contrôle de conformité par le LNC.",
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

      waste_seizures: {
        id: 'waste_seizures',
        title: "Registre des produits saisis, contentieux et rappels de lots",
        shortTitle: "Saisies & rappels",
        category: 'waste',
        categoryLabel: "Contrôle & Déchets",
        badgeColor: "bg-red-100 text-red-800 border-red-300",
        infoText: "Traçabilité des médicaments et produits de santé saisis, séquestrés ou faisant l'objet d'un rappel officiel.",
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

      samples_movements: {
        id: 'samples_movements',
        title: "Journal des mouvements, sorties LNC et dotations du personnel",
        shortTitle: "Journal des mouvements",
        category: 'samples',
        categoryLabel: "Échantillons & Flux",
        badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
        infoText: "Historique des transferts d'échantillons vers le LNC pour analyse et des expressions de besoin du personnel validées.",
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

      waste_destructions: {
        id: 'waste_destructions',
        title: "Opérations de destruction exécutées et certificats délivrés",
        shortTitle: "Destructions & PV",
        category: 'waste',
        categoryLabel: "Destruction & PV",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        infoText: "Bilan des campagnes de neutralisation physique et d'incinération sur sites agréés avec certificats officiels.",
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

      samples_expirations: {
        id: 'samples_expirations',
        title: "Veille des dates de péremption et propositions de déclassement",
        shortTitle: "Veille des péremptions",
        category: 'samples',
        categoryLabel: "Échantillons & Qualité",
        badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
        infoText: "Alerte préventive sur les échantillons approchant ou ayant dépassé leur date de péremption pour basculement vers déchets.",
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
        id: 'executive_summary',
        title: "Bilan général consolidé SGIE (Direction Générale ABMed)",
        shortTitle: "Synthèse Direction Générale",
        category: 'executive',
        categoryLabel: "Direction Générale",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
        infoText: "Synthèse décisionnelle consolidant les tonnages, valorisations financières (8%) et la traçabilité nationale.",
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
              "Indicateur Stratégique": "Taux d'Occupation Magasin Déchets (Capacité 45T)",
              "Valeur Constatée": `${((kpis.totalWasteKg / 45000) * 100).toFixed(2)} % (${kpis.totalWasteKg.toLocaleString('fr-FR')} kg / 45 000 kg)`,
              "Unité": "Pourcentage (%)",
              "Périmètre Géographique": "Magasin Déchets Cotonou",
              "Observation / Conformité": ((kpis.totalWasteKg / 45000) * 100) < 75 ? "Capacité nominale satisfaisante (< 75%)" : "Seuil d'alerte stockage atteint",
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

  // Liste des rapports sous forme de tableau
  const reportList = useMemo(() => Object.values(reportDefinitions), [reportDefinitions])

  // Filtrage des cartes du catalogue selon catégorie et recherche
  const filteredReportCards = useMemo(() => {
    return reportList.filter((rep) => {
      const matchCat = cardCategoryFilter === 'all' || rep.category === cardCategoryFilter
      const matchSearch =
        !cardSearchQuery.trim() ||
        rep.title.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
        rep.shortTitle.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
        rep.infoText.toLowerCase().includes(cardSearchQuery.toLowerCase())
      return matchCat && matchSearch
    })
  }, [reportList, cardCategoryFilter, cardSearchQuery])

  // Données du rapport actuellement sélectionné
  const currentReportDef = useMemo(() => {
    return reportDefinitions[reportType] || reportDefinitions.waste_receptions
  }, [reportDefinitions, reportType])

  const currentReportData = useMemo(() => {
    return currentReportDef.getRows()
  }, [currentReportDef])

  // Lignes filtrées dans la table de prévisualisation
  const previewRows = useMemo(() => {
    if (!tableSearchQuery.trim()) return currentReportData.exportData
    const q = tableSearchQuery.toLowerCase()
    return currentReportData.exportData.filter((row) => {
      return Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    })
  }, [currentReportData, tableSearchQuery])

  // Sélection d'un rapport avec défilement fluide
  const handleSelectReport = (id: string) => {
    setReportType(id)
    if (reportViewerRef.current) {
      reportViewerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Export
  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
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
        title: currentReportDef.title,
        subtitle: currentReportDef.description,
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 1. BANNIÈRE EN-TÊTE JAUNE / OR BÉNIN (INSPIRÉE EXACTEMENT DU MODÈLE DE L'IMAGE) */}
      <div className="rounded-xl overflow-hidden shadow-xs border border-border/60">
        {/* Liseré tricolore République du Bénin */}
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-[#1B5C2E]" />
          <div className="h-full w-1/3 bg-[#EAB308]" />
          <div className="h-full w-1/3 bg-[#DC2626]" />
        </div>

        {/* Bandeau Jaune / Or avec Titre "Rapports" */}
        <div className="bg-[#FFCC00] dark:bg-amber-500 text-slate-900 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
              Rapports
            </h1>
            <Badge className="bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800">
              SGIE ABMed
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadReportsData(true)}
              disabled={isSyncing}
              className="h-7 text-xs font-bold bg-white/80 hover:bg-white text-slate-900 border-slate-400 gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* 2. ENCART D'INFORMATION & CONTEXTE (MODÈLE BOÎTE GRISE AVEC ICÔNE "i") */}
        <div className="bg-slate-100 dark:bg-slate-900/80 p-3 md:p-3.5 border-t border-border/50 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
            <Info className="h-5 w-5 font-bold" />
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            <p>
              Les données du tableau de bord et des différents rapports <strong>SGIE</strong> rendent compte de la gestion logistique et réglementaire des <strong>échantillons pharmaceutiques</strong> et des <strong>déchets de santé</strong> au niveau national pour l&apos;<strong>Autorité Béninoise du Médicament (ABMed)</strong>.
              Ils sont consolidés en temps réel à partir des registres de dépôts d&apos;échantillons, des contrôles qualité du LNC, des déclarations de cessions de déchets (redevance légale de 8%) et des opérations de destruction sécurisées.
              Les extractions périodiques peuvent être analysées mensuellement, trimestriellement ou selon l&apos;exercice budgétaire souhaité.
            </p>
          </div>
        </div>
      </div>

      {/* 3. BARRE D'OUTILS ET FILTRES DU CATALOGUE DE CARTES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={cardCategoryFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCardCategoryFilter('all')}
            className={`h-7 text-xs font-semibold ${cardCategoryFilter === 'all' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
          >
            Tous les rapports ({reportList.length})
          </Button>
          <Button
            variant={cardCategoryFilter === 'waste' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCardCategoryFilter('waste')}
            className={`h-7 text-xs font-semibold ${cardCategoryFilter === 'waste' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
          >
            Déchets Pharmaceutiques
          </Button>
          <Button
            variant={cardCategoryFilter === 'financial' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCardCategoryFilter('financial')}
            className={`h-7 text-xs font-semibold ${cardCategoryFilter === 'financial' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
          >
            Bilan Financier & 8%
          </Button>
          <Button
            variant={cardCategoryFilter === 'samples' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCardCategoryFilter('samples')}
            className={`h-7 text-xs font-semibold ${cardCategoryFilter === 'samples' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
          >
            Échantillons & Stocks
          </Button>
          <Button
            variant={cardCategoryFilter === 'executive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCardCategoryFilter('executive')}
            className={`h-7 text-xs font-semibold ${cardCategoryFilter === 'executive' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white' : ''}`}
          >
            Direction Générale
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un rapport..."
            value={cardSearchQuery}
            onChange={(e) => setCardSearchQuery(e.target.value)}
            className="h-7 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* 4. GRILLE VISUELLE DE CARTES DE RAPPORTS (3 COLONNES CONFORME AU SCREENSHOT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredReportCards.map((report) => {
          const isSelected = reportType === report.id

          return (
            <div
              key={report.id}
              onClick={() => handleSelectReport(report.id)}
              className={`group relative p-2.5 rounded-xl border bg-card cursor-pointer transition-all duration-200 flex items-center gap-3 shadow-2xs hover:shadow-md ${
                isSelected
                  ? 'border-[#1B5C2E] ring-2 ring-[#1B5C2E]/25 bg-emerald-50/20 dark:bg-emerald-950/20'
                  : 'border-border/70 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              {/* Miniature visuelle du rapport */}
              <div className="shrink-0 transition-transform duration-200 group-hover:scale-105">
                <ReportThumbnail type={report.id} />
              </div>

              {/* Titre et détails */}
              <div className="flex-1 min-w-0 pr-6">
                <p className="text-xs font-bold text-foreground leading-snug line-clamp-2 group-hover:text-[#1B5C2E] transition-colors">
                  {report.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${report.badgeColor}`}>
                    {report.categoryLabel}
                  </Badge>
                  {isSelected && (
                    <span className="text-[9px] font-bold text-[#1B5C2E] flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Sélectionné
                    </span>
                  )}
                </div>
              </div>

              {/* Bouton Info Vert (i) en haut à droite comme dans la capture */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toast(report.title, {
                    description: report.infoText,
                    icon: <Info className="h-4 w-4 text-[#1B5C2E]" />,
                  })
                }}
                title={report.infoText}
                className="absolute top-2 right-2 p-1 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* 5. CONSOLE D'EXPLORATION ET D'EXTRACTION DU RAPPORT ACTIF */}
      <div ref={reportViewerRef} className="pt-2">
        <Card className="border border-border/70 rounded-xl bg-card shadow-sm overflow-hidden">
          
          {/* En-tête de la console du rapport sélectionné */}
          <div className="p-3.5 bg-muted/30 border-b border-border/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#1B5C2E] text-white text-[10px]">
                  Rapport Actif
                </Badge>
                <h2 className="text-base font-black text-foreground">
                  {currentReportDef.title}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentReportDef.description}
              </p>
            </div>

            {/* Boutons d'export rapide pour ce rapport */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
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
                className="h-8 text-xs font-bold gap-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 shadow-2xs"
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

          <CardContent className="p-3.5 space-y-3.5">
            
            {/* Barre de filtrage multi-critères et de dates pour ce rapport */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/50 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
              
              {/* Sélecteur de Période */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#1B5C2E]" />
                  Période d&apos;analyse
                </label>
                <Select value={periodPreset} onValueChange={(val) => setPeriodPreset(val || 'year_2026')}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                    <SelectItem value="week">Cette semaine en cours</SelectItem>
                    <SelectItem value="month">Ce mois-ci</SelectItem>
                    <SelectItem value="quarter">Ce trimestre</SelectItem>
                    <SelectItem value="year_2026">Exercice 2026 (En cours)</SelectItem>
                    <SelectItem value="year_2025">Exercice 2025 (Clôturé)</SelectItem>
                    <SelectItem value="custom">Période personnalisée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dates personnalisées */}
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
                <div className="md:col-span-3">
                  <div className="px-2.5 py-1.5 rounded-lg bg-background border border-border/60 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Plage : </span>
                    <span className="text-[#1B5C2E] font-bold">{dateRange.label}</span>
                  </div>
                </div>
              )}

              {/* Magasin */}
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
                    <SelectItem value="Autres">Autres dépôts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Catégorie Produits */}
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

            {/* 6 Indicateurs Stratégiques recalculés pour cette sélection */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Échantillons Stock</p>
                <p className="text-base font-black text-foreground">{kpis.totalSamplesStock}</p>
                <p className="text-[9px] text-emerald-700 font-medium">+{kpis.samplesReceivedInPeriod} reçus</p>
              </div>

              <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Déchets Reçus</p>
                <p className="text-base font-black text-foreground">{kpis.totalWasteKg.toLocaleString('fr-FR')} <span className="text-[10px] text-muted-foreground font-normal">kg</span></p>
                <p className="text-[9px] text-amber-600 font-medium">{kpis.totalWasteTonnes} Tonnes</p>
              </div>

              <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Masse Détruite</p>
                <p className="text-base font-black text-foreground">{kpis.totalDestroyedKg.toLocaleString('fr-FR')} <span className="text-[10px] text-muted-foreground font-normal">kg</span></p>
                <p className="text-[9px] text-red-600 font-medium">{filteredDestructions.length} opérations</p>
              </div>

              <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Cessions Déclarées</p>
                <p className="text-sm font-black text-foreground">{kpis.totalTransferCostFCFA.toLocaleString('fr-FR')} <span className="text-[9px] text-muted-foreground font-normal">F</span></p>
                <p className="text-[9px] text-blue-600 font-medium">Base imposable</p>
              </div>

              <div className="p-2.5 rounded-lg border border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20">
                <p className="text-[9px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Redevance (8%)</p>
                <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">{kpis.totalAbmedFeeFCFA.toLocaleString('fr-FR')} <span className="text-[9px] font-bold">F</span></p>
                <p className="text-[9px] text-emerald-700 font-bold">Exigible ABMed</p>
              </div>

              <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Conformité Qualité</p>
                <p className="text-base font-black text-foreground">{kpis.conformityRate}%</p>
                <p className="text-[9px] text-purple-600 font-medium">{kpis.mvtCount} mouvements</p>
              </div>
            </div>

            {/* Tableau interactif de prévisualisation */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filtrer dans ce tableau..."
                      value={tableSearchQuery}
                      onChange={(e) => setTableSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>
                  <Badge variant="outline" className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                    {previewRows.length} lignes
                  </Badge>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  Extraction active : <span className="text-[#1B5C2E] font-bold">{dateRange.label}</span>
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

            {/* Synthèse graphique comparative en bas de console */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
              <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Masse par Catégorie Réglementaire ABMed (Kg)
                </p>
                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(val) => [`${Number(val).toLocaleString('fr-FR')} Kg`, 'Masse']}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Bar dataKey="weight" fill="#1B5C2E" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-border/70 bg-card">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Statuts & Contrôles Échantillothèque
                </p>
                <div className="h-[110px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sampleStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={24}
                        outerRadius={42}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {sampleStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-4 gap-1 pt-1 border-t border-border/40 text-[9px]">
                  {sampleStatusData.map((item, idx) => (
                    <div key={idx} className="flex justify-between px-1 py-0.5 rounded-xs bg-muted/30">
                      <span className="text-muted-foreground truncate">{item.name}</span>
                      <span className="font-bold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

    </div>
  )
}
