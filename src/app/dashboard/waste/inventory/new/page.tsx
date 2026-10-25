"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, ClipboardCheck, Info, Scale, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/utils/supabase/client'
import { normalizeWasteLocation } from '@/utils/waste-locations'

const formSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  inventory_type: z.enum(['Périodique', 'Annuel', 'Contrôle inopiné / Exceptionnel']),
  location: z.string().min(1, "Veuillez sélectionner un emplacement"),
})

type FormValues = z.infer<typeof formSchema>

export default function NewWasteInventoryPage() {
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `Inventaire Déchets ${new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`,
      inventory_type: 'Périodique',
      location: 'MAGASIN DES DECHETS',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true)

    try {
      const nowIso = new Date().toISOString()
      const year = new Date().getFullYear()
      const rand = Math.floor(1000 + Math.random() * 9000)
      const invId = `inv-w-${Date.now()}`
      const invNumber = `INV-W-${year}-${rand}`

      // 1. Récupérer tous les lots de déchets actifs (locaux + Supabase)
      let localBatches: any[] = []
      try {
        const stored = localStorage.getItem('waste_batches_custom_v1')
        if (stored) {
          localBatches = JSON.parse(stored)
        }
      } catch (e) {}

      let remoteBatches: any[] = []
      try {
        const { data } = await supabase
          .from('waste_batches')
          .select('*')
          .order('created_at', { ascending: false })
        if (Array.isArray(data)) {
          remoteBatches = data
        }
      } catch (e) {
        console.warn("Notice Supabase waste_batches fetch:", e)
      }

      // Fusionner les lots uniques
      const batchMap = new Map<string, any>()
      localBatches.forEach(b => {
        const key = b.batch_number || b.id
        if (key) batchMap.set(key, b)
      })
      remoteBatches.forEach(b => {
        const key = b.batch_number || b.id
        if (key) batchMap.set(key, b)
      })

      // Filtrer les lots actifs (non détruits) et appartenant à l'emplacement sélectionné si spécifique
      const activeBatches = Array.from(batchMap.values()).filter(b => {
        if (b.status === 'Détruit' || b.destruction_date) return false
        if (values.location !== 'MAGASIN DES DECHETS') {
          // Inventaire d'une zone précise : seuls les lots orientés dans cette zone sont capturés
          const loc = normalizeWasteLocation(b.current_location, b.waste_type)
          if (loc !== values.location) {
            return false
          }
        }
        return true
      })

      if (activeBatches.length === 0) {
        toast.error("Aucun lot de déchet actif trouvé dans cet emplacement. Enregistrez d'abord une réception de déchet.")
        setIsSaving(false)
        return
      }

      // Construire la liste des items d'inventaire déchet
      let totalSystemWeight = 0
      const items = activeBatches.map((b, idx) => {
        const sysQty = Number(b.quantity) || 0
        totalSystemWeight += sysQty
        return {
          id: `item-${invId}-${idx + 1}`,
          waste_batch_id: b.id || b.batch_number,
          batch_number: b.batch_number || `DEC-TEMP-${idx + 1}`,
          commercial_name: (b.commercial_name || b.waste_type || 'Déchets pharmaceutiques').toUpperCase(),
          waste_type: b.waste_type || 'Déchets pharmaceutiques',
          packaging: b.packaging || 'Fût / Carton',
          current_location: b.current_location || values.location,
          system_quantity: sysQty,
          physical_quantity: sysQty,
          unit: b.unit || 'Kg',
          discrepancy_reason: null,
        }
      })

      totalSystemWeight = Math.round(totalSystemWeight * 100) / 100

      const newInventory = {
        id: invId,
        inv_number: invNumber,
        name: values.name,
        inventory_type: values.inventory_type,
        location: values.location,
        status: 'En cours',
        system_weight: totalSystemWeight,
        physical_weight: totalSystemWeight,
        diff: 0,
        items_count: items.length,
        controller: 'Marie ADANDE',
        date: nowIso,
        created_at: nowIso,
        completed_at: null,
        observations: '',
        items,
      }

      // 2. Sauvegarde locale immédiate
      try {
        localStorage.removeItem('all_data_wiped')
        const stored = JSON.parse(localStorage.getItem('waste_inventories_custom_v1') || '[]')
        localStorage.setItem('waste_inventories_custom_v1', JSON.stringify([newInventory, ...stored]))
      } catch (e) {}

      // 3. Synchronisation Supabase Cloud
      const syncPromise = supabase.from('inventories').upsert({
        id: invId,
        inv_number: invNumber,
        name: values.name,
        date: nowIso,
        location: values.location,
        inventory_type: values.inventory_type,
        status: 'En cours',
        items_count: items.length,
        system_weight: totalSystemWeight,
        physical_weight: totalSystemWeight,
        diff: 0,
        controller: 'Marie ADANDE',
        observations: JSON.stringify({ items, completed_at: null, notes: '' }),
        created_at: nowIso,
      }, { onConflict: 'inv_number' })

      await Promise.race([syncPromise, new Promise(r => setTimeout(r, 600))])

      toast.success(`Session "${values.name}" démarrée avec ${items.length} lot(s) de déchets (${totalSystemWeight} Kg) !`)
      router.push(`/dashboard/waste/inventory/${invId}`)
    } catch (error: any) {
      console.error(error)
      toast.error("Erreur lors de l'initialisation de l'inventaire des déchets")
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
            <Link href="/dashboard/waste/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Scale className="h-4 w-4 text-red-600" />
              Démarrer un Inventaire Déchet
            </h2>
            <p className="text-muted-foreground text-[11px]">Initialisation d'une nouvelle session de contrôle physique et pesée contradictoire.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs px-3" asChild>
            <Link href="/dashboard/waste/inventory">Annuler</Link>
          </Button>
          <Button 
            type="button" 
            size="sm"
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving} 
            className="h-8 text-xs font-bold px-3 bg-red-600 hover:bg-red-700 text-white shadow-2xs gap-1.5 border-0"
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
                    <FormLabel className="text-xs font-bold text-foreground">Nom de la session d'inventaire</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Inventaire Déchets Mars 2026" className="h-9 text-xs bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* TYPE D'INVENTAIRE */}
                <FormField
                  control={form.control}
                  name="inventory_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-foreground">Type de contrôle</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-xs bg-background">
                            <SelectValue placeholder="Sélectionner le type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Périodique">Périodique (Mensuel / Trimestriel)</SelectItem>
                          <SelectItem value="Annuel">Annuel</SelectItem>
                          <SelectItem value="Contrôle inopiné / Exceptionnel">Contrôle inopiné / Exceptionnel</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* EMPLACEMENT / ZONE */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-red-600" /> Zone de stockage à contrôler
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-xs bg-background">
                            <SelectValue placeholder="Sélectionner la zone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MAGASIN DES DECHETS">MAGASIN DES DECHETS (Toutes les zones)</SelectItem>
                          <SelectItem value="MAGASIN DES DECHETS — Zone déchets solides">MAGASIN DES DECHETS — Zone déchets solides</SelectItem>
                          <SelectItem value="MAGASIN DES DECHETS — Zone déchets Liquide">MAGASIN DES DECHETS — Zone déchets Liquide</SelectItem>
                          <SelectItem value="MAGASIN DES DECHETS — Zone déchets dangereuses">MAGASIN DES DECHETS — Zone déchets dangereuses</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ENCART INFORMATIF */}
              <div className="rounded-xl border border-red-200/60 bg-red-50/40 p-3 text-xs text-red-900 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-[11px] block text-red-900">Procédure de contrôle contradictoire des déchets :</span>
                  <p className="text-[11px] text-red-800/90 leading-relaxed">
                    Le lancement de cette session capture automatiquement tous les lots de déchets actuellement stockés dans le local sélectionné avec leur masse théorique (SI). Vous pourrez ensuite peser chaque fût/carton, enregistrer les masses réelles et documenter les motifs d'éventuels écarts (évaporation, fuite, dessèchement).
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
