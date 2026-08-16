"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Key, Save, ShieldAlert, CheckCircle2, RotateCcw, Search, 
  Layers, Users, Shield, CheckSquare, Square, Eye, Plus, Edit2, 
  Trash2, ShieldCheck, Download, Printer, CornerDownRight, Filter
} from "lucide-react"
import { 
  getRoles, getUsers, getDetailedPermissions, saveDetailedPermissions, 
  UserRole, User, DetailedPermissionRow, DEFAULT_DETAILED_PERMISSIONS 
} from "../adminMockData"
import { toast } from "sonner"

const ACTION_COLUMNS = [
  { key: "can_view" as const, label: "Accès / Voir", icon: Eye, description: "Afficher le menu et accéder à la page" },
  { key: "can_create" as const, label: "Créer", icon: Plus, description: "Ajouter de nouveaux enregistrements" },
  { key: "can_modify" as const, label: "Modifier", icon: Edit2, description: "Éditer les données existantes" },
  { key: "can_delete" as const, label: "Supprimer", icon: Trash2, description: "Supprimer des enregistrements" },
  { key: "can_validate" as const, label: "Valider", icon: ShieldCheck, description: "Valider les opérations et contrôles" },
  { key: "can_export" as const, label: "Exporter", icon: Download, description: "Exporter en Excel ou PDF" },
  { key: "can_print" as const, label: "Imprimer", icon: Printer, description: "Imprimer les étiquettes et rapports" },
]

export default function PermissionsAdminPage() {
  const [targetType, setTargetType] = useState<'role' | 'user'>('role')
  const [roles, setRoles] = useState<UserRole[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedRoleCode, setSelectedRoleCode] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [permissions, setPermissions] = useState<DetailedPermissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedModuleFilter, setSelectedModuleFilter] = useState("all")

  useEffect(() => {
    async function loadInitial() {
      const listRoles = await getRoles()
      const listUsers = await getUsers()
      setRoles(listRoles)
      setUsers(listUsers)

      if (listRoles.length > 0) setSelectedRoleCode(listRoles[0].code)
      if (listUsers.length > 0) setSelectedUserId(listUsers[0].id)

      setLoading(false)
    }
    loadInitial()
  }, [])

  // Charge les permissions dès que la cible (rôle ou utilisateur) change
  useEffect(() => {
    async function loadPerms() {
      setLoading(true)
      const targetId = targetType === 'role' ? selectedRoleCode : selectedUserId
      if (targetId) {
        const perms = await getDetailedPermissions(targetType, targetId)
        setPermissions(perms)
      }
      setLoading(false)
    }
    loadPerms()
  }, [targetType, selectedRoleCode, selectedUserId])

  // Cible courante
  const currentRole = useMemo(() => roles.find(r => r.code === selectedRoleCode), [roles, selectedRoleCode])
  const currentUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId])

  // Modules uniques pour le filtre
  const uniqueModules = useMemo(() => {
    const set = new Set<string>()
    DEFAULT_DETAILED_PERMISSIONS.forEach(p => set.add(p.module))
    return Array.from(set)
  }, [])

  // Filtrage des lignes de permissions
  const filteredPermissions = useMemo(() => {
    return permissions.filter(row => {
      const matchesModule = selectedModuleFilter === "all" || row.module === selectedModuleFilter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || 
        row.module.toLowerCase().includes(q) || 
        row.submenu.toLowerCase().includes(q) || 
        row.path.toLowerCase().includes(q)
      return matchesModule && matchesSearch
    })
  }, [permissions, selectedModuleFilter, searchQuery])

  // --- LOGIQUE DE MODIFICATION DE PERMISSION ---
  const handleCheckboxChange = (id: string, actionKey: typeof ACTION_COLUMNS[number]["key"], checked: boolean) => {
    setPermissions(prev => prev.map(row => {
      if (row.id === id) {
        return { ...row, [actionKey]: checked }
      }
      return row
    }))
  }

  // Basculer toute une ligne (Sous-menu)
  const handleToggleRowAll = (id: string, enable: boolean) => {
    setPermissions(prev => prev.map(row => {
      if (row.id === id) {
        return {
          ...row,
          can_view: enable,
          can_create: enable,
          can_modify: enable,
          can_delete: enable,
          can_validate: enable,
          can_export: enable,
          can_print: enable,
        }
      }
      return row
    }))
  }

  // Basculer toute une colonne (actionKey)
  const handleToggleColumnAll = (actionKey: typeof ACTION_COLUMNS[number]["key"], enable: boolean) => {
    setPermissions(prev => prev.map(row => ({
      ...row,
      [actionKey]: enable
    })))
  }

  // Basculer tout le module parent et ses sous-menus
  const handleToggleModuleAll = (moduleName: string, enable: boolean) => {
    setPermissions(prev => prev.map(row => {
      if (row.module === moduleName) {
        return {
          ...row,
          can_view: enable,
          can_create: enable,
          can_modify: enable,
          can_delete: enable,
          can_validate: enable,
          can_export: enable,
          can_print: enable,
        }
      }
      return row
    }))
  }

  // Enregistrer
  const handleSave = async () => {
    const targetId = targetType === 'role' ? selectedRoleCode : selectedUserId
    if (!targetId) return

    setSaving(true)
    const success = await saveDetailedPermissions(targetType, targetId, permissions)
    setSaving(false)

    if (success) {
      const nameStr = targetType === 'role' ? currentRole?.name : `${currentUser?.first_name} ${currentUser?.last_name}`
      toast.success(`✅ Matrice des permissions sauvegardée pour ${nameStr} !`)
    } else {
      toast.error("Erreur lors de la sauvegarde de la matrice de permissions.")
    }
  }

  // Réinitialiser
  const handleResetDefault = async () => {
    if (!confirm("Voulez-vous vraiment réinitialiser toutes les habilitations de cette matrice aux paramètres d'usine ?")) return
    const targetId = targetType === 'role' ? selectedRoleCode : selectedUserId
    const defaultPerms = DEFAULT_DETAILED_PERMISSIONS.map(p => ({ ...p }))
    setPermissions(defaultPerms)
    await saveDetailedPermissions(targetType, targetId, defaultPerms)
    toast.info("Permissions réinitialisées aux valeurs par défaut.")
  }

  if (loading && roles.length === 0) {
    return <div className="text-center py-20 text-muted-foreground text-sm font-medium">Chargement de la matrice d'habilitation...</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-7xl mx-auto pb-20">
      
      {/* HEADER PAGE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-xs sticky top-20 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#0B5ED7]" />
            Matrice des Rôles, Menus & Habilitations
          </h2>
          <p className="text-muted-foreground text-xs">
            Associez et verrouillez l'accès aux modules, sous-menus et fonctionnalités spécifiques par rôle ou par utilisateur.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefault} className="h-9 text-xs">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={saving} className="shadow-md h-9 text-xs bg-[#0B5ED7] hover:bg-[#094bb3] text-white font-bold gap-1.5 px-4">
            <Save className="h-4 w-4" />
            {saving ? "Sauvegarde..." : "Enregistrer la Matrice"}
          </Button>
        </div>
      </div>

      {/* SÉLECTEUR DE CIBLE : RÔLE vs UTILISATEUR INDIVIDUEL */}
      <Tabs defaultValue="role" value={targetType} onValueChange={(v) => setTargetType(v as 'role' | 'user')} className="w-full">
        <TabsList className="grid w-full sm:w-80 grid-cols-2 h-10 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="role" className="text-xs font-bold gap-2">
            <Shield className="h-3.5 w-3.5" /> Par Rôle
          </TabsTrigger>
          <TabsTrigger value="user" className="text-xs font-bold gap-2">
            <Users className="h-3.5 w-3.5" /> Par Utilisateur
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* CARTE SELECTION RÔLE / UTILISATEUR */}
      <Card className="border-border/50 shadow-xs rounded-2xl bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
          
          {targetType === 'role' ? (
            <div className="w-full md:w-80 space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sélectionner le Rôle</label>
              <Select value={selectedRoleCode} onValueChange={(val) => setSelectedRoleCode(val || "")}>
                <SelectTrigger className="h-10 text-xs font-semibold">
                  <SelectValue placeholder="Choisir un rôle..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.code} className="text-xs">
                      <span className="font-bold">{r.name}</span> <span className="text-muted-foreground font-mono">({r.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="w-full md:w-80 space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sélectionner l'Utilisateur</label>
              <Select value={selectedUserId} onValueChange={(val) => setSelectedUserId(val || "")}>
                <SelectTrigger className="h-10 text-xs font-semibold">
                  <SelectValue placeholder="Choisir un utilisateur..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      <span className="font-bold">{u.first_name} {u.last_name}</span> — <span className="text-muted-foreground">{u.fonction || u.role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* FICHE RÉCAPITULATIVE CIBLE */}
          <div className="flex-1 p-3 bg-muted/30 rounded-xl border border-border/60 text-xs text-muted-foreground flex gap-3 items-center">
            <ShieldAlert className="h-6 w-6 text-[#0B5ED7] shrink-0" strokeWidth={1.8} />
            <div>
              {targetType === 'role' ? (
                <>
                  <p className="font-extrabold text-foreground text-sm flex items-center gap-2">
                    {currentRole?.name} <Badge variant="outline" className="text-[10px] uppercase font-mono">{currentRole?.code}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{currentRole?.description}</p>
                </>
              ) : (
                <>
                  <p className="font-extrabold text-foreground text-sm flex items-center gap-2">
                    {currentUser?.first_name} {currentUser?.last_name} <Badge className="bg-[#1B5C2E] text-white text-[10px]">{currentUser?.role}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Matricule: {currentUser?.matricule} | Email: {currentUser?.email}</p>
                </>
              )}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* BARRE DE FILTRES ET RECHERCHE */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input 
            type="text"
            placeholder="RECHERCHER UN MENU, SOUS-MENU OU CHEMIN..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs uppercase bg-card border-border/80 shadow-2xs font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Button 
            variant={selectedModuleFilter === "all" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setSelectedModuleFilter("all")}
            className={`h-7.5 text-xs rounded-lg ${selectedModuleFilter === "all" ? "bg-[#0B5ED7] text-white" : ""}`}
          >
            Tous les modules
          </Button>
          {uniqueModules.map(mod => (
            <Button 
              key={mod}
              variant={selectedModuleFilter === mod ? "default" : "outline"} 
              size="sm" 
              onClick={() => setSelectedModuleFilter(mod)}
              className={`h-7.5 text-xs rounded-lg whitespace-nowrap ${selectedModuleFilter === mod ? "bg-[#0B5ED7] text-white" : ""}`}
            >
              {mod}
            </Button>
          ))}
        </div>
      </div>

      {/* TABLEAU MATRICE D'HABILITATION PAR SOUS-MENUS */}
      <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardHeader className="bg-muted/20 border-b border-border/50 py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#0B5ED7]" />
            Matrice des Menus & Droits d'Accès Granulaires ({filteredPermissions.length})
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleToggleColumnAll('can_view', true)}
              className="h-7 text-[11px] font-semibold text-[#0B5ED7] hover:bg-[#0B5ED7]/10"
            >
              <CheckSquare className="h-3.5 w-3.5 mr-1" /> Accorder tout l'accès 👁️
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4 min-w-[260px] text-xs font-bold uppercase">Menu / Sous-Menu</TableHead>
                  <TableHead className="min-w-[140px] text-xs font-bold uppercase">Chemin / URL</TableHead>
                  {ACTION_COLUMNS.map(col => {
                    const IconComp = col.icon
                    const allChecked = permissions.every(p => p[col.key])
                    return (
                      <TableHead key={col.key} className="text-center min-w-[95px] p-2">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="flex items-center gap-1 text-[11px] font-extrabold text-foreground">
                            <IconComp className="h-3.5 w-3.5 text-[#0B5ED7]" />
                            {col.label}
                          </span>
                          <Checkbox 
                            checked={allChecked}
                            onCheckedChange={(checked) => handleToggleColumnAll(col.key, !!checked)}
                            className="h-3.5 w-3.5 data-[state=checked]:bg-[#0B5ED7] data-[state=checked]:border-[#0B5ED7]"
                            title={`Cocher/décocher tout la colonne ${col.label}`}
                          />
                        </div>
                      </TableHead>
                    )
                  })}
                  <TableHead className="text-center w-28 pr-4 text-xs font-bold uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-xs text-muted-foreground">
                      Aucun sous-menu trouvé pour le filtre actuel.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPermissions.map((row) => {
                    const allRowChecked = ACTION_COLUMNS.every(c => row[c.key])

                    return (
                      <TableRow 
                        key={row.id} 
                        className={`text-xs transition-colors hover:bg-muted/20 ${
                          row.is_parent ? "bg-muted/30 font-bold border-t-2 border-border/80" : ""
                        }`}
                      >
                        
                        {/* Menu / Submenu Title */}
                        <TableCell className="pl-4 py-2.5">
                          {row.is_parent ? (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-[#0B5ED7] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                                Module Principal
                              </Badge>
                              <span className="font-extrabold text-sm text-foreground">{row.module}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 pl-4">
                              <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-bold text-foreground">{row.submenu}</span>
                            </div>
                          )}
                        </TableCell>

                        {/* Path / URL */}
                        <TableCell className="py-2.5 font-mono text-[11px] text-muted-foreground">
                          {row.path}
                        </TableCell>

                        {/* Matrix Checkboxes */}
                        {ACTION_COLUMNS.map(col => {
                          const isChecked = !!row[col.key]
                          return (
                            <TableCell key={col.key} className="text-center py-2.5">
                              <Checkbox 
                                checked={isChecked}
                                onCheckedChange={(checked) => handleCheckboxChange(row.id, col.key, !!checked)}
                                className="h-4 w-4 data-[state=checked]:bg-[#0B5ED7] data-[state=checked]:border-[#0B5ED7]"
                              />
                            </TableCell>
                          )
                        })}

                        {/* Quick Row Actions */}
                        <TableCell className="text-center pr-4 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              type="button"
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleToggleRowAll(row.id, !allRowChecked)}
                              className="h-7 text-[10px] font-bold px-2 hover:bg-muted/80"
                              title={allRowChecked ? "Tout décocher pour ce sous-menu" : "Tout cocher pour ce sous-menu"}
                            >
                              {allRowChecked ? (
                                <span className="text-destructive flex items-center gap-1"><Square className="h-3 w-3" /> Désactiver</span>
                              ) : (
                                <span className="text-[#0B5ED7] flex items-center gap-1"><CheckSquare className="h-3 w-3" /> Tout accorder</span>
                              )}
                            </Button>
                          </div>
                        </TableCell>

                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* FOOTER ACTIONS BOUTON DE SAUVEGARDE DE BAS DE PAGE */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={handleResetDefault} className="gap-2 text-xs">
          <RotateCcw className="h-4 w-4" />
          Réinitialiser la matrice
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-[#0B5ED7] hover:bg-[#094bb3] text-white shadow-lg font-bold gap-2 px-8">
          <Save className="h-4 w-4" />
          {saving ? "Sauvegarde..." : "Enregistrer les Habilitations"}
        </Button>
      </div>

    </div>
  )
}
