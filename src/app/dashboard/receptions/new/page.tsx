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

// Composant DCI + Dosage dynamique par produit
function DciDosageList({ value, onChange }: { value: {dci: string, dosage: string}[], onChange: (v: {dci: string, dosage: string}[]) => void }) {
  const addRow = () => onChange([...value, { dci: '', dosage: '' }])
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: 'dci' | 'dosage', val: string) => {
    const updated = value.map((row, idx) => idx === i ? { ...row, [field]: val.toUpperCase() } : row)
    onChange(updated)
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/80">DCI / Dosage</span>
        <Button type="button" size="sm" variant="outline" onClick={addRow} className="h-6 px-2 text-xs gap-1">
          <Plus className="h-3 w-3" /> DCI
        </Button>
      </div>
      {value.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <UppercaseInput
            placeholder=""
            value={row.dci}
            onChange={(e) => updateRow(i, 'dci', e.target.value)}
            className="flex-1 text-xs h-9"
          />
          <UppercaseInput
            placeholder=""
            value={row.dosage}
            onChange={(e) => updateRow(i, 'dosage', e.target.value)}
            className="w-28 text-xs h-9"
          />
          {value.length > 1 && (
            <Button type="button" size="icon" variant="ghost" onClick={() => removeRow(i)} className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}

const DEFAULT_VALIDATORS = [
  { id: 'v1', name: 'Dr. Kadia BARRY (Responsable Qualité)' },
  { id: 'v2', name: 'Dr. Moussa TRAORÉ (Pharmacien Inspecteur)' },
  { id: 'v3', name: 'Dr. Chantal HOUENOU (Directeur ABMed)' },
  { id: 'v4', name: 'Dr. Paul AGOSSA (Responsable Stock)' },
  { id: 'v5', name: 'Jean DUPONT (Inspecteur Général)' },
]

export default function NewReceptionPage() {
  // État local pour les listes DCI/Dosage par produit (index échantillon -> tableau)
  const [dciLists, setDciLists] = React.useState<{dci: string, dosage: string}[][]>([[{ dci: '', dosage: '' }]])
  const [isSaving, setIsSaving] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string, url: string, type: string, size?: string }>>([])
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [validators, setValidators] = useState<{id: string, name: string}[]>(DEFAULT_VALIDATORS)
  const [autoSaveTime, setAutoSaveTime] = useState<string | null>(null)
  const AUTO_SAVE_KEY = 'reception_form_autosave'

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
      inspector: "Marie ADANDE",
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

  // ─── Chargement d'une réception existante ──────────────────────────────
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const editId = searchParams?.get("id")

  React.useEffect(() => {
    if (!editId) return

    async function loadExistingReception() {
      try {
        let sourceData: any = null
        let savedDciLists: any = null

        // 1. Tenter depuis localStorage d'abord (détails complets avec DCI multiples)
        try {
          const rawDetails = localStorage.getItem('reception_draft_details_' + editId)
          if (rawDetails) {
            const parsed = JSON.parse(rawDetails)
            sourceData = parsed.formData
            savedDciLists = parsed.dciLists
          }
        } catch (e) {}

        // 2. Sinon tenter depuis Supabase
        if (!sourceData) {
          const { data } = await supabase
            .from('receptions')
            .select('*')
            .or(`rec_number.eq.${editId},id.eq.${editId}`)
            .maybeSingle()
          
          if (data) {
            sourceData = data
            // Charger les échantillons Supabase associés
            const { data: sData } = await supabase
              .from('samples')
              .select('*')
              .eq('reception_ref', data.rec_number)
            
            if (sData && sData.length > 0) {
              sourceData.samples = sData.map(s => ({
                commercial_name: s.commercial_name || "",
                dci: s.dci || "",
                form: s.form || "",
                dosage: s.dosage || "",
                batch: s.batch_number || "",
                exp_date: s.expiry_date || "",
                qty: s.quantity || 1,
                unit: s.unit || "",
                category: s.category || "",
              }))
            }
          }
        }

        // 3. Pré-remplir le formulaire avec les données restaurées
        if (sourceData) {
          form.reset({
            rec_number: sourceData.rec_number || editId,
            date_reception: sourceData.date_reception || new Date().toISOString().split('T')[0],
            time_reception: sourceData.time_reception || "12:00",
            ref_document: sourceData.ref_document || "",
            type_reception: sourceData.type_reception || "",
            inspector: sourceData.inspector || "Marie ADANDE",
            supplier: sourceData.supplier || "",
            manufacturer: sourceData.manufacturer || "",
            country: sourceData.country || "",
            contact_person: sourceData.contact_person || "",
            phone: sourceData.phone || "",
            check_packaging: !!sourceData.check_packaging,
            check_boxes: !!sourceData.check_boxes,
            check_seals: !!sourceData.check_seals,
            check_qty: !!sourceData.check_qty,
            check_conform: !!sourceData.check_conform,
            anomalies: sourceData.anomalies || "",
            measures: sourceData.measures || "",
            validator_name: sourceData.validator_name || "",
            validation_date: sourceData.validation_date || "",
            samples: sourceData.samples && sourceData.samples.length > 0
              ? sourceData.samples
              : [{ commercial_name: "", dci: "", category: "", batch: "", exp_date: "", qty: 1 }],
          })

          if (savedDciLists) {
            setDciLists(savedDciLists)
          } else if (sourceData.samples && sourceData.samples.length > 0) {
            const rebuilt = sourceData.samples.map((s: any) => {
              const dciParts = (s.dci || '').split(' / ')
              const dosageParts = (s.dosage || '').split(' / ')
              return dciParts.map((d: string, idx: number) => ({
                dci: d || '',
                dosage: dosageParts[idx] || ''
              }))
            })
            setDciLists(rebuilt)
          }

          toast.success(`Réception ${editId} chargée`)
        }
      } catch (err) {
        console.warn("Erreur chargement réception à modifier:", err)
      }
    }

    loadExistingReception()
  }, [editId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Insertion & Persistance des détails ──────────────────────────────────
  const saveReceptionToSupabase = async (status: string) => {
    const values = form.getValues()
    
    // Sauvegarder les détails complets du formulaire pour restauration exacte
    try {
      localStorage.setItem('reception_draft_details_' + values.rec_number, JSON.stringify({
        formData: values,
        dciLists: dciLists,
        status: status,
      }))
    } catch (e) {}

    const fullPayload: any = {
      rec_number: values.rec_number,
      date_reception: values.date_reception || new Date().toISOString().split('T')[0],
      time_reception: values.time_reception || new Date().toTimeString().substring(0, 5),
      ref_document: values.ref_document || null,
      type_reception: values.type_reception || null,
      inspector: values.inspector || "Marie ADANDE",
      status: status,
      supplier: values.supplier || null,
      manufacturer: values.manufacturer || null,
      country: values.country || null,
      city: values.city || null,
      contact_person: values.contact_person || null,
      phone: values.phone || null,
      check_packaging: values.check_packaging || false,
      check_boxes: values.check_boxes || false,
      check_seals: values.check_seals || false,
      check_qty: values.check_qty || false,
      check_docs: values.check_docs || false,
      check_damage: values.check_damage || false,
      check_conform: values.check_conform || false,
      anomalies: values.anomalies || null,
      measures: values.measures || null,
      validator_name: values.validator_name || null,
      validation_date: values.validation_date || null,
    }

    // Toujours persister dans l'historique local pour affichage garanti dans l'historique
    try {
      const existingHistory = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
      const newRecord = {
        id: values.rec_number,
        rec_number: values.rec_number,
        date_reception: values.date_reception || new Date().toISOString().split('T')[0],
        supplier: values.supplier || "DEMANDEUR NON PRÉCISÉ",
        status: status,
        inspector: values.inspector || "Marie ADANDE",
        created_at: new Date().toISOString(),
        samples: [{ count: (values.samples || []).filter(s => s.commercial_name && s.commercial_name.trim() !== "").length }],
      }
      const filteredHistory = existingHistory.filter((r: any) => r.rec_number !== values.rec_number)
      localStorage.setItem('reception_history_records', JSON.stringify([newRecord, ...filteredHistory]))
    } catch (e) {
      console.warn("Erreur sauvegarde locale historique:", e)
    }

    let { error } = await supabase.from('receptions').insert(fullPayload)

    // Si l'insertion complète échoue (ex: colonne distante absente), retry minimal
    if (error) {
      console.warn("Échec insertion complète, tentative avec payload minimal:", error.message)
      const minimalPayload = {
        rec_number: values.rec_number,
        date_reception: values.date_reception || new Date().toISOString().split('T')[0],
        supplier: values.supplier || "DEMANDEUR NON PRÉCISÉ",
        status: status,
        inspector: values.inspector || "Marie ADANDE",
      }
      await supabase.from('receptions').insert(minimalPayload)
    }

    // Insérer les échantillons valides
    const validSamples = (values.samples || []).filter(s => s.commercial_name && s.commercial_name.trim() !== "")
    if (validSamples.length > 0) {
      try {
        const samplesToInsert = validSamples.map(sample => ({
          sample_number: `ECH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          reception_ref: values.rec_number,
          commercial_name: sample.commercial_name,
          dci: sample.dci || null,
          form: sample.form || null,
          dosage: sample.dosage || null,
          batch_number: sample.batch || null,
          expiry_date: sample.exp_date || null,
          quantity: sample.qty || 1,
          unit: sample.unit || null,
          category: sample.category || null,
          status: 'À localiser'
        }))
        await supabase.from('samples').insert(samplesToInsert)
      } catch (sErr) {
        console.warn("Erreur insertion échantillons:", sErr)
      }
    }
  }

  // ─── Sauvegarder en cours (Brouillon) ─────────────────────────────────────
  const onDraft = async () => {
    setIsDrafting(true)
    const toastId = toast.loading("Sauvegarde en cours...")
    try {
      await saveReceptionToSupabase("En cours")
      localStorage.removeItem(AUTO_SAVE_KEY)
      toast.success("Réception sauvegardée en cours avec succès !", { id: toastId, duration: 3000 })
      router.push("/dashboard/receptions")
      setTimeout(() => { window.location.href = "/dashboard/receptions" }, 300)
    } catch (err: any) {
      console.error(err)
      toast.error(`Erreur : ${err.message || "Impossible de sauvegarder la réception."}`, { id: toastId })
    } finally {
      setIsDrafting(false)
    }
  }

  // ─── Soumettre la réception pour validation ───────────────────────────────
  const onSubmit = async () => {
    setIsSaving(true)
    const toastId = toast.loading("Soumission en cours...")
    try {
      await saveReceptionToSupabase("En attente de validation")
      localStorage.removeItem(AUTO_SAVE_KEY)
      toast.success("Réception soumise avec succès !", { id: toastId, duration: 3000 })
      router.push("/dashboard/receptions")
      setTimeout(() => { window.location.href = "/dashboard/receptions" }, 300)
    } catch (err: any) {
      console.error(err)
      toast.error(`Erreur : ${err.message || "Impossible de soumettre la réception."}`, { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Validation officielle par le responsable ──────────────────────────────
  const onValidateByValidator = async () => {
    setIsSaving(true)
    const toastId = toast.loading("Validation en cours...")
    try {
      await saveReceptionToSupabase("Validée")
      localStorage.removeItem(AUTO_SAVE_KEY)
      toast.success("Réception validée avec succès ! (Statut: Finalisé)", { id: toastId, duration: 3000 })
      router.push("/dashboard/receptions")
      setTimeout(() => { window.location.href = "/dashboard/receptions" }, 300)
    } catch (err: any) {
      console.error(err)
      toast.error(`Erreur : ${err.message || "Impossible de valider la réception."}`, { id: toastId })
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out max-w-[1400px] mx-auto pb-10 -mt-4">
      
      {/* BARRE D'ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5 bg-card/90 backdrop-blur-md p-3.5 rounded-xl border border-border/60 shadow-xs">
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
          <Button type="button" onClick={() => onSubmit()} disabled={isSaving} className="shadow-md bg-[#1B5C2E] hover:bg-[#154824] text-white">
            {isSaving ? "Soumission..." : <><CheckCircle2 className="mr-2 h-4 w-4" /> Soumettre la réception</>}
          </Button>
          <Button type="button" onClick={() => onValidateByValidator()} disabled={isSaving} className="shadow-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
            {isSaving ? "Validation..." : <><ShieldCheck className="mr-2 h-4 w-4" /> Valider la réception</>}
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
                        <SelectItem value="Don">Don</SelectItem>
                        <SelectItem value="Etude">Étude</SelectItem>
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
                  <FormItem><FormLabel>Réf. lettre de transmission</FormLabel><FormControl><UppercaseInput placeholder="" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="inspector" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent de réception</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || "Marie ADANDE"} readOnly disabled className="bg-muted/50 font-bold text-foreground cursor-not-allowed opacity-100" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
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
                    <FormLabel>Demandeur/Donnateur/Objet</FormLabel>
                    <FormControl><UppercaseInput placeholder="" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="manufacturer" render={({ field }) => (
                  <FormItem><FormLabel>Fabricant</FormLabel><FormControl><UppercaseInput {...field} value={field.value ?? ""} /></FormControl></FormItem>
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

          </div>

          {/* 3. CONTRÔLE DE CONFORMITÉ — pleine largeur */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center text-lg"><CheckSquare className="mr-2 h-5 w-5 text-primary" /> 3. Contrôle de conformité</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

                {/* Emballage extérieur */}
                <FormField control={form.control} name="check_packaging" render={({ field }) => (
                  <FormItem className="bg-muted/20 border border-border/50 rounded-xl p-4 flex flex-col gap-3">
                    <FormLabel className="font-semibold text-sm text-foreground">Emballage extérieur</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <span className="text-sm text-muted-foreground">Intact</span>
                    </div>
                  </FormItem>
                )} />

                {/* Conditionnement primaire */}
                <FormField control={form.control} name="check_boxes" render={({ field }) => (
                  <FormItem className="bg-muted/20 border border-border/50 rounded-xl p-4 flex flex-col gap-3">
                    <FormLabel className="font-semibold text-sm text-foreground">Conditionnement primaire</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <span className="text-sm text-muted-foreground">Intact</span>
                    </div>
                  </FormItem>
                )} />

                {/* Aspect général du produit */}
                <FormField control={form.control} name="check_seals" render={({ field }) => (
                  <FormItem className="bg-muted/20 border border-border/50 rounded-xl p-4 flex flex-col gap-3">
                    <FormLabel className="font-semibold text-sm text-foreground">Aspect général du produit</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <span className="text-sm text-muted-foreground">Conforme</span>
                    </div>
                  </FormItem>
                )} />

                {/* Intégrité / état physique */}
                <FormField control={form.control} name="check_qty" render={({ field }) => (
                  <FormItem className="bg-muted/20 border border-border/50 rounded-xl p-4 flex flex-col gap-3">
                    <FormLabel className="font-semibold text-sm text-foreground">Intégrité / état physique</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <span className="text-sm text-muted-foreground">Bonne</span>
                    </div>
                  </FormItem>
                )} />

                {/* Conformité globale */}
                <FormField control={form.control} name="check_conform" render={({ field }) => (
                  <FormItem className="bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400/60 rounded-xl p-4 flex flex-col gap-3">
                    <FormLabel className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Conformité globale</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" /></FormControl>
                      <span className="text-sm font-semibold text-emerald-600">Conforme</span>
                    </div>
                  </FormItem>
                )} />

              </div>

              {/* Anomalies + Mesures */}
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <FormField control={form.control} name="anomalies" render={({ field }) => (
                  <FormItem><FormLabel>Anomalies constatées</FormLabel><FormControl><UppercaseTextarea className="h-16" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="measures" render={({ field }) => (
                  <FormItem><FormLabel>Mesures prises</FormLabel><FormControl><UppercaseTextarea className="h-16" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

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
                        <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">Nom commercial</FormLabel><FormControl><UppercaseInput {...field} value={field.value ?? ""} /></FormControl></FormItem>
                      )} />
                      {/* DCI + Dosage dynamiques */}
                      <DciDosageList
                        value={dciLists[index] || [{ dci: '', dosage: '' }]}
                        onChange={(v) => {
                          const updated = [...dciLists]
                          while (updated.length <= index) updated.push([{ dci: '', dosage: '' }])
                          updated[index] = v
                          setDciLists(updated)
                          // Sérialiser dans les champs dci et dosage
                          form.setValue(`samples.${index}.dci`, v.map(r => r.dci).join(' / '))
                          form.setValue(`samples.${index}.dosage`, v.map(r => r.dosage).join(' / '))
                        }}
                      />
                      <div className="grid sm:grid-cols-2 gap-3">
                        <FormField control={form.control} name={`samples.${index}.category`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-foreground/80">Catégorie de produit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Catégorie de produit" /></SelectTrigger></FormControl>
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
                        <FormField control={form.control} name={`samples.${index}.form`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">Forme galénique</FormLabel><FormControl><UppercaseInput className="h-9 text-xs" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                        )} />
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3">
                        <FormField control={form.control} name={`samples.${index}.batch`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">N° Lot</FormLabel><FormControl><UppercaseInput className="h-9 text-xs" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name={`samples.${index}.exp_date`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">Péremption</FormLabel><FormControl><Input type="date" className="h-9 text-xs" onKeyDown={(e) => e.preventDefault()} onClick={(e) => 'showPicker' in e.currentTarget && (e.currentTarget as any).showPicker()} {...field} value={field.value ?? ""} /></FormControl></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-2">
                          <FormField control={form.control} name={`samples.${index}.qty`} render={({ field }) => (
                            <FormItem><FormLabel className="text-xs font-semibold text-foreground/80">Quantité</FormLabel><FormControl><Input type="number" min="1" className="h-9 text-xs" {...field} value={field.value ?? 1} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name={`samples.${index}.unit`} render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-semibold text-foreground/80">Unité</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Unité" /></SelectTrigger></FormControl>
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
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4 border-dashed border-2 w-full bg-muted/10 hover:bg-muted/30"
                onClick={() => {
                  append({ commercial_name: "", dci: "", category: "", batch: "", exp_date: "", qty: 1 })
                  setDciLists(prev => [...prev, [{ dci: '', dosage: '' }]])
                }}
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
                <FormField control={form.control} name="validator_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsable validation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="overflow-hidden">
                          <SelectValue placeholder="Sélectionner..." className="truncate" />
                        </SelectTrigger>
                      </FormControl>
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
              </CardContent>
            </Card>


          </div>

          {/* BOUTONS EN BAS */}
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onDraft} disabled={isDrafting} className="gap-2">
              <Save className="h-4 w-4" />
              {isDrafting ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
            <Button type="button" onClick={() => onSubmit()} disabled={isSaving} className="gap-2 shadow-md bg-[#1B5C2E] hover:bg-[#154824] text-white">
              {isSaving ? "Soumission..." : <><CheckCircle2 className="h-4 w-4" /> Soumettre la réception</>}
            </Button>
            <Button type="button" onClick={() => onValidateByValidator()} disabled={isSaving} className="gap-2 shadow-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
              {isSaving ? "Validation..." : <><ShieldCheck className="h-4 w-4" /> Valider la réception</>}
            </Button>
          </div>

        </form>
      </Form>
    </div>
  )
}
