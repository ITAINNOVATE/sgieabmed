"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, FileText, Download, FileIcon, FileImage, FileCode2 } from "lucide-react"
import { toast } from "sonner"

interface DocumentsClientProps {
  initialDocuments: any[]
}

const getFileIcon = (type: string) => {
  if (type.includes('Certificat')) return <FileCode2 className="h-4 w-4 text-primary" />
  if (type.includes('Photo') || type.includes('Image')) return <FileImage className="h-4 w-4 text-warning" />
  return <FileIcon className="h-4 w-4 text-muted-foreground" />
}

export default function DocumentsClient({ initialDocuments }: DocumentsClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const filteredDocuments = initialDocuments.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.sample.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesType = typeFilter === "all" || doc.type === typeFilter
    
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
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
                <SelectItem value="Photo de destruction">Photo de destruction</SelectItem>
                <SelectItem value="Rapport de destruction">Rapport de destruction</SelectItem>
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
                        onClick={() => toast.info("Téléchargement du fichier en cours de développement")}
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
    </div>
  )
}
