"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Box, Clock, AlertTriangle, 
  Inbox, ShieldAlert, Beaker, RefreshCw
} from "lucide-react"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Tooltip as RechartsTooltip
} from "recharts"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

const QRCodeScannerDialog = dynamic(
  () => import("@/components/qrcode-scanner-dialog").then((mod) => mod.QRCodeScannerDialog),
  { ssr: false }
)

const STATUT_COLORS = ['#2E7D32', '#00897B', '#FB8C00', '#E53935']
const CATEGORY_COLORS = ['#1B5C2E', '#1565C0', '#6A1B9A', '#E65100', '#00838F', '#C2185B']

export default function DashboardClient({ 
  samples: initialSamples = [], 
  receptions: initialReceptions = [],
}: { 
  samples?: any[], 
  movements?: any[], 
  receptions?: any[],
  wasteBatches?: any[],
  destructions?: any[]
}) {
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [samples, setSamples] = useState<any[]>(initialSamples)
  const [receptions, setReceptions] = useState<any[]>(initialReceptions)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [isSyncing, setIsSyncing] = useState(false)

  const loadDashboardData = useCallback(async () => {
    if (typeof window === "undefined") return
    setIsSyncing(true)

    const isWiped = localStorage.getItem('all_data_wiped') === 'true'
    let sampleOverrides: Record<string, any> = {}
    try {
      const ov = localStorage.getItem('local_sample_overrides')
      if (ov) sampleOverrides = JSON.parse(ov)
    } catch (e) {}

    // 1. Chargement immédiat depuis localStorage (0ms)
    const sampleMap = new Map<string, any>()
    const receptionMap = new Map<string, any>()

    if (!isWiped) {
      try {
        const localRecs = JSON.parse(localStorage.getItem('local_receptions_history') || '[]')
        if (Array.isArray(localRecs)) {
          localRecs.forEach((r: any) => {
            const rKey = r.reception_number || r.id
            if (rKey) receptionMap.set(rKey, r)
            const sList = Array.isArray(r.samples) ? r.samples : (Array.isArray(r.samples_data) ? r.samples_data : [])
            sList.forEach((s: any, idx: number) => {
              const sid = s.sample_number || s.id || `${rKey}-${idx}`
              const ov = sampleOverrides[sid] || sampleOverrides[s.sample_number] || {}
              sampleMap.set(sid, {
                id: sid,
                sample_number: sid,
                commercial_name: s.commercial_name || "Échantillon",
                category: s.category || s.dosage_form || "Médicaments",
                quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.quantity ?? s.received_quantity ?? 1),
                status: ov.status || s.status || "Disponible",
                expiry_date: s.expiry_date || null,
              })
            })
          })
        }
      } catch (e) {}

      if (sampleMap.size > 0 || receptionMap.size > 0) {
        setSamples(Array.from(sampleMap.values()))
        setReceptions(Array.from(receptionMap.values()))
      }
    }

    // 2. Synchronisation temps réel avec Supabase Cloud
    try {
      const supabase = createClient()
      const [sRes, rRes] = await Promise.all([
        supabase.from('samples').select('*'),
        supabase.from('receptions').select('*')
      ])

      if (rRes.data && rRes.data.length > 0) {
        if (isWiped) localStorage.removeItem('all_data_wiped')
        rRes.data.forEach((r: any) => {
          const rKey = r.reception_number || r.id
          if (rKey) receptionMap.set(rKey, r)
          if (Array.isArray(r.samples_data)) {
            r.samples_data.forEach((s: any, idx: number) => {
              const sid = s.sample_number || s.id || `${rKey}-${idx}`
              if (!sampleMap.has(sid)) {
                const ov = sampleOverrides[sid] || sampleOverrides[s.sample_number] || {}
                sampleMap.set(sid, {
                  id: sid,
                  sample_number: sid,
                  commercial_name: s.commercial_name || "Échantillon",
                  category: s.category || s.dosage_form || "Médicaments",
                  quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.quantity ?? s.received_quantity ?? 1),
                  status: ov.status || s.status || "Disponible",
                  expiry_date: s.expiry_date || null,
                })
              }
            })
          }
        })
      }

      if (sRes.data && sRes.data.length > 0) {
        if (isWiped) localStorage.removeItem('all_data_wiped')
        sRes.data.forEach((s: any) => {
          const sid = s.sample_number || s.id
          const ov = sampleOverrides[sid] || sampleOverrides[s.id] || {}
          sampleMap.set(sid, {
            ...s,
            category: s.category || s.dosage_form || "Médicaments",
            quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.quantity ?? 1),
            status: ov.status || s.status || "Disponible",
          })
        })
      }

      setSamples(Array.from(sampleMap.values()))
      setReceptions(Array.from(receptionMap.values()))
      setLastUpdated(new Date().toLocaleTimeString('fr-FR'))
    } catch (err) {
      console.warn("Supabase fetch fallback in DashboardClient:", err)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  useRealtimeSync({
    tables: ['samples', 'receptions', 'movements', 'inventories'],
    onSync: loadDashboardData,
    pollIntervalMs: 3500,
  })

  // ─── 1. CALCUL DES KPIs ÉCHANTILLONS EN TEMPS RÉEL ──────────────────────
  const activeSamples = samples.filter(s => s.status !== 'Détruit' && (Number(s.quantity) || 0) >= 0)
  const totalSamples = activeSamples.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)
  const totalLotsCount = activeSamples.length
  const quarantineCount = activeSamples.filter(s => (s.status || '').toLowerCase().includes('quarantaine')).length
  const expiringCount = activeSamples.filter(s => s.expiry_date && new Date(s.expiry_date) <= new Date(Date.now() + 30*24*60*60*1000)).length
  const totalReceptions = receptions?.length || 0

  const KPIData = [
    { title: "ÉCHANTILLONS EN STOCK", value: `${totalSamples} (${totalLotsCount} lot${totalLotsCount > 1 ? 's' : ''})`, trend: "Temps réel", isUp: true, icon: Box, color: "text-[#2E7D32]", bg: "bg-[#2E7D32]/10", sparkline: [totalSamples, totalSamples] },
    { title: "RÉCEPTIONS ENREGISTRÉES", value: totalReceptions, trend: "Temps réel", isUp: true, icon: Inbox, color: "text-[#1565C0]", bg: "bg-[#1565C0]/10", sparkline: [totalReceptions, totalReceptions] },
    { title: "LOTS EN QUARANTAINE", value: quarantineCount, trend: quarantineCount > 0 ? "À traiter" : "Conforme", isUp: quarantineCount === 0, icon: Clock, color: "text-[#FB8C00]", bg: "bg-[#FB8C00]/10", sparkline: [quarantineCount, quarantineCount] },
    { title: "EXPIRATIONS PROCHES (<30J)", value: expiringCount, trend: expiringCount > 0 ? "Alerte" : "OK", isUp: expiringCount === 0, icon: ShieldAlert, color: "text-[#E53935]", bg: "bg-[#E53935]/10", sparkline: [expiringCount, expiringCount] },
  ]

  // ─── 2. REPARTITION PAR STATUT ──────────────────────────────────────────
  const availableCount = activeSamples.filter(s => s.status === 'Disponible' || s.status === 'En stock' || !s.status).length
  const inAnalysisCount = activeSamples.filter(s => (s.status || '').toLowerCase().includes('analyse')).length
  const expiredCount = activeSamples.filter(s => s.expiry_date && new Date(s.expiry_date) < new Date()).length

  const samplesByStatus = [
    { name: 'Disponibles', value: availableCount },
    { name: 'En analyse', value: inAnalysisCount },
    { name: 'En quarantaine', value: quarantineCount },
    { name: 'Périmés', value: expiredCount },
  ]

  // ─── 3. REPARTITION PAR CATÉGORIE D'ÉCHANTILLONS (DYNAMIQUE) ───────────
  const categoryCounts = activeSamples.reduce((acc: Record<string, number>, s) => {
    const cat = s.category || s.dosage_form || 'Autres'
    acc[cat] = (acc[cat] || 0) + (Number(s.quantity) || 1)
    return acc
  }, {})

  const samplesByCategory = Object.keys(categoryCounts).length > 0 
    ? Object.entries(categoryCounts).map(([name, value]) => ({ name, value }))
    : [
        { name: 'Médicaments', value: 0 },
        { name: 'Vaccins / Sérums', value: 0 },
        { name: 'Dispositifs', value: 0 },
      ]

  // ─── 4. ALERTES ÉCHANTILLONS SEULEMENT (DYNAMIQUES) ───────────────────
  const sampleAlerts: { text: string; date: string; type: "error" | "warning" | "info" }[] = []
  if (expiringCount > 0) {
    sampleAlerts.push({
      text: `${expiringCount} échantillon(s) périmeront dans les 30 prochains jours`,
      date: new Date().toLocaleDateString('fr-FR'),
      type: "error"
    })
  }
  if (quarantineCount > 0) {
    sampleAlerts.push({
      text: `${quarantineCount} lot(s) actuellement placés en quarantaine`,
      date: new Date().toLocaleDateString('fr-FR'),
      type: "warning"
    })
  }
  if (sampleAlerts.length === 0) {
    sampleAlerts.push({
      text: "Aucune alerte active sur l'échantillothèque",
      date: new Date().toLocaleDateString('fr-FR'),
      type: "info"
    })
  }

  return (
    <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* EN-TÊTE DU TABLEAU DE BORD ÉCHANTILLONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
        <div>
          <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
            <Beaker className="h-4 w-4 text-[#1B5C2E]" />
            Tableau de Bord & Statistiques Échantillons
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Temps réel {lastUpdated ? `(${lastUpdated})` : ""}
          </span>
          <Button variant="outline" size="sm" onClick={loadDashboardData} className="h-6 text-[10px] px-2 gap-1">
            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} /> Actualiser
          </Button>
        </div>
      </div>

      {/* LIGNE 1 : KPIs ÉCHANTILLONS (4 CARTES COMPACTES) */}
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
            {/* Sparkline mini */}
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

      {/* LIGNE 2 : ANALYTIQUE ÉCHANTILLONS (3 COLONNES COMPACTES - PAGE COMPLÈTE SANS SCROLL) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        
        {/* DONUT 1 : ÉCHANTILLONS PAR STATUT */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">ÉCHANTILLONS PAR STATUT</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0.5">
            <div className="flex items-center justify-between h-[100px]">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={samplesByStatus} cx="50%" cy="50%" innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="value" stroke="none">
                      {samplesByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUT_COLORS[index % STATUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '6px', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-0.5 pl-1">
                {samplesByStatus.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[9.5px]">
                    <div className="flex items-center gap-1 truncate">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUT_COLORS[idx] }}></span>
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground ml-1">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/40 text-[10px]">
              <span className="text-muted-foreground font-medium">Total Échantillons (Unités / Lots)</span>
              <span className="font-bold text-foreground">{totalSamples} u ({totalLotsCount} lot{totalLotsCount > 1 ? 's' : ''})</span>
            </div>
          </CardContent>
        </Card>

        {/* DONUT 2 : ÉCHANTILLONS PAR CATÉGORIE PRODUIT */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">CATÉGORIES DE PRODUITS</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0.5">
            <div className="flex items-center justify-between h-[100px]">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={samplesByCategory} cx="50%" cy="50%" innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="value" stroke="none">
                      {samplesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '6px', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-0.5 pl-1">
                {samplesByCategory.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[9px]">
                    <div className="flex items-center gap-1 truncate">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[idx] }}></span>
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground ml-1">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/40 text-[10px]">
              <span className="text-muted-foreground font-medium">Catégories d'échantillons</span>
              <span className="font-bold text-foreground">{Object.keys(categoryCounts).length} Référencée(s)</span>
            </div>
          </CardContent>
        </Card>

        {/* COLONNE 3 : ALERTES ÉCHANTILLONS */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-2 pb-1 flex flex-row items-center justify-between">
            <CardTitle className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">ALERTES ÉCHANTILLONS</CardTitle>
            <Link href="/dashboard/alerts" className="text-[10px] font-semibold text-[#1B5C2E] hover:underline">Voir tout</Link>
          </CardHeader>
          <CardContent className="p-2 pt-0 space-y-1">
            {sampleAlerts.map((alert, idx) => (
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

      {/* BOÎTE SCANNER QR CODE */}
      <QRCodeScannerDialog 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />
    </div>
  )
}

