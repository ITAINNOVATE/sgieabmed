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

// 4. Export Reception Voucher PDF (Inspection Report)
export function exportReceptionVoucherPDF(reception: any, samples: any[]) {
  const doc = new jsPDF()
  
  // Company Header
  doc.setFillColor(79, 70, 229) // Indigo banner
  doc.rect(0, 0, 210, 32, "F")
  
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text("BON DE RÉCEPTION & CONTRÔLE ÉCHANTILLONS", 14, 18)
  doc.setFontSize(9)
  doc.text("AUTORITÉ BÉNINOISE DE RÉGLEMENTATION PHARMACEUTIQUE (ABMed) - SGIE", 14, 25)
  
  // General Info Section
  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)
  doc.text("1. Informations de la Réception", 14, 42)
  doc.setLineWidth(0.3)
  doc.line(14, 44, 196, 44)
  
  doc.setFontSize(9)
  doc.text(`Réf Réception : ${reception.rec_number || 'N/A'}`, 14, 50)
  doc.text(`Date & Heure : ${reception.date_reception || 'N/A'} ${reception.time_reception || ''}`, 14, 56)
  doc.text(`Agent de réception : ${reception.inspector || 'N/A'}`, 14, 62)
  doc.text(`Réf. lettre de transmission : ${reception.ref_document || 'N/A'}`, 14, 68)
  doc.text(`Type de demande : ${reception.type_reception || 'N/A'}`, 14, 74)
  
  doc.text(`Demandeur/Donnateur/Objet : ${reception.supplier || 'N/A'}`, 110, 50)
  doc.text(`Fabricant : ${reception.manufacturer || 'N/A'}`, 110, 56)
  doc.text(`Pays d'origine : ${reception.country || 'N/A'}`, 110, 62)
  doc.text(`Mode Transport : ${reception.transport_mode || 'N/A'}`, 110, 68)
  
  // Conformity Section
  doc.setFontSize(12)
  doc.text("2. Contrôle de Conformité", 14, 86)
  doc.line(14, 88, 196, 88)
  
  const getConformSymbol = (val: boolean) => val ? "[X] Conforme" : "[ ] Non conforme"
  
  doc.setFontSize(9)
  doc.text(`Emballage : ${getConformSymbol(reception.check_packaging)}`, 14, 94)
  doc.text(`Boîtes/Colis : ${getConformSymbol(reception.check_boxes)}`, 14, 100)
  doc.text(`Scellés : ${getConformSymbol(reception.check_seals)}`, 14, 106)
  
  doc.text(`Quantité reçue : ${getConformSymbol(reception.check_qty)}`, 110, 94)
  doc.text(`Documents joints : ${getConformSymbol(reception.check_docs)}`, 110, 100)
  doc.text(`Intégrité physique : ${getConformSymbol(reception.check_damage)}`, 110, 106)
  
  doc.setFontSize(10)
  doc.text(`CONFORMITÉ GLOBALE : ${reception.check_conform ? "CONFORME" : "NON CONFORME / RÉSERVES"}`, 14, 114)
  
  if (reception.anomalies) {
    doc.setFontSize(9)
    doc.text(`Anomalies constatées : ${reception.anomalies}`, 14, 120)
  }
  
  // Samples List Section
  doc.setFontSize(12)
  doc.text("3. Produits et Échantillons Reçus", 14, 132)
  doc.line(14, 134, 196, 134)
  
  const tableHeaders = ["Nom commercial / DCI", "Catégorie", "N° Lot", "Date Péremption", "Quantité"]
  const tableRows = (samples || []).map(s => [
    `${s.commercial_name || ''}\n(${s.dci || ''})`,
    s.category || 'N/A',
    s.batch || s.batch_number || 'N/A',
    s.exp_date || s.expiry_date || 'N/A',
    `${s.qty || s.quantity || 0} ${s.unit || 'unités'}`
  ])
  
  autoTable(doc, {
    startY: 138,
    head: [tableHeaders],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 14, right: 14 }
  })
  
  // Validation / Signature Section
  const finalY = (doc as any).lastAutoTable.finalY + 12
  
  doc.setFontSize(12)
  doc.text("4. Validation de la Réception", 14, finalY)
  doc.line(14, finalY + 2, 196, finalY + 2)
  
  doc.setFontSize(9)
  doc.text(`Décision finale : ${reception.decision || 'En attente'}`, 14, finalY + 8)
  if (reception.decision_reason) {
    doc.text(`Motif de la décision : ${reception.decision_reason}`, 14, finalY + 14)
  }
  doc.text(`Signataire : ${reception.validator_name || reception.inspector || 'N/A'}`, 110, finalY + 8)
  doc.text(`Date de signature : ${reception.validation_date || reception.date_reception || 'N/A'}`, 110, finalY + 14)
  
  doc.save(`${reception.rec_number || 'reception'}.pdf`)
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
    location?: string
    observations?: string
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
  doc.roundedRect(108, 52, 88, 48, 2, 2, "FD")

  doc.setFontSize(9)
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
  doc.roundedRect(110, sigY, 86, 38, 2, 2, "D")
  doc.setFontSize(8.5)
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

