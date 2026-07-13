"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Users, UserCheck, UserX, Shield, Lock, BellRing, 
  Terminal, ShieldAlert, CheckCircle2, AlertTriangle, KeyRound
} from "lucide-react"
import { 
  getUsers, getRoles, getLoginLogs, getSecuritySettings,
  User, UserRole, LoginLog, SecuritySettings 
} from "./adminMockData"

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([])
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [u, r, l, s] = await Promise.all([
        getUsers(),
        getRoles(),
        getLoginLogs(),
        getSecuritySettings()
      ])
      setUsers(u)
      setRoles(r)
      setLoginLogs(l)
      setSecuritySettings(s)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>
  }

  // --- STATS COMPUTATIONS ---
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === "Actif").length
  const suspendedUsers = users.filter(u => u.status === "Suspendu").length
  const disabledUsers = users.filter(u => u.status === "Désactivé").length
  const lockedUsers = users.filter(u => u.locked_until && new Date(u.locked_until) > new Date()).length
  
  // Security alert rules:
  const alerts = []
  if (securitySettings) {
    if (securitySettings.min_password_length < 12) {
      alerts.push({
        id: "alert-1",
        title: "Longueur minimale du mot de passe faible",
        desc: `La longueur actuelle est de ${securitySettings.min_password_length} caractères (Recommandé: >= 12).`,
        level: "warning" as const
      })
    }
    if (!securitySettings.mfa_enabled) {
      alerts.push({
        id: "alert-2",
        title: "MFA (Double Authentification) désactivée",
        desc: "La double authentification n'est pas imposée à l'ensemble de l'organisation.",
        level: "critical" as const
      })
    }
    if (securitySettings.max_login_attempts > 5) {
      alerts.push({
        id: "alert-3",
        title: "Tentatives de connexion permissives",
        desc: `Verrouillage après ${securitySettings.max_login_attempts} tentatives (Recommandé: <= 5).`,
        level: "warning" as const
      })
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tableau de Bord Administration</h2>
        <p className="text-muted-foreground mt-1">
          Supervision de la sécurité, des identités, des accès et des connexions eGED-ABMed.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI: Total Users */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden bg-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Utilisateurs</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight">{totalUsers}</span>
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                <Users className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
              <span className="font-semibold text-emerald-500">{activeUsers} actifs</span> | <span>{disabledUsers + suspendedUsers} inactifs</span>
            </p>
          </CardContent>
        </Card>

        {/* KPI: Active Users */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden bg-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session Active / Statut</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-500">{activeUsers}</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <UserCheck className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              Taux de comptes fonctionnels : {Math.round((activeUsers / (totalUsers || 1)) * 100)}%
            </p>
          </CardContent>
        </Card>

        {/* KPI: Suspended / Locked */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden bg-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bloqués / Verrouillés</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-500">{lockedUsers + suspendedUsers}</span>
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <Lock className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
              <span>{lockedUsers} locked par brute-force</span> | <span>{suspendedUsers} suspendus</span>
            </p>
          </CardContent>
        </Card>

        {/* KPI: Existing Roles */}
        <Card className="border-border/50 shadow-sm relative overflow-hidden bg-card">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rôles Métiers</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight">{roles.length}</span>
                </div>
              </div>
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                <Shield className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              Politique RBAC appliquée et active.
            </p>
          </CardContent>
        </Card>

      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Connection logs list */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4 bg-muted/10 border-b border-border/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Dernières connexions & tentatives
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Historique des événements d'accès au système.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Date / Heure</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Événement</TableHead>
                    <TableHead>Adresse IP</TableHead>
                    <TableHead className="pr-4">Navigateur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginLogs.slice(0, 5).map((log) => (
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
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"
                              : log.event_type === "Déconnexion"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900"
                              : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900"
                          }
                        >
                          {log.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{log.ip_address}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[200px] pr-4">
                        {log.user_agent}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Security Checklist / Alerts */}
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
          <CardHeader className="pb-4 bg-muted/10 border-b border-border/50">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Alertes de sécurité ({alerts.length})
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Anomalies détectées selon la politique eGED.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="font-semibold text-xs text-foreground">Tout est conforme !</p>
                <p className="text-[10px]">Aucune vulnérabilité active détectée.</p>
              </div>
            ) : (
              alerts.map(a => (
                <div 
                  key={a.id} 
                  className={`p-3 rounded-xl border flex gap-3 items-start ${
                    a.level === "critical" 
                      ? "bg-red-50/50 border-red-200 text-red-900 dark:bg-red-950/10 dark:border-red-900/50 dark:text-red-400"
                      : "bg-amber-50/50 border-amber-200 text-amber-900 dark:bg-amber-950/10 dark:border-amber-900/50 dark:text-amber-400"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">{a.title}</p>
                    <p className="text-[10px] leading-normal opacity-90">{a.desc}</p>
                  </div>
                </div>
              ))
            )}

            {/* Quick action buttons */}
            <div className="pt-2 border-t border-border/50 space-y-2">
              <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span>Longueur MDP minimale</span>
                </div>
                <span className="font-bold font-mono">{securitySettings?.min_password_length} chars</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>Blocage Brute-force</span>
                </div>
                <span className="font-bold">{securitySettings?.max_login_attempts} tentatives</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  )
}
