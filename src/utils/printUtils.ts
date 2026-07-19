import { jsPDF } from 'jspdf';

export type LabelFormat = '50x30' | '60x40' | '100x70' | 'A4';

export interface LabelData {
  id: string;
  itemNumber: string;
  productName: string;
  dci?: string;
  dosage?: string;
  presentation?: string;
  batchNumber: string;
  expiryDate?: string;
  status: string;
  location?: {
    salle?: string;
    zone?: string;
    armoire?: string;
    etagere?: string;
    position?: string;
  };
  extraData?: {
    category?: string;
    weight?: string;
    declarationDate?: string;
    destructionPlan?: string;
  };
}

// Logo ABMed (Armoiries du Bénin stylisées pour la pharmacie)
export const abMedLogoSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="30" height="30" style="display: block;">
    <polygon points="50,10 90,25 90,65 50,90 10,65 10,25" fill="#0F5C4A" />
    <polygon points="50,15 85,28 85,62 50,85 15,62 15,28" fill="#FFFFFF" />
    <polygon points="50,20 80,31 80,60 50,80 20,60 20,31" fill="#0F5C4A" />
    <path d="M46,30 h8 v14 h14 v8 h-14 v14 h-8 v-14 h-14 v-8 h14 z" fill="#1E40AF" />
  </svg>
`;

// Logo eGED-ABMed
export const egedLogoSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="30" height="30" style="display: block;">
    <rect x="15" y="15" width="70" height="70" rx="15" fill="#1E40AF" />
    <text x="50" y="52" font-family="'Helvetica Neue', Arial, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">eG</text>
    <text x="50" y="78" font-family="'Helvetica Neue', Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">ABMed</text>
  </svg>
`;

// Helper pour obtenir la couleur du statut
export function getStatusColor(status: string): { bg: string; text: string; hex: string } {
  switch (status) {
    case 'Disponible':
    case 'Validé':
      return { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800', text: 'Disponible', hex: '#0F5C4A' };
    case 'En analyse':
    case 'En contrôle':
      return { bg: 'bg-blue-50 border-blue-200 text-blue-800', text: 'En analyse', hex: '#1E40AF' };
    case 'Quarantaine':
    case 'En quarantaine':
    case 'En attente de destruction':
      return { bg: 'bg-amber-50 border-amber-200 text-amber-800', text: 'Quarantaine', hex: '#F59E0B' };
    case 'Rejeté':
      return { bg: 'bg-red-50 border-red-200 text-red-800', text: 'Rejeté', hex: '#DC2626' };
    case 'Détruit':
    case 'Archivé':
      return { bg: 'bg-slate-100 border-slate-300 text-slate-800', text: 'Détruit', hex: '#64748B' };
    default:
      return { bg: 'bg-gray-50 border-gray-200 text-gray-800', text: status, hex: '#64748B' };
  }
}

/**
 * Génère le style CSS de l'étiquette selon le format sélectionné.
 */
function getLabelStyles(format: LabelFormat): string {
  if (format === 'A4') {
    return `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 8mm 6mm;
          box-sizing: border-box;
          background: white;
        }
      }
      .a4-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-gap: 3mm;
        width: 100%;
        max-width: 198mm;
      }
      .label-card {
        width: 63.5mm;
        height: 38.1mm; /* format planche 3x8 standard */
        box-sizing: border-box;
        border: 0.15mm solid #E2E8F0;
        padding: 1.5mm 2mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: white;
        overflow: hidden;
        page-break-inside: avoid;
      }
      .lbl-header h1 { font-size: 7.5pt; }
      .lbl-header p { font-size: 4.2pt; }
      .lbl-qr { width: 14mm; height: 14mm; }
      .lbl-product-name { font-size: 7pt; -webkit-line-clamp: 1; }
      .lbl-details { font-size: 5pt; }
      .lbl-loc-box { font-size: 4.5pt; padding: 0.4mm 1mm; }
      .lbl-badge { font-size: 4.5pt; padding: 0.2mm 1mm; }
      .lbl-footer { font-size: 4.2pt; }
    `;
  }

  const dims = {
    '50x30': { w: 50, h: 30, padding: '1.2mm 1.5mm', fontScale: 0.8 },
    '60x40': { w: 60, h: 40, padding: '2mm 2.5mm', fontScale: 1.0 },
    '100x70': { w: 100, h: 70, padding: '3.5mm 4mm', fontScale: 1.5 },
  }[format];

  return `
    @media print {
      @page {
        size: ${dims.w}mm ${dims.h}mm;
        margin: 0;
      }
      body {
        margin: 0;
      }
    }
    body {
      margin: 0;
      width: ${dims.w}mm;
      height: ${dims.h}mm;
      box-sizing: border-box;
      background-color: white;
      color: black;
      overflow: hidden;
    }
    .label-card {
      width: 100%;
      height: 100%;
      padding: ${dims.padding};
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      background: white;
    }
    .lbl-header h1 { font-size: ${7.5 * dims.fontScale}pt; }
    .lbl-header p { font-size: ${4.8 * dims.fontScale}pt; }
    .lbl-qr { width: ${18 * dims.fontScale}mm; height: ${18 * dims.fontScale}mm; }
    .lbl-product-name { font-size: ${7.5 * dims.fontScale}pt; }
    .lbl-details { font-size: ${5.5 * dims.fontScale}pt; }
    .lbl-loc-box { font-size: ${5 * dims.fontScale}pt; padding: 0.5mm 1.2mm; }
    .lbl-badge { font-size: ${5 * dims.fontScale}pt; padding: 0.3mm 1.2mm; }
    .lbl-footer { font-size: ${4.8 * dims.fontScale}pt; }
  `;
}

/**
 * Génère le code HTML d'une étiquette individuelle.
 */
function renderLabelHtml(item: LabelData, type: 'sample' | 'waste', qrUrl: string, dateStr: string): string {
  const isWaste = type === 'waste';
  const statusInfo = getStatusColor(item.status);
  
  const headerTheme = isWaste 
    ? { title: 'LOT DE DÉCHETS PHARMACEUTIQUES', subtitle: 'eGED-ABMed • Contrôle & Élimination', border: 'border-orange-500' }
    : { title: 'ÉTIQUETTE OFFICIELLE', subtitle: 'eGED-ABMed • Échantillothèque Nationale', border: 'border-blue-600' };

  const primaryColorHex = isWaste ? '#F97316' : '#1E40AF';

  return `
    <div class="label-card" style="font-family: 'Inter', -apple-system, sans-serif;">
      <!-- EN-TÊTE -->
      <div class="lbl-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 0.15mm solid ${primaryColorHex}; padding-bottom: 0.6mm;">
        <div style="display: flex; align-items: center; gap: 1mm;">
          ${abMedLogoSvg}
          ${egedLogoSvg}
        </div>
        <div style="text-align: center; flex: 1; padding: 0 1mm;">
          <h1 style="margin: 0; font-weight: 800; color: ${primaryColorHex}; letter-spacing: 0.2px; text-transform: uppercase;">${headerTheme.title}</h1>
          <p style="margin: 0.5px 0 0 0; font-size: 4pt; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2px;">Plateforme nationale de gestion des échantillons</p>
        </div>
        <div style="text-align: right; font-size: 4.5pt; color: #64748B; font-weight: 600; line-height: 1.1;">
          <div>N°: ${item.itemNumber}</div>
          <div>Le: ${dateStr}</div>
        </div>
      </div>
      
      <!-- ZONE PRINCIPALE -->
      <div style="display: flex; flex: 1; align-items: center; padding: 1mm 0; gap: 2mm; min-height: 0;">
        <!-- QR Code gauche -->
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
          <div style="background: white; border: 0.1mm solid #CBD5E1; border-radius: 0.6mm; padding: 0.4mm;" class="lbl-qr">
            <img src="${qrUrl}" style="width: 100%; height: 100%; object-fit: contain;" alt="QR Code" />
          </div>
          <span style="font-size: 3.5pt; font-weight: 700; color: #64748B; margin-top: 0.6mm; text-transform: uppercase; letter-spacing: 0.1px;">Scanner la fiche</span>
        </div>
        
        <!-- Informations droite -->
        <div style="display: flex; flex-direction: column; justify-content: center; flex: 1; min-width: 0; height: 100%;">
          <h2 class="lbl-product-name" style="margin: 0 0 0.6mm 0; font-weight: 800; color: #0F172A; text-transform: uppercase; line-height: 1.1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-all;">
            ${item.productName}
          </h2>
          
          <div class="lbl-details" style="color: #334155; font-weight: 500; line-height: 1.1;">
            ${!isWaste ? `
              <div><strong>DCI :</strong> ${item.dci || '-'}</div>
              <div><strong>Lot :</strong> ${item.batchNumber} • <strong>Périm :</strong> ${item.expiryDate || '-'}</div>
              <div><strong>Dosage :</strong> ${item.dosage || '-'} • <strong>Forme :</strong> ${item.presentation || '-'}</div>
            ` : `
              <div><strong>Catégorie :</strong> ${item.extraData?.category || 'Non spécifié'}</div>
              <div><strong>Déclaré le :</strong> ${item.extraData?.declarationDate || '-'}</div>
              <div><strong>Plan Destr. :</strong> ${item.extraData?.destructionPlan || 'Aucun'}</div>
            `}
          </div>

          <!-- Localisation + Statut -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1mm; gap: 1mm;">
            <!-- Petit encadré localisation -->
            <div class="lbl-loc-box" style="background: #F8FAFC; border: 0.1mm solid #E2E8F0; border-radius: 0.5mm; color: #475569; font-weight: 700; font-family: monospace; display: flex; gap: 1.5mm;">
              ${item.location ? `
                <span>S:${item.location.salle || '?'}-Z:${item.location.zone || '?'}</span>
                <span>A:${item.location.armoire || '?'}-E:${item.location.etagere || '?'}</span>
                <span>P:${item.location.position || '?'}</span>
              ` : `<span>Loc: Non spécifié</span>`}
            </div>
            
            <!-- Badge Statut -->
            <div class="lbl-badge ${statusInfo.bg}" style="border: 0.1mm solid; border-radius: 9999px; font-weight: 800; text-transform: uppercase; white-space: nowrap;">
              ${statusInfo.text}
            </div>
          </div>
        </div>
      </div>
      
      <!-- PIED DE PAGE -->
      <div class="lbl-footer" style="border-top: 0.1mm dashed #E2E8F0; padding-top: 0.6mm; display: flex; justify-content: space-between; align-items: center; color: #94A3B8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px;">
        <span>Autorité Béninoise de Régulation du Médicament</span>
        <span style="font-family: monospace; font-weight: 700;">www.abmed.bj</span>
      </div>
    </div>
  `;
}

/**
 * Lance l'impression d'étiquettes (directement ou sous forme de planche A4).
 */
export function printLabels(items: LabelData[], type: 'sample' | 'waste', qrCodes: Record<string, string>, format: LabelFormat) {
  if (typeof window === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error("Impossible d'accéder au document de l'iframe");
    return;
  }

  const dateStr = new Date().toLocaleDateString('fr-FR');
  const styleString = getLabelStyles(format);
  
  let bodyContent = '';

  if (format === 'A4') {
    // Calculer les pages A4 : une page contient jusqu'à 24 étiquettes (3 colonnes x 8 lignes)
    const itemsPerPage = 24;
    const pagesCount = Math.ceil(items.length / itemsPerPage);

    for (let p = 0; p < pagesCount; p++) {
      const pageItems = items.slice(p * itemsPerPage, (p + 1) * itemsPerPage);
      bodyContent += `
        <div class="a4-page" style="width: 198mm; height: 280mm; box-sizing: border-box; page-break-after: always; display: flex; flex-direction: column;">
          <div class="a4-grid">
            ${pageItems.map(item => renderLabelHtml(item, type, qrCodes[item.id] || '', dateStr)).join('')}
          </div>
        </div>
      `;
    }
  } else {
    // Format rouleau thermique : chaque étiquette est imprimée sur une page distincte du rouleau
    bodyContent = items.map(item => `
      <div style="page-break-after: always; width: 100%; height: 100%;">
        ${renderLabelHtml(item, type, qrCodes[item.id] || '', dateStr)}
      </div>
    `).join('');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Etiquette eGED-ABMed</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap" rel="stylesheet">
        <style>
          ${styleString}
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          * {
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.frameElement.remove();
              }, 500);
            }, 300);
          }
        </script>
      </body>
    </html>
  `;

  doc.open();
  doc.write(htmlContent);
  doc.close();
}

/**
 * Génère et télécharge un PDF d'étiquette(s).
 */
export function downloadLabelsPDF(items: LabelData[], type: 'sample' | 'waste', qrCodes: Record<string, string>, format: LabelFormat) {
  const isWaste = type === 'waste';
  const primaryColorHex = isWaste ? '#D97706' : '#1E40AF'; // Orange ou Bleu

  // Configurer le document PDF
  let doc: jsPDF;
  
  if (format === 'A4') {
    doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  } else {
    const dims = {
      '50x30': [50, 30],
      '60x40': [60, 40],
      '100x70': [100, 70]
    }[format];
    doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: dims
    });
  }

  const dateStr = new Date().toLocaleDateString('fr-FR');

  const drawLabelPDF = (item: LabelData, x: number, y: number, w: number, h: number, fontScale: number) => {
    // 1. Fond blanc
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, w, h, 'F');
    
    // 2. Bordure générale discrète
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.rect(x, y, w, h, 'S');

    // 3. En-tête
    // Ligne sous en-tête
    doc.setDrawColor(isWaste ? 217 : 30, isWaste ? 119 : 64, isWaste ? 6 : 175);
    doc.setLineWidth(0.2);
    doc.line(x + 1.5, y + 6.5 * fontScale, x + w - 1.5, y + 6.5 * fontScale);

    // Titre
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(5.5 * fontScale);
    doc.setTextColor(isWaste ? 217 : 30, isWaste ? 119 : 64, isWaste ? 6 : 175);
    const title = isWaste ? 'LOT DE DÉCHETS PHARMACEUTIQUES' : 'ÉTIQUETTE OFFICIELLE';
    doc.text(title, x + 8 * fontScale, y + 3 * fontScale);

    // Sous-titre
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(3.3 * fontScale);
    doc.setTextColor(100, 116, 139);
    doc.text("PLATEFORME NATIONALE DE GESTION eGED-ABMed", x + 8 * fontScale, y + 5 * fontScale);

    // Métadonnées à droite
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(3.3 * fontScale);
    doc.setTextColor(100, 116, 139);
    doc.text(`Ref: ${item.itemNumber}`, x + w - 15 * fontScale, y + 3 * fontScale);
    doc.text(`Le: ${dateStr}`, x + w - 15 * fontScale, y + 5 * fontScale);

    // 4. QR Code
    const qrSize = 14 * fontScale;
    const qrX = x + 2 * fontScale;
    const qrY = y + 8 * fontScale;
    
    try {
      if (qrCodes[item.id]) {
        doc.addImage(qrCodes[item.id], 'PNG', qrX, qrY, qrSize, qrSize);
      }
    } catch (e) {
      console.error("Failed to add image to PDF", e);
    }
    
    // Bordure blanche/grise autour du QR
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.1);
    doc.rect(qrX - 0.2, qrY - 0.2, qrSize + 0.4, qrSize + 0.4, 'S');

    // Label sous QR Code
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(2.6 * fontScale);
    doc.setTextColor(148, 163, 184);
    doc.text("SCANNER LA FICHE", qrX + qrSize / 2, qrY + qrSize + 2 * fontScale, { align: 'center' });

    // 5. Informations Produit (à droite du QR)
    const infoX = qrX + qrSize + 3 * fontScale;
    let infoY = y + 10 * fontScale;

    // Nom Commercial
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(5.5 * fontScale);
    doc.setTextColor(15, 23, 42); // slate-900
    const wrappedName = doc.splitTextToSize((item.productName || '').toUpperCase(), w - infoX - 2);
    doc.text(wrappedName, infoX, infoY);
    
    infoY += (wrappedName.length * 3) * fontScale;

    // Détails
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(4.3 * fontScale);
    doc.setTextColor(51, 65, 85); // slate-700
    
    if (!isWaste) {
      doc.text(`DCI: ${item.dci || '-'}`, infoX, infoY);
      infoY += 2.2 * fontScale;
      doc.text(`Lot: ${item.batchNumber} | Perim: ${item.expiryDate || '-'}`, infoX, infoY);
      infoY += 2.2 * fontScale;
      doc.text(`Dos: ${item.dosage || '-'} | Forme: ${item.presentation || '-'}`, infoX, infoY);
    } else {
      doc.text(`Catégorie: ${item.extraData?.category || '-'}`, infoX, infoY);
      infoY += 2.2 * fontScale;
      doc.text(`Poids: ${item.extraData?.weight || '-'} | Date: ${item.extraData?.declarationDate || '-'}`, infoX, infoY);
      infoY += 2.2 * fontScale;
      doc.text(`Plan Destr: ${item.extraData?.destructionPlan || 'Aucun'}`, infoX, infoY);
    }

    infoY += 3.5 * fontScale;

    // Localisation (Encadré)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    const locW = 28 * fontScale;
    const locH = 4 * fontScale;
    doc.rect(infoX, infoY - 2.8 * fontScale, locW, locH, 'FD');
    
    doc.setFont("Courier", "bold");
    doc.setFontSize(3.6 * fontScale);
    doc.setTextColor(71, 85, 105);
    const locText = item.location 
      ? `S:${item.location.salle || '?'}-Z:${item.location.zone || '?'}-A:${item.location.armoire || '?'}-E:${item.location.etagere || '?'}`
      : 'Loc: Non specifie';
    doc.text(locText, infoX + 1, infoY - 1 * fontScale);

    // Statut (Badge)
    const statusInfo = getStatusColor(item.status);
    doc.setFillColor(241, 245, 249); // Gris par défaut ou couleur adaptée
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(3.8 * fontScale);
    doc.setTextColor(71, 85, 105);
    
    // Dessiner le texte de statut
    doc.text(statusInfo.text.toUpperCase(), infoX + locW + 3 * fontScale, infoY - 1 * fontScale);

    // 6. Pied de page
    doc.setDrawColor(241, 245, 249);
    doc.line(x + 1.5, y + h - 4.5 * fontScale, x + w - 1.5, y + h - 4.5 * fontScale);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(3.3 * fontScale);
    doc.setTextColor(148, 163, 184);
    doc.text("AUTORITE BENINOISE DE REGULATION DU MEDICAMENT", x + 2 * fontScale, y + h - 1.5 * fontScale);
    doc.text("WWW.ABMED.BJ", x + w - 15 * fontScale, y + h - 1.5 * fontScale, { align: 'right' } as any); // Type cast pour aligner
  };

  if (format === 'A4') {
    const marginX = 8;
    const marginY = 10;
    const labelW = 63.5;
    const labelH = 38.1;
    const gapX = 3;
    const gapY = 3;
    const cols = 3;
    const rows = 7; // 21 étiquettes par page pour plus de marge de sécurité

    let col = 0;
    let row = 0;
    let page = 1;

    items.forEach((item, index) => {
      if (index > 0 && col === 0 && row === 0) {
        doc.addPage('a4', 'portrait');
        page++;
      }

      const x = marginX + col * (labelW + gapX);
      const y = marginY + row * (labelH + gapY);

      drawLabelPDF(item, x, y, labelW, labelH, 0.95);

      col++;
      if (col >= cols) {
        col = 0;
        row++;
        if (row >= rows) {
          row = 0;
        }
      }
    });
  } else {
    // Thermal roll labels
    const dims = {
      '50x30': { w: 50, h: 30, scale: 0.8 },
      '60x40': { w: 60, h: 40, scale: 1.0 },
      '100x70': { w: 100, h: 70, scale: 1.5 }
    }[format];

    items.forEach((item, index) => {
      if (index > 0) {
        doc.addPage([dims.w, dims.h], 'landscape');
      }
      drawLabelPDF(item, 0, 0, dims.w, dims.h, dims.scale);
    });
  }

  doc.save(`etiquettes_eged_abmed_${Date.now()}.pdf`);
}
