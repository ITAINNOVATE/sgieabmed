"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Shield, Clock } from "lucide-react"

interface AuditClientProps {
  initialLogs: any[]
}

export default function AuditClient({ initialLogs }: AuditClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")

  const getBadgeForAction = (action: string) => {
    switch (action) {
      case 'Connexion': return 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
      case 'Création': return 'bg-validation/10 text-validation border-validation/20 hover:bg-validation/20'
      case 'Modification': return 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20'
      case 'Suppression': return 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const filteredLogs = initialLogs.filter(log => {
    const userName = log.users ? `${log.users.first_name} ${log.users.last_name}` : ""
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userName.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesAction = actionFilter === "all" || log.action === actionFilter
    
    return matchesSearch && matchesAction
  })

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/50 rounded-xl shadow-sm">
        <div className="p-4 border-b border-border/50 flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 rounded-t-xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher par action, utilisateur..." 
                className="pl-9 h-10 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={(val) => setActionFilter(val || "all")}>
              <SelectTrigger className="h-10 w-full sm:w-44 bg-background">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="Connexion">Connexion</SelectItem>
                <SelectItem value="Création">Création</SelectItem>
                <SelectItem value="Modification">Modification</SelectItem>
                <SelectItem value="Suppression">Suppression</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <Shield className="h-4 w-4 text-primary" /> Conformité Réglementaire Assurée
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-foreground">Date & Heure</TableHead>
                <TableHead className="font-semibold text-foreground">Utilisateur</TableHead>
                <TableHead className="font-semibold text-foreground">Action</TableHead>
                <TableHead className="font-semibold text-foreground">Entité / Cible</TableHead>
                <TableHead className="font-semibold text-foreground">Adresse IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    Aucun log d'audit trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="text-muted-foreground text-sm font-medium">
                      <div className="flex items-center">
                        <Clock className="mr-2 h-3 w-3" />
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.users ? `${log.users.first_name} ${log.users.last_name}` : "Système"}</div>
                      <div className="text-xs text-muted-foreground">{log.users?.role || "Automatique"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getBadgeForAction(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{log.entity_type}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{log.ip_address}</TableCell>
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
