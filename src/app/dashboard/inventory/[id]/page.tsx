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
      try {
        const { data, error } = await supabase
          .from('inventories')
          .select(`
            *,
            items:inventory_items (
              id,
              system_quantity,
              physical_quantity,
              discrepancy_reason,
              sample:samples ( id, commercial_name, batch_number, sample_number, quantity, dci )
            )
          `)
          .eq('id', resolvedParams.id)
          .single()

        if (error) throw error

        if (data) {
          setInventory(data as Inventory)
          // Initialize local state
          const initialLocal: Record<string, { physical_quantity: number | null, discrepancy_reason: string }> = {}
          data.items.forEach((item: any) => {
            initialLocal[item.id] = {
              physical_quantity: item.physical_quantity,
              discrepancy_reason: item.discrepancy_reason || ''
            }
          })
          setLocalItems(initialLocal)
        }
      } catch (err: any) {
        console.error(err)
        toast.error("Impossible de récupérer les détails de l'inventaire.")
      } finally {
        setLoading(false)
      }
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

  const saveDraft = async () => {
    setIsSaving(true)
    try {
      const updates = Object.entries(localItems).map(([id, values]) => {
        return supabase
          .from('inventory_items')
          .update({
            physical_quantity: values.physical_quantity,
            discrepancy_reason: values.physical_quantity !== null && values.physical_quantity !== (inventory?.items.find(i => i.id === id)?.system_quantity) ? (values.discrepancy_reason || 'Autre') : null
          })
          .eq('id', id)
      })

      await Promise.all(updates)
      toast.success("Brouillon d'inventaire sauvegardé avec succès")
    } catch (err: any) {
      console.error(err)
      toast.error("Erreur lors de la sauvegarde du brouillon")
    } finally {
      setIsSaving(false)
    }
  }

  const finalizeInventory = async () => {
    // 1. Validate that all items have physical quantities entered
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
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      // 2. Save current state first
      const updates = Object.entries(localItems).map(([id, values]) => {
        const item = inventory?.items.find(i => i.id === id)
        const isDiscrepancy = values.physical_quantity !== item?.system_quantity
        return supabase
          .from('inventory_items')
          .update({
            physical_quantity: values.physical_quantity,
            discrepancy_reason: isDiscrepancy ? (values.discrepancy_reason || 'Autre') : null,
            verified_by: userId,
            verified_at: new Date().toISOString()
          })
          .eq('id', id)
      })
      await Promise.all(updates)

      // 3. Update active inventory status
      const { error: invUpdateErr } = await supabase
        .from('inventories')
        .update({
          status: 'Validé',
          completed_at: new Date().toISOString()
        })
        .eq('id', resolvedParams.id)

      if (invUpdateErr) throw invUpdateErr

      // 4. Update the sample quantities in the samples table
      const sampleUpdates = Object.entries(localItems).map(async ([id, values]) => {
        const item = inventory?.items.find(i => i.id === id)
        if (!item || !item.sample) return

        const newQty = values.physical_quantity ?? 0
        const diff = newQty - item.system_quantity

        // Update sample quantity
        const { error: sampleErr } = await supabase
          .from('samples')
          .update({ quantity: newQty, status: newQty === 0 ? 'Utilisé' : (item.sample.quantity === 0 && newQty > 0 ? 'Disponible' : undefined) })
          .eq('id', item.sample.id)
        
        if (sampleErr) throw sampleErr

        // Create adjustment movements if discrepancies exist
        if (diff !== 0) {
          await supabase.from('movements').insert({
            sample_id: item.sample.id,
            user_id: userId,
            movement_type: 'Réaffectation', // We use Réaffectation or adjustment type
            quantity: Math.abs(diff),
            reason: `Ajustement inventaire - ${values.discrepancy_reason || 'Écart physique'}`,
            observations: `Ancien stock SI: ${item.system_quantity}, comptage: ${newQty}. Écart: ${diff > 0 ? '+' : ''}${diff}`
          })
        }
      })
      await Promise.all(sampleUpdates)

      // 5. Create Audit Log
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'Modification',
        entity_type: 'inventories',
        entity_id: resolvedParams.id,
        details: { action: 'Clôture inventaire', name: inventory?.name }
      })

      toast.success("Inventaire clôturé et quantités réelles mises à jour avec succès !")
      router.push('/dashboard/inventory')
      router.refresh()
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
        </CardContent>
      </Card>
    </div>
  )
}
