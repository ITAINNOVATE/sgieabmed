"use client"

import { useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from "@/components/ui/sidebar"
import { 
  Home, Package, ArrowLeftRight, ClipboardCheck, Trash, Flame, 
  Folder, ChartColumn, Bell, LogOut, PackageCheck, Inbox, MapPin, 
  LayoutDashboard, Users, Shield, Key, Building2, History, ShieldCheck, 
  FlaskConical, ChevronRight, ChevronDown, Settings
} from "lucide-react"
import Link from "next/link"
import { logout } from "@/app/actions/auth"

const mainNav = [
  { title: "Tableau de bord", url: "/dashboard", icon: Home },
  { title: "Échantillothèque", url: "/dashboard/samples", icon: Package },
  { title: "Déchets pharmaceutiques", url: "/dashboard/waste", icon: Trash },
  { title: "Mouvements", url: "/dashboard/movements", icon: ArrowLeftRight },
  { title: "Inventaire", url: "/dashboard/inventory", icon: ClipboardCheck, badge: 2 },
  { title: "Localisations", url: "/dashboard/locations", icon: MapPin },
  { title: "Destruction", url: "/dashboard/destructions", icon: Flame },
  { title: "Documents", url: "/dashboard/documents", icon: Folder, badge: 8 },
  { title: "Rapports & Statistiques", url: "/dashboard/reports", icon: ChartColumn },
  { title: "Alertes", url: "/dashboard/alerts", icon: Bell, badge: 8, alert: true },
]

const adminSubNav = [
  { title: "Vue Globale Admin", url: "/dashboard/admin", icon: LayoutDashboard },
  { title: "Utilisateurs & Rôles", url: "/dashboard/admin/users", icon: Users },
  { title: "Services & Directions", url: "/dashboard/admin/services", icon: Building2 },
  { title: "Initialisation Stock", url: "/dashboard/initialization", icon: PackageCheck },
]

export function AppSidebar() {
  const [isAdminOpen, setIsAdminOpen] = useState(false)

  return (
    <Sidebar variant="sidebar" className="border-r border-sidebar-border shadow-sm bg-sidebar text-sidebar-foreground">
      {/* En-tête sur fond BLANC pur */}
      <SidebarHeader className="h-[68px] px-3.5 flex flex-row items-center gap-2.5 bg-white dark:bg-card border-b border-border/80 text-foreground shrink-0">
        <div className="text-[#1B5C2E] p-1 bg-[#1B5C2E]/10 rounded-xl shrink-0">
          <FlaskConical className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center">
            <span className="font-bold text-base leading-none text-[#1B5C2E]">eGED</span>
            <span className="font-bold text-base leading-none text-[#1E3A8A]">-ABMed</span>
          </div>
          <span className="text-[8.5px] text-muted-foreground leading-tight mt-0.5 font-medium truncate">
            Gestion des échantillons & déchets
          </span>
        </div>
      </SidebarHeader>
      
      {/* Contenu avec OVERFLOW-HIDDEN strict : AUCUNE BARRE DE DÉFILEMENT */}
      <SidebarContent className="px-2 py-2 gap-0 overflow-hidden flex-1">
        <SidebarGroup className="p-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.title} 
                    className={`h-8.5 px-2.5 text-xs transition-all rounded-lg ${
                      item.alert 
                        ? 'text-amber-300 hover:text-amber-200 hover:bg-white/10' 
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <Link href={item.url} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5 truncate">
                        <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        <span className="truncate">{item.title}</span>
                      </div>
                      {item.badge ? (
                        <SidebarMenuBadge className={
                          item.alert 
                            ? 'bg-amber-500 text-white rounded-full px-1.5 text-[10px] font-bold h-4 min-w-4 relative right-0' 
                            : 'bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-1.5 text-[10px] h-4 min-w-4 relative right-0'
                        }>
                          {item.badge}
                        </SidebarMenuBadge>
                      ) : (
                        <ChevronRight className="h-3 w-3 text-sidebar-foreground/30 shrink-0" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* ITEM ADMINISTRATION DÉROULANT / COLLAPSIBLE */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setIsAdminOpen(!isAdminOpen)}
                  className="h-8.5 px-2.5 text-xs transition-all rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Settings className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    <span className="truncate font-medium">Administration</span>
                  </div>
                  {isAdminOpen ? (
                    <ChevronDown className="h-3 w-3 text-sidebar-foreground/50 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-sidebar-foreground/30 shrink-0" />
                  )}
                </SidebarMenuButton>

                {isAdminOpen && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-4 pl-2 space-y-0.5">
                    {adminSubNav.map((sub) => (
                      <SidebarMenuSubItem key={sub.title}>
                        <SidebarMenuSubButton asChild className="h-7 text-[11px] hover:bg-sidebar-accent rounded-md">
                          <Link href={sub.url} className="flex items-center gap-2">
                            <sub.icon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{sub.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* PIED DE LA SIDEBAR INSTITUTIONNEL */}
      <SidebarFooter className="p-3 border-t border-sidebar-border/40 space-y-2 shrink-0 bg-sidebar">
        <div className="flex items-center gap-2.5 px-1">
          <div className="bg-white/10 p-1.5 rounded-lg text-white shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-white leading-none">ABMed</span>
            <span className="text-[8.5px] text-white/70 leading-tight mt-0.5 truncate">
              Agence Béninoise du Médicament
            </span>
          </div>
        </div>

        <form action={logout}>
          <SidebarMenuButton 
            type="submit" 
            className="h-8 px-2 text-white/80 hover:text-white hover:bg-destructive/80 transition-colors rounded-lg w-full justify-start text-xs"
          >
            <LogOut className="h-3.5 w-3.5 mr-2 shrink-0" strokeWidth={2} />
            <span>Déconnexion</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
