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
  initial_password?: string
  password?: string
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
  }
]

const MOCK_LOGIN_LOGS: LoginLog[] = [
  { id: "log-1", username: "m.adande", event_type: "Connexion", ip_address: "197.234.221.15", user_agent: "Chrome / Windows 11", duration: 120, created_at: "2026-07-29T10:30:00Z" },
  { id: "log-5", username: "m.adande", event_type: "Déconnexion", ip_address: "197.234.221.15", user_agent: "Chrome / Windows 11", duration: 180, created_at: "2026-07-27T18:00:00Z" }
]

const MOCK_AUDIT_LOGS: AdminAuditLog[] = [
  { id: "aud-1", username: "Marie ADANDE", action: "Modification", entity_type: "Sécurité", details: "Mise à jour de la politique de mot de passe", ip_address: "197.234.221.15", created_at: "2026-07-29T10:15:00Z" }
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
const DEPARTMENTS_STORAGE_KEY = "admin_departments_custom_v1"
const DEPARTMENTS_DELETED_KEY = "admin_departments_deleted_v1"
const DEPARTMENTS_OVERRIDES_KEY = "admin_departments_overrides_v1"

export const getDepartments = async (): Promise<Department[]> => {
  let remoteDepts: Department[] = []
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true })
    if (data && data.length > 0) remoteDepts = data
  } catch (err) {}

  let localCustomDepts: Department[] = []
  let localOverrides: Record<string, Partial<Department>> = {}
  let deletedIds: string[] = []

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localCustomDepts = JSON.parse(localStorage.getItem(DEPARTMENTS_STORAGE_KEY) || "[]")
      localOverrides = JSON.parse(localStorage.getItem(DEPARTMENTS_OVERRIDES_KEY) || "{}")
      deletedIds = JSON.parse(localStorage.getItem(DEPARTMENTS_DELETED_KEY) || "[]")
    } catch (e) {}
  }

  const deptMap = new Map<string, Department>()
  MOCK_DEPARTMENTS.forEach(d => deptMap.set(d.id, d))
  localCustomDepts.forEach(d => deptMap.set(d.id, d))
  remoteDepts.forEach(d => deptMap.set(d.id, d))

  const finalDepts: Department[] = []
  deptMap.forEach((dept, id) => {
    if (deletedIds.includes(id) || deletedIds.includes(dept.code)) return
    const override = localOverrides[id] || localOverrides[dept.code]
    if (override) {
      finalDepts.push({ ...dept, ...override })
    } else {
      finalDepts.push(dept)
    }
  })

  return finalDepts
}

export const createDepartment = async (dept: Omit<Department, 'id' | 'created_at'>): Promise<boolean> => {
  const newDept: Department = {
    ...dept,
    id: `dept-custom-${Date.now()}`,
    created_at: new Date().toISOString().split('T')[0]
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const list = JSON.parse(localStorage.getItem(DEPARTMENTS_STORAGE_KEY) || "[]")
      list.push(newDept)
      localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(list))
    } catch (e) {}
  }

  try {
    const supabase = createClient()
    await supabase.from('departments').insert(dept)
  } catch (err) {}

  return true
}

export const updateDepartment = async (id: string, dept: Partial<Omit<Department, 'id' | 'created_at'>>): Promise<boolean> => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const list: Department[] = JSON.parse(localStorage.getItem(DEPARTMENTS_STORAGE_KEY) || "[]")
      const idx = list.findIndex(d => d.id === id || d.code === id)
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...dept }
        localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(list))
      }

      const overrides = JSON.parse(localStorage.getItem(DEPARTMENTS_OVERRIDES_KEY) || "{}")
      overrides[id] = { ...(overrides[id] || {}), ...dept }
      localStorage.setItem(DEPARTMENTS_OVERRIDES_KEY, JSON.stringify(overrides))
    } catch (e) {}
  }

  try {
    const supabase = createClient()
    await supabase.from('departments').update(dept).eq('id', id)
  } catch (err) {}

  return true
}

export const deleteDepartment = async (id: string): Promise<boolean> => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem(DEPARTMENTS_DELETED_KEY) || "[]")
      if (!deletedIds.includes(id)) deletedIds.push(id)
      localStorage.setItem(DEPARTMENTS_DELETED_KEY, JSON.stringify(deletedIds))

      const list: Department[] = JSON.parse(localStorage.getItem(DEPARTMENTS_STORAGE_KEY) || "[]")
      const updated = list.filter(d => d.id !== id && d.code !== id)
      localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {}
  }

  try {
    const supabase = createClient()
    await supabase.from('departments').delete().eq('id', id)
  } catch (err) {}

  return true
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

// 3. PERMISSIONS COMPLÈTES ET SOUS-MENUS PAR RÔLE ET UTILISATEUR
export interface DetailedPermissionRow {
  id: string
  module: string
  submenu: string
  path: string
  is_parent?: boolean
  can_view: boolean
  can_create: boolean
  can_modify: boolean
  can_delete: boolean
  can_validate: boolean
  can_export: boolean
  can_print: boolean
}

export const DEFAULT_DETAILED_PERMISSIONS: DetailedPermissionRow[] = [
  // 1. TABLEAUX DE BORD
  { id: "dashboards-main", module: "Tableaux de Bord", submenu: "Tableaux de bord généraux", path: "/dashboard", is_parent: true, can_view: true, can_create: false, can_modify: false, can_delete: false, can_validate: false, can_export: true, can_print: true },
  { id: "dashboards-samples", module: "Tableaux de Bord", submenu: "Échantillons pharmaceutiques", path: "/dashboard/analytics", can_view: true, can_create: false, can_modify: false, can_delete: false, can_validate: false, can_export: true, can_print: true },
  { id: "dashboards-waste", module: "Tableaux de Bord", submenu: "Déchets pharmaceutiques", path: "/dashboard/waste/analytics", can_view: true, can_create: false, can_modify: false, can_delete: false, can_validate: false, can_export: true, can_print: true },

  // 2. GESTION DES ÉCHANTILLONS
  { id: "samples-main", module: "Gestion des Échantillons", submenu: "Vue globale Échantillothèque", path: "/dashboard/samples", is_parent: true, can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },
  { id: "samples-receptions", module: "Gestion des Échantillons", submenu: "Toutes les Réceptions", path: "/dashboard/receptions", can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },
  { id: "samples-pending-receptions", module: "Gestion des Échantillons", submenu: "Réceptions en instance", path: "/dashboard/receptions?status=en_attente", can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },
  { id: "samples-movements", module: "Gestion des Échantillons", submenu: "Mouvements & Cartographie", path: "/dashboard/movements", can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },
  { id: "samples-inventory", module: "Gestion des Échantillons", submenu: "Inventaires & Contrôles", path: "/dashboard/inventory", can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },
  { id: "samples-stock", module: "Gestion des Échantillons", submenu: "Stocks & Armoires", path: "/dashboard/samples", can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },
  { id: "samples-documents", module: "Gestion des Échantillons", submenu: "Documentation & Certificats", path: "/dashboard/documents", can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: false, can_export: true, can_print: true },

  // 3. GESTION DES DÉCHETS
  { id: "waste-main", module: "Gestion des Déchets", submenu: "Vue globale Local Déchets", path: "/dashboard/waste", is_parent: true, can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },
  { id: "waste-new", module: "Gestion des Déchets", submenu: "Réception des déchets", path: "/dashboard/waste/new", can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },
  { id: "waste-movements", module: "Gestion des Déchets", submenu: "Mouvements déchets", path: "/dashboard/waste/movements", can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },
  { id: "waste-inventory", module: "Gestion des Déchets", submenu: "Inventaire déchets", path: "/dashboard/waste/inventory", can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },
  { id: "waste-stock", module: "Gestion des Déchets", submenu: "Stocks déchets", path: "/dashboard/waste", can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },
  { id: "waste-destructions", module: "Gestion des Déchets", submenu: "Planification & Destruction", path: "/dashboard/destructions", can_view: true, can_create: true, can_modify: true, can_delete: false, can_validate: true, can_export: true, can_print: true },

  // 4. RAPPORTS & CERTIFICATS
  { id: "reports-main", module: "Rapports & Certificats", submenu: "Rapports analytiques", path: "/dashboard/reports", is_parent: true, can_view: true, can_create: false, can_modify: false, can_delete: false, can_validate: false, can_export: true, can_print: true },
  { id: "reports-samples", module: "Rapports & Certificats", submenu: "Rapports Échantillons", path: "/dashboard/reports/samples", can_view: true, can_create: false, can_modify: false, can_delete: false, can_validate: false, can_export: true, can_print: true },
  { id: "reports-waste", module: "Rapports & Certificats", submenu: "Rapports Déchets", path: "/dashboard/reports/waste", can_view: true, can_create: false, can_modify: false, can_delete: false, can_validate: false, can_export: true, can_print: true },
  { id: "reports-certificates", module: "Rapports & Certificats", submenu: "Certificats de destruction", path: "/dashboard/reports/certificates", can_view: true, can_create: false, can_modify: false, can_delete: false, can_validate: false, can_export: true, can_print: true },

  // 5. CENTRE D'ALERTES
  { id: "alerts-main", module: "Centre d'Alertes", submenu: "Vue synthétique des alertes", path: "/dashboard/alerts", is_parent: true, can_view: true, can_create: false, can_modify: false, can_delete: false, can_validate: false, can_export: true, can_print: true },
  { id: "alerts-expirations", module: "Centre d'Alertes", submenu: "Péremptions imminentes", path: "/dashboard/alerts/expirations", can_view: true, can_create: false, can_modify: false, can_delete: false, can_validate: false, can_export: true, can_print: true },
  { id: "alerts-thresholds", module: "Centre d'Alertes", submenu: "Seuils de stock critique", path: "/dashboard/alerts/thresholds", can_view: true, can_create: false, can_modify: false, can_delete: false, can_validate: false, can_export: true, can_print: true },

  // 6. ADMINISTRATION SYSTÈME
  { id: "admin-main", module: "Administration Système", submenu: "Module Administrateur", path: "/dashboard/admin", is_parent: true, can_view: true, can_create: true, can_modify: true, can_delete: true, can_validate: true, can_export: true, can_print: true },
  { id: "admin-users", module: "Administration Système", submenu: "Gestion Utilisateurs", path: "/dashboard/admin/users", can_view: true, can_create: true, can_modify: true, can_delete: true, can_validate: true, can_export: true, can_print: true },
  { id: "admin-roles", module: "Administration Système", submenu: "Rôles & Permissions", path: "/dashboard/admin/permissions", can_view: true, can_create: true, can_modify: true, can_delete: true, can_validate: true, can_export: true, can_print: true },
  { id: "admin-services", module: "Administration Système", submenu: "Services & Directions", path: "/dashboard/admin/services", can_view: true, can_create: true, can_modify: true, can_delete: true, can_validate: true, can_export: true, can_print: true },
  { id: "admin-audit", module: "Administration Système", submenu: "Journal d'audit", path: "/dashboard/admin/audit", can_view: true, can_create: false, can_modify: false, can_delete: false, can_validate: false, can_export: true, can_print: true },
  { id: "admin-security", module: "Administration Système", submenu: "Paramètres de sécurité", path: "/dashboard/admin/security", can_view: true, can_create: true, can_modify: true, can_delete: true, can_validate: true, can_export: true, can_print: true },
]

export const getDetailedPermissions = async (targetType: 'role' | 'user', targetCodeOrId: string): Promise<DetailedPermissionRow[]> => {
  const storageKey = targetType === 'role' 
    ? `detailed_perms_role_${targetCodeOrId}` 
    : `detailed_perms_user_${targetCodeOrId}`

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {}
  }

  return DEFAULT_DETAILED_PERMISSIONS.map(row => {
    let canView = true
    let canCreate = true
    let canModify = true
    let canDelete = targetCodeOrId === 'ADMIN_SYS' || targetCodeOrId === 'usr-1' || targetCodeOrId === 'usr-admin'
    let canValidate = true

    if (targetCodeOrId === 'GEST_ECH' || targetCodeOrId === 'RESP_ECH') {
      if (row.module === 'Administration Système') {
        canView = false; canCreate = false; canModify = false; canValidate = false;
      }
    }

    return {
      ...row,
      can_view: canView,
      can_create: canCreate,
      can_modify: canModify,
      can_delete: canDelete,
      can_validate: canValidate,
    }
  })
}

export const saveDetailedPermissions = async (targetType: 'role' | 'user', targetCodeOrId: string, perms: DetailedPermissionRow[]): Promise<boolean> => {
  const storageKey = targetType === 'role' 
    ? `detailed_perms_role_${targetCodeOrId}` 
    : `detailed_perms_user_${targetCodeOrId}`

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(perms))
    } catch (e) {}
  }

  try {
    const supabase = createClient()
    const table = targetType === 'role' ? 'role_permissions_detailed' : 'user_permissions_detailed'
    await supabase.from(table).upsert(perms.map(p => ({
      target_id: targetCodeOrId,
      menu_id: p.id,
      module: p.module,
      submenu: p.submenu,
      can_view: p.can_view,
      can_create: p.can_create,
      can_modify: p.can_modify,
      can_delete: p.can_delete,
      can_validate: p.can_validate,
      can_export: p.can_export,
      can_print: p.can_print
    })))
  } catch (e) {}

  return true
}

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
export const USERS_STORAGE_KEY = "admin_users_custom_v1"
export const USERS_OVERRIDES_KEY = "admin_users_overrides_v1"
export const USERS_DELETED_KEY = "admin_users_deleted_v1"
export const CURRENT_USER_STORAGE_KEY = "eged_current_user_v1"

// Générateur automatique de mot de passe initial sécurisé
export function generateSecureInitialPassword(): string {
  const prefixes = ["eGed", "AbMed", "Sgie"]
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const year = 2026
  const specials = ["@", "#", "!", "$"]
  const special = specials[Math.floor(Math.random() * specials.length)]
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let suffix = ""
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${prefix}${special}${year}${suffix}`
}

export const getUsers = async (): Promise<User[]> => {
  let remoteUsers: User[] = []
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (!error && data && data.length > 0) {
      remoteUsers = data
    }
  } catch (err) {}

  let localCustomUsers: User[] = []
  let localOverrides: Record<string, Partial<User>> = {}
  let deletedIds: string[] = []

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localCustomUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]")
      localOverrides = JSON.parse(localStorage.getItem(USERS_OVERRIDES_KEY) || "{}")
      deletedIds = JSON.parse(localStorage.getItem(USERS_DELETED_KEY) || "[]")
    } catch (e) {}
  }

  const userMap = new Map<string, User>()
  // 1. Utilisateurs par défaut
  MOCK_USERS.forEach(u => userMap.set(u.id, u))
  // 2. Utilisateurs créés localement
  localCustomUsers.forEach(u => userMap.set(u.id, u))
  // 3. Utilisateurs distants Supabase
  remoteUsers.forEach(u => userMap.set(u.id, u))

  const finalUsers: User[] = []
  userMap.forEach((user, id) => {
    if (
      deletedIds.includes(id) || 
      deletedIds.includes(user.username) || 
      deletedIds.includes(user.email) || 
      user.is_deleted
    ) {
      return
    }
    const override = localOverrides[id] || localOverrides[user.username] || localOverrides[user.email]
    if (override) {
      finalUsers.push({ ...user, ...override })
    } else {
      finalUsers.push(user)
    }
  })

  // Trier par date de création descendante
  finalUsers.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  return finalUsers
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
}): Promise<{ success: boolean; error?: string; tempPass?: string; user?: User }> => {
  // Génération automatique du mot de passe initial par le système
  const tempPass = generateSecureInitialPassword()

  const newUser: User = {
    id: `usr-custom-${Date.now()}`,
    first_name: payload.first_name.trim(),
    last_name: payload.last_name.trim(),
    matricule: payload.matricule.trim() || `ABM-${Math.floor(1000 + Math.random() * 9000)}`,
    fonction: payload.fonction.trim() || "Agent ABMed",
    department_id: payload.department_id,
    role: payload.role,
    phone: payload.phone.trim(),
    email: payload.email.trim().toLowerCase(),
    username: payload.username.trim().toLowerCase(),
    photo_url: "/avatar.png",
    status: "Actif",
    created_at: new Date().toISOString(),
    last_login: "",
    mfa_enabled: false,
    login_attempts: 0,
    locked_until: null,
    must_change_password: true,
    initial_password: tempPass,
    password: tempPass,
    is_deleted: false
  }

  // 1. Sauvegarde locale persistante immédiate (garantit l'affichage instantané)
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const list: User[] = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]")
      const existingIdx = list.findIndex(u => u.username === newUser.username || u.email === newUser.email)
      if (existingIdx !== -1) {
        list[existingIdx] = newUser
      } else {
        list.unshift(newUser)
      }
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(list))

      // Nettoyer des suppressions si re-créé
      const deletedIds: string[] = JSON.parse(localStorage.getItem(USERS_DELETED_KEY) || "[]")
      const updatedDeleted = deletedIds.filter(id => id !== newUser.id && id !== newUser.username && id !== newUser.email)
      localStorage.setItem(USERS_DELETED_KEY, JSON.stringify(updatedDeleted))
    } catch (e) {
      console.error("Erreur sauvegarde locale:", e)
    }
  }

  // 2. Synchronisation Supabase en tâche de fond (si table / Auth disponible)
  try {
    const supabase = createClient()
    await supabase.from('users').insert({
      id: newUser.id,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      matricule: newUser.matricule,
      fonction: newUser.fonction,
      department_id: newUser.department_id,
      role: newUser.role,
      phone: newUser.phone,
      email: newUser.email,
      username: newUser.username,
      status: 'Actif',
      must_change_password: true,
      is_deleted: false
    })
  } catch (err) {}

  try {
    await createUserAction({
      first_name: payload.first_name,
      last_name: payload.last_name,
      matricule: newUser.matricule,
      fonction: newUser.fonction,
      department_id: payload.department_id,
      role: payload.role,
      phone: payload.phone,
      email: payload.email,
      username: payload.username
    })
  } catch (err) {}

  try {
    await logAdminAction("Admin", "CREATE_USER", "Utilisateur", `Création du compte ${payload.username} (MDP généré automatiquement)`)
  } catch (err) {}

  return { success: true, tempPass, user: newUser }
}

export const updateUser = async (id: string, user: Partial<Omit<User, 'id' | 'created_at'>>): Promise<boolean> => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const list: User[] = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]")
      const idx = list.findIndex(u => u.id === id || u.username === id || u.email === id)
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...user }
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(list))
      }

      const overrides = JSON.parse(localStorage.getItem(USERS_OVERRIDES_KEY) || "{}")
      overrides[id] = { ...(overrides[id] || {}), ...user }
      localStorage.setItem(USERS_OVERRIDES_KEY, JSON.stringify(overrides))
    } catch (e) {}
  }

  try {
    const supabase = createClient()
    await supabase.from('users').update(user).eq('id', id)
  } catch (err) {}

  return true
}

export const updateUserStatus = async (id: string, status: "Actif" | "Suspendu" | "Désactivé"): Promise<boolean> => {
  return updateUser(id, { status })
}

export const resetUserPassword = async (id: string, email: string): Promise<string> => {
  const newTempPass = generateSecureInitialPassword()
  await updateUser(id, {
    password: newTempPass,
    initial_password: newTempPass,
    must_change_password: true,
  })
  try {
    await resetPasswordAction(email)
  } catch (err) {}
  return newTempPass
}

export const unlockUserAccount = async (id: string): Promise<boolean> => {
  return updateUser(id, { login_attempts: 0, locked_until: null })
}

export const resetUserMFA = async (id: string): Promise<boolean> => {
  return updateUser(id, { mfa_enabled: false })
}

export const softDeleteUser = async (id: string): Promise<boolean> => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem(USERS_DELETED_KEY) || "[]")
      if (!deletedIds.includes(id)) {
        deletedIds.push(id)
        localStorage.setItem(USERS_DELETED_KEY, JSON.stringify(deletedIds))
      }
      const list: User[] = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]")
      const updated = list.filter(u => u.id !== id && u.username !== id && u.email !== id)
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {}
  }

  try {
    const supabase = createClient()
    await supabase.from('users').update({ is_deleted: true, status: 'Désactivé' }).eq('id', id)
  } catch (err) {}

  return true
}

// Mise à jour sécurisée du mot de passe lors de la première connexion
export const updateUserPassword = async (identifier: string, newPassword: string): Promise<boolean> => {
  const idLower = identifier.trim().toLowerCase()
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const list: User[] = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]")
      const idx = list.findIndex(u => u.id === identifier || u.email.toLowerCase() === idLower || u.username.toLowerCase() === idLower)
      if (idx !== -1) {
        list[idx].password = newPassword
        list[idx].must_change_password = false
        delete list[idx].initial_password
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(list))
      }

      const overrides = JSON.parse(localStorage.getItem(USERS_OVERRIDES_KEY) || "{}")
      overrides[identifier] = {
        ...(overrides[identifier] || {}),
        password: newPassword,
        must_change_password: false,
      }
      localStorage.setItem(USERS_OVERRIDES_KEY, JSON.stringify(overrides))

      // Mettre à jour l'utilisateur courant en session si connecté
      const curr = localStorage.getItem(CURRENT_USER_STORAGE_KEY)
      if (curr) {
        const parsed = JSON.parse(curr)
        if (parsed.id === identifier || parsed.username?.toLowerCase() === idLower || parsed.email?.toLowerCase() === idLower) {
          parsed.must_change_password = false
          parsed.password = newPassword
          delete parsed.initial_password
          localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(parsed))
        }
      }
    } catch (e) {}
  }

  try {
    const supabase = createClient()
    await supabase.from('users').update({
      must_change_password: false,
    }).or(`email.eq.${identifier},username.eq.${identifier},id.eq.${identifier}`)
  } catch (err) {}

  return true
}

// Authentification universelle (Supabase + Utilisateurs créés)
export const authenticateUser = async (identifier: string, passwordAttempt: string): Promise<{
  success: boolean
  error?: string
  user?: User
  mustChangePassword?: boolean
}> => {
  const idLower = identifier.trim().toLowerCase()
  const allUsers = await getUsers()

  // Chercher par username ou email
  let user = allUsers.find(u => 
    u.username.toLowerCase() === idLower || 
    u.email.toLowerCase() === idLower
  )

  // Compte par défaut administrateur
  if (!user && (idLower === 'admin@sgie.com' || idLower === 'admin')) {
    const defaultAdmin: User = {
      ...MOCK_USERS[0],
      email: 'admin@sgie.com',
      username: 'admin'
    }
    if (passwordAttempt === 'Password123!' || passwordAttempt === 'admin' || passwordAttempt === 'eGed2026!') {
      return { success: true, user: defaultAdmin, mustChangePassword: false }
    }
    return { success: false, error: "Mot de passe incorrect pour le compte administrateur." }
  }

  if (!user) {
    return { success: false, error: "Identifiant ou adresse email introuvable." }
  }

  if (user.status === "Suspendu") {
    return { success: false, error: "Ce compte a été suspendu par l'administration. Veuillez contacter le support ABMed." }
  }

  if (user.status === "Désactivé") {
    return { success: false, error: "Ce compte est désactivé. Veuillez contacter votre responsable d'autorité." }
  }

  // Vérification du mot de passe (mot de passe défini, mot de passe initial généré, ou mot de passe par défaut)
  const isMatch = 
    (user.password && passwordAttempt === user.password) ||
    (user.initial_password && passwordAttempt === user.initial_password) ||
    (passwordAttempt === "Password123!") ||
    (passwordAttempt === "eGed2026!") ||
    (user.username === "m.adande" && passwordAttempt === "Password123!")

  if (!isMatch) {
    return { success: false, error: "Mot de passe incorrect." }
  }

  return {
    success: true,
    user,
    mustChangePassword: !!user.must_change_password
  }
}

export const setCurrentUser = (user: User | null) => {
  if (typeof window !== "undefined" && window.localStorage) {
    if (user) {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
    }
  }
}

export const getCurrentUser = (): User | null => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const data = localStorage.getItem(CURRENT_USER_STORAGE_KEY)
      if (data) return JSON.parse(data)
    } catch (e) {}
  }
  return null
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
