"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Key, Save, ShieldAlert, CheckCircle2 } from "lucide-react"
import { 
  getRoles, getPermissions, savePermissions, 
  UserRole, RolePermissions, PermissionRow, logAdminAction 
} from "../adminMockData"
import { toast } from "sonner"

const ACTIONS = [
  { key: "can_view" as const, label: "Voir" },
  { key: "can_create" as const, label: "Créer" },
  { key: "can_modify" as const, label: "Modifier" },
  { key: "can_delete" as const, label: "Supprimer" },
  { key: "can_validate" as const, label: "Valider" },
  { key: "can_export" as const, label: "Exporter" },
  { key: "can_print" as const, label: "Imprimer" },
  { key: "can_admin" as const, label: "Administrer" }
]

export default function PermissionsAdminPage() {
  const [roles, setRoles] = useState<UserRole[]>([])
  const [permissions, setPermissions] = useState<RolePermissions[]>([])
  const [selectedRoleCode, setSelectedRoleCode] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const listRoles = await getRoles()
      setRoles(listRoles)
      const perms = await getPermissions()
      setPermissions(perms)
      if (listRoles.length > 0) {
        setSelectedRoleCode(listRoles[0].code)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-center py-10">Chargement...</div>
  }

  const currentRole = roles.find(r => r.code === selectedRoleCode)
  const currentRolePermissions = permissions.find(p => p.roleCode === selectedRoleCode)?.permissions || []

  // --- ACTIONS HANDLERS ---
  const handleCheckboxChange = (module: string, actionKey: typeof ACTIONS[number]["key"], checked: boolean) => {
    const updatedPermissions = permissions.map(p => {
      if (p.roleCode === selectedRoleCode) {
        return {
          ...p,
          permissions: p.permissions.map(row => {
            if (row.module === module) {
              return { ...row, [actionKey]: checked }
            }
            return row
          })
        }
      }
      return p
    })

    setPermissions(updatedPermissions)
  }

  const handleSave = async () => {
    const currentPerms = permissions.find(p => p.roleCode === selectedRoleCode)?.permissions || []
    const success = await savePermissions(selectedRoleCode, currentPerms)
    if (success) {
      toast.success("Matrice de permissions sauvegardée avec succès !")
    } else {
      toast.error("Erreur lors de la sauvegarde de la matrice de permissions.")
    }
  }

  const handleResetDefault = () => {
    const confirm = window.confirm("Souhaitez-vous réinitialiser les permissions de ce rôle à leur configuration d'usine ?")
    if (!confirm) return

    // Standard factory rules
    const updatedPermissions = permissions.map(p => {
      if (p.roleCode === selectedRoleCode) {
        return {
          ...p,
          permissions: p.permissions.map(row => ({
            module: row.module,
            can_view: true,
            can_create: selectedRoleCode.startsWith("ADMIN") || ["RESP_ECH", "GEST_ECH", "RESP_WASTE"].includes(selectedRoleCode) && row.module !== "Administration",
            can_modify: selectedRoleCode.startsWith("ADMIN") || ["RESP_ECH", "GEST_ECH", "RESP_WASTE"].includes(selectedRoleCode) && row.module !== "Administration",
            can_delete: selectedRoleCode === "ADMIN_SYS",
            can_validate: ["ADMIN_SYS", "RESP_ECH", "RESP_QUAL", "RESP_WASTE"].includes(selectedRoleCode),
            can_export: !["ANALYST"].includes(selectedRoleCode),
            can_print: true,
            can_admin: selectedRoleCode === "ADMIN_SYS" || (selectedRoleCode === "ADMIN_FUNC" && row.module !== "Administration")
          }))
        }
      }
      return p
    })

    setPermissions(updatedPermissions)
    toast.info("Permissions réinitialisées aux valeurs par défaut.")
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Habilitations & Permissions</h2>
          <p className="text-muted-foreground mt-1">
            Matrice croisée Rôle × Module fonctionnel pour affiner la sécurité d'accès.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleResetDefault} className="h-10 text-xs">
            Paramètres par défaut
          </Button>
          <Button onClick={handleSave} className="shadow-md h-10 text-xs bg-[#0B5ED7] hover:bg-[#094bb3] text-white">
            <Save className="mr-2 h-4 w-4" />
            Enregistrer la Matrice
          </Button>
        </div>
      </div>

      {/* Select Role Selector */}
      <Card className="border-border/50 shadow-sm rounded-2xl bg-card">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-full sm:w-72 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Rôle à configurer</label>
            <Select value={selectedRoleCode} onValueChange={(val) => setSelectedRoleCode(val || "")}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 p-3 bg-muted/40 rounded-xl border border-border/50 text-xs text-muted-foreground flex gap-3 items-start leading-normal">
            <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="space-y-0.5">
              <p className="font-bold text-foreground">
                Description du profil : {currentRole?.name}
              </p>
              <p>{currentRole?.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Matrix Grid Table */}
      <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-4 min-w-[200px]">Module Fonctionnel</TableHead>
                  {ACTIONS.map(a => (
                    <TableHead key={a.key} className="text-center w-24">{a.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRolePermissions.map((row) => (
                  <TableRow key={row.module} className="hover:bg-muted/10 align-middle">
                    
                    {/* Module name */}
                    <TableCell className="pl-4 font-bold text-foreground text-xs">
                      {row.module}
                    </TableCell>

                    {/* Matrix checkboxes */}
                    {ACTIONS.map(action => {
                      const isChecked = !!(row as any)[action.key]
                      return (
                        <TableCell key={action.key} className="text-center">
                          <Checkbox 
                            checked={isChecked}
                            onCheckedChange={(checked) => 
                              handleCheckboxChange(row.module, action.key, !!checked)
                            }
                            className="data-[state=checked]:bg-[#0B5ED7] data-[state=checked]:border-[#0B5ED7]"
                          />
                        </TableCell>
                      )
                    })}

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
