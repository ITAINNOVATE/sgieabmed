"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in duration-300">
      <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-600 mb-4 border border-amber-500/20 shadow-xs">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <h2 className="text-xl font-black text-foreground tracking-tight mb-1.5">
        Chargement de la page interrompu
      </h2>
      <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
        Une difficulté temporaire est survenue lors de l'affichage de ce module. Vous pouvez recharger la vue immédiatement ou retourner au tableau de bord.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button 
          onClick={() => reset()} 
          className="bg-[#1B5C2E] hover:bg-[#154824] text-white text-xs font-bold gap-2 h-9 px-4 rounded-xl shadow-xs cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Recharger cette vue
        </Button>
        <Button 
          variant="outline" 
          asChild 
          className="text-xs font-semibold gap-2 h-9 px-4 rounded-xl cursor-pointer"
        >
          <Link href="/dashboard">
            <Home className="h-3.5 w-3.5" /> Retour à l'accueil
          </Link>
        </Button>
      </div>
    </div>
  )
}
