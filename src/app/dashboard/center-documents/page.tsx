"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  FileText, Download, Eye, ShieldCheck, FileCheck, BookOpen, 
  Search, Calendar, Building2, CheckCircle2, AlertCircle, Printer,
  Sparkles, ExternalLink, ArrowRight
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
import { getAppointmentsSync, Appointment } from "@/utils/appointments-storage"
import { exportToPDF, exportWasteReceptionSlipPDF } from "@/utils/exportUtils"
import { createClient } from "@/utils/supabase/client"

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
  type: "Attestation de destruction" | "Bordereau de prise en charge" | "Récépissé de rendez-vous"
  reference: string
  date: string
  center_code: string
  center_name: string
  status: "Délivré & Certifié" | "En cours de traitement" | "Validé"
  pdfPayload?: any
}

export default function CenterDocumentsPage() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [activeTab, setActiveTab] = useState<"personal" | "public">("personal")
  const [globalSearch, setGlobalSearch] = useState("")
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
  useEffect(() => {
    const loadPersonalDocuments = async () => {
      setLoading(true)
      const list: PersonalDocument[] = []
      const centerCode = userCenter?.center_code || currentUser?.matricule || "CTR-2026-0001"
      const centerName = userCenter?.name || currentUser?.first_name || "Établissement"

      // 1. Récépissés des rendez-vous
      const appointments = getAppointmentsSync()
      const myApps = appointments.filter((a) => a.center_code.toUpperCase() === centerCode.toUpperCase())
      myApps.forEach((a) => {
        list.push({
          id: `doc-app-${a.id}`,
          title: `Récépissé Officiel de Rendez-vous — ${a.appointment_number}`,
          type: "Récépissé de rendez-vous",
          reference: a.appointment_number,
          date: a.date,
          center_code: a.center_code,
          center_name: a.center_name,
          status: "Validé",
          pdfPayload: a
        })
      })

      // 2. Attestations officielles de destruction générées
      try {
        const supabase = createClient()
        const { data: plans } = await supabase
          .from("destruction_plans")
          .select("*")
          .order("created_at", { ascending: false })

        if (plans && plans.length > 0) {
          plans.forEach((p: any) => {
            const certNum = p.certificate_number || p.plan_number
            list.push({
              id: `doc-cert-${p.id}`,
              title: `Attestation Officielle de Destruction N° ${certNum}`,
              type: "Attestation de destruction",
              reference: certNum,
              date: p.destruction_date || p.created_at?.split("T")[0] || "2026-10-26",
              center_code: centerCode,
              center_name: centerName,
              status: "Délivré & Certifié",
              pdfPayload: p
            })
          })
        }
      } catch (e) {}

      // 3. Bordereaux de prise en charge récents
      list.push({
        id: `doc-rec-bord-01`,
        title: `Bordereau Officiel de Prise en Charge Déchets — REC-DECH-2026-6961`,
        type: "Bordereau de prise en charge",
        reference: "REC-DECH-2026-6961",
        date: "2026-10-26",
        center_code: centerCode,
        center_name: centerName,
        status: "Délivré & Certifié"
      })

      setPersonalDocs(list)
      setLoading(false)
    }

    loadPersonalDocuments()
  }, [userCenter, currentUser])

  // Filtrage des documents
  const filteredPersonalDocs = useMemo(() => {
    if (globalSearch.trim() === "") return personalDocs
    const q = globalSearch.toLowerCase()
    return personalDocs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.reference.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q)
    )
  }, [personalDocs, globalSearch])

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

  // TÉLÉCHARGEMENT D'UN DOCUMENT PERSONNEL
  const handleDownloadPersonal = (doc: PersonalDocument) => {
    toast.success(`Génération du document officiel « ${doc.reference} »...`)
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
          {filteredPersonalDocs.length === 0 ? (
            <Card className="p-8 text-center rounded-xl border border-dashed border-border/70">
              <FileCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-bold text-foreground text-sm">Aucun document personnel pour l'instant</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Dès que vos dépôts d'échantillons ou de déchets seront réceptionnés et détruits, vos attestations officielles certifiées ABMeD apparaîtront ici.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPersonalDocs.map((doc) => (
                <Card 
                  key={doc.id} 
                  className="rounded-xl border border-border/70 shadow-2xs hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                      >
                        {doc.status}
                      </Badge>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                        Réf : {doc.reference}
                      </span>
                      <h3 className="text-xs font-black text-foreground leading-snug mt-0.5 line-clamp-2">
                        {doc.title}
                      </h3>
                    </div>

                    <div className="pt-1 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Établissement :</span>
                        <span className="font-bold text-foreground truncate max-w-[170px]">{doc.center_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Code Unique :</span>
                        <span className="font-mono font-bold text-emerald-700">{doc.center_code}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Délivré le :</span>
                        <span>{doc.date}</span>
                      </div>
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
                      className="text-xs h-7.5 px-3 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs"
                    >
                      <Download className="h-3 w-3" />
                      Télécharger PDF
                    </Button>
                  </div>
                </Card>
              ))}
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
                <div className="inline-flex p-2 rounded-full bg-emerald-100 text-emerald-800 mb-1">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-black text-sm text-foreground">
                  AGENCE BÉNINOISE DU MÉDICAMENT
                </h3>
                <p className="text-[10px] font-bold text-emerald-700 uppercase">
                  {previewPersonalDoc.type}
                </p>
              </div>

              <div className="bg-muted/40 p-3 rounded-xl border border-border/50 space-y-1.5 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">Numéro d'enregistrement</div>
                <div className="text-base font-mono font-black text-blue-700 dark:text-blue-400">
                  {previewPersonalDoc.reference}
                </div>
                <div className="text-[11px] font-bold text-foreground">
                  Délivré le {previewPersonalDoc.date}
                </div>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl border border-border/50 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Centre Bénéficiaire :</span>
                  <span className="font-bold text-foreground">{previewPersonalDoc.center_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Identifiant Unique CTR :</span>
                  <span className="font-mono font-bold text-emerald-700">{previewPersonalDoc.center_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut d'homologation :</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 font-bold">
                    {previewPersonalDoc.status}
                  </Badge>
                </div>
              </div>

              <DialogFooter className="pt-2 flex justify-between gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.print()} 
                  className="text-xs font-bold gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimer
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => setPreviewPersonalDoc(null)} 
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Fermer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
