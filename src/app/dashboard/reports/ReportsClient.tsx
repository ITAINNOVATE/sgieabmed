'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart3,
  FileText,
  TestTube2,
  Trash2,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  FileOutput,
  TrendingUp,
  Clock,
} from 'lucide-react'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface Sample {
  id: string
  status: string
  [key: string]: unknown
}

interface Movement {
  id: string
  movement_type: string
  [key: string]: unknown
}

interface WasteBatch {
  id: string
  status: string
  [key: string]: unknown
}

interface DestructionPlan {
  id: string
  status: string
  [key: string]: unknown
}

interface Props {
  samples: Sample[]
  movements: Movement[]
  wasteBatches: WasteBatch[]
  destructions: DestructionPlan[]
}

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']

const MOCK_REPORTS = [
  {
    id: 1,
    name: 'Rapport mensuel Juin 2026',
    type: 'État du stock',
    date: '15/06/2026',
    format: 'PDF',
    size: '1.2 MB',
  },
  {
    id: 2,
    name: 'Rapport trimestriel Q1 2026',
    type: 'Mouvements',
    date: '01/04/2026',
    format: 'Excel',
    size: '856 KB',
  },
  {
    id: 3,
    name: 'Rapport destruction DES-2026-001',
    type: 'Destruction',
    date: '20/03/2026',
    format: 'PDF',
    size: '540 KB',
  },
]

const FORMAT_BADGE_MAP: Record<string, string> = {
  PDF: 'bg-red-100 text-red-700 border-red-200',
  Excel: 'bg-green-100 text-green-700 border-green-200',
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export default function ReportsClient({ samples, movements, wasteBatches, destructions }: Props) {
  const [reportType, setReportType] = useState('')
  const [period, setPeriod] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // ── KPI computations ──────────────────────────────────────

  const totalStock = samples.length

  const pendingWaste = wasteBatches.filter(
    (w) => w.status !== 'Détruit' && w.status !== 'detruit',
  ).length

  const completedDestructions = destructions.filter(
    (d) => d.status === 'Exécuté' || d.status === 'execute',
  ).length

  const quarantineCount = samples.filter(
    (s) =>
      s.status === 'Quarantaine' ||
      s.status === 'quarantaine' ||
      s.status === 'En quarantaine',
  ).length
  const conformityRate =
    totalStock === 0 ? 100 : Math.round(((totalStock - quarantineCount) / totalStock) * 100)

  // ── Bar chart data: movements by type ─────────────────────

  const movementsChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of movements) {
      const t = m.movement_type || 'Autre'
      counts[t] = (counts[t] || 0) + 1
    }
    if (Object.keys(counts).length === 0) {
      return [
        { type: 'Réception', count: 0 },
        { type: 'Sortie', count: 0 },
        { type: 'Retour', count: 0 },
        { type: 'Transfert', count: 0 },
        { type: 'Ajustement', count: 0 },
      ]
    }
    return Object.entries(counts).map(([type, count]) => ({ type, count }))
  }, [movements])

  // ── Pie chart data: sample status distribution ─────────────

  const sampleStatusData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of samples) {
      const status = s.status || 'Inconnu'
      counts[status] = (counts[status] || 0) + 1
    }
    if (Object.keys(counts).length === 0) {
      return [{ name: 'Aucune donnée', value: 1 }]
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [samples])

  // ── Handlers ──────────────────────────────────────────────

  const handleExport = (format: string) => {
    toast.info(`Export ${format}`, {
      description: 'Fonctionnalité en cours de développement',
    })
  }

  const handleGenerate = () => {
    if (!reportType) {
      toast.warning('Veuillez sélectionner un type de rapport')
      return
    }
    toast.info('Génération du rapport', {
      description: 'Fonctionnalité en cours de développement',
    })
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rapports & Statistiques</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Visualisez les indicateurs clés et générez des rapports exportables
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
          <Clock className="h-3.5 w-3.5" />
          <span>Données en temps réel</span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Total stock */}
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Échantillons en stock
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <TestTube2 className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalStock}</p>
            <p className="text-xs text-muted-foreground mt-1">Toutes catégories confondues</p>
          </CardContent>
        </Card>

        {/* Pending waste */}
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Déchets en attente
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Trash2 className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingWaste}</p>
            <p className="text-xs text-muted-foreground mt-1">Lots non encore détruits</p>
          </CardContent>
        </Card>

        {/* Completed destructions */}
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Destructions réalisées
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{completedDestructions}</p>
            <p className="text-xs text-muted-foreground mt-1">Plans exécutés</p>
          </CardContent>
        </Card>

        {/* Conformity rate */}
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de conformité
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{conformityRate}%</p>
            <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${conformityRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {quarantineCount > 0
                ? `${quarantineCount} en quarantaine`
                : 'Aucun échantillon en quarantaine'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Report Generator ── */}
      <Card className="shadow-sm border-border/50 rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-base">Générateur de rapports</CardTitle>
              <CardDescription className="text-xs">
                Configurez et exportez vos rapports personnalisés
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Report type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type de rapport</label>
              <Select onValueChange={(val) => setReportType(val || '')} value={reportType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">État du stock</SelectItem>
                  <SelectItem value="movements">Historique mouvements</SelectItem>
                  <SelectItem value="destruction">Rapport destruction</SelectItem>
                  <SelectItem value="expiry">Produits expirant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Période</label>
              <Select onValueChange={(val) => setPeriod(val || '')} value={period}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 derniers jours</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="quarter">Ce trimestre</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status filter */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Filtre statut</label>
              <Select onValueChange={(val) => setStatusFilter(val || '')} value={statusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="En stock">En stock</SelectItem>
                  <SelectItem value="Quarantaine">Quarantaine</SelectItem>
                  <SelectItem value="Expiré">Expiré</SelectItem>
                  <SelectItem value="Détruit">Détruit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => handleExport('CSV')}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => handleExport('Excel')}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => handleExport('PDF')}
            >
              <FileOutput className="h-3.5 w-3.5 text-red-500" />
              Générer PDF
            </Button>
            <div className="ml-auto">
              <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={handleGenerate}>
                <BarChart3 className="h-3.5 w-3.5" />
                Générer le rapport
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Charts ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart: movements by type */}
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Mouvements par type</CardTitle>
            <CardDescription className="text-xs">
              Répartition de tous les mouvements enregistrés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-muted-foreground gap-2">
                <BarChart3 className="h-10 w-10 opacity-30" />
                <p className="text-sm">Aucun mouvement enregistré</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={movementsChartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                    }}
                    cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                  />
                  <Bar dataKey="count" name="Mouvements" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart: sample status */}
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Répartition des statuts d&apos;échantillons</CardTitle>
            <CardDescription className="text-xs">
              Distribution des échantillons par statut courant
            </CardDescription>
          </CardHeader>
          <CardContent>
            {samples.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-muted-foreground gap-2">
                <TestTube2 className="h-10 w-10 opacity-30" />
                <p className="text-sm">Aucun échantillon disponible</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={sampleStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sampleStatusData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Reports Table ── */}
      <Card className="shadow-sm border-border/50 rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Derniers rapports générés</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Historique des rapports récemment produits
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => toast.info('Fonctionnalité en cours de développement')}
            >
              Voir tout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="pl-6 text-xs font-semibold">Nom du rapport</TableHead>
                <TableHead className="text-xs font-semibold">Type</TableHead>
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-xs font-semibold">Format</TableHead>
                <TableHead className="text-xs font-semibold">Taille</TableHead>
                <TableHead className="text-xs font-semibold pr-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_REPORTS.map((report) => (
                <TableRow key={report.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6 font-medium text-sm">{report.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{report.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{report.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${FORMAT_BADGE_MAP[report.format] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {report.format}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{report.size}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 gap-1 text-xs"
                      onClick={() => toast.info('Fonctionnalité en cours de développement')}
                    >
                      <Download className="h-3 w-3" />
                      Télécharger
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
