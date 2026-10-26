"use client"

import React, { use, useEffect, useState } from "react"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"
import { generateQRCodeDataUrl } from "@/utils/qrCode"

const MOCK_WASTE_BATCHES_DETAILS: Record<string, any> = {}
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Package, 
  Calendar, 
  MapPin, 
  FileText, 
  Printer, 
  Copy, 
  Check, 
  QrCode, 
  UserCheck, 
  Scale, 
  Lock,
  ExternalLink
} from "lucide-react"

export default function PublicWasteVerifyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const rawId = decodeURIComponent(resolvedParams.id || "")
  
  const [wasteBatch, setWasteBatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("")
  const [verificationTimestamp, setVerificationTimestamp] = useState("")

  const supabase = createClient()

  useEffect(() => {
    setVerificationTimestamp(new Date().toLocaleString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }))

    async function loadWasteData() {
      setLoading(true)
      let found: any = null

      // 1. Recherche prioritaire dans Supabase (par id UUID ou par batch_number)
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)
        
        let query = supabase
          .from("waste_batches")
          .select(`
            *,
            sample:samples(commercial_name, batch_number, dci, dosage, presentation, expiry_date),
            creator:users!created_by(first_name, last_name)
          `)

        if (isUuid) {
          query = query.or(`id.eq.${rawId},batch_number.eq.${rawId}`)
        } else {
          query = query.eq("batch_number", rawId)
        }

        const { data, error } = await query.maybeSingle()
        if (data && !error) {
          found = data
        }
      } catch (err) {
        console.warn("Échec requête distante Supabase:", err)
      }

      // 2. Fallback localStorage si non trouvé ou déconnecté
      if (!found) {
        try {
          const stored = localStorage.getItem("waste_batches_custom_v1")
          if (stored) {
            const list = JSON.parse(stored)
            found = list.find((b: any) => b.id === rawId || b.batch_number === rawId)
          }
        } catch (e) {}
      }

      // 3. Fallback mock data
      if (!found && MOCK_WASTE_BATCHES_DETAILS[rawId]) {
        found = MOCK_WASTE_BATCHES_DETAILS[rawId]
      }

      setWasteBatch(found)
      setLoading(false)

      // 4. Générer le QR Code de vérification
      if (typeof window !== "undefined") {
        const currentUrl = window.location.href
        generateQRCodeDataUrl(currentUrl, { width: 200, margin: 1 })
          .then(url => setQrCodeDataUrl(url))
          .catch(() => {})
      }
    }

    loadWasteData()
  }, [rawId, supabase])

  const handleCopyIdentifier = () => {
    if (!wasteBatch) return
    const idToCopy = wasteBatch.batch_number || wasteBatch.id
    navigator.clipboard.writeText(idToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrintCertificate = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-border/50 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#003B5C] border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Vérification de l&apos;authenticité du lot...
        </h2>
        <p className="text-xs text-muted-foreground">
          Interrogation du registre national de traçabilité de l&apos;ABMed
        </p>
      </div>
    )
  }

  if (!wasteBatch) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-rose-200 dark:border-rose-900/50 overflow-hidden text-center">
        <div className="bg-rose-50 dark:bg-rose-950/40 p-6 border-b border-rose-200 dark:border-rose-900/50">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-rose-800 dark:text-rose-200 tracking-tight">
            Lot Non Répertorié ou Invalide
          </h1>
          <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1">
            Référence scannée : <span className="font-mono font-bold">{rawId}</span>
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-4 text-left">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Ce numéro de lot ou identifiant ne correspond à aucun lot de déchet pharmaceutique officiellement enregistré dans la base de données de traçabilité de l&apos;ABMed.
          </p>

          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" /> Vigilance et Contrôle Sanitaire
            </p>
            <p className="text-[11px] leading-relaxed">
              Si ce contenant ou ce lot est en circulation ou dans votre établissement, veuillez contacter sans délai les services d&apos;inspection de l&apos;ABMed.
            </p>
          </div>

          <div className="border-t border-border/50 pt-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Contact ABMed :</p>
            <p>Direction de la Réglementation et des Déchets Pharmaceutiques</p>
            <p>Cotonou, République du Bénin | Tél : (+229) 21 30 00 00</p>
          </div>
        </div>
      </div>
    )
  }

  const productName = wasteBatch.commercial_name || wasteBatch.sample?.commercial_name || wasteBatch.waste_type || "Déchet Pharmaceutique"
  const batchNumber = wasteBatch.batch_number || wasteBatch.id
  const originalBatch = wasteBatch.original_batch || wasteBatch.sample?.batch_number || "Non spécifié"
  const quantityText = `${wasteBatch.quantity || 1} ${wasteBatch.unit || "Kg"}`
  const sourceStructure = wasteBatch.source_structure || "Structure sanitaire déposante"
  const receptionDate = wasteBatch.reception_date || (wasteBatch.created_at ? new Date(wasteBatch.created_at).toLocaleDateString("fr-FR") : "Date non renseignée")
  const receptionRef = wasteBatch.reception_number || `REC-DECH-2026-${wasteBatch.id?.substring(0, 5) || "001"}`
  const motive = wasteBatch.destruction_motive || wasteBatch.rejection_reason || wasteBatch.observations || "Périmé / Rebut pharmaceutique"
  const status = wasteBatch.status || "En quarantaine"

  // Calcul du badge de statut
  const getStatusBadge = (st: string) => {
    const lower = st.toLowerCase()
    if (lower.includes("détruit") || lower.includes("detruit")) {
      return {
        label: "DÉTRUIT CONFORMÉMENT",
        badgeClass: "bg-slate-800 text-white border-slate-700",
        icon: CheckCircle2
      }
    }
    if (lower.includes("valid") || lower.includes("prêt") || lower.includes("pret")) {
      return {
        label: "VALIDÉ POUR DESTRUCTION",
        badgeClass: "bg-emerald-600 text-white border-emerald-500",
        icon: CheckCircle2
      }
    }
    if (lower.includes("quarantaine") || lower.includes("stock") || lower.includes("attente")) {
      return {
        label: "EN GARDE SÉCURISÉE / QUARANTAINE",
        badgeClass: "bg-[#003B5C] text-white border-[#002840]",
        icon: ShieldCheck
      }
    }
    return {
      label: st.toUpperCase(),
      badgeClass: "bg-amber-600 text-white border-amber-500",
      icon: ShieldCheck
    }
  }

  const statusConfig = getStatusBadge(status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="w-full max-w-3xl space-y-6">
      
      {/* CARTE OFFICIELLE DE CERTIFICATION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:shadow-none print:border-none">
        
        {/* EN-TÊTE OFFICIEL ABMED & RÉPUBLIQUE DU BÉNIN */}
        <div className="bg-gradient-to-r from-[#003B5C] via-[#004b75] to-[#003B5C] text-white p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 relative z-10 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl p-2 shadow-md flex items-center justify-center shrink-0">
                <Image 
                  src="/logoabmed.png" 
                  alt="Logo ABMed" 
                  width={56} 
                  height={56} 
                  className="object-contain max-h-12 w-auto" 
                />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] tracking-widest font-black uppercase text-amber-300">
                  RÉPUBLIQUE DU BÉNIN
                </p>
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-snug">
                  Agence Béninoise du Médicament
                </h1>
                <p className="text-[11px] text-white/80">
                  Système eGED-SGIE | Certificat Officiel de Traçabilité
                </p>
              </div>
            </div>

            {/* Badge Sécurisé en lecture seule */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-semibold text-white shrink-0">
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>Consultation Publique Sécurisée</span>
            </div>
          </div>
        </div>

        {/* BANNIÈRE DE VALIDATION DU REGISTRE */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 p-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                Produit Enregistré au Registre National
              </p>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                L&apos;authenticité et la traçabilité de ce lot sont certifiées par l&apos;ABMed.
              </p>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs flex items-center gap-1.5 ${statusConfig.badgeClass}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusConfig.label}</span>
          </div>
        </div>

        {/* CORPS DE LA FICHE : INFORMATIONS DU PRODUIT */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* IDENTIFIANT DU LOT DÉCHET */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                N° Unique du Lot Déchet
              </span>
              <span className="text-lg sm:text-2xl font-mono font-black text-[#003B5C] dark:text-sky-400 tracking-tight">
                {batchNumber}
              </span>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleCopyIdentifier}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-border/80 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                title="Copier le numéro de lot"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                <span>{copied ? "Copié !" : "Copier le N°"}</span>
              </button>

              <button
                onClick={handlePrintCertificate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#003B5C] text-white rounded-xl hover:bg-[#002c45] transition-colors shadow-2xs cursor-pointer"
                title="Imprimer l'attestation officielle"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>
            </div>
          </div>

          {/* DÉTAILS COMPLETS DU PRODUIT EN GRILLE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            
            {/* Désignation commerciale */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-[#003B5C] dark:text-sky-400" /> Désignation du Produit / Déchet
              </span>
              <p className="text-base font-black text-slate-900 dark:text-slate-100">
                {productName}
              </p>
            </div>

            {/* Classification */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Classification Réglementaire
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {wasteBatch.waste_type || "Déchet Médicamenteux"}
              </p>
            </div>

            {/* Quantité & Poids */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-muted-foreground" /> Quantité / Poids Enregistré
              </span>
              <p className="font-bold text-[#008751] text-base">
                {quantityText}
              </p>
            </div>

            {/* Lot d'origine */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Lot Fabricant d&apos;Origine
              </span>
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {originalBatch}
              </p>
            </div>

            {/* Conditionnement */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Conditionnement & État
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {wasteBatch.packaging || "Fût étanche / Carton scellé"} {wasteBatch.packaging_condition ? `(${wasteBatch.packaging_condition})` : ""}
              </p>
            </div>

            {/* Provenance / Établissement Déposant */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#003B5C] dark:text-sky-400" /> Structure de Provenance (Déposant)
              </span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {sourceStructure}
              </p>
              {wasteBatch.source_type && (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  {wasteBatch.source_type}
                </span>
              )}
              {wasteBatch.depositor_name && (
                <p className="text-xs text-muted-foreground pt-0.5">
                  Remis par : <span className="font-medium text-slate-800 dark:text-slate-200">{wasteBatch.depositor_name}</span>
                  {wasteBatch.depositor_phone ? ` (${wasteBatch.depositor_phone})` : ""}
                </p>
              )}
            </div>

            {/* Référence et Date de Réception */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Prise en Charge Officielle
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {receptionDate}
              </p>
              <p className="text-[11px] font-mono text-muted-foreground">
                Réf : {receptionRef}
              </p>
            </div>

            {/* Emplacement de stockage */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Emplacement de Garde
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {wasteBatch.current_location || "Zone Quarantaine / Dépôt Central ABMed"}
              </p>
            </div>

            {/* Motif de mise au rebut */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Motif de Mise au Rebut / Destruction
              </span>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {motive}
              </p>
            </div>

            {/* Agent récepteur */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800 space-y-1 sm:col-span-2 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-[#003B5C] dark:text-sky-400 shrink-0" />
              <div className="text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Agent de Réception Habilité ABMed
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {wasteBatch.recipient_agent || (wasteBatch.creator ? `${wasteBatch.creator.first_name} ${wasteBatch.creator.last_name}` : "Agent Assermenté ABMed")}
                </span>
              </div>
            </div>

          </div>

          {/* SECTION QR CODE DE CONTRÔLE */}
          {qrCodeDataUrl && (
            <div className="border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center gap-6 bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-2xl">
              <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0">
                <img 
                  src={qrCodeDataUrl} 
                  alt="Code QR de vérification" 
                  className="w-28 h-28 object-contain" 
                />
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <QrCode className="w-4 h-4 text-[#003B5C]" />
                  <span>Sceau Numérique & Code de Contrôle</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ce code QR peut être scanné sur le terrain par les inspecteurs de l&apos;ABMed, les forces de sécurité et les pharmaciens pour attester de la régularité du lot.
                </p>
                <p className="text-[10px] text-muted-foreground/80 font-mono">
                  Horodatage de consultation : {verificationTimestamp}
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* AVERTISSEMENT LÉGAL ET SÉCURITÉ */}
      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-200/60 dark:border-amber-900/30 text-center sm:text-left flex flex-col sm:flex-row items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
          <strong>Avis de sécurité :</strong> Cette vue publique délivre exclusivement les informations légales et sanitaires du produit. Aucun identifiant utilisateur, session ou outil d&apos;administration n&apos;est accessible via cette vérification.
        </p>
      </div>

    </div>
  )
}
