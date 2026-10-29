"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { getCurrentUser, canAccessAdminModule } from "@/app/dashboard/admin/adminMockData"

/**
 * Protège les pages du module Administration.
 * Seuls les comptes listés dans ADMIN_MODULE_ALLOWED_USER_IDS (Admin EGED, Yossounon CHABI, Jocelyne SATCHIVI)
 * peuvent y accéder, même en saisissant directement l'adresse dans le navigateur.
 */
export function AdminAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking")

  useEffect(() => {
    const allowed = canAccessAdminModule(getCurrentUser())
    setStatus(allowed ? "allowed" : "denied")
    if (!allowed) {
      const t = setTimeout(() => router.replace("/dashboard"), 2500)
      return () => clearTimeout(t)
    }
  }, [router])

  if (status === "checking") return null

  if (status === "denied") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 gap-3">
        <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-black text-foreground">Accès refusé</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Le module Administration est réservé aux comptes habilités. Vous allez être redirigé vers le tableau de bord.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
