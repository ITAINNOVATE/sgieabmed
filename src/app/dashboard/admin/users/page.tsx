"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  Plus, MoreVertical, Search, Shield, Building2, UserPlus, 
  UserX, KeyRound, Unlock, RefreshCw, Trash, UserCheck, ShieldAlert,
  Copy, Check, ShieldCheck, AlertCircle, Key, Eye, EyeOff, 
  Download, Users, MapPin, Sparkles, Share2, Phone, Mail
} from "lucide-react"
import { 
  getUsers, getDepartments, getRoles, 
  User, Department, UserRole,
  createUser, updateUser, updateUserStatus, resetUserPassword,
  unlockUserAccount, resetUserMFA, softDeleteUser
} from "../adminMockData"
import { 
  getRegisteredCenters, 
  getRegisteredCentersSync, 
  getCenterDefaultPassword, 
  resetCenterPassword, 
  toggleCenterStatus, 
  CENTER_TYPES, 
  Center 
} from "@/utils/centers-storage"
import { exportToExcel } from "@/utils/exportUtils"
import { toast } from "sonner"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

function UsersAdminContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<"agents" | "centers">("agents")

  // --- ÉTAT UTILISATEURS INTERNES (AGENTS ABMED) ---
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(false)

  // Filtres agents
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDept, setSelectedDept] = useState("all")
  const [selectedRole, setSelectedRole] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  // Modal / Form state (Agents)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
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

  // --- ÉTAT CENTRES APPORTEURS (ÉTABLISSEMENTS PARTENAIRES) ---
  const [centers, setCenters] = useState<Center[]>(() => getRegisteredCentersSync())
  const [centerSearchTerm, setCenterSearchTerm] = useState("")
  const [centerTypeFilter, setCenterTypeFilter] = useState("all")
  const [centerStatusFilter, setCenterStatusFilter] = useState("all")
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  const [showAllPasswords, setShowAllPasswords] = useState(false)

  // Credentials modal state (Affichage mot de passe initial généré)
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string
    username: string
    email: string
    role: string
    tempPass: string
    isReset?: boolean
    isCenter?: boolean
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const copyCredentials = (pass: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pass)
      setCopied(true)
      toast.success("Mot de passe copié dans le presse-papiers !")
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const copyCenterIdentifier = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code)
      toast.success(`Identifiant unique ${code} copié !`)
    }
  }

  const togglePasswordVisibility = (code: string) => {
    setVisiblePasswords(prev => ({ ...prev, [code]: !prev[code] }))
  }

  // --- CHARGEMENT GLOBAL ---
  const load = async () => {
    const [u, d, r, c] = await Promise.all([
      getUsers(),
      getDepartments(),
      getRoles(),
      getRegisteredCenters()
    ])
    setUsers(u)
    setDepartments(d)
    setRoles(r)
    setCenters(c)
    setLoading(false)
    return { u, d, r, c }
  }

  useEffect(() => {
    load().then(({ u, d, r }) => {
      if (searchParams) {
        const actionParam = searchParams.get("action")
        const searchParam = searchParams.get("search")
        const editParam = searchParams.get("edit")
        const tabParam = searchParams.get("tab")

        if (tabParam === "centers") {
          setActiveTab("centers")
        }
        if (searchParam) {
          setSearchTerm(searchParam)
          setCenterSearchTerm(searchParam)
        }
        if (actionParam === "new") {
          setEditingUser(null)
          setFirstName("")
          setLastName("")
          setMatricule("")
          setFonction("")
          setDeptId(d[0]?.id || "")
          setRoleName(r[0]?.name || "")
          setPhone("")
          setEmail("")
          setUsername("")
          setStatus("Actif")
          setShowModal(true)
        } else if (editParam) {
          const userToEdit = u.find(item => item.id === editParam)
          if (userToEdit) {
            setEditingUser(userToEdit)
            setFirstName(userToEdit.first_name)
            setLastName(userToEdit.last_name)
            setMatricule(userToEdit.matricule)
            setFonction(userToEdit.fonction)
            setDeptId(userToEdit.department_id)
            setRoleName(userToEdit.role)
            setPhone(userToEdit.phone)
            setEmail(userToEdit.email)
            setUsername(userToEdit.username)
            setStatus(userToEdit.status)
            setShowModal(true)
          }
        }
      }
    })
  }, [searchParams])

  useRealtimeSync({
    tables: ["users", "departments", "roles", "centers", "waste_movements"],
    onSync: async () => {
      await load()
    },
    pollIntervalMs: 3000,
  })

  // --- ACTIONS HANDLERS AGENTS ---
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
        setShowModal(false)
      } else {
        toast.error("Erreur lors de la modification de l'utilisateur.")
      }
    } else {
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
        const data = await getUsers()
        setUsers(data)
        setShowModal(false)
        setCreatedCredentials({
          fullName: `${firstName} ${lastName}`,
          username,
          email,
          role: roleName,
          tempPass: res.tempPass,
          isCenter: false
        })
        toast.success("Compte créé avec succès ! Mot de passe initial généré.")
      } else {
        toast.error(res.error || "Erreur lors de la création de l'utilisateur.")
      }
    }
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

  const handleResetPassword = async (id: string, email: string, user: User) => {
    const newPass = await resetUserPassword(id, email)
    if (newPass) {
      const data = await getUsers()
      setUsers(data)
      setCreatedCredentials({
        fullName: `${user.first_name} ${user.last_name}`,
        username: user.username,
        email: user.email,
        role: user.role,
        tempPass: newPass,
        isReset: true,
        isCenter: false
      })
      toast.success("Nouveau mot de passe initial généré avec succès !")
    } else {
      toast.error("Erreur lors de la réinitialisation du mot de passe.")
    }
  }

  const handleUnlockAccount = async (id: string) => {
    const success = await unlockUserAccount(id)
    if (success) {
      toast.success("Compte déverrouillé avec succès !")
      const data = await getUsers()
      setUsers(data)
    } else {
      toast.error("Erreur lors du déverrouillage.")
    }
  }

  const handleResetMFA = async (id: string) => {
    const success = await resetUserMFA(id)
    if (success) {
      toast.success("Double authentification réinitialisée avec succès !")
      const data = await getUsers()
      setUsers(data)
    } else {
      toast.error("Erreur lors de la réinitialisation MFA.")
    }
  }

  const handleSoftDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      const success = await softDeleteUser(id)
      if (success) {
        toast.success("Utilisateur supprimé avec succès.")
        const data = await getUsers()
        setUsers(data)
      } else {
        toast.error("Erreur lors de la suppression.")
      }
    }
  }

  // --- ACTIONS HANDLERS CENTRES APPORTEURS ---
  const handleCopyCenterCard = (c: Center) => {
    const pass = c.password || getCenterDefaultPassword(c.center_code)
    const origin = typeof window !== "undefined" ? window.location.origin : "https://portail-eged.abmed.bj"
    const text = `===========================================
PORTAIL eGED (ABMeD) — ACCÈS ÉTABLISSEMENT
===========================================
Établissement : ${c.name}
Catégorie : ${c.center_type} (${c.city})
Identifiant unique de connexion : ${c.center_code}
Mot de passe initial : ${pass}
Lien direct d'accès : ${origin}/login
-------------------------------------------
Consigne : Lors de votre 1ère connexion avec ce mot de passe temporaire, la plateforme vous demandera automatiquement de définir votre mot de passe personnel définitif.
===========================================`
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      toast.success(`Fiche d'accès pour ${c.name} (${c.center_code}) copiée ! Prête à être transmise.`)
    }
  }

  const handleResetCenterPasswordAction = async (c: Center) => {
    if (confirm(`Confirmez-vous la réinitialisation du mot de passe initial pour le centre ${c.name} (${c.center_code}) ?`)) {
      const newPass = await resetCenterPassword(c.center_code)
      if (newPass) {
        toast.success(`Mot de passe initial réinitialisé pour ${c.center_code} !`)
        await load()
        setCreatedCredentials({
          fullName: c.name,
          username: c.center_code,
          email: c.email || `${c.center_code.toLowerCase()}@portail-abmed.bj`,
          role: "Centre Apporteur",
          tempPass: newPass,
          isReset: true,
          isCenter: true
        })
      } else {
        toast.error("Erreur lors de la réinitialisation du mot de passe.")
      }
    }
  }

  const handleToggleCenterStatusAction = async (c: Center, newStatus: "Actif" | "Suspendu") => {
    const ok = await toggleCenterStatus(c.center_code, newStatus)
    if (ok) {
      toast.success(`Le statut du compte ${c.center_code} est désormais : ${newStatus}`)
      await load()
    } else {
      toast.error("Erreur lors du changement de statut.")
    }
  }

  const handleExportCentersExcel = () => {
    const dataToExport = filteredCenters.map((c) => {
      const pass = c.password || getCenterDefaultPassword(c.center_code)
      const isPending = !c.has_changed_password
      return {
        "Identifiant Unique (Code Centre)": c.center_code,
        "Nom de l'Établissement": c.name,
        "Catégorie de Structure": c.center_type,
        "Ville / Commune": c.city,
        "Adresse": c.address || "-",
        "Personne de Contact": c.contact_person || "-",
        "Téléphone": c.phone || "-",
        "Email Officiel": c.email || "-",
        "Identifiant de Connexion": c.center_code,
        "Mot de Passe Initial / Accès": pass,
        "1ère Connexion": isPending ? "À changer à la 1ère connexion" : "Mot de passe personnalisé",
        "Statut du Compte": c.account_status || "Actif",
      }
    })
    const headers = [
      "Identifiant Unique (Code Centre)",
      "Nom de l'Établissement",
      "Catégorie de Structure",
      "Ville / Commune",
      "Adresse",
      "Personne de Contact",
      "Téléphone",
      "Email Officiel",
      "Identifiant de Connexion",
      "Mot de Passe Initial / Accès",
      "1ère Connexion",
      "Statut du Compte",
    ]
    exportToExcel(dataToExport, headers, "Identifiants_Centres_Apporteurs_ABMed")
    toast.success("Liste complète des identifiants exportée avec succès sous Excel !")
  }

  // --- FILTRES AGENTS ---
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
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
  }, [users, searchTerm, selectedDept, selectedRole, selectedStatus])

  // --- FILTRES CENTRES ---
  const filteredCenters = useMemo(() => {
    return centers.filter(c => {
      const q = centerSearchTerm.toLowerCase().trim()
      const matchesSearch = !q || 
        c.center_code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q) ||
        (c.contact_person || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)

      const matchesType = centerTypeFilter === "all" || c.center_type === centerTypeFilter
      
      let matchesStatus = true
      if (centerStatusFilter === "actif") {
        matchesStatus = c.account_status !== "Suspendu"
      } else if (centerStatusFilter === "suspendu") {
        matchesStatus = c.account_status === "Suspendu"
      } else if (centerStatusFilter === "first_login_pending") {
        matchesStatus = !c.has_changed_password
      } else if (centerStatusFilter === "custom_password") {
        matchesStatus = !!c.has_changed_password
      }

      return matchesSearch && matchesType && matchesStatus
    })
  }, [centers, centerSearchTerm, centerTypeFilter, centerStatusFilter])

  // KPIs Centres
  const centersStats = useMemo(() => {
    const total = centers.length
    const active = centers.filter(c => c.account_status !== "Suspendu").length
    const pendingFirstLogin = centers.filter(c => !c.has_changed_password).length
    const customPass = centers.filter(c => !!c.has_changed_password).length
    return { total, active, pendingFirstLogin, customPass }
  }, [centers])

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-full">
      
      {/* ─── BANDEAU EN-TÊTE PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-card border border-border/70 rounded-2xl p-4 shadow-2xs">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#1B5C2E]" />
            Utilisateurs &amp; Rôles — Gestion des Accès
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">
            Gestion centralisée des comptes du personnel ABMeD et des identifiants des Centres Apporteurs agréés.
          </p>
        </div>

        {activeTab === "agents" ? (
          <Button onClick={openCreateModal} size="sm" className="bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-2xs text-xs font-bold gap-1.5 h-8.5 px-3.5 rounded-xl cursor-pointer">
            <UserPlus className="h-3.5 w-3.5" /> Nouvel Utilisateur ABMeD
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowAllPasswords(!showAllPasswords)} 
              variant="outline" 
              size="sm" 
              className="text-xs font-semibold gap-1.5 h-8.5 rounded-xl cursor-pointer"
            >
              {showAllPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-emerald-600" />}
              <span>{showAllPasswords ? "Masquer Mots de Passe" : "Afficher Tout en Clair"}</span>
            </Button>
            <Button 
              onClick={handleExportCentersExcel} 
              size="sm" 
              className="bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-2xs text-xs font-bold gap-1.5 h-8.5 px-3.5 rounded-xl cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Exporter les Identifiants (Excel)
            </Button>
          </div>
        )}
      </div>

      {/* ─── ONGLETS DE SÉPARATION : PERSONNEL ABMED vs CENTRES APPORTEURS ─── */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-3 w-full">
        
        <TabsList className="bg-muted/70 p-1 rounded-xl h-10 border border-border/60">
          <TabsTrigger value="agents" className="text-xs font-bold gap-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Users className="h-3.5 w-3.5" />
            <span>Personnel ABMeD &amp; Agents Internes ({filteredUsers.length})</span>
          </TabsTrigger>

          <TabsTrigger value="centers" className="text-xs font-bold gap-2 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-xs">
            <Building2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Centres Apporteurs Agréés ({centers.length})</span>
            <Badge className="bg-emerald-600 text-white font-mono text-[9px] px-1.5 py-0 rounded">
              CTR
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ONGLET 1 : PERSONNEL ABMED & AGENTS INTERNES */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="agents" className="space-y-3 mt-0">
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden w-full">
            <CardHeader className="p-3 pb-2.5 border-b border-border/50">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Comptes Professionnels ABMeD ({filteredUsers.length})
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Rechercher..."
                      className="pl-8 h-8 text-xs bg-background"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val || "all")}>
                    <SelectTrigger className="h-8 w-36 text-xs bg-background">
                      <SelectValue placeholder="Rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les rôles</SelectItem>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || "all")}>
                    <SelectTrigger className="h-8 w-32 text-xs bg-background">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="Actif">Actif</SelectItem>
                      <SelectItem value="Suspendu">Suspendu</SelectItem>
                      <SelectItem value="Désactivé">Désactivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-muted/40">
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
                            <TableCell className="pl-4">
                              <div className="w-9 h-9 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm border border-primary/20">
                                {user.first_name[0]}{user.last_name[0]}
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-foreground">{user.first_name} {user.last_name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">@{user.username}</p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="text-[10px] text-muted-foreground font-mono">{user.matricule || "N/A"}</p>
                                <p className="text-xs text-foreground font-medium">{user.fonction}</p>
                              </div>
                            </TableCell>

                            <TableCell className="text-xs text-muted-foreground">
                              {dept?.name || "N/A"}
                            </TableCell>

                            <TableCell>
                              <Badge variant="secondary" className="text-[10px] py-0.5 bg-slate-100 text-slate-800 dark:bg-slate-900/35 dark:text-slate-300">
                                {user.role}
                              </Badge>
                            </TableCell>

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
                                {user.must_change_password && (
                                  <Badge className="bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[9px] py-0 font-bold">
                                    1ère connexion en attente
                                  </Badge>
                                )}
                                {isLocked && (
                                  <Badge className="bg-red-500 text-white text-[9px] py-0">Verrouillé</Badge>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {user.last_login && user.last_login !== "Jamais" ? new Date(user.last_login).toLocaleDateString("fr-FR") : "Jamais"}
                            </TableCell>

                            <TableCell className="text-center pr-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setCreatedCredentials({
                                        fullName: `${user.first_name} ${user.last_name}`,
                                        username: user.username,
                                        email: user.email,
                                        role: user.role,
                                        tempPass: user.initial_password || user.password || "AbMed@2026",
                                        isCenter: false
                                      })
                                    }
                                    className="gap-2 cursor-pointer text-xs font-semibold text-[#1B5C2E]"
                                  >
                                    <Key className="h-3.5 w-3.5 text-[#1B5C2E]" /> Voir Identifiants / MDP
                                  </DropdownMenuItem>
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
                                  <DropdownMenuItem onClick={() => handleResetPassword(user.id, user.email, user)} className="gap-2 cursor-pointer text-xs">
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
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ONGLET 2 : CENTRES APPORTEURS AGRÉÉS (IDENTIFIANTS & MOTS DE PASSE) */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="centers" className="space-y-3 mt-0">
          
          {/* SYNTHÈSE DES COMPTES CENTRES */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="rounded-xl border border-border/70 p-3 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Total Établissements</span>
              <div className="text-2xl font-black text-foreground mt-1 flex items-center justify-between">
                <span>{centersStats.total}</span>
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Structures avec code CTR actif</p>
            </Card>

            <Card className="rounded-xl border border-border/70 p-3 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Comptes Actifs</span>
              <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center justify-between">
                <span>{centersStats.active}</span>
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Autorisés à réserver des créneaux</p>
            </Card>

            <Card className="rounded-xl border border-border/70 p-3 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">1ères Connexions en Attente</span>
              <div className="text-2xl font-black text-amber-600 mt-1 flex items-center justify-between">
                <span>{centersStats.pendingFirstLogin}</span>
                <Key className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Mot de passe initial temporaire</p>
            </Card>

            <Card className="rounded-xl border border-border/70 p-3 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Mots de Passe Personnalisés</span>
              <div className="text-2xl font-black text-blue-600 mt-1 flex items-center justify-between">
                <span>{centersStats.customPass}</span>
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Modifiés par les centres à la 1ère connexion</p>
            </Card>
          </div>

          {/* TABLEAU DES COMPTES DES CENTRES APPORTEURS */}
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden w-full">
            <CardHeader className="p-3 pb-2.5 border-b border-border/50">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-2.5">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    Identifiants &amp; Mots de Passe des Établissements ({filteredCenters.length})
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    L&apos;identifiant de connexion correspond au code unique attribué à chaque apporteur (CTR-YYYY-XXXX).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Rechercher code CTR, nom, ville..."
                      className="pl-8 h-8 text-xs bg-background"
                      value={centerSearchTerm}
                      onChange={(e) => setCenterSearchTerm(e.target.value)}
                    />
                  </div>

                  <Select value={centerTypeFilter} onValueChange={(val) => setCenterTypeFilter(val || "all")}>
                    <SelectTrigger className="h-8 w-44 text-xs bg-background">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les catégories</SelectItem>
                      {CENTER_TYPES.map(t => (
                        <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={centerStatusFilter} onValueChange={(val) => setCenterStatusFilter(val || "all")}>
                    <SelectTrigger className="h-8 w-36 text-xs bg-background">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous statuts</SelectItem>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="suspendu">Suspendu</SelectItem>
                      <SelectItem value="first_login_pending">1ère connexion en attente</SelectItem>
                      <SelectItem value="custom_password">Mot de passe personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table className="w-full text-xs">
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="pl-4">Identifiant Unique</TableHead>
                      <TableHead>Établissement &amp; Catégorie</TableHead>
                      <TableHead>Contact &amp; Coordonnées</TableHead>
                      <TableHead>Mot de Passe Initial / Accès</TableHead>
                      <TableHead>1ère Connexion</TableHead>
                      <TableHead>Statut Compte</TableHead>
                      <TableHead className="w-16 text-center pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCenters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          Aucun centre apporteur ne correspond aux filtres de recherche.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCenters.map((center) => {
                        const currentPass = center.password || getCenterDefaultPassword(center.center_code)
                        const isVisible = showAllPasswords || !!visiblePasswords[center.center_code]
                        const isPendingFirstLogin = !center.has_changed_password

                        return (
                          <TableRow key={center.id || center.center_code} className="hover:bg-muted/10 align-middle">
                            
                            {/* 1. IDENTIFIANT UNIQUE (CODE CTR) */}
                            <TableCell className="pl-4 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-mono font-bold text-xs py-0.5">
                                  {center.center_code}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-emerald-700 cursor-pointer"
                                  onClick={() => copyCenterIdentifier(center.center_code)}
                                  title="Copier l'identifiant"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>

                            {/* 2. NOM ET TYPE DE STRUCTURE */}
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="font-bold text-xs text-foreground leading-tight">
                                  {center.name}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                                  <span className="font-medium text-emerald-700 dark:text-emerald-400">{center.center_type}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{center.city}</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* 3. CONTACT & TÉLÉPHONE */}
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-foreground">
                                  {center.contact_person || "Contact non précisé"}
                                </p>
                                <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground font-mono">
                                  {center.phone && <span className="flex items-center gap-0.5"><Phone className="h-3 w-3" />{center.phone}</span>}
                                  {center.email && <span className="truncate max-w-[140px]">{center.email}</span>}
                                </div>
                              </div>
                            </TableCell>

                            {/* 4. MOT DE PASSE INITIAL / ACCÈS */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs bg-muted/60 px-2 py-1 rounded-md border border-border/80 tracking-wider text-emerald-900 dark:text-emerald-300 select-all min-w-[130px] inline-block text-center">
                                  {isVisible ? currentPass : "••••••••••••"}
                                </span>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                  onClick={() => togglePasswordVisibility(center.center_code)}
                                  title={isVisible ? "Masquer le mot de passe" : "Afficher en clair"}
                                >
                                  {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-emerald-700 cursor-pointer"
                                  onClick={() => copyCredentials(currentPass)}
                                  title="Copier le mot de passe"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>

                            {/* 5. ÉTAT DE LA 1ÈRE CONNEXION */}
                            <TableCell>
                              {isPendingFirstLogin ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold">
                                  À changer à la 1ère connexion
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-semibold">
                                  Personnalisé
                                </Badge>
                              )}
                            </TableCell>

                            {/* 6. STATUT DU COMPTE */}
                            <TableCell>
                              <Badge 
                                className={
                                  center.account_status === "Suspendu" 
                                    ? "bg-red-600 text-white text-[10px]" 
                                    : "bg-emerald-600 text-white text-[10px]"
                                }
                              >
                                {center.account_status || "Actif"}
                              </Badge>
                            </TableCell>

                            {/* 7. ACTIONS COMPLÈTES */}
                            <TableCell className="text-center pr-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg cursor-pointer">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  
                                  {/* Copier fiche complète */}
                                  <DropdownMenuItem 
                                    onClick={() => handleCopyCenterCard(center)} 
                                    className="gap-2 cursor-pointer text-xs font-semibold text-[#1B5C2E]"
                                  >
                                    <Share2 className="h-3.5 w-3.5 text-[#1B5C2E]" />
                                    <span>Copier Fiche d&apos;Accès</span>
                                  </DropdownMenuItem>

                                  {/* Voir fiche modal */}
                                  <DropdownMenuItem 
                                    onClick={() => setCreatedCredentials({
                                      fullName: center.name,
                                      username: center.center_code,
                                      email: center.email || `${center.center_code.toLowerCase()}@portail-abmed.bj`,
                                      role: "Centre Apporteur",
                                      tempPass: currentPass,
                                      isCenter: true
                                    })}
                                    className="gap-2 cursor-pointer text-xs"
                                  >
                                    <Key className="h-3.5 w-3.5 text-blue-600" />
                                    <span>Afficher la Fiche d&apos;Accès</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  {/* Réinitialiser mot de passe */}
                                  <DropdownMenuItem 
                                    onClick={() => handleResetCenterPasswordAction(center)} 
                                    className="gap-2 cursor-pointer text-xs text-amber-700"
                                  >
                                    <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                                    <span>Réinitialiser Mot de Passe</span>
                                  </DropdownMenuItem>

                                  {/* Suspendre / Réactiver */}
                                  {center.account_status === "Suspendu" ? (
                                    <DropdownMenuItem 
                                      onClick={() => handleToggleCenterStatusAction(center, "Actif")} 
                                      className="gap-2 cursor-pointer text-xs text-emerald-600"
                                    >
                                      <UserCheck className="h-3.5 w-3.5" />
                                      <span>Activer le Compte</span>
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem 
                                      onClick={() => handleToggleCenterStatusAction(center, "Suspendu")} 
                                      className="gap-2 cursor-pointer text-xs text-red-600"
                                    >
                                      <UserX className="h-3.5 w-3.5" />
                                      <span>Suspendre le Compte</span>
                                    </DropdownMenuItem>
                                  )}

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

        </TabsContent>

      </Tabs>

      {/* ─── MODAL CRUD AGENT ABMED ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <Card className="w-full max-w-xl shadow-2xl border-none max-h-[92vh] flex flex-col my-auto overflow-hidden bg-card">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-3 p-4 sm:p-6 shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {editingUser ? "Modifier le compte utilisateur" : "Créer un nouvel utilisateur"}
              </CardTitle>
              <CardDescription className="text-xs">
                Remplissez les détails du compte professionnel de l&apos;autorité ABMed.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              {!editingUser && (
                <div className="bg-blue-50/70 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50 rounded-lg p-2.5 flex items-start gap-2.5 text-xs text-blue-950 dark:text-blue-200">
                  <ShieldAlert className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Génération automatique du mot de passe initial</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      Un mot de passe sécurisé temporaire sera généré automatiquement. L&apos;agent devra obligatoirement le modifier lors de sa première connexion.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Nom *</label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} className="h-8 text-xs uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Prénoms *</label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Nom d&apos;utilisateur *</label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Matricule</label>
                  <Input value={matricule} onChange={e => setMatricule(e.target.value)} className="h-8 text-xs uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Email officiel *</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Téléphone</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-foreground">Fonction officielle</label>
                <Input value={fonction} onChange={e => setFonction(e.target.value)} className="h-8 text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Service / Direction</label>
                  <Select value={deptId} onValueChange={(val) => setDeptId(val || "")}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Rôle d&apos;accès</label>
                  <Select value={roleName} onValueChange={(val) => setRoleName(val || "")}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-semibold text-foreground">Statut du compte</label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Actif">Actif</SelectItem>
                    <SelectItem value="Suspendu">Suspendu</SelectItem>
                    <SelectItem value="Désactivé">Désactivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </CardContent>

            <div className="flex justify-end gap-2 p-4 border-t border-border/50 bg-muted/10 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)} className="cursor-pointer">Annuler</Button>
              <Button size="sm" onClick={handleSave} className="bg-[#0B5ED7] hover:bg-[#094bb3] text-white cursor-pointer">Sauvegarder</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ─── MODAL NOTIFICATION IDENTIFIANTS GÉNÉRÉS ─── */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl border border-emerald-300 dark:border-emerald-800 bg-card overflow-hidden">
            <div className="bg-[#1B5C2E] text-white p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-white/20">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight">
                  {createdCredentials.isReset 
                    ? "Mot de passe initial réinitialisé !" 
                    : (createdCredentials.isCenter ? "Fiche d'accès Centre Apporteur" : "Compte utilisateur créé avec succès !")}
                </h3>
                <p className="text-[11px] text-white/90">
                  {createdCredentials.fullName} ({createdCredentials.role})
                </p>
              </div>
            </div>

            <CardContent className="p-5 space-y-4">
              <div className="bg-muted/40 p-3 rounded-xl border border-border/70 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Identifiant de connexion :</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-sm text-foreground bg-background px-2 py-0.5 rounded border border-border/80">
                      {createdCredentials.username}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-emerald-700 cursor-pointer"
                      onClick={() => copyCenterIdentifier(createdCredentials.username)}
                      title="Copier l'identifiant"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Email officiel :</span>
                  <span className="font-medium text-foreground">{createdCredentials.email}</span>
                </div>

                <div className="py-1">
                  <span className="text-muted-foreground font-semibold block mb-1">Mot de passe initial d&apos;accès :</span>
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-emerald-400 dark:border-emerald-700">
                    <span className="font-mono font-black text-sm tracking-wider text-[#1B5C2E] dark:text-emerald-400 select-all">
                      {createdCredentials.tempPass}
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => copyCredentials(createdCredentials.tempPass)}
                      className="h-7 text-xs font-bold gap-1 px-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 cursor-pointer"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied ? "Copié !" : "Copier"}</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <Key className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-[11.5px]">Obligation de changement à la 1ère connexion</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                    Dès sa toute première tentative de connexion avec ce mot de passe temporaire, l&apos;utilisateur sera obligatoirement orienté vers la page de définition de son mot de passe personnel définitif.
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                {createdCredentials.isCenter && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const c = centers.find(item => item.center_code === createdCredentials.username)
                      if (c) handleCopyCenterCard(c)
                    }}
                    className="text-xs font-bold gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Copier Fiche Complète</span>
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={() => setCreatedCredentials(null)} 
                  className="bg-[#1B5C2E] hover:bg-[#154824] text-white font-bold px-4 ml-auto cursor-pointer"
                >
                  Fermer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}

export default function UsersAdminPage() {
  return (
    <Suspense fallback={<div className="text-center py-10 text-xs text-muted-foreground">Chargement des utilisateurs et habilitations...</div>}>
      <UsersAdminContent />
    </Suspense>
  )
}
