export interface AttachedSampleDocument {
  id: string
  file_name: string
  file_size?: string
  file_size_formatted?: string
  file_type?: string
  mime_type?: string
  title?: string
  doc_type?: string
  document_type?: string
  description?: string
  file_data?: string // base64 Data URL
  data_url?: string
  uploaded_at?: string
  created_at?: string
}

export interface SampleArchivedDocument {
  id: string
  reception_number?: string
  sample_number?: string
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

export const SAMPLE_DOCUMENT_TYPES = [
  "Bordereau de livraison / lettre de transmission apporteur",
  "Certificat d'analyse fabricant (CoA)",
  "Facture proforma / commerciale",
  "Procès-verbal de prélèvement / constat",
  "Fiche technique / notice fabricant",
  "Copie pièce d'identité du déposant",
  "Bordereau de réception officiel eGED",
  "Autre pièce justificative apporteur",
] as const
