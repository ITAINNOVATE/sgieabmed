"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Trash2, Clock, Flame, ShieldAlert, AlertTriangle, RefreshCw,
  Download, FileSpreadsheet, Printer, Search, ChevronLeft, ChevronRight,
  Building2, Coins, ArrowUpDown, DollarSign, Scale, Layers
} from "lucide-react"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Tooltip as RechartsTooltip
} from "recharts"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { exportToExcel, exportToCSV } from "@/utils/exportUtils"
import { parseFinancesFromBatch } from "@/utils/waste-finances"
import { toast } from "sonner"

const WASTE_CATEGORIES_COLORS = ['#E53935', '#FB8C00', '#1E88E5', '#43A047']
const WASTE_STATUS_COLORS = ['#1E88E5', '#FB8C00', '#43A047', '#D81B60', '#E53935']

export default function WasteAnalyticsPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [isSyncing, setIsSyncing] = useState(false)
  const hasLoadedOnceRef = useRef(false)

  // Filtres et pagination pour le tableau récapitulatif financier
  const [centerSearch, setCenterSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all") // all | assujetti | exonere
  const [sortBy, setSortBy] = useState<"amount" | "fee" | "weight" | "name">("amount")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(15)

  const loadWasteDashboardData = useCallback(async (manual = false) => {
    if (typeof window === "undefined") return
    if (manual === true) setIsSyncing(true)

    const isWiped = localStorage.getItem('all_data_wiped') === 'true'
    const batchMap = new Map<string, any>()
    const planMap = new Map<string, any>()

    // 1. Chargement depuis localStorage
    if (!isWiped) {
      try {
        const storedBatches = JSON.parse(localStorage.getItem('waste_batches_custom_v1') || '[]')
        if (Array.isArray(storedBatches)) {
          storedBatches.forEach((b: any) => {
            const key = b.batch_number || b.id
            if (key) batchMap.set(key, b)
          })
        }
        const storedPlans = JSON.parse(localStorage.getItem('destruction_plans_custom_v1') || '[]')
        if (Array.isArray(storedPlans)) {
          storedPlans.forEach((p: any) => {
            const key = p.plan_number || p.id
            if (key) planMap.set(key, p)
          })
        }
      } catch (e) {}

      // Uniquement au tout premier montage, afficher immédiatement le cache local
      // Ne JAMAIS écraser les données Cloud pendant le polling en arrière-plan !
      if (!hasLoadedOnceRef.current && (batchMap.size > 0 || planMap.size > 0)) {
        setBatches(Array.from(batchMap.values()))
        setPlans(Array.from(planMap.values()))
        hasLoadedOnceRef.current = true
      }
    }

    // 2. Synchronisation en temps réel avec Supabase Cloud
    try {
      const supabase = createClient()
      const [bRes, pRes] = await Promise.all([
        supabase.from('waste_batches').select('*'),
        supabase.from('destruction_plans').select('*')
      ])

      if (bRes.data && bRes.data.length > 0) {
        if (isWiped) localStorage.removeItem('all_data_wiped')
        bRes.data.forEach((b: any) => {
          const key = b.batch_number || b.id
          if (key) batchMap.set(key, { ...(batchMap.get(key) || {}), ...b })
        })
      }

      if (pRes.data && pRes.data.length > 0) {
        if (isWiped) localStorage.removeItem('all_data_wiped')
        pRes.data.forEach((p: any) => {
          const key = p.plan_number || p.id
          if (key) planMap.set(key, { ...(planMap.get(key) || {}), ...p })
        })
      }

      hasLoadedOnceRef.current = true
      setBatches(Array.from(batchMap.values()))
      setPlans(Array.from(planMap.values()))
      setLastUpdated(new Date().toLocaleTimeString('fr-FR'))
    } catch (err) {
      console.warn("Supabase fetch fallback in WasteAnalyticsPage:", err)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    loadWasteDashboardData()
  }, [loadWasteDashboardData])

  useRealtimeSync({
    tables: ['waste_batches', 'destruction_plans', 'waste_movements', 'inventories'],
    onSync: loadWasteDashboardData,
    pollIntervalMs: 8000,
  })

  // Agrégation financière par centre apporteur (déduplication préalable par réception)
  const centersFinancialList = useMemo(() => {
    const receptionMap = new Map<string, {
      centerKey: string
      centerName: string
      city: string
      lotsCount: number
      weight: number
      amount: number
      fee: number
      mode: string
      years: string[]
    }>()

    batches.forEach((w) => {
      const recKey = w.reception_number || w.batch_number || w.id
      if (!receptionMap.has(recKey)) {
        const fin = parseFinancesFromBatch(w)
        const centerName = (w.source_structure || w.depositor_name || "Structure non déclarée").trim()
        const centerCode = (w.source_structure_code || w.center_code || "").trim()
        const centerKey = (centerCode || centerName).toLowerCase()
        const city = w.city || w.locality || "Bénin"

        receptionMap.set(recKey, {
          centerKey,
          centerName,
          city,
          lotsCount: 0,
          weight: 0,
          amount: fin.transfer_cost_amount || 0,
          fee: fin.abmed_fee_8_percent || 0,
          mode: fin.transfer_cost_mode || "chiffre",
          years: Array.isArray(fin.exercise_years) ? fin.exercise_years.map(String) : (fin.exercise_years ? [String(fin.exercise_years)] : []),
        })
      }
      const cur = receptionMap.get(recKey)!
      cur.lotsCount += 1
      cur.weight += Number(w.quantity) || 0
    })

    const centersMap = new Map<string, {
      centerName: string
      city: string
      receptionsCount: number
      lotsCount: number
      weight: number
      amount: number
      fee: number
      yearsSet: Set<string>
      isExempt: boolean
    }>()

    receptionMap.forEach((rec) => {
      if (!centersMap.has(rec.centerKey)) {
        centersMap.set(rec.centerKey, {
          centerName: rec.centerName,
          city: rec.city,
          receptionsCount: 0,
          lotsCount: 0,
          weight: 0,
          amount: 0,
          fee: 0,
          yearsSet: new Set<string>(),
          isExempt: true,
        })
      }
      const c = centersMap.get(rec.centerKey)!
      c.receptionsCount += 1
      c.lotsCount += rec.lotsCount
      c.weight += rec.weight
      c.amount += rec.amount
      c.fee += rec.fee
      rec.years.forEach((y) => c.yearsSet.add(y))
      if (rec.mode === 'chiffre' || rec.amount > 0) {
        c.isExempt = false
      }
    })

    return Array.from(centersMap.values()).map((c) => ({
      name: c.centerName,
      city: c.city,
      receptionsCount: c.receptionsCount,
      lotsCount: c.lotsCount,
      weight: c.weight,
      amount: c.amount,
      fee: c.fee,
      years: Array.from(c.yearsSet).sort().join(', ') || '2026',
      isExempt: c.isExempt,
      statusLabel: c.isExempt ? "Exonéré / Dons / N/A" : "Assujetti (8%)",
    }))
  }, [batches])

  const filteredCenters = useMemo(() => {
    return centersFinancialList.filter((c) => {
      const matchSearch =
        !centerSearch.trim() ||
        c.name.toLowerCase().includes(centerSearch.toLowerCase()) ||
        c.city.toLowerCase().includes(centerSearch.toLowerCase())
      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "assujetti"
          ? !c.isExempt
          : c.isExempt
      return matchSearch && matchStatus
    }).sort((a, b) => {
      let comparison = 0
      if (sortBy === 'amount') comparison = a.amount - b.amount
      else if (sortBy === 'fee') comparison = a.fee - b.fee
      else if (sortBy === 'weight') comparison = a.weight - b.weight
      else if (sortBy === 'name') comparison = a.name.localeCompare(b.name, 'fr')
      return sortOrder === 'desc' ? -comparison : comparison
    })
  }, [centersFinancialList, centerSearch, statusFilter, sortBy, sortOrder])

  const financialTotals = useMemo(() => {
    return filteredCenters.reduce(
      (acc, c) => ({
        centersCount: acc.centersCount + 1,
        receptionsCount: acc.receptionsCount + c.receptionsCount,
        lotsCount: acc.lotsCount + c.lotsCount,
        weight: acc.weight + c.weight,
        amount: acc.amount + c.amount,
        fee: acc.fee + c.fee,
      }),
      { centersCount: 0, receptionsCount: 0, lotsCount: 0, weight: 0, amount: 0, fee: 0 }
    )
  }, [filteredCenters])

  const totalTablePages = Math.max(1, Math.ceil(filteredCenters.length / tablePageSize))
  const paginatedCenters = useMemo(() => {
    const start = (tablePage - 1) * tablePageSize
    return filteredCenters.slice(start, start + tablePageSize)
  }, [filteredCenters, tablePage, tablePageSize])

  const handleExportExcel = () => {
    const headers = [
      "N°",
      "Centre / Structure Apporteuse",
      "Ville / Localité",
      "Nb Bordereaux",
      "Nb Lots",
      "Poids Total (kg)",
      "Coût Cession HT (FCFA)",
      "Redevance 8% ABMeD (FCFA)",
      "Années d'exercice",
      "Statut Cession",
    ]
    const data: Record<string, any>[] = filteredCenters.map((c, idx) => ({
      "N°": idx + 1,
      "Centre / Structure Apporteuse": c.name,
      "Ville / Localité": c.city,
      "Nb Bordereaux": c.receptionsCount,
      "Nb Lots": c.lotsCount,
      "Poids Total (kg)": Number(c.weight.toFixed(2)),
      "Coût Cession HT (FCFA)": Math.round(c.amount),
      "Redevance 8% ABMeD (FCFA)": Math.round(c.fee),
      "Années d'exercice": c.years,
      "Statut Cession": c.statusLabel,
    }))
    data.push({
      "N°": "TOTAL",
      "Centre / Structure Apporteuse": `${financialTotals.centersCount} Structure(s)`,
      "Ville / Localité": "-",
      "Nb Bordereaux": financialTotals.receptionsCount,
      "Nb Lots": financialTotals.lotsCount,
      "Poids Total (kg)": Number(financialTotals.weight.toFixed(2)),
      "Coût Cession HT (FCFA)": Math.round(financialTotals.amount),
      "Redevance 8% ABMeD (FCFA)": Math.round(financialTotals.fee),
      "Années d'exercice": "-",
      "Statut Cession": "-",
    })
    exportToExcel(data, headers, `Recap_Financier_Centres_Cessions_Redevances_8_ABMeD_${new Date().toISOString().slice(0, 10)}`)
    toast.success("Tableau exporté en Excel (.xlsx) avec succès")
  }

  const handleExportCSV = () => {
    const headers = [
      "N°",
      "Centre / Structure Apporteuse",
      "Ville / Localité",
      "Nb Bordereaux",
      "Nb Lots",
      "Poids Total (kg)",
      "Coût Cession HT (FCFA)",
      "Redevance 8% ABMeD (FCFA)",
      "Années d'exercice",
      "Statut Cession",
    ]
    const data: Record<string, any>[] = filteredCenters.map((c, idx) => ({
      "N°": idx + 1,
      "Centre / Structure Apporteuse": c.name,
      "Ville / Localité": c.city,
      "Nb Bordereaux": c.receptionsCount,
      "Nb Lots": c.lotsCount,
      "Poids Total (kg)": Number(c.weight.toFixed(2)),
      "Coût Cession HT (FCFA)": Math.round(c.amount),
      "Redevance 8% ABMeD (FCFA)": Math.round(c.fee),
      "Années d'exercice": c.years,
      "Statut Cession": c.statusLabel,
    }))
    data.push({
      "N°": "TOTAL",
      "Centre / Structure Apporteuse": `${financialTotals.centersCount} Structure(s)`,
      "Ville / Localité": "-",
      "Nb Bordereaux": financialTotals.receptionsCount,
      "Nb Lots": financialTotals.lotsCount,
      "Poids Total (kg)": Number(financialTotals.weight.toFixed(2)),
      "Coût Cession HT (FCFA)": Math.round(financialTotals.amount),
      "Redevance 8% ABMeD (FCFA)": Math.round(financialTotals.fee),
      "Années d'exercice": "-",
      "Statut Cession": "-",
    })
    exportToCSV(data, headers, `Recap_Financier_Centres_Cessions_Redevances_8_ABMeD_${new Date().toISOString().slice(0, 10)}`)
    toast.success("Tableau exporté en CSV avec succès")
  }

  const handlePrint = () => {
    window.print()
  }

  const activeBatches = batches.filter(b => b.status !== 'Détruit' && b.status !== 'detruit')
  const totalWasteWeight = Math.round(activeBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) * 100) / 100
  const totalAllWasteWeight = Math.round(batches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) * 100) / 100
  const plannedDestructionsCount = plans.filter(p => p.status !== 'Exécuté' && p.status !== 'execute').length
  const completedDestructionsCount = plans.filter(p => p.status === 'Exécuté' || p.status === 'execute').length
  
  // Capacité totale réglementaire du magasin de déchets : 45 Tonnes (45 000 Kg)
  const WAREHOUSE_MAX_CAPACITY_KG = 45000
  const capacityRawPct = (totalWasteWeight / WAREHOUSE_MAX_CAPACITY_KG) * 100
  const capacityPctStr = totalWasteWeight > 0 
    ? (capacityRawPct < 0.01 ? "< 0.01" : (capacityRawPct < 1 ? capacityRawPct.toFixed(2) : capacityRawPct.toFixed(1)))
    : "0"

  const KPIData = [
    { 
      title: "DÉCHETS EN STOCK", 
      value: `${totalWasteWeight.toLocaleString('fr-FR')} kg`, 
      subtitle: `${activeBatches.length} lot${activeBatches.length > 1 ? 's' : ''} (${(totalWasteWeight / 1000).toFixed(2)} T)`, 
      trend: "Temps réel", 
      isUp: true, 
      icon: Trash2, 
      color: "text-[#E53935]", 
      bg: "bg-[#E53935]/10", 
      sparkline: [totalWasteWeight, totalWasteWeight] 
    },
    { 
      title: "DESTRUCTIONS PLANIFIÉES", 
      value: `${plannedDestructionsCount} Plan(s)`, 
      subtitle: plannedDestructionsCount > 0 ? "Prises en charge" : "Aucun plan en cours",
      trend: plannedDestructionsCount > 0 ? "En cours" : "Aucun", 
      isUp: plannedDestructionsCount === 0, 
      icon: Clock, 
      color: "text-[#FB8C00]", 
      bg: "bg-[#FB8C00]/10", 
      sparkline: [plannedDestructionsCount, plannedDestructionsCount] 
    },
    { 
      title: "DESTRUCTIONS RÉALISÉES", 
      value: `${completedDestructionsCount} Réalisée(s)`, 
      subtitle: "Certificats conformes",
      trend: "Temps réel", 
      isUp: true, 
      icon: Flame, 
      color: "text-[#43A047]", 
      bg: "bg-[#43A047]/10", 
      sparkline: [completedDestructionsCount, completedDestructionsCount] 
    },
    { 
      title: "TAUX DE STOCKAGE (CAPACITÉ 45T)", 
      value: `${capacityPctStr}%`, 
      subtitle: `${totalWasteWeight.toLocaleString('fr-FR')} kg / 45 000 kg`, 
      trend: capacityRawPct < 75 ? "Normal" : (capacityRawPct < 90 ? "Attention" : "Critique"), 
      isUp: capacityRawPct < 75, 
      icon: ShieldAlert, 
      color: capacityRawPct >= 85 ? "text-red-600" : (capacityRawPct >= 70 ? "text-amber-600" : "text-[#1E88E5]"), 
      bg: capacityRawPct >= 85 ? "bg-red-500/10" : (capacityRawPct >= 70 ? "bg-amber-500/10" : "bg-[#1E88E5]/10"), 
      sparkline: [capacityRawPct, capacityRawPct],
      progress: capacityRawPct
    },
  ]

  const categoryMap = batches.reduce((acc: Record<string, number>, b) => {
    const t = b.waste_type || 'Autres'
    acc[t] = Math.round(((acc[t] || 0) + (Number(b.quantity) || 1)) * 100) / 100
    return acc
  }, {})

  const sortedCategories = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  let wasteByCategory: { name: string; value: number }[] = []
  if (sortedCategories.length <= 5) {
    wasteByCategory = sortedCategories
  } else {
    const top4 = sortedCategories.slice(0, 4)
    const othersValue = Math.round(sortedCategories.slice(4).reduce((sum, item) => sum + item.value, 0) * 100) / 100
    wasteByCategory = [
      ...top4,
      { name: `Autres (${sortedCategories.length - 4} cat.)`, value: othersValue }
    ]
  }

  if (wasteByCategory.length === 0) {
    wasteByCategory = [
      { name: 'Cytotoxiques', value: 0 },
      { name: 'Infectieux (DASRI)', value: 0 },
      { name: 'Chimiques', value: 0 },
      { name: 'Autres', value: 0 },
    ]
  }

  const statusMap = batches.reduce((acc: Record<string, number>, b) => {
    const s = b.status || 'En stockage'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const sortedStatus = Object.entries(statusMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const wasteByStatus = sortedStatus.length > 0
    ? sortedStatus.slice(0, 5)
    : [
        { name: 'En stockage', value: 0 },
        { name: 'En contrôle', value: 0 },
        { name: 'Validés', value: 0 },
        { name: 'En attente destruction', value: 0 },
        { name: 'Détruits', value: 0 },
      ]

  const wasteAlerts: { text: string; date: string; type: "error" | "warning" | "info" }[] = []
  if (plannedDestructionsCount > 0) {
    wasteAlerts.push({
      text: `${plannedDestructionsCount} plan(s) de destruction en cours de validation`,
      date: new Date().toLocaleDateString('fr-FR'),
      type: "warning"
    })
  }
  if (activeBatches.length > 0) {
    wasteAlerts.push({
      text: `${activeBatches.length} lot(s) de déchets (${totalWasteWeight} kg) actuellement en stockage`,
      date: new Date().toLocaleDateString('fr-FR'),
      type: "info"
    })
  }
  if (wasteAlerts.length === 0) {
    wasteAlerts.push({
      text: "Aucune alerte active sur les déchets pharmaceutiques",
      date: new Date().toLocaleDateString('fr-FR'),
      type: "info"
    })
  }

  return (
    <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* EN-TÊTE DU TABLEAU DE BORD DÉCHETS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
        <div>
          <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-600" />
            Tableau de Bord & Statistiques Déchets
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Temps réel {lastUpdated ? `(${lastUpdated})` : ""}
          </span>
          <Button variant="outline" size="sm" onClick={() => loadWasteDashboardData(true)} className="h-6 text-[10px] px-2 gap-1">
            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} /> Actualiser
          </Button>
        </div>
      </div>

      {/* LIGNE 1 : KPIs DÉCHETS (4 CARTES COMPACTES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {KPIData.map((kpi, index) => (
          <Card key={index} className="shadow-2xs border border-border/70 rounded-xl overflow-hidden relative bg-card">
            <CardContent className="p-2 pb-2.5">
              <div className="flex justify-between items-start">
                <div className={`p-1 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} strokeWidth={2.2} />
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${kpi.isUp ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                  {kpi.isUp ? '●' : '▲'} {kpi.trend}
                </span>
              </div>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider mt-1 mb-0.5">{kpi.title}</p>
              <h2 className="text-lg font-black text-foreground tracking-tight">{kpi.value}</h2>
              {kpi.subtitle && (
                <p className="text-[9px] text-muted-foreground font-semibold mt-0.5 truncate">{kpi.subtitle}</p>
              )}
              {kpi.progress !== undefined && (
                <div className="w-full bg-muted/60 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${kpi.progress >= 85 ? 'bg-red-600' : (kpi.progress >= 70 ? 'bg-amber-500' : 'bg-[#1E88E5]')}`}
                    style={{ width: `${Math.min(Math.max(kpi.progress, totalWasteWeight > 0 ? 1 : 0), 100)}%` }}
                  />
                </div>
              )}
            </CardContent>
            <div className="h-3.5 w-full absolute bottom-0 left-0 opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpi.sparkline.map((val, i) => ({ val, i }))}>
                  <Line type="monotone" dataKey="val" stroke={kpi.isUp ? '#2E7D32' : '#E53935'} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
      </div>

      {/* LIGNE 2 : ANALYTIQUE DÉCHETS (3 COLONNES COMPACTES - SANS CHEVAUCHEMENT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* DONUT 1 : DÉCHETS PAR CATÉGORIE */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card flex flex-col justify-between overflow-hidden">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              DÉCHETS PAR CATÉGORIE (KG)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 min-h-[125px]">
              <div className="w-[45%] h-[125px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={wasteByCategory} cx="50%" cy="50%" innerRadius={24} outerRadius={46} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={false}>
                      {wasteByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={WASTE_CATEGORIES_COLORS[index % WASTE_CATEGORIES_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(val: any) => [`${Number(val).toLocaleString('fr-FR')} kg`, 'Masse']}
                      contentStyle={{ borderRadius: '6px', fontSize: '11px' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-[55%] max-h-[125px] overflow-y-auto space-y-1.5 pl-1 pr-0.5">
                {wasteByCategory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[10px] gap-1 hover:bg-muted/30 rounded px-1 py-0.5">
                    <div className="flex items-center gap-1.5 truncate min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: WASTE_CATEGORIES_COLORS[idx % WASTE_CATEGORIES_COLORS.length] }}></span>
                      <span className="text-muted-foreground truncate" title={item.name}>{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground ml-1 shrink-0 whitespace-nowrap">
                      {item.value.toLocaleString('fr-FR')} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-border/50 text-[10.5px]">
              <span className="text-muted-foreground font-medium">Masse Totale Déchets</span>
              <span className="font-bold text-foreground">{totalAllWasteWeight.toLocaleString('fr-FR')} kg</span>
            </div>
          </CardContent>
        </Card>

        {/* DONUT 2 : ÉTAT DES DÉCHETS */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card flex flex-col justify-between overflow-hidden">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              RÉPARTITION PAR STATUT
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 min-h-[125px]">
              <div className="w-[45%] h-[125px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={wasteByStatus} cx="50%" cy="50%" innerRadius={24} outerRadius={46} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={false}>
                      {wasteByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={WASTE_STATUS_COLORS[index % WASTE_STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(val: any) => [`${Number(val).toLocaleString('fr-FR')} lot(s)`, 'Quantité']}
                      contentStyle={{ borderRadius: '6px', fontSize: '11px' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-[55%] max-h-[125px] overflow-y-auto space-y-1.5 pl-1 pr-0.5">
                {wasteByStatus.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[10px] gap-1 hover:bg-muted/30 rounded px-1 py-0.5">
                    <div className="flex items-center gap-1.5 truncate min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: WASTE_STATUS_COLORS[idx % WASTE_STATUS_COLORS.length] }}></span>
                      <span className="text-muted-foreground truncate" title={item.name}>{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground ml-1 shrink-0 whitespace-nowrap">
                      {item.value.toLocaleString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-border/50 text-[10.5px]">
              <span className="text-muted-foreground font-medium">Lots de Déchets Enregistrés</span>
              <span className="font-bold text-foreground">{batches.length.toLocaleString('fr-FR')} Lot(s)</span>
            </div>
          </CardContent>
        </Card>

        {/* COLONNE 3 : ALERTES DÉCHETS */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card flex flex-col justify-between overflow-hidden">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              ALERTES & ANOMALIES DÉCHETS
            </CardTitle>
            <Link href="/dashboard/alerts" className="text-[10px] font-semibold text-red-600 hover:underline">
              Voir tout
            </Link>
          </CardHeader>
          <CardContent className="p-3 pt-1 flex-1 flex flex-col justify-between">
            <div className="space-y-1.5 max-h-[155px] overflow-y-auto pr-0.5">
              {wasteAlerts.map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px] p-2 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/60 transition-colors cursor-pointer gap-2">
                  <div className="flex items-center gap-1.5 truncate min-w-0">
                    {alert.type === 'error' && <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />}
                    {alert.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                    {alert.type === 'info' && <ShieldAlert className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                    <span className="text-foreground font-medium truncate" title={alert.text}>{alert.text}</span>
                  </div>
                  <span className="text-[8.5px] text-muted-foreground shrink-0">{alert.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. TABLEAU RÉCAPITULATIF FINANCIER PAR CENTRE : CESSIONS & REDEVANCE 8% ABMeD */}
      <Card className="shadow-xs border-emerald-500/30 border rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <Coins className="h-4 w-4" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                  Récapitulatif Financier par Centre : Cessions & Redevance 8% ABMeD
                </CardTitle>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold">
                  8% Trésor ABMeD
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Synthèse officielle et consolidée des déclarations de cessions de déchets et des redevances légales de 8% par structure apporteuse.
              </CardDescription>
            </div>

            {/* Boutons d'exportation instantanés */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-transparent gap-1.5 shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Exporter en Excel (.xlsx)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Exporter en CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimer
              </Button>
            </div>
          </div>

          {/* Bandeau KPIs consolidés */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 mt-2 border-t border-emerald-500/20">
            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Centres Répertoriés</span>
              <div className="text-lg font-black text-foreground mt-0.5">
                {financialTotals.centersCount.toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">structure(s)</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Poids Total Cumulé</span>
              <div className="text-lg font-black text-foreground mt-0.5">
                {financialTotals.weight.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">kg ({(financialTotals.weight / 1000).toFixed(2)} T)</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Cessions Déclarées HT</span>
              <div className="text-lg font-black text-foreground mt-0.5 text-blue-600 dark:text-blue-400">
                {Math.round(financialTotals.amount).toLocaleString('fr-FR')} <span className="text-xs font-normal text-muted-foreground">FCFA</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40">
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Redevance 8% ABMeD</span>
              <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                {Math.round(financialTotals.fee).toLocaleString('fr-FR')} <span className="text-xs font-normal text-emerald-600 dark:text-emerald-500">FCFA</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Barre de recherche et filtres de tableau */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher une structure ou une ville..."
                value={centerSearch}
                onChange={(e) => {
                  setCenterSearch(e.target.value)
                  setTablePage(1)
                }}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  if (val) {
                    setStatusFilter(val)
                    setTablePage(1)
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[180px] bg-background">
                  <SelectValue placeholder="Statut Cession" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts ({centersFinancialList.length})</SelectItem>
                  <SelectItem value="assujetti">Assujettis 8%</SelectItem>
                  <SelectItem value="exonere">Exonérés / Dons / NA</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(val) => {
                  if (val) setSortBy(val as any)
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[170px] bg-background">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Cession Décroissante</SelectItem>
                  <SelectItem value="fee">Redevance 8%</SelectItem>
                  <SelectItem value="weight">Poids Déchets</SelectItem>
                  <SelectItem value="name">Nom du Centre (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="h-8 px-2 text-xs"
                title={sortOrder === 'asc' ? "Ordre croissant" : "Ordre décroissant"}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Table interactive */}
          <div className="rounded-lg border border-border/70 overflow-hidden overflow-x-auto shadow-2xs">
            <Table>
              <TableHeader className="bg-muted/70">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center text-[11px] font-bold text-foreground">N°</TableHead>
                  <TableHead className="min-w-[240px] text-[11px] font-bold text-foreground">Centre / Structure Apporteuse</TableHead>
                  <TableHead className="min-w-[110px] text-[11px] font-bold text-foreground">Ville</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-foreground">Nb Lots</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-foreground">Poids Total (kg)</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-foreground">Coût Cession HT (FCFA)</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Redevance 8% (FCFA)</TableHead>
                  <TableHead className="text-center text-[11px] font-bold text-foreground">Années d&apos;exercice</TableHead>
                  <TableHead className="text-center text-[11px] font-bold text-foreground">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCenters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground">
                      Aucune structure ne correspond à votre recherche.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCenters.map((item, idx) => {
                    const rowNumber = (tablePage - 1) * tablePageSize + idx + 1
                    return (
                      <TableRow key={idx} className="hover:bg-muted/40 transition-colors text-xs">
                        <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                          {rowNumber}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.city}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px]">
                          {item.lotsCount}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] font-medium">
                          {item.weight.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          {item.amount > 0 ? `${Math.round(item.amount).toLocaleString('fr-FR')} FCFA` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          {item.fee > 0 ? `${Math.round(item.fee).toLocaleString('fr-FR')} FCFA` : '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono text-[10px] text-muted-foreground">
                          {item.years}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.isExempt ? (
                            <Badge variant="outline" className="text-[9.5px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300">
                              Exonéré / Dons
                            </Badge>
                          ) : (
                            <Badge className="text-[9.5px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60">
                              Assujetti (8%)
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>

              {/* Ligne de totalisation officielle */}
              {paginatedCenters.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-emerald-500">
                  <TableRow className="hover:bg-slate-900">
                    <TableCell colSpan={3} className="py-2.5 px-3 uppercase tracking-wider text-[11px] text-emerald-400">
                      TOTAL CONSOLIDÉ ({financialTotals.centersCount} structures)
                    </TableCell>
                    <TableCell className="text-right py-2.5 px-3 font-mono text-white">
                      {financialTotals.lotsCount}
                    </TableCell>
                    <TableCell className="text-right py-2.5 px-3 font-mono text-white">
                      {financialTotals.weight.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                    </TableCell>
                    <TableCell className="text-right py-2.5 px-3 font-mono text-white">
                      {Math.round(financialTotals.amount).toLocaleString('fr-FR')} FCFA
                    </TableCell>
                    <TableCell className="text-right py-2.5 px-3 font-mono text-emerald-400 text-sm">
                      {Math.round(financialTotals.fee).toLocaleString('fr-FR')} FCFA
                    </TableCell>
                    <TableCell colSpan={2} className="text-center py-2.5 px-3 text-[10px] text-slate-300">
                      Revue Complète ABMeD
                    </TableCell>
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </div>

          {/* Contrôles de pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Afficher</span>
              <Select
                value={String(tablePageSize)}
                onValueChange={(val) => {
                  if (val) {
                    setTablePageSize(Number(val))
                    setTablePage(1)
                  }
                }}
              >
                <SelectTrigger className="h-7 w-16 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>lignes par page • <strong>{filteredCenters.length}</strong> structure(s) au total</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs">
                Page <strong>{tablePage}</strong> sur <strong>{totalTablePages}</strong>
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTablePage(p => Math.max(1, p - 1))}
                  disabled={tablePage <= 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTablePage(p => Math.min(totalTablePages, p + 1))}
                  disabled={tablePage >= totalTablePages}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

