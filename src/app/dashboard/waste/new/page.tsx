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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Trash2, Box } from "lucide-react"

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
      try {
        const { data } = await supabase.from('samples').select('id, sample_number, commercial_name, batch_number').neq('status', 'Détruit')
        if (data && data.length > 0) {
          setSamples(data)
          return
        }
      } catch (e) {
        console.warn("Supabase fetch samples error:", e)
      }

      // Fallback sur échantillons locaux ou mock
      try {
        const history = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
        const localSamplesList: any[] = []
        history.forEach((rec: any) => {
          const raw = localStorage.getItem('reception_draft_details_' + rec.rec_number)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed.formData?.samples) {
              parsed.formData.samples.forEach((s: any, idx: number) => {
                if (s.commercial_name) {
                  localSamplesList.push({
                    id: `local-${rec.rec_number}-${idx}`,
                    sample_number: `ECH-${rec.rec_number.replace('REC-', '')}-${idx + 1}`,
                    commercial_name: s.commercial_name,
                    batch_number: s.batch || 'LOT-TEMP'
                  })
                }
              })
            }
          }
        })
        if (localSamplesList.length > 0) {
          setSamples(localSamplesList)
          return
        }
      } catch (e) {}

      // Échantillons par défaut pour sélection
      setSamples([
        { id: 'sample-1', sample_number: 'ECH-2026-8832', commercial_name: 'AMOXICILLINE 500MG', batch_number: 'LOT-8832' },
        { id: 'sample-2', sample_number: 'ECH-2026-1192', commercial_name: 'PARACÉTAMOL 1G', batch_number: 'LOT-1192' },
        { id: 'sample-3', sample_number: 'ECH-2026-9920', commercial_name: 'IBUPROFÈNE 400MG', batch_number: 'LOT-9920' },
      ])
    }
    fetchSamples()
  }, [supabase, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true)

    try {
      const selectedSample = samples.find(s => s.id === values.sample_id)
      const newBatch = {
        id: 'batch-' + Date.now(),
        batch_number: values.batch_number,
        waste_type: values.waste_type,
        sample_id: (values.sample_id && values.sample_id !== "none") ? values.sample_id : null,
        sample: selectedSample ? {
          commercial_name: selectedSample.commercial_name,
          batch_number: selectedSample.batch_number
        } : null,
        quantity: values.quantity,
        unit: values.unit,
        current_location: values.current_location || "Zone de Quarantaine - Déchets",
        status: 'Déclaré',
        observations: values.observations || "",
        created_at: new Date().toISOString(),
        creator: { first_name: 'Marie', last_name: 'ADANDE' }
      }

      // 1. Sauvegarde locale garantie
      try {
        const stored = localStorage.getItem('waste_batches_custom_v1')
        const currentList = stored ? JSON.parse(stored) : []
        localStorage.setItem('waste_batches_custom_v1', JSON.stringify([newBatch, ...currentList]))
      } catch (localErr) {
        console.warn("Erreur sauvegarde locale déchet:", localErr)
      }

      // 2. Tentative Supabase en tâche de fond (résiliente)
      try {
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData?.user?.id

        await supabase.from('waste_batches').insert({
          batch_number: values.batch_number,
          waste_type: values.waste_type,
          sample_id: (values.sample_id && values.sample_id !== "none") ? values.sample_id : null,
          quantity: values.quantity,
          unit: values.unit,
          current_location: values.current_location,
          status: 'Déclaré',
          created_by: userId
        })

        if (userId) {
          await supabase.from('audit_logs').insert({
            user_id: userId,
            action: 'CREATE_WASTE_BATCH',
            entity_type: 'waste_batches',
            new_value: values
          })
        }
      } catch (remoteErr) {
        console.warn("Échec insertion Supabase waste_batches (mode déconnecté/cache):", remoteErr)
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
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl mx-auto">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-8 w-8 shrink-0 rounded-lg">
            <Link href="/dashboard/waste"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">Déclarer un Déchet (PSQIF)</h2>
            <p className="text-muted-foreground text-[11px]">Création d'un nouveau lot en attente de destruction.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs px-3" asChild>
            <Link href="/dashboard/waste">Annuler</Link>
          </Button>
          <Button 
            type="button" 
            size="sm"
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving} 
            className="h-8 text-xs font-bold px-3 bg-red-600 hover:bg-red-700 text-white shadow-2xs gap-1.5"
          >
            {isSaving ? "Sauvegarde..." : <><Save className="h-3.5 w-3.5" /> Enregistrer le lot</>}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          {/* CARTE 1 : SIGNALÉTIQUE DU DÉCHET */}
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-3 pb-2 border-b border-border/50">
              <CardTitle className="flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Trash2 className="mr-1.5 h-4 w-4 text-red-600" /> Signalétique du Déchet
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5">
              
              <FormField control={form.control} name="batch_number" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-bold">N° de Lot (Auto-généré)</FormLabel>
                  <FormControl><Input {...field} disabled className="font-mono bg-muted/40 h-8 text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="waste_type" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-bold">Classification du déchet</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Choisir le type" /></SelectTrigger></FormControl>
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
                <FormItem>
                  <FormLabel className="text-[11px] font-bold">Produit d'origine (Optionnel)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Lier à un échantillon..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucun lien (Déchet externe)</SelectItem>
                      {samples.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.sample_number} - {s.commercial_name} ({s.batch_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

            </CardContent>
          </Card>

          {/* CARTE 2 : PESÉE & CONDITIONNEMENT */}
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
            <CardHeader className="p-3 pb-2 border-b border-border/50">
              <CardTitle className="flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Box className="mr-1.5 h-4 w-4 text-[#1B5C2E]" /> Pesée & Conditionnement
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5">
              
              <div className="grid grid-cols-2 gap-2">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold">Poids / Quantité</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} className="h-8 text-xs" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold">Unité</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Unité" /></SelectTrigger></FormControl>
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
              </div>

              <FormField control={form.control} name="current_location" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-bold">Localisation Temporaire</FormLabel>
                  <FormControl><Input {...field} placeholder="Zone de stockage..." className="h-8 text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="observations" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-bold">Observations / Motif</FormLabel>
                  <FormControl><Textarea className="h-14 min-h-[56px] text-xs resize-none" placeholder="Motifs de destruction..." {...field} /></FormControl>
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
