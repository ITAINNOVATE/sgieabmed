"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Trash2, Clock, Flame, ShieldAlert, AlertTriangle, RefreshCw
} from "lucide-react"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Tooltip as RechartsTooltip
} from "recharts"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

const WASTE_CATEGORIES_COLORS = ['#E53935', '#FB8C00', '#1E88E5', '#43A047']
const WASTE_STATUS_COLORS = ['#1E88E5', '#FB8C00', '#43A047', '#D81B60', '#E53935']

export default function WasteAnalyticsPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [isSyncing, setIsSyncing] = useState(false)
  const hasLoadedOnceRef = useRef(false)

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

    </div>
  )
}

