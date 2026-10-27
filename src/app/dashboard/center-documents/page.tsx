"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { 
  FileText, Download, Eye, ShieldCheck, FileCheck, BookOpen, 
  Search, Calendar, Building2, CheckCircle2, AlertCircle, Printer,
  Sparkles, ExternalLink, ArrowRight, Paperclip
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { getCurrentUser, User as AdminUser } from "@/app/dashboard/admin/adminMockData"
import { getRegisteredCentersSync, Center } from "@/utils/centers-storage"
import { getAppointmentsSync, getAppointments, Appointment } from "@/utils/appointments-storage"
import { exportToPDF, exportWasteReceptionSlipPDF, exportReceptionVoucherPDF } from "@/utils/exportUtils"
import { getDocumentFile } from "@/utils/idb-docs"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

interface PublicDocument {
  id: string
  title: string
  category: "Guide & Bonnes Pratiques" | "Réglementation & Lois" | "Modèles & Formulaires"
  code: string
  version: string
  date: string
  file_size: string
  description: string
  summary: string
}

const PUBLIC_DOCUMENTS: PublicDocument[] = [
  {
    id: "pub-doc-1",
    title: "Guide National de Tri & Conditionnement des Déchets Pharmaceutiques",
    category: "Guide & Bonnes Pratiques",
    code: "ABMED-GUIDE-DECH-2026",
    version: "v3.2",
    date: "2026-01-15",
    file_size: "2.4 Mo",
    description: "Manuel officiel décrivant les 4 catégories de tri, les normes de suremballage, les fûts homologués et les règles de scellé.",
    summary: "Ce document détaille les spécifications imposées par l'ABMeD pour le conditionnement des médicaments périmés : emballages étanches pour les liquides, cartons scotchés pour les formes solides, et récipients sécurisés pour les cytotoxiques et stupéfiants."
  },
  {
    id: "pub-doc-2",
    title: "Procédure Officielle de Soumission des Échantillons pour Contrôle LNC",
    category: "Guide & Bonnes Pratiques",
    code: "ABMED-PRO-ECH-LNC",
    version: "v2.0",
    date: "2026-02-10",
    file_size: "1.8 Mo",
    description: "Protocole à suivre par les officines, grossistes et fabricants pour le dépôt des échantillons d'enregistrement ou de libération de lots.",
    summary: "Ce protocole régit les volumes minimums de prélèvement, les fiches suiveuses requises, les conditions de maintien de la chaîne du froid (+2°C à +8°C) et les délais de restitution des certificats d'analyse."
  },
  {
    id: "pub-doc-3",
    title: "Bordereau Officiel de Déclaration Préalable de Déchets (Modèle Vierge)",
    category: "Modèles & Formulaires",
    code: "FORM-BORD-DECL-01",
    version: "v2026",
    date: "2026-01-01",
    file_size: "650 Ko",
    description: "Modèle standard de bordereau de déclaration à remplir et signer avant tout dépôt auprès de l'ABMeD.",
    summary: "Formulaire normalisé comportant l'identification de l'établissement apporteur, la liste des lots avec DCI, forme galénique, quantité, poids estimé et motif d'élimination."
  },
  {
    id: "pub-doc-4",
    title: "Arrêté Portant Fixation des Modalités de Neutralisation et Incinération",
    category: "Réglementation & Lois",
    code: "ARR-MIN-SANTE-2024-418",
    version: "Officiel",
    date: "2024-09-12",
    file_size: "1.2 Mo",
    description: "Texte de loi encadrant l'interdiction de rejet des médicaments et produits chimiques dans l'environnement.",
    summary: "Cadre légal républicain prévoyant les sanctions applicables aux dépôts sauvages et fixant les obligations de délivrance des attestations officielles de destruction par l'ABMeD."
  },
  {
    id: "pub-doc-5",
    title: "Protocole Spécifique : Stupéfiants, Psychotropes et Cytotoxiques",
    category: "Réglementation & Lois",
    code: "ABMED-SEC-RISK-CAT4",
    version: "v1.4",
    date: "2025-11-20",
    file_size: "1.5 Mo",
    description: "Mesures renforcées de sécurisation, décompte contradictoire et escorte pour les produits sous contrôle international.",
    summary: "Prescriptions rigoureuses imposant la présence d'un pharmacien assermenté lors du scellage des fûts de catégorie 4 et le pesage sous contrôle d'un inspecteur."
  }
]

interface PersonalDocument {
  id: string
  title: string
  type: string
  reference: string
  date: string
  center_code: string
  center_name: string
  status: string
  isOfficial?: boolean
  fileData?: string
  fileName?: string
  fileSize?: string
  description?: string
  pdfPayload?: any
}

export default function CenterDocumentsPage() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [activeTab, setActiveTab] = useState<"personal" | "public">("personal")
  const [globalSearch, setGlobalSearch] = useState("")
  const [personalCategoryFilter, setPersonalCategoryFilter] = useState<"ALL" | "PIECES_APPORTEUR" | "OFFICIEL">("ALL")
  const [previewDoc, setPreviewDoc] = useState<PublicDocument | null>(null)
  const [previewPersonalDoc, setPreviewPersonalDoc] = useState<PersonalDocument | null>(null)
  const [personalDocs, setPersonalDocs] = useState<PersonalDocument[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setCurrentUser(getCurrentUser())
  }, [])

  const isCenterUser = useMemo(() => {
    return (
      currentUser?.role === "Centre Apporteur" ||
      currentUser?.matricule?.startsWith("CTR-") ||
      currentUser?.username?.startsWith("CTR-")
    )
  }, [currentUser])

  // Centre connecté
  const userCenter = useMemo(() => {
    const all = getRegisteredCentersSync()
    const code = currentUser?.matricule || currentUser?.username || ""
    return all.find(
      (c) =>
        c.center_code.toUpperCase() === code.toUpperCase() ||
        c.name.toUpperCase() === currentUser?.first_name?.toUpperCase()
    ) || null
  }, [currentUser])

  // Chargement des documents personnels
  const loadPersonalDocuments = useCallback(async () => {
    const list: PersonalDocument[] = []
    const centerCode = userCenter?.center_code || currentUser?.matricule || ""
    const centerName = userCenter?.name || currentUser?.first_name || ""
    const seenIds = new Set<string>()

    const isMyRecord = (appCode?: string, appName?: string) => {
      if (!isCenterUser) return true // Le personnel ABMeD peut tout inspecter
      if (centerCode && appCode && appCode.trim().toUpperCase() === centerCode.trim().toUpperCase()) return true
      if (centerName && appName) {
        const n1 = centerName.trim().toUpperCase()
        const n2 = appName.trim().toUpperCase()
        if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true
      }
      return false
    }

    // 1. Récépissés des rendez-vous
    try {
      const appointments = await getAppointments()
      const myApps = appointments.filter((a) => isMyRecord(a.center_code, a.center_name))
      myApps.forEach((a) => {
        const id = `doc-app-${a.id}`
        if (!seenIds.has(id)) {
          seenIds.add(id)
          list.push({
            id,
            title: `Récépissé Officiel de Rendez-vous — ${a.appointment_number}`,
            type: "Récépissé de rendez-vous",
            reference: a.appointment_number,
            date: a.date,
            center_code: a.center_code,
            center_name: a.center_name,
            status: "Validé",
            isOfficial: true,
            pdfPayload: a
          })
        }
      })
    } catch (e) {}

    // 2. Attestations officielles de destruction générées
    try {
      const supabase = createClient()
      const { data: plans } = await supabase
        .from("destruction_plans")
        .select("*")
        .order("created_at", { ascending: false })

      if (plans && plans.length > 0) {
        plans.forEach((p: any) => {
          if (isMyRecord(p.center_code, p.center_name || p.structure)) {
            const certNum = p.certificate_number || p.plan_number
            const id = `doc-cert-${p.id}`
            if (!seenIds.has(id)) {
              seenIds.add(id)
              list.push({
                id,
                title: `Attestation Officielle de Destruction N° ${certNum}`,
                type: "Attestation de destruction",
                reference: certNum,
                date: p.destruction_date || p.created_at?.split("T")[0] || "2026-10-26",
                center_code: centerCode || p.center_code,
                center_name: centerName || p.center_name,
                status: "Délivré & Certifié",
                isOfficial: true,
                pdfPayload: p
              })
            }
          }
        })
      }
    } catch (e) {}

    // 3. Réceptions de Déchets et Pièces Apporteur rattachées
    try {
      const storedBatches = localStorage.getItem("waste_batches_custom_v1")
      if (storedBatches) {
        const batches = JSON.parse(storedBatches)
        if (Array.isArray(batches)) {
          // Grouper par numéro de réception
          const recGroups = new Map<string, any[]>()
          batches.forEach((b: any) => {
            const code = b.center_code || b.source_code
            const name = b.source_structure || b.center_name
            if (isMyRecord(code, name)) {
              const recNum = b.reception_number || b.batch_number
              if (!recGroups.has(recNum)) recGroups.set(recNum, [])
              recGroups.get(recNum)!.push(b)
            }
          })

          recGroups.forEach((bList, recNum) => {
            const first = bList[0]
            const date = first.reception_date || first.date || first.created_at?.split("T")[0] || "2026-10-26"
            const slipId = `doc-rec-waste-${recNum}`

            // a. Bordereau officiel de prise en charge eGED
            if (!seenIds.has(slipId)) {
              seenIds.add(slipId)
              list.push({
                id: slipId,
                title: `Bordereau Officiel de Prise en Charge Déchets — ${recNum}`,
                type: "Bordereau de prise en charge",
                reference: recNum,
                date: date,
                center_code: first.center_code || first.source_code || centerCode,
                center_name: first.source_structure || first.center_name || centerName,
                status: "Délivré & Certifié",
                isOfficial: true,
                pdfPayload: {
                  reception_number: recNum,
                  date: date,
                  source_structure: first.source_structure || centerName,
                  source_code: first.center_code || centerCode,
                  batches: bList,
                  total_weight: bList.reduce((acc, b) => acc + (Number(b.weight) || 0), 0),
                  total_boxes: bList.reduce((acc, b) => acc + (Number(b.estimated_boxes) || 1), 0),
                  total_cost: bList.reduce((acc, b) => acc + (Number(b.cost) || 0), 0),
                }
              })
            }

            // b. Bordereau de livraison apporteur (BL) si déclaré
            if (first.delivery_slip_ref) {
              const blId = `doc-bl-center-${recNum}`
              if (!seenIds.has(blId)) {
                seenIds.add(blId)
                list.push({
                  id: blId,
                  title: `Bordereau de Livraison Apporteur N° ${first.delivery_slip_ref}`,
                  type: "Bordereau de Livraison (BL Apporteur)",
                  reference: first.delivery_slip_ref,
                  date: date,
                  center_code: first.center_code || centerCode,
                  center_name: first.source_structure || centerName,
                  status: "Déposé par le Centre",
                  isOfficial: false,
                  description: `Pièce apporteur associée à la réception ${recNum}`,
                  fileName: `BL-${first.delivery_slip_ref}.pdf`
                })
              }
            }

            // c. Pièces justificatives jointes lors de la réception
            bList.forEach((b: any) => {
              const attached = b.attached_docs || b.attachedDocs
              if (Array.isArray(attached)) {
                attached.forEach((doc: any, dIdx: number) => {
                  const attId = doc.id || `doc-att-w-${recNum}-${dIdx}`
                  if (!seenIds.has(attId)) {
                    seenIds.add(attId)
                    list.push({
                      id: attId,
                      title: doc.title || doc.name || doc.file_name || `Pièce Justificative Déchets (${recNum})`,
                      type: doc.document_type || doc.type || "Pièce justificative apporteur",
                      reference: recNum,
                      date: date,
                      center_code: first.center_code || centerCode,
                      center_name: first.source_structure || centerName,
                      status: "Déposé par le Centre",
                      isOfficial: false,
                      fileData: doc.data_url || doc.file_data,
                      fileName: doc.file_name || doc.name,
                      fileSize: doc.file_size_formatted || doc.size,
                      description: doc.description || `Document apporteur lié à la réception ${recNum}`
                    })
                  }
                })
              }
            })

            // Vérifier aussi les brouillons waste_reception_draft_details_
            const draftRaw = localStorage.getItem(`waste_reception_draft_details_${recNum}`)
            if (draftRaw) {
              try {
                const draft = JSON.parse(draftRaw)
                const attached = draft.attachedDocs || draft.formData?.attachedDocs
                if (Array.isArray(attached)) {
                  attached.forEach((doc: any, dIdx: number) => {
                    const attId = doc.id || `doc-draft-w-${recNum}-${dIdx}`
                    if (!seenIds.has(attId)) {
                      seenIds.add(attId)
                      list.push({
                        id: attId,
                        title: doc.title || doc.file_name || `Justificatif Apporteur (${recNum})`,
                        type: doc.document_type || "Pièce justificative apporteur",
                        reference: recNum,
                        date: date,
                        center_code: centerCode,
                        center_name: centerName,
                        status: "Déposé par le Centre",
                        isOfficial: false,
                        fileData: doc.data_url || doc.file_data,
                        fileName: doc.file_name,
                        fileSize: doc.file_size_formatted,
                        description: doc.description
                      })
                    }
                  })
                }
              } catch (e) {}
            }
          })
        }
      }
    } catch (e) {}

    // 4. Réceptions d'Échantillons et Justificatifs rattachés (CoA, Factures, BL)
    try {
      const historyRaw = localStorage.getItem("reception_history_records")
      if (historyRaw) {
        const history = JSON.parse(historyRaw)
        if (Array.isArray(history)) {
          history.forEach((rec: any) => {
            const supplier = rec.supplier || rec.manufacturer || ""
            if (isMyRecord(rec.center_code, supplier)) {
              const recNum = rec.rec_number || rec.id
              const date = rec.date_reception || rec.created_at?.split("T")[0] || "2026-10-26"
              const slipId = `doc-rec-sample-${recNum}`

              // a. Bordereau officiel d'échantillons
              if (!seenIds.has(slipId)) {
                seenIds.add(slipId)
                list.push({
                  id: slipId,
                  title: `Bordereau Officiel de Réception Échantillons — ${recNum}`,
                  type: "Bordereau de réception officiel",
                  reference: recNum,
                  date: date,
                  center_code: rec.center_code || centerCode,
                  center_name: supplier || centerName,
                  status: "Délivré & Certifié",
                  isOfficial: true,
                  pdfPayload: rec
                })
              }

              // b. Pièces jointes enregistrées dans le brouillon
              const draftRaw = localStorage.getItem(`reception_draft_details_${recNum}`)
              if (draftRaw) {
                try {
                  const draft = JSON.parse(draftRaw)
                  const files = draft.formData?.attachedFiles || draft.attachedFiles
                  if (Array.isArray(files)) {
                    files.forEach((f: any, fIdx: number) => {
                      const attId = f.id || `doc-att-s-${recNum}-${fIdx}`
                      if (!seenIds.has(attId)) {
                        seenIds.add(attId)
                        list.push({
                          id: attId,
                          title: f.title || f.name || `Pièce Échantillons (${recNum})`,
                          type: f.title || "Certificat d'analyse / Pièce apporteur",
                          reference: recNum,
                          date: date,
                          center_code: centerCode,
                          center_name: supplier || centerName,
                          status: "Déposé par le Centre",
                          isOfficial: false,
                          fileData: f.url || f.data_url,
                          fileName: f.name,
                          fileSize: f.size,
                          description: f.description
                        })
                      }
                    })
                  }
                } catch (e) {}
              }
            }
          })
        }
      }
    } catch (e) {}

    // 5. Récupérer tout document directement archivé sous ce centre dans waste_documents_custom_v1
    try {
      const rawWasteDocs = localStorage.getItem("waste_documents_custom_v1")
      if (rawWasteDocs) {
        const wasteDocs = JSON.parse(rawWasteDocs)
        if (Array.isArray(wasteDocs)) {
          wasteDocs.forEach((d: any) => {
            if (isMyRecord(d.source_code, d.source_structure)) {
              if (!seenIds.has(d.id)) {
                seenIds.add(d.id)
                const isOff = d.category === "acte_administratif" || d.title?.includes("eGED") || d.document_type?.includes("eGED")
                list.push({
                  id: d.id,
                  title: d.title || d.file_name,
                  type: d.document_type || (isOff ? "Bordereau officiel" : "Pièce justificative apporteur"),
                  reference: d.reception_number || d.id,
                  date: d.reception_date || d.created_at?.split("T")[0] || "2026-10-26",
                  center_code: d.source_code || centerCode,
                  center_name: d.source_structure || centerName,
                  status: isOff ? "Délivré & Certifié" : "Déposé par le Centre",
                  isOfficial: isOff,
                  fileData: d.data_url || d.file_data,
                  fileName: d.file_name,
                  fileSize: d.file_size_formatted,
                  description: d.description
                })
              }
            }
          })
        }
      }
    } catch (e) {}

    setPersonalDocs(list)
    setLoading(false)
  }, [userCenter, currentUser, isCenterUser])

  useEffect(() => {
    loadPersonalDocuments()
  }, [loadPersonalDocuments])

  useRealtimeSync({
    tables: ["destruction_plans", "appointments", "reception_schedules", "waste_batches", "receptions"],
    onSync: loadPersonalDocuments,
    pollIntervalMs: 3000
  })

  // Filtrage des documents personnels par recherche et catégorie
  const filteredPersonalDocs = useMemo(() => {
    return personalDocs.filter((d) => {
      const q = globalSearch.toLowerCase().trim()
      const matchesSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.reference.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q)

      const matchesCategory =
        personalCategoryFilter === "ALL" ||
        (personalCategoryFilter === "PIECES_APPORTEUR" && !d.isOfficial) ||
        (personalCategoryFilter === "OFFICIEL" && d.isOfficial)

      return matchesSearch && matchesCategory
    })
  }, [personalDocs, globalSearch, personalCategoryFilter])

  const filteredPublicDocs = useMemo(() => {
    if (globalSearch.trim() === "") return PUBLIC_DOCUMENTS
    const q = globalSearch.toLowerCase()
    return PUBLIC_DOCUMENTS.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
    )
  }, [globalSearch])

  // Compteurs pour les filtres de nature
  const personalPiecesCount = useMemo(() => personalDocs.filter(d => !d.isOfficial).length, [personalDocs])
  const personalOfficielCount = useMemo(() => personalDocs.filter(d => d.isOfficial).length, [personalDocs])

  // TÉLÉCHARGEMENT D'UN DOCUMENT PERSONNEL
  const handleDownloadPersonal = async (doc: PersonalDocument) => {
    // 1. S'il s'agit d'un fichier téléversé par le centre (fileData ou IndexedDB)
    let url = doc.fileData
    if (!url || url === "#") {
      try {
        url = (await getDocumentFile(doc.id)) || undefined
      } catch (err) {}
    }

    if (url && url !== "#") {
      try {
        const link = document.createElement("a")
        link.href = url
        link.download = doc.fileName || `${doc.title}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success(`Téléchargement de « ${doc.fileName || doc.title} » lancé.`)
        return
      } catch (e) {
        toast.error("Impossible de télécharger le fichier.")
      }
    }

    // 2. Si c'est un bordereau officiel de prise en charge déchets eGED
    if (doc.type.includes("prise en charge") || doc.reference.startsWith("REC-DECH-") || (doc.isOfficial && doc.reference.startsWith("REC-"))) {
      try {
        toast.success(`Génération du bordereau eGED « ${doc.reference} »...`)
        exportWasteReceptionSlipPDF({
          reception_number: doc.reference,
          date: doc.date,
          source_structure: doc.center_name,
          source_code: doc.center_code,
          contact_person: doc.center_name,
          phone: "N/A",
          batches: doc.pdfPayload?.batches || [],
          total_weight: doc.pdfPayload?.total_weight || 0,
          total_boxes: doc.pdfPayload?.total_boxes || 1,
          total_cost: doc.pdfPayload?.total_cost || 0,
          inspector_name: "Agent ABMeD",
          ...doc.pdfPayload,
        })
        return
      } catch (e) {}
    }

    // 3. Si c'est un bordereau d'échantillons
    if (doc.type.includes("échantillon") || doc.reference.startsWith("REC-ECH-")) {
      try {
        toast.success(`Génération du bordereau échantillons « ${doc.reference} »...`)
        exportReceptionVoucherPDF({
          rec_number: doc.reference,
          date_reception: doc.date,
          supplier: doc.center_name,
          inspector: "Agent ABMeD",
          status: "Validé",
          ...doc.pdfPayload,
        }, doc.pdfPayload?.samples || [])
        return
      } catch (e) {}
    }

    toast.info(`Affichage de l'acte certifié « ${doc.reference} »...`)
    setPreviewPersonalDoc(doc)
  }

  // TÉLÉCHARGEMENT D'UN DOCUMENT PUBLIC
  const handleDownloadPublic = (doc: PublicDocument) => {
    toast.success(`Téléchargement de « ${doc.title} » (${doc.file_size})...`)
    const blob = new Blob([
      `=================================================================\n` +
      `REPUBLIQUE DU BENIN - MINISTERE DE LA SANTE\n` +
      `AGENCE BENINOISE DU MEDICAMENT ET DES AUTRES PRODUITS DE SANTE (ABMeD)\n` +
      `=================================================================\n\n` +
      `DOCUMENT OFFICIEL : ${doc.title}\n` +
      `CODE DU DOCUMENT  : ${doc.code}\n` +
      `VERSION           : ${doc.version}\n` +
      `DATE D'EFFET      : ${doc.date}\n\n` +
      `RESUME EXECUTIF :\n${doc.summary}\n\n` +
      `DESCRIPTION :\n${doc.description}\n\n` +
      `Consultez la version complète au siège de l'ABMeD ou sur la plateforme eGED.\n`
    ], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${doc.code}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* ─── BANDEAU SUPÉRIEUR INSTITUTIONNEL ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/70 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-foreground">
                Espace Dédié Documents & Attestations
              </h1>
              {userCenter && (
                <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-mono font-bold text-xs">
                  {userCenter.center_code}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isCenterUser
                ? `Accédez aux attestations délivrées pour ${userCenter?.name || "votre centre"} et consultez les guides réglementaires publics.`
                : "Consultez et téléchargez les documents réglementaires publics et les attestations délivrées aux centres apporteurs."}
            </p>
          </div>
        </div>

        {/* RECHERCHE RAPIDE */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher document, attestation..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="pl-8 text-xs h-8.5 rounded-lg"
          />
        </div>
      </div>

      {/* ─── ONGLET PRINCIPAL ─── */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-3">
        <TabsList className="bg-muted/60 p-1 rounded-xl h-9">
          <TabsTrigger value="personal" className="text-xs font-bold gap-1.5 px-3">
            <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
            Mes Attestations & Documents Reçus ({personalDocs.length})
          </TabsTrigger>
          <TabsTrigger value="public" className="text-xs font-bold gap-1.5 px-3">
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            Guides & Documents Réglementaires Publics ({PUBLIC_DOCUMENTS.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── ONGLET 1 : DOCUMENTS PERSONNELS DU CENTRE ─── */}
        <TabsContent value="personal" className="space-y-3 mt-0">
          {/* FILTRES RAPIDES PAR NATURE POUR LE CENTRE */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Filtrer par nature :</span>
            <Button
              type="button"
              variant={personalCategoryFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setPersonalCategoryFilter("ALL")}
              className={`h-7 text-xs font-semibold rounded-full ${personalCategoryFilter === "ALL" ? "bg-purple-700 hover:bg-purple-800 text-white" : ""}`}
            >
              Tous mes documents ({personalDocs.length})
            </Button>
            <Button
              type="button"
              variant={personalCategoryFilter === "PIECES_APPORTEUR" ? "default" : "outline"}
              size="sm"
              onClick={() => setPersonalCategoryFilter("PIECES_APPORTEUR")}
              className={`h-7 text-xs font-semibold rounded-full gap-1.5 ${
                personalCategoryFilter === "PIECES_APPORTEUR" 
                  ? "bg-amber-600 hover:bg-amber-700 text-white" 
                  : "text-amber-800 border-amber-300 bg-amber-50/60 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-300"
              }`}
            >
              <Paperclip className="h-3 w-3" />
              Mes Pièces & Justifs Déposés ({personalPiecesCount})
            </Button>
            <Button
              type="button"
              variant={personalCategoryFilter === "OFFICIEL" ? "default" : "outline"}
              size="sm"
              onClick={() => setPersonalCategoryFilter("OFFICIEL")}
              className={`h-7 text-xs font-semibold rounded-full gap-1.5 ${
                personalCategoryFilter === "OFFICIEL" 
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white" 
                  : "text-emerald-800 border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300"
              }`}
            >
              <ShieldCheck className="h-3 w-3" />
              Actes & Attestations Officiels eGED ({personalOfficielCount})
            </Button>
          </div>

          {filteredPersonalDocs.length === 0 ? (
            <Card className="p-8 text-center rounded-xl border border-dashed border-border/70">
              <FileCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-bold text-foreground text-sm">Aucun document correspondant</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                {personalDocs.length === 0 
                  ? "Dès que vos dépôts d'échantillons ou de déchets seront enregistrés avec leurs pièces justificatives, vos attestations et documents certifiés ABMeD apparaîtront ici."
                  : "Aucun document ne correspond au filtre ou à la recherche sélectionnée."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPersonalDocs.map((doc) => {
                const isOff = !!doc.isOfficial
                return (
                  <Card 
                    key={doc.id} 
                    className="rounded-xl border border-border/70 shadow-2xs hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`p-2 rounded-lg ${isOff ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40"}`}>
                          {isOff ? <ShieldCheck className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] font-bold flex items-center gap-1 ${
                            isOff 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          {isOff ? <ShieldCheck className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                          {isOff ? "Acte Officiel eGED" : "Pièce / Justif Déposé"}
                        </Badge>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                          Réf : {doc.reference}
                        </span>
                        <h3 className="text-xs font-black text-foreground leading-snug mt-0.5 line-clamp-2">
                          {doc.title}
                        </h3>
                        {doc.description && (
                          <p className="text-[11px] text-muted-foreground italic line-clamp-1 mt-0.5">{doc.description}</p>
                        )}
                        {doc.fileName && doc.fileName !== doc.title && (
                          <p className="text-[10px] text-muted-foreground/70 font-mono">{doc.fileName}</p>
                        )}
                      </div>

                      <div className="pt-1 space-y-1 text-xs text-muted-foreground border-t border-border/40">
                        <div className="flex items-center justify-between">
                          <span>Établissement :</span>
                          <span className="font-bold text-foreground truncate max-w-[170px]">{doc.center_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Code Unique :</span>
                          <span className="font-mono font-bold text-purple-700">{doc.center_code}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{isOff ? "Délivré le :" : "Déposé le :"}</span>
                          <span>{doc.date}</span>
                        </div>
                        {doc.fileSize && (
                          <div className="flex items-center justify-between">
                            <span>Taille :</span>
                            <span className="font-mono">{doc.fileSize}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewPersonalDoc(doc)}
                        className="text-xs h-7.5 px-2.5 font-semibold gap-1"
                      >
                        <Eye className="h-3 w-3 text-blue-600" />
                        Consulter
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleDownloadPersonal(doc)}
                        className={`text-xs h-7.5 px-3 font-bold text-white gap-1 shadow-2xs ${
                          isOff 
                            ? "bg-emerald-600 hover:bg-emerald-700" 
                            : "bg-amber-600 hover:bg-amber-700"
                        }`}
                      >
                        <Download className="h-3 w-3" />
                        {isOff ? "Télécharger PDF" : "Télécharger Pièce"}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── ONGLET 2 : DOCUMENTS PUBLICS & RÉGLEMENTAIRES ─── */}
        <TabsContent value="public" className="space-y-3 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPublicDocs.map((doc) => (
              <Card 
                key={doc.id} 
                className="rounded-xl border border-border/70 shadow-2xs hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between"
              >
                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {doc.category}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                      {doc.code} • {doc.version}
                    </span>
                    <h3 className="text-xs font-black text-foreground leading-snug mt-0.5">
                      {doc.title}
                    </h3>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                    {doc.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>Date : {doc.date}</span>
                    <span className="font-mono font-semibold">{doc.file_size}</span>
                  </div>
                </div>

                <div className="p-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewDoc(doc)}
                    className="text-xs h-7.5 px-2.5 font-semibold gap-1"
                  >
                    <Eye className="h-3 w-3 text-blue-600" />
                    Aperçu
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleDownloadPublic(doc)}
                    className="text-xs h-7.5 px-3 font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1 shadow-2xs"
                  >
                    <Download className="h-3 w-3" />
                    Télécharger
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL APERÇU DOCUMENT PUBLIC ─── */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          {previewDoc && (
            <div className="space-y-3.5 py-1 text-xs">
              <DialogHeader>
                <DialogTitle className="text-sm font-black flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  {previewDoc.title}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono">
                  {previewDoc.code} — Version {previewDoc.version} ({previewDoc.file_size})
                </DialogDescription>
              </DialogHeader>

              <div className="bg-muted/30 p-3 rounded-xl border border-border/50 space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Résumé Officiel :</span>
                <p className="text-xs leading-relaxed text-foreground">
                  {previewDoc.summary}
                </p>
              </div>

              <div className="text-[11px] text-muted-foreground">
                Document certifié conforme par la Direction de l'Assurance Qualité de l'ABMeD.
              </div>

              <DialogFooter className="pt-2 flex justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewDoc(null)} className="text-xs">
                  Fermer
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => {
                    handleDownloadPublic(previewDoc)
                    setPreviewDoc(null)
                  }}
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger le document
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL APERÇU DOCUMENT PERSONNEL / ATTESTATION ─── */}
      <Dialog open={!!previewPersonalDoc} onOpenChange={(open) => !open && setPreviewPersonalDoc(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          {previewPersonalDoc && (
            <div className="space-y-4 py-1 text-xs">
              <div className="text-center border-b border-border/60 pb-3">
                <div className={`inline-flex p-2 rounded-full mb-1 ${
                  previewPersonalDoc.isOfficial 
                    ? "bg-emerald-100 text-emerald-800" 
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {previewPersonalDoc.isOfficial ? <ShieldCheck className="h-6 w-6" /> : <Paperclip className="h-6 w-6" />}
                </div>
                <h3 className="font-black text-sm text-foreground">
                  {previewPersonalDoc.isOfficial ? "AGENCE BÉNINOISE DU MÉDICAMENT" : "JUSTIFICATIF DÉPOSÉ PAR LE CENTRE"}
                </h3>
                <p className={`text-[10px] font-bold uppercase ${
                  previewPersonalDoc.isOfficial ? "text-emerald-700" : "text-amber-700"
                }`}>
                  {previewPersonalDoc.type}
                </p>
              </div>

              <div className="bg-muted/40 p-3 rounded-xl border border-border/50 space-y-1.5 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">Référence du document</div>
                <div className="text-base font-mono font-black text-blue-700 dark:text-blue-400">
                  {previewPersonalDoc.reference}
                </div>
                <div className="text-[11px] font-bold text-foreground">
                  {previewPersonalDoc.isOfficial ? "Délivré le" : "Déposé le"} {previewPersonalDoc.date}
                </div>
              </div>

              {/* Aperçu direct si image ou fichier attaché */}
              {previewPersonalDoc.fileData && previewPersonalDoc.fileData.startsWith("data:image/") && (
                <div className="rounded-xl overflow-hidden border border-border/60 max-h-56 flex items-center justify-center bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={previewPersonalDoc.fileData} 
                    alt={previewPersonalDoc.title} 
                    className="max-h-56 object-contain w-full"
                  />
                </div>
              )}

              <div className="space-y-1.5 p-3 rounded-xl border border-border/50 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Établissement :</span>
                  <span className="font-bold text-foreground">{previewPersonalDoc.center_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code Unique :</span>
                  <span className="font-mono font-bold text-purple-700">{previewPersonalDoc.center_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut :</span>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] font-bold ${
                      previewPersonalDoc.isOfficial 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                        : "bg-amber-50 text-amber-800 border-amber-300"
                    }`}
                  >
                    {previewPersonalDoc.status}
                  </Badge>
                </div>
                {previewPersonalDoc.fileName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fichier source :</span>
                    <span className="font-mono text-muted-foreground/80 truncate max-w-[200px]">{previewPersonalDoc.fileName}</span>
                  </div>
                )}
                {previewPersonalDoc.description && (
                  <div className="pt-1 text-[11px] text-muted-foreground italic border-t border-border/30">
                    {previewPersonalDoc.description}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2 flex justify-between gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPreviewPersonalDoc(null)} 
                  className="text-xs font-bold"
                >
                  Fermer
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => {
                    handleDownloadPersonal(previewPersonalDoc)
                    setPreviewPersonalDoc(null)
                  }} 
                  className={`text-xs font-bold text-white gap-1.5 ${
                    previewPersonalDoc.isOfficial 
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  <Download className="h-3.5 w-3.5" />
                  {previewPersonalDoc.isOfficial ? "Télécharger l'Acte (PDF)" : "Télécharger la Pièce"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
