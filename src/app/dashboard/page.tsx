"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Box, 
  CheckCircle2, 
  FlaskConical, 
  Clock, 
  Trash2, 
  AlertTriangle, 
  Plus, 
  Inbox, 
  ArrowRightLeft, 
  ClipboardList, 
  FileText, 
  UserPlus,
  TrendingUp,
  TrendingDown,
  Activity,
  BellRing
} from "lucide-react"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts"

import Link from "next/link"

const KPIData = [
  { title: "Total des échantillons", value: "24,592", trend: "+12.5%", isUp: true, icon: Box, color: "text-blue-500", bg: "bg-blue-50" },
  { title: "Disponibles", value: "18,230", trend: "+5.2%", isUp: true, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-50" },
  { title: "En analyse", value: "3,105", trend: "-2.1%", isUp: false, icon: FlaskConical, color: "text-purple-500", bg: "bg-purple-50" },
  { title: "En attente", value: "842", trend: "+18.4%", isUp: true, icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
  { title: "Détruits / Périmés", value: "2,415", trend: "-8.4%", isUp: false, icon: Trash2, color: "text-red-500", bg: "bg-red-50" },
  { title: "Expiration < 30 jours", value: "156", trend: "+4.2%", isUp: true, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50" },
]

const movementsData = [
  { name: 'Jan', Entrées: 4000, Sorties: 2400 },
  { name: 'Fév', Entrées: 3000, Sorties: 1398 },
  { name: 'Mar', Entrées: 2000, Sorties: 9800 },
  { name: 'Avr', Entrées: 2780, Sorties: 3908 },
  { name: 'Mai', Entrées: 1890, Sorties: 4800 },
  { name: 'Juin', Entrées: 2390, Sorties: 3800 },
];

const categoryData = [
  { name: 'Antalgiques', value: 400 },
  { name: 'Antibiotiques', value: 300 },
  { name: 'Vaccins', value: 300 },
  { name: 'Cardiologie', value: 200 },
];

const COLORS = ['#0B5ED7', '#10B981', '#F97316', '#8B5CF6'];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      
      {/* LIGNE 1 : KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPIData.map((kpi, index) => (
          <Card key={index} className="shadow-sm hover:shadow-md transition-all border-border/50 group">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold text-foreground tracking-tight">{kpi.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${kpi.bg} group-hover:scale-110 transition-transform`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs">
                {kpi.isUp ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                )}
                <span className={kpi.isUp ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                  {kpi.trend}
                </span>
                <span className="text-muted-foreground ml-1">vs mois préc.</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* RACCOURCIS RAPIDES */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Actions Rapides</h3>
        <div className="flex flex-wrap gap-3">
          <Button className="shadow-sm gap-2" asChild><Link href="/dashboard/receptions/new"><Inbox className="h-4 w-4" /> Nouvelle Réception</Link></Button>
          <Button variant="secondary" className="shadow-sm gap-2" asChild><Link href="/dashboard/movements"><ArrowRightLeft className="h-4 w-4" /> Mouvement</Link></Button>
          <Button variant="outline" className="shadow-sm gap-2 bg-background" asChild><Link href="/dashboard/inventory"><ClipboardList className="h-4 w-4" /> Inventaire</Link></Button>
          <Button variant="outline" className="shadow-sm gap-2 bg-background" asChild><Link href="/dashboard/reports"><FileText className="h-4 w-4" /> Rapport</Link></Button>
          <Button variant="outline" className="shadow-sm gap-2 bg-background" asChild><Link href="/dashboard/users"><UserPlus className="h-4 w-4" /> Nouvel utilisateur</Link></Button>
        </div>
      </div>

      {/* LIGNE 2 : GRAPHIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Mouvements Mensuels</CardTitle>
            <CardDescription>Flux des entrées et sorties sur 6 mois</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
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
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Area type="monotone" dataKey="Entrées" stroke="#10B981" fillOpacity={1} fill="url(#colorEntrees)" strokeWidth={2} />
                <Area type="monotone" dataKey="Sorties" stroke="#0B5ED7" fillOpacity={1} fill="url(#colorSorties)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Répartition par Catégorie</CardTitle>
            <CardDescription>Distribution des stocks actuels</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* LIGNE 3 : FLUX DE DONNÉES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center"><Activity className="mr-2 h-4 w-4 text-primary" /> Activités Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                  <div className="bg-primary/10 p-2 rounded-full mt-0.5">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Sortie de 500 boîtes de Paracétamol (Lot #X928)</p>
                    <p className="text-xs text-muted-foreground mt-1">Effectué par <span className="font-semibold text-foreground">Dr. Kadia Barry</span> • Il y a 2 heures</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center text-warning"><BellRing className="mr-2 h-4 w-4" /> Alertes & Échéances</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {[
                { type: 'Expirations', text: '12 lots de vaccins expirent dans 15 jours.', color: 'text-warning', bg: 'bg-warning/10' },
                { type: 'Inventaire', text: 'Écart détecté dans la zone B (Étagère 4).', color: 'text-destructive', bg: 'bg-destructive/10' },
                { type: 'Système', text: 'Sauvegarde automatique réussie à 03:00.', color: 'text-emerald-500', bg: 'bg-emerald-50' },
              ].map((alert, i) => (
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
            <Button variant="outline" className="w-full mt-6 text-xs">Voir toutes les alertes</Button>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
