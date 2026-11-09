"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getCurrentUser } from "@/app/dashboard/admin/adminMockData"
import { toast } from "sonner"

// Routes autorisées pour les Centres Apporteurs (Espace restreint)
const ALLOWED_CENTER_ROUTES = [
  "/dashboard",
  "/dashboard/appointments",
  "/dashboard/center-documents",
  "/dashboard/profile",
]

export function CenterAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    const user = getCurrentUser()
    const isCenter = 
      user?.role === "Centre Apporteur" || 
      user?.matricule?.startsWith("CTR-") || 
      user?.username?.startsWith("CTR-")

    if (isCenter && pathname) {
      // Vérifier si la route courante est autorisée
      const isAllowed = ALLOWED_CENTER_ROUTES.some(
        (allowed) => pathname === allowed || pathname.startsWith(allowed + "/")
      )

      if (!isAllowed) {
        setIsBlocked(true)
        toast.error("Accès non autorisé", {
          description: "Votre compte Établissement Apporteur est dédié exclusivement à la prise de rendez-vous et à la consultation de vos documents. Les modules internes de gestion sont réservés aux agents ABMeD.",
          duration: 5000,
        })
        router.replace("/dashboard/appointments")
        return
      }
    }
    setIsBlocked(false)
  }, [pathname, router])

  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xl">
          !
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Redirection vers votre Espace Rendez-vous...</h2>
          <p className="text-xs text-muted-foreground">
            Les modules internes sont réservés aux agents administratifs et techniques de l'ABMeD.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
