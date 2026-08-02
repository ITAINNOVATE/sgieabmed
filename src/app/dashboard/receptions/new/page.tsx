"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

import { 
  ArrowLeft, Save, Building2, FileSignature, Truck, CheckSquare, 
  Box, Paperclip, ShieldCheck, MessageSquare, Plus, Trash2, Printer, Download, UploadCloud, CheckCircle2, X
} from "lucide-react"
import { exportReceptionVoucherPDF } from "@/utils/exportUtils"
import React from 'react'

// --- ZOD SCHEMA ---
const formSchema = z.object({
  // 1. Info Réception
  rec_number: z.string(),
  date_reception: z.string().min(1, "Date requise"),
  time_reception: z.string().min(1, "Heure requise"),
  ref_document: z.string().optional(),
  type_reception: z.string().optional(),
  inspector: z.string().optional(),
  status: z.string(),

  // 2. Provenance
  supplier: z.string().optional(),
  manufacturer: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),

  // 3. Transport
  carrier: z.string().optional(),
  package_number: z.string().optional(),
  total_packages: z.coerce.number().optional(),
  received_packages: z.coerce.number().optional(),
  shipping_date: z.string().optional(),
  arrival_date: z.string().optional(),
  transport_mode: z.string().optional(),

  // 4. Conformité
  check_packaging: z.boolean().default(false),
  check_boxes: z.boolean().default(false),
  check_seals: z.boolean().default(false),
  check_qty: z.boolean().default(false),
  check_docs: z.boolean().default(false),
  check_damage: z.boolean().default(false),
  check_conform: z.boolean().default(false),
  obs_general: z.string().optional(),
  anomalies: z.string().optional(),
  measures: z.string().optional(),

  // 5. Échantillons (Dynamic Array)
  samples: z.array(z.object({
    commercial_name: z.string().optional(),
    dci: z.string().optional(),
    form: z.string().optional(),
    dosage: z.string().optional(),
    presentation: z.string().optional(),
    batch: z.string().optional(),
    mfg_date: z.string().optional(),
    exp_date: z.string().optional(),
    qty: z.coerce.number().min(1).default(1),
    unit: z.string().optional(),
    category: z.string().optional(),
  })).default([]),

  // 7. Validation
  validator_name: z.string().optional(),
  validator_role: z.string().optional(),
  validation_date: z.string().optional(),
  decision: z.string().optional(),
  decision_reason: z.string().optional(),

  // 8. Commentaires
  global_comments: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const UppercaseInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(({ onChange, className, ...props }, ref) => (
  <Input
    ref={ref}
    className={`uppercase ${className || ''}`}
    onChange={(e) => {
      e.target.value = e.target.value.toUpperCase()
      if (onChange) onChange(e)
    }}
    {...props}
  />
))
UppercaseInput.displayName = 'UppercaseInput'

const UppercaseTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<typeof Textarea>>(({ onChange, className, ...props }, ref) => (
  <Textarea
    ref={ref}
    className={`uppercase ${className || ''}`}
    onChange={(e) => {
      e.target.value = e.target.value.toUpperCase()
      if (onChange) onChange(e)
    }}
    {...props}
  />
))
UppercaseTextarea.displayName = 'UppercaseTextarea'

const DEFAULT_VALIDATORS = [
  { id: 'v1', name: 'Dr. Kadia BARRY (Responsable Qualité)' },
  { id: 'v2', name: 'Dr. Moussa TRAORÉ (Pharmacien Inspecteur)' },
  { id: 'v3', name: 'Dr. Chantal HOUENOU (Directeur ABMed)' },
  { id: 'v4', name: 'Dr. Paul AGOSSA (Responsable Stock)' },
  { id: 'v5', name: 'Jean DUPONT (Inspecteur Général)' },
]

export default function NewReceptionPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string, url: string, type: string, size?: string }>>([])
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [validators, setValidators] = useState<{id: string, name: string}[]>(DEFAULT_VALIDATORS)

  React.useEffect(() => {
    async function loadValidators() {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('users').select('id, first_name, last_name').eq('is_active', true)
        if (data && data.length > 0) {
          const dbUsers = data.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))
          setValidators(prev => {
            const combined = [...dbUsers]
            prev.forEach(p => {
              if (!combined.some(c => c.name === p.name)) combined.push(p)
            })
            return combined
          })
        }
      } catch (err) {
        console.warn("Utilisation des responsables par défaut:", err)
      }
    }
    loadValidators()
  }, [])

  const router = useRouter()
  const supabase = createClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      rec_number: "REC-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000),
      date_reception: new Date().toISOString().split('T')[0],
      time_reception: new Date().toTimeString().split(' ')[0].substring(0, 5),
      status: "En attente",
      samples: [{ commercial_name: "", dci: "", category: "", batch: "", exp_date: "", qty: 1 }],
      check_packaging: false,
      check_boxes: false,
      check_seals: false,
      check_qty: false,
      check_docs: false,
      check_damage: false,
      check_conform: false,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "samples",
  })

  // ─── Sauvegarder en brouillon (statut = "Brouillon") ──────────────────────
  const onDraft = async () => {
    setIsDrafting(true)
    const toastId = toast.loading("Sauvegarde en cours...")
    try {
      const values = form.getValues()
      const { error } = await supabase.from('receptions').insert({
        rec_number: values.rec_number,
        date_reception: values.date_reception,
        time_reception: values.time_reception,
        ref_document: values.ref_document || null,
        type_reception: values.type_reception || null,
        inspector: values.inspector || null,
        status: "Brouillon",
        supplier: values.supplier || null,
        manufacturer: values.manufacturer || null,
        country: values.country || null,
        city: values.city || null,
        contact_person: values.contact_person || null,
        phone: values.phone || null,
        carrier: values.carrier || null,
        transport_mode: values.transport_mode || null,
        check_packaging: values.check_packaging,
        check_boxes: values.check_boxes,
        check_seals: values.check_seals,
        check_qty: values.check_qty,
        check_docs: values.check_docs,
        check_damage: values.check_damage,
        check_conform: values.check_conform,
        anomalies: values.anomalies || null,
        measures: values.measures || null,
        global_comments: values.global_comments || null,
      })
      if (error) throw error
      toast.success("Brouillon sauvegardé avec succès !", { id: toastId })
    } catch (err: any) {
      console.error(err)
      toast.error(`Erreur : ${err.message || "Impossible de sauvegarder le brouillon."}`, { id: toastId })
    } finally {
      setIsDrafting(false)
    }
  }

  // ─── Valider la réception ─────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    setIsSaving(true)
    const toastId = toast.loading("Validation en cours...")
    
    try {
      const { error: receptionError } = await supabase.from('receptions').insert({
        rec_number: values.rec_number,
        date_reception: values.date_reception,
        time_reception: values.time_reception,
        ref_document: values.ref_document || null,
        type_reception: values.type_reception || null,
        inspector: values.inspector || null,
        status: "En attente",
        supplier: values.supplier || null,
        manufacturer: values.manufacturer || null,
        country: values.country || null,
        city: values.city || null,
        contact_person: values.contact_person || null,
        phone: values.phone || null,
        email: values.email || null,
        carrier: values.carrier || null,
        package_number: values.package_number || null,
        total_packages: values.total_packages || null,
        received_packages: values.received_packages || null,
        shipping_date: values.shipping_date || null,
        arrival_date: values.arrival_date || null,
        transport_mode: values.transport_mode || null,
        check_packaging: values.check_packaging,
        check_boxes: values.check_boxes,
        check_seals: values.check_seals,
        check_qty: values.check_qty,
        check_docs: values.check_docs,
        check_damage: values.check_damage,
        check_conform: values.check_conform,
        anomalies: values.anomalies || null,
        measures: values.measures || null,
        validator_name: values.validator_name || null,
        validator_role: values.validator_role || null,
        validation_date: values.validation_date || null,
        decision: values.decision || null,
        decision_reason: values.decision_reason || null,
        global_comments: values.global_comments || null,
      })

      if (receptionError) throw receptionError

      // Insérer les échantillons valides (avec au moins un nom)
      const validSamples = (values.samples || []).filter(s => s.commercial_name && s.commercial_name.trim() !== "")
      if (validSamples.length > 0) {
        const samplesToInsert = validSamples.map(sample => ({
          sample_number: `ECH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          reception_ref: values.rec_number,
          commercial_name: sample.commercial_name,
          dci: sample.dci || null,
          form: sample.form || null,
          dosage: sample.dosage || null,
          presentation: sample.presentation || null,
          batch_number: sample.batch || null,
          mfg_date: sample.mfg_date || null,
          expiry_date: sample.exp_date || null,
          quantity: sample.qty || 1,
          unit: sample.unit || null,
          category: sample.category || null,
          status: 'À localiser'
        }))

        const { data: insertedSamples, error: samplesError } = await supabase
          .from('samples')
          .insert(samplesToInsert)
          .select()
        
        if (samplesError) throw samplesError

        if (insertedSamples && insertedSamples.length > 0) {
          const movementsToInsert = insertedSamples.map(sample => ({
            mvt_number: `MVT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
            sample_id: sample.id,
            movement_type: 'Entrée',
            quantity: sample.quantity,
            reason: 'Réception initiale',
            observations: `Création automatique suite à la réception ${values.rec_number}`,
          }))
          const { error: mvtError } = await supabase.from('movements').insert(movementsToInsert)
          if (mvtError) console.error("Erreur mouvements:", mvtError.message)

          if (attachedFiles.length > 0) {
            const firstSampleId = insertedSamples[0].id
            const { data: { user } } = await supabase.auth.getUser()
            const docsToInsert = attachedFiles.map(file => ({
              title: file.name,
              document_type: file.type,
              file_url: file.url,
              sample_id: firstSampleId,
              uploaded_by: user?.id || null,
              version: 1
            }))
            const { error: docError } = await supabase.from('documents').insert(docsToInsert)
            if (docError) console.error("Erreur documents:", docError.message)
          }
        }
      }

      toast.success("Réception validée avec succès !", {
        id: toastId,
        description: validSamples.length > 0
          ? `${validSamples.length} échantillon(s) enregistré(s).`
          : "Aucun échantillon ajouté.",
        duration: 5000,
      })
      router.push("/dashboard/receptions")
    } catch (error: any) {
      console.error("Erreur d'insertion:", error)
      toast.error(`Erreur : ${error.message || "Impossible de valider la réception."}`, { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Upload fichier ───────────────────────────────────────────────────────
  // ─── Upload / Attachement de fichier ──────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    // Calcul de la taille lisible (Ko / Mo)
    const fileSize = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(file.size / 1024)} KB`

    const docType = file.type.includes("pdf") ? "Certificat d'analyse" : 
                    file.name.toLowerCase().includes("bl") || file.name.toLowerCase().includes("bordereau") ? "Bordereau de livraison" :
                    file.name.toLowerCase().includes("facture") ? "Facture" : "Document joint"

    // 1. Mettre à jour immédiatement l'état local avec le fichier sélectionné
    const newFile = {
      name: file.name,
      url: URL.createObjectURL(file),
      type: docType,
      size: fileSize,
    }

    setAttachedFiles(prev => [...prev, newFile])
    toast.success(`Fichier "${file.name}" attaché !`)

    // 2. Synchroniser en arrière-plan avec Supabase Storage
    try {
      setIsUploadingFile(true)
      const recNumber = form.getValues("rec_number")
      const fileExt = file.name.substring(file.name.lastIndexOf('.'))
      const filePath = `receptions/${recNumber}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExt}`
      
      const { data, error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)
      if (!uploadError && data) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
        if (urlData?.publicUrl) {
          setAttachedFiles(prev => prev.map(f => f.name === file.name ? { ...f, url: urlData.publicUrl } : f))
        }
      }
    } catch (err: any) {
      console.warn("Stockage distant non disponible, fichier conservé localement:", err)
    } finally {
      setIsUploadingFile(false)
      // Réinitialiser le champ input file pour ré-attacher si besoin
      e.target.value = ""
    }
  }

  // ─── Export PDF ───────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    try {
      const values = form.getValues()
      exportReceptionVoucherPDF(values, values.samples || [])
      toast.success("PDF généré avec succès !")
    } catch (err: any) {
      console.error(err)
      toast.error(`Erreur PDF : ${err.message || "Impossible de générer le PDF."}`)
    }
  }

  const handlePrint = () => window.print()

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-[1400px] mx-auto pb-20">
      
      {/* BARRE D'ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm sticky top-20 z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0 rounded-full">
            <Link href="/dashboard/receptions"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Nouvelle Réception</h2>
            <p className="text-muted-foreground text-xs">Formulaire de contrôle et d'enregistrement</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button type="button" variant="ghost" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer
          </Button>
          <Button type="button" variant="ghost" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button type="button" variant="secondary" onClick={onDraft} disabled={isDrafting}>
            <Save className="mr-2 h-4 w-4" />
            {isDrafting ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="shadow-md">
            {isSaving ? "Validation..." : <><CheckCircle2 className="mr-2 h-4 w-4" /> Valider la réception</>}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* 1. INFORMATIONS DE LA RÉCEPTION */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><FileSignature className="mr-2 h-5 w-5 text-primary" /> 1. Informations de la réception</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
                <FormField control={form.control} name="rec_number" render={({ field }) => (
                  <FormItem><FormLabel>N° Réception</FormLabel><FormControl><UppercaseInput {...field} disabled className="bg-muted/50 font-mono" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="type_reception" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de demande</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Enregistrement">Enregistrement</SelectItem>
                        <SelectItem value="Renouvellement">Renouvellement</SelectItem>
                        <SelectItem value="Variation">Variation</SelectItem>
                        <SelectItem value="Inspection">Inspection</SelectItem>
                        <SelectItem value="Controle qualite">Contrôle qualité</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date_reception" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" onKeyDown={(e) => e.preventDefault()} onClick={(e) => 'showPicker' in e.currentTarget && (e.currentTarget as any).showPicker()} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="time_reception" render={({ field }) => (
                  <FormItem><FormLabel>Heure</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ref_document" render={({ field }) => (
                  <FormItem><FormLabel>Réf. Document (BL, Facture...)</FormLabel><FormControl><UppercaseInput placeholder="BL-2026-..." {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="inspector" render={({ field }) => (
                  <FormItem><FormLabel>Inspecteur / Agent</FormLabel><FormControl><UppercaseInput {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            {/* 2. PROVENANCE */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><Building2 className="mr-2 h-5 w-5 text-primary" /> 2. Provenance</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
                <FormField control={form.control} name="supplier" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Fournisseur / Laboratoire</FormLabel>
                    <FormControl><UppercaseInput placeholder="Nom du fournisseur..." {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="manufacturer" render={({ field }) => (
                  <FormItem><FormLabel>Fabricant (si différent)</FormLabel><FormControl><UppercaseInput {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Pays d'origine</FormLabel><FormControl><UppercaseInput {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="contact_person" render={({ field }) => (
                  <FormItem><FormLabel>Personne de contact</FormLabel><FormControl><UppercaseInput {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Téléphone</FormLabel><FormControl><UppercaseInput {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
              </CardContent>
            </Card>

            {/* 3. TRANSPORT */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><Truck className="mr-2 h-5 w-5 text-primary" /> 3. Informations sur le transport</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
                <FormField control={form.control} name="carrier" render={({ field }) => (
                  <FormItem><FormLabel>Transporteur</FormLabel><FormControl><UppercaseInput placeholder="Ex: DHL, Interne..." {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="transport_mode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moyen de transport</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Aerien">Aérien</SelectItem>
                        <SelectItem value="Terrestre">Terrestre (Camion frigorifique)</SelectItem>
                        <SelectItem value="Maritime">Maritime</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="package_number" render={({ field }) => (
                  <FormItem><FormLabel>N° de colis (Tracking)</FormLabel><FormControl><UppercaseInput {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <div className="flex gap-4">
                  <FormField control={form.control} name="received_packages" render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Colis Reçus</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="total_packages" render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Colis Total</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* 4. CONFORMITÉ */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><CheckSquare className="mr-2 h-5 w-5 text-primary" /> 4. Contrôle de conformité</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-3 bg-muted/20 p-4 rounded-lg border border-border/50">
                  {[
                    { name: "check_packaging", label: "Emballage intact" },
                    { name: "check_boxes", label: "Colis conformes" },
                    { name: "check_seals", label: "Scellés conformes" },
                    { name: "check_qty", label: "Quantité conforme" },
                    { name: "check_docs", label: "Documents conformes" },
                    { name: "check_damage", label: "Aucun dommage constaté" },
                  ].map((chk) => (
                    <FormField key={chk.name} control={form.control} name={chk.name as any} render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">{chk.label}</FormLabel>
                      </FormItem>
                    )} />
                  ))}
                  <FormField control={form.control} name="check_conform" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 col-span-2 pt-2 border-t border-border/50 mt-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" /></FormControl>
                      <FormLabel className="font-bold text-emerald-600 cursor-pointer">RÉCEPTION GLOBALE CONFORME</FormLabel>
                    </FormItem>
                  )} />
                </div>
                <div className="space-y-3">
                  <FormField control={form.control} name="anomalies" render={({ field }) => (
                    <FormItem><FormLabel>Anomalies constatées</FormLabel><FormControl><UppercaseTextarea className="h-16" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="measures" render={({ field }) => (
                    <FormItem><FormLabel>Mesures prises</FormLabel><FormControl><UppercaseTextarea className="h-16" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* 5. ÉCHANTILLONS REÇUS */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-primary/5 border-b border-border/50 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center text-lg"><Box className="mr-2 h-5 w-5 text-primary" /> 5. Échantillons reçus</CardTitle>
                  <CardDescription className="mt-1">Saisie multiple des produits contenus dans cette réception.</CardDescription>
                </div>
                <Badge variant="outline" className="text-sm px-3 py-1 bg-background">Total : {fields.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {fields.map((item, index) => (
                  <div key={item.id} className="p-4 border border-border/50 bg-muted/10 rounded-xl space-y-4 relative">
                    <div className="flex justify-between items-center pb-2 border-b border-sidebar-border/30">
                      <span className="font-bold text-xs text-muted-foreground">Produit #{index + 1}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid gap-3">
                      <FormField control={form.control} name={`samples.${index}.commercial_name`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">Nom commercial</FormLabel><FormControl><UppercaseInput placeholder="Nom commercial..." {...field} value={field.value ?? ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`samples.${index}.dci`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">DCI</FormLabel><FormControl><UppercaseInput placeholder="DCI..." {...field} value={field.value ?? ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`samples.${index}.category`} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-foreground/80">Catégorie de produit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Catégorie de produit" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="Médicaments conventionnels">Médicaments conventionnels</SelectItem>
                              <SelectItem value="Vaccins et Sérums">Vaccins et Sérums</SelectItem>
                              <SelectItem value="Médicaments à base de plantes">Médicaments à base de plantes</SelectItem>
                              <SelectItem value="Compléments nutritionnels">Compléments nutritionnels</SelectItem>
                              <SelectItem value="Dispositifs médicaux">Dispositifs médicaux</SelectItem>
                              <SelectItem value="Produits cosmétiques">Produits cosmétiques</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name={`samples.${index}.form`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">Forme</FormLabel><FormControl><UppercaseInput placeholder="Ex: Comprimé..." {...field} value={field.value ?? ""} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name={`samples.${index}.dosage`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">Dosage</FormLabel><FormControl><UppercaseInput placeholder="Ex: 500mg..." {...field} value={field.value ?? ""} /></FormControl></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name={`samples.${index}.batch`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">N° Lot</FormLabel><FormControl><UppercaseInput placeholder="Lot N°..." {...field} value={field.value ?? ""} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name={`samples.${index}.exp_date`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">Péremption</FormLabel><FormControl><Input type="date" onKeyDown={(e) => e.preventDefault()} onClick={(e) => 'showPicker' in e.currentTarget && (e.currentTarget as any).showPicker()} {...field} value={field.value ?? ""} /></FormControl></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name={`samples.${index}.qty`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">Quantité</FormLabel><FormControl><Input type="number" min="1" {...field} value={field.value ?? 1} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name={`samples.${index}.unit`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-foreground/80">Unité</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl><SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Unité" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="Boite">Boîte</SelectItem>
                                <SelectItem value="Flacon">Flacon</SelectItem>
                                <SelectItem value="Ampoule">Ampoule</SelectItem>
                                <SelectItem value="Seringue">Seringue</SelectItem>
                                <SelectItem value="Sachet">Sachet</SelectItem>
                                <SelectItem value="Tube">Tube</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4 border-dashed border-2 w-full bg-muted/10 hover:bg-muted/30"
                onClick={() => append({ commercial_name: "", dci: "", category: "", batch: "", exp_date: "", qty: 1 })}
              >
                <Plus className="mr-2 h-4 w-4" /> Ajouter un produit à cette réception
              </Button>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* 6. DOCUMENTS JOINTS */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><Paperclip className="mr-2 h-5 w-5 text-primary" /> 6. Documents joints</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="relative border-2 border-dashed border-border/50 rounded-xl p-6 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground hover:bg-muted/20 transition-colors cursor-pointer">
                  <UploadCloud className="h-8 w-8 mb-2 text-primary/50" />
                  <p className="font-medium text-foreground text-sm">Sélectionnez un fichier à joindre</p>
                  <p className="text-xs mt-0.5 mb-3">BL, Facture, Certificats d'analyse (PDF, JPG, PNG)</p>
                  <input 
                    type="file" 
                    id="reception-file-input"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    disabled={isUploadingFile}
                  />
                  <Button type="button" variant="secondary" size="sm" disabled={isUploadingFile}>
                    {isUploadingFile ? "Téléversement..." : "Parcourir"}
                  </Button>
                </div>
                
                {attachedFiles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <span>Fichiers rattachés ({attachedFiles.length}) :</span>
                      <span className="text-[11px] text-[#1B5C2E] font-semibold">✓ Document(s) validé(s)</span>
                    </div>
                    <div className="space-y-2 border border-border/70 rounded-xl p-2.5 bg-muted/20">
                      {attachedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-card shadow-2xs text-xs gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E] shrink-0">
                              <Paperclip className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-foreground truncate">{file.name}</span>
                              <span className="text-[10px] text-muted-foreground">{file.size || "Fichier joint"} • Ready</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-[10px] bg-background border-border text-foreground font-medium hidden sm:inline-flex">
                              {file.type}
                            </Badge>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-bold gap-1"
                              onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Supprimer</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 7. VALIDATION */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><ShieldCheck className="mr-2 h-5 w-5 text-primary" /> 7. Validation Officielle</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="validator_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsable validation</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {validators.map(v => (
                            <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="validation_date" render={({ field }) => (
                    <FormItem><FormLabel>Date de validation</FormLabel><FormControl><Input type="date" onKeyDown={(e) => e.preventDefault()} onClick={(e) => 'showPicker' in e.currentTarget && (e.currentTarget as any).showPicker()} {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="decision" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Décision finale</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une décision" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Acceptée">Acceptée</SelectItem>
                        <SelectItem value="Acceptée avec réserve">Acceptée avec réserve</SelectItem>
                        <SelectItem value="Rejetée">Rejetée</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                {(form.watch("decision") === "Rejetée" || form.watch("decision") === "Acceptée avec réserve") && (
                  <FormField control={form.control} name="decision_reason" render={({ field }) => (
                    <FormItem><FormLabel className="text-destructive">Motif (Obligatoire)</FormLabel><FormControl><UppercaseTextarea className="border-destructive/50" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
              </CardContent>
            </Card>

            {/* 8. COMMENTAIRES */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><MessageSquare className="mr-2 h-5 w-5 text-primary" /> 8. Commentaires généraux</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <FormField control={form.control} name="global_comments" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observations complémentaires</FormLabel>
                    <FormControl><UppercaseTextarea placeholder="Notes libres relatives à cette réception..." className="min-h-[150px]" {...field} value={field.value ?? ""} /></FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

          </div>
        </form>
      </Form>
    </div>
  )
}
