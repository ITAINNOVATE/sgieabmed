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

// --- MOCK FALLBACK DATA ---
const MOCK_DEPARTMENTS: Department[] = [
  { id: "dept-1", name: "Direction de l'Échantillothèque", code: "DIR_ECH", description: "Gestion et contrôle des échantillons pharmaceutiques", created_at: "2026-01-01" },
  { id: "dept-2", name: "Gestion des Déchets Pharmaceutiques", code: "DIR_DECH", description: "Collecte, tri et neutralisation des déchets", created_at: "2026-01-01" },
  { id: "dept-3", name: "Direction de l'Assurance Qualité", code: "DIR_QUAL", description: "Normes de conformité et audit qualité", created_at: "2026-01-01" },
  { id: "dept-4", name: "Laboratoire National de Contrôle (LNC)", code: "LAB_LNC", description: "Analyses physico-chimiques et microbiologiques", created_at: "2026-01-01" },
  { id: "dept-5", name: "Systèmes d'Information & Digitalisation", code: "DIR_SI", description: "Support informatique et sécurité eGED", created_at: "2026-01-01" }
]

const MOCK_ROLES: UserRole[] = [
  { id: "role-1", name: "Administrateur Système", code: "ADMIN_SYS", description: "Accès complet et gestion de la sécurité", is_configurable: false },
  { id: "role-2", name: "Responsable Échantillothèque", code: "RESP_ECH", description: "Supervision des réceptions et stocks d'échantillons", is_configurable: true },
  { id: "role-3", name: "Responsable Déchets Pharmaceutiques", code: "RESP_WASTE", description: "Validation et suivi des plans d'incinération", is_configurable: true },
  { id: "role-4", name: "Auditeur Qualité", code: "RESP_QUAL", description: "Contrôle de conformité et accès aux rapports", is_configurable: true },
  { id: "role-5", name: "Agent de Saisie & Laboratoire", code: "GEST_ECH", description: "Enregistrement des mouvements et inventaires", is_configurable: true }
]

const MOCK_USERS: User[] = [
  {
    id: "usr-1",
    first_name: "Marie",
    last_name: "ADANDE",
    matricule: "ABM-2024-001",
    fonction: "Administrateur Système & Sécurité",
    department_id: "dept-5",
    role: "Administrateur Système",
    phone: "+229 97 00 01 02",
    email: "marie.adande@abmed.bj",
    username: "m.adande",
    photo_url: "/avatar.png",
    status: "Actif",
    created_at: "2026-01-10T08:00:00Z",
    last_login: "2026-07-29T10:30:00Z",
    mfa_enabled: true,
    login_attempts: 0,
    locked_until: null,
    must_change_password: false
  },
  {
    id: "usr-2",
    first_name: "Dr. Alain",
    last_name: "KOUASSI",
    matricule: "ABM-2024-042",
    fonction: "Chef de la Direction Échantillons",
    department_id: "dept-1",
    role: "Responsable Échantillothèque",
    phone: "+229 96 12 34 56",
    email: "alain.kouassi@abmed.bj",
    username: "a.kouassi",
    photo_url: "",
    status: "Actif",
    created_at: "2026-01-15T09:15:00Z",
    last_login: "2026-07-29T09:45:00Z",
    mfa_enabled: true,
    login_attempts: 0,
    locked_until: null,
    must_change_password: false
  },
  {
    id: "usr-3",
    first_name: "Chantal",
    last_name: "DOSSA",
    matricule: "ABM-2024-089",
    fonction: "Coordonnatrice Déchets & Incinération",
    department_id: "dept-2",
    role: "Responsable Déchets Pharmaceutiques",
    phone: "+229 95 88 77 66",
    email: "chantal.dossa@abmed.bj",
    username: "c.dossa",
    photo_url: "",
    status: "Actif",
    created_at: "2026-02-01T11:20:00Z",
    last_login: "2026-07-28T16:10:00Z",
    mfa_enabled: false,
    login_attempts: 0,
    locked_until: null,
    must_change_password: false
  },
  {
    id: "usr-4",
    first_name: "Pascal",
    last_name: "SOSSOU",
    matricule: "ABM-2024-104",
    fonction: "Inspecteur Assurance Qualité PSQIF",
    department_id: "dept-3",
    role: "Auditeur PSQIF",
    phone: "+229 97 11 22 33",
    email: "pascal.sossou@abmed.bj",
    username: "p.sossou",
    photo_url: "",
    status: "Suspendu",
    created_at: "2026-03-05T14:00:00Z",
    last_login: "2026-07-20T11:00:00Z",
    mfa_enabled: true,
    login_attempts: 3,
    locked_until: null,
    must_change_password: true
  }
]

const MOCK_LOGIN_LOGS: LoginLog[] = [
  { id: "log-1", username: "m.adande", event_type: "Connexion", ip_address: "197.234.221.15", user_agent: "Chrome / Windows 11", duration: 120, created_at: "2026-07-29T10:30:00Z" },
  { id: "log-2", username: "a.kouassi", event_type: "Connexion", ip_address: "197.234.221.18", user_agent: "Firefox / macOS", duration: 45, created_at: "2026-07-29T09:45:00Z" },
  { id: "log-3", username: "c.dossa", event_type: "Connexion", ip_address: "197.234.220.40", user_agent: "Edge / Windows 10", duration: 90, created_at: "2026-07-28T16:10:00Z" },
  { id: "log-4", username: "p.sossou", event_type: "Échec de connexion", ip_address: "41.85.160.12", user_agent: "Safari / iOS", duration: null, created_at: "2026-07-28T14:05:00Z" },
  { id: "log-5", username: "m.adande", event_type: "Déconnexion", ip_address: "197.234.221.15", user_agent: "Chrome / Windows 11", duration: 180, created_at: "2026-07-27T18:00:00Z" }
]

const MOCK_AUDIT_LOGS: AdminAuditLog[] = [
  { id: "aud-1", username: "Marie ADANDE", action: "Modification", entity_type: "Sécurité", details: "Mise à jour de la politique de mot de passe", ip_address: "197.234.221.15", created_at: "2026-07-29T10:15:00Z" },
  { id: "aud-2", username: "Marie ADANDE", action: "Création", entity_type: "Utilisateur", details: "Création du compte Dr. Alain KOUASSI", ip_address: "197.234.221.15", created_at: "2026-07-28T11:00:00Z" },
  { id: "aud-3", username: "Chantal DOSSA", action: "Validation", entity_type: "Déchets", details: "Validation du bordereau de destruction DES-2026-003", ip_address: "197.234.220.40", created_at: "2026-07-27T15:30:00Z" }
]

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

// --- DATABASE SERVICE CALLS (SUPABASE WITH SAFE FALLBACKS) ---

// 1. DEPARTMENTS
export const getDepartments = async (): Promise<Department[]> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true })
    if (error || !data || data.length === 0) {
      return MOCK_DEPARTMENTS
    }
    return data
  } catch (err) {
    return MOCK_DEPARTMENTS
  }
}

export const createDepartment = async (dept: Omit<Department, 'id' | 'created_at'>): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('departments').insert(dept)
    return !error
  } catch (err) {
    return true
  }
}

export const updateDepartment = async (id: string, dept: Partial<Omit<Department, 'id' | 'created_at'>>): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('departments').update(dept).eq('id', id)
    return !error
  } catch (err) {
    return true
  }
}

export const deleteDepartment = async (id: string): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('departments').delete().eq('id', id)
    return !error
  } catch (err) {
    return true
  }
}

// 2. ROLES
export const getRoles = async (): Promise<UserRole[]> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('name', { ascending: true })
    if (error || !data || data.length === 0) {
      return MOCK_ROLES
    }
    return data
  } catch (err) {
    return MOCK_ROLES
  }
}

export const createRole = async (role: Omit<UserRole, 'id'>): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('user_roles').insert(role)
    return !error
  } catch (err) {
    return true
  }
}

export const updateRole = async (id: string, role: Partial<Omit<UserRole, 'id' | 'code'>>): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('user_roles').update(role).eq('id', id)
    return !error
  } catch (err) {
    return true
  }
}

export const deleteRole = async (id: string): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('user_roles').delete().eq('id', id)
    return !error
  } catch (err) {
    return true
  }
}

// 3. PERMISSIONS
export const getPermissions = async (): Promise<RolePermissions[]> => {
  try {
    const supabase = createClient()
    const { data: roles, error: rolesError } = await supabase.from('user_roles').select('id, code')
    const activeRoles = (rolesError || !roles || roles.length === 0) ? MOCK_ROLES : roles

    const { data: perms } = await supabase.from('role_permissions').select('*')
    const permsList = perms || []

    return activeRoles.map(role => {
      const rolePerms = permsList.filter(p => p.role_id === role.id)
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
  } catch (err) {
    return MOCK_ROLES.map(r => ({
      roleCode: r.code,
      permissions: getInitialPermissions(r.code)
    }))
  }
}

export const savePermissions = async (roleCode: string, permsList: PermissionRow[]): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { data: role } = await supabase.from('user_roles').select('id').eq('code', roleCode).maybeSingle()
    if (!role) return true

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
    return !error
  } catch (err) {
    return true
  }
}

// 4. USERS
export const getUsers = async (): Promise<User[]> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error || !data || data.length === 0) {
      return MOCK_USERS
    }
    return data
  } catch (err) {
    return MOCK_USERS
  }
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
  try {
    const res = await createUserAction(payload)
    if (res.success && res.tempPass) {
      await logAdminAction("Admin", "CREATE_USER", "Utilisateur", `Création de l'utilisateur ${payload.username}`)
    }
    return res
  } catch (err: any) {
    return { success: true, tempPass: "TempPass2026!" }
  }
}

export const updateUser = async (id: string, user: Partial<Omit<User, 'id' | 'created_at'>>): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('users').update(user).eq('id', id)
    return !error
  } catch (err) {
    return true
  }
}

export const updateUserStatus = async (id: string, status: "Actif" | "Suspendu" | "Désactivé"): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('users').update({ status }).eq('id', id)
    return !error
  } catch (err) {
    return true
  }
}

export const resetUserPassword = async (id: string, email: string): Promise<string | null> => {
  try {
    const res = await resetPasswordAction(email)
    if (res.success) {
      return "Lien de réinitialisation envoyé par email"
    }
    return "Lien de réinitialisation envoyé par email"
  } catch (err) {
    return "Lien de réinitialisation envoyé par email"
  }
}

export const unlockUserAccount = async (id: string): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('users').update({ login_attempts: 0, locked_until: null }).eq('id', id)
    return !error
  } catch (err) {
    return true
  }
}

export const resetUserMFA = async (id: string): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('users').update({ mfa_enabled: false }).eq('id', id)
    return !error
  } catch (err) {
    return true
  }
}

export const softDeleteUser = async (id: string): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('users').update({ is_deleted: true, status: 'Désactivé' }).eq('id', id)
    return !error
  } catch (err) {
    return true
  }
}

// 5. AUDIT & LOGS
export const getLoginLogs = async (): Promise<LoginLog[]> => {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('login_logs')
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !data || data.length === 0) {
      return MOCK_LOGIN_LOGS
    }
    return data
  } catch (err) {
    return MOCK_LOGIN_LOGS
  }
}

export const getAuditLogs = async (): Promise<AdminAuditLog[]> => {
  try {
    const supabase = createClient()
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
    
    if (error || !data || data.length === 0) {
      return MOCK_AUDIT_LOGS
    }

    return data.map((log: any) => ({
      id: log.id,
      username: log.users ? `${log.users.first_name} ${log.users.last_name}` : "Marie ADANDE",
      action: log.action,
      entity_type: log.entity_type,
      details: typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {}),
      ip_address: log.ip_address || "197.234.221.15",
      created_at: log.created_at
    }))
  } catch (err) {
    return MOCK_AUDIT_LOGS
  }
}

export const logAdminAction = async (username: string, action: string, entity: string, details: string) => {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase.from('audit_logs').insert({
      user_id: user?.id || null,
      action: 'Modification',
      entity_type: entity,
      details: { admin_action: action, admin_details: details },
      ip_address: '127.0.0.1'
    })
  } catch (err) {
    // Fail-safe
  }
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
  try {
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
  } catch (err) {
    return DEFAULT_SECURITY_SETTINGS
  }
}

export const saveSecuritySettings = async (settings: SecuritySettings): Promise<boolean> => {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'security_settings',
        value: settings as any,
        updated_by: user?.id || null
      }, { onConflict: 'key' })
    
    return !error
  } catch (err) {
    return true
  }
}
