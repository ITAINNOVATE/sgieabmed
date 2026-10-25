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
    raw?: string;
  };
  extraData?: {
    category?: string;
    weight?: string;
    declarationDate?: string;
    destructionPlan?: string;
    receptionNumber?: string;
    sourceStructure?: string;
    sourceType?: string;
    depositorName?: string;
    depositorPhone?: string;
    packaging?: string;
    packagingCondition?: string;
    motive?: string;
    originalBatch?: string;
    recipientAgent?: string;
    manufacturer?: string;
    receptionRef?: string;
    quantity?: string | number;
    unit?: string;
    summaryText?: string;
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
      return { bg: 'bg-amber-50 border-amber-200 text-amber-800', text: 'Quarantaine', hex: '#F59E0B' };
    case 'En attente de destruction':
    case 'Planifié':
      return { bg: 'bg-purple-50 border-purple-200 text-purple-800', text: 'En attente de destruction', hex: '#7E22CE' };
    case 'Rejeté':
      return { bg: 'bg-red-50 border-red-200 text-red-800', text: 'Rejeté', hex: '#DC2626' };
    case 'Détruit':
    case 'Archivé':
      return { bg: 'bg-slate-100 border-slate-300 text-slate-800', text: 'Détruit', hex: '#64748B' };
    default:
      return { bg: 'bg-gray-50 border-gray-200 text-gray-800', text: status || 'Déclaré', hex: '#64748B' };
  }
}

/**
 * Génère le style CSS de l'étiquette selon le format sélectionné.
 */
function getLabelStyles(format: LabelFormat, type: 'sample' | 'waste'): string {
  if (format === 'A4') {
    if (type === 'waste') {
      return `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
        }
        .a4-waste-placard {
          width: 100%;
          max-width: 194mm;
          min-height: 275mm;
          margin: 0 auto;
          padding: 8mm 6mm;
          box-sizing: border-box;
          background: white;
          font-family: 'Inter', -apple-system, sans-serif;
          page-break-after: always;
        }
      `;
    }

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
        height: 38.1mm;
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
 * Rendu officiel de la Fiche Placard Grand Format A4 pour Déchet Pharmaceutique.
 */
export function renderWasteA4Html(item: LabelData, qrUrl: string, dateStr: string): string {
  const statusInfo = getStatusColor(item.status);
  const ex = item.extraData || {};
  const locStr = item.location?.raw || (
    item.location?.salle ? `${item.location.salle} — ${item.location.zone || ''} ${item.location.armoire ? '(' + item.location.armoire + ')' : ''}` : 'Local Déchets Central'
  );

  return `
    <div class="a4-waste-placard" style="border: 2px solid #DC2626; border-radius: 8px; padding: 8mm; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.08); background: white;">
      
      <!-- 1. EN-TÊTE ÉPURÉ OFFICIEL ABMED -->
      <div style="border-bottom: 2.5px solid #DC2626; padding-bottom: 4mm; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 4mm;">
          <div style="width: 44px; height: 44px;">${abMedLogoSvg}</div>
          <div>
            <div style="font-size: 15pt; font-weight: 900; color: #DC2626; text-transform: uppercase; letter-spacing: 0.5px;">ABMed • DÉCHETS PHARMACEUTIQUES</div>
            <div style="font-size: 8.5pt; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1mm;">
              Fiche d'Identification & Traçabilité (Fût / Carton / Palette)
            </div>
          </div>
        </div>

        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
          <div style="width: 40px; height: 40px;">${egedLogoSvg}</div>
          <div style="font-size: 7pt; font-weight: 700; color: #64748B; font-family: monospace; margin-top: 1mm;">eGED-ABMed • SGIE</div>
          <div style="font-size: 7pt; color: #94A3B8;">Émis le : <strong>${dateStr}</strong></div>
        </div>
      </div>

      <!-- 2. BANDEAU IDENTIFICATION DU LOT GRAND FORMAT -->
      <div style="margin-top: 4mm; background: #FEF2F2; border: 1.5px solid #FCA5A5; border-radius: 8px; padding: 3.5mm 6mm; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 8pt; font-weight: 800; color: #991B1B; text-transform: uppercase; letter-spacing: 0.5px;">N° IDENTIFIANT DU LOT DÉCHET :</span>
          <div style="font-size: 18pt; font-weight: 900; color: #0F172A; font-family: monospace; letter-spacing: 1px; margin-top: 0.5mm;">
            ${item.itemNumber}
          </div>
          ${ex.receptionNumber ? `<div style="font-size: 7.5pt; color: #64748B; margin-top: 0.5mm;">Réf. Réception : <strong>${ex.receptionNumber}</strong></div>` : ''}
        </div>

        <div style="text-align: right;">
          <span style="display: inline-block; padding: 2mm 5mm; border-radius: 9999px; font-size: 9.5pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4px; border: 1.5px solid ${statusInfo.hex}; color: ${statusInfo.hex}; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            ● ${item.status || 'Déclaré'}
          </span>
        </div>
      </div>

      <!-- 3. CONTENU PRINCIPAL EN 2 COLONNES AVEC CODE QR GÉANT -->
      <div style="margin-top: 5mm; display: flex; gap: 6mm; flex: 1; align-items: stretch;">
        
        <!-- COLONNE GAUCHE : DÉTAILS DU PRODUIT RÉCEPTIONNÉ -->
        <div style="flex: 1.1; display: flex; flex-direction: column; gap: 3.5mm;">
          
          <!-- BLOC 1 : CARACTÉRISTIQUES -->
          <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 3.5mm 4mm; background: white; flex: 1;">
            <div style="font-size: 8.5pt; font-weight: 800; color: #B91C1C; text-transform: uppercase; border-bottom: 1.5px solid #FEE2E2; padding-bottom: 1.5mm; margin-bottom: 2.5mm;">
              1. Informations du Déchet
            </div>
            <table style="width: 100%; font-size: 8pt; border-collapse: collapse; line-height: 1.5;">
              <tr>
                <td style="color: #64748B; font-weight: 600; width: 38%; padding: 1.2mm 0;">Classification :</td>
                <td style="color: #0F172A; font-weight: 800;">${ex.category || item.productName}</td>
              </tr>
              <tr>
                <td style="color: #64748B; font-weight: 600; padding: 1.2mm 0;">Dénomination :</td>
                <td style="color: #0F172A; font-weight: 700;">${item.productName || 'Non spécifié'}</td>
              </tr>
              <tr>
                <td style="color: #64748B; font-weight: 600; padding: 1.2mm 0;">N° Lot d'origine :</td>
                <td style="color: #0F172A; font-weight: 700; font-family: monospace;">${ex.originalBatch || item.batchNumber || '—'}</td>
              </tr>
              <tr>
                <td style="color: #64748B; font-weight: 600; padding: 1.2mm 0;">Quantité / Poids :</td>
                <td style="color: #B91C1C; font-weight: 900; font-size: 13pt;">${ex.weight || '1 Kg'}</td>
              </tr>
              <tr>
                <td style="color: #64748B; font-weight: 600; padding: 1.2mm 0;">Conditionnement :</td>
                <td style="color: #0F172A; font-weight: 600;">${ex.packaging || 'Fûts / Cartons scellés'}</td>
              </tr>
              <tr>
                <td style="color: #64748B; font-weight: 600; padding: 1.2mm 0;">Motif de rejet :</td>
                <td style="color: #0F172A; font-weight: 600;">${ex.motive || 'Péremption / Non-conformité'}</td>
              </tr>
            </table>
          </div>

          <!-- BLOC 2 : PROVENANCE & LOCALISATION -->
          <div style="border: 1px solid #E2E8F0; border-radius: 8px; padding: 3.5mm 4mm; background: white; flex: 1;">
            <div style="font-size: 8.5pt; font-weight: 800; color: #1E40AF; text-transform: uppercase; border-bottom: 1.5px solid #DBEAFE; padding-bottom: 1.5mm; margin-bottom: 2.5mm;">
              2. Provenance & Stockage
            </div>
            <table style="width: 100%; font-size: 8pt; border-collapse: collapse; line-height: 1.5;">
              <tr>
                <td style="color: #64748B; font-weight: 600; width: 38%; padding: 1.2mm 0;">Structure Source :</td>
                <td style="color: #0F172A; font-weight: 800;">${ex.sourceStructure || 'Interne ABMed'}</td>
              </tr>
              <tr>
                <td style="color: #64748B; font-weight: 600; padding: 1.2mm 0;">Apporteur / Déposant :</td>
                <td style="color: #0F172A; font-weight: 600;">${ex.depositorName || 'Admin EGED'} ${ex.depositorPhone ? '(' + ex.depositorPhone + ')' : ''}</td>
              </tr>
              <tr>
                <td style="color: #64748B; font-weight: 600; padding: 1.2mm 0;">Emplacement Magasin :</td>
                <td style="color: #0F5C4A; font-weight: 800; font-family: monospace;">${locStr}</td>
              </tr>
              <tr>
                <td style="color: #64748B; font-weight: 600; padding: 1.2mm 0;">Plan de Destruction :</td>
                <td style="color: #7E22CE; font-weight: 800; font-family: monospace;">${ex.destructionPlan || 'En attente de planification'}</td>
              </tr>
              <tr>
                <td style="color: #64748B; font-weight: 600; padding: 1.2mm 0;">Date d'entrée :</td>
                <td style="color: #0F172A; font-weight: 600;">${ex.declarationDate || dateStr}</td>
              </tr>
            </table>
          </div>

        </div>

        <!-- COLONNE DROITE : CODE QR TRÈS GRAND & CONSIGNES -->
        <div style="flex: 1.1; display: flex; flex-direction: column; gap: 3.5mm; justify-content: space-between;">
          
          <!-- GRAND CODE QR RÉCAPITULATIF SÉCURISÉ -->
          <div style="border: 2px solid #DC2626; border-radius: 10px; padding: 5mm; background: #FFFDFD; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.06); flex: 1.4;">
            <div style="font-size: 9.5pt; font-weight: 900; color: #991B1B; text-transform: uppercase; margin-bottom: 3mm; letter-spacing: 0.4px;">
              CODE QR RÉCAPITULATIF PRODUIT
            </div>
            
            <!-- CODE QR GÉANT (92mm x 92mm) -->
            <div style="background: white; border: 1.5px solid #CBD5E1; border-radius: 8px; padding: 3mm; width: 92mm; height: 92mm; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <img src="${qrUrl}" alt="QR Code Récapitulatif Déchet" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>

            <div style="font-size: 7.5pt; font-weight: 800; color: #0F172A; margin-top: 3mm; line-height: 1.4; max-width: 85mm;">
              Scannez ce QR Code pour afficher le récapitulatif complet et certifié du produit réceptionné.
            </div>
            <div style="font-size: 6.5pt; color: #64748B; margin-top: 1mm;">
              Compatible caméra smartphone & lecteurs optiques eGED
            </div>
          </div>

          <!-- CONSIGNES DE SÉCURITÉ & MANIPULATION -->
          <div style="border: 1.5px solid #F59E0B; border-radius: 8px; padding: 3.5mm 4mm; background: #FFFBEB;">
            <div style="display: flex; align-items: center; gap: 2mm; font-size: 8pt; font-weight: 900; color: #B45309; text-transform: uppercase; margin-bottom: 1.5mm;">
              <span>⚠️</span> Consignes Strictes de Sécurité
            </div>
            <ul style="margin: 0; padding-left: 4.5mm; font-size: 7pt; color: #78350F; line-height: 1.4; font-weight: 600;">
              <li style="margin-bottom: 0.8mm;">Port des Équipements de Protection Individuelle (EPI) obligatoire.</li>
              <li style="margin-bottom: 0.8mm;">Ne pas ouvrir, ni transvaser ni manipuler les contenants scellés.</li>
              <li>Matière réservée à la filière officielle de destruction pharmaceutique ABMed.</li>
            </ul>
          </div>

        </div>

      </div>

      <!-- 4. PIED DE PAGE MINIMALISTE PROPRE (SANS SIGNATURES INUTILES) -->
      <div style="margin-top: 5mm; border-top: 1px solid #CBD5E1; padding-top: 3mm; display: flex; justify-content: space-between; align-items: center; font-size: 7pt; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">
        <span>Autorité Béninoise de Régulation du Médicament (ABMed) • eGED-SGIE</span>
        <span>Plateforme Nationale de Traçabilité • www.abmed.bj</span>
      </div>

    </div>
  `;
}

/**
 * Génère le code HTML d'une étiquette individuelle (format rouleau ou planche d'échantillons).
 */
export function renderLabelHtml(item: LabelData, type: 'sample' | 'waste', qrUrl: string, dateStr: string): string {
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
            <img src="${qrUrl}" style="width: 100%; height: 100%; object-fit: contain;" alt="QR Code Récapitulatif" />
          </div>
          <span style="font-size: 3.5pt; font-weight: 700; color: #64748B; margin-top: 0.6mm; text-transform: uppercase; letter-spacing: 0.1px;">Scanner récapitulatif</span>
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
            <div class="lbl-loc-box" style="background: #F8FAFC; border: 0.1mm solid #E2E8F0; border-radius: 0.5mm; color: #475569; font-weight: 700; font-family: monospace; display: flex; gap: 1.5mm;">
              ${item.location ? `
                <span>S:${item.location.salle || '?'}-Z:${item.location.zone || '?'}</span>
                <span>A:${item.location.armoire || '?'}-E:${item.location.etagere || '?'}</span>
              ` : `<span>Loc: Non spécifié</span>`}
            </div>
            
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
 * Lance l'impression d'étiquettes (Planche A4 grand format pour déchets, planche d'échantillons ou rouleaux).
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
  const styleString = getLabelStyles(format, type);
  
  let bodyContent = '';

  if (format === 'A4') {
    if (type === 'waste') {
      // Pour les DÉCHETS en A4 : chaque lot génère une pleine page A4 placard grand format
      bodyContent = items.map(item => `
        <div style="page-break-after: always; width: 100%; min-height: 275mm; box-sizing: border-box;">
          ${renderWasteA4Html(item, qrCodes[item.id] || '', dateStr)}
        </div>
      `).join('');
    } else {
      // Pour les ÉCHANTILLONS en A4 : planche 24 étiquettes adhésives
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
    }
  } else {
    // Format rouleau thermique
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
        <title></title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          ${styleString}
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
 * Dessine une page A4 officielle pour un lot de déchet dans jsPDF.
 */
function drawWasteA4PagePDF(doc: jsPDF, item: LabelData, qrCodeDataUrl: string, dateStr: string) {
  const ex = item.extraData || {};
  const statusInfo = getStatusColor(item.status);

  // 1. Bordure d'encadrement A4
  doc.setDrawColor(220, 38, 38); // Red-600
  doc.setLineWidth(1.2);
  doc.rect(8, 8, 194, 281, 'S');

  // 2. En-tête épuré officiel ABMed
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(220, 38, 38);
  doc.text("ABMed • DÉCHETS PHARMACEUTIQUES", 15, 20);

  doc.setFontSize(8.5);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("FICHE D'IDENTIFICATION & DE TRAÇABILITÉ (FÛT / CARTON)", 15, 26);

  // Réf droite
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("eGED-ABMed • SGIE", 192, 19, { align: 'right' });
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date d'émission : ${dateStr}`, 192, 25, { align: 'right' });

  // Ligne de séparation en-tête
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.8);
  doc.line(15, 30, 192, 30);

  // 3. Bandeau N° Lot Déchet Grand Format
  doc.setFillColor(254, 242, 242); // Red-50
  doc.setDrawColor(252, 165, 165); // Red-300
  doc.setLineWidth(0.6);
  doc.roundedRect(15, 34, 177, 18, 3, 3, 'FD');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  doc.text("N° IDENTIFIANT DU LOT DÉCHET :", 20, 41);

  doc.setFont("Courier", "bold");
  doc.setFontSize(19);
  doc.setTextColor(15, 23, 42);
  doc.text(item.itemNumber, 20, 49);

  if (ex.receptionNumber) {
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Réf. Réception : ${ex.receptionNumber}`, 90, 48);
  }

  // Statut Badge
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(statusInfo.hex);
  doc.setLineWidth(0.6);
  doc.roundedRect(140, 39, 48, 8, 4, 4, 'FD');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(statusInfo.hex);
  doc.text(`● ${item.status || 'Déclaré'}`.toUpperCase(), 164, 44.5, { align: 'center' });

  // 4. Blocs d'informations gauche (X: 15 à 110, W: 95)
  const leftX = 15;
  const leftW = 95;

  // BLOC 1 : CARACTÉRISTIQUES
  let curY = 56;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftX, curY, leftW, 86, 3, 3, 'FD');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28);
  doc.text("1. INFORMATIONS DU DÉCHET", leftX + 4, curY + 6);
  doc.setDrawColor(254, 226, 226);
  doc.line(leftX + 4, curY + 8, leftX + leftW - 4, curY + 8);

  const drawField = (label: string, value: string, yPos: number, isBig = false) => {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, leftX + 4, yPos);

    if (isBig) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(185, 28, 28);
    } else {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
    }
    const safeVal = doc.splitTextToSize(value || '—', 56);
    doc.text(safeVal, leftX + 36, yPos);
  };

  drawField("Classification :", ex.category || item.productName || 'Déchet standard', curY + 15);
  drawField("Dénomination :", item.productName || '—', curY + 24);
  drawField("N° Lot d'origine :", ex.originalBatch || item.batchNumber || '—', curY + 33);
  drawField("Quantité / Poids :", ex.weight || '1 Kg', curY + 44, true);
  drawField("Conditionnement :", ex.packaging || 'Fûts / Cartons scellés', curY + 55);
  drawField("Motif de rejet :", ex.motive || 'Péremption / Non-conformité', curY + 66);

  // BLOC 2 : PROVENANCE & STOCKAGE
  curY = 146;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftX, curY, leftW, 88, 3, 3, 'FD');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 64, 175);
  doc.text("2. PROVENANCE & STOCKAGE", leftX + 4, curY + 6);
  doc.setDrawColor(219, 234, 254);
  doc.line(leftX + 4, curY + 8, leftX + leftW - 4, curY + 8);

  const locRaw = item.location?.raw || (item.location?.salle ? `${item.location.salle} — ${item.location.zone || ''}` : 'Local Déchets Central');
  drawField("Structure Source :", ex.sourceStructure || 'Interne ABMed', curY + 16);
  drawField("Apporteur :", `${ex.depositorName || 'Admin EGED'} ${ex.depositorPhone ? '(' + ex.depositorPhone + ')' : ''}`, curY + 28);
  drawField("Emplacement :", locRaw, curY + 40);
  drawField("Destruction :", ex.destructionPlan || 'En attente de planification', curY + 52);
  drawField("Date d'entrée :", ex.declarationDate || dateStr, curY + 64);

  // 5. Blocs droits : TRÈS GRAND CODE QR & SÉCURITÉ (X: 115 à 192, W: 77)
  const rightX = 115;
  const rightW = 77;

  // CADRE QR CODE GÉANT
  doc.setFillColor(255, 253, 253);
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.8);
  doc.roundedRect(rightX, 56, rightW, 126, 3, 3, 'FD');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27);
  doc.text("CODE QR RÉCAPITULATIF PRODUIT", rightX + rightW / 2, 63, { align: 'center' });

  // Image QR Code Géant (74mm x 74mm)
  if (qrCodeDataUrl) {
    try {
      const qrSize = 74;
      const qrPosX = rightX + (rightW - qrSize) / 2;
      doc.addImage(qrCodeDataUrl, 'PNG', qrPosX, 67, qrSize, qrSize);
    } catch (e) {
      console.error("QR Code image error", e);
    }
  }

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Scannez ce QR Code avec tout smartphone pour", rightX + rightW / 2, 147, { align: 'center' });
  doc.text("afficher le récapitulatif officiel certifié eGED-ABMed.", rightX + rightW / 2, 151, { align: 'center' });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Compatible caméra mobile & terminaux optiques", rightX + rightW / 2, 156, { align: 'center' });

  // CADRE CONSIGNES DE SÉCURITÉ
  doc.setFillColor(255, 251, 235); // Amber-50
  doc.setDrawColor(245, 158, 11); // Amber-500
  doc.setLineWidth(0.5);
  doc.roundedRect(rightX, 186, rightW, 48, 3, 3, 'FD');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text("⚠️ CONSIGNES DE SÉCURITÉ STRICTES", rightX + 4, 193);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(120, 53, 15);
  const secLines = [
    "• Port obligatoire des EPI (gants, masque, blouse).",
    "• Ne pas ouvrir ni manipuler les contenants scellés.",
    "• Stockage exclusif dans le local déchets agréé.",
    "• Matière réservée à l'incinération officielle ABMed."
  ];
  let secY = 200;
  secLines.forEach(l => {
    const wrapped = doc.splitTextToSize(l, rightW - 8);
    doc.text(wrapped, rightX + 4, secY);
    secY += (wrapped.length * 4) + 1.5;
  });

  // 6. Pied de page épuré officiel (AUCUNE SIGNATURE INUTILE)
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(15, 242, 192, 242);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("AUTORITÉ BÉNINOISE DU MÉDICAMENT (ABMed) • eGED-SGIE", 15, 248);
  doc.text("PLATEFORME NATIONALE DE TRAÇABILITÉ • WWW.ABMED.BJ", 192, 248, { align: 'right' });
}

/**
 * Génère et télécharge un PDF d'étiquette(s) ou Fiches A4 Réglementaires.
 */
export function downloadLabelsPDF(items: LabelData[], type: 'sample' | 'waste', qrCodes: Record<string, string>, format: LabelFormat) {
  const isWaste = type === 'waste';
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

  if (format === 'A4' && isWaste) {
    // FORMAT A4 POUR DÉCHETS : Chaque lot génère une pleine page A4 placard grand format
    items.forEach((item, index) => {
      if (index > 0) {
        doc.addPage('a4', 'portrait');
      }
      drawWasteA4PagePDF(doc, item, qrCodes[item.id] || '', dateStr);
    });
  } else if (format === 'A4') {
    // FORMAT A4 POUR ÉCHANTILLONS : Planche 3x8 d'étiquettes adhésives
    const marginX = 8;
    const marginY = 10;
    const labelW = 63.5;
    const labelH = 38.1;
    const gapX = 3;
    const gapY = 3;
    const cols = 3;
    const rows = 7;

    let col = 0;
    let row = 0;

    items.forEach((item, index) => {
      if (index > 0 && col === 0 && row === 0) {
        doc.addPage('a4', 'portrait');
      }

      const x = marginX + col * (labelW + gapX);
      const y = marginY + row * (labelH + gapY);

      drawStandardThermalOrGridLabelPDF(doc, item, x, y, labelW, labelH, 0.95, qrCodes[item.id], dateStr, isWaste);

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
    // Formats rouleaux thermiques standards
    const dims = {
      '50x30': { w: 50, h: 30, scale: 0.8 },
      '60x40': { w: 60, h: 40, scale: 1.0 },
      '100x70': { w: 100, h: 70, scale: 1.5 }
    }[format];

    items.forEach((item, index) => {
      if (index > 0) {
        doc.addPage([dims.w, dims.h], 'landscape');
      }
      drawStandardThermalOrGridLabelPDF(doc, item, 0, 0, dims.w, dims.h, dims.scale, qrCodes[item.id], dateStr, isWaste);
    });
  }

  const filename = isWaste && format === 'A4'
    ? `fiche_a4_dechet_abmed_${Date.now()}.pdf`
    : `etiquettes_eged_abmed_${Date.now()}.pdf`;

  doc.save(filename);
}

/**
 * Dessine une étiquette thermique individuelle ou une case de planche dans jsPDF.
 */
function drawStandardThermalOrGridLabelPDF(
  doc: jsPDF, 
  item: LabelData, 
  x: number, 
  y: number, 
  w: number, 
  h: number, 
  fontScale: number,
  qrCodeDataUrl: string,
  dateStr: string,
  isWaste: boolean
) {
  // 1. Fond blanc
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, w, h, 'F');
  
  // 2. Bordure générale
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.rect(x, y, w, h, 'S');

  // 3. En-tête
  doc.setDrawColor(isWaste ? 217 : 30, isWaste ? 119 : 64, isWaste ? 6 : 175);
  doc.setLineWidth(0.2);
  doc.line(x + 1.5, y + 6.5 * fontScale, x + w - 1.5, y + 6.5 * fontScale);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(5.5 * fontScale);
  doc.setTextColor(isWaste ? 217 : 30, isWaste ? 119 : 64, isWaste ? 6 : 175);
  const title = isWaste ? 'LOT DE DÉCHETS PHARMACEUTIQUES' : 'ÉTIQUETTE OFFICIELLE';
  doc.text(title, x + 8 * fontScale, y + 3 * fontScale);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(3.3 * fontScale);
  doc.setTextColor(100, 116, 139);
  doc.text("PLATEFORME NATIONALE DE GESTION eGED-ABMed", x + 8 * fontScale, y + 5 * fontScale);

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
    if (qrCodeDataUrl) {
      doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    }
  } catch (e) {
    console.error("Failed to add image to PDF", e);
  }
  
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.1);
  doc.rect(qrX - 0.2, qrY - 0.2, qrSize + 0.4, qrSize + 0.4, 'S');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(2.6 * fontScale);
  doc.setTextColor(148, 163, 184);
  doc.text("SCANNER RÉCAP", qrX + qrSize / 2, qrY + qrSize + 2 * fontScale, { align: 'center' });

  // 5. Informations Produit
  const infoX = qrX + qrSize + 3 * fontScale;
  let infoY = y + 10 * fontScale;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(5.5 * fontScale);
  doc.setTextColor(15, 23, 42);
  const wrappedName = doc.splitTextToSize((item.productName || '').toUpperCase(), w - infoX - 2);
  doc.text(wrappedName, infoX, infoY);
  
  infoY += (wrappedName.length * 3) * fontScale;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(4.3 * fontScale);
  doc.setTextColor(51, 65, 85);
  
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

  // Localisation
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  const locW = 28 * fontScale;
  const locH = 4 * fontScale;
  doc.rect(infoX, infoY - 2.8 * fontScale, locW, locH, 'FD');
  
  doc.setFont("Courier", "bold");
  doc.setFontSize(3.6 * fontScale);
  doc.setTextColor(71, 85, 105);
  const locText = item.location 
    ? `S:${item.location.salle || '?'}-Z:${item.location.zone || '?'}-A:${item.location.armoire || '?'}`
    : 'Loc: Non specifie';
  doc.text(locText, infoX + 1, infoY - 1 * fontScale);

  // Statut
  const statusInfo = getStatusColor(item.status);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(3.8 * fontScale);
  doc.setTextColor(71, 85, 105);
  doc.text(statusInfo.text.toUpperCase(), infoX + locW + 3 * fontScale, infoY - 1 * fontScale);

  // Pied de page
  doc.setDrawColor(241, 245, 249);
  doc.line(x + 1.5, y + h - 4.5 * fontScale, x + w - 1.5, y + h - 4.5 * fontScale);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(3.3 * fontScale);
  doc.setTextColor(148, 163, 184);
  doc.text("AUTORITE BENINOISE DE REGULATION DU MEDICAMENT", x + 2 * fontScale, y + h - 1.5 * fontScale);
  doc.text("WWW.ABMED.BJ", x + w - 15 * fontScale, y + h - 1.5 * fontScale, { align: 'right' } as any);
}
