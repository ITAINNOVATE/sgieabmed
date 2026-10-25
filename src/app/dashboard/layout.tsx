import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { HeaderActions } from "@/components/header-actions"
import { MotionWrapper } from "@/components/motion-wrapper"
import { ShieldCheck } from "lucide-react"
import { Suspense } from "react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>
      <main className="flex-1 overflow-y-auto flex flex-col min-h-screen bg-background relative">
        {/* EN-TÊTE FIXE BLEU eGED #003B5C (Jour & Nuit) - RESPONSIVE MOBILE */}
        <header className="flex h-[58px] sm:h-[68px] items-center justify-between gap-1.5 sm:gap-4 border-b border-border/40 bg-[#003B5C] text-white px-2.5 sm:px-6 shadow-xs sticky top-0 z-20 transition-colors">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-white hover:text-white/80 transition-colors h-8.5 w-8.5 sm:h-9 sm:w-9 p-1.5 cursor-pointer rounded-lg bg-white/10 hover:bg-white/20 shrink-0" />
            <span className="lg:hidden text-xs font-black text-white tracking-wider flex items-center gap-1">
              eGED
            </span>
          </div>

          {/* Titre central institutionnel avec icône Bouclier (Masqué sur mobile) */}
          <div className="hidden lg:flex flex-col items-center justify-center text-center">
            <span className="text-sm font-bold text-white tracking-tight">
              Une gestion sécurisée des échantillons et des déchets pharmaceutiques
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-[1px] w-12 bg-white/40"></span>
              <ShieldCheck className="h-4 w-4 text-white" />
              <span className="h-[1px] w-12 bg-white/40"></span>
            </div>
          </div>

          <HeaderActions />
        </header>

        {/* CONTENU PRINCIPAL DE LA PAGE */}
        <div className="flex-1 p-2.5 sm:p-5 lg:p-7 max-w-[1600px] mx-auto w-full min-w-0">
          <MotionWrapper>
            {children}
          </MotionWrapper>
        </div>

        {/* PIED DE PAGE */}
        <footer className="border-t border-border bg-white dark:bg-card/50 py-3 px-4 sm:px-6 text-[11px] text-muted-foreground text-center flex items-center justify-center mt-auto">
          <span>
            eGED - Gestion électronique des échantillons et des déchets pharmaceutiques - by SaniNova Consortium
          </span>
        </footer>
      </main>
    </SidebarProvider>
  )
}
