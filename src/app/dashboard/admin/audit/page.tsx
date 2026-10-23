"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  History, Terminal, Search, ShieldCheck, RefreshCw, 
  Download, Clock, CheckCircle2, AlertTriangle, Users, 
  Radio, Laptop, ShieldAlert
} from "lucide-react"
import { 
  getLoginLogs, getAuditLogs, LoginLog, AdminAuditLog, recordAuditLog 
} from "../adminMockData"
import { exportToCSV } from "@/utils/exportUtils"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { toast } from "sonner"

export default function AuditAdminPage() {
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([])
  const [activeTab, setActiveTab] = useState<"connections" | "audit">("connections")
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>("")
  const [currentTime, setCurrentTime] = useState<number>(Date.now())

  const [searchQuery, setSearchQuery] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState("all")
  const [timeFilter, setTimeFilter] = useState<"today" | "7d" | "all">("today")

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true)
    try {
      const [login, audit] = await Promise.all([
        getLoginLogs(),
        getAuditLogs()
      ])
      setLoginLogs(login)
      setAuditLogs(audit)
      setLastSyncTime(new Date().toLocaleTimeString("fr-FR"))
    } catch (err) {
      console.warn("Notice loading audit logs:", err)
    } finally {
      setLoading(false)
      if (!silent) setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    // Écoute des événements de mise à jour des logs et du storage local
    const handleLogsUpdated = () => {
      loadData(true)
    }

    window.addEventListener("admin_logs_updated", handleLogsUpdated)
    window.addEventListener("storage", handleLogsUpdated)

    // Horloge temps réel toutes les 3 secondes pour rafraîchir les durées de sessions actives
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
      loadData(true)
    }, 4000)

    return () => {
      window.removeEventListener("admin_logs_updated", handleLogsUpdated)
      window.removeEventListener("storage", handleLogsUpdated)
      clearInterval(interval)
    }
  }, [loadData])

  // Synchronisation temps réel automatique Supabase
  useRealtimeSync({
    tables: ['users', 'receptions', 'samples', 'inventories', 'waste_batches', 'movements'],
    onSync: () => loadData(true),
    pollIntervalMs: 5000,
  })

  // Formatage relatif temps réel
  const formatLiveDate = (iso: string) => {
    const diffMs = currentTime - new Date(iso).getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMin / 60)

    if (diffSec < 45) return "À l'instant"
    if (diffMin < 60) return `Il y a ${diffMin} min`
    if (diffHours < 24) return `Il y a ${diffHours} h`
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  // Calcul dynamique de la durée de session en cours
  const getSessionDuration = (log: LoginLog) => {
    if (log.event_type !== "Connexion") {
      return log.duration ? `${log.duration} min` : "—"
    }

    // Si pas de durée fixée (session active), calculer les minutes écoulées
    if (log.duration === null || log.duration === undefined || log.duration === 0) {
      const elapsedMin = Math.max(1, Math.floor((currentTime - new Date(log.created_at).getTime()) / 60000))
      // Si la session date de moins de 12 heures, c'est une session en direct
      if (elapsedMin < 720) {
        return `En cours (${elapsedMin} min)`
      }
      return `${elapsedMin} min`
    }

    return `${log.duration} min`
  }

  // Filtrage par période
  const filterByTime = (itemDate: string) => {
    if (timeFilter === "all") return true
    const itemMs = new Date(itemDate).getTime()
    const nowMs = currentTime
    if (timeFilter === "today") {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return itemMs >= today.getTime()
    }
    if (timeFilter === "7d") {
      return (nowMs - itemMs) <= 7 * 24 * 3600 * 1000
    }
    return true
  }

  const filteredConnections = loginLogs.filter(log => {
    const matchUser = log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      log.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      log.user_agent.toLowerCase().includes(searchQuery.toLowerCase())
    const matchType = eventTypeFilter === "all" || log.event_type === eventTypeFilter
    const matchTime = filterByTime(log.created_at)
    return matchUser && matchType && matchTime
  })

  const filteredAudits = auditLogs.filter(log => {
    const matchQuery = log.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       log.entity_type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchTime = filterByTime(log.created_at)
    return matchQuery && matchTime
  })

  // KPIs temps réel
  const activeSessionsCount = loginLogs.filter(l => {
    if (l.event_type !== "Connexion") return false
    const elapsedMs = currentTime - new Date(l.created_at).getTime()
    return elapsedMs < 6 * 3600 * 1000 // Moins de 6h
  }).length

  const todayConnectionsCount = loginLogs.filter(l => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(l.created_at).getTime() >= today.getTime() && l.event_type === "Connexion"
  }).length

  const failedLoginsCount = loginLogs.filter(l => l.event_type === "Échec de connexion").length
  const totalAuditsCount = auditLogs.length

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === "connections") {
      const rows = filteredConnections.map(l => ({
        "Date": new Date(l.created_at).toLocaleString("fr-FR"),
        "Identifiant": l.username,
        "Evenement": l.event_type,
        "Adresse_IP": l.ip_address,
        "Systeme_Navigateur": l.user_agent,
        "Duree_Session": getSessionDuration(l)
      }))
      exportToCSV(rows, ["Date", "Identifiant", "Evenement", "Adresse_IP", "Systeme_Navigateur", "Duree_Session"], "journal-connexions-live")
      toast.success("Journal des connexions exporté en CSV")
    } else {
      const rows = filteredAudits.map(a => ({
        "Date": new Date(a.created_at).toLocaleString("fr-FR"),
        "Operateur": a.username,
        "Action": a.action,
        "Entite": a.entity_type,
        "Details": a.details,
        "Adresse_IP": a.ip_address
      }))
      exportToCSV(rows, ["Date", "Operateur", "Action", "Entite", "Details", "Adresse_IP"], "journal-audit-live")
      toast.success("Journal d'audit exporté en CSV")
    }
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-full">
      
      {/* BANDEAU EN-TÊTE COMPACT AVEC BADGE TEMPS RÉEL ACTIF */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#1B5C2E]" />
              Journaux de Traçabilité & Audits
            </h2>
            
            {/* INDICATEUR TEMPS RÉEL PULSANT */}
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10.5px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>Temps Réel Actif</span>
              {lastSyncTime && <span className="opacity-70 font-mono font-normal">({lastSyncTime})</span>}
            </div>
          </div>
          <p className="text-muted-foreground text-xs mt-0.5">Historique inaltérable et synchronisation instantanée des sessions et modifications système.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadData()}
            disabled={isRefreshing}
            className="h-8 text-xs px-2.5 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            className="h-8 text-xs px-2.5 gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Exporter CSV
          </Button>

          {/* COMMUTATEUR D'ONGLETS COMPACT */}
          <div className="flex bg-muted/65 p-0.5 rounded-lg border border-border/50">
            <Button 
              variant={activeTab === "connections" ? "secondary" : "ghost"}
              className={`rounded-md h-7 text-xs font-bold px-3 gap-1.5 ${activeTab === "connections" ? "bg-white text-[#1B5C2E] shadow-2xs" : ""}`}
              onClick={() => {
                setActiveTab("connections")
                setSearchQuery("")
                setEventTypeFilter("all")
              }}
            >
              <Terminal className="h-3.5 w-3.5" />
              Journal Connexions ({loginLogs.length})
            </Button>
            <Button 
              variant={activeTab === "audit" ? "secondary" : "ghost"}
              className={`rounded-md h-7 text-xs font-bold px-3 gap-1.5 ${activeTab === "audit" ? "bg-white text-[#1B5C2E] shadow-2xs" : ""}`}
              onClick={() => {
                setActiveTab("audit")
                setSearchQuery("")
                setEventTypeFilter("all")
              }}
            >
              <History className="h-3.5 w-3.5" />
              Journal Audit ({auditLogs.length})
            </Button>
          </div>
        </div>
      </div>

      {/* METRIQUES TEMPS RÉEL (KPIS SANS SCROLL) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 relative">
              <Radio className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Sessions Actives en direct
              </p>
              <h3 className="text-xl font-black text-emerald-700 flex items-center gap-1.5">
                {activeSessionsCount}
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md">En direct</span>
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><Users className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Connexions Aujourd'hui</p>
              <h3 className="text-xl font-black text-foreground">{todayConnectionsCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${failedLoginsCount > 0 ? 'bg-red-500/10 text-red-600' : 'bg-muted text-muted-foreground'}`}>
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Échecs d'Authentification</p>
              <h3 className={`text-xl font-black ${failedLoginsCount > 0 ? 'text-red-600' : 'text-foreground'}`}>
                {failedLoginsCount} {failedLoginsCount === 0 ? <span className="text-[10px] text-emerald-600 font-bold ml-1">● Conforme</span> : ''}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E]"><CheckCircle2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Actions d'Audit Tracées</p>
              <h3 className="text-xl font-black text-foreground">{totalAuditsCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLEAU EN TEMPS RÉEL */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden w-full">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              {activeTab === "connections" ? <Terminal className="h-4 w-4 text-[#1B5C2E]" /> : <History className="h-4 w-4 text-[#1B5C2E]" />}
              {activeTab === "connections" 
                ? `Historique Temps Réel des Sessions Utilisateurs (${filteredConnections.length})` 
                : `Journal d'Audit Technique & Actions Système (${filteredAudits.length})`
              }
            </CardTitle>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder={activeTab === "connections" ? "Rechercher par identifiant, IP..." : "Rechercher opérateur, action, détail..."}
                  className="pl-8 h-8 text-xs bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* FILTRE PÉRIODE */}
              <Select value={timeFilter} onValueChange={(val: any) => setTimeFilter(val)}>
                <SelectTrigger className="h-8 w-32 text-xs bg-background">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="7d">7 derniers jours</SelectItem>
                  <SelectItem value="all">Tout l'historique</SelectItem>
                </SelectContent>
              </Select>

              {activeTab === "connections" && (
                <Select value={eventTypeFilter} onValueChange={(val) => setEventTypeFilter(val || "all")}>
                  <SelectTrigger className="h-8 w-36 text-xs bg-background">
                    <SelectValue placeholder="Événement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous événements</SelectItem>
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
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Cible / Module</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Détails de l'Opération</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase text-right pr-4 whitespace-nowrap">Adresse IP</TableHead>
                  </TableRow>
                )}
              </TableHeader>

              <TableBody>
                {activeTab === "connections" ? (
                  filteredConnections.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground">Aucune session enregistrée pour cette sélection.</TableCell></TableRow>
                  ) : (
                    filteredConnections.map((log) => {
                      const isLive = log.event_type === "Connexion" && (currentTime - new Date(log.created_at).getTime() < 6 * 3600 * 1000)
                      return (
                        <TableRow key={log.id} className="text-xs hover:bg-muted/30">
                          {/* DATE & HEURE */}
                          <TableCell className="pl-4 py-2 font-mono whitespace-nowrap">
                            <div className="font-semibold text-foreground">
                              {new Date(log.created_at).toLocaleString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit"
                              })}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-sans">
                              {formatLiveDate(log.created_at)}
                            </span>
                          </TableCell>

                          {/* IDENTIFIANT */}
                          <TableCell className="py-2 whitespace-nowrap">
                            <span className="font-bold text-foreground">{log.username}</span>
                          </TableCell>

                          {/* ÉVÉNEMENT */}
                          <TableCell className="py-2 whitespace-nowrap">
                            {log.event_type === "Connexion" ? (
                              isLive ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] gap-1 px-1.5 py-0.2">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  Session active
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0.2">
                                  Connexion
                                </Badge>
                              )
                            ) : log.event_type === "Déconnexion" ? (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0.2">
                                Déconnexion
                              </Badge>
                            ) : (
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0.2">
                                Échec de connexion
                              </Badge>
                            )}
                          </TableCell>

                          {/* ADRESSE IP */}
                          <TableCell className="py-2 font-mono text-muted-foreground whitespace-nowrap">
                            {log.ip_address}
                          </TableCell>

                          {/* SYSTEME / NAVIGATEUR */}
                          <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <Laptop className="h-3.5 w-3.5 text-muted-foreground/70" />
                              {log.user_agent}
                            </span>
                          </TableCell>

                          {/* DUREE */}
                          <TableCell className="py-2 text-right pr-4 font-mono whitespace-nowrap">
                            <span className={isLive ? "font-bold text-emerald-700" : "text-muted-foreground"}>
                              {getSessionDuration(log)}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )
                ) : (
                  filteredAudits.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground">Aucune action d'audit enregistrée pour cette sélection.</TableCell></TableRow>
                  ) : (
                    filteredAudits.map((log) => (
                      <TableRow key={log.id} className="text-xs hover:bg-muted/30">
                        {/* DATE & HEURE */}
                        <TableCell className="pl-4 py-2 font-mono whitespace-nowrap">
                          <div className="font-semibold text-foreground">
                            {new Date(log.created_at).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit"
                            })}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-sans">
                            {formatLiveDate(log.created_at)}
                          </span>
                        </TableCell>

                        {/* OPERATEUR */}
                        <TableCell className="py-2 font-bold text-foreground whitespace-nowrap">
                          {log.username}
                        </TableCell>

                        {/* ACTION */}
                        <TableCell className="py-2 whitespace-nowrap">
                          <Badge 
                            variant="outline" 
                            className={`text-[9.5px] px-1.5 py-0 ${
                              log.action.includes('Création') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              log.action.includes('Validation') ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              log.action.includes('Modification') ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              log.action.includes('Suppression') ? 'bg-red-50 text-red-800 border-red-200' :
                              'bg-background'
                            }`}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>

                        {/* CIBLE / MODULE */}
                        <TableCell className="py-2 font-semibold text-foreground whitespace-nowrap">
                          {log.entity_type}
                        </TableCell>

                        {/* DETAILS */}
                        <TableCell className="py-2 text-muted-foreground max-w-[340px] truncate" title={log.details}>
                          {log.details}
                        </TableCell>

                        {/* IP */}
                        <TableCell className="py-2 text-right pr-4 font-mono text-muted-foreground whitespace-nowrap">
                          {log.ip_address}
                        </TableCell>
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
