"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Box, Clock, Filter, Calendar, AlertTriangle, 
  Inbox, ShieldAlert, Beaker
} from "lucide-react"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Tooltip as RechartsTooltip
} from "recharts"
import Link from "next/link"
import { useState } from "react"
import dynamic from "next/dynamic"

const QRCodeScannerDialog = dynamic(
  () => import("@/components/qrcode-scanner-dialog").then((mod) => mod.QRCodeScannerDialog),
  { ssr: false }
)

const STATUT_COLORS = ['#2E7D32', '#00897B', '#FB8C00', '#E53935']
const CATEGORY_COLORS = ['#1B5C2E', '#1565C0', '#6A1B9A', '#E65100', '#00838F', '#C2185B']

export default function DashboardClient({ 
  samples, 
  receptions,
}: { 
  samples: any[], 
  movements?: any[], 
  receptions?: any[],
  wasteBatches?: any[],
  destructions?: any[]
}) {
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  // ─── 1. CALCUL DES KPIs ÉCHANTILLONS SEULEMENT ──────────────────────────
  const activeSamples = samples.filter(s => s.status !== 'Détruit')
  const totalSamples = activeSamples.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)
  const quarantineCount = activeSamples.filter(s => s.status === 'En quarantaine').length
  const expiringCount = activeSamples.filter(s => s.expiry_date && new Date(s.expiry_date) <= new Date(Date.now() + 30*24*60*60*1000)).length
  const totalReceptions = receptions?.length || 0

  const KPIData = [
    { title: "ÉCHANTILLONS EN STOCK", value: totalSamples, trend: "+0.0%", isUp: true, icon: Box, color: "text-[#2E7D32]", bg: "bg-[#2E7D32]/10", sparkline: [totalSamples, totalSamples] },
    { title: "RÉCEPTIONS DU MOIS", value: totalReceptions, trend: "+0.0%", isUp: true, icon: Inbox, color: "text-[#1565C0]", bg: "bg-[#1565C0]/10", sparkline: [totalReceptions, totalReceptions] },
    { title: "LOTS EN QUARANTAINE", value: quarantineCount, trend: "0.0%", isUp: false, icon: Clock, color: "text-[#FB8C00]", bg: "bg-[#FB8C00]/10", sparkline: [quarantineCount, quarantineCount] },
    { title: "EXPIRATIONS PROCHES (<30J)", value: expiringCount, trend: "0.0%", isUp: false, icon: ShieldAlert, color: "text-[#E53935]", bg: "bg-[#E53935]/10", sparkline: [expiringCount, expiringCount] },
  ]

  // ─── 2. REPARTITION PAR STATUT ──────────────────────────────────────────
  const availableCount = activeSamples.filter(s => s.status === 'Disponible' || !s.status).length
  const inAnalysisCount = activeSamples.filter(s => s.status === 'En analyse').length
  const expiredCount = activeSamples.filter(s => s.expiry_date && new Date(s.expiry_date) < new Date()).length

  const samplesByStatus = [
    { name: 'Disponibles', value: availableCount },
    { name: 'En analyse', value: inAnalysisCount },
    { name: 'En quarantaine', value: quarantineCount },
    { name: 'Périmés', value: expiredCount },
  ]

  // ─── 3. REPARTITION PAR CATÉGORIE D'ÉCHANTILLONS (DYNAMIQUE) ───────────
  const categoryCounts = activeSamples.reduce((acc: Record<string, number>, s) => {
    const cat = s.category || 'Autres'
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
                  {kpi.isUp ? '▲' : '▼'} {kpi.trend}
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
              <span className="text-muted-foreground font-medium">Total Échantillons</span>
              <span className="font-bold text-foreground">2 348</span>
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
              <span className="font-bold text-foreground">6 Référencées</span>
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
