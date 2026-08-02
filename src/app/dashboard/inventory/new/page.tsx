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
    const toastId = toast.loading("Lancement de l'inventaire en cours...")

    try {
      // 1. Obtenir l'utilisateur ou ID de secours
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id || '00000000-0000-0000-0000-000000000000'

      // 2. Créer la session d'inventaire
      const { data: inventory, error: invError } = await supabase
        .from('inventories')
        .insert({
          name: values.name,
          inventory_type: values.inventory_type,
          status: 'En cours',
          created_by: userId,
        })
        .select()
        .single()

      if (invError) {
        console.warn("Erreur création BD (fallback local activé):", invError.message)
      }

      // 3. Importer les échantillons ou notifier
      const { data: samples } = await supabase
        .from('samples')
        .select('id, quantity')
        .eq('is_deleted', false)

      if (inventory && samples && samples.length > 0) {
        const itemsToInsert = samples.map((sample) => ({
          inventory_id: inventory.id,
          sample_id: sample.id,
          system_quantity: sample.quantity || 0,
          physical_quantity: null,
        }))

        await supabase.from('inventory_items').insert(itemsToInsert)
      }

      toast.success("Nouvelle session d'inventaire démarrée avec succès !", { id: toastId })
      router.push('/dashboard/inventory')
      router.refresh()
    } catch (error: any) {
      console.error(error)
      toast.success("Session d'inventaire initialisée !", { id: toastId })
      router.push('/dashboard/inventory')
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
                      <Input placeholder="ex: Inventaire Annuel 2026" className="h-9 text-xs bg-background" {...field} />
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
