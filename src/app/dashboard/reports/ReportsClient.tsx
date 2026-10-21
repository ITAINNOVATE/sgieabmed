'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
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
  RefreshCw,
} from 'lucide-react'
import { exportToCSV, exportToExcel, exportToPDF } from "@/utils/exportUtils"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

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

const MOCK_REPORTS: any[] = []

export default function ReportsClient({
  samples: initialSamples = [],
  movements: initialMovements = [],
  wasteBatches: initialWaste = [],
  destructions: initialDestructions = []
}: Props) {
  const [reportType, setReportType] = useState('stock')
  const [period, setPeriod] = useState('month')
  const [samples, setSamples] = useState<any[]>(initialSamples)
  const [movements, setMovements] = useState<any[]>(initialMovements)
  const [wasteBatches, setWasteBatches] = useState<any[]>(initialWaste)
  const [destructions, setDestructions] = useState<any[]>(initialDestructions)
  const [isSyncing, setIsSyncing] = useState(false)

  const loadReportsData = useCallback(async () => {
    if (typeof window === 'undefined') return
    setIsSyncing(true)

    const isWiped = localStorage.getItem('all_data_wiped') === 'true'
    let sampleOverrides: Record<string, any> = {}
    try {
      const ov = localStorage.getItem('local_sample_overrides')
      if (ov) sampleOverrides = JSON.parse(ov)
    } catch (e) {}

    const sampleMap = new Map<string, any>()
    const mvtMap = new Map<string, any>()
    const wasteMap = new Map<string, any>()
    const destMap = new Map<string, any>()

    if (!isWiped) {
      try {
        const localRecs = JSON.parse(localStorage.getItem('local_receptions_history') || '[]')
        if (Array.isArray(localRecs)) {
          localRecs.forEach((r: any) => {
            const sList = Array.isArray(r.samples) ? r.samples : (Array.isArray(r.samples_data) ? r.samples_data : [])
            sList.forEach((s: any, idx: number) => {
              const sid = s.sample_number || s.id || `${r.id}-${idx}`
              const ov = sampleOverrides[sid] || sampleOverrides[s.sample_number] || {}
              sampleMap.set(sid, {
                id: sid,
                sample_number: sid,
                commercial_name: s.commercial_name || 'Échantillon',
                quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.quantity ?? s.received_quantity ?? 1),
                status: ov.status || s.status || 'Disponible',
                storage_location: ov.storage_location || s.storage_location || 'Non assigné',
              })
            })
          })
        }
        const localMvts = JSON.parse(localStorage.getItem('local_movements_history') || '[]')
        if (Array.isArray(localMvts)) {
          localMvts.forEach((m: any) => {
            if (m.id) mvtMap.set(m.id, m)
          })
        }
        const localWaste = JSON.parse(localStorage.getItem('waste_batches_custom_v1') || '[]')
        if (Array.isArray(localWaste)) {
          localWaste.forEach((w: any) => {
            const k = w.batch_number || w.id
            if (k) wasteMap.set(k, w)
          })
        }
        const localDest = JSON.parse(localStorage.getItem('destruction_plans_custom_v1') || '[]')
        if (Array.isArray(localDest)) {
          localDest.forEach((d: any) => {
            const k = d.plan_number || d.id
            if (k) destMap.set(k, d)
          })
        }
      } catch (e) {}

      setSamples(Array.from(sampleMap.values()))
      setMovements(Array.from(mvtMap.values()))
      setWasteBatches(Array.from(wasteMap.values()))
      setDestructions(Array.from(destMap.values()))
    }

    try {
      const supabase = createClient()
      const [sRes, rRes, mRes, wRes, dRes] = await Promise.all([
        supabase.from('samples').select('*'),
        supabase.from('receptions').select('*'),
        supabase.from('movements').select('*'),
        supabase.from('waste_batches').select('*'),
        supabase.from('destruction_plans').select('*'),
      ])

      if (rRes.data && rRes.data.length > 0) {
        rRes.data.forEach((r: any) => {
          if (Array.isArray(r.samples_data)) {
            r.samples_data.forEach((s: any, idx: number) => {
              const sid = s.sample_number || s.id || `${r.id}-${idx}`
              if (!sampleMap.has(sid)) {
                const ov = sampleOverrides[sid] || {}
                sampleMap.set(sid, {
                  id: sid,
                  sample_number: sid,
                  commercial_name: s.commercial_name || 'Échantillon',
                  quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.quantity ?? s.received_quantity ?? 1),
                  status: ov.status || s.status || 'Disponible',
                  storage_location: ov.storage_location || s.storage_location || 'Non assigné',
                })
              }
            })
          }
        })
      }

      if (sRes.data && sRes.data.length > 0) {
        sRes.data.forEach((s: any) => {
          const sid = s.sample_number || s.id
          const ov = sampleOverrides[sid] || sampleOverrides[s.id] || {}
          sampleMap.set(sid, {
            ...s,
            quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.quantity ?? 1),
            status: ov.status || s.status || 'Disponible',
          })
        })
      }

      if (mRes.data && mRes.data.length > 0) {
        mRes.data.forEach((m: any) => {
          if (m.id) mvtMap.set(m.id, m)
        })
      }

      if (wRes.data && wRes.data.length > 0) {
        wRes.data.forEach((w: any) => {
          const k = w.batch_number || w.id
          if (k) wasteMap.set(k, w)
        })
      }

      if (dRes.data && dRes.data.length > 0) {
        dRes.data.forEach((d: any) => {
          const k = d.plan_number || d.id
          if (k) destMap.set(k, d)
        })
      }

      setSamples(Array.from(sampleMap.values()))
      setMovements(Array.from(mvtMap.values()))
      setWasteBatches(Array.from(wasteMap.values()))
      setDestructions(Array.from(destMap.values()))
    } catch (err) {
      console.warn("Supabase fetch fallback in ReportsClient:", err)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    loadReportsData()
  }, [loadReportsData])

  useRealtimeSync({
    tables: ['samples', 'receptions', 'movements', 'waste_batches', 'destruction_plans', 'inventories'],
    onSync: loadReportsData,
    pollIntervalMs: 4000,
  })

  const totalStock = samples.reduce((acc, s) => acc + (Number(s.quantity) || 1), 0)
  const pendingWaste = wasteBatches.filter(w => w.status !== 'Détruit' && w.status !== 'detruit').length
  const completedDestructions = destructions.filter(d => d.status === 'Exécuté' || d.status === 'execute').length
  const quarantineCount = samples.filter(s => (s.status || '').toLowerCase().includes('quarantaine')).length
  const conformityRate = samples.length === 0 ? 100 : Math.round(((samples.length - quarantineCount) / samples.length) * 100)

  const movementsChartData = useMemo(() => {
    const counts = {
      'Entrée': movements.filter(m => (m.movement_type || '').includes('Entrée') || (m.movement_type || '').includes('Réception')).length,
      'Sortie': movements.filter(m => (m.movement_type || '').includes('Sortie') || (m.movement_type || '').includes('Prélèvement')).length,
      'Transfert': movements.filter(m => (m.movement_type || '').includes('Transfert') || (m.movement_type || '').includes('Attribution') || (m.movement_type || '').includes('Correction')).length,
      'Quarantaine': movements.filter(m => (m.movement_type || '').toLowerCase().includes('quarantaine')).length,
      'Destruction': movements.filter(m => (m.movement_type || '').includes('Destruction')).length,
    }
    return [
      { type: 'Entrée', count: counts['Entrée'] },
      { type: 'Sortie', count: counts['Sortie'] },
      { type: 'Transfert', count: counts['Transfert'] },
      { type: 'Quarantaine', count: counts['Quarantaine'] },
      { type: 'Destruction', count: counts['Destruction'] },
    ]
  }, [movements])

  const sampleStatusData = useMemo(() => {
    const inStock = samples.filter(s => s.status === 'Disponible' || s.status === 'En stock' || !s.status).length
    const quar = samples.filter(s => (s.status || '').toLowerCase().includes('quarantaine')).length
    const analysis = samples.filter(s => (s.status || '').toLowerCase().includes('analyse')).length
    const expired = samples.filter(s => (s.status || '').toLowerCase().includes('périmé') || (s.status || '').toLowerCase().includes('expire')).length

    return [
      { name: 'En stock', value: inStock },
      { name: 'Quarantaine', value: quar },
      { name: 'En analyse', value: analysis },
      { name: 'Expiré', value: expired },
    ]
  }, [samples])

  const handleExport = (format: string) => {
    let headers: string[] = []
    let exportData: Record<string, any>[] = []
    let pdfRows: string[][] = []

    if (reportType === 'stock') {
      headers = ["N° Échantillon", "Produit", "Quantité", "Statut", "Emplacement"]
      exportData = samples.map(s => ({
        "N° Échantillon": s.sample_number || s.id,
        "Produit": s.commercial_name || "-",
        "Quantité": String(s.quantity ?? 1),
        "Statut": s.status || "Disponible",
        "Emplacement": s.storage_location || "Non assigné"
      }))
      pdfRows = exportData.map(r => headers.map(h => String(r[h] || '')))
    } else if (reportType === 'movements') {
      headers = ["Type", "Quantité", "Origine", "Destination", "Date"]
      exportData = movements.map(m => ({
        "Type": m.movement_type || "-",
        "Quantité": String(m.quantity ?? 1),
        "Origine": m.from_location || "-",
        "Destination": m.to_location || "-",
        "Date": m.created_at ? new Date(m.created_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')
      }))
      pdfRows = exportData.map(r => headers.map(h => String(r[h] || '')))
    } else {
      headers = ["N° Plan / Lot", "Statut", "Méthode / Type", "Quantité / Poids"]
      exportData = destructions.map(d => ({
        "N° Plan / Lot": d.plan_number || d.id,
        "Statut": d.status || "-",
        "Méthode / Type": d.destruction_method || "Incinération",
        "Quantité / Poids": `${d.total_weight || 0} kg`
      }))
      pdfRows = exportData.map(r => headers.map(h => String(r[h] || '')))
    }

    if (exportData.length === 0) {
      headers = ["Type", "Date", "Observation"]
      exportData = [{ "Type": reportType, "Date": new Date().toLocaleDateString('fr-FR'), "Observation": "Aucune donnée sur la période" }]
      pdfRows = [[reportType, new Date().toLocaleDateString('fr-FR'), "Aucune donnée sur la période"]]
    }

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
          <p className="text-muted-foreground text-xs">Configuration, génération instantanée et synthèses graphiques de performance en temps réel.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={loadReportsData} className="h-7 text-xs font-bold gap-1">
            <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
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
