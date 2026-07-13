"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Plus, MoreVertical, Search, Shield, Building2, UserPlus, 
  UserX, KeyRound, Unlock, RefreshCw, Trash, UserCheck, ShieldAlert 
} from "lucide-react"
import { 
  getUsers, getDepartments, getRoles, 
  User, Department, UserRole,
  createUser, updateUser, updateUserStatus, resetUserPassword,
  unlockUserAccount, resetUserMFA, softDeleteUser
} from "../adminMockData"
import { toast } from "sonner"

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)

  // Filters state
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDept, setSelectedDept] = useState("all")
  const [selectedRole, setSelectedRole] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  // Modal / Form state
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  // Form fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [matricule, setMatricule] = useState("")
  const [fonction, setFonction] = useState("")
  const [deptId, setDeptId] = useState("")
  const [roleName, setRoleName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [status, setStatus] = useState<"Actif" | "Suspendu" | "Désactivé">("Actif")

  useEffect(() => {
    async function load() {
      const [u, d, r] = await Promise.all([
        getUsers(),
        getDepartments(),
        getRoles()
      ])
      setUsers(u)
      setDepartments(d)
      setRoles(r)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>
  }

  // --- ACTIONS HANDLERS ---
  const openCreateModal = () => {
    setEditingUser(null)
    setFirstName("")
    setLastName("")
    setMatricule("")
    setFonction("")
    setDeptId(departments[0]?.id || "")
    setRoleName(roles[0]?.name || "")
    setPhone("")
    setEmail("")
    setUsername("")
    setStatus("Actif")
    setShowModal(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFirstName(user.first_name)
    setLastName(user.last_name)
    setMatricule(user.matricule)
    setFonction(user.fonction)
    setDeptId(user.department_id)
    setRoleName(user.role)
    setPhone(user.phone)
    setEmail(user.email)
    setUsername(user.username)
    setStatus(user.status)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!firstName || !lastName || !email || !username) {
      toast.error("Veuillez remplir les champs obligatoires (Nom, Prénom, Email, Nom d'utilisateur)")
      return
    }
    
    if (editingUser) {
      // Edit mode
      const success = await updateUser(editingUser.id, {
        first_name: firstName,
        last_name: lastName,
        matricule,
        fonction,
        department_id: deptId,
        role: roleName,
        phone,
        email,
        username,
        status
      })
      if (success) {
        toast.success("Utilisateur mis à jour avec succès !")
        const data = await getUsers()
        setUsers(data)
      } else {
        toast.error("Erreur lors de la modification de l'utilisateur.")
      }
    } else {
      // Create mode
      const res = await createUser({
        first_name: firstName,
        last_name: lastName,
        matricule,
        fonction,
        department_id: deptId,
        role: roleName,
        phone,
        email,
        username
      })
      if (res.success && res.tempPass) {
        alert(`Compte créé avec succès !\n\nNom d'utilisateur : ${username}\nMot de passe temporaire : ${res.tempPass}\n\nL'utilisateur devra changer son mot de passe lors de sa première connexion.`)
        const data = await getUsers()
        setUsers(data)
      } else {
        toast.error(res.error || "Erreur lors de la création de l'utilisateur.")
      }
    }
    
    setShowModal(false)
  }

  const handleToggleStatus = async (id: string, newStatus: "Actif" | "Suspendu" | "Désactivé") => {
    const success = await updateUserStatus(id, newStatus)
    if (success) {
      toast.success(`Le statut du compte a été configuré sur ${newStatus}.`)
      const data = await getUsers()
      setUsers(data)
    } else {
      toast.error("Erreur lors de la mise à jour du statut.")
    }
  }

  const handleResetPassword = async (id: string, email: string) => {
    const resultMsg = await resetUserPassword(id, email)
    if (resultMsg) {
      alert(`Réinitialisation effectuée !\n\n${resultMsg}`)
      const data = await getUsers()
      setUsers(data)
    } else {
      toast.error("Erreur lors de la réinitialisation du mot de passe.")
    }
  }

  const handleUnlockAccount = async (id: string) => {
    const success = await unlockUserAccount(id)
    if (success) {
      toast.success("Le compte a été déverrouillé avec succès.")
      const data = await getUsers()
      setUsers(data)
    } else {
      toast.error("Erreur lors du déverrouillage du compte.")
    }
  }

  const handleResetMFA = async (id: string) => {
    const success = await resetUserMFA(id)
    if (success) {
      toast.success("La double authentification (MFA) a été désactivée/réinitialisée pour cet utilisateur.")
      const data = await getUsers()
      setUsers(data)
    } else {
      toast.error("Erreur lors de la réinitialisation de la MFA.")
    }
  }

  const handleSoftDelete = async (id: string) => {
    const confirm = window.confirm("Souhaitez-vous supprimer cet utilisateur ? Cette opération effectuera un archivage logique (désactivation de sécurité).")
    if (!confirm) return

    const success = await softDeleteUser(id)
    if (success) {
      toast.success("L'utilisateur a été supprimé (désactivation logique).")
      const data = await getUsers()
      setUsers(data)
    } else {
      toast.error("Erreur lors de la suppression de l'utilisateur.")
    }
  }

  // --- FILTERING LOGIC ---
  const filteredUsers = users.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          user.fonction.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.username.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesDept = selectedDept === "all" || user.department_id === selectedDept
    const matchesRole = selectedRole === "all" || user.role === selectedRole
    const matchesStatus = selectedStatus === "all" || user.status === selectedStatus

    return matchesSearch && matchesDept && matchesRole && matchesStatus
  })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des Utilisateurs</h2>
          <p className="text-muted-foreground mt-1">
            Création, habilitations, rôles et états des comptes utilisateurs de l'ABMed.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shadow-md bg-[#0B5ED7] hover:bg-[#094bb3] text-white">
          <UserPlus className="mr-2 h-4 w-4" />
          Nouvel Utilisateur
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="border-border/50 shadow-sm rounded-2xl bg-card">
        <CardContent className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom, matricule..."
              className="pl-9 h-10 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={selectedDept} onValueChange={(val) => setSelectedDept(val || "all")}>
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder="Filtrer par service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les services</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val || "all")}>
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {roles.map(r => (
                <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || "all")}>
            <SelectTrigger className="h-10 text-xs">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="Actif">Actif</SelectItem>
              <SelectItem value="Suspendu">Suspendu</SelectItem>
              <SelectItem value="Désactivé">Désactivé</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Users List Table */}
      <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-4 w-12">Avatar</TableHead>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Matricule / Fonction</TableHead>
                  <TableHead>Service / Direction</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead className="w-12 text-center pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Aucun utilisateur ne correspond aux critères.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const dept = departments.find(d => d.id === user.department_id)
                    const isLocked = user.locked_until && new Date(user.locked_until) > new Date()
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/10 align-middle">
                        {/* Avatar */}
                        <TableCell className="pl-4">
                          <div className="w-9 h-9 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm border border-primary/20">
                            {user.first_name[0]}{user.last_name[0]}
                          </div>
                        </TableCell>
                        
                        {/* Full name & Username */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground">{user.first_name} {user.last_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">@{user.username}</p>
                          </div>
                        </TableCell>

                        {/* Matricule & Fonction */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-[10px] text-muted-foreground font-mono">{user.matricule || "N/A"}</p>
                            <p className="text-xs text-foreground font-medium">{user.fonction}</p>
                          </div>
                        </TableCell>

                        {/* Department */}
                        <TableCell className="text-xs text-muted-foreground">
                          {dept?.name || "N/A"}
                        </TableCell>

                        {/* Role badge */}
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] py-0.5 bg-slate-100 text-slate-800 dark:bg-slate-900/35 dark:text-slate-300">
                            {user.role}
                          </Badge>
                        </TableCell>

                        {/* Status badge */}
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge 
                              variant="outline" 
                              className={
                                user.status === "Actif"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"
                                  : user.status === "Suspendu"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900"
                                  : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900"
                              }
                            >
                              {user.status}
                            </Badge>
                            {isLocked && (
                              <Badge className="bg-red-500 text-white text-[9px] py-0">Verrouillé</Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Last Login */}
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {user.last_login !== "Jamais" ? new Date(user.last_login).toLocaleDateString("fr-FR") : "Jamais"}
                        </TableCell>

                        {/* Action menu */}
                        <TableCell className="text-center pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => openEditModal(user)} className="gap-2 cursor-pointer text-xs">
                                <RefreshCw className="h-3.5 w-3.5" /> Modifier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.status !== "Actif" && (
                                <DropdownMenuItem onClick={() => handleToggleStatus(user.id, "Actif")} className="gap-2 cursor-pointer text-xs text-emerald-600">
                                  <UserCheck className="h-3.5 w-3.5" /> Activer
                                </DropdownMenuItem>
                              )}
                              {user.status !== "Suspendu" && (
                                <DropdownMenuItem onClick={() => handleToggleStatus(user.id, "Suspendu")} className="gap-2 cursor-pointer text-xs text-amber-600">
                                  <UserX className="h-3.5 w-3.5" /> Suspendre
                                </DropdownMenuItem>
                              )}
                              {user.status !== "Désactivé" && (
                                <DropdownMenuItem onClick={() => handleToggleStatus(user.id, "Désactivé")} className="gap-2 cursor-pointer text-xs text-red-600">
                                  <UserX className="h-3.5 w-3.5" /> Désactiver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleResetPassword(user.id, user.email)} className="gap-2 cursor-pointer text-xs">
                                <KeyRound className="h-3.5 w-3.5" /> Réinitialiser MDP
                              </DropdownMenuItem>
                              {isLocked && (
                                <DropdownMenuItem onClick={() => handleUnlockAccount(user.id)} className="gap-2 cursor-pointer text-xs text-blue-600">
                                  <Unlock className="h-3.5 w-3.5" /> Déverrouiller compte
                                </DropdownMenuItem>
                              )}
                              {user.mfa_enabled && (
                                <DropdownMenuItem onClick={() => handleResetMFA(user.id)} className="gap-2 cursor-pointer text-xs">
                                  <ShieldAlert className="h-3.5 w-3.5" /> Réinitialiser MFA
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleSoftDelete(user.id)} className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive">
                                <Trash className="h-3.5 w-3.5" /> Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Modal CRUD Edit/Create */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl shadow-2xl border-none">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {editingUser ? "Modifier le compte utilisateur" : "Créer un nouvel utilisateur"}
              </CardTitle>
              <CardDescription className="text-xs">
                Remplissez les détails du compte professionnel de l'autorité ABMed.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Prénom *</label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ex: Kadia" className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Nom *</label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Ex: Barry" className="h-9 text-xs" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Nom d'utilisateur *</label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Ex: k.barry" className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Matricule</label>
                  <Input value={matricule} onChange={e => setMatricule(e.target.value)} placeholder="Ex: ABM-2024-..." className="h-9 text-xs" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Email Professionnel *</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ex: k.barry@abmed.gov" className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Téléphone</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ex: +229 97..." className="h-9 text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Fonction / Titre professionnel</label>
                <Input value={fonction} onChange={e => setFonction(e.target.value)} placeholder="Ex: Chargé de la libération des lots" className="h-9 text-xs" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Service / Direction *</label>
                  <Select value={deptId} onValueChange={(val) => setDeptId(val || "")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Rôle d'Accès *</label>
                  <Select value={roleName} onValueChange={(val) => setRoleName(val || "")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editingUser && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground/80">Statut du compte</label>
                  <Select value={status} onValueChange={(val) => setStatus((val as any) || "Actif")}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Actif">Actif</SelectItem>
                      <SelectItem value="Suspendu">Suspendu</SelectItem>
                      <SelectItem value="Désactivé">Désactivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button size="sm" onClick={handleSave} className="bg-[#0B5ED7] hover:bg-[#094bb3] text-white">Sauvegarder</Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
