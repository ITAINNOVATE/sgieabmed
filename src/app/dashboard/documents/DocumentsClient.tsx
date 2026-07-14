"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, FileText, Download, FileIcon, FileImage, FileCode2, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"

interface DocumentsClientProps {
  initialDocuments: any[]
  samplesList: any[]
}

const getFileIcon = (type: string) => {
  if (type.includes('Certificat')) return <FileCode2 className="h-4 w-4 text-primary" />
  if (type.includes('Photo') || type.includes('Image')) return <FileImage className="h-4 w-4 text-warning" />
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
        // Pre-fill title with file name without extension
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
      // 1. Upload to Supabase Storage
      const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'))
      const filePath = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)

      if (uploadError) {
        // If bucket doesn't exist, try to create it first
        if (uploadError.message.includes('bucket not found') || uploadError.message.includes('does not exist')) {
          toast.loading("Création du bucket 'documents'...", { id: toastId })
          const { error: bucketError } = await supabase.storage.createBucket('documents', { public: true })
          if (bucketError) throw new Error("Le dossier 'documents' de Supabase n'a pas pu être créé automatiquement. Veuillez le créer manuellement dans votre console.")
          
          // Retry upload
          const { error: retryError } = await supabase.storage.from('documents').upload(filePath, selectedFile)
          if (retryError) throw retryError
        } else {
          throw uploadError
        }
      }

      // 2. Get Public URL
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
      const fileUrl = urlData.publicUrl

      // 3. Get Auth User
      const { data: { user } } = await supabase.auth.getUser()

      // 4. Save metadata in DB
      const { error: dbError } = await supabase.from('documents').insert({
        title: docTitle || selectedFile.name,
        document_type: docType,
        file_url: fileUrl,
        sample_id: associatedSample || null,
        uploaded_by: user?.id || null,
        version: 1
      })

      if (dbError) throw dbError

      toast.success("Document importé et enregistré avec succès !", { id: toastId })
      setShowUploadModal(false)
      // Reset form
      setDocTitle("")
      setDocType("Certificat d'analyse")
      setAssociatedSample("")
      setSelectedFile(null)
      
      // Reload page to fetch updated list
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
      toast.warning("Fichier simulé : Ce document de démonstration ne possède pas de fichier réel.")
      return
    }
    window.open(fileUrl, "_blank")
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion Documentaire</h2>
          <p className="text-muted-foreground text-sm mt-1">Centralisation des certificats d'analyse, rapports et pièces jointes.</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="shadow-md transition-transform active:scale-[0.98]">
          <UploadCloud className="mr-2 h-4 w-4" /> Importer un document
        </Button>
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm">
        <div className="p-4 border-b border-border/50 flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 rounded-t-xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher par titre, échantillon..." 
                className="pl-9 h-10 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
              <SelectTrigger className="h-10 w-full sm:w-48 bg-background">
                <SelectValue placeholder="Type de document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="Certificat d'analyse">Certificat d'analyse</SelectItem>
                <SelectItem value="Rapport d'essai">Rapport d'essai</SelectItem>
                <SelectItem value="Formulaire de réception">Formulaire de réception</SelectItem>
                <SelectItem value="Rapport de destruction">Rapport de destruction</SelectItem>
                <SelectItem value="Photo de destruction">Photo de destruction</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
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
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2 opacity-50" />
                      <p>Aucun document trouvé.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => (
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleDownload(doc.file_url, doc.title)}
                      >
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

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-bold text-lg">Importer un document</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowUploadModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Fichier *</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 mb-2 text-primary" />
                      <p className="text-xs text-foreground/80 font-medium">
                        {selectedFile ? selectedFile.name : "Cliquez pour sélectionner un fichier"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">PDF, PNG, JPG, JPEG (Max 10Mo)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.png,.jpg,.jpeg" 
                      onChange={handleFileChange} 
                      required 
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Titre du document *</label>
                <Input 
                  placeholder="Ex: Certificat d'analyse Lot X" 
                  value={docTitle} 
                  onChange={(e) => setDocTitle(e.target.value)} 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Type de document *</label>
                <Select value={docType} onValueChange={(val) => setDocType(val || "Certificat d'analyse")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Certificat d'analyse">Certificat d'analyse</SelectItem>
                    <SelectItem value="Rapport d'essai">Rapport d'essai</SelectItem>
                    <SelectItem value="Formulaire de réception">Formulaire de réception</SelectItem>
                    <SelectItem value="Rapport de destruction">Rapport de destruction</SelectItem>
                    <SelectItem value="Photo de destruction">Photo de destruction</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Associer à un échantillon (Optionnel)</label>
                <Select value={associatedSample} onValueChange={(val) => setAssociatedSample(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun échantillon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun échantillon</SelectItem>
                    {samplesList.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.sample_number} - {s.commercial_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                <Button type="button" variant="outline" onClick={() => setShowUploadModal(false)} disabled={isUploading}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isUploading} className="shadow-sm">
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
