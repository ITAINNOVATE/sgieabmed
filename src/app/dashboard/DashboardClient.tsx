"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Box, CheckCircle2, FlaskConical, Clock, Trash2, AlertTriangle, Plus, Inbox, 
  ArrowRightLeft, ClipboardList, FileText, UserPlus, TrendingUp, TrendingDown, 
  Activity, BellRing, Flame, Scan
} from "lucide-react"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts"
import Link from "next/link"
import { useState } from "react"
import { QRCodeScannerDialog } from "@/components/qrcode-scanner-dialog"

const COLORS = ['#0B5ED7', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#14B8A6', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#64748B'];

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

  // --- 1. CALCUL DES KPIs ---
  const activeSamples = samples.filter(s => s.status !== 'Détruit')
  const totalSamples = activeSamples.reduce((acc, curr) => acc + (curr.quantity || 0), 0)
  
  const totalWaste = wasteBatches.filter((w: any) => w.status !== 'Détruit' && w.status !== 'detruit').length
  const plannedDestructions = destructions.filter((d: any) => d.status === 'Planifié' || d.status === 'planifie').length
  const completedDestructions = destructions.filter((d: any) => d.status === 'Exécuté' || d.status === 'execute').length

  const KPIData = [
    { title: "ÉCHANTILLONS EN STOCK", value: totalSamples, trend: "+12.5%", isUp: true, icon: Box, color: "text-primary", bg: "bg-primary/10", sparkline: [12, 14, 18, 15, 22, 28, 30] },
    { title: "DÉCHETS EN STOCK", value: totalWaste, trend: "+5.2%", isUp: true, icon: Trash2, color: "text-validation", bg: "bg-validation/10", sparkline: [5, 8, 12, 10, 15, 18, 20] },
    { title: "DESTRUCTIONS PLANIFIÉES", value: plannedDestructions, trend: "-2.1%", isUp: false, icon: Clock, color: "text-warning", bg: "bg-warning/10", sparkline: [20, 18, 15, 16, 14, 12, 10] },
    { title: "DESTRUCTIONS RÉALISÉES", value: completedDestructions, trend: "+18.4%", isUp: true, icon: Flame, color: "text-info", bg: "bg-info/10", sparkline: [2, 3, 5, 4, 8, 12, 15] },
  ]

  // --- 2. CALCUL REPARTITION PAR CATEGORIE ---
  const categoryCount: Record<string, number> = {}
  samples.forEach(s => {
    const cat = s.category || 'Autres'
    if (!categoryCount[cat]) categoryCount[cat] = 0
    categoryCount[cat] += (s.quantity || 0)
  })
  
  const categoryData = Object.keys(categoryCount).map(key => ({
    name: key,
    value: categoryCount[key]
  })).filter(cat => cat.value > 0).sort((a, b) => b.value - a.value)

  // --- 3. CALCUL MOUVEMENTS MENSUELS ---
  // On prend les 6 derniers mois
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push(d.toLocaleString('fr-FR', { month: 'short' }).replace('.', ''))
  }

  const movementsData = months.map(m => ({ name: m, Entrées: 0, Sorties: 0 }))

  movements.forEach(mvt => {
    const d = new Date(mvt.movement_date || mvt.created_at)
    const monthName = d.toLocaleString('fr-FR', { month: 'short' }).replace('.', '')
    const monthIndex = movementsData.findIndex(item => item.name === monthName)
    
    if (monthIndex !== -1) {
      if (['Entrée', "Retour d'analyse"].includes(mvt.movement_type)) {
        movementsData[monthIndex].Entrées += (mvt.quantity || 0)
      } else if (['Sortie', 'Destruction'].includes(mvt.movement_type)) {
        movementsData[monthIndex].Sorties += (mvt.quantity || 0)
      }
    }
  })

  // --- 4. ACTIVITÉS RÉCENTES ---
  const recentMovements = [...movements].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }).slice(0, 5)

  // --- 5. ALERTES ---
  const alerts = []
  
  const expiredSamples = activeSamples.filter(s => s.expiry_date && new Date(s.expiry_date) < new Date())
  if (expiredSamples.length > 0) {
    alerts.push({ type: 'Produits expirés', text: `${expiredSamples.length} lot(s) actuellement expiré(s) en stock.`, color: 'text-destructive', bg: 'bg-destructive/10' })
  }

  const expiringSamplesCount = activeSamples.filter(s => {
    if (!s.expiry_date) return false
    const expDate = new Date(s.expiry_date)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return expDate <= thirtyDaysFromNow && expDate >= new Date()
  }).reduce((acc, curr) => acc + (curr.quantity || 0), 0)

  if (expiringSamplesCount > 0) {
    alerts.push({ type: 'Expirations proches', text: `${expiringSamplesCount} unité(s) expirent dans moins de 30 jours.`, color: 'text-warning', bg: 'bg-warning/10' })
  }

  const quarantineCount = activeSamples.filter(s => s.status === 'En quarantaine').length
  if (quarantineCount > 0) {
    alerts.push({ type: 'En quarantaine', text: `${quarantineCount} lot(s) sont en quarantaine.`, color: 'text-warning', bg: 'bg-warning/10' })
  }

  const upcomingDestructions = destructions
    .filter((d: any) => d.status === 'Planifié' || d.status === 'planifie')
    .sort((a, b) => {
      const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0
      const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0
      return dateA - dateB
    })
    .slice(0, 5)

  if (alerts.length === 0) {
    alerts.push({ type: 'Système', text: 'Aucune alerte critique. Tout est en ordre.', color: 'text-validation', bg: 'bg-validation/10' })
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      
      {/* LIGNE 1 : KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIData.map((kpi, index) => (
          <Card key={index} className="shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-150 border border-border/60 group rounded-2xl overflow-hidden relative">
            <CardContent className="p-5 pb-8">
              <div className="flex justify-between items-start mb-2">
                <div className={`p-2.5 rounded-full ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} strokeWidth={2.5} />
                </div>
                <Badge variant="outline" className={`border-transparent font-semibold ${kpi.isUp ? 'text-validation bg-validation/10' : 'text-destructive bg-destructive/10'}`}>
                  {kpi.isUp ? '▲' : '▼'} {kpi.trend}
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-4 mb-1">{kpi.title}</p>
              <h3 className="text-3xl font-extrabold text-foreground tracking-tight">{kpi.value.toLocaleString('fr-FR')}</h3>
            </CardContent>
            {/* Sparkline */}
            <div className="h-12 w-full absolute bottom-0 left-0 opacity-40 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpi.sparkline.map((val, i) => ({ val, i }))}>
                  <Line type="monotone" dataKey="val" stroke={kpi.isUp ? 'var(--validation)' : 'var(--destructive)'} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
      </div>

      {/* RACCOURCIS RAPIDES */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Actions Rapides</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Button className="h-11 w-full rounded-xl shadow-sm gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all" asChild>
            <Link href="/dashboard/receptions/new"><Inbox className="h-4 w-4" /> Nouvelle réception</Link>
          </Button>
          <Button variant="outline" className="h-11 w-full rounded-xl shadow-sm gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all bg-card" asChild>
            <Link href="/dashboard/samples/new"><Box className="h-4 w-4" /> Nouvel échantillon</Link>
          </Button>
          <Button variant="outline" className="h-11 w-full rounded-xl shadow-sm gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all bg-card" asChild>
            <Link href="/dashboard/waste/new"><Trash2 className="h-4 w-4" /> Nouveau déchet</Link>
          </Button>
          <Button variant="outline" className="h-11 w-full rounded-xl shadow-sm gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all bg-card" asChild>
            <Link href="/dashboard/movements/new"><ArrowRightLeft className="h-4 w-4" /> Mouvement</Link>
          </Button>
          <Button variant="outline" className="h-11 w-full rounded-xl shadow-sm gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all bg-card" asChild>
            <Link href="/dashboard/inventory"><ClipboardList className="h-4 w-4" /> Inventaire</Link>
          </Button>
          <Button variant="outline" className="h-11 w-full rounded-xl shadow-sm gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all bg-card" asChild>
            <Link href="/dashboard/destructions/new"><Flame className="h-4 w-4" /> Planifier une destruction</Link>
          </Button>
          <Button variant="outline" className="h-11 w-full rounded-xl shadow-sm gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all bg-card" asChild>
            <Link href="/dashboard/reports"><FileText className="h-4 w-4" /> Rapport</Link>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsScannerOpen(true)}
            className="h-11 w-full rounded-xl shadow-sm gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary transition-all bg-card cursor-pointer"
          >
            <Scan className="h-4 w-4" /> Scanner QR
          </Button>
        </div>
      </div>

      {/* LIGNE 2 : GRAPHIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Échantillons par statut</CardTitle>
              <CardDescription>Flux des entrées et sorties</CardDescription>
            </div>
            <div className="flex gap-1 bg-muted p-1 rounded-xl shrink-0 self-start sm:self-auto">
              {['Aujourd\'hui', 'Semaine', 'Mois', 'Année'].map(f => (
                <button key={f} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${f === 'Mois' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{f}</button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-[400px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={movementsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntrees" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSorties" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B5ED7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0B5ED7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Area type="monotone" dataKey="Entrées" stroke="#10B981" fillOpacity={1} fill="url(#colorEntrees)" strokeWidth={2} />
                <Area type="monotone" dataKey="Sorties" stroke="#0B5ED7" fillOpacity={1} fill="url(#colorSorties)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Déchets par catégorie</CardTitle>
              <CardDescription>Distribution des stocks actuels</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center mt-4">
            {categoryData.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune donnée disponible</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px', maxHeight: '200px', overflowY: 'auto' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* LIGNE 3 : FLUX DE DONNÉES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm border-border/50 lg:col-span-1 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center"><Activity className="mr-2 h-4 w-4 text-primary" /> Mouvements récents</CardTitle>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
            ) : (
              <div className="space-y-4">
                {recentMovements.map((mvt) => (
                  <div key={mvt.id} className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                    <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                      <ArrowRightLeft className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        <Badge variant="outline" className="mr-2">{mvt.movement_type}</Badge>
                        {mvt.quantity} unité(s) - {mvt.reason || "Mouvement enregistré"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Le {new Date(mvt.created_at).toLocaleString('fr-FR')} • N° {mvt.mvt_number || mvt.id.substring(0,8)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 lg:col-span-1 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center text-primary"><Flame className="mr-2 h-4 w-4" /> Destructions à venir</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDestructions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune destruction planifiée.</p>
            ) : (
              <div className="space-y-4">
                {upcomingDestructions.map((d: any) => (
                  <div key={d.id} className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                    <div className="bg-destructive/10 p-2 rounded-full mt-0.5">
                      <Flame className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Plan {d.plan_number || d.id.substring(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Prévu le : {d.scheduled_date ? new Date(d.scheduled_date).toLocaleDateString('fr-FR') : 'Non défini'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{d.description || "Aucune description"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 lg:col-span-1 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center text-warning"><BellRing className="mr-2 h-4 w-4" /> Alertes récentes</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`${alert.bg} ${alert.color} p-1.5 rounded-md shrink-0 mt-0.5`}>
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">{alert.type}</p>
                    <p className="text-muted-foreground text-xs leading-snug mt-0.5">{alert.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-6 text-xs">Gérer les alertes</Button>
          </CardContent>
        </Card>
      </div>

      <QRCodeScannerDialog 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />
    </div>
  )
}
