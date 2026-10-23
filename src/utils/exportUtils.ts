"use client"

import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// 1. Export CSV
export function exportToCSV(data: any[], headers: string[], filename: string) {
  const csvRows = []
  
  // Add headers
  csvRows.push(headers.join(","))
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : ""
      // Escape double quotes
      const escaped = val.replace(/"/g, '""')
      return `"${escaped}"`
    })
    csvRows.push(values.join(","))
  }
  
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n")
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 2. Export Excel
export function exportToExcel(data: any[], headers: string[], filename: string) {
  // Format data for sheet
  const formattedData = data.map(item => {
    const obj: Record<string, any> = {}
    headers.forEach(h => {
      obj[h] = item[h]
    })
    return obj
  })

  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Données")
  
  // Generate buffer and trigger download
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.xlsx`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 3. Export PDF (Generic Table)
export function exportToPDF(title: string, headers: string[], rows: any[][], filename: string) {
  const doc = new jsPDF()
  
  // ABMed Header branding
  doc.setFontSize(16)
  doc.setTextColor(30, 41, 59) // slate-800
  doc.text("ABMed - SGIE", 14, 20)
  
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(`Généré le : ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, 14, 26)
  
  doc.setDrawColor(226, 232, 240) // border-slate-200
  doc.line(14, 30, 196, 30)
  
  // Title
  doc.setFontSize(14)
  doc.setTextColor(79, 70, 229) // indigo-600
  doc.text(title, 14, 40)
  
  autoTable(doc, {
    startY: 46,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    margin: { left: 14, right: 14 }
  })
  
  doc.save(`${filename}.pdf`)
}

// 4. Export Reception Voucher PDF (Attestation & Bon de Réception d'Échantillons)
export function exportReceptionVoucherPDF(reception: any, samples: any[]) {
  const doc = new jsPDF()
  const nowStr = new Date().toLocaleDateString("fr-FR")

  // Official ABMed Green Header Banner
  doc.setFillColor(27, 92, 46) // #1B5C2E ABMed Green
  doc.rect(0, 0, 210, 36, "F")

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text("ATTESTATION & BON DE RÉCEPTION D'ÉCHANTILLONS", 14, 15)

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(220, 252, 231)
  doc.text("AUTORITÉ BÉNINOISE DU MÉDICAMENT ET DES AUTRES PRODUITS DE SANTÉ (ABMed)", 14, 22)
  doc.text("Système de Gestion Intégrée des Échantillons (SGIE) — Certificat Officiel de Réception", 14, 28)

  // Reference Badge in Header
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(145, 9, 51, 18, 2, 2, "F")
  doc.setTextColor(27, 92, 46)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.text("N° DE RÉCEPTION", 170.5, 15, { align: "center" })
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(reception.rec_number || "REC-N/A", 170.5, 22, { align: "center" })

  // Two side-by-side summary boxes
  // Box 1: Structure / Demandeur (Light Slate tint + Dark border)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.35)
  doc.roundedRect(14, 43, 88, 42, 2, 2, "FD")

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(27, 92, 46)
  doc.text("1. DEMANDEUR / STRUCTURE DÉPOSANTE", 18, 50)
  doc.setDrawColor(203, 213, 225)
  doc.line(18, 52, 98, 52)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text(`Demandeur : ${(reception.supplier || "N/A").substring(0, 34)}`, 18, 58)
  doc.text(`Fabricant : ${(reception.manufacturer || "N/A").substring(0, 34)}`, 18, 64)
  doc.text(`Pays / Transport : ${reception.country || "Bénin"} (${reception.transport_mode || "Standard"})`, 18, 70)
  doc.text(`Type demande : ${reception.type_reception || "Enregistrement / Contrôle"}`, 18, 76)
  doc.text(`Réf. Courrier : ${reception.ref_document || "N/A"}`, 18, 82)

  // Box 2: Réception & Conformité ABMed (Light Emerald tint + Green border)
  doc.setFillColor(240, 253, 244)
  doc.setDrawColor(27, 92, 46)
  doc.setLineWidth(0.35)
  doc.roundedRect(108, 43, 88, 42, 2, 2, "FD")

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(27, 92, 46)
  doc.text("2. PRISE EN CHARGE & VALIDATION ABMed", 112, 50)
  doc.setDrawColor(187, 247, 208)
  doc.line(112, 52, 192, 52)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text(`Date & Heure : ${reception.date_reception || nowStr} ${reception.time_reception || ""}`, 112, 58)
  doc.text(`Agent Réception : ${(reception.inspector || "Agent ABMed").substring(0, 30)}`, 112, 64)
  doc.text(`Statut Dossier : ${reception.status || "Validée / Finalisée"}`, 112, 70)
  doc.text(`Conformité : ${reception.check_conform !== false ? "CONFORME" : "NON CONFORME / RÉSERVES"}`, 112, 76)
  doc.text(`Décision : ${reception.decision || "Accepté pour analyse / archivage"}`, 112, 82)

  // Section 3: Contrôle de Conformité Physique
  doc.setFontSize(9.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text("3. CONTRÔLE DE CONFORMITÉ À LA RÉCEPTION", 14, 94)

  const getConformSymbol = (val: boolean) => (val !== false ? "[X] Conforme" : "[ ] Non conforme")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85)
  doc.text(`Emballage : ${getConformSymbol(reception.check_packaging)}`, 14, 100)
  doc.text(`Boîtes/Colis : ${getConformSymbol(reception.check_boxes)}`, 80, 100)
  doc.text(`Scellés : ${getConformSymbol(reception.check_seals)}`, 145, 100)
  doc.text(`Quantité reçue : ${getConformSymbol(reception.check_qty)}`, 14, 106)
  doc.text(`Documents joints : ${getConformSymbol(reception.check_docs)}`, 80, 106)
  doc.text(`Intégrité physique : ${getConformSymbol(reception.check_damage)}`, 145, 106)

  // Section 4: Table of received samples
  doc.setFontSize(9.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text("4. DÉTAIL DES PRODUITS ET ÉCHANTILLONS RÉCEPTIONNÉS", 14, 116)

  const safeSamples = Array.isArray(samples) && samples.length > 0 ? samples : [
    {
      commercial_name: reception.commercial_name || "Échantillon pharmaceutique",
      dci: reception.dci || "Contrôle Qualité ABMed",
      category: reception.category || "Médicament",
      batch: reception.batch_number || "LOT-STD",
      exp_date: reception.expiry_date || "-",
      qty: typeof reception.samples === "number" ? reception.samples : 1,
      unit: "Boîtes"
    }
  ]

  const tableHeaders = ["#", "Désignation Commerciale / DCI", "Catégorie / Forme", "N° de Lot", "Péremption", "Quantité"]
  const tableRows = safeSamples.map((s, idx) => [
    String(idx + 1),
    `${s.commercial_name || "Échantillon"}${s.dci ? ` (${s.dci})` : ""}`,
    `${s.category || "Médicament"}${s.dosage ? ` - ${s.dosage}` : ""}`,
    s.batch || s.batch_number || "N/A",
    s.exp_date || s.expiry_date || "N/A",
    `${s.qty || s.quantity || 1} ${s.unit || "Boîtes"}`
  ])

  autoTable(doc, {
    startY: 120,
    head: [tableHeaders],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [27, 92, 46], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2.5 },
    margin: { left: 14, right: 14 }
  })

  let finalY = (doc as any).lastAutoTable.finalY + 8

  if (reception.anomalies || reception.observations) {
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(15, 23, 42)
    doc.text("Observations / Réserves :", 14, finalY)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text(String(reception.anomalies || reception.observations), 55, finalY)
    finalY += 8
  }

  // Legal attestation paragraph
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(14, finalY, 182, 16, 1.5, 1.5, "FD")
  doc.setFontSize(8)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(30, 41, 59)
  doc.text(
    "La présente attestation certifie que les échantillons ci-dessus ont été réceptionnés et enregistrés par l'ABMed",
    18,
    finalY + 6
  )
  doc.text(
    "dans le Système de Gestion Intégrée des Échantillons (SGIE) conformément aux procédures réglementaires en vigueur.",
    18,
    finalY + 11.5
  )

  // Signatures block
  const sigY = finalY + 24
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)

  // Left signature: Depositing party
  doc.rect(14, sigY, 85, 28)
  doc.text("LE DÉPOSANT / REPRÉSENTANT", 56.5, sigY + 6, { align: "center" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(reception.supplier || "Signature précédée de la mention Lu et Approuvé", 56.5, sigY + 11, { align: "center" })

  // Right signature: ABMed Agent / Validator
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.rect(111, sigY, 85, 28)
  doc.text("POUR L'ABMed (RÉCEPTION & VALIDATION)", 153.5, sigY + 6, { align: "center" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(reception.validator_name || reception.inspector || "Cachet et Signature de l'Agent", 153.5, sigY + 11, { align: "center" })

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text(
    `Document généré électroniquement via ABMed-SGIE le ${nowStr} — Réf : ${reception.rec_number || "N/A"}`,
    105,
    287,
    { align: "center" }
  )

  doc.save(`Attestation_Reception_${reception.rec_number || "ABMed"}.pdf`)
}

// 5. Export Waste Reception Slip & Attestation PDF (Bordereau / Attestation de Réception de Déchets)
export function exportWasteReceptionSlipPDF(slipData: {
  reception_number: string
  reception_date: string
  reception_time?: string
  delivery_slip_ref?: string
  recipient_agent?: string
  source_structure: string
  source_type?: string
  city?: string
  depositor_name?: string
  depositor_phone?: string
  depositor_id_card?: string
  general_observations?: string
  items: Array<{
    batch_number: string
    waste_type: string
    commercial_name?: string
    original_batch?: string
    quantity: number
    unit: string
    packaging?: string
    packaging_type?: string
    packages_count?: number
    location?: string
    storage_location?: string
    observations?: string
    rejection_reason?: string
  }>
}) {
  const doc = new jsPDF()

  // En-tête officiel ABMed (Bandeau vert institutionnel)
  doc.setFillColor(27, 92, 46) // Vert ABMed #1B5C2E
  doc.rect(0, 0, 210, 36, "F")

  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text("RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ", 14, 10)
  
  doc.setFontSize(15)
  doc.setFont("helvetica", "bold")
  doc.text("ATTESTATION DE RÉCEPTION DE DÉCHETS PHARMACEUTIQUES", 14, 20)
  
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("AGENCE BÉNINOISE DU MÉDICAMENT (ABMed) — GESTION DES DÉCHETS (PSQIF)", 14, 28)

  // N° Bordereau & Date
  doc.setFontSize(10)
  doc.setTextColor(27, 92, 46)
  doc.setFont("helvetica", "bold")
  doc.text(`RÉCÉPISSÉ N° : ${slipData.reception_number || 'REC-DECH-2026-0001'}`, 14, 46)

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.setFont("helvetica", "normal")
  doc.text(`Date & heure : ${slipData.reception_date || new Date().toLocaleDateString('fr-FR')} ${slipData.reception_time || ''}`, 130, 46)

  // Section 1 : Structure Apportrice (Cadre gauche)
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 52, 88, 48, 2, 2, "FD")

  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.setFont("helvetica", "bold")
  doc.text("1. STRUCTURE / ÉTABLISSEMENT DÉPOSANT", 18, 59)
  doc.line(18, 61, 98, 61)

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  doc.text(`Établissement : ${slipData.source_structure || 'Non précisé'}`, 18, 68)
  doc.text(`Type : ${slipData.source_type || 'Officine / Établissement'}`, 18, 74)
  doc.text(`Localité : ${slipData.city || 'Cotonou / Bénin'}`, 18, 80)
  doc.text(`Déposant : ${slipData.depositor_name || 'Non précisé'}`, 18, 86)
  doc.text(`Contact : ${slipData.depositor_phone || 'N/A'} (ID: ${slipData.depositor_id_card || 'N/A'})`, 18, 92)

  // Section 2 : Réception ABMed & Transport (Cadre droit)
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(108, 52, 88, 48, 2, 2, "FD")

  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.setFont("helvetica", "bold")
  doc.text("2. PRISE EN CHARGE ABMed", 112, 59)
  doc.line(112, 61, 192, 61)

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  doc.text(`Agent récepteur : ${slipData.recipient_agent || 'Marie ADANDE'}`, 112, 68)
  doc.text(`Service : Direction de la Gestion des Déchets`, 112, 74)
  doc.text(`Bordereau apport : ${slipData.delivery_slip_ref || 'Remise directe sur site'}`, 112, 80)
  doc.text(`Statut initial : Déclaré / En attente de destruction`, 112, 86)
  doc.text(`Nombre de lots reçus : ${slipData.items?.length || 1} lot(s)`, 112, 92)

  // Tableau des Déchets Réceptionnés
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text("3. INVENTAIRE DES PRODUITS & DÉCHETS REÇUS", 14, 110)

  const headers = [
    "N° Lot Déchet",
    "Classification / Désignation",
    "Conditionnement",
    "Quantité / Poids",
    "Zone Stockage"
  ]

  const rows = (slipData.items || []).map((item) => [
    item.batch_number || 'N/A',
    `${item.waste_type || 'Déchets pharmaceutiques'}${item.commercial_name ? `\n(${item.commercial_name})` : ''}`,
    item.packaging || 'Fûts / Cartons fermés',
    `${item.quantity} ${item.unit || 'Kg'}`,
    item.location || 'Zone Quarantaine'
  ])

  if (slipData.items && slipData.items.length > 1) {
    const totalQty = slipData.items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
    rows.push([
      "TOTAL DÉPÔT",
      `${slipData.items.length} lots de déchets apportés`,
      "-",
      `${totalQty.toFixed(2)} (Total)`,
      "-"
    ])
  }

  autoTable(doc, {
    startY: 114,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [27, 92, 46], textColor: [255, 255, 255], fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 60 },
      2: { cellWidth: 35 },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 24 }
    },
    margin: { left: 14, right: 14 }
  })

  const currentY = (doc as any).lastAutoTable.finalY + 8

  // Texte officiel d'attestation de décharge
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(14, currentY, 182, 22, 2, 2, "F")
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(51, 65, 85)
  const attestationText = 
    "ATTESTATION ET DÉCHARGE RÉGLEMENTAIRE : L'Agence Béninoise du Médicament (ABMed) atteste par la présente avoir réceptionné " +
    "ce jour les produits pharmaceutiques avariés, périmés ou non conformes ci-dessus mentionnés aux fins de neutralisation et destruction sécurisée. " +
    "La structure déposante est déchargée de la détention physique de ces produits sous réserve de l'exactitude des déclarations fournies."
  doc.text(doc.splitTextToSize(attestationText, 174), 18, currentY + 6)

  // Blocs de Signatures
  const sigY = currentY + 28
  
  // Signature Déposant
  doc.setDrawColor(148, 163, 184)
  doc.roundedRect(14, sigY, 86, 38, 2, 2, "D")
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text("POUR LA STRUCTURE DÉPOSANTE", 18, sigY + 7)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.text(`Nom : ${slipData.depositor_name || slipData.source_structure || ''}`, 18, sigY + 14)
  doc.text("Mention : « Remis pour destruction conforme »", 18, sigY + 20)
  doc.text("Date & Signature :", 18, sigY + 26)

  // Signature ABMed
  doc.setDrawColor(148, 163, 184)
  doc.roundedRect(110, sigY, 86, 38, 2, 2, "D")
  doc.setFontSize(8.5)
  doc.setTextColor(15, 23, 42)
  doc.setFont("helvetica", "bold")
  doc.text("POUR L'ABMed (AGENT RÉCEPTEUR)", 114, sigY + 7)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.text(`Agent : ${slipData.recipient_agent || 'Marie ADANDE'}`, 114, sigY + 14)
  doc.text("Direction de la Gestion des Déchets", 114, sigY + 20)
  doc.text("Signature & Cachet officiel :", 114, sigY + 26)

  // Pied de page
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text("Document généré par le Système de Gestion de l'Échantillothèque et des Déchets (SGIE - ABMed) — République du Bénin", 14, 290)

  doc.save(`${slipData.reception_number || 'attestation-dechets'}.pdf`)
}

// 6. Export Official Destruction Certificate PDF (Certificat / Attestation de Destruction à délivrer à la structure)
export function exportDestructionCertificatePDF(certData: {
  certificate_number: string
  destruction_date: string
  plan_number: string
  destruction_method?: string
  destruction_site?: string
  source_structure: string
  source_type?: string
  city?: string
  supervisor_name?: string
  quality_manager_name?: string
  items: Array<{
    batch_number: string
    waste_type: string
    commercial_name?: string
    quantity: number
    unit: string
    reception_number?: string
  }>
}) {
  const doc = new jsPDF()

  // En-tête officiel ABMed
  doc.setFillColor(27, 92, 46) // Vert ABMed #1B5C2E
  doc.rect(0, 0, 210, 36, "F")

  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text("RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ", 14, 10)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("CERTIFICAT OFFICIEL DE DESTRUCTION PHARMACEUTIQUE", 14, 20)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text("AGENCE BÉNINOISE DU MÉDICAMENT (ABMed) — ATTESTATION RÉGLEMENTAIRE (PSQIF)", 14, 28)

  // N° Certificat & Date
  doc.setFontSize(10)
  doc.setTextColor(27, 92, 46)
  doc.setFont("helvetica", "bold")
  doc.text(`CERTIFICAT N° : ${certData.certificate_number || 'CERT-DEST-2026-0001'}`, 14, 46)

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.setFont("helvetica", "normal")
  doc.text(`Date d'exécution : ${certData.destruction_date || new Date().toLocaleDateString('fr-FR')}`, 130, 46)

  // Section 1 : Structure Bénéficiaire / Mandataire (Cadre gauche)
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 52, 88, 46, 2, 2, "FD")

  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.setFont("helvetica", "bold")
  doc.text("1. STRUCTURE BÉNÉFICIAIRE", 18, 59)
  doc.line(18, 61, 98, 61)

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  doc.text(`Établissement : ${certData.source_structure || 'Toutes structures concernées'}`, 18, 68)
  doc.text(`Type : ${certData.source_type || 'Officine / Grossiste / Établissement'}`, 18, 74)
  doc.text(`Localité : ${certData.city || 'Cotonou / Bénin'}`, 18, 80)
  doc.text(`Réf. Dossier : ${certData.plan_number || 'DES-2026-0001'}`, 18, 86)

  // Section 2 : Détails de l'Opération de Destruction (Cadre droit)
  doc.setDrawColor(203, 213, 225)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(108, 52, 88, 46, 2, 2, "FD")

  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.setFont("helvetica", "bold")
  doc.text("2. DÉTAILS DE L'OPÉRATION", 112, 59)
  doc.line(112, 61, 192, 61)

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  doc.text(`Méthode : ${certData.destruction_method || 'Incinération haute température (>1200°C)'}`, 112, 68)
  doc.text(`Site : ${certData.destruction_site || 'Centre d\'Incinération Agréé Cotonou'}`, 112, 74)
  doc.text(`Supervision : Direction de la Gestion des Déchets`, 112, 80)
  doc.text(`Validation : Double Contrôle Qualité (Quatre Yeux)`, 112, 86)

  // Tableau des Déchets Détruits
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text("3. INVENTAIRE DES LOTS DÉTRUITS", 14, 108)

  const headers = [
    "N° Lot Déchet",
    "Classification / Désignation",
    "Récépissé Initial",
    "Quantité Détruite"
  ]

  const rows = (certData.items || []).map((item) => [
    item.batch_number || 'N/A',
    `${item.waste_type || 'Déchets pharmaceutiques'}${item.commercial_name ? ` (${item.commercial_name})` : ''}`,
    item.reception_number || 'Bordereau Initial',
    `${item.quantity} ${item.unit || 'Kg'}`
  ])

  const totalQty = (certData.items || []).reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
  if (certData.items && certData.items.length > 1) {
    rows.push([
      "TOTAL DÉTRUIT",
      `${certData.items.length} lots neutralisés définitivement`,
      "-",
      `${totalQty.toFixed(2)} (Total)`
    ])
  }

  autoTable(doc, {
    startY: 112,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [27, 92, 46], textColor: [255, 255, 255], fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 80 },
      2: { cellWidth: 35 },
      3: { cellWidth: 27, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  })

  const currentY = (doc as any).lastAutoTable.finalY + 8

  // Texte officiel d'attestation de destruction
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(14, currentY, 182, 26, 2, 2, "F")
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(51, 65, 85)
  const attestationText = 
    "CERTIFICATION LÉGALE DE DESTRUCTION DÉFINITIVE : L'Agence Béninoise du Médicament (ABMed) certifie par la présente que les produits " +
    "et déchets pharmaceutiques détaillés ci-dessus, remis par la structure susmentionnée, ont été intégralement, définitivement et irréversiblement détruits " +
    "conformément aux directives nationales de santé publique et aux normes environnementales applicables. Ces produits ont été radiés des registres et stocks. " +
    "Le présent certificat est délivré à la structure mandataire pour servir et valoir ce que de droit."
  doc.text(doc.splitTextToSize(attestationText, 174), 18, currentY + 6)

  // Blocs de Signatures
  const sigY = currentY + 32

  // Signature Resp Déchets
  doc.setDrawColor(148, 163, 184)
  doc.roundedRect(14, sigY, 86, 38, 2, 2, "D")
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text("LE RESPONSABLE GESTION DES DÉCHETS", 18, sigY + 7)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.text(`Nom : ${certData.supervisor_name || 'Marie ADANDE'}`, 18, sigY + 14)
  doc.text("Direction de la Gestion des Déchets - ABMed", 18, sigY + 20)
  doc.text("Signature & Cachet officiel :", 18, sigY + 26)

  // Signature Resp Qualité / Direction
  doc.roundedRect(110, sigY, 86, 38, 2, 2, "D")
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "bold")
  doc.text("LE RESPONSABLE ASSURANCE QUALITÉ", 114, sigY + 7)
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  doc.text(`Nom : ${certData.quality_manager_name || 'Dr. Christian KOSSOU'}`, 114, sigY + 14)
  doc.text("Direction de l'Assurance Qualité - ABMed", 114, sigY + 20)
  doc.text("Signature & Visa de conformité :", 114, sigY + 26)

  // Pied de page
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text("Document officiel délivré par le Système de Gestion de l'Échantillothèque et des Déchets (SGIE - ABMed) — République du Bénin", 14, 290)

  doc.save(`${certData.certificate_number || 'certificat-destruction'}.pdf`)
}

// 7. Export Waste Inventory Report PDF (Procès-Verbal de Contrôle & Inventaire Déchets)
export function exportWasteInventoryReportPDF(inventoryData: {
  inv_number: string
  name: string
  date: string
  completed_at?: string | null
  inventory_type: string
  location: string
  status: string
  controller?: string
  system_weight: number
  physical_weight: number
  diff: number
  items_count: number
  observations?: string
  items: Array<{
    batch_number: string
    commercial_name: string
    waste_type: string
    packaging?: string
    current_location?: string
    system_quantity: number
    physical_quantity: number | null
    diff?: number
    discrepancy_reason?: string | null
  }>
}) {
  const doc = new jsPDF()

  // En-tête République du Bénin / ABMed
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 41, 59)
  doc.text("RÉPUBLIQUE DU BÉNIN", 14, 12)
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.text("MINISTÈRE DE LA SANTÉ", 14, 16)
  doc.text("AGENCE BÉNINOISE DU MÉDICAMENT ET DES AUTRES PRODUITS DE SANTÉ (ABMed)", 14, 20)
  doc.text("SYSTÈME INTÉGRÉ DE GESTION DES ÉCHANTILLONS & DÉCHETS (SGIE)", 14, 24)

  // Bandeau titre bordeaux / rouge déchet
  doc.setFillColor(185, 28, 28) // red-700
  doc.roundedRect(14, 28, 182, 13, 1.5, 1.5, "F")
  doc.setFontSize(10.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text("PROCÈS-VERBAL DE CONTRÔLE D'INVENTAIRE PHYSIQUE DES DÉCHETS", 105, 36.5, { align: "center" })

  // Informations de la session d'inventaire
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(14, 45, 182, 34, 2, 2, "FD")

  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 116, 139)
  doc.text("N° INVENTAIRE DÉCHET :", 18, 52)
  doc.text("DATE D'OUVERTURE :", 18, 59)
  doc.text("ZONE DE STOCKAGE :", 18, 66)
  doc.text("STATUT SESSION :", 18, 73)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text(inventoryData.inv_number || "INV-W-2026", 62, 52)
  doc.setFont("helvetica", "normal")
  doc.text(new Date(inventoryData.date).toLocaleDateString("fr-FR"), 62, 59)
  doc.text(inventoryData.location || "MAGASIN DES DECHETS", 62, 66)
  doc.text(inventoryData.status || "Validé", 62, 73)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 116, 139)
  doc.text("NOM DE SESSION :", 108, 52)
  doc.text("DATE CLÔTURE :", 108, 59)
  doc.text("TYPE D'INVENTAIRE :", 108, 66)
  doc.text("RESPONSABLE CONTRÔLE :", 108, 73)

  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  doc.text(inventoryData.name || "Inventaire Déchets", 146, 52)
  doc.text(inventoryData.completed_at ? new Date(inventoryData.completed_at).toLocaleDateString("fr-FR") : "—", 146, 59)
  doc.text(inventoryData.inventory_type || "Périodique", 146, 66)
  doc.text(inventoryData.controller || "Marie ADANDE", 146, 73)

  // Synthèse comparative des masses (3 boîtes KPI)
  const kpiY = 82
  // Masse théorique
  doc.setFillColor(241, 245, 249)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(14, kpiY, 57, 18, 1.5, 1.5, "FD")
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(100, 116, 139)
  doc.text("MASSE SYSTÈME (SI)", 42.5, kpiY + 6, { align: "center" })
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(`${inventoryData.system_weight} Kg`, 42.5, kpiY + 14, { align: "center" })

  // Masse réelle pesée
  doc.roundedRect(76.5, kpiY, 57, 18, 1.5, 1.5, "FD")
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text("MASSE RÉELLE PESÉE", 105, kpiY + 6, { align: "center" })
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(`${inventoryData.physical_weight} Kg`, 105, kpiY + 14, { align: "center" })

  // Écart global
  const isZeroDiff = inventoryData.diff === 0
  if (isZeroDiff) {
    doc.setFillColor(236, 253, 245)
    doc.setDrawColor(167, 243, 208)
  } else {
    doc.setFillColor(254, 242, 242)
    doc.setDrawColor(254, 202, 202)
  }
  doc.roundedRect(139, kpiY, 57, 18, 1.5, 1.5, "FD")
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(isZeroDiff ? 5 : 185, isZeroDiff ? 150 : 28, isZeroDiff ? 105 : 28)
  doc.text("ÉCART GLOBAL RELEVÉ", 167.5, kpiY + 6, { align: "center" })
  doc.setFontSize(11)
  doc.text(`${inventoryData.diff > 0 ? `+${inventoryData.diff}` : inventoryData.diff} Kg`, 167.5, kpiY + 14, { align: "center" })

  // Tableau détaillé des lots contrôlés
  const tableHeaders = ["N° Lot Déchet", "Désignation & Catégorie", "Contenant", "Stock SI", "Pesée Réelle", "Écart", "Motif de l'écart"]
  const tableRows = (inventoryData.items || []).map((it) => {
    const phys = it.physical_quantity !== null ? it.physical_quantity : it.system_quantity
    const diff = phys - it.system_quantity
    return [
      it.batch_number || "N/A",
      `${it.commercial_name || "Déchet"}\n(${it.waste_type || "Déchets pharmaceutiques"})`,
      it.packaging || "Fût / Carton",
      `${it.system_quantity} Kg`,
      `${phys} Kg`,
      diff === 0 ? "0 Kg" : `${diff > 0 ? `+${diff}` : diff} Kg`,
      diff === 0 ? "Conforme" : (it.discrepancy_reason || "Non spécifié")
    ]
  })

  autoTable(doc, {
    startY: 104,
    head: [tableHeaders],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: "bold" },
      1: { cellWidth: 50 },
      2: { cellWidth: 22 },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 20, halign: "right", fontStyle: "bold" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 28 }
    },
    margin: { left: 14, right: 14 }
  })

  let finalY = (doc as any).lastAutoTable.finalY + 6

  // Observations
  if (inventoryData.observations) {
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(15, 23, 42)
    doc.text("Observations & Constats d'audit :", 14, finalY)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    doc.text(doc.splitTextToSize(String(inventoryData.observations), 182), 14, finalY + 4)
    finalY += 12
  }

  // Déclaration légale d'inventaire contradictoire
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(14, finalY, 182, 14, 1.5, 1.5, "FD")
  doc.setFontSize(7)
  doc.setFont("helvetica", "italic")
  doc.setTextColor(51, 65, 85)
  doc.text(
    "Le présent procès-verbal contradictoire atteste de la conformité du décompte physique et des pesées réalisées au sein du local",
    18,
    finalY + 5
  )
  doc.text(
    "déchets de l'ABMed. Les écarts constatés font l'objet d'un ajustement formel des registres de stocks selon la réglementation en vigueur.",
    18,
    finalY + 10
  )

  // Blocs de Signatures
  const sigY = finalY + 18
  doc.setDrawColor(148, 163, 184)

  // Signature Opérateur / Contrôleur
  doc.roundedRect(14, sigY, 86, 32, 2, 2, "D")
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text("L'AGENT CONTRÔLEUR / RESPONSABLE DÉCHET", 18, sigY + 6)
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.text(`Nom : ${inventoryData.controller || "Marie ADANDE"}`, 18, sigY + 12)
  doc.text("Visa et signature de pesée :", 18, sigY + 18)

  // Signature Resp Qualité / Direction
  doc.roundedRect(110, sigY, 86, 32, 2, 2, "D")
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text("LE RESPONSABLE ASSURANCE QUALITÉ", 114, sigY + 6)
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.text("Nom : Dr. Christian KOSSOU", 114, sigY + 12)
  doc.text("Visa de validation de l'inventaire :", 114, sigY + 18)

  // Footer
  doc.setFontSize(6.5)
  doc.setTextColor(148, 163, 184)
  doc.text("SGIE ABMed — PV Officiel de Contrôle d'Inventaire Déchets — République du Bénin", 14, 290)

  doc.save(`${inventoryData.inv_number || "inventaire-dechets"}.pdf`)
}



