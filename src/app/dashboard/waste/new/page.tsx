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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { 
  ArrowLeft, Save, Trash2, Box, Building2, User, Phone, 
  FileText, Printer, Download, CheckCircle2, ShieldCheck, MapPin, Calendar, Clock
} from "lucide-react"

import { createClient } from "@/utils/supabase/client"
import { exportWasteReceptionSlipPDF } from "@/utils/exportUtils"

const formSchema = z.object({
  // 1. Informations Générales de Réception
  reception_number: z.string().min(1, "N° de réception requis"),
  reception_date: z.string().min(1, "Date de réception requise"),
  reception_time: z.string().min(1, "Heure requise"),
  delivery_slip_ref: z.string().optional(),
  recipient_agent: z.string().min(1, "Agent récepteur requis"),

  // 2. Structure Déposante / Provenance
  source_structure: z.string().min(2, "Le nom de la structure apportrice est requis"),
  source_type: z.string().min(1, "Type de structure requis"),
  city: z.string().optional(),
  depositor_name: z.string().min(2, "Nom de la personne ayant apporté les déchets requis"),
  depositor_phone: z.string().min(6, "Numéro de téléphone requis"),
  depositor_id_card: z.string().optional(),

  // 3. Identification & Signalétique du Déchet
  batch_number: z.string().min(1, "N° de lot déchet requis"),
  waste_type: z.string().min(1, "Type de déchet requis"),
  commercial_name: z.string().optional(),
  sample_id: z.string().optional(),
  original_batch: z.string().optional(),

  // 4. Pesée & Conditionnement
  quantity: z.coerce.number().min(0.01, "Quantité ou poids invalide"),
  unit: z.string().min(1, "Unité requise"),
  packaging: z.string().min(1, "Type de conditionnement requis"),
  packaging_condition: z.string().min(1, "État du colisage requis"),
  current_location: z.string().min(1, "Localisation requise"),
  destruction_motive: z.string().min(1, "Motif de destruction requis"),
  observations: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export default function NewWasteReceptionPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [samples, setSamples] = useState<any[]>([])
  const [savedSlipData, setSavedSlipData] = useState<any | null>(null)
  const [showSlipModal, setShowSlipModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      reception_number: "",
      reception_date: new Date().toISOString().split("T")[0],
      reception_time: new Date().toTimeString().substring(0, 5),
      delivery_slip_ref: "",
      recipient_agent: "Marie ADANDE (Agent ABMed)",

      source_structure: "",
      source_type: "Officine privée de pharmacie",
      city: "Cotonou",
      depositor_name: "",
      depositor_phone: "",
      depositor_id_card: "",

      batch_number: "",
      waste_type: "Médicaments périmés (Formes solides)",
      commercial_name: "",
      sample_id: "none",
      original_batch: "",

      quantity: 1,
      unit: "Kg",
      packaging: "Cartons fermés & scotchés",
      packaging_condition: "Conforme et scellé",
      current_location: "Zone de Quarantaine - Déchets",
      destruction_motive: "Péremption",
      observations: "",
    },
  })

  useEffect(() => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const year = new Date().getFullYear()
    form.setValue("reception_number", `REC-DECH-${year}-${randomSuffix}`)
    form.setValue("batch_number", `DEC-${year}-${Math.floor(10000 + Math.random() * 90000)}`)

    async function fetchSamples() {
      try {
        const { data } = await supabase
          .from("samples")
          .select("id, sample_number, commercial_name, batch_number")
          .neq("status", "Détruit")
        if (data && data.length > 0) {
          setSamples(data)
          return
        }
      } catch (e) {
        console.warn("Supabase fetch samples error:", e)
      }

      // Fallback local samples
      try {
        const history = JSON.parse(localStorage.getItem("reception_history_records") || "[]")
        const localSamplesList: any[] = []
        history.forEach((rec: any) => {
          const raw = localStorage.getItem("reception_draft_details_" + rec.rec_number)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (parsed.formData?.samples) {
              parsed.formData.samples.forEach((s: any, idx: number) => {
                if (s.commercial_name) {
                  localSamplesList.push({
                    id: `local-${rec.rec_number}-${idx}`,
                    sample_number: `ECH-${rec.rec_number.replace("REC-", "")}-${idx + 1}`,
                    commercial_name: s.commercial_name,
                    batch_number: s.batch || "LOT-TEMP",
                  })
                }
              })
            }
          }
        })
        if (localSamplesList.length > 0) {
          setSamples(localSamplesList)
        }
      } catch (e) {}
    }
    fetchSamples()
  }, [supabase, form])

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true)

    try {
      const selectedSample = samples.find((s) => s.id === values.sample_id)
      const newBatch = {
        id: "batch-" + Date.now(),
        batch_number: values.batch_number,
        reception_number: values.reception_number,
        reception_date: values.reception_date,
        reception_time: values.reception_time,
        delivery_slip_ref: values.delivery_slip_ref || "",
        recipient_agent: values.recipient_agent,

        source_structure: values.source_structure,
        source_type: values.source_type,
        city: values.city || "Cotonou",
        depositor_name: values.depositor_name,
        depositor_phone: values.depositor_phone,
        depositor_id_card: values.depositor_id_card || "",

        waste_type: values.waste_type,
        commercial_name: values.commercial_name || (selectedSample ? selectedSample.commercial_name : "Divers produits pharmaceutiques"),
        original_batch: values.original_batch || (selectedSample ? selectedSample.batch_number : ""),
        sample_id: values.sample_id && values.sample_id !== "none" ? values.sample_id : null,
        sample: selectedSample
          ? {
              commercial_name: selectedSample.commercial_name,
              batch_number: selectedSample.batch_number,
            }
          : null,
        quantity: values.quantity,
        unit: values.unit,
        packaging: values.packaging,
        packaging_condition: values.packaging_condition,
        destruction_motive: values.destruction_motive,
        current_location: values.current_location || "Zone de Quarantaine - Déchets",
        status: "Déclaré",
        observations: values.observations || "",
        created_at: new Date().toISOString(),
        creator: { first_name: "Marie", last_name: "ADANDE" },
      }

      // 1. Sauvegarde dans le stockage local garanti
      try {
        const stored = localStorage.getItem("waste_batches_custom_v1")
        const currentList = stored ? JSON.parse(stored) : []
        localStorage.setItem("waste_batches_custom_v1", JSON.stringify([newBatch, ...currentList]))
      } catch (localErr) {
        console.warn("Erreur sauvegarde locale déchet:", localErr)
      }

      // 2. Sauvegarde Supabase
      try {
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData?.user?.id

        await supabase.from("waste_batches").insert({
          batch_number: values.batch_number,
          waste_type: values.waste_type,
          sample_id: values.sample_id && values.sample_id !== "none" ? values.sample_id : null,
          quantity: values.quantity,
          unit: values.unit,
          current_location: values.current_location,
          status: "Déclaré",
          created_by: userId,
        })

        if (userId) {
          await supabase.from("audit_logs").insert({
            user_id: userId,
            action: "CREATE_WASTE_RECEPTION",
            entity_type: "waste_batches",
            new_value: values,
          })
        }
      } catch (remoteErr) {
        console.warn("Échec insertion Supabase waste_batches (mode déconnecté):", remoteErr)
      }

      // Préparer les données pour le bordereau & attestation
      const slipPayload = {
        reception_number: values.reception_number,
        reception_date: values.reception_date,
        reception_time: values.reception_time,
        delivery_slip_ref: values.delivery_slip_ref,
        recipient_agent: values.recipient_agent,
        source_structure: values.source_structure,
        source_type: values.source_type,
        city: values.city,
        depositor_name: values.depositor_name,
        depositor_phone: values.depositor_phone,
        depositor_id_card: values.depositor_id_card,
        general_observations: values.observations,
        items: [
          {
            batch_number: values.batch_number,
            waste_type: values.waste_type,
            commercial_name: values.commercial_name || (selectedSample ? selectedSample.commercial_name : "Produits pharmaceutiques périmés"),
            original_batch: values.original_batch || (selectedSample ? selectedSample.batch_number : ""),
            quantity: values.quantity,
            unit: values.unit,
            packaging: values.packaging,
            location: values.current_location,
            observations: values.observations,
          },
        ],
      }

      setSavedSlipData(slipPayload)
      setShowSlipModal(true)
      toast.success("Réception des déchets enregistrée avec succès !")
    } catch (error: any) {
      console.error(error)
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPdf = () => {
    if (savedSlipData) {
      exportWasteReceptionSlipPDF(savedSlipData)
      toast.success("Attestation PDF générée avec succès !")
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl mx-auto pb-16">
      
      {/* BANDEAU EN-TÊTE COMPACT (MASQUÉ À L'IMPRESSION) */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-2xl border border-border/70 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0 rounded-xl">
            <Link href="/dashboard/waste"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground">Réception de Déchets Pharmaceutiques</h2>
              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                PSQIF / ABMed
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Enregistrement des déchets apportés par une structure et émission de l&apos;attestation officielle de réception.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="h-9 text-xs px-3" asChild>
            <Link href="/dashboard/waste">Annuler</Link>
          </Button>
          <Button 
            type="button" 
            size="sm"
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving} 
            className="h-9 text-xs font-bold px-4 bg-[#1B5C2E] hover:bg-[#144723] text-white shadow-sm gap-2"
          >
            {isSaving ? "Enregistrement..." : <><Save className="h-4 w-4" /> Enregistrer & Générer l&apos;attestation</>}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 print:hidden">
          
          {/* SECTION 1 : INFORMATIONS GÉNÉRALES RÉCEPTION */}
          <Card className="shadow-sm border border-border/70 rounded-2xl bg-card">
            <CardHeader className="p-4 pb-3 border-b border-border/50">
              <CardTitle className="flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <FileText className="mr-2 h-4 w-4 text-emerald-600" />
                1. Récépissé & Date de Réception
              </CardTitle>
              <CardDescription className="text-xs">
                Références administratives de la prise en charge par l&apos;ABMed.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              
              <FormField control={form.control} name="reception_number" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">N° Récépissé (Auto)</FormLabel>
                  <FormControl><Input {...field} disabled className="font-mono font-bold bg-muted/40 h-9 text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="reception_date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Date de Réception</FormLabel>
                  <FormControl><Input type="date" {...field} className="h-9 text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="reception_time" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Heure</FormLabel>
                  <FormControl><Input type="time" {...field} className="h-9 text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="delivery_slip_ref" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Réf. Bordereau d&apos;apport (externe)</FormLabel>
                  <FormControl><Input {...field} placeholder="BL / PV N°..." className="h-9 text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="md:col-span-4">
                <FormField control={form.control} name="recipient_agent" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Agent Récepteur ABMed</FormLabel>
                    <FormControl><Input {...field} className="h-9 text-xs" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

            </CardContent>
          </Card>

          {/* SECTION 2 : PROVENANCE & STRUCTURE APPORTRICE (DEMANDE UTILISATEUR) */}
          <Card className="shadow-sm border-2 border-primary/20 rounded-2xl bg-primary/[0.02]">
            <CardHeader className="p-4 pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-xs font-bold uppercase tracking-wider text-primary">
                  <Building2 className="mr-2 h-4 w-4 text-primary" />
                  2. Provenance & Structure qui a apporté les Déchets
                </CardTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Information Requise</Badge>
              </div>
              <CardDescription className="text-xs">
                Identité de l&apos;établissement émetteur et de la personne physique ayant déposé le colis.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              
              <div className="md:col-span-2">
                <FormField control={form.control} name="source_structure" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-foreground">
                      Structure / Établissement Apporteur <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: Pharmacie du Port, Grossiste CAME, Hôpital de Zone..." 
                        className="h-9 text-xs font-semibold bg-background" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="source_type" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Type d&apos;Établissement</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Officine privée de pharmacie">Officine privée de pharmacie</SelectItem>
                      <SelectItem value="Établissement hospitalier / Clinique">Établissement hospitalier / Clinique</SelectItem>
                      <SelectItem value="Grossiste-répartiteur pharmaceutique">Grossiste-répartiteur pharmaceutique</SelectItem>
                      <SelectItem value="Laboratoire d'analyses médicales">Laboratoire d&apos;analyses médicales</SelectItem>
                      <SelectItem value="Industrie / Fabricant pharmaceutique">Industrie / Fabricant pharmaceutique</SelectItem>
                      <SelectItem value="Organisme de santé publique / ONG">Organisme de santé publique / ONG</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="depositor_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-foreground">
                    Nom & Prénom de l&apos;Apporteur / Déposant <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Personne ayant déposé les déchets" className="h-9 text-xs bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="depositor_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">
                    Téléphone du Déposant <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: +229 97 00 00 00" className="h-9 text-xs bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="depositor_id_card" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">N° Pièce d&apos;identité (CIP / CNI / Passeport)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optionnel mais recommandé" className="h-9 text-xs bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Ville / Commune de provenance</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Cotonou, Porto-Novo, Parakou..." className="h-9 text-xs bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

            </CardContent>
          </Card>

          {/* SECTION 3 : SIGNALÉTIQUE & CLASSIFICATION DU DÉCHET */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <Card className="shadow-sm border border-border/70 rounded-2xl bg-card">
              <CardHeader className="p-4 pb-3 border-b border-border/50">
                <CardTitle className="flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                  3. Signalétique & Désignation du Déchet
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                
                <FormField control={form.control} name="batch_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">N° de Lot Déchet ABMed (Auto)</FormLabel>
                    <FormControl><Input {...field} disabled className="font-mono bg-muted/40 h-9 text-xs" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="waste_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Classification Réglementaire</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Choisir la catégorie" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Médicaments périmés (Formes solides)">Médicaments périmés (Formes solides - comprimés, gélules)</SelectItem>
                        <SelectItem value="Médicaments périmés (Formes liquides / sirops)">Médicaments périmés (Formes liquides / sirops)</SelectItem>
                        <SelectItem value="Produits chimiques dangereux & solvants">Produits chimiques dangereux & solvants</SelectItem>
                        <SelectItem value="Déchets infectieux (DASRI)">Déchets infectieux (DASRI)</SelectItem>
                        <SelectItem value="Flacons cassés & piquant-tranchant">Flacons cassés & piquant-tranchant</SelectItem>
                        <SelectItem value="Emballages & cartons souillés">Emballages & cartons souillés</SelectItem>
                        <SelectItem value="Produits chaîne de froid dégradés">Produits chaîne de froid dégradés</SelectItem>
                        <SelectItem value="Autres déchets pharmaceutiques">Autres déchets pharmaceutiques</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="commercial_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Désignation / Produits apportés</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Antibiotiques variés périmés, Solvants HPLC..." className="h-9 text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-2">
                  <FormField control={form.control} name="original_batch" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">N° Lot Fabricant d&apos;origine</FormLabel>
                      <FormControl><Input {...field} placeholder="Lot fabricant..." className="h-9 text-xs" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="destruction_motive" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Motif du Dépôt</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Motif" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Péremption">Péremption</SelectItem>
                          <SelectItem value="Détérioration physique / Casse">Détérioration physique / Casse</SelectItem>
                          <SelectItem value="Rupture de chaîne de froid">Rupture de chaîne de froid</SelectItem>
                          <SelectItem value="Rappel de lot fabricant">Rappel de lot fabricant</SelectItem>
                          <SelectItem value="Non-conformité analytique">Non-conformité analytique</SelectItem>
                          <SelectItem value="Autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="sample_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Liaison Échantillon interne (Optionnel)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Aucun (Déchet externe apporté)" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucun lien (Déchet externe apporté)</SelectItem>
                        {samples.map((s) => (
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

            {/* SECTION 4 : PESÉE, CONDITIONNEMENT & LOCALISATION */}
            <Card className="shadow-sm border border-border/70 rounded-2xl bg-card">
              <CardHeader className="p-4 pb-3 border-b border-border/50">
                <CardTitle className="flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Box className="mr-2 h-4 w-4 text-[#1B5C2E]" />
                  4. Pesée, Conditionnement & Stockage
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                
                <div className="grid grid-cols-2 gap-2">
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Poids / Quantité Pesée</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} className="h-9 text-xs font-bold" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="unit" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Unité de mesure</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Unité" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Kg">Kilogrammes (Kg)</SelectItem>
                          <SelectItem value="Litres">Litres (L)</SelectItem>
                          <SelectItem value="Cartons">Cartons</SelectItem>
                          <SelectItem value="Boîtes">Boîtes</SelectItem>
                          <SelectItem value="Fûts">Fûts</SelectItem>
                          <SelectItem value="Unités">Unités</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="packaging" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Type de Conditionnement</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Conditionnement" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Cartons fermés & scotchés">Cartons fermés & scotchés</SelectItem>
                        <SelectItem value="Fûts étanches scellés">Fûts étanches scellés</SelectItem>
                        <SelectItem value="Boîtes jaunes DASRI sécurisées">Boîtes jaunes DASRI sécurisées</SelectItem>
                        <SelectItem value="Bacs plastiques fermés">Bacs plastiques fermés</SelectItem>
                        <SelectItem value="Sacs étanches plombés">Sacs étanches plombés</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="packaging_condition" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">État du Colisage à la Réception</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="État colis" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Conforme et scellé">Conforme et scellé</SelectItem>
                        <SelectItem value="Emballage détérioré / Avec réserves">Emballage détérioré / Avec réserves</SelectItem>
                        <SelectItem value="Fuite constatée / Reconditionné">Fuite constatée / Reconditionné</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="current_location" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Localisation / Zone Affectée</FormLabel>
                    <FormControl><Input {...field} className="h-9 text-xs" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="observations" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Observations & Réserves constatées</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="h-16 min-h-[64px] text-xs resize-none" 
                        placeholder="Précisions éventuelles sur l'état des colis..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

              </CardContent>
            </Card>

          </div>

          {/* BANDEAU BAS D'ACTION */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" asChild className="h-10 text-xs px-4">
              <Link href="/dashboard/waste">Annuler</Link>
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="h-10 text-xs font-bold px-6 bg-[#1B5C2E] hover:bg-[#144723] text-white shadow-sm gap-2"
            >
              {isSaving ? "Traitement..." : <><Save className="h-4 w-4" /> Valider la réception & Générer le document à signer</>}
            </Button>
          </div>

        </form>
      </Form>

      {/* DIALOG OFFICIEL D'ATTESTATION & BORDEREAU DE RÉCEPTION DE DÉCHETS (PRÊT À IMPRIMER & FAIRE SIGNER) */}
      <Dialog open={showSlipModal} onOpenChange={setShowSlipModal}>
        <DialogContent className="max-w-3xl bg-card border-border/70 p-6 rounded-2xl max-h-[90vh] overflow-y-auto print:max-w-full print:m-0 print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-5 w-5 text-[#1B5C2E]" />
                Attestation de Réception de Déchets Prête à Imprimer
              </DialogTitle>
              <Badge className="bg-[#1B5C2E]/10 text-[#1B5C2E] border-[#1B5C2E]/20 text-[10px]">
                Document Officiel de Décharge
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Faites signer ce document par l&apos;apporteur de la structure et l&apos;agent récepteur ABMed comme preuve de prise en charge.
            </DialogDescription>
          </DialogHeader>

          {savedSlipData && (
            <div className="space-y-4 pt-2">
              
              {/* DOCUMENT OFFICIEL FORMAT REÇU / ATTESTATION (A4 PRINTABLE) */}
              <div id="printable-waste-receipt" className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 shadow-sm space-y-5 print:border-none print:p-4 print:shadow-none">
                
                {/* EN-TÊTE OFFICIEL BÉNIN & ABMed */}
                <div className="border-b-2 border-[#1B5C2E] pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                      RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ
                    </p>
                    <h1 className="text-base sm:text-lg font-black text-[#1B5C2E] tracking-tight">
                      AGENCE BÉNINOISE DU MÉDICAMENT (ABMed)
                    </h1>
                    <p className="text-[11px] font-semibold text-slate-700">
                      Direction de la Gestion des Déchets Pharmaceutiques (PSQIF)
                    </p>
                  </div>
                  <div className="text-right sm:text-right">
                    <span className="inline-block px-2.5 py-1 rounded bg-[#1B5C2E]/10 border border-[#1B5C2E]/30 text-xs font-mono font-bold text-[#1B5C2E]">
                      {savedSlipData.reception_number}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Date : {savedSlipData.reception_date} {savedSlipData.reception_time}
                    </p>
                  </div>
                </div>

                {/* TITRE CENTRAL */}
                <div className="text-center py-1 bg-slate-50 rounded border border-slate-200">
                  <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    ATTESTATION & BORDEREAU DE RÉCEPTION DE DÉCHETS PHARMACEUTIQUES
                  </h2>
                </div>

                {/* GRILLE : STRUCTURE DÉPOSANTE & PRISE EN CHARGE ABMed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  
                  {/* CADRE GAUCHE : STRUCTURE DÉPOSANTE */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1">
                      1. Structure / Établissement Apporteur
                    </p>
                    <p className="pt-1">
                      <span className="text-slate-500">Établissement :</span>{" "}
                      <strong className="text-slate-900">{savedSlipData.source_structure}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Type :</span> {savedSlipData.source_type}
                    </p>
                    <p>
                      <span className="text-slate-500">Localité :</span> {savedSlipData.city || "Cotonou"}
                    </p>
                    <p>
                      <span className="text-slate-500">Apporté par :</span>{" "}
                      <strong>{savedSlipData.depositor_name}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Téléphone :</span> {savedSlipData.depositor_phone}
                    </p>
                    {savedSlipData.depositor_id_card && (
                      <p>
                        <span className="text-slate-500">Pièce ID :</span> {savedSlipData.depositor_id_card}
                      </p>
                    )}
                  </div>

                  {/* CADRE DROIT : PRISE EN CHARGE ABMed */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1">
                      2. Prise en charge ABMed
                    </p>
                    <p className="pt-1">
                      <span className="text-slate-500">Agent Récepteur :</span>{" "}
                      <strong className="text-slate-900">{savedSlipData.recipient_agent}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Réf. Bordereau apport :</span>{" "}
                      {savedSlipData.delivery_slip_ref || "Remise directe sur site"}
                    </p>
                    <p>
                      <span className="text-slate-500">Conditionnement :</span>{" "}
                      {savedSlipData.items[0]?.packaging}
                    </p>
                    <p>
                      <span className="text-slate-500">État du colisage :</span>{" "}
                      <strong>{savedSlipData.items[0]?.packaging_condition}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Zone de stockage :</span>{" "}
                      {savedSlipData.items[0]?.location}
                    </p>
                  </div>

                </div>

                {/* TABLEAU RÉCAPITULATIF DES DÉCHETS REÇUS */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    3. Détail des Déchets Réceptionnés
                  </p>
                  <table className="w-full text-left text-xs border border-slate-300 rounded overflow-hidden">
                    <thead className="bg-[#1B5C2E] text-white text-[11px]">
                      <tr>
                        <th className="p-2 border-r border-[#1B5C2E]/30">N° Lot Déchet</th>
                        <th className="p-2 border-r border-[#1B5C2E]/30">Désignation & Catégorie</th>
                        <th className="p-2 border-r border-[#1B5C2E]/30">Conditionnement</th>
                        <th className="p-2 text-right">Poids / Quantité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {savedSlipData.items.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-200">
                            {item.batch_number}
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-semibold text-slate-900">{item.waste_type}</p>
                            {item.commercial_name && (
                              <p className="text-[10px] text-slate-600">{item.commercial_name}</p>
                            )}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-700">
                            {item.packaging}
                          </td>
                          <td className="p-2 text-right font-black text-slate-900">
                            {item.quantity} {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ATTESTATION ET DÉCHARGE RÉGLEMENTAIRE */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950 text-[11px] leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="h-4 w-4 text-[#1B5C2E]" />
                    Attestation & Décharge Réglementaire
                  </p>
                  <p>
                    L&apos;Agence Béninoise du Médicament (ABMed) atteste par la présente avoir réceptionné et vérifié ce jour les déchets et produits pharmaceutiques ci-dessus décrits. Ils sont consignés sous la responsabilité de l&apos;ABMed pour être détruits conformément aux normes environnementales et de santé publique nationales. La structure apportrice est déchargée de la détention physique de ces produits.
                  </p>
                </div>

                {/* DOUBLE ZONE DE SIGNATURE */}
                <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                  
                  {/* SIGNATURE STRUCTURE APPORTRICE */}
                  <div className="border border-slate-300 rounded-lg p-3 min-h-[110px] flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-slate-900 uppercase text-[10px]">
                        POUR LA STRUCTURE APPORTRICE
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Nom : {savedSlipData.depositor_name}
                      </p>
                      <p className="text-[10px] italic text-slate-500">
                        Mention manuscrite « Remis pour destruction »
                      </p>
                    </div>
                    <div className="border-t border-dashed border-slate-300 pt-1 text-[9px] text-slate-400">
                      Date & Signature du déposant
                    </div>
                  </div>

                  {/* SIGNATURE AGENT ABMed */}
                  <div className="border border-slate-300 rounded-lg p-3 min-h-[110px] flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-slate-900 uppercase text-[10px]">
                        POUR L&apos;ABMed (AGENT RÉCEPTEUR)
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Agent : {savedSlipData.recipient_agent}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Direction de la Gestion des Déchets
                      </p>
                    </div>
                    <div className="border-t border-dashed border-slate-300 pt-1 text-[9px] text-slate-400">
                      Signature & Cachet officiel ABMed
                    </div>
                  </div>

                </div>

                {/* PIED DE PAGE */}
                <div className="text-[9px] text-center text-slate-400 pt-2 border-t border-slate-200">
                  Système de Gestion de l&apos;Échantillothèque et des Déchets (SGIE) — République du Bénin — Document généré électroniquement
                </div>

              </div>

              {/* BOUTONS D'ACTION DU MODAL (MASQUÉS À L'IMPRESSION) */}
              <div className="print:hidden flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-border/60">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push("/dashboard/waste")}
                  className="w-full sm:w-auto text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour au registre des déchets
                </Button>
                
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadPdf}
                    className="gap-1.5 text-xs text-[#1B5C2E] border-[#1B5C2E]/30 hover:bg-[#1B5C2E]/10"
                  >
                    <Download className="h-3.5 w-3.5" /> Télécharger l&apos;Attestation (PDF)
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handlePrint}
                    className="gap-1.5 text-xs font-bold bg-[#1B5C2E] hover:bg-[#144723] text-white shadow-sm"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimer pour Signature
                  </Button>
                </div>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
