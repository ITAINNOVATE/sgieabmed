"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Box, Trash2, Printer, MapPin, Archive, Download, FileText, Scan, Building2, ShieldCheck, Phone, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

import { createClient } from "@/utils/supabase/client"
import { generateQRCodeDataUrl, formatWasteQRText } from "@/utils/qrCode"
import { LabelPrintDialog } from "@/components/label-print-dialog"
import { exportWasteReceptionSlipPDF } from "@/utils/exportUtils"

const MOCK_WASTE_BATCHES_DETAILS: Record<string, any> = {
  '1': {
    id: '1',
    batch_number: 'DEC-2026-73355',
    waste_type: 'Médicaments périmés',
    quantity: 150,
    unit: 'Kg',
    current_location: 'Local Déchets A1',
    status: 'En attente de destruction',
    observations: 'Périmés depuis plus de 6 mois, conditionnés dans des fûts sécurisés étanches.',
    created_at: '2026-01-20T10:00:00.000Z',
    creator: { first_name: 'Marie', last_name: 'ADANDE' },
    sample: { commercial_name: 'Amoxicilline 500mg Gélule', batch_number: 'LOT-AMX-2024-09' },
    sample_id: 'sample-1'
  },
  '2': {
    id: '2',
    batch_number: 'DEC-2026-88120',
    waste_type: 'Produits chimiques dangereux',
    quantity: 45,
    unit: 'L',
    current_location: 'Zone Quarantaine C2',
    status: 'Déclaré',
    observations: 'Réactifs de laboratoire périmés en flacons verre brun.',
    created_at: '2026-02-12T14:30:00.000Z',
    creator: { first_name: 'Marie', last_name: 'ADANDE' },
    sample: { commercial_name: 'Solvant Acétonitrile HPLC', batch_number: 'SOLV-2024-002' },
    sample_id: 'sample-2'
  },
  '3': {
    id: '3',
    batch_number: 'DEC-2026-11409',
    waste_type: 'Déchets infectieux (DASRI)',
    quantity: 230,
    unit: 'Kg',
    current_location: 'Local DASRI B',
    status: 'Validé',
    observations: 'Boîtes jaunes DASRI scellées et étiquetées conformément à la norme PSQIF.',
    created_at: '2026-03-05T09:15:00.000Z',
    creator: { first_name: 'Marie', last_name: 'ADANDE' },
    sample: null,
    sample_id: null
  },
  '4': {
    id: '4',
    batch_number: 'DEC-2026-99201',
    waste_type: 'Flacons cassés',
    quantity: 12,
    unit: 'Kg',
    current_location: 'Local Déchets A2',
    status: 'En contrôle',
    observations: 'Bris de verre d\'ampoules et flacons injectables.',
    created_at: '2026-03-18T16:00:00.000Z',
    creator: { first_name: 'Marie', last_name: 'ADANDE' },
    sample: null,
    sample_id: null
  },
  '5': {
    id: '5',
    batch_number: 'DEC-2026-44021',
    waste_type: 'Emballages souillés',
    quantity: 80,
    unit: 'Kg',
    current_location: 'Local Déchets A1',
    status: 'Détruit',
    observations: 'Cartons et blisters contaminés incinérés lors de la session Q1.',
    created_at: '2026-03-25T11:20:00.000Z',
    creator: { first_name: 'Marie', last_name: 'ADANDE' },
    sample: { commercial_name: 'Paracétamol 1g Comprimé', batch_number: 'LOT-PAR-2023-88' },
    sample_id: 'sample-5',
    destruction_date: '2026-03-28T10:00:00.000Z',
    certificate_number: 'CERT-DEST-2026-0042'
  },
}

export default function WasteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [wasteBatch, setWasteBatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchWasteBatch() {
      // 1. Affichage instantané (0ms) depuis localStorage ou fallback
      let foundLocal: any = null
      try {
        const stored = localStorage.getItem('waste_batches_custom_v1')
        if (stored) {
          const list = JSON.parse(stored)
          foundLocal = list.find((b: any) => b.id === resolvedParams.id || b.batch_number === resolvedParams.id)
        }
      } catch (e) {}

      const initialBatch = foundLocal || MOCK_WASTE_BATCHES_DETAILS[resolvedParams.id] || {
        id: resolvedParams.id,
        batch_number: `DEC-2026-${resolvedParams.id.substring(0, 5).toUpperCase()}`,
        waste_type: 'Déchet Pharmaceutique Standard',
        quantity: 50,
        unit: 'Kg',
        current_location: 'Local Déchets A1',
        status: 'Déclaré',
        observations: 'Lot enregistré dans le cadre du suivi réglementaire ABMed.',
        created_at: new Date().toISOString(),
        creator: { first_name: 'Marie', last_name: 'ADANDE' },
        sample: null,
        sample_id: null
      }
      setWasteBatch(initialBatch)
      setLoading(false)

      // 2. Synchronisation avec Supabase en arrière-plan
      try {
        const { data } = await supabase
          .from('waste_batches')
          .select(`
            *,
            sample:samples(commercial_name, batch_number),
            creator:users!created_by(first_name, last_name)
          `)
          .eq('id', resolvedParams.id)
          .single()
        
        if (data) {
          setWasteBatch(data)
        }
      } catch (err) {}
    }
    fetchWasteBatch()
  }, [resolvedParams.id, supabase])

  // Générer le QR Code contenant le récapitulatif complet du lot de déchet
  useEffect(() => {
    if (!wasteBatch) return
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eged-abmed.gov.bj'
    const qrText = formatWasteQRText({
      id: wasteBatch.id,
      batch_number: wasteBatch.batch_number,
      reception_number: wasteBatch.reception_number,
      waste_type: wasteBatch.waste_type,
      commercial_name: wasteBatch.commercial_name || wasteBatch.sample?.commercial_name,
      original_batch: wasteBatch.original_batch || wasteBatch.sample?.batch_number,
      quantity: wasteBatch.quantity,
      unit: wasteBatch.unit,
      packaging: wasteBatch.packaging,
      packaging_condition: wasteBatch.packaging_condition,
      source_structure: wasteBatch.source_structure,
      source_type: wasteBatch.source_type,
      depositor_name: wasteBatch.depositor_name,
      depositor_phone: wasteBatch.depositor_phone,
      recipient_agent: wasteBatch.recipient_agent || (wasteBatch.creator ? `${wasteBatch.creator.first_name} ${wasteBatch.creator.last_name}` : undefined),
      destruction_motive: wasteBatch.destruction_motive || wasteBatch.rejection_reason || wasteBatch.observations,
      current_location: wasteBatch.current_location,
      status: wasteBatch.status,
      reception_date: wasteBatch.created_at,
      destruction_plan_ref: wasteBatch.destruction_plan_ref
    }, origin)

    generateQRCodeDataUrl(qrText).then(qrUrl => setQrCodeUrl(qrUrl)).catch(() => {})
  }, [wasteBatch])

  const handlePrint = () => {
    setIsPrintDialogOpen(true)
  }

  const handleDownloadQrPng = () => {
    if (!qrCodeUrl) return
    const a = document.createElement('a')
    a.href = qrCodeUrl
    a.download = `QR-${wasteBatch?.batch_number || 'dechet'}.png`
    a.click()
    toast.success("QR Code téléchargé au format PNG !")
  }

  const handleDownloadPdf = () => {
    window.print()
  }

  const handleDownloadReceptionSlip = () => {
    if (!wasteBatch) return
    exportWasteReceptionSlipPDF({
      reception_number: wasteBatch.reception_number || `REC-DECH-2026-${wasteBatch.id?.substring(0, 5) || '001'}`,
      reception_date: wasteBatch.reception_date || (wasteBatch.created_at ? new Date(wasteBatch.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      reception_time: wasteBatch.reception_time || '09:00',
      delivery_slip_ref: wasteBatch.delivery_slip_ref || 'Remise directe sur site',
      recipient_agent: wasteBatch.recipient_agent || (wasteBatch.creator ? `${wasteBatch.creator.first_name} ${wasteBatch.creator.last_name}` : 'Marie ADANDE (Agent ABMed)'),
      source_structure: wasteBatch.source_structure || 'Structure Déposante Référencée',
      source_type: wasteBatch.source_type || 'Officine / Établissement de Santé',
      city: wasteBatch.city || 'Cotonou',
      depositor_name: wasteBatch.depositor_name || 'Représentant de la structure',
      depositor_phone: wasteBatch.depositor_phone || 'N/A',
      depositor_id_card: wasteBatch.depositor_id_card || '',
      general_observations: wasteBatch.observations || '',
      items: [{
        batch_number: wasteBatch.batch_number,
        waste_type: wasteBatch.waste_type,
        commercial_name: wasteBatch.commercial_name || (wasteBatch.sample?.commercial_name) || '',
        original_batch: wasteBatch.original_batch || (wasteBatch.sample?.batch_number) || '',
        quantity: wasteBatch.quantity,
        unit: wasteBatch.unit || 'Kg',
        packaging: wasteBatch.packaging || 'Conditionnement scellé',
        location: wasteBatch.current_location || 'Zone Quarantaine',
        observations: wasteBatch.observations || ''
      }]
    })
    toast.success("Attestation de réception PDF générée !")
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement de la fiche déchet...</div>
  if (!wasteBatch) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive font-bold">Lot de déchet introuvable.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/waste"><ArrowLeft className="mr-2 h-4 w-4" /> Retour au registre des déchets</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-6xl mx-auto pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm sticky top-20 z-10 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0 rounded-full">
            <Link href="/dashboard/waste"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Lot {wasteBatch.batch_number}
              <Badge variant="outline" className="ml-2 bg-background">{wasteBatch.status}</Badge>
            </h2>
            <p className="text-muted-foreground text-xs">Déclaré le {new Date(wasteBatch.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2 cursor-pointer"><Printer className="h-4 w-4" /> Imprimer l&apos;étiquette</Button>
          <Button variant="outline" onClick={handleDownloadReceptionSlip} className="gap-2 cursor-pointer text-[#1B5C2E] border-[#1B5C2E]/30 hover:bg-[#1B5C2E]/10">
            <Download className="h-4 w-4" /> Attestation Réception (PDF)
          </Button>
          {wasteBatch.status === 'Détruit' ? (
            <Button variant="secondary" onClick={() => setShowCertificateModal(true)} className="gap-2 cursor-pointer bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300">
              <Archive className="h-4 w-4 text-emerald-700" /> Voir le certificat
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setShowCertificateModal(true)} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4" /> Attestation à Signer
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Waste details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="text-lg flex items-center"><Trash2 className="mr-2 h-5 w-5 text-destructive" /> Informations du Déchet</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type de déchet</p>
                  <p className="text-base font-semibold">{wasteBatch.waste_type}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Quantité / Poids</p>
                    <p className="text-base">{wasteBatch.quantity} {wasteBatch.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Localisation</p>
                    <p className="text-base flex items-center"><MapPin className="h-4 w-4 mr-1 text-muted-foreground"/> {wasteBatch.current_location || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Déclaré par</p>
                  <p className="text-base">{wasteBatch.creator ? `${wasteBatch.creator.first_name} ${wasteBatch.creator.last_name}` : 'Utilisateur système'}</p>
                </div>

                {wasteBatch.observations && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Observations</p>
                    <p className="text-sm bg-muted/30 p-3 rounded-md mt-1 border border-border/50">{wasteBatch.observations}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="text-lg flex items-center"><Box className="mr-2 h-5 w-5 text-primary" /> Origine (Traçabilité)</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {wasteBatch.sample ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 border border-border/50 rounded-lg bg-primary/5">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{wasteBatch.sample.commercial_name}</p>
                        <p className="text-sm text-muted-foreground">Lot d'origine: {wasteBatch.sample.batch_number}</p>
                        <Button variant="link" className="p-0 h-auto mt-2 text-primary" asChild>
                          <Link href={`/dashboard/samples/${wasteBatch.sample_id}`}>Voir l'échantillon source &rarr;</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-muted/20 rounded-lg text-muted-foreground border border-dashed border-border/50">
                    Ce déchet n'est pas lié à un échantillon spécifique de l'inventaire.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Structure Déposante & Provenance Card */}
            <Card className="shadow-sm border-border/50 sm:col-span-2">
              <CardHeader className="bg-[#1B5C2E]/5 border-b border-border/50 pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-[#1B5C2E]">
                  <Building2 className="h-5 w-5" />
                  Provenance & Structure qui a apporté les Déchets
                </CardTitle>
                <CardDescription className="text-xs">
                  Informations de traçabilité sur l&apos;établissement et la personne ayant déposé le colis.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase">Structure / Établissement</p>
                  <p className="text-sm font-bold text-foreground">
                    {wasteBatch.source_structure || "Dépôt direct sur site (Non spécifié)"}
                  </p>
                  {wasteBatch.source_type && (
                    <Badge variant="outline" className="text-[10px] bg-background">
                      {wasteBatch.source_type}
                    </Badge>
                  )}
                  {wasteBatch.city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
                      <MapPin className="h-3 w-3 text-muted-foreground" /> {wasteBatch.city}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase">Déposant (Apporteur)</p>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {wasteBatch.depositor_name || "Agent de l'établissement"}
                  </p>
                  {wasteBatch.depositor_phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" /> {wasteBatch.depositor_phone}
                    </p>
                  )}
                  {wasteBatch.depositor_id_card && (
                    <p className="text-[10px] text-muted-foreground font-mono">
                      ID: {wasteBatch.depositor_id_card}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase">Récépissé & Prise en charge</p>
                  <p className="text-sm font-mono font-bold text-[#1B5C2E]">
                    {wasteBatch.reception_number || `REC-DECH-2026-${wasteBatch.id?.substring(0, 5) || "001"}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reçu le : {wasteBatch.reception_date || (wasteBatch.created_at ? new Date(wasteBatch.created_at).toLocaleDateString() : "N/A")}
                  </p>
                  {wasteBatch.delivery_slip_ref && (
                    <p className="text-[10px] text-muted-foreground">
                      Bordereau externe : {wasteBatch.delivery_slip_ref}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: QR Code & Traçabilité Card */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border/50 rounded-2xl sticky top-24">
            <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary" /> Identifiant & QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-white p-3 rounded-xl border border-border/60 shadow-sm flex items-center justify-center">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Waste QR Code" className="w-40 h-40" />
                ) : (
                  <div className="w-40 h-40 bg-muted/30 animate-pulse rounded-lg" />
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identifiant de Lot</p>
                <p className="text-sm font-mono font-bold bg-muted/50 px-3 py-1.5 rounded-lg border border-border/40 inline-block text-primary">
                  {wasteBatch.batch_number}
                </p>
              </div>

              <div className="w-full pt-4 border-t border-border/50 space-y-2">
                <Button 
                  onClick={handlePrint}
                  className="w-full h-10 rounded-xl gap-2 font-semibold shadow-sm cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Imprimer l&apos;étiquette
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadQrPng}
                    className="h-9 rounded-xl text-xs gap-1 border-border/60 hover:bg-muted cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> PNG
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadPdf}
                    className="h-9 rounded-xl text-xs gap-1 border-border/60 hover:bg-muted cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </div>
              
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Collez cette étiquette standard (60x40mm) sur le bac de stockage pour faciliter l&apos;enregistrement et l&apos;inventaire des déchets.
              </p>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* DIALOG OFFICIEL CERTIFICAT / ATTESTATION DE RÉCEPTION DE DÉCHETS */}
      <Dialog open={showCertificateModal} onOpenChange={setShowCertificateModal}>
        <DialogContent className="max-w-4xl sm:max-w-4xl w-[95vw] md:w-full bg-card border-border/70 p-4 sm:p-6 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-5 w-5 text-[#1B5C2E]" />
              {wasteBatch.status === 'Détruit' ? "Certificat Officiel de Destruction" : "Attestation & Bordereau de Réception de Déchets"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              République du Bénin — Agence béninoise du Médicament (ABMed) — Direction de la Gestion des Déchets
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {wasteBatch.status === 'Détruit' ? (
              <div className="space-y-4">
                <div className="bg-muted/40 p-4 rounded-xl border border-border/50 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">N° Référence Déchet</span>
                    <span className="font-mono font-bold text-sm text-foreground">{wasteBatch.batch_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Statut Réglementaire</span>
                    <Badge className="bg-emerald-100 text-emerald-800">
                      {wasteBatch.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Type de Déchet</span>
                    <span className="font-semibold text-foreground">{wasteBatch.waste_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Quantité / Poids Détruit</span>
                    <span className="font-bold text-foreground">{wasteBatch.quantity} {wasteBatch.unit}</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-emerald-950">
                  <p className="font-bold flex items-center gap-1.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Attestation de Destruction Conforme
                  </p>
                  <p className="text-xs leading-relaxed">
                    Le présent lot a été validé selon la procédure à Quatre Yeux et détruit conformément aux directives environnementales et sanitaires de l&apos;ABMed le {wasteBatch.destruction_date ? new Date(wasteBatch.destruction_date).toLocaleDateString() : '28/03/2026'}.
                  </p>
                  <p className="text-[11px] font-mono text-emerald-800 pt-1">
                    Certificat N°: {wasteBatch.certificate_number || 'CERT-DEST-2026-0042'} — Signé électroniquement
                  </p>
                </div>
              </div>
            ) : (
              /* ATTESTATION DE RÉCEPTION OFFICIELLE AVEC STRUCTURE ET SIGNATURES */
              <div className="space-y-4">
                
                {/* En-tête Récépissé */}
                <div className="p-3 bg-muted/30 border border-border/50 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Récépissé de Réception</span>
                    <span className="font-mono font-bold text-sm text-[#1B5C2E]">
                      {wasteBatch.reception_number || `REC-DECH-2026-${wasteBatch.id?.substring(0, 5) || '001'}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Date & Heure</span>
                    <span className="font-semibold text-xs text-foreground">
                      {wasteBatch.reception_date || (wasteBatch.created_at ? new Date(wasteBatch.created_at).toLocaleDateString() : 'Aujourd\'hui')}
                    </span>
                  </div>
                </div>

                {/* Grille Structure & Prise en charge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-muted/40 rounded-xl border border-border/50 space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase border-b border-border/40 pb-1">
                      1. Structure / Établissement Apporteur
                    </p>
                    <p><span className="text-muted-foreground">Établissement :</span> <strong>{wasteBatch.source_structure || 'Structure Non Spécifiée'}</strong></p>
                    <p><span className="text-muted-foreground">Type :</span> {wasteBatch.source_type || 'Officine / Grossiste'}</p>
                    <p><span className="text-muted-foreground">Apporté par :</span> {wasteBatch.depositor_name || 'Agent de l\'établissement'}</p>
                    <p><span className="text-muted-foreground">Contact :</span> {wasteBatch.depositor_phone || 'N/A'}</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-muted/40 rounded-xl border border-border/50 space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase border-b border-border/40 pb-1">
                      2. Prise en charge ABMed
                    </p>
                    <p><span className="text-muted-foreground">Agent Récepteur :</span> <strong>{wasteBatch.recipient_agent || (wasteBatch.creator ? `${wasteBatch.creator.first_name} ${wasteBatch.creator.last_name}` : 'Marie ADANDE')}</strong></p>
                    <p><span className="text-muted-foreground">Lot Déchet ABMed :</span> <span className="font-mono font-bold">{wasteBatch.batch_number}</span></p>
                    <p><span className="text-muted-foreground">Quantité / Poids :</span> <strong>{wasteBatch.quantity} {wasteBatch.unit}</strong></p>
                    <p><span className="text-muted-foreground">Localisation :</span> {wasteBatch.current_location || 'Zone Quarantaine'}</p>
                  </div>
                </div>

                {/* Décharge légale */}
                <div className="p-3 bg-[#1B5C2E]/10 border border-[#1B5C2E]/20 rounded-xl text-emerald-950 dark:text-emerald-200 text-[11px] leading-relaxed">
                  <p className="font-bold mb-0.5 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#1B5C2E]" />
                    Décharge & Prise en Charge Réglementaire
                  </p>
                  <p>
                    L&apos;Agence Béninoise du Médicament atteste avoir réceptionné ce jour le lot ci-dessus mentionné en vue de sa neutralisation et destruction réglementaire. La structure apportrice est déchargée de la garde physique de ce lot.
                  </p>
                </div>

                {/* Blocs de Signatures */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="border border-border/70 rounded-xl p-3 min-h-[90px] flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-[10px] uppercase text-foreground">POUR LA STRUCTURE APPORTRICE</p>
                      <p className="text-[10px] text-muted-foreground">{wasteBatch.depositor_name || wasteBatch.source_structure || ''}</p>
                      <p className="text-[9px] italic text-muted-foreground">Mention « Remis pour destruction »</p>
                    </div>
                    <div className="border-t border-dashed border-border/60 pt-1 text-[9px] text-muted-foreground">
                      Signature & Cachet
                    </div>
                  </div>

                  <div className="border border-border/70 rounded-xl p-3 min-h-[90px] flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-[10px] uppercase text-foreground">POUR L&apos;ABMed (AGENT RÉCEPTEUR)</p>
                      <p className="text-[10px] text-muted-foreground">{wasteBatch.recipient_agent || 'Marie ADANDE'}</p>
                      <p className="text-[9px] text-muted-foreground">Direction Déchets Pharmaceutiques</p>
                    </div>
                    <div className="border-t border-dashed border-border/60 pt-1 text-[9px] text-muted-foreground">
                      Signature & Cachet officiel
                    </div>
                  </div>
                </div>

              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t border-border/50">
              <Button variant="outline" size="sm" onClick={() => setShowCertificateModal(false)}>Fermer</Button>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadReceptionSlip} 
                  className="gap-1.5 text-xs text-[#1B5C2E] border-[#1B5C2E]/30 hover:bg-[#1B5C2E]/10"
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger Attestation (PDF)
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleDownloadPdf} 
                  className="bg-[#1B5C2E] hover:bg-[#144723] text-white gap-1.5 text-xs font-bold"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimer pour Signature
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {wasteBatch && (
        <LabelPrintDialog 
          isOpen={isPrintDialogOpen}
          onClose={() => setIsPrintDialogOpen(false)}
          type="waste"
          items={[wasteBatch]}
        />
      )}
    </div>
  )
}
