"use client"

import { useState, useEffect, use } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Box, AlertCircle } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { Sample } from "../../page"

const formSchema = z.object({
  commercial_name: z.string().min(1, "Nom commercial requis"),
  dci: z.string().min(1, "DCI requise"),
  batch_number: z.string().min(1, "Lot requis"),
  expiry_date: z.string().min(1, "Date de péremption requise"),
  status: z.string().min(1, "Statut requis"),
  quantity: z.coerce.number().min(0, "Quantité invalide"),
  category: z.string().optional(),
})

const MOCK_SAMPLES_EDIT_FALLBACK: Record<string, any> = {
  "sample-1": {
    sample_number: "SMP-2024-001",
    commercial_name: "Paracétamol 500mg",
    dci: "Paracétamol",
    batch_number: "LOT-2023-A45",
    expiry_date: "2026-12-31",
    status: "Conforme",
    quantity: 150,
    category: "Médicaments",
  },
  "sample-2": {
    sample_number: "SMP-2024-002",
    commercial_name: "Amoxicilline 250mg/5ml",
    dci: "Amoxicilline",
    batch_number: "LOT-2023-B12",
    expiry_date: "2025-06-30",
    status: "En attente d'analyse",
    quantity: 45,
    category: "Antibiotiques",
  },
  "sample-3": {
    sample_number: "SMP-2024-003",
    commercial_name: "Artéméther / Luméfantrine 20/120mg",
    dci: "Artéméther + Luméfantrine",
    batch_number: "LOT-2024-C88",
    expiry_date: "2027-01-15",
    status: "Conforme",
    quantity: 300,
    category: "Antipaludiques",
  },
  "sample-4": {
    sample_number: "SMP-2024-004",
    commercial_name: "Sérum Physiologique 0.9%",
    dci: "Chlorure de sodium",
    batch_number: "LOT-2024-D01",
    expiry_date: "2024-02-28",
    status: "Périmé",
    quantity: 12,
    category: "Solutés massifs",
  },
  "sample-5": {
    sample_number: "SMP-2024-005",
    commercial_name: "Ciprofloxacine 500mg",
    dci: "Ciprofloxacine",
    batch_number: "LOT-2024-E33",
    expiry_date: "2026-08-31",
    status: "Non conforme",
    quantity: 0,
    category: "Antibiotiques",
  }
}

export default function EditSamplePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [isSaving, setIsSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sampleNumber, setSampleNumber] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      commercial_name: "",
      dci: "",
      batch_number: "",
      expiry_date: "",
      status: "",
      quantity: 0,
      category: "Autres",
    },
  })

  useEffect(() => {
    async function fetchSample() {
      let sampleData: any = null
      try {
        const { data, error } = await supabase.from('samples').select('*').eq('id', resolvedParams.id).single()
        if (data) sampleData = data
      } catch (err) {
        console.warn("Could not query Supabase for sample edit, falling back to mock:", err)
      }

      if (!sampleData && MOCK_SAMPLES_EDIT_FALLBACK[resolvedParams.id]) {
        sampleData = MOCK_SAMPLES_EDIT_FALLBACK[resolvedParams.id]
      }

      if (!sampleData) {
        // Fallback générique pour tout autre ID
        sampleData = {
          sample_number: `SMP-${resolvedParams.id.toUpperCase()}`,
          commercial_name: `Échantillon ${resolvedParams.id}`,
          dci: "Principe Actif Démonstration",
          batch_number: "LOT-DEMO-2024",
          expiry_date: "2026-12-31",
          status: "Conforme",
          quantity: 100,
          category: "Médicaments",
        }
      }

      if (sampleData) {
        setSampleNumber(sampleData.sample_number)
        form.reset({
          commercial_name: sampleData.commercial_name || "",
          dci: sampleData.dci || "",
          batch_number: sampleData.batch_number || "",
          expiry_date: sampleData.expiry_date || "",
          status: sampleData.status || "Conforme",
          quantity: sampleData.quantity ?? 0,
          category: sampleData.category || "Autres",
        })
      } else {
        toast.error("Impossible de charger l'échantillon.")
      }
      setLoading(false)
    }
    fetchSample()
  }, [resolvedParams.id, form, supabase])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true)
    const { error } = await supabase
      .from('samples')
      .update(values)
      .eq('id', resolvedParams.id)
    
    if (error) {
      toast.error("Erreur lors de la mise à jour")
      console.error(error)
    } else {
      toast.success("Échantillon mis à jour avec succès !")
      router.push(`/dashboard/samples/${resolvedParams.id}`)
    }
    setIsSaving(false)
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement...</div>

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl mx-auto pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm sticky top-20 z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0 rounded-full">
            <Link href={`/dashboard/samples`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Modifier l'échantillon</h2>
            <p className="text-muted-foreground text-xs font-mono">{sampleNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" asChild><Link href={`/dashboard/samples/${resolvedParams.id}`}>Annuler</Link></Button>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="shadow-md">
            {isSaving ? "Sauvegarde..." : <><Save className="mr-2 h-4 w-4" /> Enregistrer les modifications</>}
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3 shadow-sm">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold mb-1">Attention : Modification d'un produit officiel</p>
          <p>Toute modification apportée à cet échantillon sera tracée dans le journal d'audit de l'ANRP. Les quantités ne devraient être modifiées ici qu'en cas d'erreur de saisie initiale. Pour les opérations courantes, utilisez le module <strong>Mouvements</strong>.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center text-lg"><Box className="mr-2 h-5 w-5 text-primary" /> Informations du produit</CardTitle>
              <CardDescription>Mettez à jour les données signalétiques du produit.</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
              <FormField control={form.control} name="commercial_name" render={({ field }) => (
                <FormItem><FormLabel>Nom Commercial</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dci" render={({ field }) => (
                <FormItem><FormLabel>DCI</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="batch_number" render={({ field }) => (
                <FormItem><FormLabel>Numéro de Lot</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="expiry_date" render={({ field }) => (
                <FormItem><FormLabel>Date de Péremption</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "Autres"}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Antibiotiques">Antibiotiques</SelectItem>
                      <SelectItem value="Antalgiques">Antalgiques</SelectItem>
                      <SelectItem value="Anti-inflammatoires">Anti-inflammatoires</SelectItem>
                      <SelectItem value="Antipaludiques">Antipaludiques</SelectItem>
                      <SelectItem value="Antihypertenseurs">Antihypertenseurs</SelectItem>
                      <SelectItem value="Antidiabétiques">Antidiabétiques</SelectItem>
                      <SelectItem value="Vaccins">Vaccins</SelectItem>
                      <SelectItem value="Produits biologiques">Produits biologiques</SelectItem>
                      <SelectItem value="Dispositifs médicaux">Dispositifs médicaux</SelectItem>
                      <SelectItem value="Produits vétérinaires">Produits vétérinaires</SelectItem>
                      <SelectItem value="Compléments alimentaires">Compléments alimentaires</SelectItem>
                      <SelectItem value="Autres">Autres</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center text-lg">Gestion & Statut</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut actuel</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Choisir un statut" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="À localiser">À localiser</SelectItem>
                      <SelectItem value="Disponible">Disponible</SelectItem>
                      <SelectItem value="En quarantaine">En quarantaine</SelectItem>
                      <SelectItem value="Rejeté">Rejeté</SelectItem>
                      <SelectItem value="Détruit">Détruit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>Quantité totale disponible</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  )
}
