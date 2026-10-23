'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  ArrowLeft, ClipboardCheck, Loader2, Save, 
  CheckCircle2, AlertTriangle, AlertCircle, Eye, ShieldAlert, Edit3,
  Printer, Scale, MapPin, Box, Trash2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/utils/supabase/client'
import { exportWasteInventoryReportPDF } from '@/utils/exportUtils'

interface WasteInventoryItem {
  id: string
  waste_batch_id?: string
  batch_number: string
  commercial_name: string
  waste_type: string
  packaging?: string
  current_location?: string
  system_quantity: number
  physical_quantity: number | null
  unit?: string
  discrepancy_reason: string | null
}

interface WasteInventory {
  id: string
  inv_number: string
  name: string
  inventory_type: string
  location: string
  status: string
  created_at: string
  date?: string
  completed_at: string | null
  system_weight: number
  physical_weight: number
  diff: number
  items_count: number
  controller?: string
  observations?: string
  items: WasteInventoryItem[]
}

const DISCREPANCY_REASONS = [
  "Évaporation / séchage naturel",
  "Fuite / casse de flacon ou fût",
  "Erreur de pesée initiale à la réception",
  "Lot ou contenant manquant / perte",
  "Surplus inexpliqué",
  "Absorption d'humidité",
  "Autre"
]

export default function WasteInventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [inventory, setInventory] = useState<WasteInventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [observations, setObservations] = useState('')
  
  // Track inputs locally
  const [localItems, setLocalItems] = useState<Record<string, { physical_quantity: number | null, discrepancy_reason: string }>>({})

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchInventory() {
      let invData: any = null

      // 1. Lecture instantanée depuis localStorage
      try {
        const stored = localStorage.getItem('waste_inventories_custom_v1')
        if (stored) {
          const list = JSON.parse(stored)
          const found = list.find((i: any) => i.id === resolvedParams.id || i.inv_number === resolvedParams.id)
          if (found) {
            invData = found
          }
        }
      } catch (e) {}

      if (invData) {
        setInventory(invData as WasteInventory)
        setObservations(invData.observations || '')
        const initialLocal: Record<string, { physical_quantity: number | null, discrepancy_reason: string }> = {}
        ;(invData.items || []).forEach((item: any) => {
          initialLocal[item.id] = {
            physical_quantity: item.physical_quantity !== undefined ? item.physical_quantity : item.system_quantity,
            discrepancy_reason: item.discrepancy_reason || ''
          }
        })
        setLocalItems(initialLocal)
        setLoading(false)
      }

      // 2. Lecture depuis Supabase Cloud (public.inventories)
      try {
        const { data } = await supabase
          .from('inventories')
          .select('*')
          .or(`id.eq.${resolvedParams.id},inv_number.eq.${resolvedParams.id}`)
          .maybeSingle()

        if (data) {
          let parsedItems: any[] = invData?.items || []
          let completedAt: string | null = invData?.completed_at || null
          let notes: string = invData?.observations || ''

          if (typeof data.observations === 'string' && data.observations.trim().startsWith('{')) {
            try {
              const obs = JSON.parse(data.observations)
              if (Array.isArray(obs.items)) parsedItems = obs.items
              if (obs.completed_at) completedAt = obs.completed_at
              if (obs.notes) notes = obs.notes
            } catch (e) {}
          } else if (typeof data.observations === 'string') {
            notes = data.observations
          }

          invData = {
            ...invData,
            id: data.id,
            inv_number: data.inv_number || invData?.inv_number || resolvedParams.id,
            name: data.name || invData?.name || `Inventaire Déchets ${data.inv_number}`,
            inventory_type: data.inventory_type || invData?.inventory_type || 'Périodique',
            location: data.location || invData?.location || 'MAGASIN DES DECHETS',
            status: data.status || invData?.status || 'En cours',
            created_at: data.created_at || data.date || invData?.created_at || new Date().toISOString(),
            date: data.date || invData?.date || new Date().toISOString(),
            completed_at: completedAt,
            system_weight: Number(data.system_weight) || invData?.system_weight || 0,
            physical_weight: Number(data.physical_weight) || invData?.physical_weight || 0,
            diff: Number(data.diff) || invData?.diff || 0,
            items_count: Number(data.items_count) || parsedItems.length,
            controller: data.controller || invData?.controller || 'Marie ADANDE',
            observations: notes,
            items: parsedItems,
          }

          setInventory(invData as WasteInventory)
          setObservations(notes)
          const initialLocal: Record<string, { physical_quantity: number | null, discrepancy_reason: string }> = {}
          ;(invData.items || []).forEach((item: any) => {
            initialLocal[item.id] = {
              physical_quantity: item.physical_quantity !== undefined ? item.physical_quantity : item.system_quantity,
              discrepancy_reason: item.discrepancy_reason || ''
            }
          })
          setLocalItems(initialLocal)
        }
      } catch (err: any) {
        console.warn("Could not query Supabase for waste inventory:", err)
      }

      if (!invData) {
        toast.error("Impossible de récupérer les détails de l'inventaire déchet.")
      }
      setLoading(false)
    }

    fetchInventory()
  }, [resolvedParams.id, supabase])

  const handleQtyChange = (itemId: string, val: string) => {
    const num = val === '' ? null : parseFloat(val)
    setLocalItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        physical_quantity: isNaN(num as any) ? null : num
      }
    }))
  }

  const handleReasonChange = (itemId: string, val: string) => {
    setLocalItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        discrepancy_reason: val
      }
    }))
  }

  const buildUpdatedItems = () => {
    return (inventory?.items || []).map((item) => {
      const localVal = localItems[item.id]
      const phys = localVal !== undefined ? localVal.physical_quantity : item.physical_quantity
      const isDiff = phys !== null && phys !== item.system_quantity
      return {
        ...item,
        physical_quantity: phys,
        discrepancy_reason: isDiff ? (localVal?.discrepancy_reason || item.discrepancy_reason || 'Autre') : null,
      }
    })
  }

  const calculateTotals = (items: WasteInventoryItem[]) => {
    let sysTotal = 0
    let physTotal = 0
    items.forEach(it => {
      sysTotal += Number(it.system_quantity) || 0
      physTotal += it.physical_quantity !== null ? Number(it.physical_quantity) : (Number(it.system_quantity) || 0)
    })
    sysTotal = Math.round(sysTotal * 100) / 100
    physTotal = Math.round(physTotal * 100) / 100
    const diff = Math.round((physTotal - sysTotal) * 100) / 100
    return { sysTotal, physTotal, diff }
  }

  const saveDraft = async () => {
    if (!inventory) return
    setIsSaving(true)
    try {
      const updatedItems = buildUpdatedItems()
      const { sysTotal, physTotal, diff } = calculateTotals(updatedItems)
      const updatedInv: WasteInventory = {
        ...inventory,
        items: updatedItems,
        system_weight: sysTotal,
        physical_weight: physTotal,
        diff,
        items_count: updatedItems.length,
        observations,
      }
      setInventory(updatedInv)

      // 1. Sauvegarde locale immédiate
      try {
        const stored = JSON.parse(localStorage.getItem('waste_inventories_custom_v1') || '[]')
        const exists = stored.some((i: any) => i.id === inventory.id || i.inv_number === inventory.inv_number)
        const nextList = exists
          ? stored.map((i: any) => (i.id === inventory.id || i.inv_number === inventory.inv_number ? updatedInv : i))
          : [updatedInv, ...stored]
        localStorage.setItem('waste_inventories_custom_v1', JSON.stringify(nextList))
      } catch (e) {}

      // 2. Sauvegarde Supabase Cloud
      supabase
        .from('inventories')
        .update({
          items_count: updatedItems.length,
          system_weight: sysTotal,
          physical_weight: physTotal,
          diff,
          observations: JSON.stringify({ items: updatedItems, completed_at: inventory.completed_at, notes: observations }),
        })
        .or(`id.eq.${inventory.id},inv_number.eq.${inventory.inv_number}`)
        .then(() => {})

      toast.success("Brouillon d'inventaire déchet sauvegardé avec succès")
    } catch (err: any) {
      console.error(err)
      toast.error("Erreur lors de la sauvegarde du brouillon")
    } finally {
      setIsSaving(false)
    }
  }

  const finalizeInventory = async () => {
    if (!inventory) return
    const incomplete = Object.entries(localItems).some(([_, vals]) => vals.physical_quantity === null)
    if (incomplete) {
      toast.error("Veuillez saisir la pesée réelle (Kg) de tous les lots avant de clôturer.")
      return
    }

    if (!window.confirm("Êtes-vous sûr de vouloir clôturer et valider cet inventaire déchet ? Les masses physiques réelles seront enregistrées en stock et les mouvements d'ajustements seront générés.")) {
      return
    }

    setIsFinalizing(true)
    try {
      const completedAt = new Date().toISOString()
      const updatedItems = buildUpdatedItems()
      const { sysTotal, physTotal, diff } = calculateTotals(updatedItems)

      const finalizedInv: WasteInventory = {
        ...inventory,
        status: 'Validé',
        completed_at: completedAt,
        system_weight: sysTotal,
        physical_weight: physTotal,
        diff,
        items_count: updatedItems.length,
        observations,
        items: updatedItems,
      }

      setInventory(finalizedInv)

      // 1. Sauvegarde locale de l'inventaire, des lots déchets et des mouvements d'ajustement
      const adjustmentMovements: any[] = []
      try {
        const stored = JSON.parse(localStorage.getItem('waste_inventories_custom_v1') || '[]')
        const exists = stored.some((i: any) => i.id === inventory.id || i.inv_number === inventory.inv_number)
        const nextList = exists
          ? stored.map((i: any) => (i.id === inventory.id || i.inv_number === inventory.inv_number ? finalizedInv : i))
          : [finalizedInv, ...stored]
        localStorage.setItem('waste_inventories_custom_v1', JSON.stringify(nextList))

        // Mettre à jour les lots de déchets existants avec la nouvelle masse physique
        const storedBatches = JSON.parse(localStorage.getItem('waste_batches_custom_v1') || '[]')
        const localWasteMovements = JSON.parse(localStorage.getItem('waste_movements_custom_v1') || '[]')

        updatedItems.forEach((item, idx) => {
          const newQty = item.physical_quantity ?? item.system_quantity
          const itemDiff = Math.round((newQty - item.system_quantity) * 100) / 100

          // Mettre à jour le lot correspondant dans storedBatches
          const targetBatchIndex = storedBatches.findIndex((b: any) => 
            b.batch_number === item.batch_number || b.id === item.waste_batch_id
          )
          if (targetBatchIndex >= 0) {
            storedBatches[targetBatchIndex].quantity = newQty
          }

          if (itemDiff !== 0) {
            const mvt = {
              id: `mvt-inv-w-${inventory.id}-${idx}`,
              mvt_number: `MVT-INV-W-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
              date: completedAt,
              type: "Correction d'inventaire déchet",
              batch: item.batch_number,
              waste_type: item.waste_type,
              commercial_name: item.commercial_name,
              quantity: `${Math.abs(itemDiff)} Kg`,
              operator: inventory.controller || 'Marie ADANDE',
              origin: item.current_location || inventory.location,
              destination: item.current_location || inventory.location,
              signature_hash: `SIG-INV-${inventory.inv_number || 'VALIDATED'}`,
              observations: `Ajustement inventaire (${inventory.name}) : Stock SI: ${item.system_quantity} Kg, Pesée réelle: ${newQty} Kg (Écart: ${itemDiff > 0 ? '+' : ''}${itemDiff} Kg) - Motif : ${item.discrepancy_reason || 'Écart de pesée contradictoire'}`,
              status: 'Validé',
            }
            adjustmentMovements.push(mvt)
            localWasteMovements.unshift(mvt)
          }
        })

        localStorage.setItem('waste_batches_custom_v1', JSON.stringify(storedBatches))
        if (adjustmentMovements.length > 0) {
          localStorage.setItem('waste_movements_custom_v1', JSON.stringify(localWasteMovements))
        }
      } catch (e) {}

      // 2. Synchronisation Supabase Cloud en arrière-plan
      Promise.all([
        supabase
          .from('inventories')
          .update({
            status: 'Validé',
            system_weight: sysTotal,
            physical_weight: physTotal,
            diff,
            items_count: updatedItems.length,
            observations: JSON.stringify({ items: updatedItems, completed_at: completedAt, notes: observations }),
          })
          .or(`id.eq.${inventory.id},inv_number.eq.${inventory.inv_number}`),
        ...updatedItems
          .filter(it => it.physical_quantity !== it.system_quantity)
          .map(it =>
            supabase
              .from('waste_batches')
              .update({ quantity: it.physical_quantity ?? 0 })
              .eq('batch_number', it.batch_number)
          ),
        adjustmentMovements.length > 0
          ? supabase.from('waste_movements').upsert(
              adjustmentMovements.map(m => ({
                mvt_number: m.mvt_number,
                date: m.date,
                type: m.type,
                batch: m.batch,
                waste_type: m.waste_type,
                commercial_name: m.commercial_name,
                quantity: m.quantity,
                operator: m.operator,
                origin: m.origin,
                destination: m.destination,
                signature_hash: m.signature_hash,
                observations: m.observations,
                status: 'Validé',
              })),
              { onConflict: 'mvt_number' }
            )
          : Promise.resolve(),
      ]).catch(err => console.warn("Supabase finalize waste inventory warning:", err))

      toast.success("Inventaire déchet clôturé et masses réelles mises à jour avec succès !")
      router.push('/dashboard/waste/inventory')
    } catch (err: any) {
      console.error(err)
      toast.error(`Erreur lors de la clôture : ${err.message}`)
    } finally {
      setIsFinalizing(false)
    }
  }

  const handlePrintPDF = () => {
    if (!inventory) return
    const updatedItems = buildUpdatedItems()
    const { sysTotal, physTotal, diff } = calculateTotals(updatedItems)
    exportWasteInventoryReportPDF({
      inv_number: inventory.inv_number,
      name: inventory.name,
      date: inventory.date || inventory.created_at,
      completed_at: inventory.completed_at,
      inventory_type: inventory.inventory_type,
      location: inventory.location,
      status: inventory.status,
      controller: inventory.controller || 'Marie ADANDE',
      system_weight: sysTotal,
      physical_weight: physTotal,
      diff,
      items_count: updatedItems.length,
      observations,
      items: updatedItems,
    })
    toast.success("Génération du procès-verbal d'inventaire déchet...")
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <p className="text-sm font-medium">Chargement des données de l'inventaire déchet...</p>
      </div>
    )
  }

  if (!inventory) {
    return (
      <div className="text-center p-12 max-w-lg mx-auto">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-bold">Session d'inventaire déchet introuvable</h3>
        <p className="text-muted-foreground text-sm mt-2">Cette session d'inventaire n'existe pas ou a été supprimée.</p>
        <Button className="mt-6" asChild>
          <Link href="/dashboard/waste/inventory">Retour à la liste</Link>
        </Button>
      </div>
    )
  }

  const isClosed = inventory.status === 'Validé'
  const currentUpdatedItems = buildUpdatedItems()
  const { sysTotal, physTotal, diff } = calculateTotals(currentUpdatedItems)
  const hasDiscrepancy = currentUpdatedItems.some(it => it.physical_quantity !== null && it.physical_quantity !== it.system_quantity)

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-6xl mx-auto pb-16">
      
      {/* BANDEAU EN-TÊTE STATIQUE & BOUTONS D'ACTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-2xs">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0 rounded-lg">
            <Link href="/dashboard/waste/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Scale className="h-4 w-4 text-red-600" />
                {inventory.name}
              </h2>
              <Badge 
                className={`text-[10px] font-bold ${
                  isClosed ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-blue-100 text-blue-800 border-blue-200'
                }`}
              >
                {isClosed ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                {inventory.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Réf : <span className="font-mono font-bold text-foreground">{inventory.inv_number}</span> • Type : {inventory.inventory_type} • Zone : {inventory.location} • Lancé le {new Date(inventory.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrintPDF} 
            className="h-8 text-xs px-3 gap-1.5 border-border/80"
          >
            <Printer className="h-3.5 w-3.5 text-muted-foreground" /> Imprimer le PV
          </Button>

          {!isClosed && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={saveDraft} 
                disabled={isSaving || isFinalizing} 
                className="h-8 text-xs px-3 gap-1.5"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-muted-foreground" />}
                Sauvegarder
              </Button>
              <Button 
                size="sm" 
                onClick={finalizeInventory} 
                disabled={isSaving || isFinalizing} 
                className="h-8 text-xs font-bold px-3 bg-red-600 hover:bg-red-700 text-white shadow-2xs gap-1.5 border-0"
              >
                {isFinalizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Valider & Clôturer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* BANNIÈRE STATUT CLÔTURÉ OU ÉCARTS */}
      {isClosed && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-bold text-[12px]">Inventaire déchet clôturé et certifié conforme</p>
            <p className="text-[11px] opacity-90 leading-relaxed mt-0.5">
              Cette session a été validée le {inventory.completed_at ? new Date(inventory.completed_at).toLocaleString('fr-FR') : '—'} par le responsable du contrôle. Les stocks physiques ont été ajustés et les mouvements contradictoires ont été enregistrés.
            </p>
          </div>
        </div>
      )}

      {!isClosed && hasDiscrepancy && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold text-[12px]">Écarts de pesée détectés</p>
            <p className="text-[11px] opacity-90 leading-relaxed mt-0.5">
              Des différences entre la masse système (SI) et la pesée physique réelle ont été relevées. Veuillez sélectionner un motif explicatif pour chaque lot en écart avant la clôture définitive.
            </p>
          </div>
        </div>
      )}

      {/* SYNTHÈSE DES MASSES & KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600"><Box className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Lots / Fûts Contrôlés</p>
              <h3 className="text-xl font-black text-foreground">{inventory.items.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground"><Scale className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Masse Système (SI)</p>
              <h3 className="text-xl font-black text-foreground">{sysTotal} Kg</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><Scale className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Masse Physique Pesée</p>
              <h3 className="text-xl font-black text-foreground">{physTotal} Kg</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${diff === 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Écart Global Pesé</p>
              <h3 className={`text-xl font-black ${diff === 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {diff > 0 ? `+${diff}` : diff} Kg
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FEUILLE DE COMPTAGE & PESÉE CONTRADICTOIRE */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ClipboardCheck className="h-3.5 w-3.5 text-red-600" /> Feuille de Comptage et Pesée Contradictoire
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                {isClosed 
                  ? "Valeurs certifiées de l'inventaire physique des déchets et motifs d'écarts." 
                  : "Saisissez la masse pesée réelle (Kg) pour chaque lot de déchet dans le local."}
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground">{inventory.items.length} ligne(s)</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="py-2 text-[11px] font-bold uppercase pl-4">N° Lot Déchet</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Désignation Commerciale / Déchet</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Conditionnement</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Masse SI (Kg)</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-center w-36">Pesée Réelle (Kg)</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right w-28">Écart (Kg)</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase pr-4 min-w-[200px]">Motif de l'Écart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground font-medium">
                      Aucun lot de déchet inclus dans cette session.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.items.map((item) => {
                    const localVal = localItems[item.id]
                    const currentPhys = isClosed ? item.physical_quantity : (localVal?.physical_quantity !== undefined ? localVal.physical_quantity : item.physical_quantity)
                    const currentReason = isClosed ? item.discrepancy_reason : (localVal?.discrepancy_reason || item.discrepancy_reason || '')

                    const itemDiff = currentPhys !== null ? Math.round((currentPhys - item.system_quantity) * 100) / 100 : null
                    const isDiff = itemDiff !== null && itemDiff !== 0

                    return (
                      <TableRow key={item.id} className="text-xs hover:bg-muted/30">
                        {/* N° LOT */}
                        <TableCell className="pl-4 py-2 font-mono font-bold text-foreground">
                          {item.batch_number}
                        </TableCell>

                        {/* DESCRIPTION */}
                        <TableCell className="py-2">
                          <div className="font-semibold text-foreground">{item.commercial_name}</div>
                          <div className="text-[10px] text-muted-foreground">{item.waste_type}</div>
                        </TableCell>

                        {/* PACKAGING & EMPLACEMENT */}
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[10px] bg-background">
                            {item.packaging || 'Fût PEHD'}
                          </Badge>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{item.current_location || inventory.location}</div>
                        </TableCell>

                        {/* MASSE SYSTEME */}
                        <TableCell className="py-2 text-right font-medium tabular-nums">
                          {item.system_quantity} Kg
                        </TableCell>

                        {/* MASSE PHYSIQUE REELLE */}
                        <TableCell className="py-2 text-center">
                          {isClosed ? (
                            <span className="font-bold text-xs tabular-nums text-foreground">{currentPhys} Kg</span>
                          ) : (
                            <div className="flex justify-center">
                              <Input
                                type="number"
                                step="0.1"
                                min={0}
                                className="w-24 text-center h-7 text-xs font-bold bg-background"
                                value={currentPhys === null ? '' : currentPhys}
                                onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                placeholder="Pesée"
                              />
                            </div>
                          )}
                        </TableCell>

                        {/* ECART */}
                        <TableCell className="py-2 text-right tabular-nums">
                          {itemDiff === null ? (
                            <span className="text-[11px] text-muted-foreground italic">En attente</span>
                          ) : itemDiff === 0 ? (
                            <span className="text-xs font-semibold text-emerald-700">0 Kg</span>
                          ) : (
                            <span className={`text-xs font-bold ${itemDiff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {itemDiff > 0 ? `+${itemDiff}` : itemDiff} Kg
                            </span>
                          )}
                        </TableCell>

                        {/* MOTIF DE L'ECART */}
                        <TableCell className="pr-4 py-2">
                          {isClosed ? (
                            <span className="text-xs text-muted-foreground">{currentReason || '—'}</span>
                          ) : (
                            isDiff ? (
                              <Select 
                                value={currentReason} 
                                onValueChange={(val) => handleReasonChange(item.id, val || '')}
                              >
                                <SelectTrigger className="h-7 text-xs bg-background">
                                  <SelectValue placeholder="Motif de l'écart..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {DISCREPANCY_REASONS.map((r) => (
                                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">Pas d'écart</span>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* OBSERVATIONS D'AUDIT */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
        <CardContent className="p-3.5 space-y-2">
          <label className="text-xs font-bold text-foreground block">
            Observations & Constats d'audit du local déchet
          </label>
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            disabled={isClosed}
            placeholder="Préciser l'état général des fûts, bacs de rétention, propreté, présence d'étiquetage ou toute remarque..."
            className="text-xs min-h-[70px] bg-background resize-none"
          />
        </CardContent>
      </Card>

    </div>
  )
}
