"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Box, Trash2, Clock, Flame, Filter, Calendar, AlertTriangle, 
  ArrowRightLeft, FileText, Inbox, ClipboardList, Scan, Plus
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
const WASTE_COLORS = ['#E53935', '#FB8C00', '#1E88E5', '#43A047']

export default function DashboardClient({ 
  samples, 
  movements, 
  receptions,
  wasteBatches = [],
  destructions = []
}: { 
  samples: any[], 
  movements: any[], 
  receptions?: any[],
  wasteBatches?: any[],
  destructions?: any[]
}) {
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  // ─── 1. CALCUL DES KPIs ──────────────────────────────────────────────────
  const activeSamples = samples.filter(s => s.status !== 'Détruit')
  const totalSamples = activeSamples.reduce((acc, curr) => acc + (curr.quantity || 0), 0)
  const totalWaste = wasteBatches.filter((w: any) => w.status !== 'Détruit' && w.status !== 'detruit').length
  const plannedDestructions = destructions.filter((d: any) => d.status === 'Planifié' || d.status === 'planifie').length
  const completedDestructions = destructions.filter((d: any) => d.status === 'Exécuté' || d.status === 'execute').length

  const KPIData = [
    { title: "ÉCHANTILLONS EN STOCK", value: totalSamples, trend: "+12.5%", isUp: true, icon: Box, color: "text-[#2E7D32]", bg: "bg-[#2E7D32]/10", sparkline: [12, 14, 18, 15, 22, 28, 30] },
    { title: "DÉCHETS EN STOCK", value: `${totalWaste} kg`, trend: "+5.2%", isUp: true, icon: Trash2, color: "text-[#1E88E5]", bg: "bg-[#1E88E5]/10", sparkline: [5, 8, 12, 10, 15, 18, 20] },
    { title: "DESTRUCTIONS PLANIFIÉES", value: plannedDestructions, trend: "-2.1%", isUp: false, icon: Clock, color: "text-[#FB8C00]", bg: "bg-[#FB8C00]/10", sparkline: [20, 18, 15, 16, 14, 12, 10] },
    { title: "DESTRUCTIONS RÉALISÉES", value: completedDestructions, trend: "+18.4%", isUp: true, icon: Flame, color: "text-[#8E24AA]", bg: "bg-[#8E24AA]/10", sparkline: [2, 3, 5, 4, 8, 12, 15] },
  ]

  // ─── 2. CALCUL ÉCHANTILLONS PAR STATUT ──────────────────────────────────
  const samplesByStatus = [
    { name: 'Disponibles', value: activeSamples.filter(s => s.status === 'Disponible' || !s.status).length || 1289 },
    { name: 'En analyse', value: activeSamples.filter(s => s.status === 'En analyse').length || 586 },
    { name: 'En quarantaine', value: activeSamples.filter(s => s.status === 'En quarantaine').length || 230 },
    { name: 'Périmés', value: activeSamples.filter(s => s.expiry_date && new Date(s.expiry_date) < new Date()).length || 243 },
  ]

  // ─── 3. CALCUL DÉCHETS PAR CATÉGORIE ────────────────────────────────────
  const wasteByCategory = [
    { name: 'Cytotoxiques', value: 450 },
    { name: 'Infectieux', value: 337 },
    { name: 'Chimiques', value: 225 },
    { name: 'Autres', value: 112 },
  ]

  // ─── 4. ALERTES ────────────────────────────────────────────────────────
  const alerts = [
    { text: "23 échantillons périmeront dans 30 jours", date: "19/05/2025", type: "error" },
    { text: "Destruction planifiée le 26/05/2025", date: "19/05/2025", type: "warning" },
    { text: "Capacité de stockage des déchets atteinte à 80%", date: "18/05/2025", type: "warning" },
    { text: "Nouveau lot d'échantillons enregistré", date: "18/05/2025", type: "info" },
  ]

  // ─── 5. MOUVEMENTS RÉCENTS ──────────────────────────────────────────────
  const recentMovements = movements.slice(0, 4)

  // ─── 6. DESTRUCTIONS À VENIR ─────────────────────────────────────────────
  const upcomingDestructions = destructions.slice(0, 3)

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
      
      {/* BANDEAU DE TITRE DE LA PAGE & FILTRE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-1 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Bienvenue sur eGED-ABMed</h1>
          <p className="text-xs text-muted-foreground font-medium">Tableau de bord général</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground shadow-2xs">
            <Calendar className="h-3.5 w-3.5" />
            <span>19 Mai 2025</span>
          </div>
          <Button size="sm" className="bg-[#1B5C2E] hover:bg-[#154824] text-white gap-2 h-8.5 rounded-lg text-xs shadow-2xs">
            <Filter className="h-3.5 w-3.5" /> Filtrer
          </Button>
        </div>
      </div>

      {/* LIGNE 1 : KPIs (4 CARTES STATIQUES COMPACTES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIData.map((kpi, index) => (
          <Card key={index} className="shadow-2xs border border-border/70 rounded-xl overflow-hidden relative bg-card">
            <CardContent className="p-4 pb-6">
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-4.5 w-4.5 ${kpi.color}`} strokeWidth={2.2} />
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${kpi.isUp ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                  {kpi.isUp ? '▲' : '▼'} {kpi.trend}
                </span>
              </div>
              <p className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider mt-3 mb-0.5">{kpi.title}</p>
              <h2 className="text-2xl font-black text-foreground tracking-tight">{kpi.value}</h2>
            </CardContent>
            {/* Sparkline mini */}
            <div className="h-6 w-full absolute bottom-0 left-0 opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpi.sparkline.map((val, i) => ({ val, i }))}>
                  <Line type="monotone" dataKey="val" stroke={kpi.isUp ? '#2E7D32' : '#E53935'} strokeWidth={1.8} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
      </div>

      {/* LIGNE 2 : ANALYTIQUE (3 COLONNES COMPACTES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* DONUT 1 : ÉCHANTILLONS PAR STATUT */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-3.5 pb-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ÉCHANTILLONS PAR STATUT</CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="flex items-center justify-between h-[150px]">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={samplesByStatus} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value" stroke="none">
                      {samplesByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUT_COLORS[index % STATUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '6px', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1 pl-2">
                {samplesByStatus.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: STATUT_COLORS[idx] }}></span>
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground ml-1">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="font-bold text-foreground">2 348</span>
            </div>
          </CardContent>
        </Card>

        {/* DONUT 2 : DÉCHETS PAR CATÉGORIE */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-3.5 pb-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">DÉCHETS PAR CATÉGORIE</CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="flex items-center justify-between h-[150px]">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={wasteByCategory} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value" stroke="none">
                      {wasteByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={WASTE_COLORS[index % WASTE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '6px', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1 pl-2">
                {wasteByCategory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: WASTE_COLORS[idx] }}></span>
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground ml-1">{item.value} kg</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-medium">Total</span>
              <span className="font-bold text-foreground">1 124 kg</span>
            </div>
          </CardContent>
        </Card>

        {/* COLONNE 3 : ALERTES RÉCENTES */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ALERTES RÉCENTES</CardTitle>
            <Link href="/dashboard/alerts" className="text-[11px] font-semibold text-[#1B5C2E] hover:underline">Voir tout</Link>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 space-y-2.5">
            {alerts.map((al, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] gap-2 pb-1.5 border-b border-border/30 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 truncate">
                  <div className={`p-1 rounded-md shrink-0 ${al.type === 'error' ? 'bg-red-50 text-red-600' : al.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                  <span className="font-medium text-foreground truncate">{al.text}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{al.date}</span>
              </div>
            ))}
          </CardContent>
        </Card>

      </div>

      {/* LIGNE 3 : ACTIVITÉ & ACCÈS RAPIDES (3 COLONNES COMPACTES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* MOUVEMENTS RÉCENTS */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">MOUVEMENTS RÉCENTS</CardTitle>
            <Link href="/dashboard/movements" className="text-[11px] font-semibold text-[#1B5C2E] hover:underline">Voir tout</Link>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 space-y-2">
            {recentMovements.length === 0 ? (
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between items-center pb-1.5 border-b border-border/30">
                  <span className="font-medium text-foreground">Réception d'échantillons <span className="text-[10px] text-muted-foreground">INS-2025-05-0187</span></span>
                  <span className="text-[10px] text-muted-foreground">19/05/2025</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-border/30">
                  <span className="font-medium text-foreground">Transfert vers laboratoire <span className="text-[10px] text-muted-foreground">TRF-2025-05-0245</span></span>
                  <span className="text-[10px] text-muted-foreground">19/05/2025</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-foreground">Retour laboratoire <span className="text-[10px] text-muted-foreground">RET-2025-05-0098</span></span>
                  <span className="text-[10px] text-muted-foreground">18/05/2025</span>
                </div>
              </div>
            ) : (
              recentMovements.map(mvt => (
                <div key={mvt.id} className="flex justify-between items-center text-[11px] pb-1.5 border-b border-border/30 last:border-0">
                  <span className="font-medium text-foreground truncate">{mvt.movement_type} - {mvt.quantity} unité(s)</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{new Date(mvt.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* DESTRUCTIONS À VENIR */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">DESTRUCTIONS À VENIR</CardTitle>
            <Link href="/dashboard/destructions" className="text-[11px] font-semibold text-[#1B5C2E] hover:underline">Voir tout</Link>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 space-y-2">
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between items-center pb-1.5 border-b border-border/30">
                <span className="font-medium text-foreground">26/05/2025 <span className="text-[10px] text-muted-foreground">Lot : DES-2025-05-0088</span></span>
                <span className="font-bold text-red-600">125 kg</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-border/30">
                <span className="font-medium text-foreground">28/05/2025 <span className="text-[10px] text-muted-foreground">Lot : DES-2025-05-0090</span></span>
                <span className="font-bold text-red-600">98 kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">30/05/2025 <span className="text-[10px] text-muted-foreground">Lot : DES-2025-05-0092</span></span>
                <span className="font-bold text-red-600">156 kg</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ACCÈS RAPIDES (6 BOUTONS CARREAUX IDENTIQUES À LA MAQUETTE) */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-3.5 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ACCÈS RAPIDES</CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="h-14 flex-col gap-1 p-1 rounded-xl bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-200/50 text-[#1B5C2E]" asChild>
                <Link href="/dashboard/samples/new">
                  <Box className="h-4 w-4" />
                  <span className="text-[9.5px] font-semibold text-center leading-none">Nouvel échantillon</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-14 flex-col gap-1 p-1 rounded-xl bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-200/50 text-[#1B5C2E]" asChild>
                <Link href="/dashboard/waste/new">
                  <Trash2 className="h-4 w-4" />
                  <span className="text-[9.5px] font-semibold text-center leading-none">Nouveau déchet</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-14 flex-col gap-1 p-1 rounded-xl bg-blue-50/50 hover:bg-blue-100/60 border-blue-200/50 text-blue-700" asChild>
                <Link href="/dashboard/movements/new">
                  <ArrowRightLeft className="h-4 w-4" />
                  <span className="text-[9.5px] font-semibold text-center leading-none">Mouvement</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-14 flex-col gap-1 p-1 rounded-xl bg-purple-50/50 hover:bg-purple-100/60 border-purple-200/50 text-purple-700" asChild>
                <Link href="/dashboard/inventory">
                  <ClipboardList className="h-4 w-4" />
                  <span className="text-[9.5px] font-semibold text-center leading-none">Inventaire</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-14 flex-col gap-1 p-1 rounded-xl bg-amber-50/50 hover:bg-amber-100/60 border-amber-200/50 text-amber-700" asChild>
                <Link href="/dashboard/destructions/new">
                  <Flame className="h-4 w-4" />
                  <span className="text-[9.5px] font-semibold text-center leading-none">Planifier destruction</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-14 flex-col gap-1 p-1 rounded-xl bg-emerald-50/50 hover:bg-emerald-100/60 border-emerald-200/50 text-[#1B5C2E]" asChild>
                <Link href="/dashboard/reports">
                  <FileText className="h-4 w-4" />
                  <span className="text-[9.5px] font-semibold text-center leading-none">Rapport</span>
                </Link>
              </Button>
            </div>
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
