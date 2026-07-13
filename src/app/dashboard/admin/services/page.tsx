"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building2, Plus, Edit2, Trash2, CheckCircle2 } from "lucide-react"
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, Department } from "../adminMockData"
import { toast } from "sonner"

export default function DepartmentsAdminPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    async function load() {
      const data = await getDepartments()
      setDepartments(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>
  }

  // --- ACTIONS HANDLERS ---
  const openCreateModal = () => {
    setEditingDept(null)
    setName("")
    setCode("")
    setDescription("")
    setShowModal(true)
  }

  const openEditModal = (dept: Department) => {
    setEditingDept(dept)
    setName(dept.name)
    setCode(dept.code)
    setDescription(dept.description)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!name || !code) {
      toast.error("Veuillez remplir le nom et le code du service/direction.")
      return
    }

    if (editingDept) {
      // Edit
      const success = await updateDepartment(editingDept.id, { name, code: code.toUpperCase(), description })
      if (success) {
        toast.success("Service mis à jour avec succès !")
        const data = await getDepartments()
        setDepartments(data)
      } else {
        toast.error("Erreur lors de la mise à jour du service.")
      }
    } else {
      // Create
      const success = await createDepartment({
        name,
        code: code.toUpperCase(),
        description
      })
      if (success) {
        toast.success("Nouveau service créé avec succès !")
        const data = await getDepartments()
        setDepartments(data)
      } else {
        toast.error("Erreur lors de la création du service.")
      }
    }

    setShowModal(false)
  }

  const handleDelete = async (id: string, deptName: string) => {
    const confirm = window.confirm(`Voulez-vous vraiment supprimer la direction/service "${deptName}" ?`)
    if (!confirm) return

    const success = await deleteDepartment(id)
    if (success) {
      toast.success("Service/Direction supprimé avec succès.")
      const data = await getDepartments()
      setDepartments(data)
    } else {
      toast.error("Erreur lors de la suppression du service.")
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Services & Directions</h2>
          <p className="text-muted-foreground mt-1">
            Organigramme et structure divisionnelle de l'ABMed. Chaque agent doit être rattaché à un service.
          </p>
        </div>
        <Button onClick={openCreateModal} className="shadow-md bg-[#0B5ED7] hover:bg-[#094bb3] text-white">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Service
        </Button>
      </div>

      {/* Services List Table */}
      <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-4 w-64">Nom du service / Direction</TableHead>
                  <TableHead className="w-48">Code Service</TableHead>
                  <TableHead>Description / Attribution</TableHead>
                  <TableHead className="w-24 text-center pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id} className="hover:bg-muted/10 align-middle">
                    
                    {/* Name */}
                    <TableCell className="pl-4 font-bold text-foreground text-xs">
                      {dept.name}
                    </TableCell>

                    {/* Code */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {dept.code}
                    </TableCell>

                    {/* Description */}
                    <TableCell className="text-xs text-muted-foreground leading-normal">
                      {dept.description || "Aucune description fournie."}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center pr-4">
                      <div className="flex justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEditModal(dept)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(dept.id, dept.name)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal CRUD Service */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl border-none">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {editingDept ? "Modifier le service" : "Créer un nouveau service"}
              </CardTitle>
              <CardDescription className="text-xs">
                Définissez la division interne pour les utilisateurs de l'ABMed.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Intitulé du service / Direction *</label>
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Ex: Direction des Laboratoires" 
                  className="h-9 text-xs" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Code Service *</label>
                <Input 
                  value={code} 
                  onChange={e => setCode(e.target.value)} 
                  placeholder="Ex: DIR-LAB" 
                  className="h-9 text-xs font-mono uppercase" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80">Description / Missions du service</label>
                <Input 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Ex: Analyses physico-chimiques et gestion des echantillons..." 
                  className="h-9 text-xs" 
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
