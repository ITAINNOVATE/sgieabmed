// Utilitaire de stockage haute capacité IndexedDB et optimisation des documents pour eGED
// Permet de stocker des fichiers sans limite de quota de 5 Mo de localStorage, avec compression automatique des images.

const DB_NAME = "eged_documents_db"
const DB_VERSION = 1
const STORE_NAME = "documents_files"

/**
 * Initialise la base IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB non disponible"))
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Sauvegarde le contenu d'un fichier (Data URL / Base64 / Blob) dans IndexedDB
 */
export async function saveDocumentFile(id: string, fileData: string): Promise<void> {
  if (typeof window === "undefined" || !fileData) return
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const req = store.put({ id, fileData, updatedAt: Date.now() })
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn("Erreur sauvegarde IndexedDB pour document", id, err)
  }
}

/**
 * Récupère le contenu d'un fichier depuis IndexedDB
 */
export async function getDocumentFile(id: string): Promise<string | null> {
  if (typeof window === "undefined" || !id) return null
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)
      req.onsuccess = () => {
        resolve(req.result ? req.result.fileData : null)
      }
      req.onerror = () => resolve(null)
    })
  } catch (err) {
    console.warn("Erreur lecture IndexedDB pour document", id, err)
    return null
  }
}

/**
 * Supprime un fichier d'IndexedDB
 */
export async function deleteDocumentFile(id: string): Promise<void> {
  if (typeof window === "undefined" || !id) return
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    })
  } catch (err) {
    console.warn("Erreur suppression IndexedDB pour document", id, err)
  }
}

/**
 * Optimise / compresse automatiquement un fichier (notamment les photos de documents prises au smartphone).
 * Réduit les images de 10-20 Mo à ~250-400 Ko tout en gardant une excellente netteté pour la lecture.
 */
export async function optimizeFileForUpload(file: File): Promise<{
  name: string
  sizeFormatted: string
  rawSize: number
  type: string
  base64: string
  isOptimized: boolean
}> {
  const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name)

  // Si c'est une image, on effectue une compression via canvas
  if (isImage && typeof window !== "undefined") {
    try {
      const optimizedBase64 = await compressImageFile(file, 1920, 1920, 0.82)
      // Calcul de la taille approximative du Base64 compressé
      const approxBytes = Math.round((optimizedBase64.length * 3) / 4)
      const sizeFormatted = approxBytes > 1024 * 1024
        ? `${(approxBytes / (1024 * 1024)).toFixed(1)} Mo`
        : `${Math.round(approxBytes / 1024)} Ko`

      return {
        name: file.name,
        sizeFormatted,
        rawSize: approxBytes,
        type: "image/jpeg",
        base64: optimizedBase64,
        isOptimized: approxBytes < file.size,
      }
    } catch (compressErr) {
      console.warn("Échec compression image, repli sur lecture directe:", compressErr)
    }
  }

  // Pour les PDF ou autres types de fichiers : lecture directe en DataURL
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const sizeFormatted = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} Mo`
        : `${Math.round(file.size / 1024)} Ko`

      resolve({
        name: file.name,
        sizeFormatted,
        rawSize: file.size,
        type: file.type || "application/octet-stream",
        base64,
        isOptimized: false,
      })
    }
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier"))
    reader.readAsDataURL(file)
  })
}

/**
 * Compresse une image vers un Data URL JPEG avec redimensionnement proportionnel
 */
function compressImageFile(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          return resolve(e.target?.result as string)
        }

        // Fond blanc propre pour les documents scannés
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality)
        resolve(compressedDataUrl)
      }
      img.onerror = () => reject(new Error("Impossible de charger l'image pour compression"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"))
    reader.readAsDataURL(file)
  })
}

/**
 * Sauvegarde sécurisée d'une liste de documents dans le localStorage sans dépasser le quota.
 * Si le quota est dépassé, supprime intelligemment les gros payloads base64 (qui sont déjà dans IndexedDB).
 */
export function safeSaveDocsToLocalStorage(key: string, docs: any[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(docs))
  } catch (err: any) {
    console.warn(`Quota localStorage dépassé pour ${key}, nettoyage des payloads lourds...`, err)
    try {
      // Nettoyage des gros data_url / file_data dans le localStorage uniquement
      // Les fichiers complets restent préservés dans IndexedDB
      const lightDocs = docs.map((doc) => {
        const copy = { ...doc }
        if (copy.file_data && copy.file_data.length > 50000) {
          copy.file_data = ""
        }
        if (copy.data_url && copy.data_url.length > 50000) {
          copy.data_url = ""
        }
        return copy
      })
      localStorage.setItem(key, JSON.stringify(lightDocs))
    } catch (err2) {
      console.error(`Impossible de sauvegarder ${key} même allégé:`, err2)
    }
  }
}
