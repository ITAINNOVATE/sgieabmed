"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, FileText, Download, FileIcon, FileImage, FileCode2, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"

interface DocumentsClientProps {
  initialDocuments: any[]
  samplesList: any[]
}

const getFileIcon = (type: string) => {
  if (type.includes('Certificat')) return <FileCode2 className="h-4 w-4 text-[#1B5C2E]" />
  if (type.includes('Photo') || type.includes('Image')) return <FileImage className="h-4 w-4 text-amber-600" />
  return <FileIcon className="h-4 w-4 text-muted-foreground" />
}

export default function DocumentsClient({ initialDocuments, samplesList }: DocumentsClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [docTitle, setDocTitle] = useState("")
  const [docType, setDocType] = useState("Certificat d'analyse")
  const [associatedSample, setAssociatedSample] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const supabase = createClient()

  const filteredDocuments = initialDocuments.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.sample.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesType = typeFilter === "all" || doc.type === typeFilter
    
    return matchesSearch && matchesType
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (!docTitle) {
        setDocTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name)
      }
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      toast.error("Veuillez sélectionner un fichier.")
      return
    }

    setIsUploading(true)
    const toastId = toast.loading("Téléversement du fichier en cours...")

    try {
      const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'))
      const filePath = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)

      if (uploadError) {
        if (uploadError.message.includes('bucket not found') || uploadError.message.includes('does not exist')) {
          await supabase.storage.createBucket('documents', { public: true })
          const { error: retryError } = await supabase.storage.from('documents').upload(filePath, selectedFile)
          if (retryError) throw retryError
        } else {
          throw uploadError
        }
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
      const fileUrl = urlData.publicUrl
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('documents').insert({
        title: docTitle || selectedFile.name,
        document_type: docType,
        file_url: fileUrl,
        sample_id: associatedSample || null,
        uploaded_by: user?.id || null,
        version: 1
      })

      toast.success("Document importé avec succès !", { id: toastId })
      setShowUploadModal(false)
      setDocTitle("")
      setDocType("Certificat d'analyse")
      setAssociatedSample("")
      setSelectedFile(null)
      window.location.reload()
    } catch (error: any) {
      console.error(error)
      toast.error(`Erreur: ${error.message || "Impossible d'importer le document"}`, { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = (fileUrl: string, title: string) => {
    if (!fileUrl || fileUrl === "#") {
      toast.warning("Fichier exemple : document de démonstration.")
      return
    }
    window.open(fileUrl, "_blank")
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-full">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#1B5C2E]" />
            Gestion Documentaire
          </h2>
          <p className="text-muted-foreground text-xs">Centralisation des certificats d'analyse, BSD, comptes-rendus et pièces jointes.</p>
        </div>
        <Button size="sm" onClick={() => setShowUploadModal(true)} className="bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-2xs text-xs font-bold gap-1.5 h-8 px-3 border-0">
          <UploadCloud className="h-3.5 w-3.5" /> Importer un document
        </Button>
      </div>

      {/* TABLEAU DES DOCUMENTS (STATIQUE 1-ÉCRAN SANS TRONCATURE) */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden w-full">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Documents Référencés ({filteredDocuments.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-8 h-8 text-xs bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
                <SelectTrigger className="h-8 w-36 text-xs bg-background">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="Certificat d'analyse">Certificat</SelectItem>
                  <SelectItem value="Rapport d'essai">Rapport</SelectItem>
                  <SelectItem value="Formulaire de réception">Réception</SelectItem>
                  <SelectItem value="Photo de destruction">Photo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="w-full text-xs">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="py-2 text-[10.5px] font-bold uppercase pl-3 whitespace-nowrap">Document</TableHead>
                  <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Échantillon Lié</TableHead>
                  <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Type</TableHead>
                  <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Version</TableHead>
                  <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Importé Par</TableHead>
                  <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Date</TableHead>
                  <TableHead className="py-2 text-[10.5px] font-bold uppercase text-right pr-3 whitespace-nowrap">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-16 text-center text-xs text-muted-foreground">Aucun document trouvé.</TableCell></TableRow>
                ) : (
                  filteredDocuments.slice(0, 5).map((doc) => (
                    <TableRow key={doc.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="pl-3 py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-muted border border-border/50 shrink-0">
                            {getFileIcon(doc.type)}
                          </div>
                          <span className="font-bold text-foreground truncate max-w-[180px]">{doc.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 text-muted-foreground whitespace-nowrap truncate max-w-[160px]">{doc.sample}</TableCell>
                      <TableCell className="py-1.5 whitespace-nowrap">
                        <Badge variant="outline" className="text-[9.5px] px-1.5 py-0 bg-background font-normal">{doc.type}</Badge>
                      </TableCell>
                      <TableCell className="py-1.5 font-mono text-muted-foreground whitespace-nowrap">{doc.version}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground whitespace-nowrap">{doc.author}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground whitespace-nowrap">{doc.date}</TableCell>
                      <TableCell className="py-1.5 text-right pr-3 whitespace-nowrap">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[11px] px-2 text-[#1B5C2E] font-bold hover:bg-[#1B5C2E]/10 shrink-0"
                          onClick={() => handleDownload(doc.file_url, doc.title)}
                        >
                          <Download className="h-3 w-3 mr-1 shrink-0" /> Télécharger
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-bold text-sm">Importer un document</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setShowUploadModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-4 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold">Fichier *</label>
                <input 
                  type="file" 
                  className="w-full text-xs p-2 border rounded-lg bg-background" 
                  accept=".pdf,.png,.jpg,.jpeg" 
                  onChange={handleFileChange} 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">Titre du document *</label>
                <Input 
                  placeholder="" 
                  className="h-8 text-xs"
                  value={docTitle} 
                  onChange={(e) => setDocTitle(e.target.value)} 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">Type de document *</label>
                <Select value={docType} onValueChange={(val) => setDocType(val || "Certificat d'analyse")}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Certificat d'analyse">Certificat d'analyse</SelectItem>
                    <SelectItem value="Rapport d'essai">Rapport d'essai</SelectItem>
                    <SelectItem value="Formulaire de réception">Formulaire de réception</SelectItem>
                    <SelectItem value="Rapport de destruction">Rapport de destruction</SelectItem>
                    <SelectItem value="Photo de destruction">Photo de destruction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowUploadModal(false)} disabled={isUploading}>
                  Annuler
                </Button>
                <Button type="submit" size="sm" disabled={isUploading} className="bg-[#1B5C2E] hover:bg-[#154824] text-white">
                  {isUploading ? "Importation..." : "Importer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
