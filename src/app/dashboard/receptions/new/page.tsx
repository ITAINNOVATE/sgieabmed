"use client"

import { useState, useRef, Suspense } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

import { 
  ArrowLeft, Save, Building2, FileSignature, Truck, CheckSquare, 
  Box, Paperclip, ShieldCheck, MessageSquare, Plus, Trash2, Printer, Download, UploadCloud, CheckCircle2, X, FileUp, FileText
} from "lucide-react"
import { exportReceptionVoucherPDF } from "@/utils/exportUtils"
import { getUsers, User } from "@/app/dashboard/admin/adminMockData"
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

export const GALENIC_FORM_GROUPS = [
  {
    group: "Formes orales sèches / solides",
    items: [
      "Comprimé",
      "Comprimé pelliculé",
      "Comprimé effervescent",
      "Comprimé enrobé",
      "Comprimé sécable",
      "Comprimé à croquer",
      "Comprimé orodispersible",
      "Comprimé à libération prolongée",
      "Gélule",
      "Capsule",
      "Sachet",
      "Granulés",
      "Poudre orale",
    ],
  },
  {
    group: "Formes orales liquides",
    items: [
      "Sirop",
      "Solution buvable",
      "Suspension buvable",
      "Gouttes buvables",
      "Ampoule buvable",
      "Émulsion buvable",
    ],
  },
  {
    group: "Formes injectables & perfusions",
    items: [
      "Solution injectable",
      "Suspension injectable",
      "Poudre pour préparation injectable",
      "Solution pour perfusion",
    ],
  },
  {
    group: "Formes cutanées, locales & externes",
    items: [
      "Pommade",
      "Crème",
      "Gel",
      "Lotion",
      "Collyre",
      "Gouttes auriculaires / nasales",
      "Spray / Aérosol",
      "Inhalateur",
      "Bain de bouche",
      "Patch transdermique",
    ],
  },
  {
    group: "Formes rectales & vaginales",
    items: [
      "Suppositoire",
      "Ovule",
    ],
  },
  {
    group: "Autre",
    items: [
      "Autre",
    ],
  },
]

export const ALL_GALENIC_FORMS = GALENIC_FORM_GROUPS.flatMap((g) => g.items)

export const DOSAGE_GROUPS = [
  {
    group: "Milligrammes (mg) - Doses courantes",
    items: [
      "100 mg",
      "125 mg",
      "150 mg",
      "200 mg",
      "250 mg",
      "300 mg",
      "400 mg",
      "500 mg",
      "600 mg",
      "750 mg",
      "800 mg",
      "875 mg",
      "1 000 mg",
    ],
  },
  {
    group: "Milligrammes (mg) - Faibles doses",
    items: [
      "0.25 mg",
      "0.5 mg",
      "1 mg",
      "2 mg",
      "2.5 mg",
      "5 mg",
      "10 mg",
      "15 mg",
      "20 mg",
      "25 mg",
      "30 mg",
      "40 mg",
      "50 mg",
      "60 mg",
      "75 mg",
      "80 mg",
    ],
  },
  {
    group: "Grammes (g)",
    items: [
      "1 g",
      "1.5 g",
      "2 g",
      "3 g",
      "4 g",
      "5 g",
    ],
  },
  {
    group: "Microgrammes (µg / mcg)",
    items: [
      "25 µg",
      "50 µg",
      "75 µg",
      "100 µg",
      "125 µg",
      "150 µg",
      "200 µg",
      "250 µg",
      "500 µg",
    ],
  },
  {
    group: "Formes liquides, sirops & suspensions",
    items: [
      "100 mg/5ml",
      "125 mg/5ml",
      "150 mg/5ml",
      "200 mg/5ml",
      "250 mg/5ml",
      "500 mg/5ml",
      "1 mg/ml",
      "2 mg/ml",
      "5 mg/ml",
      "10 mg/ml",
      "20 mg/ml",
      "50 mg/ml",
      "100 mg/ml",
    ],
  },
  {
    group: "Pourcentages (%) - Pommades, Collyres & Solutés",
    items: [
      "0.05%",
      "0.1%",
      "0.2%",
      "0.5%",
      "0.9%",
      "1%",
      "2%",
      "3%",
      "5%",
      "10%",
      "20%",
      "30%",
      "50%",
    ],
  },
  {
    group: "Unités Internationales (UI)",
    items: [
      "100 UI",
      "200 UI",
      "400 UI",
      "500 UI",
      "800 UI",
      "1 000 UI",
      "2 000 UI",
      "5 000 UI",
      "10 000 UI",
      "20 000 UI",
      "50 000 UI",
      "100 000 UI",
      "500 000 UI",
      "1 000 000 UI",
      "2 400 000 UI",
    ],
  },
  {
    group: "Volumes / Solutions injectables & perfusions (ml)",
    items: [
      "0.5 ml",
      "1 ml",
      "2 ml",
      "3 ml",
      "5 ml",
      "10 ml",
      "20 ml",
      "50 ml",
      "100 ml",
      "250 ml",
      "500 ml",
      "1 000 ml",
    ],
  },
  {
    group: "Autre",
    items: [
      "Autre",
    ],
  },
]

export const ALL_DOSAGES = DOSAGE_GROUPS.flatMap((g) => g.items)

// Composant DCI + Dosage dynamique par produit
function DciDosageList({ value, onChange }: { value: {dci: string, dosage: string}[], onChange: (v: {dci: string, dosage: string}[]) => void }) {
  const addRow = () => onChange([...value, { dci: '', dosage: '' }])
  const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: 'dci' | 'dosage', val: string) => {
    const updated = value.map((row, idx) => idx === i ? { ...row, [field]: field === 'dci' ? val.toUpperCase() : val } : row)
    onChange(updated)
  }

  const normalizeDosage = (str: string) => (str || '').replace(/[\s\u00A0\u202F]+/g, '').toLowerCase()

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/80">DCI & Dosage</span>
        <Button type="button" size="sm" variant="outline" onClick={addRow} className="h-6 px-2 text-xs gap-1">
          <Plus className="h-3 w-3" /> Ajouter un principe actif (DCI)
        </Button>
      </div>
      {value.map((row, i) => {
        const currentDosage = row.dosage || ""
        const normalizedCurrent = normalizeDosage(currentDosage)
        const matchedDosage = ALL_DOSAGES.find(
          (d) => normalizeDosage(d) === normalizedCurrent
        )
        const isOther =
          currentDosage === "Autre" ||
          (currentDosage !== "" && !matchedDosage)
        const selectValue = matchedDosage || (isOther ? "Autre" : "")

        return (
          <div key={i} className="p-2.5 rounded-lg bg-muted/20 border border-border/50 space-y-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1 min-w-0">
                <label className="text-[11px] font-medium text-foreground/70 mb-1 block">
                  DCI (Principe actif) {value.length > 1 ? `#${i + 1}` : ""}
                </label>
                <UppercaseInput
                  value={row.dci}
                  onChange={(e) => updateRow(i, 'dci', e.target.value)}
                  className="text-xs h-9 bg-background w-full"
                />
              </div>

              <div className="w-44 sm:w-52 shrink-0">
                <label className="text-[11px] font-medium text-foreground/70 mb-1 block">
                  Dosage
                </label>
                <Select
                  value={selectValue}
                  onValueChange={(val) => {
                    if (val === "Autre") {
                      updateRow(i, 'dosage', 'Autre')
                    } else {
                      updateRow(i, 'dosage', val || '')
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-background w-full">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {DOSAGE_GROUPS.map((grp) => (
                      <SelectGroup key={grp.group}>
                        <SelectLabel className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider py-1">
                          {grp.group}
                        </SelectLabel>
                        {grp.items.map((dos) => (
                          <SelectItem key={dos} value={dos} className="text-xs">
                            {dos === "Autre" ? "Autre (préciser...)" : dos}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {value.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeRow(i)}
                  className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                  title="Supprimer cette ligne DCI / Dosage"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {isOther && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 pt-1.5 border-t border-border/30 animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                  Préciser le dosage :
                </span>
                <UppercaseInput
                  className="h-8 text-xs bg-background flex-1 sm:max-w-xs"
                  autoFocus={currentDosage === "Autre"}
                  value={currentDosage === "Autre" ? "" : currentDosage}
                  onChange={(e) => {
                    const val = e.target.value
                    updateRow(i, 'dosage', val.trim() === "" ? "Autre" : val)
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const DEFAULT_VALIDATORS = [
  { id: 'usr-1', name: 'Admin EGED (Administrateur Système)' },
  { id: 'usr-2', name: 'Jocelyne SATCHIVI (Responsable Échantillothèque)' },
  { id: 'usr-3', name: 'Hubert ALOFA (Responsable Échantillothèque)' },
  { id: 'usr-6', name: "Marie-Josée D'ALMEIDA (Auditeur Qualité)" },
  { id: 'usr-7', name: 'Radihath AROUNA (Agent de Saisie & Laboratoire)' },
  { id: 'usr-8', name: 'Aimé DASSI (Responsable Déchets Pharmaceutiques)' },
  { id: 'usr-9', name: 'Iréné GANHOU (Responsable Déchets Pharmaceutiques)' },
]

function NewReceptionContent() {
  // État local pour les listes DCI/Dosage par produit (index échantillon -> tableau)
  const [dciLists, setDciLists] = React.useState<{dci: string, dosage: string}[][]>([[{ dci: '', dosage: '' }]])
  const [isSaving, setIsSaving] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [receptionStatus, setReceptionStatus] = useState<string>("En attente")
  const [attachedFiles, setAttachedFiles] = useState<Array<{ 
    id?: string
    name: string
    title?: string
    description?: string
    url: string
    type: string
    size?: string 
  }>>([])
  const [docTitle, setDocTitle] = useState("")
  const [docDescription, setDocDescription] = useState("")
  const [pendingFile, setPendingFile] = useState<{ name: string; size: string; type: string; base64: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [validators, setValidators] = useState<{id: string, name: string}[]>(DEFAULT_VALIDATORS)
  const [autoSaveTime, setAutoSaveTime] = useState<string | null>(null)
  const AUTO_SAVE_KEY = 'reception_form_autosave'

  React.useEffect(() => {
    async function loadValidators() {
      try {
        const users = await getUsers()
        const activeAccounts = users
          .filter(u => u.status === "Actif" && !u.is_deleted)
          .map(u => ({
            id: u.id,
            name: `${u.first_name} ${u.last_name} (${u.role || u.fonction || 'Responsable'})`,
          }))

        if (activeAccounts.length > 0) {
          setValidators(activeAccounts)
        }
      } catch (err) {
        console.warn("Utilisation des comptes actifs par défaut:", err)
      }
    }
    loadValidators()
  }, [])

  const router = useRouter()
  const nextSearchParams = useSearchParams()
  const supabase = createClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      rec_number: "REC-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000),
      date_reception: new Date().toISOString().split('T')[0],
      time_reception: new Date().toTimeString().split(' ')[0].substring(0, 5),
      inspector: "Admin EGED",
      status: "En attente",
      samples: [{ commercial_name: "", dci: "", form: "", category: "", batch: "", exp_date: "", qty: 1 }],
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
  const editId = nextSearchParams.get("id") || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get("id") : null)
  const watchedStatus = form.watch("status")
  const isValidated = ["Validée", "Finalisé", "Finalisée"].includes(receptionStatus) || ["Validée", "Finalisé", "Finalisée"].includes(watchedStatus)

  React.useEffect(() => {
    if (!editId) return

    async function loadExistingReception() {
      try {
        let sourceData: any = null
        let savedDciLists: any = null
        let localStatus: string | null = null
        let localValidatorName: string | null = null
        let localValidationDate: string | null = null

        // 1. Tenter depuis localStorage d'abord (détails complets avec DCI multiples + historique)
        try {
          const rawDetails = localStorage.getItem('reception_draft_details_' + editId)
          if (rawDetails) {
            const parsed = JSON.parse(rawDetails)
            sourceData = parsed.formData
            savedDciLists = parsed.dciLists
            localStatus = parsed.status || parsed.formData?.status || null
            localValidatorName = parsed.formData?.validator_name || null
            localValidationDate = parsed.formData?.validation_date || null
          }

          const historyRecords = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
          const histMatch = historyRecords.find((r: any) => r.rec_number === editId || r.id === editId)
          if (histMatch) {
            if (["Validée", "Finalisé", "Finalisée"].includes(histMatch.status)) {
              localStatus = "Validée"
            } else if (!localStatus && histMatch.status) {
              localStatus = histMatch.status
            }
            if (histMatch.validator_name) localValidatorName = histMatch.validator_name
            if (histMatch.validation_date) localValidationDate = histMatch.validation_date
          }
        } catch (e) {}

        // 2. Vérifier également dans Supabase pour récupérer le statut à jour ou les données si absentes en local
        try {
          const { data } = await supabase
            .from('receptions')
            .select('*')
            .or(`rec_number.eq.${editId},id.eq.${editId}`)
            .maybeSingle()
          
          if (data) {
            if (["Validée", "Finalisé", "Finalisée"].includes(data.status)) {
              localStatus = "Validée"
            } else if (!localStatus && data.status) {
              localStatus = data.status
            }
            if (data.validator_name) localValidatorName = data.validator_name
            if (data.validation_date) localValidationDate = data.validation_date

            if (!sourceData) {
              sourceData = data
              if (Array.isArray(data.samples_data) && data.samples_data.length > 0 && data.samples_data[0]?.commercial_name) {
                sourceData.samples = data.samples_data
              } else {
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
          }
        } catch (e) {}

        // 3. Pré-remplir le formulaire avec les données restaurées et le statut exact
        if (sourceData) {
          const finalStatus = ["Validée", "Finalisé", "Finalisée"].includes(localStatus || sourceData.status || "")
            ? "Validée"
            : (localStatus || sourceData.status || "En attente de validation")

          setReceptionStatus(finalStatus)

          form.reset({
            rec_number: sourceData.rec_number || editId,
            date_reception: sourceData.date_reception || new Date().toISOString().split('T')[0],
            time_reception: sourceData.time_reception || "12:00",
            ref_document: sourceData.ref_document || "",
            type_reception: sourceData.type_reception || "",
            inspector: sourceData.inspector || "Admin EGED",
            status: finalStatus,
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
            validator_name: localValidatorName || sourceData.validator_name || "",
            validation_date: localValidationDate || sourceData.validation_date || "",
            samples: sourceData.samples && sourceData.samples.length > 0
              ? sourceData.samples
              : [{ commercial_name: "", dci: "", form: "", category: "", batch: "", exp_date: "", qty: 1 }],
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
    values.status = status
    setReceptionStatus(status)
    form.setValue("status", status)
    
    // Sauvegarder les détails complets du formulaire pour restauration exacte
    try {
      localStorage.setItem('reception_draft_details_' + values.rec_number, JSON.stringify({
        formData: { ...values, attachedFiles },
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
      inspector: values.inspector || "Admin EGED",
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
      samples_data: (values.samples || []).filter(s => s.commercial_name && s.commercial_name.trim() !== ""),
    }

    // Toujours persister dans l'historique local pour affichage garanti dans l'historique
    try {
      localStorage.removeItem('all_data_wiped')
      const existingHistory = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
      const newRecord = {
        id: values.rec_number,
        rec_number: values.rec_number,
        date_reception: values.date_reception || new Date().toISOString().split('T')[0],
        supplier: values.supplier || "DEMANDEUR NON PRÉCISÉ",
        status: status,
        inspector: values.inspector || "Admin EGED",
        created_at: new Date().toISOString(),
        samples: [{ count: (values.samples || []).filter(s => s.commercial_name && s.commercial_name.trim() !== "").length }],
      }
      const filteredHistory = existingHistory.filter((r: any) => r.rec_number !== values.rec_number)
      localStorage.setItem('reception_history_records', JSON.stringify([newRecord, ...filteredHistory]))
    } catch (e) {
      console.warn("Erreur sauvegarde locale historique:", e)
    }

    // ─── Enregistrement dans la documentation des échantillons ─────────────────
    try {
      const storedSampleDocs = JSON.parse(localStorage.getItem("sample_documents_custom_v1") || "[]")
      const supplierName = values.supplier || values.manufacturer || "DEMANDEUR NON PRÉCISÉ"
      const recDate = values.date_reception || new Date().toISOString().split("T")[0]

      const newSampleDocs = [
        // A. Bordereau officiel de réception d'échantillons eGED
        {
          id: `doc-slip-sample-${values.rec_number}`,
          reception_number: values.rec_number,
          source_structure: supplierName,
          source_type: "Structure déposante d'échantillons",
          city: values.city || "Cotonou",
          depositor_name: values.contact_person || values.inspector || "Agent ABMed",
          depositor_phone: values.phone,
          date: recDate,
          reception_date: recDate,
          doc_category: "Attestation eGED",
          category: "acte_administratif",
          doc_type: "Bordereau de réception officiel eGED",
          document_type: "Bordereau de réception officiel eGED",
          title: `Bordereau de Réception ${values.rec_number}`,
          file_name: `Bordereau-Reception-${values.rec_number}.pdf`,
          file_size_formatted: "PDF Officiel eGED",
          file_type: "application/pdf",
          created_at: new Date().toISOString(),
        },
        // B. Documents apportés téléversés
        ...attachedFiles.map((file, fIdx) => ({
          id: file.id || `doc-att-${values.rec_number}-${fIdx}`,
          reception_number: values.rec_number,
          source_structure: supplierName,
          source_type: "Structure déposante d'échantillons",
          city: values.city || "Cotonou",
          depositor_name: values.contact_person || values.inspector || "Agent ABMed",
          depositor_phone: values.phone,
          date: recDate,
          reception_date: recDate,
          doc_category: "Document apporteur" as const,
          category: "piece_apporteur",
          doc_type: file.title || file.name,
          document_type: file.title || file.name,
          title: file.title || file.name,
          description: file.description,
          file_name: file.name,
          file_size_formatted: file.size,
          file_type: file.type,
          data_url: file.url,
          file_data: file.url,
          created_at: new Date().toISOString(),
        }))
      ]

      const filteredExisting = storedSampleDocs.filter((d: any) => d.reception_number !== values.rec_number)
      localStorage.setItem("sample_documents_custom_v1", JSON.stringify([...newSampleDocs, ...filteredExisting]))
    } catch (docErr) {
      console.warn("Erreur sauvegarde locale documentation échantillons:", docErr)
    }

    // ─── Préparation des échantillons et mouvements ────────────────────────────
    const validSamples = (values.samples || []).filter(s => s.commercial_name && s.commercial_name.trim() !== "")
    let newMovements: any[] = []

    if (validSamples.length > 0) {
      try {
        const localMovements = JSON.parse(localStorage.getItem('local_movements_history') || '[]')
        newMovements = validSamples.map((sample, idx) => {
          const sampleNum = `ECH-${values.rec_number.replace('REC-', '')}-${idx + 1}`
          return {
            id: `mvt-${values.rec_number}-${idx}`,
            mvt_number: `MVT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
            sample_id: `sample-${values.rec_number}-${idx}`,
            sample_number: sampleNum,
            commercial_name: (sample.commercial_name || '').toUpperCase(),
            batch_number: (sample.batch || 'LOT-TEMP').toUpperCase(),
            movement_type: "Entrée",
            quantity: Number(sample.qty) || 1,
            source_location: values.supplier || "Fournisseur / Demandeur",
            destination_location: "Zone de Réception / Quarantaine",
            reason: `Réception d'échantillons - Réf: ${values.rec_number}`,
            observations: values.global_comments || `Réception enregistrée par ${values.inspector || 'Admin EGED'}`,
            movement_date: values.date_reception ? new Date(values.date_reception).toISOString() : new Date().toISOString(),
            operator: values.inspector || "Admin EGED",
            status: status === "Validée" ? "Validé" : "En attente de validation",
            new_quantity: Number(sample.qty) || 1,
            new_status: status === "Validée" ? "Disponible" : "À localiser",
            new_location: "Zone de Réception / Quarantaine",
          }
        })

        const filteredMovements = localMovements.filter((m: any) => !m.id?.startsWith(`mvt-${values.rec_number}-`))
        localStorage.setItem('local_movements_history', JSON.stringify([...newMovements, ...filteredMovements]))
      } catch (errMvt) {
        console.warn("Erreur génération mouvements locale:", errMvt)
      }
    }

    // ─── Synchronisation Cloud parallèle ultra-rapide (Promise.all) ───────────
    const syncPromise = Promise.all([
      (async () => {
        try {
          const { error } = await supabase.from('receptions').upsert(fullPayload, { onConflict: 'rec_number' })
          if (!error) {
            try {
              const syncedIds = JSON.parse(localStorage.getItem('reception_synced_cloud_ids') || '[]')
              if (!syncedIds.includes(values.rec_number)) {
                syncedIds.push(values.rec_number)
                localStorage.setItem('reception_synced_cloud_ids', JSON.stringify(syncedIds))
              }
            } catch (e) {}
          }
        } catch (dbErr) {
          console.warn("Supabase receptions sync warning:", dbErr)
        }
      })(),
      (async () => {
        if (validSamples.length === 0) return
        try {
          const samplesToUpsert = validSamples.map((sample, idx) => ({
            sample_number: `ECH-${values.rec_number.replace('REC-', '')}-${idx + 1}`,
            reception_ref: values.rec_number,
            commercial_name: sample.commercial_name,
            dci: sample.dci || null,
            dosage: sample.dosage || null,
            batch_number: sample.batch || 'LOT-TEMP',
            expiry_date: sample.exp_date && sample.exp_date.trim() !== '' ? sample.exp_date : null,
            quantity: Number(sample.qty) || 1,
            status: status === 'Validée' ? 'Disponible' : 'À localiser',
            current_location: 'Zone de Réception / Quarantaine',
            manufacturer_name: values.manufacturer || null,
            supplier_name: values.supplier || null,
          }))
          await supabase.from('samples').upsert(samplesToUpsert, { onConflict: 'sample_number' })
        } catch (sErr) {
          console.warn("Erreur upsert échantillons:", sErr)
        }
      })(),
      (async () => {
        if (newMovements.length === 0) return
        try {
          const movementsPayload = newMovements.map((mvt) => ({
            mvt_number: mvt.mvt_number,
            movement_date: mvt.movement_date,
            movement_type: 'Entrée',
            sample_id: mvt.sample_id,
            sample_number: mvt.sample_number,
            commercial_name: mvt.commercial_name,
            batch_number: mvt.batch_number,
            quantity: mvt.quantity,
            source_location: mvt.source_location,
            destination_location: mvt.destination_location,
            operator: mvt.operator,
            reason: mvt.reason,
            observations: mvt.observations,
            status: mvt.status,
            reference_document: values.rec_number,
          }))
          await supabase.from('movements').upsert(movementsPayload, { onConflict: 'mvt_number' })
        } catch (mErr) {
          console.warn("Échec upsert movements Supabase:", mErr)
        }
      })()
    ])

    // Attendre au maximum 800ms pour une navigation quasi-instantanée tout en laissant la requête aboutir
    await Promise.race([
      syncPromise,
      new Promise(resolve => setTimeout(resolve, 800))
    ])
  }

  // ─── Sauvegarder (En instance de validation) ──────────────────────────────
  const onDraft = async () => {
    if (isValidated) {
      toast.info("Cette réception est déjà validée et ne peut plus être modifiée.")
      return
    }
    setIsDrafting(true)
    try {
      await saveReceptionToSupabase("En attente de validation")
      localStorage.removeItem(AUTO_SAVE_KEY)
      toast.success("Réception enregistrée avec succès !", { duration: 2500 })
      router.push("/dashboard/receptions?status=en_attente")
    } catch (err: any) {
      console.error(err)
      toast.error(`Erreur : ${err.message || "Impossible de sauvegarder la réception."}`)
    } finally {
      setIsDrafting(false)
    }
  }

  // ─── Soumettre la réception pour validation ───────────────────────────────
  const onSubmit = async () => {
    if (isValidated) {
      toast.info("Cette réception est déjà validée et ne peut plus être soumise à nouveau.")
      return
    }
    setIsSaving(true)
    try {
      await saveReceptionToSupabase("En attente de validation")
      localStorage.removeItem(AUTO_SAVE_KEY)
      toast.success("Réception soumise avec succès !", { duration: 2500 })
      router.push("/dashboard/receptions?status=en_attente")
    } catch (err: any) {
      console.error(err)
      toast.error(`Erreur : ${err.message || "Impossible de soumettre la réception."}`)
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Validation officielle par le responsable ──────────────────────────────
  const onValidateByValidator = async () => {
    if (isValidated) {
      toast.info("Cette réception est déjà validée.")
      return
    }
    setIsSaving(true)
    try {
      await saveReceptionToSupabase("Validée")
      localStorage.removeItem(AUTO_SAVE_KEY)
      toast.success("Réception validée avec succès ! (Statut: Finalisé)", { duration: 2500 })
      router.push("/dashboard/receptions")
    } catch (err: any) {
      console.error(err)
      toast.error(`Erreur : ${err.message || "Impossible de valider la réception."}`)
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Upload / Attachement de fichier ──────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier sélectionné dépasse la taille limite autorisée de 10 Mo.")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setIsUploadingFile(true)
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

      setIsUploadingFile(false)
      toast.info(`Fichier sélectionné : ${file.name}`)
    }
    reader.onerror = () => {
      setIsUploadingFile(false)
      toast.error("Erreur lors de la lecture du fichier.")
    }
    reader.readAsDataURL(file)
  }

  const handleAddAttachedDoc = () => {
    if (!pendingFile) {
      fileInputRef.current?.click()
      return
    }

    const titleToUse = docTitle.trim() || pendingFile.name

    const newDoc = {
      id: `att-doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: pendingFile.name,
      title: titleToUse,
      description: docDescription.trim() || undefined,
      url: pendingFile.base64,
      type: pendingFile.type,
      size: pendingFile.size,
    }

    setAttachedFiles(prev => [...prev, newDoc])
    setDocTitle("")
    setDocDescription("")
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    toast.success(`Document « ${titleToUse} » ajouté. Vous pouvez en ajouter d'autres.`)
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
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                {editId ? `Réception ${form.watch("rec_number") || editId}` : "Nouvelle Réception"}
              </h2>
              {isValidated && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-bold">
                  Validée / Finalisée
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {isValidated ? "Consultation d'une réception déjà validée (lecture seule)" : "Formulaire de contrôle et d'enregistrement"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button type="button" variant="ghost" onClick={handlePrint} className="hidden sm:inline-flex text-xs h-9">
            <Printer className="mr-2 h-4 w-4" /> Imprimer
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPDF}
            className="flex-1 sm:flex-initial border-[#1B5C2E] text-[#1B5C2E] bg-[#1B5C2E]/5 hover:bg-[#1B5C2E]/15 font-bold cursor-pointer text-xs h-9"
          >
            <Download className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Télécharger l&apos;Attestation (PDF)</span><span className="sm:hidden">Attestation (PDF)</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onDraft}
            disabled={isDrafting || isValidated}
            className={`flex-1 sm:flex-initial text-xs h-9 ${isValidated ? "bg-muted text-muted-foreground/70 cursor-not-allowed opacity-60 border border-border/80" : ""}`}
            title={isValidated ? "Cette réception est déjà validée et ne peut plus être sauvegardée." : ""}
          >
            <Save className="mr-1.5 h-4 w-4" />
            {isDrafting ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit()}
            disabled={isSaving || isValidated}
            className={`w-full sm:w-auto text-xs h-9 font-bold ${
              isValidated
                ? "bg-muted text-muted-foreground/70 cursor-not-allowed opacity-60 border border-border/80"
                : "shadow-md bg-[#1B5C2E] hover:bg-[#154824] text-white"
            }`}
            title={isValidated ? "Cette réception est déjà validée et ne peut plus être soumise à nouveau." : ""}
          >
            {isSaving ? "Soumission..." : <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Soumettre la réception</>}
          </Button>
          {!isValidated && (receptionStatus === "En attente de validation" || receptionStatus === "Soumise" || watchedStatus === "En attente de validation" || watchedStatus === "Soumise") ? (
            <Button type="button" onClick={() => onValidateByValidator()} disabled={isSaving} className="w-full sm:w-auto text-xs h-9 shadow-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer">
              {isSaving ? "Validation..." : <><ShieldCheck className="mr-1.5 h-4 w-4" /> Valider la réception</>}
            </Button>
          ) : (
            <Button type="button" disabled className="w-full sm:w-auto text-xs h-9 bg-muted text-muted-foreground/70 cursor-not-allowed opacity-60 border border-border/80" title={isValidated ? "Cette réception est déjà validée." : "Le bouton de validation est grisé pendant la saisie. Soumettez d'abord la réception."}>
              <ShieldCheck className="mr-1.5 h-4 w-4 text-muted-foreground/60" /> {isValidated ? "Réception Validée" : "Valider la réception"}
            </Button>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => { if (isValidated) { e.preventDefault(); return; } form.handleSubmit(onSubmit)(e) }} className="space-y-8">
          
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
                      <Input {...field} value={field.value || "Admin EGED"} readOnly disabled className="bg-muted/50 font-bold text-foreground cursor-not-allowed opacity-100" />
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
                              <FormControl><SelectTrigger className="h-9 text-xs bg-background w-full"><SelectValue placeholder="Catégorie de produit" /></SelectTrigger></FormControl>
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
                        <FormField
                          control={form.control}
                          name={`samples.${index}.form`}
                          render={({ field }) => {
                            const currentValue = field.value || ""
                            const matchedForm = ALL_GALENIC_FORMS.find(
                              (f) => f.toLowerCase() === currentValue.toLowerCase()
                            )
                            const isOther =
                              currentValue === "Autre" ||
                              (currentValue !== "" && !matchedForm)
                            const selectValue = matchedForm || (isOther ? "Autre" : "")

                            return (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-foreground/80">
                                  Forme galénique
                                </FormLabel>
                                <Select
                                  value={selectValue}
                                  onValueChange={(val) => {
                                    if (val === "Autre") {
                                      field.onChange("Autre")
                                    } else {
                                      field.onChange(val)
                                    }
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-9 text-xs bg-background w-full">
                                      <SelectValue placeholder="Sélectionner la forme galénique" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="max-h-72">
                                    {GALENIC_FORM_GROUPS.map((grp) => (
                                      <SelectGroup key={grp.group}>
                                        <SelectLabel className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider py-1">
                                          {grp.group}
                                        </SelectLabel>
                                        {grp.items.map((formOption) => (
                                          <SelectItem
                                            key={formOption}
                                            value={formOption}
                                            className="text-xs"
                                          >
                                            {formOption === "Autre" ? "Autre (préciser...)" : formOption}
                                          </SelectItem>
                                        ))}
                                      </SelectGroup>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {isOther && (
                                  <div className="mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <UppercaseInput
                                      className="h-9 text-xs"
                                      placeholder="Préciser la forme galénique..."
                                      autoFocus={currentValue === "Autre"}
                                      value={currentValue === "Autre" ? "" : currentValue}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        field.onChange(val.trim() === "" ? "Autre" : val)
                                      }}
                                    />
                                  </div>
                                )}
                              </FormItem>
                            )
                          }}
                        />
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
                  append({ commercial_name: "", dci: "", form: "", category: "", batch: "", exp_date: "", qty: 1 })
                  setDciLists(prev => [...prev, [{ dci: '', dosage: '' }]])
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Ajouter un produit à cette réception
              </Button>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* 6. DOCUMENTS JOINTS */}
            <Card className="shadow-xs border-border/70 lg:col-span-2">
              <CardHeader className="bg-muted/20 border-b border-border/60 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <CardTitle className="flex items-center text-sm font-bold gap-2">
                      <Paperclip className="h-4 w-4 text-[#1B5C2E]" />
                      6. Documents & Pièces Justificatives Apportés (Optionnel)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Joignez les bordereaux de livraison papier, factures proforma, certificats d&apos;analyse (CoA), notices ou courriers déposés avec les échantillons.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold bg-background">
                    {attachedFiles.length} document(s) joint(s)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Zone de saisie et d'ajout de document (cases bien vides sans texte d'exemple) */}
                <div className="p-3.5 bg-muted/30 rounded-xl border border-dashed border-border/80 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    {/* Titre du document (saisie libre, case bien vide) */}
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

                    {/* Description / Observation (saisie libre, case bien vide) */}
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
                        onChange={handleFileChange} 
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,image/*" 
                        className="hidden" 
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingFile}
                        className="flex-1 h-9 text-xs font-semibold gap-1.5 bg-background truncate border-border/80"
                        title={pendingFile ? pendingFile.name : "Sélectionner un fichier"}
                      >
                        <FileUp className="h-4 w-4 text-[#1B5C2E] shrink-0" />
                        <span className="truncate">
                          {isUploadingFile ? "Chargement..." : pendingFile ? pendingFile.name : "Parcourir le fichier"}
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
                {attachedFiles.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground">
                        {attachedFiles.length} document{attachedFiles.length > 1 ? "s" : ""} rattaché{attachedFiles.length > 1 ? "s" : ""} à cette réception :
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
                      {attachedFiles.map((file, idx) => (
                        <div 
                          key={file.id || idx} 
                          className="flex items-start justify-between p-3 rounded-xl border border-border/80 bg-background hover:bg-muted/30 transition-colors text-xs"
                        >
                          <div className="flex items-start gap-2.5 min-w-0 pr-2">
                            <div className="p-2 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E] shrink-0 mt-0.5">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-bold truncate text-foreground text-xs">{file.title || file.name}</p>
                              {file.description && (
                                <p className="text-[11px] text-muted-foreground italic line-clamp-1">{file.description}</p>
                              )}
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                                <span className="font-mono truncate max-w-[150px]">{file.name}</span>
                                <span>•</span>
                                <span>{file.size || "Fichier joint"}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} 
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
            <Button
              type="button"
              variant="secondary"
              onClick={onDraft}
              disabled={isDrafting || isValidated}
              className={`gap-2 ${isValidated ? "bg-muted text-muted-foreground/70 cursor-not-allowed opacity-60 border border-border/80" : ""}`}
              title={isValidated ? "Cette réception est déjà validée et ne peut plus être sauvegardée." : ""}
            >
              <Save className="h-4 w-4" />
              {isDrafting ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
            <Button
              type="button"
              onClick={() => onSubmit()}
              disabled={isSaving || isValidated}
              className={
                isValidated
                  ? "gap-2 bg-muted text-muted-foreground/70 cursor-not-allowed opacity-60 border border-border/80"
                  : "gap-2 shadow-md bg-[#1B5C2E] hover:bg-[#154824] text-white"
              }
              title={isValidated ? "Cette réception est déjà validée et ne peut plus être soumise à nouveau." : ""}
            >
              {isSaving ? "Soumission..." : <><CheckCircle2 className="h-4 w-4" /> Soumettre la réception</>}
            </Button>
            {!isValidated && (receptionStatus === "En attente de validation" || receptionStatus === "Soumise" || watchedStatus === "En attente de validation" || watchedStatus === "Soumise") ? (
              <Button type="button" onClick={() => onValidateByValidator()} disabled={isSaving} className="gap-2 shadow-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer">
                {isSaving ? "Validation..." : <><ShieldCheck className="h-4 w-4" /> Valider la réception</>}
              </Button>
            ) : (
              <Button type="button" disabled className="gap-2 bg-muted text-muted-foreground/70 cursor-not-allowed opacity-60 border border-border/80" title={isValidated ? "Cette réception est déjà validée." : "Le bouton de validation est grisé pendant la saisie. Soumettez d'abord la réception."}>
                <ShieldCheck className="h-4 w-4 text-muted-foreground/60" /> {isValidated ? "Réception Validée" : "Valider la réception"}
              </Button>
            )}
          </div>

        </form>
      </Form>
    </div>
  )
}

export default function NewReceptionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-sm">Chargement de la réception...</div>}>
      <NewReceptionContent />
    </Suspense>
  )
}

