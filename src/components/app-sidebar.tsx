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
import { Home, Box, ArrowRightLeft, ClipboardList, MapPin, FileText, BarChart3, Users, Settings, ScrollText, LogOut, PackageCheck, BellRing, Inbox, Trash2, Flame } from "lucide-react"
import Link from "next/link"
import { logout } from "@/app/actions/auth"

const operationsNav = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Réceptions", url: "/dashboard/receptions", icon: Inbox },
  { title: "Échantillons", url: "/dashboard/samples", icon: Box },
  { title: "Mouvements", url: "/dashboard/movements", icon: ArrowRightLeft },
]

const stockNav = [
  { title: "Inventaires", url: "/dashboard/inventory", icon: ClipboardList, badge: 2 },
  { title: "Localisations", url: "/dashboard/locations", icon: MapPin },
]

const wasteNav = [
  { title: "Déchets pharmaceutiques", url: "/dashboard/waste", icon: Trash2 },
  { title: "Destructions", url: "/dashboard/destructions", icon: Flame },
]

const analysisNav = [
  { title: "Rapports & Statistiques", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Alertes", url: "/dashboard/alerts", icon: BellRing, badge: 5, alert: true },
]

const adminNav = [
  { title: "Utilisateurs", url: "/dashboard/users", icon: Users },
  { title: "Paramètres", url: "/dashboard/settings", icon: Settings },
  { title: "Journal d'audit", url: "/dashboard/audit", icon: ScrollText },
]

export function AppSidebar() {
  return (
    <Sidebar variant="inset" className="border-r border-sidebar-border shadow-sm bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="p-4 flex flex-row items-center gap-3 border-b border-sidebar-border/50">
        <div className="bg-sidebar-accent p-1.5 rounded-xl text-sidebar-accent-foreground shadow-sm">
          <PackageCheck className="h-6 w-6" strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight text-sidebar-foreground tracking-tight">eGED</span>
          <span className="text-[10px] uppercase font-semibold text-sidebar-foreground/70 tracking-widest">ABMed</span>
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

        {/* STOCK */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 mb-2 px-2 uppercase tracking-wider">Stock</SidebarGroupLabel>
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

        {/* DÉCHETS */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 mb-2 px-2 uppercase tracking-wider">Déchets</SidebarGroupLabel>
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

        {/* ANALYSE */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 mb-2 px-2 uppercase tracking-wider">Analyse</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {analysisNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className={`h-10 transition-all duration-150 rounded-xl ${item.alert ? 'text-warning hover:text-warning hover:bg-warning/10' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" strokeWidth={2} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge className={item.alert ? 'bg-warning text-warning-foreground rounded-full px-2' : 'bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-2'}>{item.badge}</SidebarMenuBadge>
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

      <SidebarFooter className="p-4 border-t border-sidebar-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logout}>
              <SidebarMenuButton type="submit" className="h-10 text-sidebar-foreground/80 hover:text-white hover:bg-destructive/80 transition-colors duration-150 rounded-xl w-full justify-start">
                <LogOut className="h-4 w-4" strokeWidth={2} />
                <span>Déconnexion</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
