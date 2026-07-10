"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Users, UserPlus, KeyRound, MoreHorizontal } from "lucide-react"

export default function UsersPage() {
  const users = [
    { name: "Dr. Kadia Barry", email: "k.barry@abmed.gov", role: "Administrateur", status: "Actif", lastLogin: "Aujourd'hui, 08:30" },
    { name: "M. Ousmane Sylla", email: "o.sylla@abmed.gov", role: "Gestionnaire", status: "Actif", lastLogin: "Aujourd'hui, 09:15" },
    { name: "Dr. Aissatou Diallo", email: "a.diallo@abmed.gov", role: "Analyste", status: "Actif", lastLogin: "Hier, 16:45" },
    { name: "M. Ibrahima Camara", email: "i.camara@abmed.gov", role: "Auditeur", status: "Inactif", lastLogin: "Il y a 2 mois" },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des Utilisateurs</h2>
          <p className="text-muted-foreground text-sm">Contrôle des accès et des permissions du système.</p>
        </div>
        <Button className="shadow-sm"><UserPlus className="mr-2 h-4 w-4" /> Nouvel utilisateur</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl"><Users className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Utilisateurs</p>
              <h3 className="text-2xl font-bold">24</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-xl"><Shield className="h-6 w-6 text-emerald-500" /></div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Administrateurs</p>
              <h3 className="text-2xl font-bold">3</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Liste des accès</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border/50">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-background">{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === "Actif" ? "default" : "secondary"}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </TableCell>
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
