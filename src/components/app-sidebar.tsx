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

  // Ouverture exclusive (Accordéon) de la section parente selon l'URL active
  useEffect(() => {
    if (pathname.includes('/analytics')) {
      setOpenSections({ dashboards: true, samples: false, waste: false, reports: false, alerts: false, admin: false })
    } else if (pathname.includes('/destructions') || pathname.includes('/waste')) {
      setOpenSections({ dashboards: false, samples: false, waste: true, reports: false, alerts: false, admin: false })
    } else if (pathname.includes('/receptions') || pathname.includes('/movements') || pathname.includes('/inventory') || pathname.includes('/samples') || pathname.includes('/documents')) {
      setOpenSections({ dashboards: false, samples: true, waste: false, reports: false, alerts: false, admin: false })
    } else if (pathname.includes('/reports')) {
      setOpenSections({ dashboards: false, samples: false, waste: false, reports: true, alerts: false, admin: false })
    } else if (pathname.includes('/alerts')) {
      setOpenSections({ dashboards: false, samples: false, waste: false, reports: false, alerts: true, admin: false })
    } else if (pathname.includes('/admin') || pathname.includes('/initialization')) {
      setOpenSections({ dashboards: false, samples: false, waste: false, reports: false, alerts: false, admin: true })
    } else {
      setOpenSections({ dashboards: false, samples: false, waste: false, reports: false, alerts: false, admin: false })
    }
  }, [pathname])

  // Clic manuel : Mode Accordéon (referme automatiquement toutes les autres sections)
  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      dashboards: section === 'dashboards' ? !prev.dashboards : false,
      samples: section === 'samples' ? !prev.samples : false,
      waste: section === 'waste' ? !prev.waste : false,
      reports: section === 'reports' ? !prev.reports : false,
      alerts: section === 'alerts' ? !prev.alerts : false,
      admin: section === 'admin' ? !prev.admin : false,
    }))
  }

  const isActive = (path: string) => pathname === path

  return (
    <Sidebar variant="sidebar" className="border-r border-sidebar-border shadow-sm bg-sidebar text-sidebar-foreground">
      {/* En-tête sur fond BLANC pur (Jour & Nuit) avec Logo Officiel eGED aux Couleurs Originales */}
      <SidebarHeader className="h-[72px] px-3.5 flex items-center justify-center bg-white border-b border-border/40 shrink-0 transition-colors">
        <Link href="/dashboard" className="flex items-center justify-center w-full h-full py-1">
          <Image 
            src="/logoeGED.png" 
            alt="eGED - Gestion des échantillons et déchets pharmaceutiques" 
            width={240} 
            height={90} 
            className="h-[52px] w-auto max-w-full object-contain object-center transition-all mx-auto"
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
                  className={`h-9 px-2.5 text-xs font-bold rounded-lg transition-all ${
                    isActive('/dashboard') 
                      ? "bg-white/20 text-white font-extrabold shadow-xs" 
                      : "text-white hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <Link href="/dashboard" className="flex items-center gap-2.5 w-full">
                    <Home className="h-4.5 w-4.5 shrink-0 text-white" strokeWidth={2.2} />
                    <span className="font-bold text-white tracking-wide">Accueil</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 2. TABLEAUX DE BORD */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('dashboards')}
                  className={`h-9 px-2.5 text-xs font-bold rounded-lg w-full justify-between cursor-pointer transition-all ${
                    pathname.includes('/analytics')
                      ? "bg-white/20 text-white font-extrabold shadow-xs"
                      : "text-white hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <LayoutDashboard className="h-4.5 w-4.5 shrink-0 text-white" strokeWidth={2.2} />
                    <span className="font-bold text-white tracking-wide truncate">Tableaux de Bord</span>
                  </div>
                  {openSections.dashboards ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-white" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/80" />
                  )}
                </SidebarMenuButton>
                {openSections.dashboards && (
                  <SidebarMenuSub className="my-1 border-l border-white/30 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/analytics" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/analytics')
                            ? "bg-white text-[#1B5C2E] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <Package className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Échantillons pharmaceutiques</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/waste/analytics" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/waste/analytics')
                            ? "bg-white text-red-600 font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0 text-current" />
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
                  className={`h-9 px-2.5 text-xs font-bold rounded-lg w-full justify-between cursor-pointer transition-all ${
                    (pathname.includes('/receptions') || pathname.includes('/movements') || pathname.includes('/inventory') || pathname.includes('/samples') || pathname.includes('/documents')) && !pathname.includes('/waste')
                      ? "bg-white/20 text-white font-extrabold shadow-xs"
                      : "text-white hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Package className="h-4.5 w-4.5 shrink-0 text-white" strokeWidth={2.2} />
                    <span className="font-bold text-white tracking-wide truncate">Gestion des échantillons</span>
                  </div>
                  {openSections.samples ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-white" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/80" />
                  )}
                </SidebarMenuButton>
                {openSections.samples && (
                  <SidebarMenuSub className="my-1 border-l border-white/30 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/receptions" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/receptions')
                            ? "bg-white text-[#1B5C2E] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <Inbox className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Réceptions</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/movements" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/movements')
                            ? "bg-white text-[#1B5C2E] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Mouvements & Cartographie</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/inventory" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/inventory')
                            ? "bg-white text-[#1B5C2E] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Inventaires & Contrôles</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/samples" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/samples')
                            ? "bg-white text-[#1B5C2E] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Stocks & Armoires</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/documents" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/documents')
                            ? "bg-white text-[#1B5C2E] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <Folder className="h-3.5 w-3.5 shrink-0 text-current" />
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
                  className={`h-9 px-2.5 text-xs font-bold rounded-lg w-full justify-between cursor-pointer transition-all ${
                    ((pathname.includes('/waste') || pathname.includes('/destructions')) && pathname !== '/dashboard/waste/analytics')
                      ? "bg-white/20 text-white font-extrabold shadow-xs"
                      : "text-white hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Trash2 className="h-4.5 w-4.5 shrink-0 text-white" strokeWidth={2.2} />
                    <span className="font-bold text-white tracking-wide truncate">Gestion des déchets</span>
                  </div>
                  {openSections.waste ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-white" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/80" />
                  )}
                </SidebarMenuButton>
                {openSections.waste && (
                  <SidebarMenuSub className="my-1 border-l border-white/30 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/waste/new" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/waste/new')
                            ? "bg-white text-red-600 font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <Inbox className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Réception</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/waste/movements" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/waste/movements')
                            ? "bg-white text-red-600 font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Mouvements</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/waste/inventory" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/waste/inventory')
                            ? "bg-white text-red-600 font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Inventaire</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/waste" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/waste')
                            ? "bg-white text-red-600 font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Stocks</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/destructions" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/destructions')
                            ? "bg-white text-red-600 font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <Flame className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Destruction</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/documents" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/documents')
                            ? "bg-white text-red-600 font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <Folder className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Documentation</span>
                      </Link>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* 5. RAPPORTS ET STATISTIQUES */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => toggleSection('reports')}
                  className={`h-9 px-2.5 text-xs font-bold rounded-lg w-full justify-between cursor-pointer transition-all ${
                    pathname.includes('/reports')
                      ? "bg-white/20 text-white font-extrabold shadow-xs"
                      : "text-white hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ChartColumn className="h-4.5 w-4.5 shrink-0 text-white" strokeWidth={2.2} />
                    <span className="font-bold text-white tracking-wide truncate">Rapports & Statistiques</span>
                  </div>
                  {openSections.reports ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-white" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/80" />
                  )}
                </SidebarMenuButton>
                {openSections.reports && (
                  <SidebarMenuSub className="my-1 border-l border-white/30 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/reports" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/reports')
                            ? "bg-white text-[#003B5C] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <BarChart3 className="h-3.5 w-3.5 shrink-0 text-current" />
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
                  className={`h-9 px-2.5 text-xs font-bold rounded-lg w-full justify-between cursor-pointer transition-all ${
                    pathname.includes('/alerts')
                      ? "bg-white/20 text-white font-extrabold shadow-xs"
                      : "text-white hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Bell className="h-4.5 w-4.5 shrink-0 text-white" strokeWidth={2.2} />
                    <span className="font-bold text-white tracking-wide truncate">Alertes & Notifications</span>
                  </div>
                  {openSections.alerts ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-white" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/80" />
                  )}
                </SidebarMenuButton>
                {openSections.alerts && (
                  <SidebarMenuSub className="my-1 border-l border-white/30 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/alerts" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/alerts')
                            ? "bg-white text-amber-700 font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-current" />
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
                  className={`h-9 px-2.5 text-xs font-bold rounded-lg w-full justify-between cursor-pointer transition-all ${
                    (pathname.includes('/admin') || pathname.includes('/initialization'))
                      ? "bg-white/20 text-white font-extrabold shadow-xs"
                      : "text-white hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Settings className="h-4.5 w-4.5 shrink-0 text-white" strokeWidth={2.2} />
                    <span className="font-bold text-white tracking-wide truncate">Administration</span>
                  </div>
                  {openSections.admin ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-white" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/80" />
                  )}
                </SidebarMenuButton>
                {openSections.admin && (
                  <SidebarMenuSub className="my-1 border-l border-white/30 ml-3.5 pl-2 space-y-0.5">
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/admin" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/admin')
                            ? "bg-white text-[#0B5ED7] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Vue Globale Admin</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/admin/users" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/admin/users')
                            ? "bg-white text-[#0B5ED7] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <Users className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Utilisateurs & Rôles</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/admin/services" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/admin/services')
                            ? "bg-white text-[#0B5ED7] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Services & Directions</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/admin/audit" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/admin/audit')
                            ? "bg-white text-[#0B5ED7] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <History className="h-3.5 w-3.5 shrink-0 text-current" />
                        <span className="truncate">Journaux d'audit</span>
                      </Link>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <Link 
                        href="/dashboard/initialization" 
                        className={`flex items-center gap-2 h-7.5 px-2 text-xs rounded-md transition-colors w-full ${
                          isActive('/dashboard/initialization')
                            ? "bg-white text-[#0B5ED7] font-bold shadow-xs"
                            : "text-white/90 hover:text-white hover:bg-white/15 font-semibold"
                        }`}
                      >
                        <PackageCheck className="h-3.5 w-3.5 shrink-0 text-current" />
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

      {/* PIED DE LA SIDEBAR INSTITUTIONNEL SUR FOND BLANC PUR (JOUR & NUIT) */}
      <SidebarFooter className="p-3 border-t border-border/60 space-y-2 shrink-0 bg-white transition-colors">
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
            <span className="font-extrabold text-xs text-[#1B5C2E] leading-none">ABMed</span>
            <span className="text-[8.5px] text-muted-foreground leading-tight mt-0.5 font-medium">
              Agence béninoise du Médicament et des autres produits de Santé
            </span>
          </div>
        </div>

        <form action={logout}>
          <SidebarMenuButton 
            type="submit" 
            className="h-9 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg w-full justify-start text-xs cursor-pointer shadow-xs transition-colors border-0"
          >
            <LogOut className="h-4 w-4 mr-2 shrink-0 text-white" strokeWidth={2.2} />
            <span className="font-bold text-white">Déconnexion</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
    </Sidebar>
  )
}
