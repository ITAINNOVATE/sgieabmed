// src/utils/locations-storage.ts

export interface StorageRoom {
  id: string
  name: string
  description?: string
  created_at?: string
}

export interface StorageZone {
  id: string
  name: string
  room_id: string
  created_at?: string
}

export interface StorageCabinet {
  id: string
  name: string
  zone_id: string
  created_at?: string
}

export interface StorageShelf {
  id: string
  name: string
  cabinet_id: string
  capacity_max?: number | null
  is_full?: boolean
  level?: number
  created_at?: string
  sample_count?: number
}

export const STORAGE_ROOMS_KEY = "local_storage_rooms"
export const STORAGE_ZONES_KEY = "local_storage_zones"
export const STORAGE_CABINETS_KEY = "local_storage_cabinets"
export const STORAGE_SHELVES_KEY = "local_storage_shelves"

export const DEFAULT_ROOMS: StorageRoom[] = [
  { id: "room-magasin-central", name: "Magasin Central", description: "Stockage principal à température ambiante" },
  { id: "room-chambre-froide", name: "Chambre Froide", description: "Stockage réfrigéré (2-8°C)" },
  { id: "room-zone-quarantaine", name: "Zone Quarantaine", description: "Isolement et contrôle qualité" },
]

export const DEFAULT_ZONES: StorageZone[] = [
  { id: "zone-mag-a", name: "Zone A (Réception)", room_id: "room-magasin-central" },
  { id: "zone-mag-b", name: "Zone B (Longue durée)", room_id: "room-magasin-central" },
  { id: "zone-froid-1", name: "Zone Froide 1", room_id: "room-chambre-froide" },
  { id: "zone-quar-1", name: "Zone Contrôle", room_id: "room-zone-quarantaine" },
]

export const DEFAULT_CABINETS: StorageCabinet[] = [
  { id: "cab-mag-a1", name: "Armoire A1", zone_id: "zone-mag-a" },
  { id: "cab-mag-b1", name: "Armoire B1", zone_id: "zone-mag-b" },
  { id: "cab-ref-r1", name: "Réfrigérateur R1", zone_id: "zone-froid-1" },
  { id: "cab-quar-q1", name: "Armoire Quarantaine Q1", zone_id: "zone-quar-1" },
]

export const DEFAULT_SHELVES: StorageShelf[] = [
  { id: "shelf-a1-1", name: "Étagère 1", cabinet_id: "cab-mag-a1", capacity_max: 50, is_full: false },
  { id: "shelf-a1-2", name: "Étagère 2", cabinet_id: "cab-mag-a1", capacity_max: 50, is_full: false },
  { id: "shelf-b1-1", name: "Étagère B1-1", cabinet_id: "cab-mag-b1", capacity_max: 60, is_full: false },
  { id: "shelf-r1-1", name: "Niveau 1", cabinet_id: "cab-ref-r1", capacity_max: 30, is_full: false },
  { id: "shelf-r1-2", name: "Niveau 2", cabinet_id: "cab-ref-r1", capacity_max: 30, is_full: false },
  { id: "shelf-q1-1", name: "Niveau Q1", cabinet_id: "cab-quar-q1", capacity_max: 25, is_full: false },
]

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
}

// ---- ROOMS ----
export function getLocalRooms(): StorageRoom[] {
  if (typeof window === "undefined") return DEFAULT_ROOMS
  try {
    const raw = localStorage.getItem(STORAGE_ROOMS_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_ROOMS_KEY, JSON.stringify(DEFAULT_ROOMS))
      return DEFAULT_ROOMS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEFAULT_ROOMS
  } catch {
    return DEFAULT_ROOMS
  }
}

export function saveLocalRoom(name: string, description?: string): StorageRoom {
  const current = getLocalRooms()
  const newRoom: StorageRoom = {
    id: generateId("room"),
    name: name.trim(),
    description: description?.trim() || undefined,
    created_at: new Date().toISOString()
  }
  const updated = [newRoom, ...current]
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_ROOMS_KEY, JSON.stringify(updated))
  }
  return newRoom
}

export function deleteLocalRoom(roomId: string): void {
  if (typeof window === "undefined") return
  const current = getLocalRooms().filter(r => r.id !== roomId)
  localStorage.setItem(STORAGE_ROOMS_KEY, JSON.stringify(current))

  // Cascading cleanup of zones in this room
  const zonesInRoom = getLocalZones().filter(z => z.room_id === roomId)
  zonesInRoom.forEach(z => deleteLocalZone(z.id))
}

// ---- ZONES ----
export function getLocalZones(): StorageZone[] {
  if (typeof window === "undefined") return DEFAULT_ZONES
  try {
    const raw = localStorage.getItem(STORAGE_ZONES_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_ZONES_KEY, JSON.stringify(DEFAULT_ZONES))
      return DEFAULT_ZONES
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEFAULT_ZONES
  } catch {
    return DEFAULT_ZONES
  }
}

export function saveLocalZone(name: string, roomId: string): StorageZone {
  const current = getLocalZones()
  const newZone: StorageZone = {
    id: generateId("zone"),
    name: name.trim(),
    room_id: roomId,
    created_at: new Date().toISOString()
  }
  const updated = [...current, newZone]
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_ZONES_KEY, JSON.stringify(updated))
  }
  return newZone
}

export function deleteLocalZone(zoneId: string): void {
  if (typeof window === "undefined") return
  const current = getLocalZones().filter(z => z.id !== zoneId)
  localStorage.setItem(STORAGE_ZONES_KEY, JSON.stringify(current))

  // Cascading cleanup of cabinets in this zone
  const cabinetsInZone = getLocalCabinets().filter(c => c.zone_id === zoneId)
  cabinetsInZone.forEach(c => deleteLocalCabinet(c.id))
}

// ---- CABINETS ----
export function getLocalCabinets(): StorageCabinet[] {
  if (typeof window === "undefined") return DEFAULT_CABINETS
  try {
    const raw = localStorage.getItem(STORAGE_CABINETS_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_CABINETS_KEY, JSON.stringify(DEFAULT_CABINETS))
      return DEFAULT_CABINETS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEFAULT_CABINETS
  } catch {
    return DEFAULT_CABINETS
  }
}

export function saveLocalCabinet(name: string, zoneId: string): StorageCabinet {
  const current = getLocalCabinets()
  const newCabinet: StorageCabinet = {
    id: generateId("cab"),
    name: name.trim(),
    zone_id: zoneId,
    created_at: new Date().toISOString()
  }
  const updated = [...current, newCabinet]
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_CABINETS_KEY, JSON.stringify(updated))
  }
  return newCabinet
}

export function deleteLocalCabinet(cabinetId: string): void {
  if (typeof window === "undefined") return
  const current = getLocalCabinets().filter(c => c.id !== cabinetId)
  localStorage.setItem(STORAGE_CABINETS_KEY, JSON.stringify(current))

  // Cascading cleanup of shelves in this cabinet
  const shelvesInCabinet = getLocalShelves().filter(s => s.cabinet_id === cabinetId)
  shelvesInCabinet.forEach(s => deleteLocalShelf(s.id))
}

// ---- SHELVES ----
export function getLocalShelves(): StorageShelf[] {
  if (typeof window === "undefined") return DEFAULT_SHELVES
  try {
    const raw = localStorage.getItem(STORAGE_SHELVES_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_SHELVES_KEY, JSON.stringify(DEFAULT_SHELVES))
      return DEFAULT_SHELVES
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEFAULT_SHELVES
  } catch {
    return DEFAULT_SHELVES
  }
}

export function saveLocalShelf(name: string, cabinetId: string, capacityMax?: number | null): StorageShelf {
  const current = getLocalShelves()
  const newShelf: StorageShelf = {
    id: generateId("shelf"),
    name: name.trim(),
    cabinet_id: cabinetId,
    capacity_max: capacityMax !== undefined && capacityMax !== null ? capacityMax : null,
    is_full: false,
    created_at: new Date().toISOString()
  }
  const updated = [...current, newShelf]
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_SHELVES_KEY, JSON.stringify(updated))
  }
  return newShelf
}

export function updateLocalShelf(shelfId: string, updates: Partial<StorageShelf>): void {
  if (typeof window === "undefined") return
  const current = getLocalShelves()
  const updated = current.map(s => s.id === shelfId ? { ...s, ...updates } : s)
  localStorage.setItem(STORAGE_SHELVES_KEY, JSON.stringify(updated))
}

export function deleteLocalShelf(shelfId: string): void {
  if (typeof window === "undefined") return
  const current = getLocalShelves().filter(s => s.id !== shelfId)
  localStorage.setItem(STORAGE_SHELVES_KEY, JSON.stringify(current))
}
