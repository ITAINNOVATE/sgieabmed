"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

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
  Plus, Layers, Scale, Sparkles, Eye, Pencil, Paperclip, FileUp, FileSpreadsheet, FileCheck, X,
  Warehouse, Calendar, CircleDollarSign, Check, Info, AlertTriangle, RefreshCw
} from "lucide-react"

import { createClient } from "@/utils/supabase/client"
import { exportWasteReceptionSlipPDF } from "@/utils/exportUtils"
import { broadcastDataMutation, syncPendingLocalDataToCloud } from "@/utils/realtimeBus"
import { WASTE_ZONES, normalizeWasteLocation } from "@/utils/waste-locations"
import { AttachedWasteDocument, WasteArchivedDocument, WASTE_DOCUMENT_TYPES } from "@/types/waste-documents"
import { getCurrentUser } from "@/app/dashboard/admin/adminMockData"
import { 
  Center, 
  getRegisteredCenters, 
  saveCenter, 
  generateNextCenterCode 
} from "@/utils/centers-storage"
import { 
  saveDocumentFile, 
  getDocumentFile, 
  optimizeFileForUpload, 
  safeSaveDocsToLocalStorage 
} from "@/utils/idb-docs"
import { 
  parseFinancesFromBatch, 
  encodeFinancesInObservations 
} from "@/utils/waste-finances"

// --- CONSTANTES OFFICIELLES ABMed ---
export const WASTE_WAREHOUSES = [
  "Magasin Cotonou",
  "Magasin Parakou",
  "Autres",
]

export const WASTE_SOURCE_TYPES = [
  "Officine privée de pharmacie",
  "Établissement hospitalier / Clinique",
  "Zone Sanitaire",
  "Promoteur d'essai clinique",
  "Grossiste-répartiteur pharmaceutique",
  "Laboratoire d'analyses médicales",
  "Industrie / Fabricant pharmaceutique",
  "Organisme de santé publique / ONG",
  "Site d'essai clinique",
  "Autre",
]

export const PRODUCT_NATURES = [
  "compléments nutritionnels",
  "médicaments",
  "psychotropes",
  "dispositifs médicaux",
  "cosmétiques",
  "produits mixtes (solides & liquides)",
  "autres (à préciser)",
]

export const PRODUCT_CATEGORIES = [
  "Catégorie 1 : Produits solides et semi-solides (comprimés, gélules, granulés, poudres, crèmes, pommades, gels, suppositoires, etc.)",
  "Catégorie 2 : Produits liquides (solutions, émulsions, suspensions liquides, sirops, lotions, etc.)",
  "Catégorie 3 : Produits gazeux ou liquéfiés (bombes aérosols, y compris atomiseurs avec gaz propulseur et inhalateurs)",
  "Catégorie 4 : Produits particuliers à risque nécessitant une gestion particulière (substances sous contrôle international, stupéfiants, psychotropes, antinéoplasiques/cytotoxiques)",
  "Catégorie 5 : Produits d'emballage et emballages vides (bidons d'alcool, bouteilles vides de solutés après utilisation, etc.)",
  "Catégorie Mixte : Produits mixtes (Solides, Liquides, Sirops & Divers — Non triés / Spécifique Zones Sanitaires)",
]

export const WASTE_CLASSIFICATIONS = [
  "Médicaments périmés (Formes solides)",
  "Médicaments périmés (Formes liquides / sirops)",
  "Médicaments périmés (Formes mixtes : Solides, Liquides & Divers)",
  "Produits saisis",
  "Produits chimiques dangereux & solvants",
  "Déchets infectieux (DASRI)",
  "Flacons cassés & piquant-tranchant",
  "Emballages & cartons souillés",
  "Produits chaîne de froid dégradés",
  "Autres déchets pharmaceutiques",
]

export const WASTE_PACKAGINGS = [
  "Cartons fermés & scotchés",
  "Fûts étanches scellés",
  "Boîtes jaunes DASRI sécurisées",
  "Bacs plastiques fermés",
  "Sacs étanches plombés",
  "Sacs de jute",
  "Autres",
]

export const PACKAGING_CONDITIONS = [
  "Conforme et scellé",
  "Emballage détérioré / Avec réserves",
  "Fuite constatée / Reconditionné",
  "Autres",
]

export const DESTRUCTION_MOTIVES = [
  "Péremption",
  "Détérioration physique / Casse",
  "Rupture de chaîne de froid",
  "Rappel de lot",
  "Issus de saisies",
  "Non-conformité analytique",
  "Retour Patient",
  "Autre",
]

// Schéma pour une ligne individuelle de déchet
const wasteItemSchema = z.object({
  batch_number: z.string().min(1, "N° de lot déchet requis"),
  product_nature: z.string().min(1, "Nature du produit requise"),
  product_nature_other: z.string().optional(),
  product_category: z.string().min(1, "Catégorie requise"),
  waste_type: z.string().min(1, "Classification réglementaire requise"),
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
  warehouse: z.string().min(1, "Magasin requis"),
  warehouse_other: z.string().optional(),
  delivery_slip_ref: z.string().optional(),
  recipient_agent: z.string().min(1, "Agent récepteur requis"),

  // 2. Structure Déposante / Provenance (Saisie unique pour tout le dépôt)
  center_mode: z.enum(["new", "existing"]).default("new"),
  center_code: z.string().optional(),
  center_id: z.string().optional(),
  source_structure: z.string().min(2, "Le nom de la structure apportrice est requis"),
  source_type: z.string().min(1, "Type de structure requis"),
  city: z.string().optional(),
  depositor_name: z.string().min(2, "Nom de la personne ayant apporté les déchets requis"),
  depositor_phone: z.string().min(6, "Numéro de téléphone requis"),
  depositor_id_card: z.string().optional(),

  // 3. Années d'exercice & Valorisation Financière des Produits Déclarés
  exercise_years: z.array(z.string()).min(1, "Veuillez renseigner au moins une année d'exercice"),
  transfer_cost_mode: z.enum(["chiffre", "na", "dons"]),
  transfer_cost_amount: z.coerce.number().optional(),

  // 4. Liste dynamique des Déchets apportés
  waste_items: z.array(wasteItemSchema).min(1, "Veuillez renseigner au moins un déchet"),
})

type FormValues = z.infer<typeof formSchema>

function NewWasteReceptionContent() {
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
  const [customYearInput, setCustomYearInput] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // État des centres pour la provenance
  const [registeredCenters, setRegisteredCenters] = useState<Center[]>([])
  const [generatedCenterCode, setGeneratedCenterCode] = useState<string>("")
  const [selectedCenterCode, setSelectedCenterCode] = useState<string>("")

  const router = useRouter()
  const searchParams = useSearchParams()
  const editParam = searchParams?.get("edit") || searchParams?.get("id") || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("edit") || new URLSearchParams(window.location.search).get("id") : null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoadingExisting, setIsLoadingExisting] = useState(false)

  const supabase = createClient()

  const currentYearStr = new Date().getFullYear().toString()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      reception_number: "",
      reception_date: new Date().toISOString().split("T")[0],
      reception_time: new Date().toTimeString().substring(0, 5),
      warehouse: "Magasin Cotonou",
      warehouse_other: "",
      delivery_slip_ref: "",
      recipient_agent: "Admin EGED (Agent ABMed)",

      center_mode: "new",
      center_code: "",
      center_id: "",
      source_structure: "",
      source_type: "Officine privée de pharmacie",
      city: "",
      depositor_name: "",
      depositor_phone: "",
      depositor_id_card: "",

      exercise_years: [currentYearStr],
      transfer_cost_mode: "chiffre",
      transfer_cost_amount: 0,

      waste_items: [
        {
          batch_number: "",
          product_nature: "médicaments",
          product_nature_other: "",
          product_category: PRODUCT_CATEGORIES[0],
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

  // Gestion des années d'exercice multiples
  const watchedYears = form.watch("exercise_years") || []
  const handleToggleYear = (year: string) => {
    const currentYears = form.getValues("exercise_years") || []
    if (currentYears.includes(year)) {
      if (currentYears.length > 1) {
        form.setValue("exercise_years", currentYears.filter(y => y !== year), { shouldValidate: true })
      } else {
        toast.warning("Au moins une année d'exercice doit être sélectionnée.")
      }
    } else {
      form.setValue("exercise_years", [...currentYears, year].sort(), { shouldValidate: true })
    }
  }

  const handleAddCustomYear = () => {
    const y = customYearInput.trim()
    if (!y || !/^\d{4}$/.test(y)) {
      toast.error("Veuillez saisir une année valide à 4 chiffres (ex: 2022).")
      return
    }
    const currentYears = form.getValues("exercise_years") || []
    if (currentYears.includes(y)) {
      toast.info(`L'année ${y} est déjà dans la liste.`)
      setCustomYearInput("")
      return
    }
    form.setValue("exercise_years", [...currentYears, y].sort(), { shouldValidate: true })
    setCustomYearInput("")
    toast.success(`Année ${y} ajoutée.`)
  }

  useEffect(() => {
    if (editParam) {
      setIsEditMode(true)
      setEditingId(editParam)
      setIsLoadingExisting(true)

      async function loadExistingWasteReception() {
        try {
          let matchedBatches: any[] = []

          // 1. Chercher dans localStorage
          try {
            const stored = localStorage.getItem("waste_batches_custom_v1")
            if (stored) {
              const allBatches = JSON.parse(stored)
              matchedBatches = allBatches.filter((b: any) => 
                b.reception_number === editParam || 
                b.batch_number === editParam ||
                b.id === editParam
              )
            }
          } catch (e) {}

          // 2. Si non trouvé ou incomplet, chercher dans Supabase
          if (matchedBatches.length === 0) {
            try {
              const { data } = await supabase
                .from("waste_batches")
                .select("*")
                .or(`reception_number.eq.${editParam},batch_number.eq.${editParam},id.eq.${editParam}`)
              if (data && data.length > 0) {
                matchedBatches = data
              }
            } catch (sErr) {}
          }

          if (matchedBatches.length > 0) {
            const primary = matchedBatches[0]
            const realRecNum = primary.reception_number || editParam
            const prefix = primary.batch_number ? primary.batch_number.split('-').slice(0, 3).join('-') : `DEC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
            setBaseLotPrefix(prefix)

            form.reset({
              reception_number: realRecNum,
              reception_date: primary.reception_date ? primary.reception_date.split("T")[0] : new Date().toISOString().split("T")[0],
              reception_time: primary.reception_time || "08:00",
              warehouse: primary.warehouse || "Magasin Cotonou",
              warehouse_other: "",
              delivery_slip_ref: primary.delivery_slip_ref || "",
              recipient_agent: primary.recipient_agent || "Admin EGED (Agent ABMed)",

              center_mode: "existing",
              center_code: primary.center_code || "",
              center_id: primary.center_id || "",
              source_structure: primary.source_structure || "",
              source_type: primary.source_type || "Officine privée de pharmacie",
              city: primary.city || "Cotonou",
              depositor_name: primary.depositor_name || "",
              depositor_phone: primary.depositor_phone || "",
              depositor_id_card: primary.depositor_id_card || "",

              exercise_years: parseFinancesFromBatch(primary).exercise_years && Array.isArray(parseFinancesFromBatch(primary).exercise_years) ? (parseFinancesFromBatch(primary).exercise_years as string[]) : [new Date().getFullYear().toString()],
              transfer_cost_mode: (parseFinancesFromBatch(primary).transfer_cost_mode as "chiffre" | "na" | "dons") || "chiffre",
              transfer_cost_amount: parseFinancesFromBatch(primary).transfer_cost_amount || 0,

              waste_items: matchedBatches.map((b: any, idx: number) => ({
                batch_number: b.batch_number || `${prefix}-${idx + 1}`,
                product_nature: b.product_nature || "médicaments",
                product_nature_other: b.product_nature_other || "",
                product_category: b.product_category || PRODUCT_CATEGORIES[0],
                waste_type: b.waste_type || "Médicaments périmés (Formes solides)",
                commercial_name: b.commercial_name || "",
                sample_id: b.sample_id || "none",
                original_batch: b.original_batch || "",
                quantity: Number(b.quantity) || 1,
                unit: b.unit || "Kg",
                packaging: b.packaging || "Cartons fermés & scotchés",
                packaging_condition: b.packaging_condition || "Conforme et scellé",
                current_location: b.current_location || WASTE_ZONES[0].fullLocation,
                destruction_motive: b.destruction_motive || "Péremption",
                observations: b.observations || "",
              }))
            })

            // 3. Charger les pièces jointes enregistrées pour cette réception
            try {
              const storedDocsRaw = localStorage.getItem("waste_documents_custom_v1")
              if (storedDocsRaw) {
                const storedDocs: any[] = JSON.parse(storedDocsRaw)
                const recDocs = storedDocs.filter(d => 
                  d.reception_number === realRecNum && 
                  d.doc_category !== "Attestation eGED" &&
                  !d.id?.startsWith("doc-slip-")
                )
                const loadedDocs: AttachedWasteDocument[] = []
                for (const d of recDocs) {
                  const content = await getDocumentFile(d.id) || d.data_url || d.file_data || ""
                  loadedDocs.push({
                    id: d.id,
                    file_name: d.file_name,
                    file_size: d.file_size_formatted || d.file_size || "Fichier",
                    file_size_formatted: d.file_size_formatted || d.file_size || "Fichier",
                    file_type: d.file_type || d.mime_type || "Fichier",
                    title: d.title || d.file_name,
                    doc_type: d.doc_type || d.document_type || d.title,
                    document_type: d.document_type || d.doc_type || d.title,
                    description: d.description,
                    file_data: content,
                    data_url: content,
                    uploaded_at: d.created_at || new Date().toISOString(),
                  })
                }
                setAttachedDocs(loadedDocs)
              }
            } catch (dErr) {}

            toast.success(`Réception ${realRecNum} chargée pour modification. Vous pouvez corriger les informations et ajouter des pièces.`)
          }
        } catch (err) {
          console.error("Erreur chargement réception déchet existante:", err)
        } finally {
          setIsLoadingExisting(false)
        }
      }

      loadExistingWasteReception()
    } else {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000)
      const year = new Date().getFullYear()
      const recNum = `REC-DECH-${year}-${randomSuffix}`
      const prefix = `DEC-${year}-${Math.floor(10000 + Math.random() * 90000)}`
      
      setBaseLotPrefix(prefix)
      form.setValue("reception_number", recNum)
      form.setValue("waste_items.0.batch_number", `${prefix}-1`)
    }

    try {
      const u = getCurrentUser()
      if (u && u.first_name) {
        form.setValue("recipient_agent", `${u.first_name} ${u.last_name} (${u.role || u.fonction || 'Agent ABMed'})`)
      }
    } catch (e) {}

    async function loadCenters() {
      try {
        const list = await getRegisteredCenters()
        setRegisteredCenters(list)
        const nextCode = generateNextCenterCode(list)
        setGeneratedCenterCode(nextCode)
        if (!form.getValues("center_code")) {
          form.setValue("center_code", nextCode)
        }
      } catch (err) {
        console.warn("Erreur chargement centres dans waste/new:", err)
      }
    }
    loadCenters()

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

  // Ajout d'une nouvelle ligne de déchet avec N° de lot incrémenté et séquentiel garanti
  const handleAddWasteItem = () => {
    const prefix = baseLotPrefix || `DEC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
    const currentItems = form.getValues("waste_items") || []
    const nextIndex = currentItems.length + 1
    append({
      batch_number: `${prefix}-${nextIndex}`,
      product_nature: "médicaments",
      product_nature_other: "",
      product_category: PRODUCT_CATEGORIES[0],
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

  // Suppression d'un déchet avec ré-indexation séquentielle immédiate pour éviter tout doublon
  const handleRemoveWasteItem = (indexToRemove: number) => {
    remove(indexToRemove)
    setTimeout(() => {
      const currentItems = form.getValues("waste_items") || []
      const prefix = baseLotPrefix || (currentItems[0]?.batch_number ? currentItems[0].batch_number.split('-').slice(0, 3).join('-') : `DEC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`)
      currentItems.forEach((_, i) => {
        form.setValue(`waste_items.${i}.batch_number`, `${prefix}-${i + 1}`)
      })
    }, 50)
  }

  // Calcul du poids/quantité totale
  const watchedItems = form.watch("waste_items") || []
  const totalQuantity = watchedItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)

  // Sélection et lecture optimisée de multiples pièces justificatives
  const handleMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingDoc(true)
    const newAttached: AttachedWasteDocument[] = []
    toast.info(`Traitement et optimisation de ${files.length} document(s)...`)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const optimized = await optimizeFileForUpload(file)
        const docId = `att-doc-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`

        // Sauvegarde immédiate dans IndexedDB (haute capacité)
        await saveDocumentFile(docId, optimized.base64)

        const titleToUse = (files.length === 1 && docTitle.trim())
          ? docTitle.trim()
          : file.name.replace(/\.[^/.]+$/, "")

        newAttached.push({
          id: docId,
          file_name: optimized.name,
          file_size: optimized.sizeFormatted + (optimized.isOptimized ? " (optimisé)" : ""),
          file_size_formatted: optimized.sizeFormatted + (optimized.isOptimized ? " (optimisé)" : ""),
          file_type: optimized.type,
          title: titleToUse,
          doc_type: titleToUse,
          document_type: titleToUse,
          description: docDescription.trim() || undefined,
          file_data: optimized.base64.length < 50000 ? optimized.base64 : undefined,
          data_url: optimized.base64.length < 50000 ? optimized.base64 : undefined,
          uploaded_at: new Date().toISOString(),
        })
      } catch (fileErr) {
        console.warn("Erreur traitement document", file.name, fileErr)
      }
    }

    setAttachedDocs(prev => [...prev, ...newAttached])
    setDocTitle("")
    setDocDescription("")
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setIsUploadingDoc(false)
    toast.success(`${newAttached.length} document(s) joint(s) avec succès`)
  }

  // Ajout manuel d'un document pré-sélectionné
  const handleAddAttachedDoc = async () => {
    if (!pendingFile) {
      fileInputRef.current?.click()
      return
    }

    const titleToUse = docTitle.trim() || pendingFile.name
    const docId = `att-doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

    await saveDocumentFile(docId, pendingFile.base64)

    const newDoc: AttachedWasteDocument = {
      id: docId,
      file_name: pendingFile.name,
      file_size: pendingFile.size,
      file_size_formatted: pendingFile.size,
      file_type: pendingFile.type,
      title: titleToUse,
      doc_type: titleToUse,
      document_type: titleToUse,
      description: docDescription.trim() || undefined,
      file_data: pendingFile.base64.length < 50000 ? pendingFile.base64 : undefined,
      data_url: pendingFile.base64.length < 50000 ? pendingFile.base64 : undefined,
      uploaded_at: new Date().toISOString(),
    }

    setAttachedDocs(prev => [...prev, newDoc])
    setDocTitle("")
    setDocDescription("")
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    toast.success(`Document « ${titleToUse} » ajouté.`)
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
    const prefix = baseLotPrefix || (values.waste_items[0]?.batch_number ? values.waste_items[0].batch_number.split('-').slice(0, 3).join('-') : `DEC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`)

    // Ré-alignement séquentiel garanti pour que chaque lot ait un numéro unique 1, 2, 3...
    values.waste_items.forEach((item, idx) => {
      const seqNumber = `${prefix}-${idx + 1}`
      item.batch_number = seqNumber
      form.setValue(`waste_items.${idx}.batch_number`, seqNumber)
    })

    const warehouseChosen = values.warehouse === "Autres" && values.warehouse_other ? values.warehouse_other : values.warehouse
    const fee8 = values.transfer_cost_mode === "chiffre"
      ? Math.round((Number(values.transfer_cost_amount) || 0) * 0.08)
      : (values.transfer_cost_mode === "dons" ? "Exonéré (Dons)" : "NA")

    const slipPayload = {
      reception_number: values.reception_number,
      reception_date: values.reception_date,
      reception_time: values.reception_time,
      warehouse: warehouseChosen,
      exercise_years: values.exercise_years,
      transfer_cost_mode: values.transfer_cost_mode,
      transfer_cost_amount: values.transfer_cost_amount,
      abmed_fee_8_percent: fee8,
      delivery_slip_ref: values.delivery_slip_ref,
      recipient_agent: values.recipient_agent,
      source_structure: values.source_structure,
      source_type: values.source_type,
      city: values.city,
      depositor_name: values.depositor_name,
      depositor_phone: values.depositor_phone,
      depositor_id_card: values.depositor_id_card,
      attachedDocs: attachedDocs,
      general_observations: `Dépôt de ${values.waste_items.length} lot(s) de déchets pour un total de ${totalQuantity.toFixed(2)} ${values.waste_items[0]?.unit || 'Kg'}`,
      items: values.waste_items.map((item, idx) => {
        const s = samples.find((x) => x.id === item.sample_id)
        const finalNature = item.product_nature === "autres (à préciser)" && item.product_nature_other ? item.product_nature_other : item.product_nature
        return {
          batch_number: `${prefix}-${idx + 1}`,
          product_nature: finalNature,
          product_category: item.product_category,
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
      const prefix = baseLotPrefix || (values.waste_items[0]?.batch_number ? values.waste_items[0].batch_number.split('-').slice(0, 3).join('-') : `DEC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`)
      const warehouseChosen = values.warehouse === "Autres" && values.warehouse_other ? values.warehouse_other : values.warehouse
      const fee8 = values.transfer_cost_mode === "chiffre"
        ? Math.round((Number(values.transfer_cost_amount) || 0) * 0.08)
        : (values.transfer_cost_mode === "dons" ? "Exonéré (Dons)" : "NA")

      // Enregistrement automatique ou mise à jour du centre dans le registre
      const centerCodeToUse = values.center_code || generatedCenterCode || "CTR-AUTO"
      if (values.source_structure && values.source_structure.trim() !== "") {
        try {
          await saveCenter({
            id: values.center_id,
            center_code: centerCodeToUse,
            name: values.source_structure.trim().toUpperCase(),
            center_type: values.source_type || "Officine privée de pharmacie",
            city: values.city || "Cotonou",
            country: "Bénin",
            contact_person: values.depositor_name || "",
            phone: values.depositor_phone || "",
          })
        } catch (cErr) {
          console.warn("Notice auto-enregistrement centre waste:", cErr)
        }
      }

      const newBatches = values.waste_items.map((item, idx) => {
        const uniqueBatchNumber = `${prefix}-${idx + 1}`
        const selectedSample = samples.find((s) => s.id === item.sample_id)
        const finalNature = item.product_nature === "autres (à préciser)" && item.product_nature_other ? item.product_nature_other : item.product_nature
        return {
          id: `batch-${timestamp}-${idx}`,
          batch_number: uniqueBatchNumber,
          reception_number: values.reception_number,
          reception_date: values.reception_date,
          reception_time: values.reception_time,
          warehouse: warehouseChosen,
          exercise_years: values.exercise_years,
          transfer_cost_mode: values.transfer_cost_mode,
          transfer_cost_amount: values.transfer_cost_amount,
          abmed_fee_8_percent: fee8,
          delivery_slip_ref: values.delivery_slip_ref || "",
          recipient_agent: values.recipient_agent,

          center_code: centerCodeToUse,
          center_id: values.center_id || null,
          source_structure: values.source_structure,
          source_type: values.source_type,
          city: values.city || "Cotonou",
          depositor_name: values.depositor_name,
          depositor_phone: values.depositor_phone,
          depositor_id_card: values.depositor_id_card || "",

          product_nature: finalNature,
          product_category: item.product_category,
          waste_type: item.waste_type,
          commercial_name: item.commercial_name || (selectedSample ? selectedSample.commercial_name : item.product_category),
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
          observations: encodeFinancesInObservations(item.observations, {
            transfer_cost_amount: Number(values.transfer_cost_amount) || 0,
            transfer_cost_mode: values.transfer_cost_mode,
            abmed_fee_8_percent: typeof fee8 === "number" ? fee8 : 0,
            exercise_years: values.exercise_years,
          }),
          attached_docs: attachedDocs,
          created_at: new Date().toISOString(),
          creator: { first_name: "Agent", last_name: "ABMed" },
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
        operator: values.recipient_agent || 'Admin EGED',
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
        const updatedList = isEditMode
          ? [...newBatches, ...currentList.filter((b: any) => b.reception_number !== values.reception_number && b.batch_number !== editingId)]
          : [...newBatches, ...currentList]
        localStorage.setItem("waste_batches_custom_v1", JSON.stringify(updatedList))

        // Sauvegarder les finances dédiées
        try {
          localStorage.setItem("waste_reception_finances_" + values.reception_number, JSON.stringify({
            transfer_cost_amount: Number(values.transfer_cost_amount) || 0,
            transfer_cost_mode: values.transfer_cost_mode,
            abmed_fee_8_percent: typeof fee8 === "number" ? fee8 : 0,
            exercise_years: values.exercise_years,
          }))
        } catch (e) {}

        // Sauvegarder les détails complets de la réception pour restauration et documentation
        try {
          localStorage.setItem("waste_reception_draft_details_" + values.reception_number, JSON.stringify({
            formData: { ...values, attachedDocs },
            attachedDocs,
            reception_number: values.reception_number,
            status: "Déclaré",
          }))
        } catch (e) {}

        // Journal des mouvements de déchets
        const currentMvts = JSON.parse(localStorage.getItem("waste_movements_custom_v1") || "[]")
        const updatedMvts = isEditMode
          ? [...newMvts, ...currentMvts.filter((m: any) => m.reception_number !== values.reception_number)]
          : [...newMvts, ...currentMvts]
        localStorage.setItem("waste_movements_custom_v1", JSON.stringify(updatedMvts))

        // Sauvegarder les documents joints dans IndexedDB
        for (const doc of attachedDocs) {
          const fileData = doc.data_url || doc.file_data
          if (fileData) {
            await saveDocumentFile(doc.id, fileData)
          }
        }

        // Enregistrement des documents pour la traçabilité dans le sous-module Documentation Déchets
        const storedDocs: WasteArchivedDocument[] = JSON.parse(localStorage.getItem("waste_documents_custom_v1") || "[]")
        const filteredDocs = isEditMode
          ? storedDocs.filter(d => d.reception_number !== values.reception_number)
          : storedDocs

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
            reception_date: values.reception_date,
            doc_category: "Attestation eGED",
            category: "acte_administratif",
            doc_type: "Attestation / Bordereau de dépôt eGED officiel",
            document_type: "Attestation / Bordereau de dépôt eGED officiel",
            title: `Bordereau de Réception ${values.reception_number}`,
            file_name: `Bordereau-Reception-${values.reception_number}.pdf`,
            file_size: "PDF Officiel eGED",
            file_size_formatted: "PDF Officiel eGED",
            file_type: "application/pdf",
            mime_type: "application/pdf",
            created_at: new Date().toISOString(),
          },
          // B. Bordereau de livraison apporteur (si référence déclarée et pas déjà un fichier joint dédié)
          ...(values.delivery_slip_ref && values.delivery_slip_ref.trim() !== "" && !attachedDocs.some(d => d.title?.includes(values.delivery_slip_ref!) || d.file_name?.includes(values.delivery_slip_ref!)) ? [{
            id: `doc-bl-${values.reception_number}`,
            reception_number: values.reception_number,
            source_structure: values.source_structure,
            source_type: values.source_type,
            city: values.city || "Cotonou",
            depositor_name: values.depositor_name,
            depositor_phone: values.depositor_phone,
            date: values.reception_date,
            reception_date: values.reception_date,
            doc_category: "Document apporteur" as const,
            category: "piece_apporteur" as const,
            doc_type: "Bordereau de livraison apporteur",
            document_type: "Bordereau de livraison apporteur",
            title: `Bordereau de Livraison Apporteur N° ${values.delivery_slip_ref}`,
            description: `Bordereau de livraison / déclaration déposé par ${values.source_structure} (Réf : ${values.delivery_slip_ref})`,
            file_name: `BL-${values.delivery_slip_ref}.pdf`,
            file_size: "Référencé au dépôt",
            file_size_formatted: "Référencé au dépôt",
            file_type: "application/pdf",
            mime_type: "application/pdf",
            created_at: new Date().toISOString(),
          }] : []),
          // C. Documents et pièces justificatives apportés téléversés
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
            category: "piece_apporteur" as const,
            doc_type: doc.title || doc.doc_type || doc.file_name,
            document_type: doc.title || doc.document_type || doc.file_name,
            title: doc.title || doc.file_name,
            description: doc.description,
            file_name: doc.file_name,
            file_size: doc.file_size,
            file_size_formatted: doc.file_size_formatted || doc.file_size,
            file_type: doc.file_type,
            mime_type: doc.file_type,
            file_data: doc.file_data && doc.file_data.length < 50000 ? doc.file_data : undefined,
            data_url: doc.data_url && doc.data_url.length < 50000 ? doc.data_url : undefined,
            created_at: doc.uploaded_at || new Date().toISOString(),
          })),
        ]
        safeSaveDocsToLocalStorage("waste_documents_custom_v1", [...newArchivedDocs, ...filteredDocs])
      } catch (localErr) {
        console.warn("Erreur sauvegarde locale déchets et documents:", localErr)
      }

      // 2. Synchronisation Supabase Cloud en parallèle (sans bloquer l'ouverture de l'attestation)
      // NB : la table Cloud waste_batches ne possède PAS de colonnes center_code / center_id.
      // Les envoyer provoquait le rejet systématique de l'enregistrement par Supabase.
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

      let cloudOk = false
      let cloudErrMsg = ""
      try {
        const result: any = await Promise.race([
          (async () => {
            const bRes = await supabase.from("waste_batches").upsert(batchesPayload, { onConflict: "batch_number" })
            if (bRes.error) throw new Error(bRes.error.message)
            const mRes = await supabase.from("waste_movements").upsert(mvtsPayload, { onConflict: "mvt_number" })
            if (mRes.error) console.warn("Synchronisation Cloud waste_movements:", mRes.error.message)
            return true
          })(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Délai de connexion dépassé")), 15000)),
        ])
        cloudOk = result === true
      } catch (remoteErr: any) {
        cloudErrMsg = remoteErr?.message || String(remoteErr)
        console.error("Synchronisation Cloud waste_batches:", remoteErr)
      }

      if (!cloudOk) {
        toast.warning(
          `⚠️ Réception ${values.reception_number} enregistrée sur ce poste uniquement : l'envoi au Cloud a échoué (${cloudErrMsg}). ` +
          `Ne videz pas le navigateur ; une nouvelle tentative automatique est en cours.`,
          { duration: 15000 }
        )
        // Nouvelle tentative automatique via le mécanisme de rattrapage
        setTimeout(() => { syncPendingLocalDataToCloud() }, 5000)
      }

      broadcastDataMutation({
        entity: "waste_batches,waste_movements,waste_documents",
        action: isEditMode ? "update" : "create",
        id: values.reception_number,
      })

      setSavedSlipData(previewData)
      setShowPreviewModal(false)
      setShowSlipModal(true)
      toast.success(isEditMode 
        ? `Réception ${values.reception_number} mise à jour avec succès (${values.waste_items.length} déchet(s)) !`
        : `${values.waste_items.length} déchet(s) enregistré(s) avec succès pour ${values.source_structure} !`
      )
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

      {isEditMode && (
        <div className="p-3.5 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Pencil className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Mode Modification Activé — Réception N° {form.watch("reception_number")}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Vous apportez des corrections à cette réception. Vous pouvez modifier les quantités, dates, lots ou rajouter des documents omis.
              </p>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold shrink-0">
            Modification de Réception
          </Badge>
        </div>
      )}

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
                Références administratives et magasin de stockage de la prise en charge par l&apos;ABMed.
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

              {/* Champ Magasin selon observation ABMed 01 */}
              <FormField control={form.control} name="warehouse" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Warehouse className="h-3.5 w-3.5 text-emerald-600" />
                    Magasin de stockage <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-xs bg-background font-semibold">
                        <SelectValue placeholder="Sélectionner le magasin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WASTE_WAREHOUSES.map((w) => (
                        <SelectItem key={w} value={w} className="text-xs font-semibold">
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {form.watch("warehouse") === "Autres" && (
                <div className="md:col-span-4">
                  <FormField control={form.control} name="warehouse_other" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Précisez le magasin / lieu</FormLabel>
                      <FormControl><Input placeholder="Préciser l'emplacement ou magasin spécifique..." {...field} className="h-9 text-xs bg-background" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              <FormField control={form.control} name="delivery_slip_ref" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Réf. Bordereau d&apos;apport (externe)</FormLabel>
                  <FormControl><Input {...field} className="h-9 text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="md:col-span-3">
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

          {/* SECTION 2 : PROVENANCE & IDENTIFICATION DU CENTRE */}
          <Card className="shadow-sm border-2 border-primary/20 rounded-2xl bg-primary/[0.02]">
            <CardHeader className="p-4 pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-xs font-bold uppercase tracking-wider text-primary">
                  <Building2 className="mr-2 h-4 w-4 text-primary" />
                  2. Provenance & Structure qui a apporté les Déchets
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono font-bold bg-background">
                  {form.watch("center_code") || generatedCenterCode || "CTR-AUTO"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Ces informations s&apos;appliquent automatiquement à tous les déchets ajoutés ci-dessous.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              
              {/* SÉLECTEUR NOUVEAU vs ANCIEN CENTRE */}
              <div className="p-3 bg-background rounded-xl border border-border/70 space-y-2">
                <span className="text-xs font-bold text-foreground block">
                  Statut de l&apos;Établissement / Centre Apporteur :
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue("center_mode", "new")
                      form.setValue("center_code", generatedCenterCode)
                      setSelectedCenterCode("")
                    }}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      form.watch("center_mode") === "new"
                        ? "bg-[#1B5C2E] text-white border-[#1B5C2E] shadow-xs"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    Nouveau Centre
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      form.setValue("center_mode", "existing")
                    }}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      form.watch("center_mode") === "existing"
                        ? "bg-[#1B5C2E] text-white border-[#1B5C2E] shadow-xs"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    Ancien Centre (Répertorié)
                  </button>
                </div>

                {/* BANNIÈRE IDENTIFIANT ATTRIBUÉ OU CHOIX ANCIEN CENTRE */}
                {form.watch("center_mode") === "new" ? (
                  <div className="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#1B5C2E] shrink-0" />
                      <div>
                        <span className="font-semibold text-emerald-900 dark:text-emerald-300">
                          Identifiant unique créé automatiquement :
                        </span>
                        <span className="font-mono font-extrabold text-[#1B5C2E] ml-1.5 text-sm">
                          {form.watch("center_code") || generatedCenterCode}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-[#1B5C2E] text-white text-[10px]">1er Enregistrement</Badge>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Sélectionner le centre existant parmi les établissements enregistrés :
                    </label>
                    <Select
                      value={selectedCenterCode}
                      onValueChange={(code) => {
                        const val = code || ""
                        setSelectedCenterCode(val)
                        const found = registeredCenters.find(c => c.center_code === val)
                        if (found) {
                          form.setValue("center_code", found.center_code)
                          form.setValue("center_id", found.id)
                          form.setValue("source_structure", found.name, { shouldValidate: true })
                          if (found.center_type) form.setValue("source_type", found.center_type)
                          if (found.city) form.setValue("city", found.city)
                          if (found.phone) form.setValue("depositor_phone", found.phone)
                          if (found.contact_person) form.setValue("depositor_name", found.contact_person)
                          toast.info(`Centre ${found.center_code} chargé : ${found.name}`)
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Choisir un centre répertorié..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {registeredCenters.length === 0 ? (
                          <SelectItem value="none" disabled className="text-xs">
                            Aucun centre enregistré pour l&apos;instant
                          </SelectItem>
                        ) : (
                          registeredCenters.map((c) => (
                            <SelectItem key={c.center_code} value={c.center_code} className="text-xs">
                              [{c.center_code}] {c.name} — {c.city}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedCenterCode && (
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 text-xs flex items-center justify-between">
                        <span className="text-emerald-900 dark:text-emerald-300 font-medium">
                          Identifiant associé : <strong className="font-mono">{selectedCenterCode}</strong>
                        </span>
                        <Badge className="bg-emerald-700 text-white text-[10px]">Identifié</Badge>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CHAMPS DE SAISIE DE LA STRUCTURE ET DU DÉPOSANT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    <Select onValueChange={field.onChange} value={field.value || "Officine privée de pharmacie"}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs bg-background">
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WASTE_SOURCE_TYPES.map((st) => (
                          <SelectItem key={st} value={st} className="text-xs">
                            {st}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {field.value === "Zone Sanitaire" && (
                      <p className="text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg p-2 mt-1">
                        📦 <strong>Zone Sanitaire détectée :</strong> L&apos;option <strong>« Catégorie Mixte »</strong> (Solides, Liquides, Sirops & Divers) est activée ci-dessous pour faciliter la saisie de vos dépôts volumineux sans tri préalable séparé.
                      </p>
                    )}
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

                <div className="md:col-span-3">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Ville / Commune de provenance</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-9 text-xs bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

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
                        onClick={() => handleRemoveWasteItem(index)}
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

                    {/* Champ Nature des produits déclarés selon observation ABMed 02 */}
                    <FormField control={form.control} name={`waste_items.${index}.product_nature`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-foreground">
                          Nature des produits déclarés <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-xs bg-background font-semibold">
                              <SelectValue placeholder="Choisir la nature" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRODUCT_NATURES.map((nat) => (
                              <SelectItem key={nat} value={nat} className="text-xs">
                                {nat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Catégories officielles 1 à 5 selon observation ABMed 02 */}
                    <FormField control={form.control} name={`waste_items.${index}.product_category`} render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel className="text-xs font-bold text-foreground">
                          Catégorie Officielle ABMed <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-xs bg-background font-semibold">
                              <SelectValue placeholder="Choisir la catégorie officielle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-w-xl">
                            {PRODUCT_CATEGORIES.map((cat, catIdx) => (
                              <SelectItem key={catIdx} value={cat} className="text-xs whitespace-normal py-2 border-b last:border-b-0">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Précision si Nature = 'autres (à préciser)' */}
                    {form.watch(`waste_items.${index}.product_nature`) === "autres (à préciser)" && (
                      <div className="md:col-span-3">
                        <FormField control={form.control} name={`waste_items.${index}.product_nature_other`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold">Précisez la nature des produits</FormLabel>
                            <FormControl>
                              <Input placeholder="Précisez la nature exacte..." {...field} className="h-9 text-xs bg-background" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    )}

                    {/* Désignation commerciale / Nom de la spécialité */}
                    <FormField control={form.control} name={`waste_items.${index}.commercial_name`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Désignation commerciale / Spécialité (Optionnel)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Paracétamol 500mg, Amoxicilline..." {...field} className="h-9 text-xs bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Classification Réglementaire (avec Produits saisis) */}
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
                            {WASTE_CLASSIFICATIONS.map((c) => (
                              <SelectItem key={c} value={c} className="text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

                    {/* Conditionnement (avec Sacs de jute) */}
                    <FormField control={form.control} name={`waste_items.${index}.packaging`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Conditionnement</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Conditionnement" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {WASTE_PACKAGINGS.map((p) => (
                              <SelectItem key={p} value={p} className="text-xs">
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* État du Colisage (avec Autres) */}
                    <FormField control={form.control} name={`waste_items.${index}.packaging_condition`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">État du Colisage</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="État colis" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {PACKAGING_CONDITIONS.map((pc) => (
                              <SelectItem key={pc} value={pc} className="text-xs">
                                {pc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Motif du Dépôt (avec Issus de saisies et Rappel de lot) */}
                    <FormField control={form.control} name={`waste_items.${index}.destruction_motive`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Motif du Dépôt</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Motif" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {DESTRUCTION_MOTIVES.map((m) => (
                              <SelectItem key={m} value={m} className="text-xs">
                                {m}
                              </SelectItem>
                            ))}
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

                    <div className="md:col-span-2">
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
                    </div>

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

            {/* SECTION 4 : ANNÉES D'EXERCICE & VALORISATION FINANCIÈRE DES PRODUITS DÉCLARÉS (Image 3) */}
            <Card className="shadow-sm border border-emerald-500/30 rounded-2xl bg-emerald-500/[0.02]">
              <CardHeader className="p-4 pb-3 border-b border-border/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <CardTitle className="flex items-center text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    <CircleDollarSign className="mr-2 h-4 w-4 text-emerald-600" />
                    4. Années d&apos;Exercice & Valorisation Financière des Produits Déclarés
                  </CardTitle>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                    Redevance ABMed 8%
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Renseignez les années d&apos;exercice concernées et le coût total de cession pour le calcul automatique de la redevance de 8 % au compte de l&apos;ABMed.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                
                {/* 1. Sélection multiple des années d'exercice */}
                <div className="space-y-2 p-3 bg-background rounded-xl border border-border/70">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      Année(s) d&apos;exercice des produits déclarés <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Sélection multiple ({watchedYears.length} année{watchedYears.length > 1 ? 's' : ''} retenue{watchedYears.length > 1 ? 's' : ''})
                    </span>
                  </div>

                  {/* Badges cliquables des années récentes */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027].map((yr) => {
                      const yrStr = yr.toString()
                      const isSelected = watchedYears.includes(yrStr)
                      return (
                        <button
                          type="button"
                          key={yr}
                          onClick={() => handleToggleYear(yrStr)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? "bg-[#1B5C2E] text-white border-[#1B5C2E] shadow-xs"
                              : "bg-muted/40 text-muted-foreground border-border hover:border-emerald-500/60 hover:text-foreground"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          {yr}
                        </button>
                      )
                    })}

                    {/* Saisie d'une autre année personnalisée */}
                    <div className="flex items-center gap-1 ml-auto">
                      <Input
                        type="text"
                        maxLength={4}
                        placeholder="Autre année (ex: 2019)"
                        value={customYearInput}
                        onChange={(e) => setCustomYearInput(e.target.value.replace(/\D/g, ''))}
                        className="h-8 w-32 text-xs bg-background"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCustomYear()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomYear}
                        className="h-8 px-2 text-xs font-semibold gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Ajouter
                      </Button>
                    </div>
                  </div>

                  {/* Récapitulatif des années sélectionnées */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[11px] text-muted-foreground font-semibold mr-1">Années retenues :</span>
                    {watchedYears.map((yr) => (
                      <Badge 
                        key={yr} 
                        variant="secondary"
                        className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border-emerald-200 flex items-center gap-1 py-0.5"
                      >
                        {yr}
                        {watchedYears.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleToggleYear(yr)}
                            className="hover:text-red-600 cursor-pointer ml-0.5"
                            title="Retirer cette année"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 2. Coût de cession et Prix à 8% */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  
                  {/* Mode de coût de cession */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Régime du Coût de Cession <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={form.watch("transfer_cost_mode")}
                      onValueChange={(val: any) => form.setValue("transfer_cost_mode", val, { shouldValidate: true })}
                    >
                      <SelectTrigger className="h-9 text-xs bg-background font-semibold">
                        <SelectValue placeholder="Choisir le mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chiffre" className="text-xs font-semibold">
                          Montant chiffré (FCFA)
                        </SelectItem>
                        <SelectItem value="na" className="text-xs font-semibold">
                          NA (Non Applicable)
                        </SelectItem>
                        <SelectItem value="dons" className="text-xs font-semibold">
                          Dons
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Saisie du coût total si montant chiffré */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Coût Total de Cession {form.watch("transfer_cost_mode") === "chiffre" && <span className="text-red-500">*</span>}
                    </label>
                    {form.watch("transfer_cost_mode") === "chiffre" ? (
                      <FormField
                        control={form.control}
                        name="transfer_cost_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="1"
                                  min="0"
                                  placeholder="0"
                                  {...field}
                                  className="h-9 text-xs font-bold font-mono pr-14 bg-background"
                                />
                                <span className="absolute right-2.5 top-2 text-[11px] font-bold text-muted-foreground pointer-events-none">
                                  FCFA
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="h-9 px-3 rounded-md border border-border bg-muted/40 flex items-center text-xs font-bold font-mono text-muted-foreground">
                        {form.watch("transfer_cost_mode") === "na" ? "NA (Non Applicable)" : "Dons"}
                      </div>
                    )}
                  </div>

                  {/* Prix à 8% calculé automatiquement */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
                      <span>Prix à 8 % (Compte ABMed)</span>
                      <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 font-mono font-bold">
                        Automatique
                      </Badge>
                    </label>

                    <div className="h-9 px-3 rounded-md border-2 border-emerald-500/40 bg-emerald-500/10 flex items-center justify-between">
                      <span className="text-xs text-emerald-900 dark:text-emerald-200 font-semibold">
                        À payer :
                      </span>
                      <span className="text-xs font-black font-mono text-emerald-700 dark:text-emerald-300">
                        {form.watch("transfer_cost_mode") === "chiffre" ? (
                          `${Math.round((Number(form.watch("transfer_cost_amount")) || 0) * 0.08).toLocaleString('fr-FR')} FCFA`
                        ) : form.watch("transfer_cost_mode") === "dons" ? (
                          "Exonéré (Dons)"
                        ) : (
                          "NA"
                        )}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Note explicative réglementaire */}
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                  <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Le prix de 8 % est calculé automatiquement sur la valeur déclarée des produits à détruire et doit être versé au compte de l&apos;ABMed comme redevance réglementaire de prise en charge.
                  </span>
                </div>

              </CardContent>
            </Card>

            {/* 5. DOCUMENTS & PIÈCES JUSTIFICATIVES APPORTÉS */}
            <Card className="border-border/70 shadow-xs">
              <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-[#1B5C2E]" />
                      5. Documents & Pièces Justificatives Apportés (Optionnel)
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
                        onChange={handleMultipleFilesChange} 
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,image/*" 
                        className="hidden" 
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingDoc}
                        className="flex-1 h-9 text-xs font-bold gap-1.5 bg-[#1B5C2E] hover:bg-[#144723] text-white truncate shadow-xs cursor-pointer"
                        title="Sélectionner un ou plusieurs fichiers (PDF, photos, etc.)"
                      >
                        {isUploadingDoc ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin text-white shrink-0" />
                            <span className="truncate">Optimisation en cours...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 stroke-[3] shrink-0" />
                            <span className="truncate">Ajouter des documents (+)</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
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
                        className="h-7 text-xs font-bold text-[#1B5C2E] hover:text-[#144723] hover:bg-[#1B5C2E]/10 gap-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> + Ajouter encore d&apos;autres documents
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
                      <span className="text-slate-500">Magasin de stockage :</span>{" "}
                      <strong className="text-slate-900">{previewData.warehouse || "Magasin Cotonou"}</strong>
                    </p>
                    <p>
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

                {/* ENCART VALORISATION FINANCIÈRE ET ANNÉES D'EXERCICE */}
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs space-y-1">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-200 pb-1">
                    3. Années d&apos;exercice & Valorisation Financière (Redevance ABMed 8%)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <span className="text-slate-500">Année(s) d&apos;exercice :</span>{" "}
                      <strong className="text-slate-900 font-mono">
                        {Array.isArray(previewData.exercise_years) ? previewData.exercise_years.join(', ') : previewData.exercise_years}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Coût total de cession :</span>{" "}
                      <strong className="text-slate-900 font-mono">
                        {previewData.transfer_cost_mode === "chiffre"
                          ? `${(Number(previewData.transfer_cost_amount) || 0).toLocaleString('fr-FR')} FCFA`
                          : (previewData.transfer_cost_mode === "na" ? "NA" : "Dons")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-800 font-bold">Prix à 8 % (Compte ABMed) :</span>{" "}
                      <strong className="text-emerald-700 font-mono font-black">
                        {typeof previewData.abmed_fee_8_percent === 'number'
                          ? `${previewData.abmed_fee_8_percent.toLocaleString('fr-FR')} FCFA`
                          : previewData.abmed_fee_8_percent}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    4. Détail des Déchets à Réceptionner ({previewData.items.length} lots)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-300 rounded overflow-hidden">
                      <thead className="bg-[#1B5C2E] text-white text-[11px]">
                        <tr>
                          <th className="p-2 border-r border-[#1B5C2E]/30 whitespace-nowrap">N° Lot Déchet</th>
                          <th className="p-2 border-r border-[#1B5C2E]/30">Catégorie & Nature</th>
                          <th className="p-2 border-r border-[#1B5C2E]/30">Classification & Spécialité</th>
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
                              <p className="font-semibold text-slate-900 text-[11px]">{item.product_category ? item.product_category.split(':')[0] : "Catégorie"}</p>
                              {item.product_nature && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 bg-slate-100 text-slate-700 border-slate-300">
                                  {item.product_nature}
                                </Badge>
                              )}
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
                            <td colSpan={5} className="p-2 text-right border-r border-slate-300">
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
                      <span className="text-slate-500">Magasin de stockage :</span>{" "}
                      <strong className="text-slate-900">{savedSlipData.warehouse || "Magasin Cotonou"}</strong>
                    </p>
                    <p>
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

                {/* ENCART VALORISATION FINANCIÈRE ET ANNÉES D'EXERCICE */}
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs space-y-1">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-200 pb-1">
                    3. Années d&apos;exercice & Valorisation Financière (Redevance ABMed 8%)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <span className="text-slate-500">Année(s) d&apos;exercice :</span>{" "}
                      <strong className="text-slate-900 font-mono">
                        {Array.isArray(savedSlipData.exercise_years) ? savedSlipData.exercise_years.join(', ') : savedSlipData.exercise_years}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Coût total de cession :</span>{" "}
                      <strong className="text-slate-900 font-mono">
                        {savedSlipData.transfer_cost_mode === "chiffre"
                          ? `${(Number(savedSlipData.transfer_cost_amount) || 0).toLocaleString('fr-FR')} FCFA`
                          : (savedSlipData.transfer_cost_mode === "na" ? "NA" : "Dons")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-800 font-bold">Prix à 8 % (Compte ABMed) :</span>{" "}
                      <strong className="text-emerald-700 font-mono font-black">
                        {typeof savedSlipData.abmed_fee_8_percent === 'number'
                          ? `${savedSlipData.abmed_fee_8_percent.toLocaleString('fr-FR')} FCFA`
                          : savedSlipData.abmed_fee_8_percent}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* TABLEAU RÉCAPITULATIF DES DÉCHETS REÇUS */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    4. Détail des Déchets Réceptionnés ({savedSlipData.items.length} lots)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-300 rounded overflow-hidden">
                      <thead className="bg-[#1B5C2E] text-white text-[11px]">
                        <tr>
                          <th className="p-2 border-r border-[#1B5C2E]/30 whitespace-nowrap">N° Lot Déchet</th>
                          <th className="p-2 border-r border-[#1B5C2E]/30">Catégorie & Nature</th>
                          <th className="p-2 border-r border-[#1B5C2E]/30">Classification & Spécialité</th>
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
                              <p className="font-semibold text-slate-900 text-[11px]">{item.product_category ? item.product_category.split(':')[0] : "Catégorie"}</p>
                              {item.product_nature && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 bg-slate-100 text-slate-700 border-slate-300">
                                  {item.product_nature}
                                </Badge>
                              )}
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
                              {item.packaging}
                            </td>
                            <td className="p-2 text-right font-black text-slate-900 whitespace-nowrap">
                              {item.quantity} {item.unit}
                            </td>
                          </tr>
                        ))}
                        {savedSlipData.items.length > 1 && (
                          <tr className="bg-slate-100 font-bold">
                            <td colSpan={4} className="p-2 text-right border-r border-slate-300">
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
                  Système de Gestion de l&apos;Échantillothèque et des Déchets (eGED) — République du Bénin — Document généré électroniquement
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

export default function NewWasteReceptionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-sm">Chargement de la réception des déchets...</div>}>
      <NewWasteReceptionContent />
    </Suspense>
  )
}
