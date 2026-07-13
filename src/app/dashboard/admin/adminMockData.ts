"use client"

import { createClient } from "@/utils/supabase/client"
import { createUserAction, resetPasswordAction } from "@/app/actions/admin"

// --- TYPES DEFINITIONS ---
export interface Department {
  id: string
  name: string
  code: string
  description: string
  created_at: string
}

export interface UserRole {
  id: string
  name: string
  code: string
  description: string
  is_configurable: boolean
}

export interface PermissionRow {
  module: string
  can_view: boolean
  can_create: boolean
  can_modify: boolean
  can_delete: boolean
  can_validate: boolean
  can_export: boolean
  can_print: boolean
  can_admin: boolean
}

export interface RolePermissions {
  roleCode: string
  permissions: PermissionRow[]
}

export interface User {
  id: string
  first_name: string
  last_name: string
  matricule: string
  fonction: string
  department_id: string
  role: string
  is_deleted?: boolean
  phone: string
  email: string
  username: string
  photo_url: string
  status: "Actif" | "Suspendu" | "Désactivé"
  created_at: string
  last_login: string
  mfa_enabled: boolean
  login_attempts: number
  locked_until: string | null
  must_change_password: boolean
}

export interface LoginLog {
  id: string
  username: string
  event_type: "Connexion" | "Déconnexion" | "Échec de connexion"
  ip_address: string
  user_agent: string
  duration: number | null // in minutes
  created_at: string
}

export interface AdminAuditLog {
  id: string
  username: string
  action: string
  entity_type: string
  details: string
  ip_address: string
  created_at: string
}

export interface SecuritySettings {
  min_password_length: number
  require_complexity: boolean
  max_login_attempts: number
  lockout_duration: number // minutes
  max_session_duration: number // minutes
  password_validity_days: number
  mfa_enabled: boolean
  logging_policy: string
}

// Fallback modules
const MODULES = [
  "Réceptions", "Échantillothèque", "Déchets pharmaceutiques", 
  "Mouvements", "Inventaire", "Gestion des destructions", 
  "Documents", "Rapports", "Administration"
]

const getInitialPermissions = (roleCode: string): PermissionRow[] => {
  return MODULES.map(mod => ({
    module: mod,
    can_view: true,
    can_create: roleCode.startsWith("ADMIN") || ["RESP_ECH", "GEST_ECH", "RESP_WASTE"].includes(roleCode) && mod !== "Administration",
    can_modify: roleCode.startsWith("ADMIN") || ["RESP_ECH", "GEST_ECH", "RESP_WASTE"].includes(roleCode) && mod !== "Administration",
    can_delete: roleCode === "ADMIN_SYS",
    can_validate: ["ADMIN_SYS", "RESP_ECH", "RESP_QUAL", "RESP_WASTE"].includes(roleCode),
    can_export: !["ANALYST"].includes(roleCode),
    can_print: true,
    can_admin: roleCode === "ADMIN_SYS" || (roleCode === "ADMIN_FUNC" && mod !== "Administration")
  }))
}

// --- DATABASE SERVICE CALLS (SUPABASE) ---

// 1. DEPARTMENTS
export const getDepartments = async (): Promise<Department[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name', { ascending: true })
  if (error) {
    console.error("Error fetching departments:", error.message)
    return []
  }
  return data || []
}

export const createDepartment = async (dept: Omit<Department, 'id' | 'created_at'>): Promise<boolean> => {
  const supabase = createClient()
  const { error } = await supabase.from('departments').insert(dept)
  if (error) {
    console.error("Error creating department:", error.message)
    return false
  }
  return true
}

export const updateDepartment = async (id: string, dept: Partial<Omit<Department, 'id' | 'created_at'>>): Promise<boolean> => {
  const supabase = createClient()
  const { error } = await supabase.from('departments').update(dept).eq('id', id)
  if (error) {
    console.error("Error updating department:", error.message)
    return false
  }
  return true
}

export const deleteDepartment = async (id: string): Promise<boolean> => {
  const supabase = createClient()
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) {
    console.error("Error deleting department:", error.message)
    return false
  }
  return true
}

// 2. ROLES
export const getRoles = async (): Promise<UserRole[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .order('name', { ascending: true })
  if (error) {
    console.error("Error fetching roles:", error.message)
    return []
  }
  return data || []
}

export const createRole = async (role: Omit<UserRole, 'id'>): Promise<boolean> => {
  const supabase = createClient()
  const { error } = await supabase.from('user_roles').insert(role)
  if (error) {
    console.error("Error creating role:", error.message)
    return false
  }
  return true
}

export const updateRole = async (id: string, role: Partial<Omit<UserRole, 'id' | 'code'>>): Promise<boolean> => {
  const supabase = createClient()
  const { error } = await supabase.from('user_roles').update(role).eq('id', id)
  if (error) {
    console.error("Error updating role:", error.message)
    return false
  }
  return true
}

export const deleteRole = async (id: string): Promise<boolean> => {
  const supabase = createClient()
  const { error } = await supabase.from('user_roles').delete().eq('id', id)
  if (error) {
    console.error("Error deleting role:", error.message)
    return false
  }
  return true
}

// 3. PERMISSIONS
export const getPermissions = async (): Promise<RolePermissions[]> => {
  const supabase = createClient()
  
  const { data: roles, error: rolesError } = await supabase.from('user_roles').select('id, code')
  if (rolesError || !roles) {
    console.error("Error fetching roles for permissions:", rolesError?.message)
    return []
  }

  const { data: perms, error: permsError } = await supabase.from('role_permissions').select('*')
  if (permsError || !perms) {
    console.error("Error fetching role permissions:", permsError?.message)
    return []
  }

  return roles.map(role => {
    const rolePerms = perms.filter(p => p.role_id === role.id)
    const permissionsList = rolePerms.length > 0 ? rolePerms.map(p => ({
      module: p.module,
      can_view: p.can_view,
      can_create: p.can_create,
      can_modify: p.can_modify,
      can_delete: p.can_delete,
      can_validate: p.can_validate,
      can_export: p.can_export,
      can_print: p.can_print,
      can_admin: p.can_admin
    })) : getInitialPermissions(role.code)
    
    return {
      roleCode: role.code,
      permissions: permissionsList
    }
  })
}

export const savePermissions = async (roleCode: string, permsList: PermissionRow[]): Promise<boolean> => {
  const supabase = createClient()
  
  const { data: role, error: roleError } = await supabase.from('user_roles').select('id').eq('code', roleCode).single()
  if (roleError || !role) {
    console.error("Role not found:", roleCode, roleError?.message)
    return false
  }

  const rows = permsList.map(p => ({
    role_id: role.id,
    module: p.module,
    can_view: p.can_view,
    can_create: p.can_create,
    can_modify: p.can_modify,
    can_delete: p.can_delete,
    can_validate: p.can_validate,
    can_export: p.can_export,
    can_print: p.can_print,
    can_admin: p.can_admin
  }))

  const { error } = await supabase.from('role_permissions').upsert(rows, { onConflict: 'role_id,module' })
  if (error) {
    console.error("Error saving permissions:", error.message)
    return false
  }
  
  return true
}

// 4. USERS
export const getUsers = async (): Promise<User[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) {
    console.error("Error fetching users:", error.message)
    return []
  }
  return data || []
}

export const createUser = async (payload: {
  first_name: string
  last_name: string
  matricule: string
  fonction: string
  department_id: string
  role: string
  phone: string
  email: string
  username: string
}): Promise<{ success: boolean; error?: string; tempPass?: string }> => {
  // Call server action to sign up without logging out the admin
  const res = await createUserAction(payload)
  if (res.success && res.tempPass) {
    await logAdminAction("Admin", "CREATE_USER", "Utilisateur", `Création de l'utilisateur ${payload.username}`)
  }
  return res
}

export const updateUser = async (id: string, user: Partial<Omit<User, 'id' | 'created_at'>>): Promise<boolean> => {
  const supabase = createClient()
  const { error } = await supabase.from('users').update(user).eq('id', id)
  if (error) {
    console.error("Error updating user:", error.message)
    return false
  }
  await logAdminAction("Admin", "UPDATE_USER", "Utilisateur", `Modification de l'utilisateur ${user.username || id}`)
  return true
}

export const updateUserStatus = async (id: string, status: "Actif" | "Suspendu" | "Désactivé"): Promise<boolean> => {
  const supabase = createClient()
  const { error } = await supabase.from('users').update({ status }).eq('id', id)
  if (error) {
    console.error("Error updating user status:", error.message)
    return false
  }
  await logAdminAction("Admin", "TOGGLE_STATUS", "Utilisateur", `Changement du statut de ${id} en ${status}`)
  return true
}

export const resetUserPassword = async (id: string, email: string): Promise<string | null> => {
  const res = await resetPasswordAction(email)
  if (res.success) {
    await logAdminAction("Admin", "RESET_PASSWORD", "Utilisateur", `Envoi d'un lien de réinitialisation de mot de passe à ${email}`)
    return "Lien de réinitialisation envoyé par email"
  } else {
    console.error("Password reset error:", res.error)
    return null
  }
}

export const unlockUserAccount = async (id: string): Promise<boolean> => {
  const supabase = createClient()
  const { error } = await supabase.from('users').update({ login_attempts: 0, locked_until: null }).eq('id', id)
  if (error) {
    console.error("Error unlocking account:", error.message)
    return false
  }
  await logAdminAction("Admin", "UNLOCK_ACCOUNT", "Utilisateur", `Déverrouillage du compte ${id}`)
  return true
}

export const resetUserMFA = async (id: string): Promise<boolean> => {
  const supabase = createClient()
  const { error } = await supabase.from('users').update({ mfa_enabled: false }).eq('id', id)
  if (error) {
    console.error("Error resetting MFA:", error.message)
    return false
  }
  await logAdminAction("Admin", "RESET_MFA", "Utilisateur", `Réinitialisation de la MFA pour ${id}`)
  return true
}

export const softDeleteUser = async (id: string): Promise<boolean> => {
  const supabase = createClient()
  const { error } = await supabase.from('users').update({ is_deleted: true, status: 'Désactivé' }).eq('id', id)
  if (error) {
    console.error("Error soft deleting user:", error.message)
    return false
  }
  await logAdminAction("Admin", "DELETE_USER", "Utilisateur", `Désactivation logique du compte ${id}`)
  return true
}

// 5. AUDIT & LOGS
export const getLoginLogs = async (): Promise<LoginLog[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('login_logs')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.error("Error fetching login logs:", error.message)
    return []
  }
  return data || []
}

export const getAuditLogs = async (): Promise<AdminAuditLog[]> => {
  const supabase = createClient()
  // Note: the existing schema has public.audit_logs (which registers sample/waste movements)
  // Let's fetch all audit logs from audit_logs table
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      entity_type,
      ip_address,
      created_at,
      details,
      users (
        first_name,
        last_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error("Error fetching audit logs:", error.message)
    return []
  }

  // Format into AdminAuditLog expected by page
  return (data || []).map((log: any) => ({
    id: log.id,
    username: log.users ? `${log.users.first_name} ${log.users.last_name}` : "Système / Admin",
    action: log.action,
    entity_type: log.entity_type,
    details: typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {}),
    ip_address: log.ip_address || "127.0.0.1",
    created_at: log.created_at
  }))
}

export const logAdminAction = async (username: string, action: string, entity: string, details: string) => {
  const supabase = createClient()
  
  // Try writing to public.audit_logs
  // Note: in public.audit_logs, we have: user_id, action, entity_type, details (JSONB), ip_address
  const { data: { user } } = await supabase.auth.getUser()
  
  await supabase.from('audit_logs').insert({
    user_id: user?.id || null,
    action: 'Modification', // Match the database check constraint which expects ('Connexion', 'Création', 'Modification', 'Suppression', 'Consultation')
    entity_type: entity,
    details: { admin_action: action, admin_details: details },
    ip_address: '127.0.0.1'
  })
}

// 6. SECURITY SETTINGS
const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  min_password_length: 12,
  require_complexity: true,
  max_login_attempts: 5,
  lockout_duration: 15,
  max_session_duration: 30,
  password_validity_days: 90,
  mfa_enabled: true,
  logging_policy: "Complète"
}

export const getSecuritySettings = async (): Promise<SecuritySettings> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'security_settings')
    .maybeSingle()
  
  if (error || !data) {
    return DEFAULT_SECURITY_SETTINGS
  }

  return (data.value as any) || DEFAULT_SECURITY_SETTINGS
}

export const saveSecuritySettings = async (settings: SecuritySettings): Promise<boolean> => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { error } = await supabase
    .from('settings')
    .upsert({
      key: 'security_settings',
      value: settings as any,
      updated_by: user?.id || null
    }, { onConflict: 'key' })
  
  if (error) {
    console.error("Error saving security settings:", error.message)
    return false
  }
  return true
}
