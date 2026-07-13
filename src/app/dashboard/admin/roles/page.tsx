"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Shield, Plus, Edit2, Trash2, CheckCircle2 } from "lucide-react"
import { getRoles, createRole, updateRole, deleteRole, UserRole } from "../adminMockData"
import { toast } from "sonner"

export default function RolesAdminPage() {
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<UserRole | null>(null)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    async function load() {
      const data = await getRoles()
      setRoles(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>
  }

  // --- ACTIONS HANDLERS ---
  const openCreateModal = () => {
    setEditingRole(null)
    setName("")
    setCode("")
    setDescription("")
    setShowModal(true)
  }

  const openEditModal = (role: UserRole) => {
    setEditingRole(role)
    setName(role.name)
    setCode(role.code)
    setDescription(role.description)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!name || !code) {
      toast.error("Veuillez remplir le nom et le code du rôle.")
      return
    }

    if (editingRole) {
      // Edit
      const success = await updateRole(editingRole.id, { name, description })
      if (success) {
        toast.success("Rôle mis à jour avec succès !")
        const data = await getRoles()
        setRoles(data)
      } else {
        toast.error("Erreur lors de la mise à jour du rôle.")
      }
    } else {
      // Create
      const success = await createRole({
        name,
        code: code.toUpperCase().replace(/\s+/g, "_"),
        description,
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

    setShowModal(false)
  }

  const handleDelete = async (id: string, roleName: string) => {
    const confirm = window.confirm(`Voulez-vous vraiment supprimer le rôle "${roleName}" ?`)
    if (!confirm) return

    const success = await deleteRole(id)
    if (success) {
      toast.success("Rôle supprimé avec succès.")
      const data = await getRoles()
      setRoles(data)
    } else {
      toast.error("Erreur lors de la suppression du rôle.")
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des Rôles</h2>
          <p className="text-muted-foreground mt-1">
            Définissez les rôles métier de l'ABMed pour associer des habilitations de sécurité adaptées.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shadow-md bg-[#0B5ED7] hover:bg-[#094bb3] text-white">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Rôle
        </Button>
      </div>

      {/* Roles List Table */}
      <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-4 w-64">Intitulé du rôle</TableHead>
                  <TableHead className="w-48">Code Habilitation</TableHead>
                  <TableHead>Description métier / Rôle d'accès principal</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="w-24 text-center pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id} className="hover:bg-muted/10 align-middle">
                    
                    {/* Name */}
                    <TableCell className="pl-4 font-bold text-foreground text-xs">
                      {role.name}
                    </TableCell>

                    {/* Code */}
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {role.code}
                    </TableCell>

                    {/* Description */}
                    <TableCell className="text-xs text-muted-foreground leading-normal">
                      {role.description}
                    </TableCell>

                    {/* Type badge */}
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          !role.is_configurable
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }
                      >
                        {!role.is_configurable ? "Système" : "Personnalisé"}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center pr-4">
                      <div className="flex justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEditModal(role)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {role.is_configurable && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(role.id, role.name)}
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

      {/* Modal CRUD Role */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {editingRole ? "Modifier la description" : "Créer un nouveau rôle"}
              </CardTitle>
              <CardDescription className="text-xs">
                Définissez le rôle fonctionnel à insérer dans le modèle de sécurité.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Intitulé du rôle *</label>
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Ex: Responsable Qualité" 
                  className="h-9 text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Code unique *</label>
                <Input 
                  value={code} 
                  onChange={e => setCode(e.target.value)} 
                  disabled={!!editingRole}
                  placeholder="Ex: RESP_QUAL" 
                  className="h-9 text-xs font-mono uppercase" 
                />
                {!editingRole && (
                  <p className="text-[9px] text-muted-foreground">Sera automatiquement converti en majuscules (ex: GEST_MAGASIN)</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Description fonctionnelle / Limites d'accès</label>
                <Textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Ex: Validation de la conformité, audits et accès aux logs..." 
                  className="min-h-[100px] text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button size="sm" onClick={handleSave} className="bg-[#0B5ED7] hover:bg-[#094bb3] text-white">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Sauvegarder
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
