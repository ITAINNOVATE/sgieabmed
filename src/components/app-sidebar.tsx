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
import { Home, Box, ArrowRightLeft, ClipboardList, MapPin, FileText, BarChart3, Users, Settings, ScrollText, LogOut, PackageCheck, BellRing, Inbox } from "lucide-react"
import Link from "next/link"

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Alertes", url: "/dashboard/alerts", icon: BellRing, badge: 5, alert: true },
  { title: "Réceptions", url: "/dashboard/receptions", icon: Inbox },
  { title: "Échantillons", url: "/dashboard/samples", icon: Box },
  { title: "Mouvements", url: "/dashboard/movements", icon: ArrowRightLeft },
  { title: "Inventaires", url: "/dashboard/inventory", icon: ClipboardList, badge: 2 },
  { title: "Localisations", url: "/dashboard/locations", icon: MapPin },
  { title: "Documentation", url: "/dashboard/documents", icon: FileText, badge: 8 },
]

const adminNav = [
  { title: "Rapports & Statistiques", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Utilisateurs", url: "/dashboard/users", icon: Users },
  { title: "Paramètres", url: "/dashboard/settings", icon: Settings },
  { title: "Journal d'audit", url: "/dashboard/audit", icon: ScrollText },
]

export function AppSidebar() {
  return (
    <Sidebar variant="inset" className="border-r border-border shadow-sm bg-card">
      <SidebarHeader className="p-4 flex flex-row items-center gap-3 border-b border-border/50">
        <div className="bg-primary p-1.5 rounded-lg text-primary-foreground shadow-sm">
          <PackageCheck className="h-6 w-6" strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight text-foreground tracking-tight">SGIE</span>
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest">ABMed</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 pt-4">
        {/* Navigation Principale */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Opérations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.title} 
                    className={`h-10 transition-all rounded-md ${item.alert ? 'text-warning hover:text-warning hover:bg-warning/10' : 'hover:bg-primary/5 hover:text-primary'}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge className={item.alert ? 'bg-warning text-warning-foreground rounded-full px-2' : 'bg-primary/10 text-primary rounded-full px-2'}>
                      {item.badge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Administration */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-10 transition-all hover:bg-primary/5 hover:text-primary rounded-md">
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-md">
              <Link href="/">
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
