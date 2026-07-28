import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar"
import { Home, Package, ArrowLeftRight, ClipboardCheck, Trash, Flame, Folder, ChartColumn, Bell, LogOut, PackageCheck, Inbox, MapPin, LayoutDashboard, Users, Shield, Key, Building2, History, ShieldCheck, FlaskConical, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { logout } from "@/app/actions/auth"

const operationsNav = [
  { title: "Tableau de bord", url: "/dashboard", icon: Home },
  { title: "Réceptions", url: "/dashboard/receptions", icon: Inbox },
  { title: "Échantillothèque", url: "/dashboard/samples", icon: Package },
  { title: "Mouvements", url: "/dashboard/movements", icon: ArrowLeftRight },
]

const stockNav = [
  { title: "Inventaire", url: "/dashboard/inventory", icon: ClipboardCheck, badge: 2 },
  { title: "Localisations", url: "/dashboard/locations", icon: MapPin },
  { title: "Documents", url: "/dashboard/documents", icon: Folder, badge: 8 },
]

const wasteNav = [
  { title: "Déchets pharmaceutiques", url: "/dashboard/waste", icon: Trash },
  { title: "Gestion des destructions", url: "/dashboard/destructions", icon: Flame },
]

const pilotageNav = [
  { title: "Rapports & Statistiques", url: "/dashboard/reports", icon: ChartColumn },
  { title: "Alertes", url: "/dashboard/alerts", icon: Bell, badge: 8, alert: true },
]

const adminNav = [
  { title: "Tableau de bord Admin", url: "/dashboard/admin", icon: LayoutDashboard },
  { title: "Utilisateurs", url: "/dashboard/admin/users", icon: Users },
  { title: "Rôles", url: "/dashboard/admin/roles", icon: Shield },
  { title: "Permissions", url: "/dashboard/admin/permissions", icon: Key },
  { title: "Services / Directions", url: "/dashboard/admin/services", icon: Building2 },
  { title: "Journaux d'audit", url: "/dashboard/admin/audit", icon: History },
  { title: "Paramètres de sécurité", url: "/dashboard/admin/security", icon: ShieldCheck },
  { title: "Initialisation du stock", url: "/dashboard/initialization", icon: PackageCheck },
]

export function AppSidebar() {
  return (
    <Sidebar variant="sidebar" className="border-r border-sidebar-border shadow-sm bg-sidebar text-sidebar-foreground">
      {/* En-tête sur fond BLANC pur pour afficher le logo eGED-ABMed comme sur la maquette */}
      <SidebarHeader className="h-[72px] px-4 flex flex-row items-center gap-3 bg-white dark:bg-card border-b border-border/80 text-foreground">
        <div className="text-[#1B5C2E] p-1 bg-[#1B5C2E]/10 rounded-xl">
          <FlaskConical className="h-7 w-7" strokeWidth={2.2} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className="font-bold text-lg leading-none text-[#1B5C2E]">eGED</span>
            <span className="font-bold text-lg leading-none text-[#1E3A8A]">-ABMed</span>
          </div>
          <span className="text-[9px] text-muted-foreground leading-tight mt-0.5 font-medium">
            Gestion électronique des échantillons<br />et des déchets pharmaceutiques
          </span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-3 pt-4">
        
        {/* OPÉRATIONS */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 mb-2 px-2 uppercase tracking-wider">Opérations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {operationsNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-10 transition-all duration-150 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" strokeWidth={2} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="my-2 border-t border-sidebar-border/30 mx-4" />

        {/* GESTION DES STOCKS */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 mb-2 px-2 uppercase tracking-wider">Gestion des stocks</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {stockNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-10 transition-all duration-150 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" strokeWidth={2} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge className="bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-2">{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="my-2 border-t border-sidebar-border/30 mx-4" />

        {/* DÉCHETS PHARMACEUTIQUES */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 mb-2 px-2 uppercase tracking-wider">Déchets pharmaceutiques</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {wasteNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-10 transition-all duration-150 rounded-xl text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" strokeWidth={2} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="my-2 border-t border-sidebar-border/30 mx-4" />

        {/* PILOTAGE */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 mb-2 px-2 uppercase tracking-wider">Pilotage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {pilotageNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className={`h-10 transition-all duration-150 rounded-xl ${item.alert ? 'text-warning hover:text-warning hover:bg-warning/10' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" strokeWidth={2} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge className={item.alert ? 'bg-amber-500 text-white rounded-full px-2 font-bold' : 'bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-2'}>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="my-2 border-t border-sidebar-border/30 mx-4" />

        {/* ADMINISTRATION */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 mb-2 px-2 uppercase tracking-wider">Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-10 transition-all duration-150 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl">
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" strokeWidth={2} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* PIED DE LA SIDEBAR : Logo institutionnel ABMed + Bouton Déconnexion */}
      <SidebarFooter className="p-4 border-t border-sidebar-border/50 space-y-3">
        <div className="flex items-center gap-3 px-1 pt-1">
          <div className="bg-white/10 p-2 rounded-xl text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-white leading-none">ABMed</span>
            <span className="text-[9px] text-white/70 leading-tight mt-0.5">
              Agence Béninoise du Médicament<br />et des autres produits de santé
            </span>
          </div>
        </div>

        <form action={logout}>
          <SidebarMenuButton type="submit" className="h-9 text-white/80 hover:text-white hover:bg-destructive/80 transition-colors duration-150 rounded-xl w-full justify-start text-xs">
            <LogOut className="h-3.5 w-3.5 mr-2" strokeWidth={2} />
            <span>Déconnexion</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
