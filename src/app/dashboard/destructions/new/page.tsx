"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save, Flame, Trash2 } from "lucide-react"

import { createClient } from "@/utils/supabase/client"

const formSchema = z.object({
  plan_number: z.string().min(1, "N° requis"),
  planned_date: z.string().min(1, "Date prévue requise"),
  selected_batches: z.array(z.string()).min(1, "Veuillez sélectionner au moins un lot de déchets"),
})

export default function NewDestructionPlanPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [wasteBatches, setWasteBatches] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      plan_number: "DES-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000),
      planned_date: "",
      selected_batches: [],
    },
  })

  useEffect(() => {
    async function fetchWasteBatches() {
      // Only fetch waste batches that are validated and ready to be destroyed
      // For now, let's just fetch all that are not destroyed or in another plan
      const { data, error } = await supabase
        .from('waste_batches')
        .select('*, sample:samples(commercial_name)')
        .not('status', 'in', '("Détruit", "Archivé", "En attente de destruction")')
      
      if (data) {
        setWasteBatches(data)
      }
    }
    fetchWasteBatches()
  }, [supabase])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      // 1. Create the plan
      const { data: planData, error: planError } = await supabase.from('destruction_plans').insert({
        plan_number: values.plan_number,
        planned_date: values.planned_date,
        status: 'En préparation',
        created_by: userId
      }).select().single()

      if (planError) throw planError

      // 2. Create the items
      const itemsToInsert = values.selected_batches.map(batchId => {
        const batch = wasteBatches.find(b => b.id === batchId)
        return {
          plan_id: planData.id,
          waste_batch_id: batchId,
          sample_id: batch?.sample_id || null,
          quantity: batch?.quantity || 0,
        }
      })

      const { error: itemsError } = await supabase.from('destruction_items').insert(itemsToInsert)
      if (itemsError) throw itemsError

      // 3. Update waste batches statuses
      const { error: batchUpdateError } = await supabase
        .from('waste_batches')
        .update({ status: 'En attente de destruction' })
        .in('id', values.selected_batches)
      
      if (batchUpdateError) throw batchUpdateError

      toast.success("Plan de destruction créé. En attente de validation.")
      router.push("/dashboard/destructions")
    } catch (error: any) {
      console.error(error)
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl mx-auto pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm sticky top-20 z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0 rounded-full">
            <Link href="/dashboard/destructions"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Nouveau Plan de Destruction</h2>
            <p className="text-muted-foreground text-xs">Sélection des lots et planification.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" asChild><Link href="/dashboard/destructions">Annuler</Link></Button>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="shadow-md bg-orange-600 hover:bg-orange-700 text-white">
            {isSaving ? "Sauvegarde..." : <><Save className="mr-2 h-4 w-4" /> Créer le plan</>}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center text-lg"><Flame className="mr-2 h-5 w-5 text-orange-500" /> Informations du plan</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
              <FormField control={form.control} name="plan_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>N° de Plan</FormLabel>
                  <FormControl><Input {...field} disabled className="font-mono bg-muted/50" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="planned_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'exécution prévue</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-lg"><Trash2 className="mr-2 h-5 w-5 text-primary" /> Sélection des déchets</CardTitle>
              </div>
              <CardDescription>Cochez les lots validés que vous souhaitez inclure dans cette session de destruction.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="selected_batches"
                render={() => (
                  <FormItem>
                    {wasteBatches.length === 0 ? (
                      <div className="text-center p-6 bg-muted/20 rounded-lg text-muted-foreground border border-dashed border-border/50">
                        Aucun lot de déchet disponible pour la destruction.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {wasteBatches.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="selected_batches"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item.id}
                                  className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, item.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== item.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <div className="flex flex-col flex-1">
                                    <FormLabel className="font-semibold text-base cursor-pointer">
                                      Lot {item.batch_number} - {item.waste_type}
                                    </FormLabel>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                      <span>Quantité: {item.quantity} {item.unit}</span>
                                      <span>Localisation: {item.current_location}</span>
                                      <span>Statut actuel: {item.status}</span>
                                    </div>
                                    {item.sample && (
                                      <p className="text-xs text-primary mt-1">Produit d'origine: {item.sample.commercial_name}</p>
                                    )}
                                  </div>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  )
}
