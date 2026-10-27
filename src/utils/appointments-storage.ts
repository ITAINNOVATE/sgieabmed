"use client"

import { createClient } from "@/utils/supabase/client"
import { broadcastDataMutation } from "@/utils/realtimeBus"
import { Center } from "./centers-storage"

export interface ReceptionSchedule {
  id: string
  date: string // Format "YYYY-MM-DD"
  start_time: string // Ex: "08:30"
  end_time: string // Ex: "15:30"
  reception_type: "Échantillons pharmaceutiques" | "Déchets pharmaceutiques" | "Mixte (Échantillons & Déchets)"
  max_capacity: number // Nombre de centres attendus
  booked_count: number // Nombre de places déjà réservées
  location: string // Ex: "Magasin Central ABMed — Guichet Réception"
  instructions?: string
  status: "Ouvert" | "Complet" | "Clôturé" | "Annulé"
  created_by: string
  created_at: string
}

export interface Appointment {
  id: string
  appointment_number: string // Ex: "RDV-2026-10-001"
  schedule_id: string
  date: string // "YYYY-MM-DD"
  time_slot: string // "09:00 - 10:00" ou "08:30"
  center_code: string // Ex: "CTR-2026-0001"
  center_name: string
  center_type: string
  city: string
  contact_phone: string
  contact_email?: string
  type: "Échantillons" | "Déchets" | "Mixte"
  estimated_quantity?: string // Ex: "4 cartons, ~25 kg"
  depositor_name: string // Nom du transporteur / représentant
  depositor_id_card?: string // N° CIP ou CNI
  observations?: string
  status: "Confirmé" | "Effectué" | "Annulé" | "Absent"
  created_at: string
  validated_at?: string
  validated_by?: string
}

export const LOCAL_STORAGE_SCHEDULES_KEY = "abmed_reception_schedules_v3"
export const LOCAL_STORAGE_APPOINTMENTS_KEY = "abmed_appointments_v3"

// Par défaut, aucune donnée fictive : le module démarre entièrement vierge
const DEFAULT_SCHEDULES: ReceptionSchedule[] = []
const DEFAULT_APPOINTMENTS: Appointment[] = []

let memorySchedulesCache: ReceptionSchedule[] | null = null
let memoryAppointmentsCache: Appointment[] | null = null

// Nettoyage automatique des anciens caches d'exemples de test (v1 et v2)
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("abmed_reception_schedules_v1")
    localStorage.removeItem("abmed_appointments_v1")
    localStorage.removeItem("abmed_reception_schedules_v2")
    localStorage.removeItem("abmed_appointments_v2")
  } catch (e) {}
}

// --- GESTION DES JOURNÉES DE RÉCEPTION (CRÉNEAUX ABMED) ---

export function getReceptionSchedulesSync(): ReceptionSchedule[] {
  if (memorySchedulesCache !== null) {
    return memorySchedulesCache
  }
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_SCHEDULES_KEY)
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          memorySchedulesCache = parsed
          return parsed
        }
      }
    } catch (e) {}
  }
  memorySchedulesCache = []
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_SCHEDULES_KEY, JSON.stringify([]))
    } catch (e) {}
  }
  return []
}

export async function getReceptionSchedules(): Promise<ReceptionSchedule[]> {
  const localList = getReceptionSchedulesSync()
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("waste_movements")
      .select("*")
      .eq("type", "Créneau réception")
      .order("created_at", { ascending: false })

    if (data && data.length > 0) {
      const cloudSchedules: ReceptionSchedule[] = []
      data.forEach((mvt: any) => {
        try {
          if (mvt.observations) {
            const parsed = JSON.parse(mvt.observations)
            if (parsed && parsed.date && parsed.max_capacity) {
              cloudSchedules.push(parsed)
            }
          }
        } catch {}
      })

      const schedMap = new Map<string, ReceptionSchedule>()
      localList.forEach((s) => schedMap.set(s.id, s))
      cloudSchedules.forEach((s) => schedMap.set(s.id, s))
      const merged = Array.from(schedMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      memorySchedulesCache = merged
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_SCHEDULES_KEY, JSON.stringify(merged))
      }
      return merged
    }
  } catch (err) {}
  return localList
}

export async function saveReceptionSchedule(schedule: ReceptionSchedule): Promise<boolean> {
  const list = getReceptionSchedulesSync()
  const idx = list.findIndex((s) => s.id === schedule.id)
  let updatedList: ReceptionSchedule[] = []

  if (idx !== -1) {
    updatedList = [...list]
    updatedList[idx] = schedule
  } else {
    updatedList = [schedule, ...list]
  }

  // Tri par date chronologique
  updatedList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  memorySchedulesCache = updatedList

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_SCHEDULES_KEY, JSON.stringify(updatedList))
    } catch (e) {}
  }

  // Sauvegarde Cloud dans waste_movements
  try {
    const supabase = createClient()
    await supabase.from("waste_movements").upsert([
      {
        mvt_number: `SCHED-${schedule.id}`,
        date: schedule.date,
        type: "Créneau réception",
        batch: `CAPACITE-${schedule.max_capacity}`,
        waste_type: schedule.reception_type,
        commercial_name: `Journée de Réception du ${schedule.date}`,
        quantity: `${schedule.booked_count}/${schedule.max_capacity} centres`,
        operator: schedule.created_by,
        destination: schedule.location,
        observations: JSON.stringify(schedule)
      }
    ], { onConflict: "mvt_number" })
  } catch (e) {}

  broadcastDataMutation({
    entity: "reception_schedules,appointments",
    action: "schedule_save",
    id: schedule.id
  })

  return true
}

export async function deleteReceptionSchedule(scheduleId: string): Promise<boolean> {
  const list = getReceptionSchedulesSync()
  const updatedList = list.filter((s) => s.id !== scheduleId)
  memorySchedulesCache = updatedList

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_SCHEDULES_KEY, JSON.stringify(updatedList))
    } catch (e) {}
  }

  try {
    const supabase = createClient()
    await supabase.from("waste_movements").delete().eq("mvt_number", `SCHED-${scheduleId}`)
  } catch (e) {}

  broadcastDataMutation({
    entity: "reception_schedules,appointments",
    action: "schedule_delete",
    id: scheduleId
  })

  return true
}

// --- GESTION DES RENDEZ-VOUS PRIS PAR LES CENTRES ---

export function getAppointmentsSync(): Appointment[] {
  if (memoryAppointmentsCache !== null) {
    return memoryAppointmentsCache
  }
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_APPOINTMENTS_KEY)
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          memoryAppointmentsCache = parsed
          return parsed
        }
      }
    } catch (e) {}
  }
  memoryAppointmentsCache = []
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_APPOINTMENTS_KEY, JSON.stringify([]))
    } catch (e) {}
  }
  return []
}

export async function getAppointments(): Promise<Appointment[]> {
  const localList = getAppointmentsSync()
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("waste_movements")
      .select("*")
      .eq("type", "Rendez-vous")
      .order("created_at", { ascending: false })

    if (data && data.length > 0) {
      const cloudAppointments: Appointment[] = []
      data.forEach((mvt: any) => {
        try {
          if (mvt.observations) {
            const parsed = JSON.parse(mvt.observations)
            if (parsed && parsed.appointment_number && parsed.center_code) {
              cloudAppointments.push(parsed)
            }
          }
        } catch {}
      })

      const appMap = new Map<string, Appointment>()
      localList.forEach((a) => appMap.set(a.id, a))
      cloudAppointments.forEach((a) => appMap.set(a.id, a))
      const merged = Array.from(appMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      memoryAppointmentsCache = merged
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_APPOINTMENTS_KEY, JSON.stringify(merged))
      }
      return merged
    }
  } catch (err) {}
  return localList
}

/**
 * Réinitialise et vide intégralement tous les créneaux et rendez-vous du module
 */
export async function clearAllAppointmentsData(): Promise<boolean> {
  memorySchedulesCache = []
  memoryAppointmentsCache = []

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_SCHEDULES_KEY, JSON.stringify([]))
      localStorage.setItem(LOCAL_STORAGE_APPOINTMENTS_KEY, JSON.stringify([]))
      localStorage.removeItem("abmed_reception_schedules_v1")
      localStorage.removeItem("abmed_appointments_v1")
      localStorage.removeItem("abmed_reception_schedules_v2")
      localStorage.removeItem("abmed_appointments_v2")
    } catch (e) {}
  }

  try {
    const supabase = createClient()
    await Promise.allSettled([
      supabase.from("waste_movements").delete().eq("type", "Créneau réception"),
      supabase.from("waste_movements").delete().eq("type", "Rendez-vous"),
      supabase.from("waste_movements").delete().like("mvt_number", "SCHED-%"),
      supabase.from("waste_movements").delete().like("mvt_number", "APP-%"),
    ])
  } catch (err) {}

  broadcastDataMutation({
    entity: "appointments,reception_schedules,waste_movements",
    action: "clear_all",
    id: "all"
  })

  return true
}

/**
 * Génère le numéro séquentiel unique du prochain rendez-vous
 */
export function generateNextAppointmentNumber(existing: Appointment[]): string {
  const year = new Date().getFullYear()
  const month = (new Date().getMonth() + 1).toString().padStart(2, "0")
  const prefix = `RDV-${year}-${month}-`
  let maxSeq = 0
  existing.forEach((a) => {
    if (a.appointment_number && a.appointment_number.startsWith(prefix)) {
      const parts = a.appointment_number.split("-")
      const num = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(num) && num > maxSeq) maxSeq = num
    }
  })
  return `${prefix}${(maxSeq + 1).toString().padStart(3, "0")}`
}

export interface BookAppointmentInput {
  schedule_id: string
  center: Center
  type: "Échantillons" | "Déchets" | "Mixte"
  time_slot?: string
  estimated_quantity?: string
  depositor_name: string
  depositor_id_card?: string
  observations?: string
}

/**
 * Réserve un créneau pour un centre :
 * - Déduit automatiquement le nombre de places restantes sur la journée
 * - Si le nombre de réservations atteint la capacité maximale, marque la journée comme "Complet"
 * - Enregistre le RDV avec son numéro officiel
 */
export async function bookAppointment(
  input: BookAppointmentInput
): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
  const schedules = getReceptionSchedulesSync()
  const schedIdx = schedules.findIndex((s) => s.id === input.schedule_id)

  if (schedIdx === -1) {
    return { success: false, error: "Créneau de réception introuvable." }
  }

  const sched = schedules[schedIdx]
  const appointments = getAppointmentsSync()

  // Vérifier si le centre a déjà un rendez-vous actif sur ce même créneau
  const alreadyBooked = appointments.some(
    (a) =>
      a.schedule_id === sched.id &&
      a.center_code === input.center.center_code &&
      a.status !== "Annulé"
  )
  if (alreadyBooked) {
    return {
      success: false,
      error: `Votre centre (${input.center.center_code}) a déjà réservé une place pour cette journée du ${sched.date}.`
    }
  }

  // Vérifier la capacité
  if (sched.booked_count >= sched.max_capacity || sched.status === "Complet") {
    return {
      success: false,
      error: "Cette journée de réception est désormais complète. Veuillez choisir une autre date."
    }
  }

  // 1. Créer le rendez-vous
  const appNumber = generateNextAppointmentNumber(appointments)
  const newAppointment: Appointment = {
    id: `rdv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    appointment_number: appNumber,
    schedule_id: sched.id,
    date: sched.date,
    time_slot: input.time_slot || sched.start_time,
    center_code: input.center.center_code,
    center_name: input.center.name,
    center_type: input.center.center_type,
    city: input.center.city,
    contact_phone: input.center.phone || "",
    contact_email: input.center.email,
    type: input.type,
    estimated_quantity: input.estimated_quantity,
    depositor_name: input.depositor_name.trim(),
    depositor_id_card: input.depositor_id_card?.trim(),
    observations: input.observations?.trim(),
    status: "Confirmé",
    created_at: new Date().toISOString()
  }

  const updatedAppointments = [newAppointment, ...appointments]
  memoryAppointmentsCache = updatedAppointments

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_APPOINTMENTS_KEY, JSON.stringify(updatedAppointments))
    } catch (e) {}
  }

  // 2. Déduire la place sur la journée de réception
  const newBookedCount = sched.booked_count + 1
  const isNowFull = newBookedCount >= sched.max_capacity
  const updatedSchedule: ReceptionSchedule = {
    ...sched,
    booked_count: newBookedCount,
    status: isNowFull ? "Complet" : "Ouvert"
  }

  await saveReceptionSchedule(updatedSchedule)

  // 3. Sauvegarde Cloud du RDV
  try {
    const supabase = createClient()
    await supabase.from("waste_movements").upsert([
      {
        mvt_number: `APP-${newAppointment.appointment_number}`,
        date: newAppointment.date,
        type: "Rendez-vous",
        batch: newAppointment.appointment_number,
        waste_type: newAppointment.type,
        commercial_name: `Rendez-vous ${newAppointment.center_name} (${newAppointment.center_code})`,
        quantity: newAppointment.estimated_quantity || "Apport prévu",
        operator: newAppointment.depositor_name,
        source_structure: newAppointment.center_name,
        depositor_name: newAppointment.depositor_name,
        destination: sched.location,
        observations: JSON.stringify(newAppointment)
      }
    ], { onConflict: "mvt_number" })
  } catch (e) {}

  broadcastDataMutation({
    entity: "appointments,reception_schedules",
    action: "appointment_book",
    id: newAppointment.id
  })

  return { success: true, appointment: newAppointment }
}

/**
 * Annule un rendez-vous et libère immédiatement la place sur la session
 */
export async function cancelAppointment(appointmentId: string): Promise<boolean> {
  const appointments = getAppointmentsSync()
  const appIdx = appointments.findIndex((a) => a.id === appointmentId)
  if (appIdx === -1) return false

  const app = appointments[appIdx]
  if (app.status === "Annulé") return true

  const updatedApp: Appointment = {
    ...app,
    status: "Annulé"
  }
  const updatedAppointments = [...appointments]
  updatedAppointments[appIdx] = updatedApp
  memoryAppointmentsCache = updatedAppointments

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_APPOINTMENTS_KEY, JSON.stringify(updatedAppointments))
    } catch (e) {}
  }

  // Restaurer la place sur la journée de réception
  const schedules = getReceptionSchedulesSync()
  const schedIdx = schedules.findIndex((s) => s.id === app.schedule_id)
  if (schedIdx !== -1) {
    const sched = schedules[schedIdx]
    const newBookedCount = Math.max(0, sched.booked_count - 1)
    const updatedSched: ReceptionSchedule = {
      ...sched,
      booked_count: newBookedCount,
      status: "Ouvert" // Dès qu'une place se libère, la session redevient ouverte
    }
    await saveReceptionSchedule(updatedSched)
  }

  // Cloud update
  try {
    const supabase = createClient()
    await supabase
      .from("waste_movements")
      .update({ observations: JSON.stringify(updatedApp) })
      .eq("mvt_number", `APP-${app.appointment_number}`)
  } catch (e) {}

  broadcastDataMutation({
    entity: "appointments,reception_schedules",
    action: "appointment_cancel",
    id: appointmentId
  })

  return true
}

/**
 * Met à jour le statut d'un rendez-vous (ex: "Effectué", "Absent")
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: "Confirmé" | "Effectué" | "Annulé" | "Absent",
  agentName?: string
): Promise<boolean> {
  const appointments = getAppointmentsSync()
  const appIdx = appointments.findIndex((a) => a.id === appointmentId)
  if (appIdx === -1) return false

  const app = appointments[appIdx]
  const updatedApp: Appointment = {
    ...app,
    status: newStatus,
    validated_at: newStatus === "Effectué" ? new Date().toISOString() : app.validated_at,
    validated_by: agentName || app.validated_by
  }

  const updatedAppointments = [...appointments]
  updatedAppointments[appIdx] = updatedApp
  memoryAppointmentsCache = updatedAppointments

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_APPOINTMENTS_KEY, JSON.stringify(updatedAppointments))
    } catch (e) {}
  }

  try {
    const supabase = createClient()
    await supabase
      .from("waste_movements")
      .update({ observations: JSON.stringify(updatedApp) })
      .eq("mvt_number", `APP-${app.appointment_number}`)
  } catch (e) {}

  broadcastDataMutation({
    entity: "appointments",
    action: "appointment_status",
    id: appointmentId
  })

  return true
}
