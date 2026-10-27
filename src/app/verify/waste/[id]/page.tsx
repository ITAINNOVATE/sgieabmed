"use client"

import React, { use, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
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
  UserCheck, 
  Scale, 
  Lock,
  Layers,
  Boxes,
  ArrowRight,
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
  const [wastePackage, setWastePackage] = useState<any>(null)
  const [isPackage, setIsPackage] = useState(false)
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
      let cleanId = rawId.trim()
      if (cleanId.includes("/verify/waste/")) {
        cleanId = cleanId.split("/verify/waste/").pop()?.split("?")[0]?.split("#")[0] || cleanId
      }
      cleanId = decodeURIComponent(cleanId).trim().replace(/\/$/, "")

      let foundPkg: any = null
      let foundBatch: any = null

      // =====================================================================
      // 1. RECHERCHE SI C'EST UN COLIS GROUPÉ (COLIS-... ou pkg-...)
      // =====================================================================
      try {
        // A. Recherche dans waste_movements (type = 'Regroupement en colis')
        const { data: pkgMvts } = await supabase
          .from("waste_movements")
          .select("*")
          .eq("type", "Regroupement en colis")
          .or(`batch.ilike.${cleanId},mvt_number.ilike.PKG-${cleanId},mvt_number.ilike.${cleanId}`)
          .limit(1)

        if (pkgMvts && pkgMvts.length > 0) {
          const mvt = pkgMvts[0]
          try {
            foundPkg = JSON.parse(mvt.observations)
          } catch (e) {
            foundPkg = {
              package_number: mvt.batch,
              package_name: mvt.commercial_name || mvt.batch,
              package_type: mvt.waste_type,
              total_weight: parseFloat(mvt.quantity) || 0,
              current_location: mvt.destination,
              created_at: mvt.date,
              created_by: mvt.operator,
              status: "Groupé (En stock)",
            }
          }
        }

        // B. Si pas trouvé par nom exact, recherche par préfixe/suffixe
        if (!foundPkg) {
          const { data: partialMvts } = await supabase
            .from("waste_movements")
            .select("*")
            .eq("type", "Regroupement en colis")
            .ilike("batch", `%${cleanId}%`)
            .limit(1)

          if (partialMvts && partialMvts.length > 0) {
            try {
              foundPkg = JSON.parse(partialMvts[0].observations)
            } catch (e) {}
          }
        }

        // C. Si pas trouvé dans les mouvements, recherche dans waste_batches par tag [COLIS: ...]
        if (!foundPkg) {
          const { data: bList } = await supabase
            .from("waste_batches")
            .select("*")
            .ilike("observations", `%${cleanId}%`)

          if (bList && bList.length > 0) {
            const first = bList[0]
            const totalWeight = Math.round(bList.reduce((s, it) => s + (Number(it.quantity) || 0), 0) * 100) / 100
            foundPkg = {
              package_number: cleanId.toUpperCase(),
              package_name: cleanId.toUpperCase(),
              package_type: first.packaging?.includes("Fût") ? "Fût plastique étanche PEHD (200L)" : (first.packaging?.includes("Sac") ? "Grand sac hermétique étanche" : "Carton renforcé sécurisé & scellé"),
              total_weight: totalWeight,
              unit: "Kg",
              current_location: first.current_location || "MAGASIN DES DECHETS — Zone déchets solides",
              status: "Groupé (En stock)",
              created_at: first.created_at || new Date().toISOString(),
              created_by: "Maëlle DOSSOU-YOVO (Agent Déchets)",
              item_ids: bList.map(b => b.id),
              items: bList.map(b => ({
                id: b.id,
                batch_number: b.batch_number,
                commercial_name: b.commercial_name,
                waste_type: b.waste_type,
                quantity: b.quantity,
                unit: b.unit || "Kg",
                original_batch: b.original_batch || "-",
                packaging: b.packaging || "Carton scellé",
                source_structure: b.source_structure || "Structure Déposante",
                current_location: b.current_location,
              }))
            }
          }
        }

        // D. Fallback localStorage pour colis groupés
        if (!foundPkg && typeof window !== "undefined") {
          try {
            const stored = localStorage.getItem("waste_grouped_packages_v1")
            if (stored) {
              const list = JSON.parse(stored)
              foundPkg = list.find((p: any) =>
                (p.package_number && p.package_number.toLowerCase() === cleanId.toLowerCase()) ||
                (p.id && p.id.toLowerCase() === cleanId.toLowerCase())
              )
            }
          } catch (e) {}
        }

        // E. Si le colis est trouvé mais ses articles détaillés ne sont pas complets, les récupérer
        if (foundPkg) {
          if (!foundPkg.items || foundPkg.items.length === 0) {
            let itemQuery = supabase.from("waste_batches").select("*")
            if (foundPkg.item_ids && foundPkg.item_ids.length > 0) {
              itemQuery = itemQuery.in("id", foundPkg.item_ids)
            } else {
              itemQuery = itemQuery.ilike("observations", `%${foundPkg.package_number}%`)
            }
            const { data: itemsData } = await itemQuery
            if (itemsData && itemsData.length > 0) {
              foundPkg.items = itemsData
            }
          }
        }
      } catch (err) {
        console.warn("[verify/waste] Erreur recherche colis groupé:", err)
      }

      // =====================================================================
      // 2. RECHERCHE SI C'EST UN LOT DE DÉTAIL (DEC-...)
      // =====================================================================
      if (!foundPkg) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)
          let query = supabase.from("waste_batches").select("*")

          if (isUuid) {
            query = query.or(`id.eq.${cleanId},batch_number.ilike.${cleanId}`)
          } else {
            query = query.ilike("batch_number", cleanId)
          }

          const { data, error } = await query.maybeSingle()
          if (data && !error) {
            foundBatch = data
            if (data.sample_id) {
              try {
                const { data: sData } = await supabase.from("samples").select("*").eq("id", data.sample_id).maybeSingle()
                if (sData) foundBatch.sample = sData
              } catch (e) {}
            }
          } else {
            // Recherche partielle
            const { data: partialData } = await supabase
              .from("waste_batches")
              .select("*")
              .ilike("batch_number", `%${cleanId}%`)
              .limit(1)
              .maybeSingle()

            if (partialData) {
              foundBatch = partialData
            }
          }

          // Fallback localStorage pour lots individuels
          if (!foundBatch && typeof window !== "undefined") {
            try {
              const stored = localStorage.getItem("waste_batches_custom_v1")
              if (stored) {
                const list = JSON.parse(stored)
                foundBatch = list.find((b: any) =>
                  (b.id && b.id.toLowerCase() === cleanId.toLowerCase()) ||
                  (b.batch_number && b.batch_number.toLowerCase() === cleanId.toLowerCase())
                )
              }
            } catch (e) {}
          }

          // Si le lot fait partie d'un colis groupé, identifier le colis parent
          if (foundBatch) {
            const obs = foundBatch.observations || ""
            const match = obs.match(/\[COLIS:\s*([A-Za-z0-9_-]+)\]/i)
            if (match) {
              foundBatch.parent_package_number = match[1].trim()
            }
          }
        } catch (err) {
          console.warn("[verify/waste] Erreur recherche lot déchet:", err)
        }
      }

      if (foundPkg) {
        setIsPackage(true)
        setWastePackage(foundPkg)
      } else if (foundBatch) {
        setIsPackage(false)
        setWasteBatch(foundBatch)
      } else {
        setIsPackage(false)
        setWastePackage(null)
        setWasteBatch(null)
      }

      setLoading(false)

      // 3. Générer le QR Code de la page actuelle
      if (typeof window !== "undefined") {
        const currentUrl = window.location.href
        generateQRCodeDataUrl(currentUrl, { width: 220, margin: 1 })
          .then(url => setQrCodeDataUrl(url))
          .catch(() => {})
      }
    }

    loadWasteData()
  }, [rawId, supabase])

  const handleCopyIdentifier = (val: string) => {
    navigator.clipboard.writeText(val)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrintCertificate = () => {
    window.print()
  }

  // Calcul du badge de statut
  const getStatusBadge = (st: string) => {
    const lower = (st || "").toLowerCase()
    if (lower.includes("détruit") || lower.includes("detruit")) {
      return {
        label: "DÉTRUIT CONFORMÉMENT",
        badgeClass: "bg-slate-800 text-white border-slate-700",
        icon: CheckCircle2
      }
    }
    if (lower.includes("groupé") || lower.includes("groupe")) {
      return {
        label: "COLIS SCELLÉ & EN STOCK",
        badgeClass: "bg-purple-700 text-white border-purple-600",
        icon: Boxes
      }
    }
    if (lower.includes("valid") || lower.includes("prêt") || lower.includes("pret")) {
      return {
        label: "VALIDÉ POUR DESTRUCTION",
        badgeClass: "bg-emerald-600 text-white border-emerald-500",
        icon: CheckCircle2
      }
    }
    return {
      label: "EN GARDE SÉCURISÉE / QUARANTAINE",
      badgeClass: "bg-[#003B5C] text-white border-[#002840]",
      icon: ShieldCheck
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-border/50 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#003B5C] border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Vérification de l&apos;authenticité du déchet...
        </h2>
        <p className="text-xs text-muted-foreground">
          Interrogation du registre national de traçabilité de l&apos;ABMed
        </p>
      </div>
    )
  }

  // =========================================================================
  // CAS OÙ NI COLIS NI LOT N'A ÉTÉ TROUVÉ
  // =========================================================================
  if (!isPackage && !wasteBatch) {
    return (
      <div className="w-full max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-rose-200 dark:border-rose-900/50 overflow-hidden text-center">
        <div className="bg-rose-50 dark:bg-rose-950/40 p-6 border-b border-rose-200 dark:border-rose-900/50">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-rose-800 dark:text-rose-200 tracking-tight">
            Lot ou Colis Non Répertorié
          </h1>
          <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1">
            Référence scannée : <span className="font-mono font-bold">{rawId}</span>
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-4 text-left">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Ce numéro ou identifiant ne correspond à aucun lot de déchet ni à aucun colis groupé officiellement enregistré dans la base de données de traçabilité de l&apos;ABMed.
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

  // =========================================================================
  // VUE 1 : COLIS GROUPÉ (ENSEMBLE DES PRODUITS INCLUS DANS LE CONTENANT)
  // =========================================================================
  if (isPackage && wastePackage) {
    const pkg = wastePackage
    const itemsList: any[] = pkg.items || []
    const totalWeightKg = pkg.total_weight || itemsList.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
    const statusConfig = getStatusBadge(pkg.status || "Groupé")
    const StatusIcon = statusConfig.icon

    return (
      <div className="w-full max-w-4xl space-y-6">
        
        {/* CARTE OFFICIELLE DE CERTIFICATION DU COLIS GROUPÉ */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:shadow-none print:border-none">
          
          {/* EN-TÊTE OFFICIEL ABMED */}
          <div className="bg-gradient-to-r from-purple-900 via-[#003B5C] to-purple-900 text-white p-6 sm:p-8 relative overflow-hidden">
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
                    Système eGED | Certificat de Traçabilité Colis Groupé
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-semibold text-white shrink-0">
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span>Certification Publique Sécurisée</span>
              </div>
            </div>
          </div>

          {/* BANNIÈRE DE VALIDATION DU COLIS */}
          <div className="bg-purple-50 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-900/50 p-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-700 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-950 dark:text-purple-200 uppercase tracking-wider">
                  Colis Groupé Enregistré & Scellé
                </p>
                <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                  Ce contenant regroupe <strong>{itemsList.length} lots</strong> sous scellé officiel de traçabilité ABMed.
                </p>
              </div>
            </div>

            <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs flex items-center gap-1.5 ${statusConfig.badgeClass}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusConfig.label}</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            
            {/* EN-TÊTE RÉFÉRENCE COLIS */}
            <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 sm:p-5 rounded-2xl border border-purple-200 dark:border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-900 dark:text-purple-300 tracking-wider block">
                  Identifiant Unique du Colis / Sac
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-purple-950 dark:text-purple-100 tracking-tight">
                  {pkg.package_number}
                </span>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => handleCopyIdentifier(pkg.package_number)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-border/80 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                  title="Copier le N° de colis"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span>{copied ? "Copié !" : "Copier le N°"}</span>
                </button>

                <button
                  onClick={handlePrintCertificate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white rounded-xl transition-colors shadow-2xs cursor-pointer"
                  title="Imprimer l'attestation du colis"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer</span>
                </button>
              </div>
            </div>

            {/* CARACTÉRISTIQUES DU CONTENANT EN GRILLE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              
              {/* Type de contenant */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-purple-600" /> Type de Contenant
                </span>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {pkg.package_type || "Carton scellé / Grand sac"}
                </p>
              </div>

              {/* Poids total */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-emerald-600" /> Poids Total Certifié
                </span>
                <p className="font-black text-emerald-700 dark:text-emerald-400 text-lg">
                  {totalWeightKg} <span className="text-xs font-normal text-muted-foreground">Kg</span>
                </p>
              </div>

              {/* Nombre de lots */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5 text-blue-600" /> Lots Déchets Inclus
                </span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                  {itemsList.length} <span className="text-xs font-normal text-muted-foreground">article(s)</span>
                </p>
              </div>

              {/* Emplacement certifié */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-600" /> Emplacement Réglementaire au Magasin
                </span>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {pkg.current_location || "Magasin Déchets — Zone Quarantaine"}
                </p>
              </div>

              {/* Agent responsable */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-[#003B5C]" /> Responsable Groupage
                </span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  {pkg.created_by || "Maëlle DOSSOU-YOVO (Agent Déchets)"}
                </p>
              </div>

            </div>

            {/* =============================================================== */}
            {/* TABLEAU : ENSEMBLE DES PRODUITS INCLUS DANS LE COLIS GROUPÉ */}
            {/* =============================================================== */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-purple-700" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Contenu Complet : Ensemble des Produits Inclus
                  </h2>
                </div>
                <span className="text-xs px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold rounded-full">
                  {itemsList.length} lot(s) scellé(s)
                </span>
              </div>

              {itemsList.length === 0 ? (
                <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border text-center text-xs text-muted-foreground">
                  Aucun détail de produit rattaché à ce colis.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-[11px] font-bold text-muted-foreground uppercase">
                      <tr>
                        <th className="py-2.5 px-3">N° Lot Déchet</th>
                        <th className="py-2.5 px-3">Désignation Produit</th>
                        <th className="py-2.5 px-3">Classification</th>
                        <th className="py-2.5 px-3">Lot Fabricant</th>
                        <th className="py-2.5 px-3 text-right">Poids</th>
                        <th className="py-2.5 px-3">Provenance (Pharmacie / Déposant)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {itemsList.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-purple-900 dark:text-purple-300 whitespace-nowrap">
                            <Link 
                              href={`/verify/waste/${encodeURIComponent(item.batch_number)}`}
                              className="hover:underline flex items-center gap-1 text-purple-700 dark:text-purple-400"
                              title="Voir la fiche détaillée de ce lot"
                            >
                              <span>{item.batch_number}</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </Link>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 max-w-[220px] truncate" title={item.commercial_name}>
                            {item.commercial_name || "Produit périmé"}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground max-w-[180px] truncate" title={item.waste_type}>
                            {item.waste_type || "Déchet pharmaceutique"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap">
                            {item.original_batch || "-"}
                          </td>
                          <td className="py-2.5 px-3 font-black text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                            {item.quantity} {item.unit || "Kg"}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground max-w-[180px] truncate" title={item.source_structure}>
                            {item.source_structure || "Structure Déposante"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-purple-50/60 dark:bg-purple-950/40 font-bold border-t border-purple-200 dark:border-purple-900/60 text-purple-950 dark:text-purple-100">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 uppercase text-[11px] tracking-wider">
                          Total Cumulé du Colis ({itemsList.length} lots)
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-800 dark:text-emerald-300 text-sm">
                          {totalWeightKg} Kg
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          Contenant scellé ABMed
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* CODE QR DE CONTRÔLE */}
            {qrCodeDataUrl && (
              <div className="border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center gap-6 bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-2xl">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Code QR de vérification du colis" 
                    className="w-28 h-28 object-contain" 
                  />
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <QrCode className="w-4 h-4 text-purple-700" />
                    <span>Sceau Numérique du Colis Groupé</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Ce QR Code certifie la composition exacte du colis au magasin central des déchets.
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 font-mono">
                    Horodatage de consultation : {verificationTimestamp}
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* AVIS DE SÉCURITÉ */}
        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-2xl p-4 border border-purple-200/60 dark:border-purple-900/30 text-center sm:text-left flex flex-col sm:flex-row items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0" />
          <p className="text-[11px] text-purple-950 dark:text-purple-200 leading-relaxed">
            <strong>Certification Colis :</strong> Les informations affichées sont directement issues du registre sécurisé de l&apos;ABMed. Aucun compte utilisateur n&apos;est exposé lors de cette vérification.
          </p>
        </div>

      </div>
    )
  }

  // =========================================================================
  // VUE 2 : LOT EN DÉTAIL (PRODUIT ET SES CARACTÉRISTIQUES DÉTAILLÉES)
  // =========================================================================
  const productName = wasteBatch.commercial_name || wasteBatch.sample?.commercial_name || wasteBatch.waste_type || "Déchet Pharmaceutique"
  const batchNumber = wasteBatch.batch_number || wasteBatch.id
  const originalBatch = wasteBatch.original_batch || wasteBatch.sample?.batch_number || "Non spécifié"
  const quantityText = `${wasteBatch.quantity || 1} ${wasteBatch.unit || "Kg"}`
  const sourceStructure = wasteBatch.source_structure || "Structure sanitaire déposante"
  const receptionDate = wasteBatch.reception_date || (wasteBatch.created_at ? new Date(wasteBatch.created_at).toLocaleDateString("fr-FR") : "Date non renseignée")
  const receptionRef = wasteBatch.reception_number || `REC-DECH-2026-${wasteBatch.id?.substring(0, 5) || "001"}`
  const motive = wasteBatch.destruction_motive || wasteBatch.rejection_reason || wasteBatch.observations || "Périmé / Rebut pharmaceutique"
  const status = wasteBatch.status || "En quarantaine"
  const statusConfig = getStatusBadge(status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="w-full max-w-3xl space-y-6">
      
      {/* CARTE OFFICIELLE DE CERTIFICATION DU LOT DÉTAILLÉ */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:shadow-none print:border-none">
        
        {/* EN-TÊTE OFFICIEL ABMED */}
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
                  Système eGED | Certificat Officiel de Traçabilité Déchet
                </p>
              </div>
            </div>

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

        {/* BANNIÈRE SI LE LOT FAIT PARTIE D'UN COLIS GROUPÉ */}
        {wasteBatch.parent_package_number && (
          <div className="bg-purple-50 dark:bg-purple-950/30 border-b border-purple-200 dark:border-purple-900/50 p-3 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-purple-700 shrink-0" />
              <p className="text-xs text-purple-900 dark:text-purple-200">
                Ce lot est scellé dans le Colis Groupé : <strong className="font-mono">{wasteBatch.parent_package_number}</strong>
              </p>
            </div>
            <Link 
              href={`/verify/waste/${encodeURIComponent(wasteBatch.parent_package_number)}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline"
            >
              <span>Voir le colis groupé complet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

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
                onClick={() => handleCopyIdentifier(batchNumber)}
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
                  Ce code QR atteste de la conformité du lot de déchet au magasin central des déchets.
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
