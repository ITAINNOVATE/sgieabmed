"use client"

import { useState, useEffect, useRef } from "react"
import { useForm, useFieldArray } from "react-hook-form"
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
  FileText, Printer, Download, CheckCircle2, ShieldCheck, MapPin, 
  Plus, Layers, Scale, Sparkles, Eye, Pencil, Paperclip, FileUp, FileSpreadsheet, FileCheck, X
} from "lucide-react"

import { createClient } from "@/utils/supabase/client"
import { exportWasteReceptionSlipPDF } from "@/utils/exportUtils"
import { WASTE_ZONES, normalizeWasteLocation } from "@/utils/waste-locations"
import { AttachedWasteDocument, WasteArchivedDocument, WASTE_DOCUMENT_TYPES } from "@/types/waste-documents"

// Schéma pour une ligne individuelle de déchet
const wasteItemSchema = z.object({
  batch_number: z.string().min(1, "N° de lot déchet requis"),
  waste_type: z.string().min(1, "Type de déchet requis"),
  commercial_name: z.string().optional(),
  sample_id: z.string().optional(),
  original_batch: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Quantité ou poids invalide"),
  unit: z.string().min(1, "Unité requise"),
  packaging: z.string().min(1, "Type de conditionnement requis"),
  packaging_condition: z.string().min(1, "État du colisage requis"),
  current_location: z.string().min(1, "Localisation requise"),
  destruction_motive: z.string().min(1, "Motif de destruction requis"),
  observations: z.string().optional(),
})

const formSchema = z.object({
  // 1. Informations Générales de Réception
  reception_number: z.string().min(1, "N° de réception requis"),
  reception_date: z.string().min(1, "Date de réception requise"),
  reception_time: z.string().min(1, "Heure requise"),
  delivery_slip_ref: z.string().optional(),
  recipient_agent: z.string().min(1, "Agent récepteur requis"),

  // 2. Structure Déposante / Provenance (Saisie une seule fois pour tout le dépôt)
  source_structure: z.string().min(2, "Le nom de la structure apportrice est requis"),
  source_type: z.string().min(1, "Type de structure requis"),
  city: z.string().optional(),
  depositor_name: z.string().min(2, "Nom de la personne ayant apporté les déchets requis"),
  depositor_phone: z.string().min(6, "Numéro de téléphone requis"),
  depositor_id_card: z.string().optional(),

  // 3. Liste dynamique des Déchets apportés
  waste_items: z.array(wasteItemSchema).min(1, "Veuillez renseigner au moins un déchet"),
})

type FormValues = z.infer<typeof formSchema>

export default function NewWasteReceptionPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [samples, setSamples] = useState<any[]>([])
  const [savedSlipData, setSavedSlipData] = useState<any | null>(null)
  const [showSlipModal, setShowSlipModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewData, setPreviewData] = useState<any | null>(null)
  const [baseLotPrefix, setBaseLotPrefix] = useState("")
  const [attachedDocs, setAttachedDocs] = useState<AttachedWasteDocument[]>([])
  const [docTitle, setDocTitle] = useState<string>("")
  const [docDescription, setDocDescription] = useState<string>("")
  const [pendingFile, setPendingFile] = useState<{ name: string; size: string; type: string; base64: string } | null>(null)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      city: "",
      depositor_name: "",
      depositor_phone: "",
      depositor_id_card: "",

      waste_items: [
        {
          batch_number: "",
          waste_type: "Médicaments périmés (Formes solides)",
          commercial_name: "",
          sample_id: "none",
          original_batch: "",
          quantity: 1,
          unit: "Kg",
          packaging: "Cartons fermés & scotchés",
          packaging_condition: "Conforme et scellé",
          current_location: WASTE_ZONES[0].fullLocation,
          destruction_motive: "Péremption",
          observations: "",
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "waste_items",
  })

  useEffect(() => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const year = new Date().getFullYear()
    const recNum = `REC-DECH-${year}-${randomSuffix}`
    const prefix = `DEC-${year}-${Math.floor(10000 + Math.random() * 90000)}`
    
    setBaseLotPrefix(prefix)
    form.setValue("reception_number", recNum)
    form.setValue("waste_items.0.batch_number", `${prefix}-1`)

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

  // Ajout d'une nouvelle ligne de déchet avec N° de lot incrémenté
  const handleAddWasteItem = () => {
    const nextIndex = fields.length + 1
    const prefix = baseLotPrefix || `DEC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
    append({
      batch_number: `${prefix}-${nextIndex}`,
      waste_type: "Médicaments périmés (Formes solides)",
      commercial_name: "",
      sample_id: "none",
      original_batch: "",
      quantity: 1,
      unit: "Kg",
      packaging: "Cartons fermés & scotchés",
      packaging_condition: "Conforme et scellé",
      current_location: WASTE_ZONES[0].fullLocation,
      destruction_motive: "Péremption",
      observations: "",
    })
    toast.success(`Nouveau déchet (#${nextIndex}) ajouté au bordereau`)
  }

  // Calcul du poids/quantité totale
  const watchedItems = form.watch("waste_items") || []
  const totalQuantity = watchedItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)

  // Sélection et lecture du fichier d'une pièce justificative
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    // Limite de taille max : 10 Mo
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier sélectionné dépasse la taille limite autorisée de 10 Mo.")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setIsUploadingDoc(true)
    const reader = new FileReader()
    reader.onload = () => {
      const base64Data = reader.result as string
      const sizeFormatted = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo` 
        : `${Math.round(file.size / 1024)} Ko`

      setPendingFile({
        name: file.name,
        size: sizeFormatted,
        type: file.type || file.name.split('.').pop()?.toUpperCase() || "Fichier",
        base64: base64Data,
      })

      // Pré-remplir automatiquement le titre si le champ est encore vide
      if (!docTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
        setDocTitle(cleanName)
      }

      setIsUploadingDoc(false)
      toast.info(`Fichier sélectionné : ${file.name}`)
    }
    reader.onerror = () => {
      setIsUploadingDoc(false)
      toast.error("Erreur lors de la lecture du fichier.")
    }
    reader.readAsDataURL(file)
  }

  // Ajout du document à la liste des pièces rattachées
  const handleAddAttachedDoc = () => {
    if (!pendingFile) {
      // Si aucun fichier n'a été choisi, ouvrir directement le sélecteur
      fileInputRef.current?.click()
      return
    }

    const titleToUse = docTitle.trim() || pendingFile.name

    const newDoc: AttachedWasteDocument = {
      id: `att-doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      file_name: pendingFile.name,
      file_size: pendingFile.size,
      file_size_formatted: pendingFile.size,
      file_type: pendingFile.type,
      title: titleToUse,
      doc_type: titleToUse,
      document_type: titleToUse,
      description: docDescription.trim() || undefined,
      file_data: pendingFile.base64,
      data_url: pendingFile.base64,
      uploaded_at: new Date().toISOString(),
    }

    setAttachedDocs(prev => [...prev, newDoc])
    setDocTitle("")
    setDocDescription("")
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    toast.success(`Document « ${titleToUse} » ajouté. Vous pouvez en ajouter d'autres.`)
  }

  const handleRemoveDoc = (id: string) => {
    setAttachedDocs(prev => prev.filter(d => d.id !== id))
    toast.info("Document retiré.")
  }

  // 1. Valider la saisie et ouvrir la fenêtre de prévisualisation
  const handleOpenPreview = async () => {
    const isValid = await form.trigger()
    if (!isValid) {
      toast.error("Veuillez remplir correctement tous les champs obligatoires avant de prévisualiser.")
      return
    }

    const values = form.getValues()
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
      attachedDocs: attachedDocs,
      general_observations: `Dépôt de ${values.waste_items.length} catégorie(s) de déchets pour un total de ${totalQuantity.toFixed(2)} ${values.waste_items[0]?.unit || 'Kg'}`,
      items: values.waste_items.map((item) => {
        const s = samples.find((x) => x.id === item.sample_id)
        return {
          batch_number: item.batch_number,
          waste_type: item.waste_type,
          commercial_name: item.commercial_name || (s ? s.commercial_name : ""),
          original_batch: item.original_batch || (s ? s.batch_number : ""),
          quantity: item.quantity,
          unit: item.unit,
          packaging: item.packaging,
          packaging_condition: item.packaging_condition,
          destruction_motive: item.destruction_motive,
          location: item.current_location,
          observations: item.observations,
        }
      }),
    }

    setPreviewData(slipPayload)
    setShowPreviewModal(true)
  }

  // 2. Confirmer et enregistrer définitivement après vérification de l'aperçu
  const handleConfirmSave = async () => {
    if (!previewData) return
    setIsSaving(true)

    try {
      const values = form.getValues()
      const timestamp = Date.now()
      const newBatches = values.waste_items.map((item, idx) => {
        const selectedSample = samples.find((s) => s.id === item.sample_id)
        return {
          id: `batch-${timestamp}-${idx}`,
          batch_number: item.batch_number,
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

          waste_type: item.waste_type,
          commercial_name: item.commercial_name || (selectedSample ? selectedSample.commercial_name : "Divers produits pharmaceutiques"),
          original_batch: item.original_batch || (selectedSample ? selectedSample.batch_number : ""),
          sample_id: item.sample_id && item.sample_id !== "none" ? item.sample_id : null,
          sample: selectedSample
            ? {
                commercial_name: selectedSample.commercial_name,
                batch_number: selectedSample.batch_number,
              }
            : null,
          quantity: item.quantity,
          unit: item.unit,
          packaging: item.packaging,
          packaging_condition: item.packaging_condition,
          destruction_motive: item.destruction_motive,
          current_location: item.current_location || "MAGASIN DES DECHETS",
          status: "Déclaré",
          observations: item.observations || "",
          created_at: new Date().toISOString(),
          creator: { first_name: "Marie", last_name: "ADANDE" },
        }
      })

      const newMvts = newBatches.map((b) => ({
        id: `mvt-rec-${b.batch_number}`,
        mvt_number: `MVT-REC-${b.batch_number.replace('DEC-', '')}`,
        date: `${values.reception_date}T${values.reception_time || '08:00'}:00.000Z`,
        type: 'Entrée au local déchet',
        batch: b.batch_number,
        waste_type: b.waste_type,
        commercial_name: b.commercial_name,
        quantity: `${b.quantity} ${b.unit}`,
        operator: values.recipient_agent || 'Marie ADANDE',
        destination: b.current_location,
        origin: `${values.source_structure} (${values.depositor_name})`,
        reception_number: values.reception_number,
        source_structure: values.source_structure,
        depositor_name: values.depositor_name,
        signature_hash: `SIG-REC-${b.batch_number.replace('DEC-', '')}`,
      }))

      // 1. Sauvegarde locale garantie pour tous les lots et traçabilité des mouvements
      try {
        localStorage.removeItem('all_data_wiped')
        const stored = localStorage.getItem("waste_batches_custom_v1")
        const currentList = stored ? JSON.parse(stored) : []
        localStorage.setItem("waste_batches_custom_v1", JSON.stringify([...newBatches, ...currentList]))

        // Journal des mouvements de déchets
        const currentMvts = JSON.parse(localStorage.getItem("waste_movements_custom_v1") || "[]")
        localStorage.setItem("waste_movements_custom_v1", JSON.stringify([...newMvts, ...currentMvts]))

        // Enregistrement des documents pour la traçabilité dans le sous-module Documentation Déchets
        const storedDocs: WasteArchivedDocument[] = JSON.parse(localStorage.getItem("waste_documents_custom_v1") || "[]")
        const newArchivedDocs: WasteArchivedDocument[] = [
          // A. Attestation / Bordereau officiel de réception eGED
          {
            id: `doc-slip-${values.reception_number}`,
            reception_number: values.reception_number,
            source_structure: values.source_structure,
            source_type: values.source_type,
            city: values.city || "Cotonou",
            depositor_name: values.depositor_name,
            depositor_phone: values.depositor_phone,
            date: values.reception_date,
            doc_category: "Attestation eGED",
            doc_type: "Attestation / Bordereau de dépôt eGED officiel",
            title: `Bordereau de Réception ${values.reception_number}`,
            file_name: `Bordereau-Reception-${values.reception_number}.pdf`,
            file_size: "PDF Officiel eGED",
            file_type: "application/pdf",
            created_at: new Date().toISOString(),
          },
          // B. Documents apportés téléversés
          ...attachedDocs.map((doc) => ({
            id: doc.id,
            reception_number: values.reception_number,
            source_structure: values.source_structure,
            source_type: values.source_type,
            city: values.city || "Cotonou",
            depositor_name: values.depositor_name,
            depositor_phone: values.depositor_phone,
            date: values.reception_date,
            reception_date: values.reception_date,
            doc_category: "Document apporteur" as const,
            doc_type: doc.title || doc.doc_type || doc.file_name,
            document_type: doc.title || doc.document_type || doc.file_name,
            title: doc.title || doc.file_name,
            description: doc.description,
            file_name: doc.file_name,
            file_size: doc.file_size,
            file_size_formatted: doc.file_size_formatted || doc.file_size,
            file_type: doc.file_type,
            file_data: doc.file_data,
            data_url: doc.file_data,
            created_at: doc.uploaded_at || new Date().toISOString(),
          })),
        ]
        localStorage.setItem("waste_documents_custom_v1", JSON.stringify([...newArchivedDocs, ...storedDocs]))
      } catch (localErr) {
        console.warn("Erreur sauvegarde locale déchets et documents:", localErr)
      }

      // 2. Synchronisation Supabase Cloud en parallèle (sans bloquer l'ouverture de l'attestation)
      const batchesPayload = newBatches.map((b) => ({
        batch_number: b.batch_number,
        reception_number: b.reception_number,
        reception_date: b.reception_date,
        reception_time: b.reception_time,
        delivery_slip_ref: b.delivery_slip_ref,
        recipient_agent: b.recipient_agent,
        source_structure: b.source_structure,
        source_type: b.source_type,
        city: b.city,
        depositor_name: b.depositor_name,
        depositor_phone: b.depositor_phone,
        depositor_id_card: b.depositor_id_card,
        waste_type: b.waste_type,
        commercial_name: b.commercial_name,
        original_batch: b.original_batch,
        sample_id: b.sample_id,
        quantity: b.quantity,
        unit: b.unit,
        packaging: b.packaging,
        packaging_condition: b.packaging_condition,
        destruction_motive: b.destruction_motive,
        current_location: b.current_location,
        status: "Déclaré",
        observations: b.observations,
      }))

      const mvtsPayload = newMvts.map((mvt) => ({
        mvt_number: mvt.mvt_number,
        date: mvt.date,
        type: mvt.type,
        batch: mvt.batch,
        waste_type: mvt.waste_type,
        commercial_name: mvt.commercial_name,
        quantity: mvt.quantity,
        operator: mvt.operator,
        origin: mvt.origin,
        destination: mvt.destination,
        reception_number: mvt.reception_number,
        source_structure: mvt.source_structure,
        depositor_name: mvt.depositor_name,
        signature_hash: mvt.signature_hash,
      }))

      Promise.all([
        supabase.from("waste_batches").upsert(batchesPayload, { onConflict: "batch_number" }),
        supabase.from("waste_movements").upsert(mvtsPayload, { onConflict: "mvt_number" }),
      ]).catch((remoteErr) => {
        console.warn("Échec synchronisation Supabase waste_batches:", remoteErr)
      })

      setSavedSlipData(previewData)
      setShowPreviewModal(false)
      setShowSlipModal(true)
      toast.success(`${values.waste_items.length} déchet(s) enregistré(s) avec succès pour ${values.source_structure} !`)
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-5xl mx-auto pb-20">
      
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
                Multi-lots / PSQIF
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Saisie unique de l&apos;apporteur avec ajout multiple de déchets et génération du bordereau officiel pour signature.
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
            onClick={handleOpenPreview} 
            disabled={isSaving} 
            className="h-9 text-xs font-bold px-4 bg-[#1B5C2E] hover:bg-[#144723] text-white shadow-sm gap-2 cursor-pointer"
          >
            <Eye className="h-4 w-4" /> Visualiser avant d&apos;enregistrer ({fields.length} lot{fields.length > 1 ? 's' : ''})
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => { e.preventDefault(); handleOpenPreview() }} className="space-y-4 print:hidden">
          
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
                  <FormControl><Input {...field} className="h-9 text-xs" /></FormControl>
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

          {/* SECTION 2 : PROVENANCE & STRUCTURE APPORTRICE (SAISIE UNIQUE) */}
          <Card className="shadow-sm border-2 border-primary/20 rounded-2xl bg-primary/[0.02]">
            <CardHeader className="p-4 pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-xs font-bold uppercase tracking-wider text-primary">
                  <Building2 className="mr-2 h-4 w-4 text-primary" />
                  2. Provenance & Structure qui a apporté les Déchets
                </CardTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                  Saisie unique pour tout le dépôt
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Ces informations s&apos;appliquent automatiquement à tous les déchets ajoutés ci-dessous.
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
                    <Input {...field} className="h-9 text-xs bg-background" />
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
                    <Input {...field} className="h-9 text-xs bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="depositor_id_card" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">N° Pièce d&apos;identité (CIP / CNI / Passeport)</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-9 text-xs bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Ville / Commune de provenance</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-9 text-xs bg-background" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

            </CardContent>
          </Card>

          {/* SECTION 3 : LISTE DES DÉCHETS APPORTÉS (MULTI-LIGNES AVEC BOUTON +) */}
          <div className="space-y-3">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#1B5C2E]" />
                  3. Déchets & Produits Apportés ({fields.length} lot{fields.length > 1 ? 's' : ''})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ajoutez autant de types de déchets que nécessaire apportés lors de cette même réception.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-mono font-bold bg-[#1B5C2E]/10 text-[#1B5C2E]">
                  Poids total : {totalQuantity.toFixed(2)} Kg/Unités
                </Badge>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleAddWasteItem}
                  className="h-8 text-xs font-bold gap-1.5 bg-[#1B5C2E] hover:bg-[#144723] text-white shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter un autre déchet
                </Button>
              </div>
            </div>

            {/* BOUCLE SUR CHAQUE DÉCHET */}
            <div className="space-y-3">
              {fields.map((fieldItem, index) => (
                <Card key={fieldItem.id} className="shadow-sm border border-border/80 rounded-2xl bg-card overflow-hidden">
                  
                  {/* EN-TÊTE DU LOT */}
                  <div className="bg-muted/40 p-3 px-4 border-b border-border/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-foreground text-background text-[11px] font-bold">
                        Déchet #{index + 1}
                      </Badge>
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {form.watch(`waste_items.${index}.batch_number`) || `DEC-LOT-${index + 1}`}
                      </span>
                    </div>

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 px-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer ce déchet
                      </Button>
                    )}
                  </div>

                  {/* FORMULAIRE DU LOT */}
                  <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    <FormField control={form.control} name={`waste_items.${index}.batch_number`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">N° Lot Déchet (Auto)</FormLabel>
                        <FormControl><Input {...field} disabled className="font-mono bg-muted/40 h-9 text-xs" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name={`waste_items.${index}.waste_type`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">Classification Réglementaire <span className="text-red-500">*</span></FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val)
                            form.setValue(`waste_items.${index}.current_location`, normalizeWasteLocation("", val))
                          }}
                          defaultValue={field.value}
                        >
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

                    <FormField control={form.control} name={`waste_items.${index}.commercial_name`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Désignation / Produits concernés</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-9 text-xs bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name={`waste_items.${index}.quantity`} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-foreground">Quantité / Poids <span className="text-red-500">*</span></FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} className="h-9 text-xs font-bold bg-background" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name={`waste_items.${index}.unit`} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold">Unité</FormLabel>
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

                    <FormField control={form.control} name={`waste_items.${index}.packaging`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Conditionnement</FormLabel>
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

                    <FormField control={form.control} name={`waste_items.${index}.packaging_condition`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">État du Colisage</FormLabel>
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

                    <FormField control={form.control} name={`waste_items.${index}.original_batch`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">N° Lot Fabricant d&apos;origine</FormLabel>
                        <FormControl><Input {...field} className="h-9 text-xs bg-background" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name={`waste_items.${index}.destruction_motive`} render={({ field }) => (
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

                    <FormField control={form.control} name={`waste_items.${index}.current_location`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold">Orientation (MAGASIN DES DECHETS) <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-xs bg-background font-semibold">
                              <SelectValue placeholder="Choisir la zone du Magasin des Déchets" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {WASTE_ZONES.map((z) => (
                              <SelectItem key={z.id} value={z.fullLocation} className="text-xs">
                                {z.fullLocation}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                  </CardContent>
                </Card>
              ))}
            </div>

            {/* BOUTON AJOUT SUPPLÉMENTAIRE EN BAS */}
            <div className="flex justify-center pt-1">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAddWasteItem}
                className="gap-2 border-dashed border-[#1B5C2E]/40 text-[#1B5C2E] hover:bg-[#1B5C2E]/5 w-full sm:w-auto h-9 text-xs font-bold"
              >
                <Plus className="h-4 w-4" /> Ajouter un autre déchet pour cette même structure
              </Button>
            </div>

            {/* 4. DOCUMENTS & PIÈCES JUSTIFICATIVES APPORTÉS */}
            <Card className="border-border/70 shadow-xs">
              <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-[#1B5C2E]" />
                      4. Documents & Pièces Justificatives Apportés (Optionnel)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Joignez les bordereaux de livraison papier, procès-verbaux, inventaires scannés ou courriers déposés par la structure.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold bg-background">
                    {attachedDocs.length} document(s) joint(s)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Zone de saisie et d'ajout de document */}
                <div className="p-3.5 bg-muted/30 rounded-xl border border-dashed border-border/80 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    {/* Titre du document (saisie libre) */}
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Titre du document <span className="text-red-500">*</span>
                      </label>
                      <Input 
                        placeholder="Ex: Bordereau de livraison apporteur N° 45" 
                        value={docTitle} 
                        onChange={(e) => setDocTitle(e.target.value)}
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    {/* Description / Observation (saisie libre) */}
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Description / Observation (Optionnel)
                      </label>
                      <Input 
                        placeholder="Ex: Scan tamponné par le pharmacien, 2 pages..." 
                        value={docDescription} 
                        onChange={(e) => setDocDescription(e.target.value)}
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    {/* Fichier et bouton d'ajout "+" */}
                    <div className="md:col-span-4 flex items-center gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,image/*" 
                        className="hidden" 
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingDoc}
                        className="flex-1 h-9 text-xs font-semibold gap-1.5 bg-background truncate border-border/80"
                        title={pendingFile ? pendingFile.name : "Sélectionner un fichier"}
                      >
                        <FileUp className="h-4 w-4 text-[#1B5C2E] shrink-0" />
                        <span className="truncate">
                          {isUploadingDoc ? "Chargement..." : pendingFile ? pendingFile.name : "Parcourir le fichier"}
                        </span>
                      </Button>

                      <Button
                        type="button"
                        onClick={handleAddAttachedDoc}
                        className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-[#1B5C2E] hover:bg-[#144723] text-white shrink-0 shadow-xs cursor-pointer"
                        title="Ajouter ce document à la liste"
                      >
                        <Plus className="h-4 w-4 stroke-[3]" />
                        <span>Ajouter</span>
                      </Button>
                    </div>
                  </div>

                  {pendingFile && (
                    <div className="flex items-center justify-between text-xs p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-300 rounded-lg">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="h-4 w-4 text-[#1B5C2E] shrink-0" />
                        <span className="font-semibold truncate">{pendingFile.name}</span>
                        <span className="text-[10px] text-muted-foreground">({pendingFile.size})</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B5C2E]">Prêt à être ajouté avec « + Ajouter »</span>
                    </div>
                  )}
                </div>

                {/* Liste des documents joints */}
                {attachedDocs.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground">
                        {attachedDocs.length} document{attachedDocs.length > 1 ? "s" : ""} rattaché{attachedDocs.length > 1 ? "s" : ""} à ce dépôt :
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 text-xs font-bold text-[#1B5C2E] hover:text-[#144723] hover:bg-[#1B5C2E]/10 gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Ajouter un autre document
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {attachedDocs.map((doc) => (
                        <div 
                          key={doc.id} 
                          className="flex items-start justify-between p-3 rounded-xl border border-border/80 bg-background hover:bg-muted/30 transition-colors text-xs"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 pr-2">
                            <div className="p-2 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E] shrink-0 mt-0.5">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-bold truncate text-foreground text-xs">{doc.title || doc.file_name}</p>
                              {doc.description && (
                                <p className="text-[11px] text-muted-foreground italic line-clamp-1">{doc.description}</p>
                              )}
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                                <span className="font-mono truncate max-w-[150px]">{doc.file_name}</span>
                                <span>•</span>
                                <span>{doc.file_size_formatted || doc.file_size}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveDoc(doc.id)} 
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                            title="Retirer ce document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic text-center py-2">
                    Aucune pièce justificative jointe pour le moment. Renseignez le titre et la description, puis cliquez sur <strong>« + Ajouter »</strong> pour joindre autant de documents que nécessaire (PDF, Word, Excel, Scans).
                  </p>
                )}
              </CardContent>
            </Card>

          </div>

          {/* BANDEAU BAS D'ACTION */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-border/70">
            <div className="text-xs text-muted-foreground">
              Total à réceptionner : <strong className="text-foreground">{fields.length} lot(s)</strong> pour environ <strong className="text-foreground">{totalQuantity.toFixed(2)} Kg/Unités</strong>.
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button type="button" variant="outline" asChild className="h-10 text-xs px-4">
                <Link href="/dashboard/waste">Annuler</Link>
              </Button>
              <Button 
                type="button" 
                onClick={handleOpenPreview}
                disabled={isSaving}
                className="h-10 text-xs font-bold px-6 bg-[#1B5C2E] hover:bg-[#144723] text-white shadow-sm gap-2 cursor-pointer"
              >
                <Eye className="h-4 w-4" /> Visualiser avant d&apos;enregistrer ({fields.length} lot{fields.length > 1 ? 's' : ''})
              </Button>
            </div>
          </div>

        </form>
      </Form>

      {/* DIALOG 1 : PRÉVISUALISATION & VÉRIFICATION AVANT ENREGISTREMENT */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl sm:max-w-4xl w-[95vw] md:w-full bg-card border-border/70 p-4 sm:p-6 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Eye className="h-5 w-5 text-amber-600" />
                Prévisualisation & Vérification avant Enregistrement
              </DialogTitle>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                Aperçu • {previewData?.items?.length || 1} lot(s)
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Vérifiez l&apos;exactitude de toutes les informations saisies avant l&apos;enregistrement définitif et la génération de l&apos;attestation officielle.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4 pt-1">
              {/* BANDEAU D'INFORMATION PRÉVISUALISATION */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <Pencil className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Relecture avant validation : </span>
                  Si vous constatez une erreur sur le nom de la structure, le déposant ou les quantités, cliquez sur <strong>« Modifier / Corriger la saisie »</strong> en bas à gauche pour revenir au formulaire et corriger.
                </div>
              </div>

              {/* APERÇU DU DOCUMENT OFFICIEL */}
              <div className="bg-white text-slate-900 p-5 sm:p-7 rounded-xl border-2 border-amber-300/80 shadow-xs space-y-4 relative">
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
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded bg-[#1B5C2E]/10 border border-[#1B5C2E]/30 text-xs font-mono font-bold text-[#1B5C2E]">
                      {previewData.reception_number}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Date : {previewData.reception_date} {previewData.reception_time}
                    </p>
                  </div>
                </div>

                <div className="text-center py-1.5 bg-slate-50 rounded border border-slate-200">
                  <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    APERÇU DE L&apos;ATTESTATION & BORDEREAU DE RÉCEPTION DE DÉCHETS
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1">
                      1. Structure / Établissement Apporteur
                    </p>
                    <p className="pt-1">
                      <span className="text-slate-500">Établissement :</span>{" "}
                      <strong className="text-slate-900">{previewData.source_structure}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Type :</span> {previewData.source_type}
                    </p>
                    <p>
                      <span className="text-slate-500">Localité :</span> {previewData.city || "Non renseignée"}
                    </p>
                    <p>
                      <span className="text-slate-500">Apporté par :</span>{" "}
                      <strong>{previewData.depositor_name}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Téléphone :</span> {previewData.depositor_phone}
                    </p>
                    {previewData.depositor_id_card && (
                      <p>
                        <span className="text-slate-500">Pièce ID :</span> {previewData.depositor_id_card}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1">
                      2. Prise en charge ABMed
                    </p>
                    <p className="pt-1">
                      <span className="text-slate-500">Agent Récepteur :</span>{" "}
                      <strong className="text-slate-900">{previewData.recipient_agent}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Réf. Bordereau apport :</span>{" "}
                      {previewData.delivery_slip_ref || "Remise directe sur site"}
                    </p>
                    <p>
                      <span className="text-slate-500">Nombre de lots :</span>{" "}
                      <strong>{previewData.items.length} lot(s)</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Poids total estimé :</span>{" "}
                      <strong>{previewData.items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0).toFixed(2)} Kg/Unités</strong>
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    3. Détail des Déchets à Réceptionner ({previewData.items.length} lots)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-300 rounded overflow-hidden">
                      <thead className="bg-[#1B5C2E] text-white text-[11px]">
                        <tr>
                          <th className="p-2 border-r border-[#1B5C2E]/30 whitespace-nowrap">N° Lot Déchet</th>
                          <th className="p-2 border-r border-[#1B5C2E]/30">Désignation & Classification</th>
                          <th className="p-2 border-r border-[#1B5C2E]/30">Conditionnement & Motif</th>
                          <th className="p-2 border-r border-[#1B5C2E]/30">Localisation</th>
                          <th className="p-2 text-right whitespace-nowrap">Poids / Quantité</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {previewData.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                              {item.batch_number}
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <p className="font-semibold text-slate-900">{item.waste_type}</p>
                              {item.commercial_name && (
                                <p className="text-[10px] text-slate-600">{item.commercial_name}</p>
                              )}
                              {item.original_batch && (
                                <p className="text-[10px] text-slate-500">Lot d&apos;origine : {item.original_batch}</p>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-700">
                              <div>{item.packaging}</div>
                              <div className="text-[10px] text-slate-500">Motif : {item.destruction_motive || "Péremption"}</div>
                            </td>
                            <td className="p-2 border-r border-slate-200 text-slate-700 text-[11px]">
                              {item.location}
                            </td>
                            <td className="p-2 text-right font-black text-slate-900 whitespace-nowrap">
                              {item.quantity} {item.unit}
                            </td>
                          </tr>
                        ))}
                        {previewData.items.length > 1 && (
                          <tr className="bg-slate-100 font-bold">
                            <td colSpan={4} className="p-2 text-right border-r border-slate-300">
                              TOTAL DÉPÔT ({previewData.items.length} lots) :
                            </td>
                            <td className="p-2 text-right font-black text-[#1B5C2E] whitespace-nowrap">
                              {previewData.items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0).toFixed(2)} Kg/Unités
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. PIÈCES JUSTIFICATIVES ATTACHÉES */}
                {attachedDocs.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      4. Documents & Pièces Justificatives Déposés ({attachedDocs.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attachedDocs.map((doc) => (
                        <div key={doc.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between text-xs">
                          <div className="flex items-start gap-2 truncate pr-2">
                            <FileCheck className="h-4 w-4 text-[#1B5C2E] shrink-0 mt-0.5" />
                            <div className="truncate space-y-0.5">
                              <p className="font-bold text-slate-900 truncate">{doc.title || doc.file_name}</p>
                              {doc.description && (
                                <p className="text-[10px] text-slate-600 italic truncate">{doc.description}</p>
                              )}
                              <p className="text-[10px] text-slate-500 font-mono truncate">{doc.file_name} • {doc.file_size_formatted || doc.file_size}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold">Joint</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BOUTONS DE VALIDATION OU CORRECTION */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-border/60">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowPreviewModal(false)}
                  className="w-full sm:w-auto text-xs font-semibold gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5 text-amber-600" /> Modifier / Corriger la saisie
                </Button>
                
                <Button 
                  type="button"
                  size="sm" 
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="w-full sm:w-auto gap-2 text-xs font-bold bg-[#1B5C2E] hover:bg-[#144723] text-white shadow-sm px-5 h-9 cursor-pointer"
                >
                  {isSaving ? "Enregistrement en cours..." : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Confirmer, Enregistrer & Générer l&apos;Attestation
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 2 : OFFICIEL D'ATTESTATION & BORDEREAU DE RÉCEPTION DE DÉCHETS (PRÊT À IMPRIMER & FAIRE SIGNER) */}
      <Dialog open={showSlipModal} onOpenChange={setShowSlipModal}>
        <DialogContent className="max-w-4xl sm:max-w-4xl w-[95vw] md:w-full bg-card border-border/70 p-4 sm:p-6 rounded-2xl max-h-[92vh] overflow-y-auto print:max-w-full print:m-0 print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-5 w-5 text-[#1B5C2E]" />
                Attestation de Réception de Déchets Prête à Imprimer
              </DialogTitle>
              <Badge className="bg-[#1B5C2E]/10 text-[#1B5C2E] border-[#1B5C2E]/20 text-[10px]">
                {savedSlipData?.items?.length || 1} lot(s) de déchets
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
                <div className="text-center py-1.5 bg-slate-50 rounded border border-slate-200">
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
                      <span className="text-slate-500">Nombre de lots :</span>{" "}
                      <strong>{savedSlipData.items.length} lot(s)</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Poids total estimé :</span>{" "}
                      <strong>{savedSlipData.items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0).toFixed(2)} Kg/Unités</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Statut initial :</span>{" "}
                      <span className="text-blue-700 font-semibold">Déclaré / En attente de destruction</span>
                    </p>
                  </div>

                </div>

                {/* TABLEAU RÉCAPITULATIF DES DÉCHETS REÇUS */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    3. Détail des Déchets Réceptionnés ({savedSlipData.items.length} lots)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-300 rounded overflow-hidden">
                      <thead className="bg-[#1B5C2E] text-white text-[11px]">
                        <tr>
                          <th className="p-2 border-r border-[#1B5C2E]/30 whitespace-nowrap">N° Lot Déchet</th>
                          <th className="p-2 border-r border-[#1B5C2E]/30">Désignation & Classification</th>
                          <th className="p-2 border-r border-[#1B5C2E]/30">Conditionnement</th>
                          <th className="p-2 text-right whitespace-nowrap">Poids / Quantité</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {savedSlipData.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
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
                            <td className="p-2 text-right font-black text-slate-900 whitespace-nowrap">
                              {item.quantity} {item.unit}
                            </td>
                          </tr>
                        ))}
                        {savedSlipData.items.length > 1 && (
                          <tr className="bg-slate-100 font-bold">
                            <td colSpan={3} className="p-2 text-right border-r border-slate-300">
                              TOTAL DÉPÔT ({savedSlipData.items.length} lots) :
                            </td>
                            <td className="p-2 text-right font-black text-[#1B5C2E] whitespace-nowrap">
                              {savedSlipData.items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0).toFixed(2)} Kg/Unités
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ATTESTATION ET DÉCHARGE RÉGLEMENTAIRE */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950 text-[11px] leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="h-4 w-4 text-[#1B5C2E]" />
                    Attestation & Décharge Réglementaire
                  </p>
                  <p>
                    L&apos;Agence Béninoise du Médicament (ABMed) atteste par la présente avoir réceptionné et vérifié ce jour les {savedSlipData.items.length} lot(s) de déchets et produits pharmaceutiques ci-dessus décrits. Ils sont consignés sous la garde et la responsabilité de l&apos;ABMed pour être détruits conformément aux normes environnementales et sanitaires nationales. La structure apportrice est déchargée de la détention physique de ces produits.
                  </p>
                </div>

                {/* DOUBLE ZONE DE SIGNATURE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                  
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
