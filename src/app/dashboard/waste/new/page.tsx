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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Trash2, Search, Box } from "lucide-react"

import { createClient } from "@/utils/supabase/client"

const formSchema = z.object({
  batch_number: z.string().min(1, "N° de lot requis"),
  waste_type: z.string().min(1, "Type de déchet requis"),
  sample_id: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Quantité invalide"),
  unit: z.string().min(1, "Unité requise"),
  current_location: z.string().optional(),
  observations: z.string().optional(),
})

export default function NewWastePage() {
  const [isSaving, setIsSaving] = useState(false)
  const [samples, setSamples] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      batch_number: "",
      waste_type: "",
      sample_id: "",
      quantity: 0,
      unit: "Kg",
      current_location: "Zone de Quarantaine - Déchets",
      observations: "",
    },
  })

  useEffect(() => {
    form.setValue("batch_number", "DEC-" + new Date().getFullYear() + "-" + Math.floor(10000 + Math.random() * 90000))
    async function fetchSamples() {
      // Fetch samples that are not already destroyed, just in case user wants to declare them as waste.
      const { data } = await supabase.from('samples').select('id, sample_number, commercial_name, batch_number').neq('status', 'Détruit')
      if (data) setSamples(data)
    }
    fetchSamples()
  }, [supabase])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true)

    // Verify if sample is selected, we should theoretically update the sample's status or deduct quantity. 
    // In eGED, declaring a waste batch creates the batch. Real deduction happens via "Mouvements".
    // For simplicity, we just create the waste_batch here.

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      const { error } = await supabase.from('waste_batches').insert({
        batch_number: values.batch_number,
        waste_type: values.waste_type,
        sample_id: values.sample_id || null,
        quantity: values.quantity,
        unit: values.unit,
        current_location: values.current_location,
        status: 'Déclaré',
        created_by: userId
      })

      if (error) throw error

      // Traçabilité (Audit Log)
      if (userId) {
        await supabase.from('audit_logs').insert({
          user_id: userId,
          action: 'CREATE_WASTE_BATCH',
          entity_type: 'waste_batches',
          new_value: values
        })
      }

      toast.success("Lot de déchets déclaré avec succès !")
      router.push("/dashboard/waste")
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
            <Link href="/dashboard/waste"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Déclarer un Déchet (PSQIF)</h2>
            <p className="text-muted-foreground text-xs">Création d'un nouveau lot en attente de destruction.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" asChild><Link href="/dashboard/waste">Annuler</Link></Button>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="shadow-md bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            {isSaving ? "Sauvegarde..." : <><Save className="mr-2 h-4 w-4" /> Enregistrer le lot</>}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center text-lg"><Trash2 className="mr-2 h-5 w-5 text-destructive" /> Signalétique du Déchet</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
              <FormField control={form.control} name="batch_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>N° de Lot (Auto-généré)</FormLabel>
                  <FormControl><Input {...field} disabled className="font-mono bg-muted/50" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="waste_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Classification du déchet</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Choisir le type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Médicaments périmés">Médicaments périmés</SelectItem>
                      <SelectItem value="Produits chimiques dangereux">Produits chimiques dangereux</SelectItem>
                      <SelectItem value="Déchets infectieux (DASRI)">Déchets infectieux (DASRI)</SelectItem>
                      <SelectItem value="Flacons cassés">Flacons cassés</SelectItem>
                      <SelectItem value="Emballages souillés">Emballages souillés</SelectItem>
                      <SelectItem value="Autres">Autres</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sample_id" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Produit d'origine (Optionnel)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Lier à un échantillon du stock..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">Aucun lien (Déchet externe ou non listé)</SelectItem>
                      {samples.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.sample_number} - {s.commercial_name} (Lot: {s.batch_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Associez ce déchet à un produit existant pour une traçabilité complète.</FormDescription>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center text-lg"><Box className="mr-2 h-5 w-5 text-primary" /> Pesée & Conditionnement</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Poids / Quantité</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unité</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Unité" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Kg">Kilogrammes (Kg)</SelectItem>
                      <SelectItem value="g">Grammes (g)</SelectItem>
                      <SelectItem value="L">Litres (L)</SelectItem>
                      <SelectItem value="Boites">Boîtes</SelectItem>
                      <SelectItem value="Unites">Unités</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="current_location" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Localisation Temporaire</FormLabel>
                  <FormControl><Input {...field} placeholder="Où est stocké ce déchet actuellement ?" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="observations" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Observations / Motif</FormLabel>
                  <FormControl><Textarea className="h-24" placeholder="Description des conditions, motifs de destruction..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

        </form>
      </Form>
    </div>
  )
}
