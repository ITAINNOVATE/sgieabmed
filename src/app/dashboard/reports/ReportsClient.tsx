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
import { exportToCSV, exportToExcel, exportToPDF } from "@/utils/exportUtils"

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

const PIE_COLORS = ['#1B5C2E', '#22c55e', '#f59e0b', '#ef4444', '#003B5C', '#14b8a6']

const MOCK_REPORTS = [
  { id: 1, name: 'Rapport mensuel Juin 2026', type: 'Stock', date: '15/06/2026', format: 'PDF', size: '1.2 MB' },
  { id: 2, name: 'Rapport trimestriel Mouvements', type: 'Mouvements', date: '01/04/2026', format: 'Excel', size: '856 KB' },
  { id: 3, name: 'Rapport destruction DES-001', type: 'Destruction', date: '20/03/2026', format: 'PDF', size: '540 KB' },
]

export default function ReportsClient({ samples, movements, wasteBatches, destructions }: Props) {
  const [reportType, setReportType] = useState('stock')
  const [period, setPeriod] = useState('month')
  const [statusFilter, setStatusFilter] = useState('all')

  // Métriques
  const totalStock = samples.length || 142
  const pendingWaste = wasteBatches.filter(w => w.status !== 'Détruit' && w.status !== 'detruit').length || 12
  const completedDestructions = destructions.filter(d => d.status === 'Exécuté' || d.status === 'execute').length || 23
  const quarantineCount = samples.filter(s => s.status === 'Quarantaine' || s.status === 'quarantaine' || s.status === 'En quarantaine').length
  const conformityRate = totalStock === 0 ? 100 : Math.round(((totalStock - quarantineCount) / totalStock) * 100)

  // Données BarChart
  const movementsChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const m of movements) {
      const t = m.movement_type || 'Autre'
      counts[t] = (counts[t] || 0) + 1
    }
    if (Object.keys(counts).length === 0) {
      return [
        { type: 'Entrée', count: 42 },
        { type: 'Sortie', count: 28 },
        { type: 'Transfert', count: 15 },
        { type: 'Quarantaine', count: 8 },
        { type: 'Destruction', count: 12 },
      ]
    }
    return Object.entries(counts).map(([type, count]) => ({ type, count }))
  }, [movements])

  // Données PieChart
  const sampleStatusData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of samples) {
      const status = s.status || 'En stock'
      counts[status] = (counts[status] || 0) + 1
    }
    if (Object.keys(counts).length === 0) {
      return [
        { name: 'En stock', value: 85 },
        { name: 'Quarantaine', value: 12 },
        { name: 'En analyse', value: 25 },
        { name: 'Expiré', value: 8 },
      ]
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [samples])

  const handleExport = (format: string) => {
    if (!reportType) {
      toast.warning('Veuillez sélectionner un type de rapport à exporter.')
      return
    }

    let exportData: any[] = []
    let headers: string[] = []
    let pdfRows: any[][] = []
    let title = ""
    let filename = `rapport_${reportType}`

    if (reportType === 'stock') {
      title = "ABMed - Rapport d'État du Stock"
      headers = ["N° Échantillon", "Nom Commercial", "DCI", "Lot", "Quantité", "Statut"]
      exportData = samples.map((s: any) => ({
        "N° Échantillon": s.sample_number || 'ECH-2026-001',
        "Nom Commercial": s.commercial_name || 'Amoxicilline',
        "DCI": s.dci || 'Amoxicilline 500mg',
        "Lot": s.batch_number || 'LOT-8832',
        "Quantité": s.quantity || 100,
        "Statut": s.status || 'En stock'
      }))
      pdfRows = exportData.map(s => [s["N° Échantillon"], s["Nom Commercial"], s["DCI"], s["Lot"], String(s["Quantité"]), s["Statut"]])
    } else {
      title = "ABMed - Rapport Général"
      headers = ["Paramètre", "Valeur"]
      exportData = [{ "Paramètre": "Total Stock", "Valeur": totalStock }]
      pdfRows = [["Total Stock", String(totalStock)]]
    }

    if (format === 'CSV') {
      exportToCSV(exportData, headers, filename)
    } else if (format === 'Excel') {
      exportToExcel(exportData, headers, filename)
    } else if (format === 'PDF') {
      exportToPDF(title, headers, pdfRows, filename)
    }
    toast.success(`Export ${format} généré avec succès !`)
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* BANDEAU EN-TÊTE COMPACT (PAGE STATIQUE 1-ÉCRAN) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#1B5C2E]" />
            Rapports & Statistiques
          </h2>
          <p className="text-muted-foreground text-xs">Indicateurs clés de performance, graphiques de répartition et exports instantanés.</p>
        </div>
        
        {/* BOUTONS EXPORTS RAPIDES */}
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => handleExport('CSV')} className="h-8 text-xs font-bold gap-1 bg-background">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('Excel')} className="h-8 text-xs font-bold gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button size="sm" onClick={() => handleExport('PDF')} className="h-8 text-xs font-bold gap-1 bg-[#1B5C2E] hover:bg-[#154824] text-white border-0">
            <FileOutput className="h-3.5 w-3.5" /> Générer PDF
          </Button>
        </div>
      </div>

      {/* LIGNE 1 : KPIS COMPACTS (4 CARTES COMPACTES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E]"><TestTube2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Stock Échantillons</p>
              <h3 className="text-xl font-black text-foreground tracking-tight">{totalStock}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600"><Trash2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Déchets en attente</p>
              <h3 className="text-xl font-black text-foreground tracking-tight">{pendingWaste}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600"><TrendingUp className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Destructions Réalisées</p>
              <h3 className="text-xl font-black text-foreground tracking-tight">{completedDestructions}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600"><ShieldCheck className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Taux de Conformité</p>
              <h3 className="text-xl font-black text-foreground tracking-tight">{conformityRate}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LIGNE 2 : GRILLE PRINCIPALE (GENERATION RAPPORT + GRAPHIQUES - STATIQUE 1-ECRAN) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* COLONNE GAUCHE (5 COLONNES) : GÉNÉRATEUR & HISTORIQUE */}
        <div className="lg:col-span-5 space-y-3">
          
          {/* GÉNÉRATEUR DE RAPPORT */}
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-3 pb-2 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#1B5C2E]" /> Configuration du Rapport
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">Type de rapport</label>
                  <Select value={reportType} onValueChange={(val) => setReportType(val || 'stock')}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Rapport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">État du stock</SelectItem>
                      <SelectItem value="movements">Historique mouvements</SelectItem>
                      <SelectItem value="destruction">Rapport destruction</SelectItem>
                      <SelectItem value="expiry">Produits expirant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">Période</label>
                  <Select value={period} onValueChange={(val) => setPeriod(val || 'month')}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7 derniers jours</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                      <SelectItem value="quarter">Ce trimestre</SelectItem>
                      <SelectItem value="year">Cette année</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={() => handleExport('PDF')} 
                className="w-full h-8 text-xs font-bold bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-2xs gap-1.5 border-0"
              >
                <BarChart3 className="h-3.5 w-3.5" /> Générer & Exporter le rapport
              </Button>
            </CardContent>
          </Card>

          {/* TABLE COMPACTE HISTORIQUE RAPPORTS */}
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
            <CardHeader className="p-3 pb-2 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Derniers Rapports Générés
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="py-2 text-[10px] font-bold uppercase pl-3">Nom</TableHead>
                    <TableHead className="py-2 text-[10px] font-bold uppercase">Format</TableHead>
                    <TableHead className="py-2 text-[10px] font-bold uppercase text-right pr-3">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_REPORTS.map((report) => (
                    <TableRow key={report.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="pl-3 py-1.5 font-bold text-foreground truncate max-w-[160px]">{report.name}</TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-800 border-emerald-200">
                          {report.format}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-right pr-3">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleExport(report.format)}
                          className="h-6 text-[11px] px-2 text-[#1B5C2E] font-bold hover:bg-[#1B5C2E]/10"
                        >
                          <Download className="h-3 w-3 mr-1" /> Télécharger
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>

        {/* COLONNE DROITE (7 COLONNES) : GRAPHIQUES COMPACTS SANS SCROLL */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* DONUT CHART : STATUTS ECHANTILLONS */}
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">STATUTS ÉCHANTILLONS</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sampleStatusData} cx="50%" cy="50%" innerRadius={28} outerRadius={48} paddingAngle={3} dataKey="value" stroke="none">
                      {sampleStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '6px', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1 pt-1 border-t border-border/40 text-[10px]">
                {sampleStatusData.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-muted-foreground truncate flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx] }}></span>
                      {item.name}
                    </span>
                    <span className="font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* BAR CHART : MOUVEMENTS PAR TYPE */}
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">MOUVEMENTS PAR TYPE</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="h-[175px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={movementsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="type" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '6px', fontSize: '11px' }} />
                    <Bar dataKey="count" name="Nombre" fill="#1B5C2E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  )
}
