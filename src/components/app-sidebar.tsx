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
} from "@/components/ui/sidebar"
import { 
  Home, LayoutDashboard, Package, Trash2, ChartColumn, Bell,
  Settings, Inbox, ArrowLeftRight, ClipboardCheck, Folder, 
  Flame, MapPin, Building2, LogOut, FlaskConical, ChevronRight, ChevronDown,
  Users, Shield, Key, History, ShieldCheck, PackageCheck
} from "lucide-react"
import Link from "next/link"
import { logout } from "@/app/actions/auth"

export function AppSidebar() {
  // State pour suivre les menus déroulants ouverts
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dashboards: false,
    samples: true,      // Ouvert par défaut pour accès rapide
    waste: false,
    reports: false,
    alerts: false,
    admin: false,
  })

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

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
      
      {/* Contenu principal de la navigation avec défilement fluide si nécessaire */}
      <SidebarContent className="px-2 py-2 gap-0 overflow-y-auto flex-1">
        <SidebarGroup className="p-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              
              {/* 1. ACCUEIL (Pas de sous-menu) */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-9 px-2.5 text-xs rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <Link href="/dashboard" className="flex items-center gap-2.5 w-full">
                    <Home className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Accueil</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 2. TABLEAUX DE BORD (Avec sous-menus) */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('dashboards')}
                  className="h-9 px-2.5 text-xs rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    <span className="font-medium truncate">Tableaux de Bord</span>
                  </div>
                  {openSections.dashboards ? (
                    <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/60 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
                  )}
                </SidebarMenuButton>
                {openSections.dashboards && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link href="/dashboard" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Package className="h-3 w-3 shrink-0" />
                        <span className="truncate">Échantillon pharmaceutique</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/waste" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Trash2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">Déchets pharmaceutiques</span>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* 3. GESTION DES ÉCHANTILLONS PHARMACEUTIQUES (Avec sous-menus) */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('samples')}
                  className="h-9 px-2.5 text-xs rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Package className="h-4 w-4 shrink-0" />
                    <span className="font-medium truncate">Gestion des échantillons</span>
                  </div>
                  {openSections.samples ? (
                    <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/60 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
                  )}
                </SidebarMenuButton>
                {openSections.samples && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/receptions" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Inbox className="h-3 w-3 shrink-0" />
                        <span className="truncate">Réception</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/movements" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <ArrowLeftRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">Mouvements</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/inventory" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <ClipboardCheck className="h-3 w-3 shrink-0" />
                        <span className="truncate">Inventaire</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/samples" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">Stocks</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/documents" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Folder className="h-3 w-3 shrink-0" />
                        <span className="truncate">Documentation</span>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* 4. GESTION DES DÉCHETS PHARMACEUTIQUES (Avec sous-menus) */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('waste')}
                  className="h-9 px-2.5 text-xs rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <span className="font-medium truncate">Gestion des déchets</span>
                  </div>
                  {openSections.waste ? (
                    <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/60 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
                  )}
                </SidebarMenuButton>
                {openSections.waste && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/waste/new" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Inbox className="h-3 w-3 shrink-0" />
                        <span className="truncate">Réception</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/waste" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <ArrowLeftRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">Mouvements</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/inventory" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <ClipboardCheck className="h-3 w-3 shrink-0" />
                        <span className="truncate">Inventaire</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/waste" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Trash2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">Stocks</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/destructions" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Flame className="h-3 w-3 shrink-0" />
                        <span className="truncate">Destruction</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/documents" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Folder className="h-3 w-3 shrink-0" />
                        <span className="truncate">Documentation</span>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* 5. RAPPORTS ET STATISTIQUES (Avec sous-menus) */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('reports')}
                  className="h-9 px-2.5 text-xs rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ChartColumn className="h-4 w-4 shrink-0" />
                    <span className="font-medium truncate">Rapports & Statistiques</span>
                  </div>
                  {openSections.reports ? (
                    <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/60 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
                  )}
                </SidebarMenuButton>
                {openSections.reports && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/reports" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Package className="h-3 w-3 shrink-0" />
                        <span className="truncate">Échantillothèque</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/reports" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Trash2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">Déchets pharmaceutiques</span>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* 6. ALERTES (Avec sous-menus) */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('alerts')}
                  className="h-9 px-2.5 text-xs rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Bell className="h-4 w-4 shrink-0 text-amber-400" />
                    <span className="font-medium truncate">Alertes</span>
                  </div>
                  {openSections.alerts ? (
                    <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/60 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
                  )}
                </SidebarMenuButton>
                {openSections.alerts && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/alerts" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Package className="h-3 w-3 shrink-0" />
                        <span className="truncate">Échantillothèque</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/alerts" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Trash2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">Déchets pharmaceutiques</span>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* 6. ADMINISTRATION (Avec sous-menus) */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('admin')}
                  className="h-9 px-2.5 text-xs rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Settings className="h-4 w-4 shrink-0" />
                    <span className="font-medium truncate">Administration</span>
                  </div>
                  {openSections.admin ? (
                    <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/60 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
                  )}
                </SidebarMenuButton>
                {openSections.admin && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/admin" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <LayoutDashboard className="h-3 w-3 shrink-0" />
                        <span className="truncate">Vue Globale Admin</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/admin/users" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Users className="h-3 w-3 shrink-0" />
                        <span className="truncate">Utilisateurs & Rôles</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/admin/services" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">Services & Directions</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/admin/audit" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <History className="h-3 w-3 shrink-0" />
                        <span className="truncate">Journaux d'audit</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link href="/dashboard/initialization" className="flex items-center gap-2 h-7 px-2 text-[11px] text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent rounded-md transition-colors w-full">
                        <PackageCheck className="h-3 w-3 shrink-0" />
                        <span className="truncate">Initialisation Stock</span>
                      </Link>
                    </SidebarMenuSubItem>
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
            className="h-8 px-2 text-white/80 hover:text-white hover:bg-destructive/80 transition-colors rounded-lg w-full justify-start text-xs cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 mr-2 shrink-0" strokeWidth={2} />
            <span>Déconnexion</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
