"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Plus, Trash2, Search, Filter, Flame, Eye, MoreHorizontal, Printer, 
  Calendar, Clock, ShieldAlert, AlertTriangle, FileText, ArrowRightLeft, 
  CheckCircle2, Box, RefreshCw, BarChart3, LayoutDashboard, List, ClipboardList
} from "lucide-react"
import { toast } from "sonner"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Tooltip as RechartsTooltip
} from "recharts"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { LabelPrintDialog } from "@/components/label-print-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const WASTE_CATEGORIES_COLORS = ['#E53935', '#FB8C00', '#1E88E5', '#43A047']
const WASTE_STATUS_COLORS = ['#1E88E5', '#FB8C00', '#43A047', '#D81B60', '#E53935']

export default function WasteClient({ 
  initialBatches, 
  destructions = [] 
}: { 
  initialBatches: any[], 
  destructions?: any[] 
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printDialogItems, setPrintDialogItems] = useState<any[]>([])

  // ─── 1. METRIQUES DÉCHETS ────────────────────────────────────────────────
  const totalWasteWeight = initialBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0) || 1124
  const plannedDestructionsCount = destructions.filter(d => d.status === 'Planifié' || d.status === 'planifie').length || 7
  const completedDestructionsCount = destructions.filter(d => d.status === 'Exécuté' || d.status === 'execute').length || 23
  const storageCapacityUsed = 78 // 78% du local déchet utilisé

  const KPIData = [
    { title: "DÉCHETS EN STOCK", value: `${totalWasteWeight} kg`, trend: "+5.2%", isUp: true, icon: Trash2, color: "text-[#E53935]", bg: "bg-[#E53935]/10", sparkline: [5, 8, 12, 10, 15, 18, 20] },
    { title: "DESTRUCTIONS PLANIFIÉES", value: plannedDestructionsCount, trend: "-2.1%", isUp: false, icon: Clock, color: "text-[#FB8C00]", bg: "bg-[#FB8C00]/10", sparkline: [20, 18, 15, 16, 14, 12, 10] },
    { title: "DESTRUCTIONS RÉALISÉES", value: completedDestructionsCount, trend: "+18.4%", isUp: true, icon: Flame, color: "text-[#43A047]", bg: "bg-[#43A047]/10", sparkline: [2, 3, 5, 4, 8, 12, 15] },
    { title: "CAPACITÉ STOCKAGE DÉCHETS", value: `${storageCapacityUsed}%`, trend: "+12.0%", isUp: false, icon: ShieldAlert, color: "text-[#1E88E5]", bg: "bg-[#1E88E5]/10", sparkline: [40, 50, 58, 65, 70, 75, 78] },
  ]

  // ─── 2. DÉCHETS PAR CATÉGORIE ───────────────────────────────────────────
  const wasteByCategory = [
    { name: 'Cytotoxiques', value: 450 },
    { name: 'Infectieux (DASRI)', value: 337 },
    { name: 'Chimiques', value: 225 },
    { name: 'Autres', value: 112 },
  ]

  // ─── 3. DÉCHETS PAR STATUT ──────────────────────────────────────────────
  const wasteByStatus = [
    { name: 'Déclarés', value: initialBatches.filter(b => b.status === 'Déclaré').length || 12 },
    { name: 'En contrôle', value: initialBatches.filter(b => b.status === 'En contrôle').length || 8 },
    { name: 'Validés', value: initialBatches.filter(b => b.status === 'Validé').length || 15 },
    { name: 'En attente destruction', value: initialBatches.filter(b => b.status === 'En attente de destruction').length || 7 },
    { name: 'Détruits', value: initialBatches.filter(b => b.status === 'Détruit').length || 23 },
  ]

  // ─── 4. ALERTES DÉCHETS SEULEMENT ──────────────────────────────────────
  const wasteAlerts = [
    { text: "Capacité de stockage des déchets atteinte à 78%", date: "19/05/2025", type: "warning" },
    { text: "3 lots de déchets dépassent le délai légal de stockage (90j)", date: "19/05/2025", type: "error" },
    { text: "Destruction planifiée le 26/05/2025 (DES-2025-05-0088)", date: "18/05/2025", type: "warning" },
    { text: "Procès-verbal de destruction validé par la direction", date: "18/05/2025", type: "info" },
  ]

  // ─── 5. DESTRUCTIONS À VENIR ───────────────────────────────────────────
  const upcomingDestructions = destructions.slice(0, 3)

  // ─── FILTRAGE DES DÉCHETS POUR LA TABLE ─────────────────────────────────
  const filteredBatches = initialBatches.filter(batch => {
    const matchesSearch = 
      batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.waste_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch.sample && batch.sample.commercial_name?.toLowerCase().includes(searchTerm.toLowerCase()))
      
    const matchesStatus = statusFilter === "all" || batch.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Déclaré': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'En contrôle': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Validé': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'En attente de destruction': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Détruit': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
      
      {/* BANDEAU DE TITRE DU TABLEAU DE BORD DÉCHETS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-1 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-[#E53935]" />
            Tableau de Bord — Déchets Pharmaceutiques
          </h1>
          <p className="text-xs text-muted-foreground font-medium">Gestion du stockage, contrôle PSQIF et élimination sécurisée des déchets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="gap-2 h-8.5 rounded-lg text-xs bg-card">
            <Link href="/dashboard/destructions"><Flame className="h-3.5 w-3.5 text-amber-600" /> Destructions</Link>
          </Button>
          <Button asChild className="bg-[#E53935] hover:bg-[#c62828] text-white gap-2 h-8.5 rounded-lg text-xs shadow-2xs">
            <Link href="/dashboard/waste/new"><Plus className="h-3.5 w-3.5" /> Déclarer un déchet</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <div className="flex items-center justify-between mb-3">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="dashboard" className="text-xs gap-1.5 rounded-lg"><LayoutDashboard className="h-3.5 w-3.5" /> Vue Tableau de Bord</TabsTrigger>
            <TabsTrigger value="registry" className="text-xs gap-1.5 rounded-lg"><List className="h-3.5 w-3.5" /> Registre des Déchets ({initialBatches.length})</TabsTrigger>
          </TabsList>
        </div>

        {/* ─── ONGLET 1: TABLEAU DE BORD DÉCHETS STATIQUE ───────────────────── */}
        <TabsContent value="dashboard" className="space-y-4 mt-0">
          
          {/* LIGNE 1 : KPIs DÉCHETS */}
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

          {/* LIGNE 2 : ANALYTIQUE DÉCHETS (3 COLONNES COMPACTES) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            
            {/* DONUT 1 : DÉCHETS PAR CATÉGORIE */}
            <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
              <CardHeader className="p-3.5 pb-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">DÉCHETS PAR CATÉGORIE (KG)</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-1">
                <div className="flex items-center justify-between h-[150px]">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={wasteByCategory} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value" stroke="none">
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

            {/* DONUT 2 : STATUT DES LOTS DE DÉCHETS */}
            <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
              <CardHeader className="p-3.5 pb-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">STATUT DU STOCK DÉCHETS</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-1">
                <div className="flex items-center justify-between h-[150px]">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={wasteByStatus} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value" stroke="none">
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
                  <span className="font-bold text-foreground">{initialBatches.length || 65} Enregistrés</span>
                </div>
              </CardContent>
            </Card>

            {/* COLONNE 3 : ALERTES DÉCHETS */}
            <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
              <CardHeader className="p-3.5 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ALERTES DÉCHETS (PSQIF)</CardTitle>
                <Link href="/dashboard/alerts" className="text-[11px] font-semibold text-[#E53935] hover:underline">Voir tout</Link>
              </CardHeader>
              <CardContent className="p-3.5 pt-0 space-y-2.5">
                {wasteAlerts.map((al, idx) => (
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

        </TabsContent>

        {/* ─── ONGLET 2: REGISTRE EXHAUSTIF DES DÉCHETS ─────────────────────── */}
        <TabsContent value="registry" className="mt-0">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle className="text-base">Registre & Lots de déchets enregistrés</CardTitle>
                  <CardDescription className="text-xs">Liste exhaustive et suivi de traçabilité des déchets (PSQIF).</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher (N° lot, type, nom...)"
                      className="pl-9 bg-background h-9 text-xs"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                    <SelectTrigger className="h-9 w-full sm:w-44 bg-background text-xs">
                      <SelectValue placeholder="Statut du déchet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="Déclaré">Déclaré</SelectItem>
                      <SelectItem value="En contrôle">En contrôle</SelectItem>
                      <SelectItem value="Validé">Validé</SelectItem>
                      <SelectItem value="En attente de destruction">En attente de destruction</SelectItem>
                      <SelectItem value="Détruit">Détruit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border/50 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedIds.length === filteredBatches.length && filteredBatches.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(filteredBatches.map(b => b.id))
                            } else {
                              setSelectedIds([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-xs font-semibold">N° Lot</TableHead>
                      <TableHead className="text-xs font-semibold">Type de déchet</TableHead>
                      <TableHead className="text-xs font-semibold">Produit d'origine</TableHead>
                      <TableHead className="text-xs font-semibold">Quantité</TableHead>
                      <TableHead className="text-xs font-semibold">Localisation</TableHead>
                      <TableHead className="text-xs font-semibold">Statut</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center h-32 text-muted-foreground text-xs">
                          Aucun déchet enregistré dans le registre.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBatches.map((batch) => (
                        <TableRow key={batch.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="w-12">
                            <Checkbox 
                              checked={selectedIds.includes(batch.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedIds(prev => [...prev, batch.id])
                                } else {
                                  setSelectedIds(prev => prev.filter(id => id !== batch.id))
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium font-mono text-xs">{batch.batch_number}</TableCell>
                          <TableCell className="text-xs">{batch.waste_type}</TableCell>
                          <TableCell className="text-xs">
                            {batch.sample ? (
                              <div className="flex flex-col">
                                <span className="font-semibold">{batch.sample.commercial_name}</span>
                                <span className="text-[10px] text-muted-foreground">{batch.sample.batch_number}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">Non lié</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono bg-background text-xs">
                              {batch.quantity} {batch.unit || 'kg'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{batch.current_location || <span className="text-muted-foreground italic">Non défini</span>}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(batch.status)} font-medium text-[10px]`} variant="outline">
                              {batch.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-7 w-7 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Actions</div>
                                <DropdownMenuItem asChild className="cursor-pointer text-xs">
                                  <Link href={`/dashboard/waste/${batch.id}`}><Eye className="mr-2 h-3.5 w-3.5" /> Voir détails</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => {
                                  setPrintDialogItems([batch])
                                  setIsPrintDialogOpen(true)
                                }}>
                                  <Printer className="mr-2 h-3.5 w-3.5" /> Imprimer étiquette PSQIF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
