import { supabase } from "@/lib/supabase"
import DocumentsClient from "./DocumentsClient"

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const [docsResult, samplesResult] = await Promise.all([
    supabase
      .from('documents')
      .select(`
        id,
        title,
        document_type,
        file_url,
        version,
        uploaded_at,
        samples ( sample_number, commercial_name ),
        users!uploaded_by ( first_name, last_name )
      `)
      .order('uploaded_at', { ascending: false }),
    supabase
      .from('samples')
      .select('id, sample_number, commercial_name')
      .order('sample_number', { ascending: false })
  ])

  const dbDocuments = docsResult.data
  const samplesList = samplesResult.data || []

  const documents = dbDocuments?.map(doc => ({
    id: doc.id,
    title: doc.title,
    type: doc.document_type,
    // @ts-ignore
    sample: doc.samples ? `${doc.samples.sample_number} - ${doc.samples.commercial_name}` : 'N/A',
    version: `v${doc.version}`,
    // @ts-ignore
    author: doc.users ? `${doc.users.first_name} ${doc.users.last_name}` : 'Système',
    date: new Date(doc.uploaded_at).toLocaleDateString('fr-FR'),
    file_url: doc.file_url
  })) || []

  // Mock data si la table est vide pour démonstration
  const displayDocuments = documents.length ? documents : [
    { id: '1', title: 'Certificat d\'Analyse Amoxicilline', type: "Certificat d'analyse", sample: 'ECH-001 - Amoxicilline 500mg', version: 'v1.0', author: 'Kadia Barry', date: new Date().toLocaleDateString('fr-FR'), file_url: '#' },
    { id: '2', title: 'Photo destruction ECH-002', type: 'Photo de destruction', sample: 'ECH-002 - Ibuprofène 400mg', version: 'v1.0', author: 'Moussa Traoré', date: new Date(Date.now() - 86400000).toLocaleDateString('fr-FR'), file_url: '#' },
    { id: '3', title: 'Rapport Destruction trimestriel Q2', type: 'Rapport de destruction', sample: 'N/A', version: 'v2.1', author: 'System', date: new Date(Date.now() - 172800000).toLocaleDateString('fr-FR'), file_url: '#' }
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      <DocumentsClient initialDocuments={displayDocuments} samplesList={samplesList} />
    </div>
  )
}
