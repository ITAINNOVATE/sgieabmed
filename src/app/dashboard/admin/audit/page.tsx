"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  History, Terminal, Search, ShieldCheck, RefreshCw, 
  Download, Clock, CheckCircle2, AlertTriangle, Users, 
  Radio, Laptop, ShieldAlert, FileSpreadsheet, Eye, Filter,
  Building2, Calendar, Trash2, Key, CheckSquare, Sparkles
} from "lucide-react"
import { 
  getLoginLogs, getAuditLogs, LoginLog, AdminAuditLog, recordAuditLog 
} from "../adminMockData"
import { exportToCSV, exportToExcel } from "@/utils/exportUtils"
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

  // Filtres
  const [searchQuery, setSearchQuery] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState("all")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")
  const [timeFilter, setTimeFilter] = useState<"today" | "7d" | "all">("today")

  // Modales d'inspection détaillée (Forensic View)
  const [selectedAuditLog, setSelectedAuditLog] = useState<AdminAuditLog | null>(null)
  const [selectedConnLog, setSelectedConnLog] = useState<LoginLog | null>(null)

  // Références pour la détection temps réel de nouvelles actions entrantes
  const prevAuditCountRef = useRef<number | null>(null)
  const prevConnCountRef = useRef<number | null>(null)

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true)
    try {
      const [login, audit] = await Promise.all([
        getLoginLogs(),
        getAuditLogs()
      ])

      // Notification toast en direct si une nouvelle action est détectée sur le réseau
      if (prevAuditCountRef.current !== null && audit.length > prevAuditCountRef.current) {
        const latest = audit[0]
        if (latest) {
          toast.info(`Activité détectée en temps réel`, {
            description: `${latest.username} — ${latest.action} (${latest.entity_type})`,
            duration: 5000,
          })
        }
      }
      prevAuditCountRef.current = audit.length

      if (prevConnCountRef.current !== null && login.length > prevConnCountRef.current) {
        const latestLogin = login[0]
        if (latestLogin && latestLogin.event_type === "Connexion") {
          toast.success(`Nouvelle session en direct`, {
            description: `${latestLogin.username} connecté depuis ${latestLogin.ip_address}`,
            duration: 4000,
          })
        }
      }
      prevConnCountRef.current = login.length

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
    }, 3500)

    return () => {
      window.removeEventListener("admin_logs_updated", handleLogsUpdated)
      window.removeEventListener("storage", handleLogsUpdated)
      clearInterval(interval)
    }
  }, [loadData])

  // Synchronisation temps réel automatique Supabase et broadcast local
  useRealtimeSync({
    tables: ['waste_movements', 'audit', 'waste_batches', 'receptions', 'appointments', 'centers', 'destruction_plans', 'users'],
    onSync: () => loadData(true),
    pollIntervalMs: 2500,
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

  // Connexions filtrées
  const filteredConnections = useMemo(() => {
    return loginLogs.filter(log => {
      const q = searchQuery.toLowerCase().trim()
      const matchUser = !q ||
                        log.username.toLowerCase().includes(q) ||
                        log.ip_address.toLowerCase().includes(q) ||
                        log.user_agent.toLowerCase().includes(q)
      const matchType = eventTypeFilter === "all" || log.event_type === eventTypeFilter
      const matchTime = filterByTime(log.created_at)
      return matchUser && matchType && matchTime
    })
  }, [loginLogs, searchQuery, eventTypeFilter, timeFilter, currentTime])

  // Audits filtrés
  const filteredAudits = useMemo(() => {
    return auditLogs.filter(log => {
      const q = searchQuery.toLowerCase().trim()
      const matchQuery = !q ||
                         log.username.toLowerCase().includes(q) || 
                         log.details.toLowerCase().includes(q) ||
                         log.action.toLowerCase().includes(q) ||
                         log.entity_type.toLowerCase().includes(q) ||
                         log.ip_address.toLowerCase().includes(q)

      const matchModule = moduleFilter === "all" || log.entity_type.toLowerCase().includes(moduleFilter.toLowerCase())

      const matchAction = actionFilter === "all" || log.action.toLowerCase().includes(actionFilter.toLowerCase())

      const matchTime = filterByTime(log.created_at)

      return matchQuery && matchModule && matchAction && matchTime
    })
  }, [auditLogs, searchQuery, moduleFilter, actionFilter, timeFilter, currentTime])

  // KPIs temps réel
  const activeSessionsCount = useMemo(() => {
    return loginLogs.filter(l => {
      if (l.event_type !== "Connexion") return false
      const elapsedMs = currentTime - new Date(l.created_at).getTime()
      return elapsedMs < 6 * 3600 * 1000
    }).length
  }, [loginLogs, currentTime])

  const todayConnectionsCount = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return loginLogs.filter(l => {
      return new Date(l.created_at).getTime() >= today.getTime() && l.event_type === "Connexion"
    }).length
  }, [loginLogs])

  const failedLoginsCount = useMemo(() => {
    return loginLogs.filter(l => l.event_type === "Échec de connexion").length
  }, [loginLogs])

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

  // Export Excel
  const handleExportExcel = () => {
    if (activeTab === "connections") {
      const rows = filteredConnections.map(l => ({
        "Date & Heure": new Date(l.created_at).toLocaleString("fr-FR"),
        "Identifiant Utilisateur": l.username,
        "Type d'Événement": l.event_type,
        "Adresse IP": l.ip_address,
        "Système & Navigateur": l.user_agent,
        "Durée de Session": getSessionDuration(l)
      }))
      exportToExcel(
        rows, 
        ["Date & Heure", "Identifiant Utilisateur", "Type d'Événement", "Adresse IP", "Système & Navigateur", "Durée de Session"], 
        "journal-connexions-live"
      )
      toast.success("Journal des connexions exporté en Excel")
    } else {
      const rows = filteredAudits.map(a => ({
        "Date & Heure": new Date(a.created_at).toLocaleString("fr-FR"),
        "Opérateur / Auteur": a.username,
        "Action Exécutée": a.action,
        "Module / Entité": a.entity_type,
        "Détails Complets": a.details,
        "Adresse IP": a.ip_address,
        "Identifiant Technique": a.id
      }))
      exportToExcel(
        rows, 
        ["Date & Heure", "Opérateur / Auteur", "Action Exécutée", "Module / Entité", "Détails Complets", "Adresse IP", "Identifiant Technique"], 
        "journal-audit-live"
      )
      toast.success("Journal d'audit exporté en Excel")
    }
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-full">
      
      {/* ─── BANDEAU EN-TÊTE COMPACT AVEC BADGE TEMPS RÉEL ACTIF ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#1B5C2E]" />
              Journaux de Traçabilité & Audits
            </h2>
            
            {/* INDICATEUR TEMPS RÉEL PULSANT */}
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>Temps Réel Actif</span>
              {lastSyncTime && <span className="opacity-70 font-mono font-normal">({lastSyncTime})</span>}
            </div>
          </div>
          <p className="text-muted-foreground text-xs mt-0.5">
            Traçabilité inaltérable en temps réel de chaque utilisateur, agent et centre apporteur sur l&apos;ensemble de la plateforme.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadData()}
            disabled={isRefreshing}
            className="h-8 text-xs px-2.5 gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportExcel}
            className="h-8 text-xs px-2.5 gap-1.5 cursor-pointer text-emerald-700 hover:text-emerald-800 border-emerald-200 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            className="h-8 text-xs px-2.5 gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            CSV
          </Button>

          {/* COMMUTATEUR D'ONGLETS COMPACT */}
          <div className="flex bg-muted/65 p-0.5 rounded-lg border border-border/50">
            <Button 
              variant={activeTab === "connections" ? "secondary" : "ghost"}
              className={`rounded-md h-7 text-xs font-bold px-3 gap-1.5 cursor-pointer ${activeTab === "connections" ? "bg-white text-[#1B5C2E] shadow-2xs" : ""}`}
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
              className={`rounded-md h-7 text-xs font-bold px-3 gap-1.5 cursor-pointer ${activeTab === "audit" ? "bg-white text-[#1B5C2E] shadow-2xs" : ""}`}
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

      {/* ─── METRIQUES TEMPS RÉEL (KPIS SANS SCROLL) ─── */}
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
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Connexions Aujourd&apos;hui</p>
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
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Échecs d&apos;Authentification</p>
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
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Actions d&apos;Audit Tracées</p>
              <h3 className="text-xl font-black text-foreground">{totalAuditsCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── TABLEAU EN TEMPS RÉEL AVEC FILTRES ─── */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden w-full">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              {activeTab === "connections" ? <Terminal className="h-4 w-4 text-[#1B5C2E]" /> : <History className="h-4 w-4 text-[#1B5C2E]" />}
              {activeTab === "connections" 
                ? `Historique Temps Réel des Sessions Utilisateurs (${filteredConnections.length})` 
                : `Journal d'Audit Technique & Actions Système (${filteredAudits.length})`
              }
            </CardTitle>

            {/* BARRE DE FILTRES MULTI-CRITÈRES */}
            <div className="flex flex-wrap items-center gap-2">
              {/* RECHERCHE TEXTUELLE */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder={activeTab === "connections" ? "Identifiant, IP, navigateur..." : "Opérateur, action, détail, CTR..."}
                  className="pl-8 h-8 text-xs bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* FILTRE MODULE (POUR L'ONGLET AUDIT) */}
              {activeTab === "audit" && (
                <Select value={moduleFilter} onValueChange={(val) => setModuleFilter(val || "all")}>
                  <SelectTrigger className="h-8 w-44 text-xs bg-background">
                    <SelectValue placeholder="Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous modules</SelectItem>
                    <SelectItem value="Planning">Planning & RDV</SelectItem>
                    <SelectItem value="Déchets">Déchets Pharmaceutiques</SelectItem>
                    <SelectItem value="Échantillons">Échantillons</SelectItem>
                    <SelectItem value="Centres">Centres Apporteurs</SelectItem>
                    <SelectItem value="Destruction">Destruction Déchets</SelectItem>
                    <SelectItem value="Sécurité">Sécurité & Accès</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* FILTRE TYPE D'ACTION (POUR L'ONGLET AUDIT) */}
              {activeTab === "audit" && (
                <Select value={actionFilter} onValueChange={(val) => setActionFilter(val || "all")}>
                  <SelectTrigger className="h-8 w-36 text-xs bg-background">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes actions</SelectItem>
                    <SelectItem value="RDV">Rendez-vous</SelectItem>
                    <SelectItem value="Réception">Réceptions</SelectItem>
                    <SelectItem value="Création">Créations</SelectItem>
                    <SelectItem value="Modification">Modifications</SelectItem>
                    <SelectItem value="Suppression">Suppressions</SelectItem>
                    <SelectItem value="Destruction">Destruction</SelectItem>
                    <SelectItem value="Mot de Passe">Mots de passe</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* FILTRE ÉVÉNEMENT (POUR L'ONGLET CONNEXIONS) */}
              {activeTab === "connections" && (
                <Select value={eventTypeFilter} onValueChange={(val) => setEventTypeFilter(val || "all")}>
                  <SelectTrigger className="h-8 w-36 text-xs bg-background">
                    <SelectValue placeholder="Événement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous événements</SelectItem>
                    <SelectItem value="Connexion">Connexions</SelectItem>
                    <SelectItem value="Déconnexion">Déconnexions</SelectItem>
                    <SelectItem value="Échec de connexion">Échecs d&apos;accès</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* FILTRE PÉRIODE */}
              <Select value={timeFilter} onValueChange={(val: any) => setTimeFilter(val)}>
                <SelectTrigger className="h-8 w-32 text-xs bg-background">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                  <SelectItem value="7d">7 derniers jours</SelectItem>
                  <SelectItem value="all">Tout l&apos;historique</SelectItem>
                </SelectContent>
              </Select>
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
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase text-right whitespace-nowrap">Durée Session</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase text-center pr-4 whitespace-nowrap">Détails</TableHead>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase pl-4 whitespace-nowrap">Date & Heure</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Opérateur</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Action</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Cible / Module</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase whitespace-nowrap">Détails de l&apos;Opération</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase text-right whitespace-nowrap">Adresse IP</TableHead>
                    <TableHead className="py-2 text-[10.5px] font-bold uppercase text-center pr-4 whitespace-nowrap">Détails</TableHead>
                  </TableRow>
                )}
              </TableHeader>

              <TableBody>
                {activeTab === "connections" ? (
                  filteredConnections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                        Aucune session enregistrée pour cette sélection.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConnections.map((log) => {
                      const isLive = log.event_type === "Connexion" && (currentTime - new Date(log.created_at).getTime() < 6 * 3600 * 1000)
                      return (
                        <TableRow 
                          key={log.id} 
                          className="text-xs hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => setSelectedConnLog(log)}
                        >
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
                          <TableCell className="py-2 text-right font-mono whitespace-nowrap">
                            <span className={isLive ? "font-bold text-emerald-700" : "text-muted-foreground"}>
                              {getSessionDuration(log)}
                            </span>
                          </TableCell>

                          {/* ACTION INSPECTION */}
                          <TableCell className="py-2 text-center pr-4 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setSelectedConnLog(log) }}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )
                ) : (
                  filteredAudits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                        Aucune action d&apos;audit enregistrée pour cette sélection.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAudits.map((log) => (
                      <TableRow 
                        key={log.id} 
                        className="text-xs hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedAuditLog(log)}
                      >
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
                            className={`text-[9.5px] px-1.5 py-0 font-bold ${
                              log.action.includes('Création') || log.action.includes('Enregistrement') || log.action.includes('Programmation') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              log.action.includes('Validation') || log.action.includes('Signature') || log.action.includes('Effectué') ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              log.action.includes('Modification') || log.action.includes('Mise à jour') ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              log.action.includes('Suppression') || log.action.includes('Annulation') ? 'bg-red-50 text-red-800 border-red-200' :
                              log.action.includes('Réservation') ? 'bg-purple-50 text-purple-800 border-purple-200' :
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
                        <TableCell className="py-2 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {log.ip_address}
                        </TableCell>

                        {/* ACTION INSPECTION */}
                        <TableCell className="py-2 text-center pr-4 whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setSelectedAuditLog(log) }}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
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

      {/* ─── MODALE D'INSPECTION DÉTAILLÉE : ACTION D'AUDIT (FORENSIC VIEW) ─── */}
      <Dialog open={Boolean(selectedAuditLog)} onOpenChange={(open) => !open && setSelectedAuditLog(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Enregistrement Forensique Certifié</span>
            </div>
            <DialogTitle className="text-base font-black text-foreground">
              Détails de l&apos;Opération d&apos;Audit
            </DialogTitle>
            <DialogDescription className="text-xs">
              Horodatage inaltérable certifié par le moteur de traçabilité ABMeD.
            </DialogDescription>
          </DialogHeader>

          {selectedAuditLog && (
            <div className="space-y-3.5 py-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-muted-foreground block">Opérateur / Auteur</span>
                  <span className="font-black text-foreground text-sm">{selectedAuditLog.username}</span>
                </div>
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-muted-foreground block">Module Cible</span>
                  <Badge variant="outline" className="font-bold text-[10px] mt-0.5">
                    {selectedAuditLog.entity_type}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-muted-foreground block">Action Exécutée</span>
                  <Badge className="font-bold text-[10px] mt-0.5 bg-blue-100 text-blue-800 border-blue-200">
                    {selectedAuditLog.action}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-muted-foreground block">Adresse IP</span>
                  <span className="font-mono text-foreground font-semibold">{selectedAuditLog.ip_address}</span>
                </div>
              </div>

              <div>
                <span className="text-[10.5px] uppercase font-bold text-muted-foreground block mb-1">Détails Complets de la Transaction</span>
                <div className="p-3 rounded-xl bg-background border border-border/80 text-foreground leading-relaxed whitespace-pre-wrap font-sans text-xs">
                  {selectedAuditLog.details}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] text-muted-foreground">
                <div>
                  <span className="block font-bold">Horodatage précis :</span>
                  <span className="font-mono">{new Date(selectedAuditLog.created_at).toLocaleString("fr-FR")}</span>
                </div>
                <div>
                  <span className="block font-bold">Identifiant d&apos;Audit :</span>
                  <span className="font-mono text-[10px] truncate block">{selectedAuditLog.id}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end">
            <Button size="sm" variant="outline" onClick={() => setSelectedAuditLog(null)} className="text-xs">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODALE D'INSPECTION DÉTAILLÉE : SESSION DE CONNEXION ─── */}
      <Dialog open={Boolean(selectedConnLog)} onOpenChange={(open) => !open && setSelectedConnLog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-400">
              <Terminal className="h-4 w-4" />
              <span>Session Utilisateur</span>
            </div>
            <DialogTitle className="text-base font-black text-foreground">
              Détails de Connexion & Sécurité
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informations techniques d&apos;authentification et d&apos;environnement client.
            </DialogDescription>
          </DialogHeader>

          {selectedConnLog && (
            <div className="space-y-3 py-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-muted-foreground block">Identifiant Utilisateur</span>
                  <span className="font-black text-foreground text-sm">{selectedConnLog.username}</span>
                </div>
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-muted-foreground block">Type d&apos;Événement</span>
                  <Badge variant="outline" className="font-bold text-[10px] mt-0.5">
                    {selectedConnLog.event_type}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-muted-foreground block">Adresse IP Source</span>
                  <span className="font-mono text-foreground font-semibold">{selectedConnLog.ip_address}</span>
                </div>
                <div>
                  <span className="text-[10.5px] uppercase font-bold text-muted-foreground block">Durée de la Session</span>
                  <span className="font-bold text-emerald-700">{getSessionDuration(selectedConnLog)}</span>
                </div>
              </div>

              <div>
                <span className="text-[10.5px] uppercase font-bold text-muted-foreground block mb-1">Navigateur & Système d&apos;Exploitation</span>
                <div className="p-2.5 rounded-lg bg-background border border-border/80 text-foreground text-xs flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{selectedConnLog.user_agent}</span>
                </div>
              </div>

              <div className="pt-1 text-[11px] text-muted-foreground">
                <span className="block font-bold">Horodatage de la connexion :</span>
                <span className="font-mono">{new Date(selectedConnLog.created_at).toLocaleString("fr-FR")}</span>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end">
            <Button size="sm" variant="outline" onClick={() => setSelectedConnLog(null)} className="text-xs">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
