"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { 
  FileText, Download, Eye, Plus, Search, Filter, Trash2, 
  Building2, Calendar, HardDrive, CheckCircle2, User, Phone, 
  Layers, ArrowLeft, RefreshCw, FileUp, ShieldCheck, Tag, X, FileCheck
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { SampleArchivedDocument, SAMPLE_DOCUMENT_TYPES } from "@/types/sample-documents"

const STORAGE_KEY = "sample_documents_custom_v1"

interface DocumentsClientProps {
  initialDocuments?: any[]
  samplesList?: any[]
}

export default function DocumentsClient({ initialDocuments = [], samplesList = [] }: DocumentsClientProps) {
  const [documents, setDocuments] = useState<SampleArchivedDocument[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedApporteur, setSelectedApporteur] = useState<string>("ALL")
  const [selectedDocType, setSelectedDocType] = useState<string>("ALL")
  const [viewMode, setViewMode] = useState<"by_structure" | "all_list">("by_structure")

  // Modale de prévisualisation
  const [previewDoc, setPreviewDoc] = useState<SampleArchivedDocument | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // Modale d'ajout manuel de document
  const [showAddModal, setShowAddModal] = useState(false)
  const [newDocApporteur, setNewDocApporteur] = useState("")
  const [newDocReceptionRef, setNewDocReceptionRef] = useState("")
  const [newDocTitle, setNewDocTitle] = useState("")
  const [newDocDescription, setNewDocDescription] = useState("")
  const [newDocFile, setNewDocFile] = useState<{ name: string; size: string; type: string; dataUrl: string } | null>(null)
  const [isSubmittingNewDoc, setIsSubmittingNewDoc] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Chargement et synchronisation des documents échantillons
  const loadDocuments = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDocuments(parsed)
          return
        }
      }

      // Si le stockage est vide, on extrait les réceptions d'échantillons existantes
      const historyRaw = localStorage.getItem("reception_history_records")
      const extractedDocs: SampleArchivedDocument[] = []

      if (historyRaw) {
        const history = JSON.parse(historyRaw)
        if (Array.isArray(history)) {
          history.forEach((rec: any) => {
            const supplier = rec.supplier || "Fournisseur / Demandeur"
            const recNum = rec.rec_number || rec.id
            const date = rec.date_reception || rec.created_at?.split("T")[0] || new Date().toISOString().split("T")[0]
            
            // Bordereau officiel de réception d'échantillons
            extractedDocs.push({
              id: `doc-slip-sample-${recNum}`,
              reception_number: recNum,
              source_structure: supplier,
              source_type: "Structure déposante d'échantillons",
              depositor_name: rec.inspector || "Agent ABMed",
              date: date,
              reception_date: date,
              doc_category: "Attestation eGED",
              category: "acte_administratif",
              doc_type: "Bordereau de réception officiel eGED",
              document_type: "Bordereau de réception officiel eGED",
              title: `Bordereau de Réception ${recNum}`,
              file_name: `Bordereau-Reception-${recNum}.pdf`,
              file_size_formatted: "PDF Officiel eGED",
              file_type: "application/pdf",
              created_at: rec.created_at || new Date().toISOString(),
            })

            // Vérifier si des fichiers joints étaient enregistrés dans le brouillon
            const draftRaw = localStorage.getItem("reception_draft_details_" + recNum)
            if (draftRaw) {
              try {
                const draft = JSON.parse(draftRaw)
                if (draft.formData?.attachedFiles && Array.isArray(draft.formData.attachedFiles)) {
                  draft.formData.attachedFiles.forEach((f: any, fIdx: number) => {
                    extractedDocs.push({
                      id: `doc-att-${recNum}-${fIdx}`,
                      reception_number: recNum,
                      source_structure: supplier,
                      source_type: "Structure déposante d'échantillons",
                      depositor_name: rec.inspector || "Agent ABMed",
                      date: date,
                      reception_date: date,
                      doc_category: "Document apporteur",
                      category: "piece_apporteur",
                      doc_type: f.title || f.name,
                      document_type: f.title || f.name,
                      title: f.title || f.name,
                      description: f.description,
                      file_name: f.name,
                      file_size_formatted: f.size || "Fichier joint",
                      file_type: f.type || "Fichier",
                      data_url: f.url,
                      file_data: f.url,
                      created_at: new Date().toISOString(),
                    })
                  })
                }
              } catch (e) {}
            }
          })
        }
      }

      if (extractedDocs.length > 0) {
        setDocuments(extractedDocs)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(extractedDocs))
      } else {
        setDocuments([])
      }
    } catch (e) {
      console.error("Erreur lecture documents échantillons:", e)
      setDocuments([])
    }
  }

  useEffect(() => {
    loadDocuments()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === "reception_history_records") {
        loadDocuments()
      }
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Liste unique des apporteurs pour les filtres
  const uniqueApporteurs = useMemo(() => {
    const list = Array.from(new Set(documents.map(d => d.source_structure).filter(Boolean)))
    return list.sort((a, b) => a.localeCompare(b))
  }, [documents])

  // Filtrage des documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const title = doc.title || ""
      const fileName = doc.file_name || ""
      const structure = doc.source_structure || ""
      const recNum = doc.reception_number || ""
      const depositor = doc.depositor_name || ""
      const desc = doc.description || ""

      const matchesSearch = 
        !searchTerm.trim() ||
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        structure.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
        depositor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        desc.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesApporteur = 
        selectedApporteur === "ALL" || doc.source_structure === selectedApporteur

      const matchesDocType = 
        selectedDocType === "ALL" || (doc.title === selectedDocType || doc.document_type === selectedDocType)

      return matchesSearch && matchesApporteur && matchesDocType
    })
  }, [documents, searchTerm, selectedApporteur, selectedDocType])

  // Regroupement par structure apportrice pour la vue dédiée
  const groupedByApporteur = useMemo(() => {
    const map = new Map<string, {
      structure: string;
      source_type?: string;
      depositor_name?: string;
      depositor_phone?: string;
      city?: string;
      docs: SampleArchivedDocument[];
      latestDate: string;
    }>()

    filteredDocuments.forEach(doc => {
      const key = doc.source_structure || "Structure Non Définie"
      if (!map.has(key)) {
        map.set(key, {
          structure: key,
          source_type: doc.source_type,
          depositor_name: doc.depositor_name,
          depositor_phone: doc.depositor_phone,
          city: doc.city,
          docs: [],
          latestDate: doc.created_at || doc.reception_date || ""
        })
      }
      const entry = map.get(key)!
      entry.docs.push(doc)
      if (doc.depositor_name && !entry.depositor_name) entry.depositor_name = doc.depositor_name
      if (doc.depositor_phone && !entry.depositor_phone) entry.depositor_phone = doc.depositor_phone
      if (doc.city && !entry.city) entry.city = doc.city
      if (doc.source_type && !entry.source_type) entry.source_type = doc.source_type
    })

    return Array.from(map.values()).sort((a, b) => b.docs.length - a.docs.length)
  }, [filteredDocuments])

  // Helper pour identifier les actes officiels eGED
  const isOfficialDoc = (d: SampleArchivedDocument) => {
    const type = d.document_type || d.doc_type || d.title || ""
    return d.category === "acte_administratif" || type.includes("eGED") || type.includes("Bordereau de réception officiel") || type.includes("Bordereau de Réception")
  }

  // KPIs
  const totalDocsCount = documents.length
  const totalStructuresCount = uniqueApporteurs.length
  const depositorDocsCount = documents.filter(d => !isOfficialDoc(d)).length
  const egedDocsCount = documents.filter(d => isOfficialDoc(d)).length

  // Action Aperçu
  const handleOpenPreview = (doc: SampleArchivedDocument) => {
    setPreviewDoc(doc)
    setShowPreviewModal(true)
  }

  // Action Téléchargement
  const handleDownload = (doc: SampleArchivedDocument) => {
    const url = doc.data_url || doc.file_data
    if (!url || url === "#") {
      toast.info(`Affichage de la pièce : ${doc.title || doc.file_name}`)
      setPreviewDoc(doc)
      setShowPreviewModal(true)
      return
    }

    try {
      const link = document.createElement("a")
      link.href = url
      link.download = doc.file_name || `document-echantillon-${doc.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`Téléchargement de « ${doc.file_name} » lancé.`)
    } catch (e) {
      toast.error("Impossible de télécharger le fichier.")
    }
  }

  // Action Suppression
  const handleDeleteDoc = (id: string, fileName: string) => {
    if (!confirm(`Confirmez-vous la suppression du document « ${fileName} » de la traçabilité des échantillons ?`)) {
      return
    }

    const updated = documents.filter(d => d.id !== id)
    setDocuments(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      toast.success("Document supprimé avec succès.")
    } catch (e) {
      toast.error("Erreur lors de la mise à jour de la mémoire locale.")
    }
  }

  // Téléversement d'un nouveau document manuel
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier dépasse la taille maximale autorisée de 10 Mo.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const formattedSize = file.size < 1024 * 1024 
        ? `${(file.size / 1024).toFixed(1)} Ko` 
        : `${(file.size / (1024 * 1024)).toFixed(2)} Mo`

      setNewDocFile({
        name: file.name,
        size: formattedSize,
        type: file.type || "application/octet-stream",
        dataUrl: reader.result as string
      })

      toast.info(`Fichier prêt : ${file.name}`)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveNewDoc = () => {
    if (!newDocApporteur.trim()) {
      toast.error("Veuillez indiquer le nom de la structure apportrice.")
      return
    }
    if (!newDocFile) {
      toast.error("Veuillez sélectionner un fichier à joindre.")
      return
    }

    setIsSubmittingNewDoc(true)

    const now = new Date()
    const titleToUse = newDocTitle.trim() || newDocFile.name
    const newArchivedDoc: SampleArchivedDocument = {
      id: `S-DOC-MANUAL-${Date.now()}`,
      file_name: newDocFile.name,
      file_size_formatted: newDocFile.size,
      mime_type: newDocFile.type,
      title: titleToUse,
      doc_type: titleToUse,
      document_type: titleToUse,
      category: "piece_apporteur",
      data_url: newDocFile.dataUrl,
      file_data: newDocFile.dataUrl,
      source_structure: newDocApporteur.trim(),
      reception_number: newDocReceptionRef.trim() || undefined,
      reception_date: now.toISOString().split("T")[0],
      created_at: now.toISOString(),
      description: newDocDescription.trim() || undefined
    }

    const updated = [newArchivedDoc, ...documents]
    setDocuments(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      toast.success("Document archivé avec succès.")
      setShowAddModal(false)
      setNewDocApporteur("")
      setNewDocReceptionRef("")
      setNewDocTitle("")
      setNewDocDescription("")
      setNewDocFile(null)
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement.")
    } finally {
      setIsSubmittingNewDoc(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* EN-TÊTE DE LA PAGE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            <Link href="/dashboard/receptions" className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Réception des Échantillons
            </Link>
            <span>/</span>
            <span className="text-[#1B5C2E] font-bold">Documentation & Certificats</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 bg-[#1B5C2E]/10 rounded-xl text-[#1B5C2E]">
              <FileText className="h-6 w-6" />
            </div>
            Documentation Échantillons
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Archivage documentaire autonome et traçabilité des pièces déposées par les structures et apporteurs d&apos;échantillons (bordereaux de livraison, certificats d&apos;analyse CoA, factures, attestations eGED).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadDocuments}
            className="h-9 text-xs gap-1.5"
            title="Recharger les documents"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Actualiser
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="h-9 text-xs font-bold gap-1.5 border-[#1B5C2E]/40 text-[#1B5C2E] hover:bg-[#1B5C2E]/5"
          >
            <FileUp className="h-4 w-4" /> Ajouter un document
          </Button>

          <Button 
            asChild
            size="sm"
            className="h-9 text-xs font-bold gap-1.5 bg-[#1B5C2E] hover:bg-[#144723] text-white shadow-xs"
          >
            <Link href="/dashboard/receptions/new">
              <Plus className="h-4 w-4" /> Nouvelle Réception
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Total Documents</p>
              <h3 className="text-xl font-black text-foreground">{totalDocsCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Structures & Fournisseurs</p>
              <h3 className="text-xl font-black text-foreground">{totalStructuresCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Pièces Apporteurs (CoA, BL)</p>
              <h3 className="text-xl font-black text-foreground">{depositorDocsCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1B5C2E]/10 text-[#1B5C2E]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Actes Officiels eGED</p>
              <h3 className="text-xl font-black text-foreground">{egedDocsCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BARRE D'OUTILS : RECHERCHE, FILTRES & MODE DE VUE */}
      <Card className="border-border/70 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Barre de recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par structure, déposant, N° réception, nom de fichier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
              {searchTerm && (
                <button 
                  type="button" 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtre par structure apportrice */}
            <div className="w-full md:w-60">
              <Select value={selectedApporteur} onValueChange={(val) => setSelectedApporteur(val || "ALL")}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Toutes les structures" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-semibold">Toutes les structures ({totalStructuresCount})</SelectItem>
                  {uniqueApporteurs.map((app) => (
                    <SelectItem key={app} value={app} className="text-xs">
                      {app}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Boutons de bascule de vue */}
            <div className="flex items-center rounded-lg border border-border/80 p-0.5 bg-muted/40 shrink-0">
              <Button
                type="button"
                variant={viewMode === "by_structure" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("by_structure")}
                className={`h-8 text-xs font-bold gap-1.5 ${viewMode === "by_structure" ? "bg-[#1B5C2E] hover:bg-[#144723] text-white" : "text-muted-foreground"}`}
              >
                <Building2 className="h-3.5 w-3.5" /> Par Apporteur ({groupedByApporteur.length})
              </Button>
              <Button
                type="button"
                variant={viewMode === "all_list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("all_list")}
                className={`h-8 text-xs font-bold gap-1.5 ${viewMode === "all_list" ? "bg-[#1B5C2E] hover:bg-[#144723] text-white" : "text-muted-foreground"}`}
              >
                <Layers className="h-3.5 w-3.5" /> Liste Globale ({filteredDocuments.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CONTENU PRINCIPAL */}
      {filteredDocuments.length === 0 ? (
        <Card className="border-dashed border-2 border-border/80 text-center p-12">
          <div className="max-w-md mx-auto space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Aucun document trouvé</h3>
            <p className="text-xs text-muted-foreground">
              {documents.length === 0 
                ? "Aucun document n'a encore été rattaché aux échantillons. Dès qu'un bordereau de livraison, certificat CoA ou attestation eGED est enregistré, il apparaîtra ici classé par structure apportrice."
                : "Aucun document ne correspond à vos critères de recherche."}
            </p>
            <div className="pt-2 flex justify-center gap-2">
              {(searchTerm || selectedApporteur !== "ALL") && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedApporteur("ALL")
                  }}
                  className="text-xs"
                >
                  Effacer les filtres
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={() => setShowAddModal(true)} 
                className="text-xs font-bold bg-[#1B5C2E] hover:bg-[#144723] text-white gap-1.5"
              >
                <FileUp className="h-4 w-4" /> Ajouter un document
              </Button>
            </div>
          </div>
        </Card>
      ) : viewMode === "by_structure" ? (
        /* VUE 1 : GROUPÉE PAR APPORTEUR / STRUCTURE */
        <div className="space-y-5">
          {groupedByApporteur.map((group) => (
            <Card key={group.structure} className="border-border/70 shadow-xs overflow-hidden">
              <CardHeader className="bg-muted/20 border-b border-border/60 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1.5 bg-[#1B5C2E]/10 rounded-lg text-[#1B5C2E]">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <h3 className="text-base font-bold text-foreground tracking-tight">
                        {group.structure}
                      </h3>
                      {group.source_type && (
                        <Badge variant="secondary" className="text-[10px] font-semibold uppercase">
                          {group.source_type}
                        </Badge>
                      )}
                      {group.city && (
                        <span className="text-xs text-muted-foreground">• {group.city}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-0.5">
                      {group.depositor_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground/70" />
                          Contact / Déposant : <strong className="text-foreground">{group.depositor_name}</strong>
                        </span>
                      )}
                      {group.depositor_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground/70" />
                          {group.depositor_phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Badge variant="outline" className="text-xs font-bold bg-background text-[#1B5C2E] border-[#1B5C2E]/30">
                      {group.docs.length} document{group.docs.length > 1 ? "s" : ""} archivé{group.docs.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="font-bold">Titre & Document</TableHead>
                        <TableHead className="font-bold">Type / Intitulé</TableHead>
                        <TableHead className="font-bold">Réf. Réception</TableHead>
                        <TableHead className="font-bold">Date</TableHead>
                        <TableHead className="font-bold">Taille</TableHead>
                        <TableHead className="text-right font-bold pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.docs.map((doc) => {
                        const isOfficial = isOfficialDoc(doc)
                        return (
                          <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="pl-4">
                              <div className={`p-1.5 rounded ${isOfficial ? "bg-[#1B5C2E]/10 text-[#1B5C2E]" : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"}`}>
                                <FileText className="h-4 w-4" />
                              </div>
                            </TableCell>

                            <TableCell>
                              <p className="font-bold text-foreground">{doc.title || doc.file_name}</p>
                              {doc.description && (
                                <p className="text-[11px] text-muted-foreground italic line-clamp-1">{doc.description}</p>
                              )}
                              {doc.title && doc.title !== doc.file_name && (
                                <p className="text-[10px] text-muted-foreground/70 font-mono">{doc.file_name}</p>
                              )}
                            </TableCell>

                            <TableCell>
                              <Badge 
                                variant={isOfficial ? "default" : "secondary"} 
                                className={`text-[10px] font-semibold ${isOfficial ? "bg-[#1B5C2E] hover:bg-[#144723] text-white" : ""}`}
                              >
                                {doc.title || doc.document_type || "Pièce apporteur"}
                              </Badge>
                            </TableCell>

                            <TableCell className="font-mono text-[11px] font-semibold text-muted-foreground">
                              {doc.reception_number ? (
                                <span className="text-foreground">{doc.reception_number}</span>
                              ) : (
                                <span className="italic text-muted-foreground/60">—</span>
                              )}
                            </TableCell>

                            <TableCell className="text-muted-foreground">
                              {doc.reception_date || (doc.created_at ? new Date(doc.created_at).toLocaleDateString("fr-FR") : "—")}
                            </TableCell>

                            <TableCell className="text-muted-foreground font-mono text-[11px]">
                              {doc.file_size_formatted || "—"}
                            </TableCell>

                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenPreview(doc)}
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Aperçu / Visualiser"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownload(doc)}
                                  className="h-7 w-7 text-[#1B5C2E] hover:text-[#144723] hover:bg-[#1B5C2E]/10"
                                  title="Télécharger"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteDoc(doc.id, doc.file_name)}
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Supprimer des archives"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* VUE 2 : TOUS LES DOCUMENTS EN LISTE GLOBALE */
        <Card className="border-border/70 shadow-xs overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Tous les Documents Échantillons Référencés</CardTitle>
                <CardDescription className="text-xs">
                  {filteredDocuments.length} document(s) au total, triés du plus récent au plus ancien.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="font-bold">Nom du Document</TableHead>
                    <TableHead className="font-bold">Structure / Fournisseur</TableHead>
                    <TableHead className="font-bold">Type / Intitulé</TableHead>
                    <TableHead className="font-bold">N° Réception</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Taille</TableHead>
                    <TableHead className="text-right font-bold pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => {
                    const isOfficial = isOfficialDoc(doc)
                    return (
                      <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-4">
                          <div className={`p-1.5 rounded ${isOfficial ? "bg-[#1B5C2E]/10 text-[#1B5C2E]" : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"}`}>
                            <FileText className="h-4 w-4" />
                          </div>
                        </TableCell>

                        <TableCell>
                          <p className="font-bold text-foreground">{doc.title || doc.file_name}</p>
                          {doc.description && (
                            <p className="text-[11px] text-muted-foreground italic line-clamp-1">{doc.description}</p>
                          )}
                          {doc.title && doc.title !== doc.file_name && (
                            <p className="text-[10px] text-muted-foreground/70 font-mono">{doc.file_name}</p>
                          )}
                        </TableCell>

                        <TableCell className="font-semibold text-foreground">
                          {doc.source_structure}
                        </TableCell>

                        <TableCell>
                          <Badge 
                            variant={isOfficial ? "default" : "secondary"} 
                            className={`text-[10px] font-semibold ${isOfficial ? "bg-[#1B5C2E] hover:bg-[#144723] text-white" : ""}`}
                          >
                            {doc.title || doc.document_type || "Pièce apporteur"}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-mono text-[11px] font-semibold text-muted-foreground">
                          {doc.reception_number ? (
                            <span className="text-foreground">{doc.reception_number}</span>
                          ) : (
                            <span className="italic text-muted-foreground/60">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {doc.reception_date || (doc.created_at ? new Date(doc.created_at).toLocaleDateString("fr-FR") : "—")}
                        </TableCell>

                        <TableCell className="text-muted-foreground font-mono text-[11px]">
                          {doc.file_size_formatted || "—"}
                        </TableCell>

                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenPreview(doc)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Aperçu / Visualiser"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(doc)}
                              className="h-7 w-7 text-[#1B5C2E] hover:text-[#144723] hover:bg-[#1B5C2E]/10"
                              title="Télécharger"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDoc(doc.id, doc.file_name)}
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Supprimer des archives"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DIALOG 1 : MODALE DE PRÉVISUALISATION D'UN DOCUMENT */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl sm:max-w-4xl w-[95vw] md:w-full bg-card border-border/70 p-4 sm:p-6 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground truncate pr-4">
                <FileText className="h-5 w-5 text-[#1B5C2E] shrink-0" />
                <span className="truncate">{previewDoc?.title || previewDoc?.file_name}</span>
              </DialogTitle>
              {previewDoc && (
                <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                  {previewDoc.title || previewDoc.document_type}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Traçabilité : Structure <strong>{previewDoc?.source_structure}</strong> {previewDoc?.reception_number ? `• Réf. ${previewDoc.reception_number}` : ""}
            </DialogDescription>
          </DialogHeader>

          {previewDoc && (
            <div className="space-y-4 pt-2">
              {/* Métadonnées du document */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/40 rounded-xl text-xs border border-border/70">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Structure Apportrice</span>
                  <strong className="text-foreground">{previewDoc.source_structure}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Titre / Type</span>
                  <strong className="text-foreground">{previewDoc.title || previewDoc.document_type}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Taille & Format</span>
                  <span className="font-mono text-foreground">{previewDoc.file_size_formatted || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Date d&apos;archivage</span>
                  <span className="text-foreground">{previewDoc.reception_date || "—"}</span>
                </div>
              </div>

              {previewDoc.description && (
                <div className="p-2.5 bg-muted/30 rounded-lg text-xs border border-border/60">
                  <span className="text-muted-foreground font-semibold">Note / Observation : </span>
                  <span>{previewDoc.description}</span>
                </div>
              )}

              {/* Rendu du contenu du document */}
              <div className="rounded-xl border border-border/80 bg-background overflow-hidden min-h-[300px] max-h-[500px] flex items-center justify-center p-2">
                {(previewDoc.data_url || previewDoc.file_data)?.startsWith("data:image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={previewDoc.data_url || previewDoc.file_data} 
                    alt={previewDoc.file_name} 
                    className="max-h-[480px] w-auto max-w-full object-contain rounded" 
                  />
                ) : (previewDoc.data_url || previewDoc.file_data)?.startsWith("data:application/pdf") ? (
                  <iframe
                    src={previewDoc.data_url || previewDoc.file_data}
                    title={previewDoc.file_name}
                    className="w-full h-[480px] border-none rounded"
                  />
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-[#1B5C2E]/10 text-[#1B5C2E] flex items-center justify-center">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{previewDoc.title || previewDoc.file_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Prévisualisation directe non disponible pour ce type de document.
                      </p>
                    </div>
                    <Button 
                      type="button"
                      onClick={() => handleDownload(previewDoc)}
                      className="text-xs font-bold bg-[#1B5C2E] hover:bg-[#144723] text-white gap-2"
                    >
                      <Download className="h-4 w-4" /> Télécharger pour l&apos;ouvrir localement
                    </Button>
                  </div>
                )}
              </div>

              {/* Footer de la modale */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowPreviewModal(false)}
                  className="text-xs"
                >
                  Fermer
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => handleDownload(previewDoc)}
                  className="text-xs font-bold bg-[#1B5C2E] hover:bg-[#144723] text-white gap-2"
                >
                  <Download className="h-4 w-4" /> Télécharger ce document
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG 2 : AJOUT MANUEL D'UN DOCUMENT À UNE STRUCTURE (CASES BIEN VIDES SANS TEXTES D'EXEMPLES) */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full bg-card border-border/70 p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <FileUp className="h-5 w-5 text-[#1B5C2E]" />
              Archiver un Nouveau Document Échantillon
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajoutez un certificat d&apos;analyse CoA, bordereau de livraison, facture ou PV rattaché à une structure déposante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Structure Apportrice */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Structure / Fournisseur Apporteur <span className="text-red-500">*</span>
              </label>
              <Input
                value={newDocApporteur}
                onChange={(e) => setNewDocApporteur(e.target.value)}
                list="sample-structures-datalist"
                className="h-9 text-xs bg-background"
              />
              <datalist id="sample-structures-datalist">
                {uniqueApporteurs.map((app) => (
                  <option key={app} value={app} />
                ))}
              </datalist>
            </div>

            {/* Titre du Document (saisie libre) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Titre du document <span className="text-red-500">*</span>
              </label>
              <Input
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="h-9 text-xs bg-background"
              />
            </div>

            {/* Référence Réception (Optionnel) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Réf. Bordereau ou Réception (Optionnel)</label>
              <Input
                value={newDocReceptionRef}
                onChange={(e) => setNewDocReceptionRef(e.target.value)}
                className="h-9 text-xs bg-background"
              />
            </div>

            {/* Description / Observation */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Note / Commentaire (Optionnel)</label>
              <Input
                value={newDocDescription}
                onChange={(e) => setNewDocDescription(e.target.value)}
                className="h-9 text-xs bg-background"
              />
            </div>

            {/* Sélection de fichier */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Fichier du Document <span className="text-red-500">*</span></label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,image/*"
                className="hidden"
              />

              {newDocFile ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="h-4 w-4 text-[#1B5C2E] shrink-0" />
                    <div className="truncate">
                      <p className="font-bold truncate">{newDocFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{newDocFile.size}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewDocFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                    className="h-7 text-xs text-red-600 hover:bg-red-50"
                  >
                    Changer
                  </Button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/80 rounded-xl p-5 text-center cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <FileUp className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                  <p className="font-semibold text-foreground">Cliquez pour sélectionner un fichier</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PDF, Word, Excel ou Image (Max 10 Mo)</p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveNewDoc}
                disabled={isSubmittingNewDoc || !newDocFile || !newDocApporteur.trim()}
                className="text-xs font-bold bg-[#1B5C2E] hover:bg-[#144723] text-white gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> Enregistrer dans la traçabilité
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
