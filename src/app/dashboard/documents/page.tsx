import { Button } from "@/components/ui/button"
import { UploadCloud } from "lucide-react"
import { supabase } from "@/lib/supabase"
import DocumentsClient from "./DocumentsClient"

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const { data: dbDocuments } = await supabase
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
    .order('uploaded_at', { ascending: false })

  const documents = dbDocuments?.map(doc => ({
    id: doc.id,
    title: doc.title,
    type: doc.document_type,
    // @ts-ignore
    sample: doc.samples ? `${doc.samples.sample_number} - ${doc.samples.commercial_name}` : 'N/A',
    version: `v${doc.version}`,
    // @ts-ignore
    author: doc.users ? `${doc.users.first_name} ${doc.users.last_name}` : 'Système',
    date: new Date(doc.uploaded_at).toLocaleDateString('fr-FR')
  })) || []

  // Mock data si la table est vide pour démonstration
  const displayDocuments = documents.length ? documents : [
    { id: '1', title: 'Certificat d\'Analyse Amoxicilline', type: "Certificat d'analyse", sample: 'ECH-001 - Amoxicilline 500mg', version: 'v1.0', author: 'Kadia Barry', date: new Date().toLocaleDateString('fr-FR') },
    { id: '2', title: 'Photo destruction ECH-002', type: 'Photo de destruction', sample: 'ECH-002 - Ibuprofène 400mg', version: 'v1.0', author: 'Moussa Traoré', date: new Date(Date.now() - 86400000).toLocaleDateString('fr-FR') },
    { id: '3', title: 'Rapport Destruction trimestriel Q2', type: 'Rapport de destruction', sample: 'N/A', version: 'v2.1', author: 'System', date: new Date(Date.now() - 172800000).toLocaleDateString('fr-FR') }
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion Documentaire</h2>
          <p className="text-muted-foreground mt-1">Centralisation des certificats d'analyse, rapports et pièces jointes.</p>
        </div>
        <Button className="shadow-md transition-transform active:scale-[0.98]">
          <UploadCloud className="mr-2 h-4 w-4" /> Importer un document
        </Button>
      </div>

      <DocumentsClient initialDocuments={displayDocuments} />
    </div>
  )
}
