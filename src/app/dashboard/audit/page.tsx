import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Shield, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  const { data: dbLogs } = await supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      entity_type,
      ip_address,
      created_at,
      users ( first_name, last_name, role )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  // Mock data si la table est vide pour démonstration
  const logs = dbLogs?.length ? dbLogs : [
    { id: '1', action: 'Connexion', entity_type: 'Système', ip_address: '192.168.1.45', created_at: new Date().toISOString(), users: { first_name: 'Kadia', last_name: 'Barry', role: 'Administrateur' } },
    { id: '2', action: 'Création', entity_type: 'Échantillon ECH-2026-004', ip_address: '192.168.1.12', created_at: new Date(Date.now() - 3600000).toISOString(), users: { first_name: 'Moussa', last_name: 'Traoré', role: 'Responsable' } },
    { id: '3', action: 'Suppression', entity_type: 'Document V1.pdf', ip_address: '10.0.0.5', created_at: new Date(Date.now() - 7200000).toISOString(), users: { first_name: 'Kadia', last_name: 'Barry', role: 'Administrateur' } },
  ]

  const getBadgeForAction = (action: string) => {
    switch (action) {
      case 'Connexion': return 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
      case 'Création': return 'bg-validation/10 text-validation border-validation/20 hover:bg-validation/20'
      case 'Modification': return 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20'
      case 'Suppression': return 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Journal d'Audit</h2>
          <p className="text-muted-foreground mt-1">Traçabilité complète des actions effectuées sur la plateforme.</p>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm">
        <div className="p-4 border-b border-border/50 flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 rounded-t-xl">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher une action, un utilisateur..." className="pl-9 h-10 bg-background" />
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
              {logs.map((log: any) => (
                <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-muted-foreground text-sm font-medium">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-3 w-3" />
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{log.users.first_name} {log.users.last_name}</div>
                    <div className="text-xs text-muted-foreground">{log.users.role}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getBadgeForAction(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground">{log.entity_type}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{log.ip_address}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
