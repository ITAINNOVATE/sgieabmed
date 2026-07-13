import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

import { MotionWrapper } from "@/components/motion-wrapper"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto flex flex-col min-h-screen bg-background/50 relative">
        <header className="flex h-[72px] items-center gap-4 border-b border-border bg-card px-4 sm:px-6 shadow-sm sticky top-0 z-20">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
          <Separator orientation="vertical" className="h-6 opacity-50" />
          
          {/* Breadcrumb / Titre Mobile */}
          <div className="hidden md:flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">eGED-ABMed / Tableau de bord</span>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">
              Une gestion sécurisée des échantillons et des déchets pharmaceutiques
            </h1>
          </div>

          {/* Recherche Globale */}
          <div className="hidden md:block flex-1 max-w-xl mx-auto ml-4 mr-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder="Rechercher un échantillon, DCI, lot, fabricant..."
                className="w-full pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50 shadow-inner h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="hidden lg:flex items-center text-sm font-medium text-muted-foreground mr-2">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <ModeToggle />
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary transition-colors rounded-xl">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-warning border-2 border-card"></span>
            </Button>
            <Separator orientation="vertical" className="h-6 opacity-50" />
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">Dr. Kadia Barry</span>
                <span className="text-xs text-muted-foreground font-medium">Administrateur</span>
              </div>
              <Avatar className="h-9 w-9 border-2 border-primary/20 group-hover:border-primary transition-colors shadow-sm">
                <AvatarImage src="/avatar.png" alt="Profile" />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">KB</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          <MotionWrapper>
            {children}
          </MotionWrapper>
        </div>
        <footer className="border-t border-border bg-card/50 py-6 px-6 text-xs text-muted-foreground flex flex-col md:flex-row gap-4 justify-between items-center text-center md:text-left mt-auto">
          <div>
            <span className="font-semibold text-foreground">eGED-ABMed</span> - Plateforme nationale de gestion des échantillons et des déchets pharmaceutiques
          </div>
          <div>
            &copy; ABMed 2026 | Développé par ITA INNOVATE
          </div>
        </footer>
      </main>
    </SidebarProvider>
  )
}
