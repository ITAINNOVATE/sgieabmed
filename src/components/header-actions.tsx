"use client"

import { useState } from "react"
import { 
  Bell, Mail, Scan, ChevronDown, CheckCheck, Clock, ShieldAlert, 
  Package, Trash2, FileText, User, Settings, Lock, LogOut, ExternalLink, Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import Link from "next/link"
import dynamic from "next/dynamic"
import { logout } from "@/app/actions/auth"

const QRCodeScannerDialog = dynamic(
  () => import("@/components/qrcode-scanner-dialog").then((mod) => mod.QRCodeScannerDialog),
  { ssr: false }
)

export function HeaderActions() {
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(6)
  const [unreadMsgCount, setUnreadMsgCount] = useState(3)

  const notifications = [
    {
      id: 1,
      type: "alert",
      title: "Alerte Péremption",
      description: "3 lots de Paracétamol expirent dans 15 jours.",
      time: "il y a 10 min",
      icon: <ShieldAlert className="h-4 w-4 text-red-600" />,
      bg: "bg-red-50 dark:bg-red-950/30"
    },
    {
      id: 2,
      type: "temp",
      title: "Chambre Froide 02",
      description: "Température repassée sous le seuil critique (+4°C).",
      time: "il y a 35 min",
      icon: <Clock className="h-4 w-4 text-amber-600" />,
      bg: "bg-amber-50 dark:bg-amber-950/30"
    },
    {
      id: 3,
      type: "reception",
      title: "Nouveau mouvement",
      description: "Réception REC-2026-004 assignée à l'Armoire B2.",
      time: "il y a 1h",
      icon: <Package className="h-4 w-4 text-[#1B5C2E]" />,
      bg: "bg-emerald-50 dark:bg-emerald-950/30"
    },
    {
      id: 4,
      type: "waste",
      title: "Plan de destruction",
      description: "Session d'incinération validee par le coordinateur PSQIF.",
      time: "il y a 3h",
      icon: <Trash2 className="h-4 w-4 text-red-500" />,
      bg: "bg-red-50 dark:bg-red-950/30"
    },
    {
      id: 5,
      type: "report",
      title: "Rapport d'audit",
      description: "Rapport trimestriel généré avec succès en PDF.",
      time: "il y a 5h",
      icon: <FileText className="h-4 w-4 text-blue-600" />,
      bg: "bg-blue-50 dark:bg-blue-950/30"
    },
    {
      id: 6,
      type: "auth",
      title: "Connexion sécurisée",
      description: "Nouvelle connexion enregistrée depuis le Labo 03.",
      time: "Hier",
      icon: <Lock className="h-4 w-4 text-purple-600" />,
      bg: "bg-purple-50 dark:bg-purple-950/30"
    }
  ]

  const messages = [
    {
      id: 1,
      sender: "Dr. Alain KOUASSI",
      role: "Support Technique ABMed",
      text: "La mise à jour de la cartographie des armoires est terminée pour la Zone B.",
      time: "il y a 15 min",
      avatar: "AK"
    },
    {
      id: 2,
      sender: "Chantal DOSSA",
      role: "Chef de Réception",
      text: "Les bordereaux de livraison REC-2026-005 ont été signés et archivés.",
      time: "il y a 2h",
      avatar: "CD"
    },
    {
      id: 3,
      sender: "Support eGED-ABMed",
      role: "Administrateur Système",
      text: "Votre demande de validation d'accès sécurisé a été approuvée.",
      time: "il y a 1 jour",
      avatar: "SG"
    }
  ]

  return (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
      
      {/* 🌙 BASCULEUR DE MODE SOMBRE / CLAIR */}
      <ModeToggle />

      {/* 📷 BOUTON SCANNER DE CODE QR */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsScannerOpen(true)}
        className="text-white hover:text-white/80 transition-colors rounded-xl relative h-9 w-9 cursor-pointer"
        title="Scanner un QR Code"
      >
        <Scan className="h-5 w-5 text-white" />
      </Button>

      {/* 🔔 BOUTON ET MENU DÉROULANT DES NOTIFICATIONS (6) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-white hover:text-white/80 transition-colors rounded-full h-9 w-9 cursor-pointer"
          >
            <Bell className="h-5 w-5 text-white" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                {unreadNotifsCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 rounded-2xl shadow-xl border-border">
          
          {/* EN-TÊTE DU MENU NOTIFICATIONS */}
          <div className="flex items-center justify-between p-3.5 border-b border-border/80 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-foreground">Notifications</span>
              {unreadNotifsCount > 0 && (
                <Badge className="bg-red-600 hover:bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2">
                  {unreadNotifsCount} nouvelles
                </Badge>
              )}
            </div>
            <button 
              onClick={() => {
                setUnreadNotifsCount(0)
                toast.success("Toutes les notifications ont été marquées comme lues.")
              }}
              className="text-[11px] font-semibold text-[#1B5C2E] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout marquer comme lu
            </button>
          </div>

          {/* LISTE DES NOTIFICATIONS */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                className="p-3 hover:bg-muted/50 transition-colors flex items-start gap-3 cursor-pointer group"
                onClick={() => toast.info(`Notification: ${n.title}`)}
              >
                <div className={`p-2 rounded-xl shrink-0 ${n.bg}`}>
                  {n.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-foreground truncate group-hover:text-[#1B5C2E] transition-colors">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                    {n.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* PIED DU MENU NOTIFICATIONS */}
          <div className="p-2 border-t border-border/80 text-center bg-muted/20">
            <Button 
              asChild 
              variant="ghost" 
              className="w-full text-xs font-semibold text-[#1B5C2E] hover:text-[#154824] hover:bg-muted h-8"
            >
              <Link href="/dashboard/reports">
                Voir le journal des notifications <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>

        </DropdownMenuContent>
      </DropdownMenu>

      {/* ✉️ BOUTON ET MENU DÉROULANT DES MESSAGES (3) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-white hover:text-white/80 transition-colors rounded-full h-9 w-9 cursor-pointer"
          >
            <Mail className="h-5 w-5 text-white" />
            {unreadMsgCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                {unreadMsgCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 rounded-2xl shadow-xl border-border">
          
          {/* EN-TÊTE DU MENU MESSAGES */}
          <div className="flex items-center justify-between p-3.5 border-b border-border/80 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-foreground">Messages & Support</span>
              {unreadMsgCount > 0 && (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2">
                  {unreadMsgCount} récents
                </Badge>
              )}
            </div>
            <button 
              onClick={() => toast.info("Ouverture du formulaire de rédaction de message...")}
              className="text-[11px] font-semibold text-[#1B5C2E] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouveau message
            </button>
          </div>

          {/* LISTE DES MESSAGES */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {messages.map((m) => (
              <div 
                key={m.id} 
                className="p-3 hover:bg-muted/50 transition-colors flex items-start gap-3 cursor-pointer group"
                onClick={() => {
                  setUnreadMsgCount(prev => Math.max(0, prev - 1))
                  toast.info(`Message de ${m.sender}`)
                }}
              >
                <Avatar className="h-8 w-8 shrink-0 border border-emerald-600/30">
                  <AvatarFallback className="bg-[#1B5C2E] text-white text-[10px] font-bold">
                    {m.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-foreground truncate group-hover:text-[#1B5C2E] transition-colors">
                      {m.sender}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{m.time}</span>
                  </div>
                  <span className="text-[10px] font-medium text-[#1B5C2E] block leading-none mt-0.5">
                    {m.role}
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-1 line-clamp-2">
                    {m.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* PIED DU MENU MESSAGES */}
          <div className="p-2 border-t border-border/80 text-center bg-muted/20">
            <Button 
              asChild 
              variant="ghost" 
              className="w-full text-xs font-semibold text-[#1B5C2E] hover:text-[#154824] hover:bg-muted h-8"
            >
              <Link href="/dashboard/settings">
                Accéder au support technique <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>

        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6 bg-white/40 opacity-100 mx-1" />

      {/* 👤 PROFIL UTILISATEUR ET MENU DÉROULANT (EN BLANC PUR) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-2.5 cursor-pointer group hover:bg-white/10 p-1.5 rounded-xl transition-colors">
            <Avatar className="h-9 w-9 border-2 border-white/40 group-hover:border-white transition-colors shadow-xs">
              <AvatarImage src="/avatar.png" alt="Profile" />
              <AvatarFallback className="bg-white/20 text-white font-bold text-xs">MA</AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold leading-tight text-white group-hover:text-white/90 transition-colors">
                Marie ADANDE
              </span>
              <span className="text-[11px] text-white/80 font-medium">Administrateur</span>
            </div>
            <ChevronDown className="h-4 w-4 text-white hidden md:block" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl border-border">
          <DropdownMenuLabel className="font-bold text-xs px-3 py-2">Mon Compte ABMed</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild className="cursor-pointer text-xs">
              <Link href="/dashboard/profile">
                <User className="mr-2 h-4 w-4 text-[#1B5C2E]" />
                <span>Mon Profil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer text-xs">
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4 text-blue-600" />
                <span>Paramètres Système</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <form action={logout}>
            <button type="submit" className="w-full">
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Se Déconnecter</span>
              </DropdownMenuItem>
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 📦 DIALOGUE SCANNER QR CODE */}
      <QRCodeScannerDialog 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />

    </div>
  )
}
