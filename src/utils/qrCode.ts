import QRCode from 'qrcode'

export interface SampleQRData {
  id: string
  sample_number: string
  reception_ref?: string
  commercial_name: string
  dci?: string
  dosage?: string
  pharmaceutical_form?: string
  batch_number: string
  expiry_date?: string
  quantity?: number | string
  unit?: string
  manufacturer_name?: string
  current_location?: string
  status?: string
}

export interface WasteQRData {
  id: string
  batch_number: string
  reception_number?: string
  waste_type: string
  commercial_name?: string
  original_batch?: string
  quantity: number | string
  unit?: string
  packaging?: string
  packaging_condition?: string
  source_structure?: string
  source_type?: string
  depositor_name?: string
  depositor_phone?: string
  recipient_agent?: string
  destruction_motive?: string
  current_location?: string
  status?: string
  reception_date?: string
  destruction_plan_ref?: string
}

/**
 * Formate le texte récapitulatif complet d'un échantillon pour encodage dans le QR Code.
 */
export function formatSampleQRText(sample: Partial<SampleQRData> & { id: string }, origin = 'https://eged-abmed.gov.bj'): string {
  const lines = [
    'RÉPUBLIQUE DU BÉNIN — ABMed',
    'eGED-SGIE | ÉCHANTILLON PHARMACEUTIQUE',
    '----------------------------------------',
    `N° Échantillon : ${sample.sample_number || sample.id}`,
    sample.reception_ref ? `Réf. Réception : ${sample.reception_ref}` : null,
    `Produit        : ${sample.commercial_name || 'N/A'}`,
    sample.dci ? `DCI            : ${sample.dci}` : null,
    (sample.dosage || sample.pharmaceutical_form) 
      ? `Dosage / Forme : ${[sample.dosage, sample.pharmaceutical_form].filter(Boolean).join(' - ')}` 
      : null,
    `N° de Lot      : ${sample.batch_number || 'N/A'}`,
    sample.expiry_date ? `Péremption     : ${sample.expiry_date.includes('T') ? new Date(sample.expiry_date).toLocaleDateString('fr-FR') : sample.expiry_date}` : null,
    sample.quantity !== undefined ? `Quantité       : ${sample.quantity} ${sample.unit || 'Boîtes'}` : null,
    sample.manufacturer_name ? `Fabricant      : ${sample.manufacturer_name}` : null,
    sample.current_location ? `Emplacement    : ${sample.current_location}` : null,
    sample.status ? `Statut         : ${sample.status}` : null,
    '----------------------------------------',
    `Fiche : ${origin}/dashboard/samples/${sample.id}`
  ].filter(Boolean)

  return lines.join('\n')
}

/**
 * Formate le texte récapitulatif complet d'un déchet pharmaceutique pour encodage dans le QR Code.
 */
export function formatWasteQRText(waste: Partial<WasteQRData> & { id: string }, origin = 'https://eged-abmed.gov.bj'): string {
  const lines = [
    'RÉPUBLIQUE DU BÉNIN — ABMed',
    'eGED-SGIE | DÉCHET PHARMACEUTIQUE',
    '----------------------------------------',
    `N° Lot Déchet  : ${waste.batch_number || waste.id}`,
    waste.reception_number ? `Réf. Réception : ${waste.reception_number}` : null,
    `Classification : ${waste.waste_type || 'Déchet pharmaceutique'}`,
    waste.commercial_name ? `Désignation    : ${waste.commercial_name}` : null,
    waste.original_batch ? `Lot d'origine  : ${waste.original_batch}` : null,
    `Quantité/Poids : ${waste.quantity || 1} ${waste.unit || 'Kg'}`,
    waste.packaging ? `Conditionnement: ${waste.packaging}` : null,
    waste.source_structure ? `Provenance     : ${waste.source_structure}` : null,
    waste.depositor_name ? `Apporteur      : ${waste.depositor_name}${waste.depositor_phone ? ` (${waste.depositor_phone})` : ''}` : null,
    waste.destruction_motive ? `Motif Rejet    : ${waste.destruction_motive}` : null,
    waste.reception_date ? `Date Réception : ${waste.reception_date.includes('T') ? new Date(waste.reception_date).toLocaleDateString('fr-FR') : waste.reception_date}` : null,
    waste.current_location ? `Emplacement    : ${waste.current_location}` : null,
    waste.status ? `Statut         : ${waste.status}` : null,
    waste.destruction_plan_ref ? `Plan Destr.    : ${waste.destruction_plan_ref}` : null,
    '----------------------------------------',
    `Fiche : ${origin}/dashboard/waste/${waste.id}`
  ].filter(Boolean)

  return lines.join('\n')
}

/**
 * Interface pour les données encodées dans le QR Code d'un colis groupé de déchets.
 */
export interface GroupedPackageQRData {
  id: string
  package_number: string
  package_name: string
  package_type: string
  total_weight: number
  unit: string
  current_location: string
  itemsCount: number
  itemsSummary: string[]
  status?: string
  date?: string
}

/**
 * Formate le texte récapitulatif complet d'un colis groupé pour encodage dans le QR Code.
 */
export function formatGroupedPackageQRText(pkg: GroupedPackageQRData, origin = 'https://eged-abmed.gov.bj'): string {
  const lines = [
    'RÉPUBLIQUE DU BÉNIN — ABMed',
    'eGED-SGIE | COLIS GROUPÉ DE DÉCHETS',
    '----------------------------------------',
    `N° Colis / Sac : ${pkg.package_number}`,
    `Désignation    : ${pkg.package_name}`,
    `Contenant      : ${pkg.package_type}`,
    `Poids Total    : ${pkg.total_weight} ${pkg.unit || 'Kg'}`,
    `Nombre Lots    : ${pkg.itemsCount} article(s) groupé(s)`,
    pkg.current_location ? `Emplacement    : ${pkg.current_location}` : null,
    pkg.status ? `Statut         : ${pkg.status}` : null,
    pkg.date ? `Date Groupage  : ${pkg.date}` : null,
    '----------------------------------------',
    'Détail des lots contenus :',
    ...pkg.itemsSummary.slice(0, 6).map(s => `• ${s}`),
    pkg.itemsSummary.length > 6 ? `• ... et ${pkg.itemsSummary.length - 6} autre(s) lot(s)` : null,
    '----------------------------------------',
    `Vérification : ${origin}/dashboard/waste/stock?colis=${pkg.package_number}`
  ].filter(Boolean)

  return lines.join('\n')
}

/**
 * Génère une URL de données (Data URL Base64) pour un QR Code à partir d'un texte donné.
 * Utilisable côté client ou serveur.
 */
export async function generateQRCodeDataUrl(text: string, options?: { width?: number; margin?: number }): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: options?.margin ?? 1,
      width: options?.width ?? 280,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (err) {
    console.error('Erreur lors de la génération du QR Code:', err)
    return ''
  }
}
