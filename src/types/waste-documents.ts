export interface AttachedWasteDocument {
  id: string
  file_name: string
  file_size?: string
  file_size_formatted?: string
  file_type?: string
  mime_type?: string
  doc_type?: string
  document_type?: string
  description?: string
  file_data?: string // base64 Data URL
  data_url?: string
  uploaded_at?: string
  created_at?: string
}

export interface WasteArchivedDocument {
  id: string
  reception_number?: string
  source_structure: string
  source_type?: string
  city?: string
  depositor_name?: string
  depositor_phone?: string
  date?: string
  reception_date?: string
  doc_category?: string
  category?: "piece_apporteur" | "acte_administratif" | string
  doc_type?: string
  document_type?: string
  title?: string
  file_name: string
  file_size?: string
  file_size_formatted?: string
  file_type?: string
  mime_type?: string
  file_data?: string // base64 Data URL
  data_url?: string
  description?: string
  created_at?: string
}

export const WASTE_DOCUMENT_TYPES = [
  "Bordereau de livraison / lettre de transmission apporteur",
  "Inventaire détaillé des produits périmés apportés",
  "Procès-verbal de constat / déclassement",
  "Copie pièce d'identité du déposant",
  "Attestation eGED / Bordereau officiel",
  "Certificat / Attestation de destruction",
  "Autre pièce justificative apporteur",
] as const
