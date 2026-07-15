import { jsPDF } from 'jspdf';

/**
 * Utilitaire d'impression d'étiquettes eGED-ABMed (format standard 60 x 40 mm).
 * Utilise un iframe invisible pour ne pas perturber l'interface et appliquer les styles d'impression de page exacts.
 */
export function printLabel(data: {
  itemNumber: string;
  productName: string;
  batchNumber: string;
  expiryDate?: string;
  qrCodeUrl: string;
}) {
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

  // Logo ABMed (Armoiries stylisées avec la croix verte de pharmacie)
  const abMedLogoSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="22" height="22" style="display: block;">
      <polygon points="50,10 90,25 90,65 50,90 10,65 10,25" fill="#0B5ED7" />
      <polygon points="50,15 85,28 85,62 50,85 15,62 15,28" fill="#FFFFFF" />
      <polygon points="50,20 80,31 80,60 50,80 20,60 20,31" fill="#0B5ED7" />
      <path d="M46,30 h8 v14 h14 v8 h-14 v14 h-8 v-14 h-14 v-8 h14 z" fill="#10B981" />
    </svg>
  `;

  // Logo eGED-ABMed (Icône moderne verte représentant la gestion numérique)
  const egedLogoSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="22" height="22" style="display: block;">
      <rect x="15" y="15" width="70" height="70" rx="15" fill="#10B981" />
      <text x="50" y="52" font-family="'Helvetica Neue', Arial, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">eG</text>
      <text x="50" y="78" font-family="'Helvetica Neue', Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF" text-anchor="middle">ABMed</text>
    </svg>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Etiquette eGED-ABMed - ${data.itemNumber}</title>
        <style>
          @media print {
            @page {
              size: 60mm 40mm;
              margin: 0;
            }
            body {
              margin: 0;
            }
          }
          body {
            margin: 0;
            padding: 2mm 2.5mm;
            width: 60mm;
            height: 40mm;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: white;
            color: black;
            overflow: hidden;
          }
          .container {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            justify-content: space-between;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 0.15mm solid #E2E8F0;
            padding-bottom: 0.8mm;
          }
          .header-logos {
            display: flex;
            align-items: center;
            gap: 1.2mm;
          }
          .header-title {
            text-align: right;
          }
          .header-title h1 {
            font-size: 7.5pt;
            margin: 0;
            font-weight: 800;
            color: #0F172A;
            line-height: 1;
          }
          .header-title p {
            font-size: 4.8pt;
            margin: 1px 0 0 0;
            color: #64748B;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1;
          }
          .content {
            display: flex;
            flex: 1;
            padding: 1.2mm 0;
            gap: 2.2mm;
            align-items: center;
            min-height: 0;
          }
          .qr-code-box {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18mm;
            height: 18mm;
            border: 0.1mm solid #CBD5E1;
            border-radius: 0.8mm;
            padding: 0.4mm;
            box-sizing: border-box;
            background: white;
            flex-shrink: 0;
          }
          .qr-code-img {
            width: 100%;
            height: 100%;
          }
          .details-box {
            display: flex;
            flex-direction: column;
            justify-content: center;
            flex: 1;
            min-width: 0;
          }
          .product-name {
            font-size: 7pt;
            font-weight: 800;
            margin: 0 0 0.6mm 0;
            line-height: 1.15;
            color: #0F172A;
            word-wrap: break-word;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-transform: uppercase;
          }
          .detail-row {
            display: flex;
            font-size: 5.5pt;
            margin-bottom: 0.3mm;
            line-height: 1.1;
            align-items: center;
          }
          .detail-label {
            font-weight: 700;
            color: #64748B;
            width: 9mm;
            flex-shrink: 0;
          }
          .detail-value {
            font-weight: 600;
            color: #0F172A;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .detail-value.mono {
            font-family: "Courier New", Courier, monospace;
            font-weight: 700;
            font-size: 6pt;
          }
          .footer {
            font-size: 4.8pt;
            text-align: center;
            border-top: 0.1mm dashed #E2E8F0;
            padding-top: 0.6mm;
            color: #94A3B8;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.2px;
            line-height: 1;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-logos">
              ${abMedLogoSvg}
              ${egedLogoSvg}
            </div>
            <div class="header-title">
              <h1>eGED-ABMed</h1>
              <p>Etiquette Officielle</p>
            </div>
          </div>
          
          <div class="content">
            <div class="qr-code-box">
              <img class="qr-code-img" src="${data.qrCodeUrl}" alt="QR Code" />
            </div>
            <div class="details-box">
              <h2 class="product-name">${data.productName}</h2>
              <div class="detail-row">
                <span class="detail-label">Ref :</span>
                <span class="detail-value mono">${data.itemNumber}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Lot :</span>
                <span class="detail-value mono">${data.batchNumber}</span>
              </div>
              ${data.expiryDate ? `
              <div class="detail-row">
                <span class="detail-label">Périm :</span>
                <span class="detail-value">${data.expiryDate}</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          <div class="footer">
            Autorité Béninoise de Réglementation Pharmaceutique
          </div>
        </div>
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
 * Génère et télécharge un PDF de l'étiquette (format 60 x 40 mm).
 */
export function downloadLabelPDF(data: {
  itemNumber: string;
  productName: string;
  batchNumber: string;
  expiryDate?: string;
  qrCodeUrl: string;
}) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [60, 40]
  });

  // Titre principal
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("eGED-ABMed", 3, 5);

  doc.setFontSize(5);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("ETIQUETTE OFFICIELLE", 3, 8);

  // Ligne de séparation d'en-tête
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.line(3, 9, 57, 9);

  // Ajout du QR Code
  try {
    doc.addImage(data.qrCodeUrl, 'PNG', 3, 11, 18, 18);
  } catch (e) {
    console.error("Failed to add image to PDF", e);
  }

  // Bordure du QR Code
  doc.setDrawColor(203, 213, 225);
  doc.rect(2.8, 10.8, 18.4, 18.4);

  // Nom du produit (en majuscules, retour à la ligne automatique)
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  const wrappedName = doc.splitTextToSize(data.productName.toUpperCase(), 32);
  doc.text(wrappedName, 23, 13);

  // Détails de l'échantillon/déchet
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  
  let currentY = 21;
  doc.text("Ref :", 23, currentY);
  doc.setFont("Courier", "bold");
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  doc.text(data.itemNumber, 30, currentY);

  currentY += 3.2;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Lot :", 23, currentY);
  doc.setFont("Courier", "bold");
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  doc.text(data.batchNumber, 30, currentY);

  if (data.expiryDate) {
    currentY += 3.2;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Périm :", 23, currentY);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(15, 23, 42);
    doc.text(data.expiryDate, 30, currentY);
  }

  // Ligne de séparation du pied de page
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.1);
  doc.line(3, 34, 57, 34);

  // Pied de page
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(4.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("AUTORITE BENINOISE DE REGLEMENTATION PHARMACEUTIQUE", 30, 37, { align: 'center' });

  // Téléchargement
  doc.save(`etiquette_${data.itemNumber}.pdf`);
}

