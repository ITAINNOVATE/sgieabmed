"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { History, Terminal, Search, ShieldCheck } from "lucide-react"
import { 
  getLoginLogs, getAuditLogs, LoginLog, AdminAuditLog 
} from "../adminMockData"

export default function AuditAdminPage() {
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([])
  const [activeTab, setActiveTab] = useState<"connections" | "audit">("connections")
  const [loading, setLoading] = useState(true)

  // Filtering states
  const [searchUsername, setSearchUsername] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState("all")

  useEffect(() => {
    async function load() {
      const [login, audit] = await Promise.all([
        getLoginLogs(),
        getAuditLogs()
      ])
      setLoginLogs(login)
      setAuditLogs(audit)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>
  }

  // --- FILTER CONNECTIONS ---
  const filteredConnections = loginLogs.filter(log => {
    const matchUser = log.username.toLowerCase().includes(searchUsername.toLowerCase())
    const matchType = eventTypeFilter === "all" || log.event_type === eventTypeFilter
    return matchUser && matchType
  })

  // --- FILTER AUDIT ---
  const filteredAudits = auditLogs.filter(log => {
    const matchUser = log.username.toLowerCase().includes(searchUsername.toLowerCase()) || 
                      log.details.toLowerCase().includes(searchUsername.toLowerCase()) ||
                      log.action.toLowerCase().includes(searchUsername.toLowerCase())
    return matchUser
  })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Journaux de Traçabilité & Audits</h2>
        <p className="text-muted-foreground mt-1">
          Historique inaltérable des connexions et des modifications d'accès apportées au système.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-muted/65 p-1 rounded-xl w-fit border border-border/50">
        <Button 
          variant={activeTab === "connections" ? "secondary" : "ghost"}
          className="rounded-lg h-9 text-xs px-4"
          onClick={() => {
            setActiveTab("connections")
            setSearchUsername("")
            setEventTypeFilter("all")
          }}
        >
          Journal des Connexions
        </Button>
        <Button 
          variant={activeTab === "audit" ? "secondary" : "ghost"}
          className="rounded-lg h-9 text-xs px-4"
          onClick={() => {
            setActiveTab("audit")
            setSearchUsername("")
            setEventTypeFilter("all")
          }}
        >
          Journal d'Audit d'Administration
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="border-border/50 shadow-sm rounded-2xl bg-card">
        <CardContent className="p-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={activeTab === "connections" ? "Rechercher par identifiant..." : "Rechercher par identifiant, action, détails..."}
              className="pl-9 h-10 text-xs"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
            />
          </div>

          {activeTab === "connections" && (
            <Select value={eventTypeFilter} onValueChange={(val) => setEventTypeFilter(val || "all")}>
              <SelectTrigger className="w-[200px] h-10 text-xs">
                <SelectValue placeholder="Type d'événement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les événements</SelectItem>
                <SelectItem value="Connexion">Connexions réussies</SelectItem>
                <SelectItem value="Déconnexion">Déconnexions</SelectItem>
                <SelectItem value="Échec de connexion">Échecs de connexion</SelectItem>
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Connection Logs view */}
      {activeTab === "connections" ? (
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
          <CardHeader className="pb-4 bg-muted/10 border-b border-border/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Historique des Sessions Utilisateurs
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Traçabilité des connexions et durées de session. Ce journal est inaltérable.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="pl-4">Date & Heure</TableHead>
                    <TableHead>Identifiant</TableHead>
                    <TableHead>Événement</TableHead>
                    <TableHead>Adresse IP</TableHead>
                    <TableHead>Navigateur / Système</TableHead>
                    <TableHead className="pr-4 text-right">Durée de session</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConnections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Aucun log de connexion trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConnections.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/10 align-middle">
                        <TableCell className="pl-4 text-xs font-mono">
                          {new Date(log.created_at).toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground">
                          {log.username}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              log.event_type === "Connexion"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : log.event_type === "Déconnexion"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }
                          >
                            {log.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.ip_address}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {log.user_agent}
                        </TableCell>
                        <TableCell className="pr-4 text-right text-xs font-mono">
                          {log.duration ? `${log.duration} min` : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Audit Logs view */
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
          <CardHeader className="pb-4 bg-muted/10 border-b border-border/50">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Journal d'Audit Technique & Habilitations
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Historique des modifications de rôles, permissions et états de sécurité par les administrateurs.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="pl-4 w-44">Date & Heure</TableHead>
                    <TableHead className="w-36">Opérateur</TableHead>
                    <TableHead className="w-40">Action / Type</TableHead>
                    <TableHead className="w-32">Cible</TableHead>
                    <TableHead>Détails de l'opération</TableHead>
                    <TableHead className="pr-4 w-36">Adresse IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Aucune action d'audit trouvée.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAudits.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/10 align-middle">
                        <TableCell className="pl-4 text-xs font-mono">
                          {new Date(log.created_at).toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground">
                          {log.username}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{log.entity_type}</TableCell>
                        <TableCell className="text-xs text-foreground leading-normal">
                          {log.details}
                        </TableCell>
                        <TableCell className="pr-4 text-xs font-mono">{log.ip_address}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
