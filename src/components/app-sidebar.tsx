"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
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
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { 
  Home, LayoutDashboard, Package, Trash2, ChartColumn, Bell,
  Settings, Inbox, ArrowLeftRight, ClipboardCheck, Folder, 
  Flame, MapPin, Building2, LogOut, ChevronRight, ChevronDown,
  Users, History, PackageCheck, AlertCircle, BarChart3, Shield
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { logout } from "@/app/actions/auth"

export function AppSidebar() {
  const pathname = usePathname()

  // State pour suivre les menus déroulants ouverts
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dashboards: false,
    samples: false,
    waste: false,
    reports: false,
    alerts: false,
    admin: false,
  })

  // Ouverture automatique de la section parente selon l'URL active
  useEffect(() => {
    if (pathname.includes('/analytics')) {
      setOpenSections(prev => ({ ...prev, dashboards: true }))
    } else if (pathname.includes('/receptions') || pathname.includes('/movements') || pathname.includes('/inventory') || pathname.includes('/samples') || pathname.includes('/documents')) {
      setOpenSections(prev => ({ ...prev, samples: true }))
    } else if (pathname.includes('/destructions') || pathname.includes('/waste')) {
      setOpenSections(prev => ({ ...prev, waste: true }))
    } else if (pathname.includes('/reports')) {
      setOpenSections(prev => ({ ...prev, reports: true }))
    } else if (pathname.includes('/alerts')) {
      setOpenSections(prev => ({ ...prev, alerts: true }))
    } else if (pathname.includes('/admin') || pathname.includes('/initialization')) {
      setOpenSections(prev => ({ ...prev, admin: true }))
    }
  }, [pathname])

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const isActive = (path: string) => pathname === path

  return (
    <Sidebar variant="sidebar" className="border-r border-sidebar-border shadow-sm bg-sidebar text-sidebar-foreground">
      {/* En-tête sur fond BLANC pur avec Logo Officiel eGED aux Couleurs Originales */}
      <SidebarHeader className="h-[72px] px-3.5 flex items-center justify-center bg-white dark:bg-[#003B5C] border-b border-border/40 shrink-0 transition-colors">
        <Link href="/dashboard" className="flex items-center justify-center w-full h-full py-1">
          <Image 
            src="/logoeGED.png" 
            alt="eGED - Gestion des échantillons et déchets pharmaceutiques" 
            width={240} 
            height={90} 
            className="h-[52px] w-auto max-w-full object-contain object-center dark:brightness-0 dark:invert transition-all mx-auto"
            priority 
          />
        </Link>
      </SidebarHeader>
      
      {/* Contenu principal de la navigation avec défilement fluide */}
      <SidebarContent className="px-2 py-2 gap-0 overflow-y-auto flex-1">
        <SidebarGroup className="p-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              
              {/* 1. ACCUEIL */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={`h-9 px-2.5 text-xs rounded-lg transition-colors ${
                    isActive('/dashboard') 
                      ? "bg-[#1B5C2E] text-white font-bold hover:bg-[#154824]" 
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Link href="/dashboard" className="flex items-center gap-2.5 w-full">
                    <Home className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Page d'Accueil</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 2. TABLEAUX DE BORD */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('dashboards')}
                  className={`h-9 px-2.5 text-xs rounded-lg w-full justify-between cursor-pointer transition-colors ${
                    pathname.includes('/analytics') || pathname === '/dashboard/waste'
                      ? "bg-emerald-500/10 text-[#1B5C2E] dark:text-emerald-400 font-bold"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    <span className="font-medium truncate">Tableaux de Bord</span>
                  </div>
                  {openSections.dashboards ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  )}
                </SidebarMenuButton>
                {openSections.dashboards && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/analytics" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/analytics')
                            ? "bg-[#1B5C2E] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <Package className="h-3 w-3 shrink-0" />
                        <span className="truncate">Échantillons pharmaceutiques</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/waste" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/waste')
                            ? "bg-red-600 text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <Trash2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">Déchets pharmaceutiques</span>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* 3. GESTION DES ÉCHANTILLONS PHARMACEUTIQUES */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('samples')}
                  className={`h-9 px-2.5 text-xs rounded-lg w-full justify-between cursor-pointer transition-colors ${
                    (pathname.includes('/receptions') || pathname.includes('/movements') || pathname.includes('/inventory') || pathname.includes('/samples') || pathname.includes('/documents')) && !pathname.includes('/waste')
                      ? "bg-emerald-500/10 text-[#1B5C2E] dark:text-emerald-400 font-bold"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Package className="h-4 w-4 shrink-0 text-[#1B5C2E] dark:text-emerald-400" />
                    <span className="font-medium truncate">Gestion des échantillons</span>
                  </div>
                  {openSections.samples ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  )}
                </SidebarMenuButton>
                {openSections.samples && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/receptions" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/receptions')
                            ? "bg-[#1B5C2E] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <Inbox className="h-3 w-3 shrink-0" />
                        <span className="truncate">Réceptions</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/movements" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/movements')
                            ? "bg-[#1B5C2E] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <ArrowLeftRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">Mouvements & Cartographie</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/inventory" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/inventory')
                            ? "bg-[#1B5C2E] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <ClipboardCheck className="h-3 w-3 shrink-0" />
                        <span className="truncate">Inventaires & Contrôles</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/samples" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/samples')
                            ? "bg-[#1B5C2E] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">Stocks & Armoires</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/documents" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/documents')
                            ? "bg-[#1B5C2E] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <Folder className="h-3 w-3 shrink-0" />
                        <span className="truncate">Documentation & Certificats</span>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* 4. GESTION DES DÉCHETS PHARMACEUTIQUES */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('waste')}
                  className={`h-9 px-2.5 text-xs rounded-lg w-full justify-between cursor-pointer transition-colors ${
                    (pathname.includes('/waste') || pathname.includes('/destructions'))
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 font-bold"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Trash2 className="h-4 w-4 shrink-0 text-red-600" />
                    <span className="font-medium truncate">Gestion des déchets</span>
                  </div>
                  {openSections.waste ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  )}
                </SidebarMenuButton>
                {openSections.waste && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/waste/new" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/waste/new')
                            ? "bg-red-600 text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <Inbox className="h-3 w-3 shrink-0" />
                        <span className="truncate">Réception Déchets</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/waste" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/waste')
                            ? "bg-red-600 text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <Trash2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">Registre des Stocks</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/destructions" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/destructions')
                            ? "bg-red-600 text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <Flame className="h-3 w-3 shrink-0" />
                        <span className="truncate">Plan de Destruction</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/documents" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/documents')
                            ? "bg-red-600 text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <Folder className="h-3 w-3 shrink-0" />
                        <span className="truncate">Bordereaux Suivi Déchets</span>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* 5. RAPPORTS ET STATISTIQUES */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('reports')}
                  className={`h-9 px-2.5 text-xs rounded-lg w-full justify-between cursor-pointer transition-colors ${
                    pathname.includes('/reports')
                      ? "bg-[#003B5C]/10 text-[#003B5C] dark:text-blue-400 font-bold"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ChartColumn className="h-4 w-4 shrink-0 text-[#003B5C] dark:text-blue-400" />
                    <span className="font-medium truncate">Rapports & Statistiques</span>
                  </div>
                  {openSections.reports ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  )}
                </SidebarMenuButton>
                {openSections.reports && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/reports" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/reports')
                            ? "bg-[#003B5C] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <BarChart3 className="h-3 w-3 shrink-0" />
                        <span className="truncate">Générateur de Rapports</span>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* 6. ALERTES */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('alerts')}
                  className={`h-9 px-2.5 text-xs rounded-lg w-full justify-between cursor-pointer transition-colors ${
                    pathname.includes('/alerts')
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Bell className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="font-medium truncate">Alertes & Notifications</span>
                  </div>
                  {openSections.alerts ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  )}
                </SidebarMenuButton>
                {openSections.alerts && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/alerts" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/alerts')
                            ? "bg-amber-600 text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="truncate">Journal des Alertes</span>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* 7. ADMINISTRATION */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('admin')}
                  className={`h-9 px-2.5 text-xs rounded-lg w-full justify-between cursor-pointer transition-colors ${
                    (pathname.includes('/admin') || pathname.includes('/initialization'))
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Settings className="h-4 w-4 shrink-0 text-blue-600" />
                    <span className="font-medium truncate">Administration</span>
                  </div>
                  {openSections.admin ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  )}
                </SidebarMenuButton>
                {openSections.admin && (
                  <SidebarMenuSub className="my-1 border-l border-sidebar-border/40 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/admin" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/admin')
                            ? "bg-[#0B5ED7] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <LayoutDashboard className="h-3 w-3 shrink-0" />
                        <span className="truncate">Vue Globale Admin</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/admin/users" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/admin/users')
                            ? "bg-[#0B5ED7] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <Users className="h-3 w-3 shrink-0" />
                        <span className="truncate">Utilisateurs & Rôles</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/admin/services" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/admin/services')
                            ? "bg-[#0B5ED7] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">Services & Directions</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/admin/audit" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/admin/audit')
                            ? "bg-[#0B5ED7] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <History className="h-3 w-3 shrink-0" />
                        <span className="truncate">Journaux d'audit</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/initialization" 
                        className={`flex items-center gap-2 h-7 px-2 text-[11px] rounded-md transition-colors w-full ${
                          isActive('/dashboard/initialization')
                            ? "bg-[#0B5ED7] text-white font-bold"
                            : "text-sidebar-foreground/80 hover:text-foreground hover:bg-sidebar-accent"
                        }`}
                      >
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

      {/* PIED DE LA SIDEBAR INSTITUTIONNEL SUR FOND BLANC PUR */}
      <SidebarFooter className="p-3 border-t border-border/60 space-y-2 shrink-0 bg-white dark:bg-sidebar transition-colors">
        <div className="flex items-center gap-2.5 px-1">
          <div className="shrink-0 flex items-center justify-center h-8 w-8">
            <Image 
              src="/logoABMeD.png" 
              alt="Logo ABMed" 
              width={32} 
              height={32} 
              className="h-8 w-8 object-contain" 
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-xs text-[#1B5C2E] dark:text-white leading-none">ABMed</span>
            <span className="text-[8.5px] text-muted-foreground dark:text-white/80 leading-tight mt-0.5 font-medium">
              Agence béninoise du Médicament et des autres produits de Santé
            </span>
          </div>
        </div>

        <form action={logout}>
          <SidebarMenuButton 
            type="submit" 
            className="h-8 px-2 text-foreground/80 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 transition-colors rounded-lg w-full justify-start text-xs cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 mr-2 shrink-0 text-red-600 group-hover:text-white" strokeWidth={2} />
            <span className="font-semibold">Déconnexion</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
