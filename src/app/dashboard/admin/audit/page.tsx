"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    return <div className="text-center py-6 text-xs text-muted-foreground">Chargement des journaux de traçabilité...</div>
  }

  const filteredConnections = loginLogs.filter(log => {
    const matchUser = log.username.toLowerCase().includes(searchUsername.toLowerCase())
    const matchType = eventTypeFilter === "all" || log.event_type === eventTypeFilter
    return matchUser && matchType
  })

  const filteredAudits = auditLogs.filter(log => {
    const matchUser = log.username.toLowerCase().includes(searchUsername.toLowerCase()) || 
                      log.details.toLowerCase().includes(searchUsername.toLowerCase()) ||
                      log.action.toLowerCase().includes(searchUsername.toLowerCase())
    return matchUser
  })

  return (
    <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-full">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#1B5C2E]" />
            Journaux de Traçabilité & Audits
          </h2>
          <p className="text-muted-foreground text-xs">Historique inaltérable des connexions, sessions et modifications système.</p>
        </div>

        {/* COMMUTATEUR D'ONGLETS COMPACT */}
        <div className="flex bg-muted/65 p-0.5 rounded-lg border border-border/50">
          <Button 
            variant={activeTab === "connections" ? "secondary" : "ghost"}
            className={`rounded-md h-7 text-xs font-bold px-3 ${activeTab === "connections" ? "bg-white text-[#1B5C2E] shadow-2xs" : ""}`}
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
            className={`rounded-md h-7 text-xs font-bold px-3 ${activeTab === "audit" ? "bg-white text-[#1B5C2E] shadow-2xs" : ""}`}
            onClick={() => {
              setActiveTab("audit")
              setSearchUsername("")
              setEventTypeFilter("all")
            }}
          >
            Journal d'Audit
          </Button>
        </div>
      </div>

      {/* TABLEAU COMPACT 1-ÉCRAN DE TRAÇABILITÉ */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden w-full">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              {activeTab === "connections" ? <Terminal className="h-4 w-4 text-[#1B5C2E]" /> : <History className="h-4 w-4 text-[#1B5C2E]" />}
              {activeTab === "connections" ? "Historique des Sessions Utilisateurs" : "Journal d'Audit Technique & Habilitations"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher par identifiant..."
                  className="pl-8 h-8 text-xs bg-background"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                />
              </div>

              {activeTab === "connections" && (
                <Select value={eventTypeFilter} onValueChange={(val) => setEventTypeFilter(val || "all")}>
                  <SelectTrigger className="h-8 w-36 text-xs bg-background">
                    <SelectValue placeholder="Événement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="Connexion">Connexions</SelectItem>
                    <SelectItem value="Déconnexion">Déconnexions</SelectItem>
                    <SelectItem value="Échec de connexion">Échecs</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="w-full text-xs">
              <TableHeader className="bg-muted/40">
                {activeTab === "connections" ? (
                  <TableRow>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase pl-4 whitespace-nowrap">Date & Heure</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Identifiant</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Événement</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Adresse IP</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Système / Navigateur</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase text-right pr-4 whitespace-nowrap">Durée Session</TableHead>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase pl-4 whitespace-nowrap">Date & Heure</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Opérateur</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Action</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Cible</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Détails</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase text-right pr-4 whitespace-nowrap">Adresse IP</TableHead>
                  </TableRow>
                )}
              </TableHeader>

              <TableBody>
                {activeTab === "connections" ? (
                  filteredConnections.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">Aucune session enregistrée.</TableCell></TableRow>
                  ) : (
                    filteredConnections.slice(0, 4).map((log) => (
                      <TableRow key={log.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="pl-4 py-2 font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell className="py-2 font-bold text-foreground whitespace-nowrap">{log.username}</TableCell>
                        <TableCell className="py-2 whitespace-nowrap">
                          <Badge 
                            variant="outline"
                            className={`text-[9.5px] px-1.5 py-0 ${
                              log.event_type === "Connexion" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              log.event_type === "Déconnexion" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {log.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 font-mono text-muted-foreground whitespace-nowrap">{log.ip_address}</TableCell>
                        <TableCell className="py-2 text-muted-foreground truncate max-w-[200px] whitespace-nowrap">{log.user_agent}</TableCell>
                        <TableCell className="py-2 text-right pr-4 font-mono text-muted-foreground whitespace-nowrap">
                          {log.duration ? `${log.duration} min` : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )
                ) : (
                  filteredAudits.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-16 text-center text-xs text-muted-foreground">Aucune action d'audit enregistrée.</TableCell></TableRow>
                  ) : (
                    filteredAudits.slice(0, 4).map((log) => (
                      <TableRow key={log.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="pl-4 py-2 font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("fr-FR")}
                        </TableCell>
                        <TableCell className="py-2 font-bold text-foreground whitespace-nowrap">{log.username}</TableCell>
                        <TableCell className="py-2 whitespace-nowrap">
                          <Badge variant="outline" className="text-[9.5px] px-1.5 py-0 bg-background">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="py-2 font-semibold text-foreground whitespace-nowrap">{log.entity_type}</TableCell>
                        <TableCell className="py-2 text-muted-foreground truncate max-w-[240px] whitespace-nowrap">{log.details}</TableCell>
                        <TableCell className="py-2 text-right pr-4 font-mono text-muted-foreground whitespace-nowrap">{log.ip_address}</TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
