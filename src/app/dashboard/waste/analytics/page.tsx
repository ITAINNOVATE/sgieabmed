"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Trash2, Clock, Flame, ShieldAlert, AlertTriangle
} from "lucide-react"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Tooltip as RechartsTooltip
} from "recharts"
import Link from "next/link"

const WASTE_CATEGORIES_COLORS = ['#E53935', '#FB8C00', '#1E88E5', '#43A047']
const WASTE_STATUS_COLORS = ['#1E88E5', '#FB8C00', '#43A047', '#D81B60', '#E53935']

export default function WasteAnalyticsPage() {
  const KPIData = [
    { title: "DÉCHETS EN STOCK", value: "1 124 kg", trend: "+5.2%", isUp: true, icon: Trash2, color: "text-[#E53935]", bg: "bg-[#E53935]/10", sparkline: [5, 8, 12, 10, 15, 18, 20] },
    { title: "DESTRUCTIONS PLANIFIÉES", value: "7 Lots", trend: "-2.1%", isUp: false, icon: Clock, color: "text-[#FB8C00]", bg: "bg-[#FB8C00]/10", sparkline: [20, 18, 15, 16, 14, 12, 10] },
    { title: "DESTRUCTIONS RÉALISÉES", value: "23 Planifiées", trend: "+18.4%", isUp: true, icon: Flame, color: "text-[#43A047]", bg: "bg-[#43A047]/10", sparkline: [2, 3, 5, 4, 8, 12, 15] },
    { title: "CAPACITÉ STOCKAGE DÉCHETS", value: "78%", trend: "+12.0%", isUp: false, icon: ShieldAlert, color: "text-[#1E88E5]", bg: "bg-[#1E88E5]/10", sparkline: [40, 50, 58, 65, 70, 75, 78] },
  ]

  const wasteByCategory = [
    { name: 'Cytotoxiques', value: 450 },
    { name: 'Infectieux (DASRI)', value: 337 },
    { name: 'Chimiques', value: 225 },
    { name: 'Autres', value: 112 },
  ]

  const wasteByStatus = [
    { name: 'Déclarés', value: 12 },
    { name: 'En contrôle', value: 8 },
    { name: 'Validés', value: 15 },
    { name: 'En attente destruction', value: 7 },
    { name: 'Détruits', value: 23 },
  ]

  const wasteAlerts = [
    { text: "Capacité de stockage des déchets atteinte à 78%", date: "19/05/2025", type: "warning" },
    { text: "3 lots de déchets dépassent le délai légal de stockage (90j)", date: "19/05/2025", type: "error" },
    { text: "Destruction planifiée le 26/05/2025 (DES-2025-05-0088)", date: "18/05/2025", type: "warning" },
    { text: "Procès-verbal de destruction validé par la direction", date: "18/05/2025", type: "info" },
  ]

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* EN-TÊTE DU TABLEAU DE BORD DÉCHETS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Tableau de Bord & Statistiques Déchets
          </h2>
          <p className="text-muted-foreground text-xs">Indicateurs de masse, taux d'occupation et conformité réglementaire.</p>
        </div>
      </div>

      {/* LIGNE 1 : KPIs DÉCHETS (4 CARTES COMPACTES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIData.map((kpi, index) => (
          <Card key={index} className="shadow-2xs border border-border/70 rounded-xl overflow-hidden relative bg-card">
            <CardContent className="p-3.5 pb-5">
              <div className="flex justify-between items-start">
                <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} strokeWidth={2.2} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${kpi.isUp ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                  {kpi.isUp ? '▲' : '▼'} {kpi.trend}
                </span>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-2.5 mb-0.5">{kpi.title}</p>
              <h2 className="text-2xl font-black text-foreground tracking-tight">{kpi.value}</h2>
            </CardContent>
            <div className="h-5 w-full absolute bottom-0 left-0 opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpi.sparkline.map((val, i) => ({ val, i }))}>
                  <Line type="monotone" dataKey="val" stroke={kpi.isUp ? '#2E7D32' : '#E53935'} strokeWidth={1.8} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
      </div>

      {/* LIGNE 2 : ANALYTIQUE DÉCHETS (3 COLONNES COMPACTES - STATIQUE 1-ÉCRAN) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* DONUT 1 : DÉCHETS PAR CATÉGORIE */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">DÉCHETS PAR CATÉGORIE (KG)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="flex items-center justify-between h-[140px]">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={wasteByCategory} cx="50%" cy="50%" innerRadius={32} outerRadius={54} paddingAngle={3} dataKey="value" stroke="none">
                      {wasteByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={WASTE_CATEGORIES_COLORS[index % WASTE_CATEGORIES_COLORS.length]} />
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
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: WASTE_CATEGORIES_COLORS[idx] }}></span>
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground ml-1">{item.value} kg</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-medium">Masse Totale Déchets</span>
              <span className="font-bold text-foreground">1 124 kg</span>
            </div>
          </CardContent>
        </Card>

        {/* DONUT 2 : STATUT DU STOCK DÉCHETS */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">STATUT DU STOCK DÉCHETS</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="flex items-center justify-between h-[140px]">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={wasteByStatus} cx="50%" cy="50%" innerRadius={32} outerRadius={54} paddingAngle={3} dataKey="value" stroke="none">
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
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: WASTE_STATUS_COLORS[idx] }}></span>
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-foreground ml-1">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-medium">Lots de Déchets</span>
              <span className="font-bold text-foreground">65 Enregistrés</span>
            </div>
          </CardContent>
        </Card>

        {/* COLONNE 3 : ALERTES DÉCHETS */}
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ALERTES DÉCHETS (PSQIF)</CardTitle>
            <Link href="/dashboard/alerts" className="text-[11px] font-semibold text-[#E53935] hover:underline">Voir tout</Link>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {wasteAlerts.map((al, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px] gap-2 pb-1 border-b border-border/30 last:border-0 last:pb-0">
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

    </div>
  )
}
