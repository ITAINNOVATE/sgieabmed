'use client'

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
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
      // 1. Get current user
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      if (!userId) {
        throw new Error("Utilisateur non authentifié")
      }

      // 2. Create the inventory plan
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

      if (invError) throw invError
      if (!inventory) throw new Error("Erreur lors de la création de l'inventaire")

      // 3. Get all active samples to inventory
      const { data: samples, error: samplesError } = await supabase
        .from('samples')
        .select('id, quantity')
        .eq('is_deleted', false)

      if (samplesError) throw samplesError

      if (samples && samples.length > 0) {
        // 4. Create the inventory items
        const itemsToInsert = samples.map((sample) => ({
          inventory_id: inventory.id,
          sample_id: sample.id,
          system_quantity: sample.quantity || 0,
          physical_quantity: null, // will be verified during counting
        }))

        const { error: itemsError } = await supabase
          .from('inventory_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      } else {
        toast.warning("Aucun échantillon actif trouvé dans le stock pour cet inventaire.")
      }

      // 5. Add audit log
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'Création',
        entity_type: 'inventories',
        entity_id: inventory.id,
        details: { name: values.name, type: values.inventory_type, items_count: samples?.length || 0 },
      })

      toast.success("Nouvel inventaire démarré avec succès !")
      router.push('/dashboard/inventory')
      router.refresh()
    } catch (error: any) {
      console.error(error)
      toast.error(`Erreur: ${error.message || "Une erreur est survenue"}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl mx-auto pb-20">
      
      {/* Header card sticky */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm sticky top-20 z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0 rounded-full">
            <Link href="/dashboard/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Démarrer un Inventaire</h2>
            <p className="text-muted-foreground text-xs">Initialisation d&apos;une nouvelle session de contrôle physique.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button type="button" variant="outline" className="flex-1 sm:flex-initial" asChild>
            <Link href="/dashboard/inventory">Annuler</Link>
          </Button>
          <Button 
            type="button" 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving} 
            className="flex-1 sm:flex-initial shadow-md bg-primary hover:bg-primary/90 gap-2"
          >
            {isSaving ? "Initialisation..." : <><Save className="h-4 w-4" /> Lancer l&apos;inventaire</>}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-sm border-border/50 rounded-2xl">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center text-lg gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Paramètres de la session
              </CardTitle>
              <CardDescription>
                Définissez le nom et la périodicité de cet inventaire de rapprochement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              
              {/* Inventory Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l&apos;inventaire</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Inventaire Annuel 2026" {...field} />
                    </FormControl>
                    <FormDescription>
                      Choisissez un nom clair pour identifier cette session dans l&apos;historique.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Inventory Type */}
              <FormField
                control={form.control}
                name="inventory_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d&apos;inventaire</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val || '')} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Périodique">Périodique (Mensuel, Trimestriel, etc.)</SelectItem>
                        <SelectItem value="Annuel">Annuel</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Classification réglementaire de la session d&apos;inventaire.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Informational banner */}
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-400">
                <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
                <div className="space-y-1">
                  <p className="font-semibold">Rapprochement automatique</p>
                  <p className="text-xs opacity-90 leading-relaxed">
                    Au lancement, le système importera <strong>tous les échantillons actifs en stock</strong> dans cette session d&apos;inventaire avec leurs quantités informatiques actuelles. Vous pourrez ensuite saisir les comptages physiques et valider les écarts.
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
