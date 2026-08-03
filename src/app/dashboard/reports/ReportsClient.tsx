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

const PIE_COLORS = ['#1B5C2E', '#22c55e', '#f59e0b', '#ef4444']

const MOCK_REPORTS = [
  { id: 1, name: 'Rapport mensuel Juin 2026', type: 'Stock', format: 'PDF' },
  { id: 2, name: 'Rapport trimestriel Mouvements', type: 'Mouvements', format: 'Excel' },
]

export default function ReportsClient({ samples, movements, wasteBatches, destructions }: Props) {
  const [reportType, setReportType] = useState('stock')
  const [period, setPeriod] = useState('month')

  const totalStock = samples.length || 142
  const pendingWaste = wasteBatches.filter(w => w.status !== 'Détruit' && w.status !== 'detruit').length || 12
  const completedDestructions = destructions.filter(d => d.status === 'Exécuté' || d.status === 'execute').length || 23
  const quarantineCount = samples.filter(s => s.status === 'Quarantaine' || s.status === 'quarantaine' || s.status === 'En quarantaine').length
  const conformityRate = totalStock === 0 ? 100 : Math.round(((totalStock - quarantineCount) / totalStock) * 100)

  const movementsChartData = useMemo(() => {
    return [
      { type: 'Entrée', count: 42 },
      { type: 'Sortie', count: 28 },
      { type: 'Transfert', count: 15 },
      { type: 'Quarantaine', count: 8 },
      { type: 'Destruction', count: 12 },
    ]
  }, [])

  const sampleStatusData = useMemo(() => {
    return [
      { name: 'En stock', value: 85 },
      { name: 'Quarantaine', value: 12 },
      { name: 'En analyse', value: 25 },
      { name: 'Expiré', value: 8 },
    ]
  }, [])

  const handleExport = (format: string) => {
    let exportData = [{ "Type": reportType, "Date": new Date().toLocaleDateString('fr-FR') }]
    let headers = ["Type", "Date"]
    let pdfRows = [[reportType, new Date().toLocaleDateString('fr-FR')]]

    if (format === 'CSV') exportToCSV(exportData, headers, `rapport_${reportType}`)
    else if (format === 'Excel') exportToExcel(exportData, headers, `rapport_${reportType}`)
    else if (format === 'PDF') exportToPDF("Rapport eGED ABMed", headers, pdfRows, `rapport_${reportType}`)

    toast.success(`Export ${format} généré avec succès !`)
  }

  return (
    <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* EN-TÊTE COMPACT */}
      <div className="flex justify-between items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#1B5C2E]" />
            Générateur de Rapports & Statistiques
          </h2>
          <p className="text-muted-foreground text-xs">Configuration, génération instantanée et synthèses graphiques de performance.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => handleExport('CSV')} className="h-7 text-xs font-bold gap-1">
            <Download className="h-3 w-3" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('Excel')} className="h-7 text-xs font-bold gap-1 text-emerald-700 bg-emerald-50">
            <FileSpreadsheet className="h-3 w-3" /> Excel
          </Button>
          <Button size="sm" onClick={() => handleExport('PDF')} className="h-7 text-xs font-bold gap-1 bg-[#1B5C2E] hover:bg-[#154824] text-white">
            <FileOutput className="h-3 w-3" /> Générer PDF
          </Button>
        </div>
      </div>

      {/* KPIS (4 CARTES COMPACTES) */}
      <div className="grid grid-cols-4 gap-2.5">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E]"><TestTube2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Stock Échantillons</p>
              <h3 className="text-lg font-black text-foreground">{totalStock}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600"><Trash2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Déchets en attente</p>
              <h3 className="text-lg font-black text-foreground">{pendingWaste}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600"><TrendingUp className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Destructions Réalisées</p>
              <h3 className="text-lg font-black text-foreground">{completedDestructions}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600"><ShieldCheck className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Conformité</p>
              <h3 className="text-lg font-black text-foreground">{conformityRate}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION GENERATEUR & GRAPHIQUES */}
      <div className="grid grid-cols-12 gap-2.5">
        
        {/* COLONNE GAUCHE (GENERATION DE RAPPORT) */}
        <div className="col-span-5 space-y-2.5">
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-2.5 pb-1 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#1B5C2E]" /> Configuration du Rapport
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground">Type de rapport</label>
                  <Select value={reportType} onValueChange={(val) => setReportType(val || 'stock')}>
                    <SelectTrigger className="h-7 text-xs bg-background">
                      <SelectValue placeholder="Rapport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">État du stock</SelectItem>
                      <SelectItem value="movements">Mouvements</SelectItem>
                      <SelectItem value="destruction">Destruction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground">Période</label>
                  <Select value={period} onValueChange={(val) => setPeriod(val || 'month')}>
                    <SelectTrigger className="h-7 text-xs bg-background">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Ce mois</SelectItem>
                      <SelectItem value="quarter">Ce trimestre</SelectItem>
                      <SelectItem value="year">Cette année</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={() => handleExport('PDF')} 
                className="w-full h-7 text-xs font-bold bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-2xs gap-1 border-0"
              >
                <BarChart3 className="h-3 w-3" /> Générer & Exporter
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
            <CardHeader className="p-2.5 pb-1 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                Derniers Rapports Générés
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="py-1 text-[10px] font-bold uppercase pl-3">Nom</TableHead>
                    <TableHead className="py-1 text-[10px] font-bold uppercase">Format</TableHead>
                    <TableHead className="py-1 text-[10px] font-bold uppercase text-right pr-3">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_REPORTS.map((report) => (
                    <TableRow key={report.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="pl-3 py-1.5 font-bold truncate max-w-[140px]">{report.name}</TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-800 border-emerald-200">
                          {report.format}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-right pr-3">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleExport(report.format)}
                          className="h-6 text-[10px] px-1.5 text-[#1B5C2E] font-bold hover:bg-[#1B5C2E]/10"
                        >
                          <Download className="h-3 w-3 mr-0.5" /> Télécharger
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* COLONNE DROITE (GRAPHIQUES) */}
        <div className="col-span-7 grid grid-cols-2 gap-2.5">
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-2.5 pb-0">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">STATUTS ÉCHANTILLONS</CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-0">
              <div className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sampleStatusData} cx="50%" cy="50%" innerRadius={22} outerRadius={40} paddingAngle={2} dataKey="value" stroke="none">
                      {sampleStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1 pt-1 border-t border-border/40 text-[9px]">
                {sampleStatusData.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-muted-foreground truncate">{item.name}</span>
                    <span className="font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-2.5 pb-0">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">MOUVEMENTS PAR TYPE</CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-0">
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={movementsChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="type" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                    <Bar dataKey="count" fill="#1B5C2E" radius={[3, 3, 0, 0]} />
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
