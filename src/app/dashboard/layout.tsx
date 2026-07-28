import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { HeaderActions } from "@/components/header-actions"

import { MotionWrapper } from "@/components/motion-wrapper"
import { ShieldCheck } from "lucide-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto flex flex-col min-h-screen bg-background relative">
        {/* EN-TÊTE FIXE ET ÉPURÉ (Fond blanc pur comme sur la maquette) */}
        <header className="flex h-[72px] items-center justify-between gap-4 border-b border-border bg-white dark:bg-card px-4 sm:px-6 shadow-xs sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            <Separator orientation="vertical" className="h-6 opacity-40 hidden sm:block" />
          </div>

          {/* Titre central institutionnel avec icône Bouclier (identique à la maquette) */}
          <div className="hidden lg:flex flex-col items-center justify-center text-center">
            <span className="text-sm font-semibold text-[#1B5C2E] tracking-tight">
              Une gestion sécurisée des échantillons et des déchets pharmaceutiques
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-[1px] w-12 bg-border"></span>
              <ShieldCheck className="h-4 w-4 text-[#1B5C2E]" />
              <span className="h-[1px] w-12 bg-border"></span>
            </div>
          </div>

          <HeaderActions />
        </header>

        {/* CONTENU PRINCIPAL DE LA PAGE */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          <MotionWrapper>
            {children}
          </MotionWrapper>
        </div>

        {/* PIED DE PAGE */}
        <footer className="border-t border-border bg-white dark:bg-card/50 py-3 px-4 sm:px-6 text-[11px] text-muted-foreground text-center flex items-center justify-center mt-auto">
          <span>
            eGED Ph - Gestion électronique des échantillons et des déchets pharmaceutiques - ABMed © 2025 - Tous droits réservés
          </span>
        </footer>
      </main>
    </SidebarProvider>
  )
}
