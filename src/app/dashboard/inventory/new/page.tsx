"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, ClipboardCheck, Info } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/utils/supabase/client'

const formSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  inventory_type: z.enum(['Annuel', 'Périodique']),
})

type FormValues = z.infer<typeof formSchema>

export default function NewInventoryPage() {
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `Inventaire ${new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`,
      inventory_type: 'Périodique',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true)

    try {
      const nowIso = new Date().toISOString()
      const year = new Date().getFullYear()
      const rand = Math.floor(1000 + Math.random() * 9000)
      const invId = `inv-${Date.now()}`
      const invNumber = `INV-ECH-${year}-${rand}`

      // 1. Récupérer tous les échantillons actifs (locaux + Supabase Cloud)
      let deletedIds: string[] = []
      let overrides: Record<string, any> = {}
      const sampleMap = new Map<string, any>()

      try {
        deletedIds = JSON.parse(localStorage.getItem('reception_deleted_ids') || '[]')
        overrides = JSON.parse(localStorage.getItem('local_sample_overrides') || '{}')
        const historyRecords = JSON.parse(localStorage.getItem('reception_history_records') || '[]')

        historyRecords.forEach((rec: any) => {
          if (deletedIds.includes(rec.rec_number) || deletedIds.includes(rec.id)) return
          const rawDetails = localStorage.getItem('reception_draft_details_' + rec.rec_number)
          if (rawDetails) {
            const parsed = JSON.parse(rawDetails)
            if (Array.isArray(parsed.formData?.samples)) {
              parsed.formData.samples.forEach((s: any, idx: number) => {
                if (s.commercial_name && s.commercial_name.trim() !== '') {
                  const sNum = `ECH-${rec.rec_number.replace('REC-', '')}-${idx + 1}`
                  sampleMap.set(sNum, {
                    id: sNum,
                    sample_number: sNum,
                    commercial_name: s.commercial_name.toUpperCase(),
                    dci: (s.dci || s.commercial_name).toUpperCase(),
                    batch_number: (s.batch || 'LOT-TEMP').toUpperCase(),
                    quantity: Number(s.qty) || 1,
                  })
                }
              })
            }
          }
        })
      } catch (e) {}

      try {
        const { data: remoteSamples } = await supabase
          .from('samples')
          .select('*')
          .order('created_at', { ascending: false })

        if (Array.isArray(remoteSamples)) {
          remoteSamples.forEach((s: any) => {
            if (s.reception_ref && deletedIds.includes(s.reception_ref)) return
            if (deletedIds.includes(s.sample_number) || deletedIds.includes(s.id)) return
            const key = s.sample_number || s.id
            sampleMap.set(key, {
              id: s.id || key,
              sample_number: s.sample_number || key,
              commercial_name: (s.commercial_name || 'ÉCHANTILLON').toUpperCase(),
              dci: (s.dci || '').toUpperCase(),
              batch_number: (s.batch_number || 'LOT-TEMP').toUpperCase(),
              quantity: Number(s.quantity) || 1,
            })
          })
        }
      } catch (e) {
        console.warn("Supabase samples fetch notice:", e)
      }

      // Si aucun échantillon trouvé dans samples, vérifier samples_data des réceptions Cloud
      if (sampleMap.size === 0) {
        try {
          const { data: recs } = await supabase.from('receptions').select('*')
          if (Array.isArray(recs)) {
            recs.forEach((r: any) => {
              if (deletedIds.includes(r.rec_number)) return
              const sList = Array.isArray(r.samples_data) ? r.samples_data : []
              sList.forEach((s: any, idx: number) => {
                if (s.commercial_name) {
                  const sNum = `ECH-${r.rec_number.replace('REC-', '')}-${idx + 1}`
                  sampleMap.set(sNum, {
                    id: sNum,
                    sample_number: sNum,
                    commercial_name: s.commercial_name.toUpperCase(),
                    dci: (s.dci || '').toUpperCase(),
                    batch_number: (s.batch || s.batch_number || 'LOT-TEMP').toUpperCase(),
                    quantity: Number(s.qty || s.quantity) || 1,
                  })
                }
              })
            })
          }
        } catch (e) {}
      }

      // Construire les lignes de comptage de l'inventaire
      const items = Array.from(sampleMap.values()).map((s, idx) => {
        const ov = overrides[s.sample_number] || overrides[s.id] || overrides[s.commercial_name]
        const sysQty = ov?.quantity !== undefined ? Number(ov.quantity) : (Number(s.quantity) || 0)
        return {
          id: `item-${invId}-${idx + 1}`,
          system_quantity: sysQty,
          physical_quantity: sysQty,
          discrepancy_reason: null,
          sample: {
            id: s.id,
            commercial_name: s.commercial_name,
            batch_number: s.batch_number,
            sample_number: s.sample_number,
            quantity: sysQty,
            dci: s.dci || '',
          },
        }
      })

      const newInventory = {
        id: invId,
        inv_number: invNumber,
        name: values.name,
        inventory_type: values.inventory_type,
        status: 'En cours',
        created_at: nowIso,
        completed_at: null,
        items,
      }

      // 2. Sauvegarde locale immédiate (0ms)
      try {
        localStorage.removeItem('all_data_wiped')
        const stored = JSON.parse(localStorage.getItem('sample_inventories_custom_v1') || '[]')
        localStorage.setItem('sample_inventories_custom_v1', JSON.stringify([newInventory, ...stored]))
      } catch (e) {}

      // 3. Synchronisation Supabase Cloud (colonnes SQL valides de public.inventories)
      const syncPromise = supabase.from('inventories').upsert({
        id: invId,
        inv_number: invNumber,
        name: values.name,
        date: nowIso,
        location: 'Magasin Central Échantillons',
        inventory_type: values.inventory_type,
        status: 'En cours',
        items_count: items.length,
        controller: 'Marie ADANDE',
        observations: JSON.stringify({ items, completed_at: null }),
        created_at: nowIso,
      }, { onConflict: 'inv_number' })

      await Promise.race([syncPromise, new Promise(r => setTimeout(r, 600))])

      toast.success(`Session "${values.name}" démarrée avec ${items.length} échantillon(s) !`)
      router.push(`/dashboard/inventory/${invId}`)
    } catch (error: any) {
      console.error(error)
      toast.error("Erreur lors de l'initialisation de l'inventaire")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-3xl mx-auto">
      
      {/* BANDEAU EN-TÊTE STATIQUE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-8 w-8 shrink-0 rounded-lg">
            <Link href="/dashboard/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-[#1B5C2E]" />
              Démarrer un Inventaire
            </h2>
            <p className="text-muted-foreground text-[11px]">Initialisation d'une nouvelle session de contrôle physique des stocks.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs px-3" asChild>
            <Link href="/dashboard/inventory">Annuler</Link>
          </Button>
          <Button 
            type="button" 
            size="sm"
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving} 
            className="h-8 text-xs font-bold px-3 bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-2xs gap-1.5 border-0"
          >
            {isSaving ? "Initialisation..." : <><Save className="h-3.5 w-3.5" /> Lancer l'inventaire</>}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardContent className="p-4 space-y-3">
              
              {/* NOM DE L'INVENTAIRE */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-foreground">Nom de l'inventaire</FormLabel>
                    <FormControl>
                      <Input placeholder="" className="h-9 text-xs bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* TYPE D'INVENTAIRE */}
              <FormField
                control={form.control}
                name="inventory_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-foreground">Type d'inventaire</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val || '')} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs bg-background">
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Périodique">Périodique (Mensuel, Trimestriel, etc.)</SelectItem>
                        <SelectItem value="Annuel">Annuel</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* BANDEAU INFORMATIONS */}
              <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-3 text-xs text-blue-900 dark:text-blue-300">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[11.5px]">Rapprochement automatique du stock</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground dark:text-blue-300/80">
                    Au lancement, le système importera <strong>tous les échantillons actifs en stock</strong> dans cette session avec leurs quantités informatiques. Vous pourrez ensuite saisir le comptage physique et valider les écarts.
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  )
}
