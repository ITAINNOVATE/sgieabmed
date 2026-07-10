import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, FileText, Download, UploadCloud, FileIcon, FileImage, FileCode2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

const getFileIcon = (type: string) => {
  if (type.includes('Certificat')) return <FileCode2 className="h-4 w-4 text-primary" />
  if (type.includes('Photo') || type.includes('Image')) return <FileImage className="h-4 w-4 text-warning" />
  return <FileIcon className="h-4 w-4 text-muted-foreground" />
}

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

      <div className="bg-card border border-border/50 rounded-xl shadow-sm">
        <div className="p-4 border-b border-border/50 flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 rounded-t-xl">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un document..." className="pl-9 h-10 bg-background" />
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-foreground">Document</TableHead>
                <TableHead className="font-semibold text-foreground">Échantillon Lié</TableHead>
                <TableHead className="font-semibold text-foreground">Type</TableHead>
                <TableHead className="font-semibold text-foreground">Version</TableHead>
                <TableHead className="font-semibold text-foreground">Importé par</TableHead>
                <TableHead className="font-semibold text-foreground">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2 opacity-50" />
                      <p>Aucun document trouvé dans la base documentaire.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted border border-border/50">
                          {getFileIcon(doc.type)}
                        </div>
                        <span className="font-medium text-foreground">{doc.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{doc.sample}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{doc.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">{doc.version}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.author}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.date}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 hover:text-primary">
                        <Download className="mr-2 h-4 w-4" /> Télécharger
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
