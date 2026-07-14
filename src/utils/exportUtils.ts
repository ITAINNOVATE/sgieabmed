"use client"

import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import "jspdf-autotable"

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
  
  // @ts-ignore
  doc.autoTable({
    startY: 46,
    head: [headers],
    body: rows,
    theme: "striped",
    headStyles: { fillDouble: false, fillColor: [79, 70, 229], textColor: [255, 255, 255] },
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
  doc.text(`Inspecteur : ${reception.inspector || 'N/A'}`, 14, 62)
  doc.text(`Réf Doc (BL/Facture) : ${reception.ref_document || 'N/A'}`, 14, 68)
  
  doc.text(`Fournisseur : ${reception.supplier || 'N/A'}`, 110, 50)
  doc.text(`Fabricant : ${reception.manufacturer || 'N/A'}`, 110, 56)
  doc.text(`Pays d'origine : ${reception.country || 'N/A'}`, 110, 62)
  doc.text(`Mode Transport : ${reception.transport_mode || 'N/A'}`, 110, 68)
  
  // Conformity Section
  doc.setFontSize(12)
  doc.text("2. Contrôle de Conformité", 14, 80)
  doc.line(14, 82, 196, 82)
  
  const getConformSymbol = (val: boolean) => val ? "[X] Conforme" : "[ ] Non conforme"
  
  doc.setFontSize(9)
  doc.text(`Emballage : ${getConformSymbol(reception.check_packaging)}`, 14, 88)
  doc.text(`Boîtes/Colis : ${getConformSymbol(reception.check_boxes)}`, 14, 94)
  doc.text(`Scellés : ${getConformSymbol(reception.check_seals)}`, 14, 100)
  
  doc.text(`Quantité reçue : ${getConformSymbol(reception.check_qty)}`, 110, 88)
  doc.text(`Documents joints : ${getConformSymbol(reception.check_docs)}`, 110, 94)
  doc.text(`Intégrité physique : ${getConformSymbol(reception.check_damage)}`, 110, 100)
  
  doc.setFontSize(10)
  doc.text(`CONFORMITÉ GLOBALE : ${reception.check_conform ? "CONFORME" : "NON CONFORME / RÉSERVES"}`, 14, 108)
  
  if (reception.anomalies) {
    doc.setFontSize(9)
    doc.text(`Anomalies constatées : ${reception.anomalies}`, 14, 114)
  }
  
  // Samples List Section
  doc.setFontSize(12)
  doc.text("3. Produits et Échantillons Reçus", 14, 126)
  doc.line(14, 128, 196, 128)
  
  const tableHeaders = ["Nom commercial / DCI", "Catégorie", "N° Lot", "Date Péremption", "Quantité"]
  const tableRows = samples.map(s => [
    `${s.commercial_name || ''}\n(${s.dci || ''})`,
    s.category || 'Autres',
    s.batch || s.batch_number || 'N/A',
    s.exp_date || s.expiry_date || 'N/A',
    `${s.qty || s.quantity || 0} ${s.unit || 'unités'}`
  ])
  
  // @ts-ignore
  doc.autoTable({
    startY: 132,
    head: [tableHeaders],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 14, right: 14 }
  })
  
  // Validation / Signature Section
  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY + 12
  
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
