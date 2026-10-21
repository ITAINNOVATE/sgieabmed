"use client"

import { useState, useEffect, useCallback } from "react"
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

  const loadWasteDashboardData = useCallback(async () => {
    if (typeof window === "undefined") return
    setIsSyncing(true)

    const isWiped = localStorage.getItem('all_data_wiped') === 'true'
    const batchMap = new Map<string, any>()
    const planMap = new Map<string, any>()

    // 1. Chargement immédiat depuis localStorage (0ms)
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

      if (batchMap.size > 0 || planMap.size > 0) {
        setBatches(Array.from(batchMap.values()))
        setPlans(Array.from(planMap.values()))
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
    pollIntervalMs: 3500,
  })

  const activeBatches = batches.filter(b => b.status !== 'Détruit' && b.status !== 'detruit')
  const totalWasteWeight = Math.round(activeBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) * 100) / 100
  const totalAllWasteWeight = Math.round(batches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) * 100) / 100
  const plannedDestructionsCount = plans.filter(p => p.status !== 'Exécuté' && p.status !== 'execute').length
  const completedDestructionsCount = plans.filter(p => p.status === 'Exécuté' || p.status === 'execute').length
  const capacityPct = totalWasteWeight > 0 ? Math.min(Math.round((totalWasteWeight / 1000) * 100), 100) : 0

  const KPIData = [
    { title: "DÉCHETS EN STOCK", value: `${totalWasteWeight} kg (${activeBatches.length} lot${activeBatches.length > 1 ? 's' : ''})`, trend: "Temps réel", isUp: true, icon: Trash2, color: "text-[#E53935]", bg: "bg-[#E53935]/10", sparkline: [totalWasteWeight, totalWasteWeight] },
    { title: "DESTRUCTIONS PLANIFIÉES", value: `${plannedDestructionsCount} Plan(s)`, trend: plannedDestructionsCount > 0 ? "En cours" : "Aucun", isUp: plannedDestructionsCount === 0, icon: Clock, color: "text-[#FB8C00]", bg: "bg-[#FB8C00]/10", sparkline: [plannedDestructionsCount, plannedDestructionsCount] },
    { title: "DESTRUCTIONS RÉALISÉES", value: `${completedDestructionsCount} Réalisée(s)`, trend: "Temps réel", isUp: true, icon: Flame, color: "text-[#43A047]", bg: "bg-[#43A047]/10", sparkline: [completedDestructionsCount, completedDestructionsCount] },
    { title: "CAPACITÉ STOCKAGE DÉCHETS", value: `${capacityPct}%`, trend: capacityPct < 80 ? "Normal" : "Élevé", isUp: capacityPct < 80, icon: ShieldAlert, color: "text-[#1E88E5]", bg: "bg-[#1E88E5]/10", sparkline: [capacityPct, capacityPct] },
  ]

  const categoryMap = batches.reduce((acc: Record<string, number>, b) => {
    const t = b.waste_type || 'Autres'
    acc[t] = Math.round(((acc[t] || 0) + (Number(b.quantity) || 1)) * 100) / 100
    return acc
  }, {})

  const wasteByCategory = Object.keys(categoryMap).length > 0 
    ? Object.entries(categoryMap).map(([name, value]) => ({ name, value }))
    : [
        { name: 'Cytotoxiques', value: 0 },
        { name: 'Infectieux (DASRI)', value: 0 },
        { name: 'Chimiques', value: 0 },
        { name: 'Autres', value: 0 },
      ]

  const statusMap = batches.reduce((acc: Record<string, number>, b) => {
    const s = b.status || 'En stockage'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  const wasteByStatus = Object.keys(statusMap).length > 0
    ? Object.entries(statusMap).map(([name, value]) => ({ name, value }))
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
          <Button variant="outline" size="sm" onClick={loadWasteDashboardData} className="h-6 text-[10px] px-2 gap-1">
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

      {/* LIGNE 2 : ANALYTIQUE DÉCHETS (3 COLONNES COMPACTES - STATIQUE 1-ÉCRAN) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        
        {/* DONUT 1 : DÉCHETS PAR CATÉGORIE */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">DÉCHETS PAR CATÉGORIE (KG)</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0.5">
            <div className="flex items-center justify-between h-[100px]">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={wasteByCategory} cx="50%" cy="50%" innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="value" stroke="none">
                      {wasteByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={WASTE_CATEGORIES_COLORS[index % WASTE_CATEGORIES_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '6px', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-0.5 pl-1">
                {wasteByCategory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[9.5px]">
                    <div className="flex items-center gap-1 truncate">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: WASTE_CATEGORIES_COLORS[idx % WASTE_CATEGORIES_COLORS.length] }}></span>
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground ml-1">{item.value} kg</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/40 text-[10px]">
              <span className="text-muted-foreground font-medium">Masse Totale Déchets</span>
              <span className="font-bold text-foreground">{totalAllWasteWeight} kg</span>
            </div>
          </CardContent>
        </Card>

        {/* DONUT 2 : ÉTAT DES DECHETS */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">RÉPARTITION PAR STATUT</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0.5">
            <div className="flex items-center justify-between h-[100px]">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={wasteByStatus} cx="50%" cy="50%" innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="value" stroke="none">
                      {wasteByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={WASTE_STATUS_COLORS[index % WASTE_STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '6px', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-0.5 pl-1">
                {wasteByStatus.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[9px]">
                    <div className="flex items-center gap-1 truncate">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: WASTE_STATUS_COLORS[idx % WASTE_STATUS_COLORS.length] }}></span>
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground ml-1">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/40 text-[10px]">
              <span className="text-muted-foreground font-medium">Lots de Déchets Enregistrés</span>
              <span className="font-bold text-foreground">{batches.length} Lot(s)</span>
            </div>
          </CardContent>
        </Card>

        {/* COLONNE 3 : ALERTES DÉCHETS */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-2 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">ALERTES & ANOMALIES DÉCHETS</CardTitle>
            <Link href="/dashboard/alerts" className="text-[10px] font-semibold text-red-600 hover:underline">Voir tout</Link>
          </CardHeader>
          <CardContent className="p-2 pt-0 space-y-1">
            {wasteAlerts.map((alert, idx) => (
              <div key={idx} className="flex items-center justify-between text-[10px] p-1 px-1.5 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/60 transition-colors cursor-pointer">
                <div className="flex items-center gap-1 truncate pr-1">
                  {alert.type === 'error' && <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />}
                  {alert.type === 'warning' && <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />}
                  {alert.type === 'info' && <ShieldAlert className="h-3 w-3 text-blue-600 shrink-0" />}
                  <span className="text-foreground font-medium truncate">{alert.text}</span>
                </div>
                <span className="text-[8.5px] text-muted-foreground shrink-0">{alert.date}</span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

    </div>
  )
}

