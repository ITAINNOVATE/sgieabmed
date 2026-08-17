"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Shield, Plus, Edit2, Trash2, CheckCircle2, Save, RotateCcw, Search, 
  Layers, Users, CheckSquare, Square, Eye, ShieldCheck, Download, Printer, 
  CornerDownRight, Filter, ShieldAlert, UserCheck
} from "lucide-react"
import { 
  getRoles, createRole, updateRole, deleteRole, UserRole, 
  getUsers, User, getDetailedPermissions, saveDetailedPermissions, 
  DetailedPermissionRow, DEFAULT_DETAILED_PERMISSIONS 
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

export default function RolesAdminPage() {
  const [activeTab, setActiveTab] = useState<"matrix" | "roles_list">("matrix")
  const [targetType, setTargetType] = useState<'user' | 'role'>('user')
  
  // Data states
  const [roles, setRoles] = useState<UserRole[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedRoleCode, setSelectedRoleCode] = useState("")
  const [permissions, setPermissions] = useState<DetailedPermissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters & Search for permissions table
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedModuleFilter, setSelectedModuleFilter] = useState("all")

  // Form states for CRUD Roles
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<UserRole | null>(null)
  const [roleName, setRoleName] = useState("")
  const [roleCode, setRoleCode] = useState("")
  const [roleDescription, setRoleDescription] = useState("")

  useEffect(() => {
    async function loadData() {
      const listRoles = await getRoles()
      const listUsers = await getUsers()
      setRoles(listRoles)
      setUsers(listUsers)

      if (listUsers.length > 0) setSelectedUserId(listUsers[0].id)
      if (listRoles.length > 0) setSelectedRoleCode(listRoles[0].code)

      setLoading(false)
    }
    loadData()
  }, [])

  // Recharge la matrice de permissions quand la cible change (utilisateur ou rôle)
  useEffect(() => {
    async function fetchPermissions() {
      const targetId = targetType === 'user' ? selectedUserId : selectedRoleCode
      if (targetId) {
        const perms = await getDetailedPermissions(targetType, targetId)
        setPermissions(perms)
      }
    }
    fetchPermissions()
  }, [targetType, selectedUserId, selectedRoleCode])

  // Utilisateur et rôle sélectionnés
  const currentUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId])
  const currentRole = useMemo(() => roles.find(r => r.code === selectedRoleCode), [roles, selectedRoleCode])

  // Liste des modules uniques pour le filtre
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

  // --- HANDLERS DU TABLEAU DE PERMISSIONS ---
  const handleCheckboxChange = (id: string, actionKey: typeof ACTION_COLUMNS[number]["key"], checked: boolean) => {
    setPermissions(prev => prev.map(row => {
      if (row.id === id) {
        return { ...row, [actionKey]: checked }
      }
      return row
    }))
  }

  // Basculer toute une ligne (sous-menu)
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

  // Basculer toute une colonne d'action
  const handleToggleColumnAll = (actionKey: typeof ACTION_COLUMNS[number]["key"], enable: boolean) => {
    setPermissions(prev => prev.map(row => ({
      ...row,
      [actionKey]: enable
    })))
  }

  // Sauvegarder les permissions
  const handleSavePermissions = async () => {
    const targetId = targetType === 'user' ? selectedUserId : selectedRoleCode
    if (!targetId) return

    setSaving(true)
    const success = await saveDetailedPermissions(targetType, targetId, permissions)
    setSaving(false)

    if (success) {
      const nameStr = targetType === 'user' 
        ? `${currentUser?.first_name} ${currentUser?.last_name}` 
        : currentRole?.name
      toast.success(`✅ Habilitations et sous-modules enregistrés pour : ${nameStr}`)
    } else {
      toast.error("Erreur lors de l'enregistrement des habilitations.")
    }
  }

  // Réinitialiser les permissions
  const handleResetDefault = async () => {
    if (!confirm("Voulez-vous réinitialiser les habilitations aux paramètres d'usine ?")) return
    const targetId = targetType === 'user' ? selectedUserId : selectedRoleCode
    const defaultPerms = DEFAULT_DETAILED_PERMISSIONS.map(p => ({ ...p }))
    setPermissions(defaultPerms)
    await saveDetailedPermissions(targetType, targetId, defaultPerms)
    toast.info("Permissions réinitialisées par défaut.")
  }

  // --- HANDLERS DU FORMULAIRE DE RÔLE (CRUD) ---
  const openCreateRoleModal = () => {
    setEditingRole(null)
    setRoleName("")
    setRoleCode("")
    setRoleDescription("")
    setShowRoleModal(true)
  }

  const openEditRoleModal = (role: UserRole) => {
    setEditingRole(role)
    setRoleName(role.name)
    setRoleCode(role.code)
    setRoleDescription(role.description)
    setShowRoleModal(true)
  }

  const handleSaveRole = async () => {
    if (!roleName || !roleCode) {
      toast.error("Veuillez remplir le nom et le code du rôle.")
      return
    }

    if (editingRole) {
      const success = await updateRole(editingRole.id, { name: roleName, description: roleDescription })
      if (success) {
        toast.success("Rôle mis à jour avec succès !")
        const data = await getRoles()
        setRoles(data)
      } else {
        toast.error("Erreur lors de la mise à jour du rôle.")
      }
    } else {
      const success = await createRole({
        name: roleName,
        code: roleCode.toUpperCase().replace(/\s+/g, "_"),
        description: roleDescription,
        is_configurable: true
      })
      if (success) {
        toast.success("Nouveau rôle créé avec succès !")
        const data = await getRoles()
        setRoles(data)
      } else {
        toast.error("Erreur lors de la création du rôle.")
      }
    }

    setShowRoleModal(false)
  }

  const handleDeleteRole = async (id: string, name: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le rôle "${name}" ?`)) return
    const success = await deleteRole(id)
    if (success) {
      toast.success("Rôle supprimé avec succès.")
      const data = await getRoles()
      setRoles(data)
    } else {
      toast.error("Erreur lors de la suppression du rôle.")
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-xs text-muted-foreground">Chargement de la gestion des rôles et habilitations...</div>
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300 w-full max-w-7xl mx-auto pb-20">
      
      {/* BANDEAU EN-TÊTE PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-2xl border border-border/60 shadow-2xs">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#0B5ED7]" />
            Gestion des Rôles & Matrice des Habilitations
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Sélectionnez un utilisateur ou un rôle pour cocher directement dans le tableau les modules et sous-modules autorisés.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={openCreateRoleModal} size="sm" className="bg-[#0B5ED7] hover:bg-[#094bb3] text-white shadow-2xs text-xs font-bold gap-1.5 h-9 px-3">
            <Plus className="h-4 w-4" /> Nouveau Rôle
          </Button>
        </div>
      </div>

      {/* ONGLETS PRINCIPAUX : MATRICE PERMISSIONS VS LISTE RÔLES */}
      <Tabs defaultValue="matrix" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <TabsList className="grid grid-cols-2 w-full sm:w-96 h-10 bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="matrix" className="text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0B5ED7] data-[state=active]:shadow-2xs">
              <UserCheck className="h-3.5 w-3.5" /> Matrice Utilisateur & Submodules
            </TabsTrigger>
            <TabsTrigger value="roles_list" className="text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:text-[#0B5ED7] data-[state=active]:shadow-2xs">
              <Shield className="h-3.5 w-3.5" /> Rôles Métier ({roles.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === "matrix" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleResetDefault} className="h-9 text-xs">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Réinitialiser
              </Button>
              <Button onClick={handleSavePermissions} disabled={saving} className="bg-[#0B5ED7] hover:bg-[#094bb3] text-white font-bold h-9 text-xs px-4 gap-1.5 shadow-md">
                <Save className="h-4 w-4" />
                {saving ? "Sauvegarde..." : "Enregistrer les Habilitations"}
              </Button>
            </div>
          )}
        </div>

        {/* TAB 1: MATRICE DES DROITS D'ACCÈS PAR UTILISATEUR OU RÔLE */}
        <TabsContent value="matrix" className="space-y-4 m-0">
          
          {/* CARTE SELECTION CIBLE : UTILISATEUR OU RÔLE */}
          <Card className="border-border/60 shadow-2xs rounded-2xl bg-card">
            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
              
              {/* SELECTEUR TYPE CIBLE */}
              <div className="w-full md:w-56 space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Cible d'habilitation</label>
                <div className="flex bg-muted/60 p-1 rounded-lg border border-border/50">
                  <Button 
                    type="button"
                    variant={targetType === 'user' ? "default" : "ghost"}
                    size="sm"
                    className={`flex-1 h-7 text-xs font-bold ${targetType === 'user' ? "bg-[#0B5ED7] text-white" : ""}`}
                    onClick={() => setTargetType('user')}
                  >
                    Utilisateur
                  </Button>
                  <Button 
                    type="button"
                    variant={targetType === 'role' ? "default" : "ghost"}
                    size="sm"
                    className={`flex-1 h-7 text-xs font-bold ${targetType === 'role' ? "bg-[#0B5ED7] text-white" : ""}`}
                    onClick={() => setTargetType('role')}
                  >
                    Rôle
                  </Button>
                </div>
              </div>

              {/* LISTE DÉROULANTE UTILISATEUR OU RÔLE */}
              {targetType === 'user' ? (
                <div className="w-full md:w-80 space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sélectionner l'Utilisateur *</label>
                  <Select value={selectedUserId} onValueChange={(val) => setSelectedUserId(val || "")}>
                    <SelectTrigger className="h-9 text-xs font-bold bg-background">
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
              ) : (
                <div className="w-full md:w-80 space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sélectionner le Rôle *</label>
                  <Select value={selectedRoleCode} onValueChange={(val) => setSelectedRoleCode(val || "")}>
                    <SelectTrigger className="h-9 text-xs font-bold bg-background">
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
              )}

              {/* FICHE SYNTHÈSE ACCÈS */}
              <div className="flex-1 p-3 bg-muted/30 rounded-xl border border-border/60 text-xs text-muted-foreground flex gap-3 items-center">
                <ShieldAlert className="h-6 w-6 text-[#0B5ED7] shrink-0" strokeWidth={1.8} />
                <div>
                  {targetType === 'user' ? (
                    <>
                      <p className="font-extrabold text-foreground text-sm flex items-center gap-2">
                        {currentUser?.first_name} {currentUser?.last_name} 
                        <Badge className="bg-[#1B5C2E] text-white text-[10px]">{currentUser?.role}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Identifiant: <span className="font-mono font-bold text-foreground">{currentUser?.username}</span> | Email: {currentUser?.email}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-extrabold text-foreground text-sm flex items-center gap-2">
                        {currentRole?.name} <Badge variant="outline" className="text-[10px] font-mono">{currentRole?.code}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{currentRole?.description}</p>
                    </>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>

          {/* FILTRES & RECHERCHE */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input 
                type="text"
                placeholder="RECHERCHER UN MODULE, SOUS-MENU OU LIEN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs uppercase bg-card border-border/80 font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Button 
                variant={selectedModuleFilter === "all" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setSelectedModuleFilter("all")}
                className={`h-7.5 text-[11px] rounded-lg ${selectedModuleFilter === "all" ? "bg-[#0B5ED7] text-white font-bold" : ""}`}
              >
                Tous les modules
              </Button>
              {uniqueModules.map(mod => (
                <Button 
                  key={mod}
                  variant={selectedModuleFilter === mod ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setSelectedModuleFilter(mod)}
                  className={`h-7.5 text-[11px] rounded-lg whitespace-nowrap ${selectedModuleFilter === mod ? "bg-[#0B5ED7] text-white font-bold" : ""}`}
                >
                  {mod}
                </Button>
              ))}
            </div>
          </div>

          {/* TABLEAU MATRICE DES MODULES ET SOUS-MODULES (CHECKBOXES) */}
          <Card className="border-border/60 shadow-2xs rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-muted/20 border-b border-border/50 py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#0B5ED7]" />
                Tableau des Habilitations par Modules & Sous-modules ({filteredPermissions.length})
              </CardTitle>
              <div className="flex items-center gap-2 text-xs">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleToggleColumnAll('can_view', true)}
                  className="h-7 text-[11px] font-bold text-[#0B5ED7] hover:bg-[#0B5ED7]/10"
                >
                  <CheckSquare className="h-3.5 w-3.5 mr-1" /> Accorder tout l'accès 👁️
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="pl-4 min-w-[260px] text-xs font-bold uppercase">Module / Sous-Menu</TableHead>
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
                          Aucun sous-menu trouvé pour la recherche.
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
                            
                            {/* Module / Submenu Name */}
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

                            {/* Path */}
                            <TableCell className="py-2.5 font-mono text-[11px] text-muted-foreground">
                              {row.path}
                            </TableCell>

                            {/* Checkboxes */}
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

                            {/* Actions rapides par sous-menu */}
                            <TableCell className="text-center pr-4 py-2.5">
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleToggleRowAll(row.id, !allRowChecked)}
                                className="h-7 text-[10px] font-bold px-2 hover:bg-muted/80"
                              >
                                {allRowChecked ? (
                                  <span className="text-destructive flex items-center gap-1"><Square className="h-3 w-3" /> Désactiver</span>
                                ) : (
                                  <span className="text-[#0B5ED7] flex items-center gap-1"><CheckSquare className="h-3 w-3" /> Tout accorder</span>
                                )}
                              </Button>
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

          {/* PIED DE PAGE AVEC ENREGISTREMENT */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={handleResetDefault} className="gap-2 text-xs">
              <RotateCcw className="h-4 w-4" />
              Réinitialiser les permissions
            </Button>
            <Button onClick={handleSavePermissions} disabled={saving} className="bg-[#0B5ED7] hover:bg-[#094bb3] text-white shadow-lg font-bold gap-2 px-8">
              <Save className="h-4 w-4" />
              {saving ? "Enregistrement..." : "Enregistrer les Habilitations de l'Utilisateur"}
            </Button>
          </div>

        </TabsContent>

        {/* TAB 2: GESTION & DEFINITION DES ROLES METIER */}
        <TabsContent value="roles_list" className="space-y-4 m-0">
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden w-full">
            <CardHeader className="p-4 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#0B5ED7]" />
                Catalogue des Rôles Système & Métier ABMed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="pl-4 w-64">Intitulé du rôle</TableHead>
                      <TableHead className="w-48">Code Habilitation</TableHead>
                      <TableHead>Description métier / Périmètre d'action</TableHead>
                      <TableHead className="w-32">Type</TableHead>
                      <TableHead className="w-24 text-center pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id} className="hover:bg-muted/10 align-middle">
                        <TableCell className="pl-4 font-bold text-foreground text-xs">{role.name}</TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">{role.code}</TableCell>
                        <TableCell className="text-xs text-muted-foreground leading-normal">{role.description}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              !role.is_configurable
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }
                          >
                            {!role.is_configurable ? "Système" : "Personnalisé"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center pr-4">
                          <div className="flex justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => openEditRoleModal(role)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {role.is_configurable && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteRole(role.id, role.name)}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL CREATION / EDITION ROLE */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {editingRole ? "Modifier le rôle" : "Créer un nouveau rôle"}
              </CardTitle>
              <CardDescription className="text-xs">
                Définissez le rôle fonctionnel pour le modèle de sécurité.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Intitulé du rôle *</label>
                <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="" className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Code unique *</label>
                <Input value={roleCode} onChange={e => setRoleCode(e.target.value)} disabled={!!editingRole} placeholder="" className="h-9 text-xs font-mono uppercase" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Description fonctionnelle</label>
                <Textarea value={roleDescription} onChange={e => setRoleDescription(e.target.value)} placeholder="" className="min-h-[100px] text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                <Button variant="ghost" size="sm" onClick={() => setShowRoleModal(false)}>Annuler</Button>
                <Button size="sm" onClick={handleSaveRole} className="bg-[#0B5ED7] hover:bg-[#094bb3] text-white">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
