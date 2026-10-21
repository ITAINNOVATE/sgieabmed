'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  ArrowLeft, ClipboardCheck, Loader2, Save, 
  CheckCircle2, AlertTriangle, AlertCircle, Eye, ShieldAlert, Edit3 
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/utils/supabase/client'

interface Sample {
  id: string
  commercial_name: string
  batch_number: string
  sample_number: string
  quantity: number
  dci?: string
}

interface InventoryItem {
  id: string
  system_quantity: number
  physical_quantity: number | null
  discrepancy_reason: string | null
  sample: Sample | null
}

interface Inventory {
  id: string
  name: string
  inventory_type: string
  status: string
  created_at: string
  completed_at: string | null
  items: InventoryItem[]
}

const DISCREPANCY_REASONS = [
  "Bris de flacons / casse",
  "Périmé non déclaré",
  "Erreur de saisie à la réception",
  "Échantillon manquant / Perte",
  "Surplus inexpliqué",
  "Autre"
]

const MOCK_INVENTORIES_DETAIL: Record<string, Inventory> = {
  '1': {
    id: '1',
    name: 'Inventaire Global 2026',
    inventory_type: 'Annuel',
    status: 'En cours',
    created_at: '2026-01-15T08:00:00.000Z',
    completed_at: null,
    items: [
      {
        id: 'item-1-1',
        system_quantity: 500,
        physical_quantity: 498,
        discrepancy_reason: 'Bris de flacons / casse',
        sample: {
          id: 'sample-1',
          commercial_name: 'Amoxicilline 500mg',
          batch_number: 'LOT-992A',
          sample_number: 'ECH-001',
          quantity: 500,
          dci: 'Amoxicilline'
        }
      },
      {
        id: 'item-1-2',
        system_quantity: 200,
        physical_quantity: 200,
        discrepancy_reason: null,
        sample: {
          id: 'sample-2',
          commercial_name: 'Ibuprofène 400mg',
          batch_number: 'LOT-112B',
          sample_number: 'ECH-002',
          quantity: 200,
          dci: 'Ibuprofène'
        }
      },
      {
        id: 'item-1-3',
        system_quantity: 150,
        physical_quantity: 145,
        discrepancy_reason: 'Échantillon manquant / Perte',
        sample: {
          id: 'sample-3',
          commercial_name: 'Paracétamol 500mg',
          batch_number: 'LOT-2023-A45',
          sample_number: 'SMP-2024-001',
          quantity: 150,
          dci: 'Paracétamol'
        }
      }
    ]
  },
  '2': {
    id: '2',
    name: 'Inventaire Trimestriel Q1',
    inventory_type: 'Trimestriel',
    status: 'Validé',
    created_at: '2026-03-01T09:00:00.000Z',
    completed_at: '2026-03-15T14:30:00.000Z',
    items: [
      {
        id: 'item-2-1',
        system_quantity: 300,
        physical_quantity: 300,
        discrepancy_reason: null,
        sample: {
          id: 'sample-4',
          commercial_name: 'Paracétamol 1g',
          batch_number: 'LOT-441D',
          sample_number: 'ECH-004',
          quantity: 300,
          dci: 'Paracétamol'
        }
      },
      {
        id: 'item-2-2',
        system_quantity: 80,
        physical_quantity: 80,
        discrepancy_reason: null,
        sample: {
          id: 'sample-5',
          commercial_name: 'Ciprofloxacine 500mg',
          batch_number: 'LOT-2024-E33',
          sample_number: 'SMP-2024-005',
          quantity: 80,
          dci: 'Ciprofloxacine'
        }
      }
    ]
  }
}

export default function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  
  // Track inputs locally
  const [localItems, setLocalItems] = useState<Record<string, { physical_quantity: number | null, discrepancy_reason: string }>>({})

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchInventory() {
      let invData: any = null

      // 1. Lecture instantanée (0ms) depuis localStorage
      try {
        const stored = localStorage.getItem('sample_inventories_custom_v1')
        if (stored) {
          const list = JSON.parse(stored)
          const found = list.find((i: any) => i.id === resolvedParams.id || i.inv_number === resolvedParams.id)
          if (found) {
            invData = found
          }
        }
      } catch (e) {}

      if (!invData && MOCK_INVENTORIES_DETAIL[resolvedParams.id]) {
        invData = MOCK_INVENTORIES_DETAIL[resolvedParams.id]
      }

      if (invData) {
        setInventory(invData as Inventory)
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
          if (typeof data.observations === 'string' && data.observations.trim().startsWith('{')) {
            try {
              const obs = JSON.parse(data.observations)
              if (Array.isArray(obs.items)) parsedItems = obs.items
              if (obs.completed_at) completedAt = obs.completed_at
            } catch (e) {}
          }
          invData = {
            ...invData,
            id: data.id,
            inv_number: data.inv_number,
            name: data.name || invData?.name || `Inventaire ${data.inv_number}`,
            inventory_type: data.inventory_type || invData?.inventory_type || 'Périodique',
            status: data.status || invData?.status || 'En cours',
            created_at: data.created_at || data.date || invData?.created_at || new Date().toISOString(),
            completed_at: completedAt,
            items: parsedItems,
          }
          setInventory(invData as Inventory)
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
        console.warn("Could not query Supabase for inventory:", err)
      }

      if (!invData) {
        toast.error("Impossible de récupérer les détails de l'inventaire.")
      }
      setLoading(false)
    }

    fetchInventory()
  }, [resolvedParams.id, supabase])

  const handleQtyChange = (itemId: string, val: string) => {
    const num = val === '' ? null : parseInt(val, 10)
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

  const saveDraft = async () => {
    if (!inventory) return
    setIsSaving(true)
    try {
      const updatedItems = buildUpdatedItems()
      const updatedInv = { ...inventory, items: updatedItems }
      setInventory(updatedInv)

      // 1. Sauvegarde locale immédiate
      try {
        const stored = JSON.parse(localStorage.getItem('sample_inventories_custom_v1') || '[]')
        const exists = stored.some((i: any) => i.id === inventory.id)
        const nextList = exists
          ? stored.map((i: any) => (i.id === inventory.id ? updatedInv : i))
          : [updatedInv, ...stored]
        localStorage.setItem('sample_inventories_custom_v1', JSON.stringify(nextList))
      } catch (e) {}

      // 2. Sauvegarde Supabase Cloud
      supabase
        .from('inventories')
        .update({
          items_count: updatedItems.length,
          observations: JSON.stringify({ items: updatedItems, completed_at: inventory.completed_at }),
        })
        .eq('id', inventory.id)
        .then(() => {})

      toast.success("Brouillon d'inventaire sauvegardé avec succès")
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
      toast.error("Veuillez saisir la quantité physique de tous les articles avant de clôturer.")
      return
    }

    if (!window.confirm("Êtes-vous sûr de vouloir clôturer et valider cet inventaire ? Les quantités informatiques en stock seront ajustées en fonction de vos comptages.")) {
      return
    }

    setIsFinalizing(true)
    try {
      const completedAt = new Date().toISOString()
      const updatedItems = buildUpdatedItems()
      const finalizedInv: Inventory = {
        ...inventory,
        status: 'Validé',
        completed_at: completedAt,
        items: updatedItems,
      }

      setInventory(finalizedInv)

      // 1. Mise à jour locale de l'inventaire, des stocks et des mouvements d'ajustement
      const adjustmentMovements: any[] = []
      try {
        const stored = JSON.parse(localStorage.getItem('sample_inventories_custom_v1') || '[]')
        const exists = stored.some((i: any) => i.id === inventory.id)
        const nextList = exists
          ? stored.map((i: any) => (i.id === inventory.id ? finalizedInv : i))
          : [finalizedInv, ...stored]
        localStorage.setItem('sample_inventories_custom_v1', JSON.stringify(nextList))

        const overrides = JSON.parse(localStorage.getItem('local_sample_overrides') || '{}')
        const localMovements = JSON.parse(localStorage.getItem('local_movements_history') || '[]')

        updatedItems.forEach((item, idx) => {
          if (!item.sample) return
          const newQty = item.physical_quantity ?? item.system_quantity
          const diff = newQty - item.system_quantity
          const newStatus = newQty === 0 ? 'Épuisé' : 'Disponible'

          const ov = { quantity: newQty, status: newStatus }
          if (item.sample.id) overrides[item.sample.id] = { ...overrides[item.sample.id], ...ov }
          if (item.sample.sample_number) overrides[item.sample.sample_number] = { ...overrides[item.sample.sample_number], ...ov }
          if (item.sample.commercial_name) overrides[item.sample.commercial_name.toUpperCase()] = { ...overrides[item.sample.commercial_name.toUpperCase()], ...ov }

          if (diff !== 0) {
            const mvt = {
              id: `mvt-inv-${inventory.id}-${idx}`,
              mvt_number: `MVT-INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
              movement_date: completedAt,
              movement_type: "Correction d'inventaire",
              sample_id: String(item.sample.id),
              sample_number: item.sample.sample_number,
              commercial_name: item.sample.commercial_name.toUpperCase(),
              batch_number: item.sample.batch_number,
              quantity: Math.abs(diff),
              source_location: 'Magasin Central Échantillons',
              destination_location: 'Magasin Central Échantillons',
              operator: 'MARIE ADANDE',
              reason: `Ajustement inventaire (${inventory.name}) - ${item.discrepancy_reason || 'Écart physique'}`,
              observations: `Stock SI: ${item.system_quantity}, Comptage physique: ${newQty} (Écart: ${diff > 0 ? '+' : ''}${diff})`,
              status: 'Validé',
              new_quantity: newQty,
              new_status: newStatus,
            }
            adjustmentMovements.push(mvt)
            localMovements.unshift(mvt)
          }
        })

        localStorage.setItem('local_sample_overrides', JSON.stringify(overrides))
        if (adjustmentMovements.length > 0) {
          localStorage.setItem('local_movements_history', JSON.stringify(localMovements))
        }
      } catch (e) {}

      // 2. Synchronisation Supabase Cloud en parallèle
      Promise.all([
        supabase
          .from('inventories')
          .update({
            status: 'Validé',
            items_count: updatedItems.length,
            observations: JSON.stringify({ items: updatedItems, completed_at: completedAt }),
          })
          .eq('id', inventory.id),
        ...updatedItems
          .filter(it => it.sample && it.physical_quantity !== it.system_quantity)
          .map(it =>
            supabase
              .from('samples')
              .update({ quantity: it.physical_quantity ?? 0 })
              .eq('sample_number', it.sample!.sample_number)
          ),
        adjustmentMovements.length > 0
          ? supabase.from('movements').upsert(
              adjustmentMovements.map(m => ({
                mvt_number: m.mvt_number,
                movement_date: m.movement_date,
                movement_type: m.movement_type,
                sample_id: m.sample_id,
                sample_number: m.sample_number,
                commercial_name: m.commercial_name,
                batch_number: m.batch_number,
                quantity: m.quantity,
                source_location: m.source_location,
                destination_location: m.destination_location,
                operator: m.operator,
                reason: m.reason,
                observations: m.observations,
                status: 'Validé',
              })),
              { onConflict: 'mvt_number' }
            )
          : Promise.resolve(),
      ]).catch(err => console.warn("Supabase finalize inventory warning:", err))

      toast.success("Inventaire clôturé et quantités réelles mises à jour avec succès !")
      router.push('/dashboard/inventory')
    } catch (err: any) {
      console.error(err)
      toast.error(`Erreur lors de la clôture : ${err.message}`)
    } finally {
      setIsFinalizing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Chargement des données de l&apos;inventaire...</p>
      </div>
    )
  }

  if (!inventory) {
    return (
      <div className="text-center p-12 max-w-lg mx-auto">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-bold">Inventaire introuvable</h3>
        <p className="text-muted-foreground text-sm mt-2">Cette session d&apos;inventaire n&apos;existe pas ou a été supprimée.</p>
        <Button className="mt-6" asChild>
          <Link href="/dashboard/inventory">Retour à la liste</Link>
        </Button>
      </div>
    )
  }

  const isClosed = inventory.status === 'Validé'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-6xl mx-auto pb-20">
      
      {/* Header Sticky */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm sticky top-20 z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0 rounded-full">
            <Link href="/dashboard/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              {inventory.name}
              <Badge variant={isClosed ? 'default' : 'secondary'} className={isClosed ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100' : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100'}>
                {inventory.status}
              </Badge>
            </h2>
            <p className="text-muted-foreground text-xs">
              Type : {inventory.inventory_type} • Lancé le {new Date(inventory.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
        {!isClosed && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={saveDraft} disabled={isSaving || isFinalizing} className="flex-1 md:flex-initial gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Sauvegarder
            </Button>
            <Button onClick={finalizeInventory} disabled={isSaving || isFinalizing} className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              {isFinalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Valider & Clôturer
            </Button>
          </div>
        )}
      </div>

      {isClosed && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-900 dark:border-emerald-950/40 dark:bg-emerald-950/20 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-semibold">Inventaire clôturé et validé</p>
            <p className="text-xs opacity-90 leading-relaxed mt-1">
              Cette session a été validée le {inventory.completed_at ? new Date(inventory.completed_at).toLocaleString('fr-FR') : '—'}. Les quantités physiques enregistrées ont été synchronisées et des mouvements d&apos;ajustements automatiques ont été créés pour les écarts observés.
            </p>
          </div>
        </div>
      )}

      {/* Main inventory sheet */}
      <Card className="shadow-sm border-border/50 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Fiche de comptage
          </CardTitle>
          <CardDescription>
            {isClosed 
              ? "Historique des écarts et valeurs finales d'inventaire." 
              : "Saisissez les quantités physiquement observées dans l'entrepôt."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Code / Nom</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead className="text-center w-28">Stock SI</TableHead>
                <TableHead className="text-center w-36">Stock Physique</TableHead>
                <TableHead className="text-center w-28">Écart</TableHead>
                <TableHead className="pr-6 min-w-[200px]">Motif de l&apos;écart</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    Aucun article inclus dans cette session.
                  </TableCell>
                </TableRow>
              ) : (
                inventory.items.map((item) => {
                  const sample = item.sample
                  if (!sample) return null

                  const localVal = localItems[item.id]
                  const currentPhys = isClosed ? item.physical_quantity : localVal?.physical_quantity
                  const currentReason = isClosed ? item.discrepancy_reason : localVal?.discrepancy_reason

                  const diff = currentPhys !== null ? (currentPhys - item.system_quantity) : null
                  const isDiff = diff !== null && diff !== 0

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                      {/* Name / Ref */}
                      <TableCell className="pl-6">
                        <div className="font-semibold text-sm">{sample.commercial_name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{sample.sample_number} — {sample.dci || 'DCI'}</div>
                      </TableCell>

                      {/* Batch */}
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {sample.batch_number}
                        </Badge>
                      </TableCell>

                      {/* System Qty */}
                      <TableCell className="text-center font-medium">
                        {item.system_quantity}
                      </TableCell>

                      {/* Physical Qty input / display */}
                      <TableCell className="text-center">
                        {isClosed ? (
                          <span className="font-bold text-sm">{currentPhys}</span>
                        ) : (
                          <div className="flex justify-center">
                            <Input
                              type="number"
                              min={0}
                              className="w-24 text-center h-8 font-bold"
                              value={currentPhys === null ? '' : currentPhys}
                              onChange={(e) => handleQtyChange(item.id, e.target.value)}
                              placeholder="Non saisi"
                            />
                          </div>
                        )}
                      </TableCell>

                      {/* Difference */}
                      <TableCell className="text-center">
                        {diff === null ? (
                          <span className="text-xs text-muted-foreground italic">En attente</span>
                        ) : diff === 0 ? (
                          <span className="text-sm font-semibold text-emerald-600">0</span>
                        ) : (
                          <span className={`text-sm font-bold ${diff > 0 ? 'text-blue-600' : 'text-destructive'}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </TableCell>

                      {/* Reason */}
                      <TableCell className="pr-6">
                        {isClosed ? (
                          <span className="text-sm text-muted-foreground">{currentReason || '—'}</span>
                        ) : (
                          isDiff ? (
                            <Select 
                              value={currentReason} 
                              onValueChange={(val) => handleReasonChange(item.id, val || '')}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Raison de l'écart..." />
                              </SelectTrigger>
                              <SelectContent>
                                {DISCREPANCY_REASONS.map((r) => (
                                  <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Pas d&apos;écart</span>
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
    </div>
  )
}
