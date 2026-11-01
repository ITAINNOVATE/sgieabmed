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
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, ArrowLeftRight, PackageCheck, Eye, Calendar, Building2 } from "lucide-react"
import { SAMPLE_CATEGORIES, getSampleCategory, matchesSampleCategory } from "@/types/sample-types"

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = searchParams?.get('type') || searchParams?.get('category')
  const activeCategory = useMemo(() => getSampleCategory(typeParam), [typeParam])

  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [samples, setSamples] = useState<any[]>(initialSamples)
  const [receptions, setReceptions] = useState<any[]>(initialReceptions)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [isSyncing, setIsSyncing] = useState(false)
  const hasLoadedOnceRef = useRef(false)

  const loadDashboardData = useCallback(async (manual = false) => {
    if (typeof window === "undefined") return
    if (manual === true) setIsSyncing(true)

    const isWiped = localStorage.getItem('all_data_wiped') === 'true'
    let sampleOverrides: Record<string, any> = {}
    let deletedIds: string[] = []
    try {
      const ov = localStorage.getItem('local_sample_overrides')
      if (ov) sampleOverrides = JSON.parse(ov)
      deletedIds = JSON.parse(localStorage.getItem('reception_deleted_ids') || '[]')
    } catch (e) {}

    const sampleMap = new Map<string, any>()
    const receptionMap = new Map<string, any>()

    if (!isWiped) {
      try {
        const localRecs = JSON.parse(localStorage.getItem('reception_history_records') || localStorage.getItem('local_receptions_history') || '[]')
        if (Array.isArray(localRecs)) {
          localRecs.forEach((r: any) => {
            const rKey = r.rec_number || r.reception_number || r.id
            if (!rKey || deletedIds.includes(rKey) || deletedIds.includes(r.id)) return
            const rType = r.type_reception || r.formData?.type_reception || r.reception_type
            receptionMap.set(rKey, { ...r, type_reception: rType })

            let sList = Array.isArray(r.samples_data) ? r.samples_data : []
            if (sList.length === 0) {
              const rawDetails = localStorage.getItem('reception_draft_details_' + rKey)
              if (rawDetails) {
                try {
                  const parsed = JSON.parse(rawDetails)
                  if (Array.isArray(parsed?.formData?.samples)) {
                    sList = parsed.formData.samples
                  }
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
                commercial_name: s.commercial_name || "Échantillon",
                category: s.category || s.dosage_form || "Médicaments",
                quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.qty ?? s.quantity ?? s.received_quantity ?? 1),
                status: ov.status || s.status || "Disponible",
                expiry_date: s.expiry_date || s.exp_date || null,
                type_reception: s.type_reception || rType,
                reception_ref: rKey,
              })
            })
          })
        }
      } catch (e) {}

      // Uniquement au tout premier affichage (montage initial), afficher le cache local immédiatement
      // Ne JAMAIS écraser les données distantes pendant le polling périodique !
      if (!hasLoadedOnceRef.current && (sampleMap.size > 0 || receptionMap.size > 0)) {
        setSamples(Array.from(sampleMap.values()))
        setReceptions(Array.from(receptionMap.values()))
        hasLoadedOnceRef.current = true
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
          const rKey = r.rec_number || r.reception_number || r.id
          if (!rKey || deletedIds.includes(rKey) || deletedIds.includes(r.id)) return
          const rType = r.type_reception || r.formData?.type_reception || r.reception_type
          receptionMap.set(rKey, { ...r, type_reception: rType })
          if (Array.isArray(r.samples_data)) {
            r.samples_data.forEach((s: any, idx: number) => {
              if (!s.commercial_name) return
              const sid = s.sample_number || s.id || `ECH-${String(rKey).replace('REC-', '')}-${idx + 1}`
              if (!sampleMap.has(sid) && !deletedIds.includes(sid)) {
                const ov = sampleOverrides[sid] || sampleOverrides[s.sample_number] || {}
                sampleMap.set(sid, {
                  id: sid,
                  sample_number: sid,
                  commercial_name: s.commercial_name || "Échantillon",
                  category: s.category || s.dosage_form || "Médicaments",
                  quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.qty ?? s.quantity ?? s.received_quantity ?? 1),
                  status: ov.status || s.status || "Disponible",
                  expiry_date: s.expiry_date || s.exp_date || null,
                  type_reception: s.type_reception || rType,
                  reception_ref: rKey,
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
          if (!sid || deletedIds.includes(sid) || deletedIds.includes(s.id) || (s.reception_ref && deletedIds.includes(s.reception_ref))) return
          const ov = sampleOverrides[sid] || sampleOverrides[s.id] || {}
          const matchingRec = s.reception_ref ? receptionMap.get(s.reception_ref) : null
          sampleMap.set(sid, {
            ...s,
            category: s.category || s.dosage_form || "Médicaments",
            quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.quantity ?? 1),
            status: ov.status || s.status || "Disponible",
            type_reception: s.type_reception || (matchingRec ? (matchingRec.type_reception || matchingRec.formData?.type_reception) : undefined),
          })
        })
      }

      hasLoadedOnceRef.current = true
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
    pollIntervalMs: 3000,
  })

  // ─── 0. FILTRAGE STRICT PAR SOUS-MODULE D'ÉCHANTILLON ───────────────────
  const filteredSamples = useMemo(() => {
    if (!activeCategory) return samples
    return samples.filter(s => matchesSampleCategory(s.type_reception, activeCategory.slug))
  }, [samples, activeCategory])

  const filteredReceptions = useMemo(() => {
    if (!activeCategory) return receptions
    return receptions.filter(r => matchesSampleCategory(r.type_reception || r.formData?.type_reception, activeCategory.slug))
  }, [receptions, activeCategory])

  // ─── 1. CALCUL DES KPIs ÉCHANTILLONS EN TEMPS RÉEL ──────────────────────
  const activeSamples = filteredSamples.filter(s => s.status !== 'Détruit' && (Number(s.quantity) || 0) >= 0)
  const totalSamples = activeSamples.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)
  const totalLotsCount = activeSamples.length
  const quarantineCount = activeSamples.filter(s => (s.status || '').toLowerCase().includes('quarantaine')).length
  const expiringCount = activeSamples.filter(s => s.expiry_date && new Date(s.expiry_date) <= new Date(Date.now() + 30*24*60*60*1000)).length
  const totalReceptions = filteredReceptions.length

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 pb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
            <Beaker className="h-4 w-4 text-[#1B5C2E]" />
            {activeCategory ? `Tableau de Bord — ${activeCategory.label}` : "Tableau de Bord & Statistiques Échantillons"}
          </h2>
          {activeCategory && (
            <Badge 
              className="text-[10px] font-bold font-mono px-2 py-0.2"
              style={{ backgroundColor: `${activeCategory.color}20`, color: activeCategory.color, border: `1px solid ${activeCategory.color}40` }}
            >
              {activeCategory.code}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Temps réel {lastUpdated ? `(${lastUpdated})` : ""}
          </span>
          <Button variant="outline" size="sm" onClick={() => loadDashboardData(true)} className="h-6 text-[10px] px-2 gap-1">
            <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} /> Actualiser
          </Button>
        </div>
      </div>

      {/* SÉLECTEUR RAPIDE DES 5 SOUS-MODULES DE TABLEAUX DE BORD */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => router.push("/dashboard/analytics")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            !activeCategory
              ? "bg-[#1B5C2E] text-white shadow-2xs"
              : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Vue Globale ({samples.length})
        </button>
        {SAMPLE_CATEGORIES.map((cat) => {
          const isSelected = activeCategory?.slug === cat.slug
          const catCount = samples.filter(s => matchesSampleCategory(s.type_reception, cat.slug)).length
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => router.push(`/dashboard/analytics?type=${cat.slug}`)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isSelected
                  ? "bg-[#1B5C2E] text-white shadow-2xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <span>{cat.shortLabel}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? "bg-white/20 text-white" : "bg-background text-muted-foreground"}`}>
                {catCount}
              </span>
            </button>
          )
        })}
      </div>

      {/* BANNIÈRE CONTEXTUELLE DU SOUS-MODULE ACTIF */}
      {activeCategory && (
        <div 
          className="rounded-xl p-3 border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden mb-1"
          style={{ backgroundColor: `${activeCategory.color}08`, borderColor: `${activeCategory.color}35` }}
        >
          <div className="flex items-center gap-2.5">
            <span 
              className="px-2 py-0.5 text-[11px] font-mono font-bold rounded uppercase shrink-0"
              style={{ backgroundColor: `${activeCategory.color}25`, color: activeCategory.color }}
            >
              {activeCategory.code}
            </span>
            <div>
              <h3 className="text-xs font-bold text-foreground">
                Sous-module : {activeCategory.label}
              </h3>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {activeCategory.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/dashboard/receptions/new?type=${encodeURIComponent(activeCategory.label)}`}>
              <Button size="sm" className="h-7 text-xs font-bold bg-[#1B5C2E] hover:bg-[#144823] text-white shadow-2xs gap-1">
                <Plus className="h-3 w-3" /> Nouvelle Réception
              </Button>
            </Link>
            <Link href={`/dashboard/samples?type=${activeCategory.slug}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs font-semibold gap-1 bg-background/80">
                <Box className="h-3 w-3" /> Stocks ({filteredSamples.length})
              </Button>
            </Link>
            <Link href={`/dashboard/movements?type=${activeCategory.slug}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs font-semibold gap-1 bg-background/80">
                <ArrowLeftRight className="h-3 w-3" /> Mouvements
              </Button>
            </Link>
            <Link href={`/dashboard/documents?type=${activeCategory.slug}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs font-semibold gap-1 bg-background/80">
                <Eye className="h-3 w-3" /> Documents
              </Button>
            </Link>
          </div>
        </div>
      )}

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
                    <Pie data={samplesByStatus} cx="50%" cy="50%" innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={false}>
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
                    <Pie data={samplesByCategory} cx="50%" cy="50%" innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="value" stroke="none" isAnimationActive={false}>
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

      {/* TABLEAU DES DERNIERS ARRIVAGES REFLÉTANT LE SOUS-MODULE */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden mt-1">
        <CardHeader className="p-2.5 pb-2 border-b border-border/50 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-[#1B5C2E]" />
            {activeCategory 
              ? `Derniers arrivages enregistrés — ${activeCategory.label} (${filteredReceptions.length})` 
              : `Derniers arrivages toutes catégories confondues (${filteredReceptions.length})`}
          </CardTitle>
          <Link 
            href={activeCategory ? `/dashboard/receptions?type=${activeCategory.slug}` : "/dashboard/receptions"}
            className="text-xs font-bold text-[#1B5C2E] hover:underline"
          >
            Voir tout le registre →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground">
              <TableRow>
                <TableHead className="py-2 pl-3">N° Réception</TableHead>
                <TableHead className="py-2">Date d&apos;arrivée</TableHead>
                <TableHead className="py-2">Structure Apportrice</TableHead>
                <TableHead className="py-2">Sous-Module</TableHead>
                <TableHead className="py-2">Échantillons</TableHead>
                <TableHead className="py-2 text-right pr-3">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-14 text-center text-xs text-muted-foreground">
                    Aucun arrivage enregistré pour {activeCategory ? activeCategory.label : "cette sélection"}.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceptions.slice(0, 5).map((rec: any) => {
                  const cat = getSampleCategory(rec.type_reception || rec.formData?.type_reception)
                  const sCount = Array.isArray(rec.samples_data) 
                    ? rec.samples_data.length 
                    : Array.isArray(rec.formData?.samples) 
                    ? rec.formData.samples.length 
                    : 1

                  return (
                    <TableRow key={rec.rec_number || rec.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-bold text-foreground py-2 pl-3">
                        {rec.rec_number || rec.id}
                      </TableCell>
                      <TableCell className="py-2 text-muted-foreground">
                        {rec.date_reception ? new Date(rec.date_reception).toLocaleDateString("fr-FR") : "-"}
                      </TableCell>
                      <TableCell className="py-2 font-semibold">
                        {rec.supplier || rec.formData?.supplier || "N/A"}
                      </TableCell>
                      <TableCell className="py-2">
                        {cat ? (
                          <span 
                            className="inline-block text-[9.5px] font-mono font-bold px-2 py-0.5 rounded"
                            style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                          >
                            {cat.shortLabel}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 font-mono">
                        {sCount} produit(s)
                      </TableCell>
                      <TableCell className="py-2 text-right pr-3">
                        <Button variant="ghost" size="sm" asChild className="h-6 text-[11px] px-2 text-[#1B5C2E] font-bold">
                          <Link href={activeCategory ? `/dashboard/receptions?type=${activeCategory.slug}` : `/dashboard/receptions`}>
                            <Eye className="h-3 w-3 mr-1" /> Détails
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* BOÎTE SCANNER QR CODE */}
      <QRCodeScannerDialog 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />
    </div>
  )
}

