"use client"

import React, { use, useEffect, useState } from "react"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"
import { generateQRCodeDataUrl } from "@/utils/qrCode"
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
  Scale, 
  Lock
} from "lucide-react"

export default function PublicSampleVerifyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const rawId = decodeURIComponent(resolvedParams.id || "")
  
  const [sample, setSample] = useState<any>(null)
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

    async function loadSampleData() {
      setLoading(true)
      let found: any = null
      const cleanId = rawId.trim().replace(/\/$/, "")

      // 1. Recherche prioritaire dans Supabase (par UUID ou par sample_number)
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)
        
        let query = supabase.from("samples").select("*")

        if (isUuid) {
          query = query.or(`id.eq.${cleanId},sample_number.ilike.${cleanId}`)
        } else {
          query = query.ilike("sample_number", cleanId)
        }

        const { data, error } = await query.maybeSingle()
        if (data && !error) {
          found = data
        } else {
          const { data: partialData } = await supabase
            .from("samples")
            .select("*")
            .ilike("sample_number", `%${cleanId}%`)
            .limit(1)
            .maybeSingle()
          if (partialData) found = partialData
        }
      } catch (err) {
        console.warn("Échec requête distante Supabase:", err)
      }

      setSample(found)
      setLoading(false)

      // 2. Générer le QR Code de vérification
      if (typeof window !== "undefined") {
        const currentUrl = window.location.href
        generateQRCodeDataUrl(currentUrl, { width: 200, margin: 1 })
          .then(url => setQrCodeDataUrl(url))
          .catch(() => {})
      }
    }

    loadSampleData()
  }, [rawId, supabase])

  const handleCopyIdentifier = () => {
    if (!sample) return
    const idToCopy = sample.sample_number || sample.id
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
          Vérification de l&apos;échantillon pharmaceutique...
        </h2>
        <p className="text-xs text-muted-foreground">
          Interrogation du registre officiel de l&apos;ABMed
        </p>
      </div>
    )
  }

  if (!sample) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-rose-200 dark:border-rose-900/50 overflow-hidden text-center">
        <div className="bg-rose-50 dark:bg-rose-950/40 p-6 border-b border-rose-200 dark:border-rose-900/50">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-rose-800 dark:text-rose-200 tracking-tight">
            Échantillon Non Répertorié
          </h1>
          <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1">
            Référence scannée : <span className="font-mono font-bold">{rawId}</span>
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-4 text-left">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Ce numéro d&apos;échantillon ne correspond à aucun produit pharmaceutique validé dans la matériothèque et les registres de l&apos;ABMed.
          </p>
          <div className="border-t border-border/50 pt-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Contact ABMed :</p>
            <p>Laboratoire National de Contrôle de Qualité et Matériothèque</p>
            <p>Cotonou, République du Bénin | Tél : (+229) 21 30 00 00</p>
          </div>
        </div>
      </div>
    )
  }

  const sampleNumber = sample.sample_number || sample.id
  const commercialName = sample.commercial_name || "Produit Pharmaceutique"
  const dci = sample.dci || "Non renseignée"
  const dosage = sample.dosage || ""
  const form = sample.pharmaceutical_form || sample.presentation || sample.form || ""
  const batchNumber = sample.batch_number || "Non spécifié"
  const expiryDate = sample.expiry_date ? (sample.expiry_date.includes("T") ? new Date(sample.expiry_date).toLocaleDateString("fr-FR") : sample.expiry_date) : "Non renseignée"
  const quantityText = `${sample.quantity || 1} ${sample.unit || "Unités"}`
  const manufacturer = sample.manufacturer || sample.manufacturer_name || "Fabricant non spécifié"
  const location = sample.current_location || "Laboratoire ABMed / Matériothèque"
  const status = sample.status || "Disponible"

  return (
    <div className="w-full max-w-3xl space-y-6">
      
      {/* CARTE OFFICIELLE DE CERTIFICATION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:shadow-none print:border-none">
        
        {/* EN-TÊTE OFFICIEL ABMED */}
        <div className="bg-gradient-to-r from-[#003B5C] via-[#004b75] to-[#003B5C] text-white p-6 sm:p-8 relative overflow-hidden">
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
                  Système eGED | Fiche d&apos;Échantillon Pharmaceutique
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-semibold text-white shrink-0">
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>Consultation Publique Sécurisée</span>
            </div>
          </div>
        </div>

        {/* BANNIÈRE DE VALIDATION */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 p-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                Échantillon Authentifié & Conforme
              </p>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                Enregistré dans le système national de matériothèque de l&apos;ABMed.
              </p>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs bg-[#003B5C] text-white border-[#002840] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{status.toUpperCase()}</span>
          </div>
        </div>

        {/* CORPS DE LA FICHE */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* IDENTIFIANT ÉCHANTILLON */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                N° d&apos;Échantillon
              </span>
              <span className="text-lg sm:text-2xl font-mono font-black text-[#003B5C] dark:text-sky-400 tracking-tight">
                {sampleNumber}
              </span>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleCopyIdentifier}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-border/80 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                <span>{copied ? "Copié !" : "Copier le N°"}</span>
              </button>

              <button
                onClick={handlePrintCertificate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#003B5C] text-white rounded-xl hover:bg-[#002c45] transition-colors shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>
            </div>
          </div>

          {/* DÉTAILS DU MÉDICAMENT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-[#003B5C] dark:text-sky-400" /> Nom Commercial
              </span>
              <p className="text-base font-black text-slate-900 dark:text-slate-100">
                {commercialName}
              </p>
              {dci && (
                <p className="text-xs text-muted-foreground">
                  DCI : <span className="font-semibold text-slate-800 dark:text-slate-200">{dci}</span>
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Dosage & Forme
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {[dosage, form].filter(Boolean).join(" - ") || "Forme standard"}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                N° de Lot Fabricant
              </span>
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {batchNumber}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Date de Péremption
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {expiryDate}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-muted-foreground" /> Quantité Détenue
              </span>
              <p className="font-bold text-[#008751] text-base">
                {quantityText}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#003B5C] dark:text-sky-400" /> Fabricant / Laboratoire
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {manufacturer}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Emplacement en Matériothèque
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {location}
              </p>
            </div>

          </div>

          {/* SECTION QR CODE */}
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
                  <span>Sceau Numérique ABMed</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Scannable par toute autorité sanitaire et pharmacovigilance pour authentification officielle.
                </p>
                <p className="text-[10px] text-muted-foreground/80 font-mono">
                  Horodatage : {verificationTimestamp}
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-200/60 dark:border-amber-900/30 text-center sm:text-left flex flex-col sm:flex-row items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
          <strong>Avis de sécurité :</strong> Consultation en lecture seule. Les données affichées sont certifiées conformes aux enregistrements de l&apos;ABMed.
        </p>
      </div>

    </div>
  )
}
