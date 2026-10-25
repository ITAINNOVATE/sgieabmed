"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { 
  Plus, Trash2, Search, Filter, Eye, Printer, 
  AlertTriangle, ArrowLeftRight, 
  CheckCircle2, Box, LayoutDashboard, List, FileText, Download
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
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { exportWasteReceptionSlipPDF } from "@/utils/exportUtils"
import "@/utils/waste-locations"

const MOCK_WASTE_BATCHES: any[] = []

const WASTE_CATEGORIES_COLORS = ['#E53935', '#FB8C00', '#1E88E5', '#43A047']
const WASTE_STATUS_COLORS = ['#1E88E5', '#FB8C00', '#43A047', '#D81B60', '#E53935']

export default function WasteClient({ 
  initialBatches, 
  destructions = [] 
}: { 
  initialBatches: any[], 
  destructions?: any[] 
}) {
  const [batches, setBatches] = useState<any[]>(() => {
    return initialBatches && initialBatches.length > 0 ? initialBatches : []
  })
  const hasLoadedOnceRef = useRef(false)

  const fetchBatches = async () => {
    let localBatches: any[] = []
    try {
      const stored = localStorage.getItem('waste_batches_custom_v1')
      if (stored) {
        localBatches = JSON.parse(stored)
        if (!hasLoadedOnceRef.current && localBatches.length > 0) {
          setBatches(localBatches)
          hasLoadedOnceRef.current = true
        }
      }
    } catch (e) {}

    let remoteBatches: any[] = []
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('waste_batches')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        remoteBatches = data
      }
    } catch (err) {
      console.warn("Erreur fetch remote waste_batches:", err)
    }

    const batchMap = new Map<string, any>()
    localBatches.forEach((b: any) => {
      const key = b.batch_number || b.id
      if (key) batchMap.set(key, b)
    })
    remoteBatches.forEach((b: any) => {
      const key = b.batch_number || b.id
      if (key) batchMap.set(key, b)
    })

    hasLoadedOnceRef.current = true
    if (batchMap.size > 0) {
      setBatches(Array.from(batchMap.values()))
    }

    // Auto-synchronisation en lot non-bloquante en arrière-plan
    const unsyncedBatches = localBatches.filter(
      (lb: any) => lb.batch_number && !remoteBatches.some((rb: any) => rb.batch_number === lb.batch_number)
    )
    if (unsyncedBatches.length > 0) {
      const supabase = createClient()
      const payload = unsyncedBatches.map((lb: any) => ({
        batch_number: lb.batch_number,
        reception_number: lb.reception_number || null,
        reception_date: lb.reception_date || null,
        reception_time: lb.reception_time || null,
        delivery_slip_ref: lb.delivery_slip_ref || null,
        recipient_agent: lb.recipient_agent || 'Marie ADANDE',
        source_structure: lb.source_structure || 'Structure Déposante',
        source_type: lb.source_type || 'Officine',
        city: lb.city || 'Cotonou',
        depositor_name: lb.depositor_name || '',
        depositor_phone: lb.depositor_phone || '',
        depositor_id_card: lb.depositor_id_card || '',
        waste_type: lb.waste_type || 'Déchets pharmaceutiques',
        commercial_name: lb.commercial_name || '',
        original_batch: lb.original_batch || '',
        sample_id: lb.sample_id || null,
        quantity: Number(lb.quantity) || 1,
        unit: lb.unit || 'Kg',
        packaging: lb.packaging || 'Carton',
        packaging_condition: lb.packaging_condition || 'Conforme',
        destruction_motive: lb.destruction_motive || 'Péremption',
        current_location: lb.current_location || 'MAGASIN DES DECHETS',
        status: lb.status || 'Déclaré',
        observations: lb.observations || '',
      }))
      supabase.from('waste_batches').upsert(payload, { onConflict: 'batch_number' }).then(() => {})
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [])

  // Synchronisation temps réel automatique pour les déchets
  useRealtimeSync({
    tables: ['waste_batches', 'destruction_plans', 'waste_movements'],
    onSync: fetchBatches,
    pollIntervalMs: 6000,
  })
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
      (batch.source_structure && batch.source_structure.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (batch.depositor_name && batch.depositor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
            <Table className="w-full table-fixed">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-9 px-2 py-2 text-center">
                    <Checkbox 
                      checked={selectedIds.length === filteredBatches.length && filteredBatches.length > 0} 
                      onCheckedChange={handleSelectAll} 
                    />
                  </TableHead>
                  <TableHead className="w-[130px] px-2 py-2 text-[11px] font-bold uppercase">N° Lot Déchet</TableHead>
                  <TableHead className="w-[20%] px-2 py-2 text-[11px] font-bold uppercase">Provenance / Apporteur</TableHead>
                  <TableHead className="w-[24%] px-2 py-2 text-[11px] font-bold uppercase">Classification</TableHead>
                  <TableHead className="w-[75px] px-2 py-2 text-[11px] font-bold uppercase text-right">Quantité</TableHead>
                  <TableHead className="w-[16%] px-2 py-2 text-[11px] font-bold uppercase">Localisation</TableHead>
                  <TableHead className="w-[100px] px-1 py-2 text-[11px] font-bold uppercase text-center">Statut</TableHead>
                  <TableHead className="w-[115px] px-2 py-2 text-[11px] font-bold uppercase text-right pr-3">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-16 text-center text-xs text-muted-foreground">Aucun lot de déchet trouvé.</TableCell></TableRow>
                ) : (
                  filteredBatches.map((batch) => (
                    <TableRow key={batch.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="w-9 px-2 py-2 text-center">
                        <Checkbox 
                          checked={selectedIds.includes(batch.id)} 
                          onCheckedChange={(checked) => handleSelectOne(batch.id, !!checked)} 
                        />
                      </TableCell>
                      <TableCell className="px-2 py-2 font-bold text-foreground font-mono text-[11.5px] truncate" title={batch.batch_number}>
                        {batch.batch_number}
                      </TableCell>
                      <TableCell className="px-2 py-2 min-w-0">
                        {batch.source_structure ? (
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground truncate block" title={batch.source_structure}>
                              {batch.source_structure}
                            </span>
                            {batch.depositor_name && (
                              <span className="block text-[10px] text-muted-foreground truncate" title={`Apporté par : ${batch.depositor_name}`}>
                                Apporté par : {batch.depositor_name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic truncate block">Interne ABMed</span>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-2 min-w-0">
                        <span className="line-clamp-2 leading-tight text-xs text-foreground" title={batch.waste_type}>
                          {batch.waste_type}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-2 text-right font-bold tabular-nums text-xs whitespace-nowrap">
                        {batch.quantity} {batch.unit || 'Kg'}
                      </TableCell>
                      <TableCell className="px-2 py-2 min-w-0">
                        <span className="text-xs text-muted-foreground truncate block font-medium" title={batch.current_location || 'Magasin des Déchets'}>
                          {batch.current_location || 'Magasin des Déchets'}
                        </span>
                      </TableCell>
                      <TableCell className="px-1 py-2 text-center whitespace-nowrap">
                        <Badge 
                          variant="outline"
                          className={`text-[10px] font-semibold px-1.5 py-0.5 border ${
                            batch.status === 'En attente de destruction' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                            batch.status === 'Détruit' ? 'bg-[#1B5C2E]/10 text-[#1B5C2E] border-[#1B5C2E]/30' :
                            batch.status === 'Validé' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 
                            'bg-blue-50 text-blue-800 border-blue-300'
                          }`}
                          title={batch.status}
                        >
                          {batch.status === 'En attente de destruction' ? 'Attente destr.' : batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 py-2 text-right pr-3 min-w-0">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6.5 px-2 text-[10.5px] bg-white hover:bg-[#1B5C2E]/10 text-[#1B5C2E] border-[#1B5C2E]/30 font-bold gap-1 shadow-2xs cursor-pointer"
                            onClick={() => {
                              exportWasteReceptionSlipPDF({
                                reception_number: batch.reception_number || `BORD-${batch.batch_number || "DEC"}`,
                                reception_date: batch.reception_date ? new Date(batch.reception_date).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR"),
                                reception_time: batch.reception_time || "",
                                delivery_slip_ref: batch.delivery_slip_ref || "N/A",
                                recipient_agent: batch.recipient_agent || "Agent ABMed",
                                source_structure: batch.source_structure || "Interne ABMed",
                                source_type: batch.source_type || "Établissement Pharmaceutique",
                                city: batch.city || "Cotonou",
                                depositor_name: batch.depositor_name || "N/A",
                                depositor_phone: batch.depositor_phone || "N/A",
                                depositor_id_card: batch.depositor_id_card || "N/A",
                                general_observations: batch.notes || "Lot réceptionné conformément aux procédures ABMed.",
                                items: [
                                  {
                                    batch_number: batch.batch_number,
                                    waste_type: batch.waste_type || "Médicaments Périmés",
                                    commercial_name: batch.commercial_name || batch.waste_type || "Déchets Pharmaceutiques",
                                    original_batch: batch.original_batch || "-",
                                    quantity: Number(batch.quantity) || 0,
                                    unit: batch.unit || "Kg",
                                    packaging: batch.packaging_type || batch.packaging || "Carton scellé",
                                    location: batch.current_location || "MAGASIN DES DECHETS",
                                    observations: batch.rejection_reason || batch.notes || "Péremption / Non-conformité"
                                  }
                                ]
                              })
                              toast.success(`Attestation ${batch.batch_number} téléchargée (PDF)`)
                            }}
                            title="Télécharger l'attestation de réception des déchets en PDF"
                          >
                            <Download className="h-3 w-3 text-[#1B5C2E]" />
                            PDF
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            asChild 
                            className="h-6.5 px-1.5 text-[10.5px] text-red-600 font-bold hover:bg-red-50"
                            title="Consulter les détails du déchet"
                          >
                            <Link href={`/dashboard/waste/${batch.id}`}>
                              <Eye className="h-3 w-3 mr-0.5" /> Voir
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
                      <Pie data={wasteByCategory} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none" isAnimationActive={false}>
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
                      <Pie data={wasteByStatus} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none" isAnimationActive={false}>
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
