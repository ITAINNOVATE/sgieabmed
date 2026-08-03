"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, UserCheck, UserX, Shield, KeyRound,
  FileText, Activity, ShieldCheck
} from "lucide-react"
import { 
  getUsers, getRoles, getLoginLogs,
  User, UserRole, LoginLog 
} from "./adminMockData"

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [u, r, l] = await Promise.all([
        getUsers(),
        getRoles(),
        getLoginLogs()
      ])
      setUsers(u)
      setRoles(r)
      setLoginLogs(l)
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

  return (
    <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#1B5C2E]" />
            Administration, Utilisateurs & Audit
          </h2>
          <p className="text-muted-foreground text-xs">Supervision des comptes, attribution des rôles et traçabilité des journaux d'audit.</p>
        </div>
      </div>

      {/* KPIS COMPACTS SANS SCROLL */}
      <div className="grid grid-cols-4 gap-2.5">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E]"><Users className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Total Utilisateurs</p>
              <h3 className="text-lg font-black text-foreground">{totalUsers}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600"><UserCheck className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Comptes Actifs</p>
              <h3 className="text-lg font-black text-foreground">{activeUsers}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600"><UserX className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Comptes Suspendus</p>
              <h3 className="text-lg font-black text-foreground">{suspendedUsers}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600"><KeyRound className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Sécurité MFA</p>
              <h3 className="text-lg font-black text-foreground">100%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ONGLETS : UTILISATEURS & RÔLES / JOURNAUX D'AUDIT */}
      <Tabs defaultValue="users" className="w-full space-y-2">
        <TabsList className="h-8 p-0.5 bg-muted/60 rounded-lg">
          <TabsTrigger value="users" className="text-xs font-bold px-3 h-7">
            <Users className="h-3.5 w-3.5 mr-1 text-[#1B5C2E]" /> Utilisateurs & Rôles
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs font-bold px-3 h-7">
            <Activity className="h-3.5 w-3.5 mr-1 text-blue-600" /> Journaux d'Audit & Connexions
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: UTILISATEURS ET RÔLES (STATIQUE 1-ÉCRAN) */}
        <TabsContent value="users" className="mt-0">
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
            <CardHeader className="p-2.5 pb-1 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                Annuaire des Utilisateurs & Rôles ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="py-1.5 text-[10px] font-bold uppercase pl-3">Utilisateur / Nom</TableHead>
                      <TableHead className="py-1.5 text-[10px] font-bold uppercase">Adresse Email</TableHead>
                      <TableHead className="py-1.5 text-[10px] font-bold uppercase">Rôle Attribué</TableHead>
                      <TableHead className="py-1.5 text-[10px] font-bold uppercase">Statut</TableHead>
                      <TableHead className="py-1.5 text-[10px] font-bold uppercase text-right pr-3">Dernière Connexion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.slice(0, 4).map((user) => (
                      <TableRow key={user.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="pl-3 py-1.5 font-bold text-foreground">{user.first_name} {user.last_name}</TableCell>
                        <TableCell className="py-1.5 text-muted-foreground font-mono text-[11px]">{user.email}</TableCell>
                        <TableCell className="py-1.5">
                          <Badge variant="outline" className="text-[9px] bg-background font-medium">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Badge className={`text-[9px] px-1.5 py-0 ${user.status === "Actif" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 text-right pr-3 text-muted-foreground">{user.last_login ? new Date(user.last_login).toLocaleDateString("fr-FR") : 'Aujourd\'hui'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: JOURNAUX D'AUDIT (STATIQUE 1-ÉCRAN) */}
        <TabsContent value="audit" className="mt-0">
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
            <CardHeader className="p-2.5 pb-1 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                Traçabilité des Opérations & Connexions ({loginLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="py-1.5 text-[10px] font-bold uppercase pl-3">Utilisateur</TableHead>
                      <TableHead className="py-1.5 text-[10px] font-bold uppercase">Événement / Action</TableHead>
                      <TableHead className="py-1.5 text-[10px] font-bold uppercase">Adresse IP</TableHead>
                      <TableHead className="py-1.5 text-[10px] font-bold uppercase text-right pr-3">Date & Heure</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginLogs.slice(0, 4).map((log) => (
                      <TableRow key={log.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="pl-3 py-1.5 font-bold text-foreground">{log.username}</TableCell>
                        <TableCell className="py-1.5">
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${log.event_type === "Connexion" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-muted text-muted-foreground"}`}>
                            {log.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-1.5 font-mono text-[11px] text-muted-foreground">{log.ip_address}</TableCell>
                        <TableCell className="py-1.5 text-right pr-3 text-muted-foreground">{new Date(log.created_at).toLocaleString("fr-FR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

    </div>
  )
}
