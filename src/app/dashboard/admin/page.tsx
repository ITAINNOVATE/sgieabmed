"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Users, UserCheck, UserX, Shield, Lock,
  ShieldAlert, CheckCircle2, AlertTriangle, KeyRound
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
    return <div className="text-center py-6 text-xs text-muted-foreground">Chargement des données d'administration...</div>
  }

  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === "Actif").length
  const suspendedUsers = users.filter(u => u.status === "Suspendu").length
  const disabledUsers = users.filter(u => u.status === "Désactivé").length

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#1B5C2E]" />
            Administration & Sécurité eGED
          </h2>
          <p className="text-muted-foreground text-xs">Supervision des comptes utilisateurs, autorisations d'accès, rôles et journaux de connexion.</p>
        </div>
      </div>

      {/* KPIS COMPACTS SANS SCROLL */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E]"><Users className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total Utilisateurs</p>
              <h3 className="text-xl font-black text-foreground">{totalUsers}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600"><UserCheck className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Comptes Actifs</p>
              <h3 className="text-xl font-black text-foreground">{activeUsers}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600"><UserX className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Comptes Suspendus</p>
              <h3 className="text-xl font-black text-foreground">{suspendedUsers}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><KeyRound className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">MFA Activé</p>
              <h3 className="text-xl font-black text-foreground">100%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLEAU DE GESTION DES UTILISATEURS (STATIQUE 1-ÉCRAN) */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Annuaire des Comptes & Attributions Rôles ({users.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="py-2 text-[11px] font-bold uppercase pl-4">Utilisateur / Nom</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Adresse Email</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Rôle Attribué</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Statut</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Dernière Connexion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.slice(0, 5).map((user) => (
                  <TableRow key={user.id} className="text-xs hover:bg-muted/30">
                    <TableCell className="pl-4 py-2 font-bold text-foreground">{user.first_name} {user.last_name}</TableCell>
                    <TableCell className="py-2 text-muted-foreground font-mono text-[11px]">{user.email}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-[10px] bg-background font-medium">{user.role}</Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge className={`text-[10px] ${user.status === "Actif" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right pr-4 text-muted-foreground">{user.last_login ? new Date(user.last_login).toLocaleDateString("fr-FR") : 'Aujourd\'hui'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
