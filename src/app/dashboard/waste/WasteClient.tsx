"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Plus, Trash2, Search, Filter, Flame, Eye, Printer, 
  Clock, ShieldAlert, AlertTriangle, ArrowLeftRight, 
  CheckCircle2, Box, LayoutDashboard, List, FileText
} from "lucide-react"
import { toast } from "sonner"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Tooltip as RechartsTooltip
} from "recharts"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { LabelPrintDialog } from "@/components/label-print-dialog"

const MOCK_WASTE_BATCHES = [
  { id: '1', batch_number: 'DEC-2026-73355', waste_type: 'Médicaments périmés', quantity: 150, unit: 'Kg', current_location: 'Local Déchets A1', status: 'En attente de destruction', created_at: '2026-01-20T10:00:00.000Z' },
  { id: '2', batch_number: 'DEC-2026-88120', waste_type: 'Produits chimiques dangereux', quantity: 45, unit: 'L', current_location: 'Zone Quarantaine C2', status: 'Déclaré', created_at: '2026-02-12T14:30:00.000Z' },
  { id: '3', batch_number: 'DEC-2026-11409', waste_type: 'Déchets infectieux (DASRI)', quantity: 230, unit: 'Kg', current_location: 'Local DASRI B', status: 'Validé', created_at: '2026-03-05T09:15:00.000Z' },
  { id: '4', batch_number: 'DEC-2026-99201', waste_type: 'Flacons cassés', quantity: 12, unit: 'Kg', current_location: 'Local Déchets A2', status: 'En contrôle', created_at: '2026-03-18T16:00:00.000Z' },
  { id: '5', batch_number: 'DEC-2026-44021', waste_type: 'Emballages souillés', quantity: 80, unit: 'Kg', current_location: 'Local Déchets A1', status: 'Détruit', created_at: '2026-03-25T11:20:00.000Z' },
]

const WASTE_CATEGORIES_COLORS = ['#E53935', '#FB8C00', '#1E88E5', '#43A047']
const WASTE_STATUS_COLORS = ['#1E88E5', '#FB8C00', '#43A047', '#D81B60', '#E53935']

export default function WasteClient({ 
  initialBatches, 
  destructions = [] 
}: { 
  initialBatches: any[], 
  destructions?: any[] 
}) {
  const batches = initialBatches && initialBatches.length > 0 ? initialBatches : MOCK_WASTE_BATCHES
  const [activeView, setActiveView] = useState<'table' | 'analytics'>('table')
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printDialogItems, setPrintDialogItems] = useState<any[]>([])

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = 
      batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.waste_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch.current_location && batch.current_location.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === "all" || batch.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sélection globale
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredBatches.map(b => b.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id))
    }
  }

  const handleOpenPrintDialog = () => {
    const itemsToPrint = batches.filter(b => selectedIds.includes(b.id))
    if (itemsToPrint.length === 0) {
      toast.error("Veuillez sélectionner au moins un lot de déchet à imprimer.")
      return
    }
    setPrintDialogItems(itemsToPrint)
    setIsPrintDialogOpen(true)
  }

  // Métriques
  const totalWasteWeight = batches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0)
  const plannedDestructionsCount = destructions.filter(d => d.status === 'Planifié' || d.status === 'planifie').length || 7
  const completedDestructionsCount = destructions.filter(d => d.status === 'Exécuté' || d.status === 'execute').length || 23

  const KPIData = [
    { title: "DÉCHETS EN STOCK", value: `${totalWasteWeight} kg`, trend: "+5.2%", isUp: true, icon: Trash2, color: "text-[#E53935]", bg: "bg-[#E53935]/10" },
    { title: "DESTRUCTIONS PLANIFIÉES", value: plannedDestructionsCount, trend: "-2.1%", isUp: false, icon: Clock, color: "text-[#FB8C00]", bg: "bg-[#FB8C00]/10" },
    { title: "DESTRUCTIONS RÉALISÉES", value: completedDestructionsCount, trend: "+18.4%", isUp: true, icon: Flame, color: "text-[#43A047]", bg: "bg-[#43A047]/10" },
    { title: "CAPACITÉ STOCKAGE DÉCHETS", value: `78%`, trend: "+12.0%", isUp: false, icon: ShieldAlert, color: "text-[#1E88E5]", bg: "bg-[#1E88E5]/10" },
  ]

  const wasteByCategory = [
    { name: 'Cytotoxiques', value: 450 },
    { name: 'Infectieux (DASRI)', value: 337 },
    { name: 'Chimiques', value: 225 },
    { name: 'Autres', value: 112 },
  ]

  const wasteByStatus = [
    { name: 'Déclarés', value: batches.filter(b => b.status === 'Déclaré').length || 12 },
    { name: 'En contrôle', value: batches.filter(b => b.status === 'En contrôle').length || 8 },
    { name: 'Validés', value: batches.filter(b => b.status === 'Validé').length || 15 },
    { name: 'En attente destruction', value: batches.filter(b => b.status === 'En attente de destruction').length || 7 },
    { name: 'Détruits', value: batches.filter(b => b.status === 'Détruit').length || 23 },
  ]

  const wasteAlerts = [
    { text: "Capacité de stockage des déchets atteinte à 78%", date: "19/05/2025", type: "warning" },
    { text: "3 lots de déchets dépassent le délai légal de stockage (90j)", date: "19/05/2025", type: "error" },
    { text: "Destruction planifiée le 26/05/2025 (DES-2025-05-0088)", date: "18/05/2025", type: "warning" },
  ]

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* BANDEAU EN-TÊTE PAGE GESTION DES DÉCHETS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Registre des Stocks de Déchets
          </h2>
          <p className="text-muted-foreground text-xs">Suivi, traçabilité et gestion du stock des déchets pharmaceutiques.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* BASCULEUR DE VUE */}
          <div className="bg-muted/60 p-0.5 rounded-lg flex items-center border border-border/50">
            <Button 
              variant={activeView === 'table' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveView('table')}
              className={`h-7 px-2.5 text-xs font-bold gap-1 rounded-md ${activeView === 'table' ? 'bg-red-600 text-white hover:bg-red-700' : 'text-muted-foreground'}`}
            >
              <List className="h-3.5 w-3.5" /> Registre
            </Button>
            <Button 
              variant={activeView === 'analytics' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveView('analytics')}
              className={`h-7 px-2.5 text-xs font-bold gap-1 rounded-md ${activeView === 'analytics' ? 'bg-red-600 text-white hover:bg-red-700' : 'text-muted-foreground'}`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Indicateurs
            </Button>
          </div>

          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-2xs text-xs font-bold gap-1.5 h-8 px-3 border-0" asChild>
            <Link href="/dashboard/waste/new">
              <Plus className="h-3.5 w-3.5" /> Déclarer un déchet
            </Link>
          </Button>
        </div>
      </div>

      {/* CARTES DE SUMMARY KPIS (COMPACTES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {KPIData.map((kpi, index) => (
          <Card key={index} className="shadow-2xs border border-border/70 rounded-xl overflow-hidden bg-card">
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <div className={`p-1.5 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} strokeWidth={2.2} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${kpi.isUp ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                  {kpi.isUp ? '▲' : '▼'} {kpi.trend}
                </span>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-2 mb-0.5">{kpi.title}</p>
              <h2 className="text-xl font-black text-foreground tracking-tight">{kpi.value}</h2>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* VUE 1 : REGISTRE TABLEAU DES STOCKS (VUE PAR DÉFAUT) */}
      {activeView === 'table' ? (
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
          <CardHeader className="p-3 pb-2 border-b border-border/50">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Lots de Déchets en Stock ({filteredBatches.length})
                </CardTitle>
                {selectedIds.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleOpenPrintDialog}
                    className="h-7 text-xs font-bold gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Printer className="h-3.5 w-3.5" /> Étiquettes ({selectedIds.length})
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher lot, type..."
                    className="pl-8 bg-background h-8 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                  <SelectTrigger className="h-8 w-36 text-xs bg-background">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="Déclaré">Déclaré</SelectItem>
                    <SelectItem value="En contrôle">En contrôle</SelectItem>
                    <SelectItem value="Validé">Validé</SelectItem>
                    <SelectItem value="En attente de destruction">En attente destruction</SelectItem>
                    <SelectItem value="Détruit">Détruit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-9 pl-3 py-2">
                      <Checkbox 
                        checked={selectedIds.length === filteredBatches.length && filteredBatches.length > 0} 
                        onCheckedChange={handleSelectAll} 
                      />
                    </TableHead>
                    <TableHead className="py-2 text-[11px] font-bold uppercase">N° Lot Déchet</TableHead>
                    <TableHead className="py-2 text-[11px] font-bold uppercase">Classification</TableHead>
                    <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Quantité</TableHead>
                    <TableHead className="py-2 text-[11px] font-bold uppercase">Localisation</TableHead>
                    <TableHead className="py-2 text-[11px] font-bold uppercase">Statut</TableHead>
                    <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-16 text-center text-xs text-muted-foreground">Aucun lot de déchet trouvé.</TableCell></TableRow>
                  ) : (
                    filteredBatches.slice(0, 5).map((batch) => (
                      <TableRow key={batch.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="pl-3 py-2">
                          <Checkbox 
                            checked={selectedIds.includes(batch.id)} 
                            onCheckedChange={(checked) => handleSelectOne(batch.id, !!checked)} 
                          />
                        </TableCell>
                        <TableCell className="font-bold text-foreground font-mono py-2">{batch.batch_number}</TableCell>
                        <TableCell className="py-2">{batch.waste_type}</TableCell>
                        <TableCell className="py-2 text-right font-bold tabular-nums">{batch.quantity} {batch.unit || 'Kg'}</TableCell>
                        <TableCell className="py-2 text-muted-foreground">{batch.current_location || 'Zone Stockage A'}</TableCell>
                        <TableCell className="py-2">
                          <Badge className={`text-[10px] ${
                            batch.status === 'En attente de destruction' ? 'bg-amber-100 text-amber-800' :
                            batch.status === 'Détruit' ? 'bg-[#1B5C2E]/10 text-[#1B5C2E]' :
                            batch.status === 'Validé' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {batch.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right pr-4">
                          <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2 text-red-600 font-bold hover:bg-red-50">
                            <Link href={`/dashboard/waste/${batch.id}`}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Voir
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* VUE 2 : INDICATEURS & GRAPHIQUES (PAGE COMPACTE SANS SCROLL) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">DÉCHETS PAR CATÉGORIE (KG)</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="flex items-center justify-between h-[130px]">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={wasteByCategory} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
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
                    <div key={idx} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: WASTE_CATEGORIES_COLORS[idx] }}></span>
                        <span className="text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <span className="font-bold text-foreground ml-1">{item.value} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">STATUT DU STOCK DÉCHETS</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="flex items-center justify-between h-[130px]">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={wasteByStatus} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
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
            </CardContent>
          </Card>

          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ALERTES DÉCHETS (PSQIF)</CardTitle>
              <Link href="/dashboard/alerts" className="text-[10px] font-semibold text-[#E53935] hover:underline">Voir tout</Link>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1.5">
              {wasteAlerts.map((al, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px] gap-2 pb-1 border-b border-border/30 last:border-0 last:pb-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <div className={`p-0.5 rounded-md shrink-0 ${al.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      <AlertTriangle className="h-3 w-3" />
                    </div>
                    <span className="font-medium text-foreground truncate">{al.text}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0">{al.date}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <LabelPrintDialog 
        isOpen={isPrintDialogOpen}
        onClose={() => {
          setIsPrintDialogOpen(false)
          setPrintDialogItems([])
          setSelectedIds([])
        }}
        type="waste"
        items={printDialogItems}
      />
    </div>
  )
}
