"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Bell, Mail, Scan, ChevronDown, CheckCheck, Clock, ShieldAlert, 
  Package, Trash2, FileText, User, Settings, Lock, LogOut, ExternalLink, Plus,
  CheckCircle2, Send, MessageSquare, AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import Link from "next/link"
import dynamic from "next/dynamic"
import { logout } from "@/app/actions/auth"
import { getCurrentUser, setCurrentUser, User as AdminUser, recordLoginLog, recordAuditLog } from "@/app/dashboard/admin/adminMockData"

const QRCodeScannerDialog = dynamic(
  () => import("@/components/qrcode-scanner-dialog").then((mod) => mod.QRCodeScannerDialog),
  { ssr: false }
)

const DEFAULT_ADMIN: AdminUser = {
  id: "usr-1",
  first_name: "Admin",
  last_name: "EGED",
  matricule: "ABM-ADMIN-01",
  fonction: "Administrateur Système & Sécurité",
  department_id: "dept-5",
  role: "Administrateur Système",
  phone: "+229 01 97 00 00 01",
  email: "admin@eged.bj",
  username: "admin",
  photo_url: "/avatar.png",
  status: "Actif",
  created_at: "2026-01-10T08:00:00Z",
  last_login: "2026-10-25T14:30:00Z",
  mfa_enabled: true,
  login_attempts: 0,
  locked_until: null,
  must_change_password: false,
}

interface RealNotification {
  id: string
  type: "reception" | "alert" | "waste" | "report" | "security"
  title: string
  description: string
  time: string
  href: string
  read?: boolean
}

interface RealMessage {
  id: string
  sender: string
  recipient: string
  role: string
  subject: string
  text: string
  time: string
  avatar: string
  read: boolean
}

const MESSAGES_STORAGE_KEY = "eged_messages_v1"
const READ_NOTIFS_STORAGE_KEY = "eged_read_notifications_v1"

export function HeaderActions() {
  const [currentUser, setCurrentUserLocal] = useState<AdminUser>(DEFAULT_ADMIN)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [syncPulsing, setSyncPulsing] = useState(false)

  useEffect(() => {
    let timer: any = null
    const handleSync = () => {
      setSyncPulsing(true)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setSyncPulsing(false), 900)
    }
    window.addEventListener("eged-data-updated", handleSync)
    window.addEventListener("sgie-sync-event", handleSync)
    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener("eged-data-updated", handleSync)
      window.removeEventListener("sgie-sync-event", handleSync)
    }
  }, [])
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [phone, setPhone] = useState("+229 01 97 00 00 01")
  const [email, setEmail] = useState("admin@eged.bj")

  // Données réelles notifications & messages
  const [notifications, setNotifications] = useState<RealNotification[]>([])
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0)
  const [messages, setMessages] = useState<RealMessage[]>([])
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0)

  // Dialogue nouveau message
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false)
  const [msgRecipient, setMsgRecipient] = useState("Support Technique ABMed")
  const [msgSubject, setMsgSubject] = useState("")
  const [msgContent, setMsgContent] = useState("")
  const [isSendingMsg, setIsSendingMsg] = useState(false)

  // Lecture des alertes & réceptions réelles du système
  const refreshRealData = useCallback(() => {
    if (typeof window === "undefined") return

    // 1. Profil utilisateur actif
    const u = getCurrentUser()
    if (u && !u.first_name?.includes("Marie") && !u.last_name?.includes("ADANDE") && u.username !== "m.adande") {
      setCurrentUserLocal(u)
      if (u.phone) setPhone(u.phone)
      if (u.email) setEmail(u.email)
    } else {
      setCurrentUser(DEFAULT_ADMIN)
      setCurrentUserLocal(DEFAULT_ADMIN)
      setPhone(DEFAULT_ADMIN.phone)
      setEmail(DEFAULT_ADMIN.email)
    }

    const isWiped = localStorage.getItem("all_data_wiped") === "true"
    let readNotifIds: string[] = []
    try {
      readNotifIds = JSON.parse(localStorage.getItem(READ_NOTIFS_STORAGE_KEY) || "[]")
    } catch (e) {}

    const realNotifs: RealNotification[] = []

    if (!isWiped) {
      // 1.1 Réceptions réelles en attente
      try {
        const receptions = JSON.parse(localStorage.getItem("reception_history_records") || "[]")
        const pendingRecs = receptions.filter((r: any) => 
          r.status && r.status !== "Validée" && r.status !== "Finalisé" && r.status !== "Refusé"
        )
        pendingRecs.forEach((r: any) => {
          realNotifs.push({
            id: `notif-rec-${r.rec_number || r.id}`,
            type: "reception",
            title: `Réception ${r.rec_number || "en cours"}`,
            description: `Bordereau ${r.rec_number} (${r.supplier || "Apporteur"}) en attente de validation qualité.`,
            time: r.date_reception ? `Date : ${r.date_reception}` : "En instance",
            href: "/dashboard/receptions?status=en_attente",
            read: readNotifIds.includes(`notif-rec-${r.rec_number || r.id}`),
          })
        })

        // 1.2 Déchets & plans de destruction réels en attente
        const destPlans = JSON.parse(localStorage.getItem("destruction_plans_custom_v1") || "[]")
        const pendingPlans = destPlans.filter((p: any) => p.status === "En attente" || p.status === "Brouillon")
        pendingPlans.forEach((p: any) => {
          realNotifs.push({
            id: `notif-plan-${p.plan_number || p.id}`,
            type: "waste",
            title: `Plan de destruction ${p.plan_number || ""}`,
            description: `Session de neutralisation de ${p.total_weight || 0} kg en attente d'exécution.`,
            time: p.scheduled_date ? `Prévu le ${p.scheduled_date}` : "À planifier",
            href: "/dashboard/destructions",
            read: readNotifIds.includes(`notif-plan-${p.plan_number || p.id}`),
          })
        })
      } catch (e) {}
    }

    setNotifications(realNotifs)
    const unreadNotifs = realNotifs.filter(n => !n.read).length
    setUnreadNotifsCount(unreadNotifs)

    // 1.3 Messages réels
    try {
      const storedMsgs = localStorage.getItem(MESSAGES_STORAGE_KEY)
      if (storedMsgs) {
        const parsedMsgs: RealMessage[] = JSON.parse(storedMsgs)
        if (Array.isArray(parsedMsgs)) {
          setMessages(parsedMsgs)
          setUnreadMsgCount(parsedMsgs.filter(m => !m.read).length)
          return
        }
      }
    } catch (e) {}

    // Par défaut, si aucune discussion n'a été créée, boîte vierge à 0
    setMessages([])
    setUnreadMsgCount(0)
  }, [])

  useEffect(() => {
    refreshRealData()

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === "reception_history_records" ||
        e.key === "destruction_plans_custom_v1" ||
        e.key === "all_data_wiped" ||
        e.key === MESSAGES_STORAGE_KEY ||
        e.key === READ_NOTIFS_STORAGE_KEY
      ) {
        refreshRealData()
      }
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener("eged_data_updated", refreshRealData)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("eged_data_updated", refreshRealData)
    }
  }, [refreshRealData])

  // Marquer toutes les notifications réelles comme lues
  const handleMarkAllNotifsRead = () => {
    try {
      const allIds = notifications.map(n => n.id)
      localStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(allIds))
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadNotifsCount(0)
      toast.success("Toutes les alertes et notifications ont été marquées comme lues.")
    } catch (e) {}
  }

  // Marquer une notification individuelle comme lue
  const handleNotificationClick = (notif: RealNotification) => {
    try {
      const readNotifIds = JSON.parse(localStorage.getItem(READ_NOTIFS_STORAGE_KEY) || "[]")
      if (!readNotifIds.includes(notif.id)) {
        readNotifIds.push(notif.id)
        localStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(readNotifIds))
      }
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
      setUnreadNotifsCount(prev => Math.max(0, prev - 1))
    } catch (e) {}
  }

  // Envoi d'un message réel
  const handleSendMessage = () => {
    if (!msgSubject.trim() || !msgContent.trim()) {
      toast.error("Veuillez renseigner l'objet et le texte de votre message.")
      return
    }

    setIsSendingMsg(true)
    setTimeout(() => {
      const newMsg: RealMessage = {
        id: `msg-${Date.now()}`,
        sender: `${currentUser.first_name} ${currentUser.last_name}`,
        recipient: msgRecipient,
        role: currentUser.role,
        subject: msgSubject.trim(),
        text: msgContent.trim(),
        time: "À l'instant",
        avatar: "AE",
        read: false,
      }

      const updated = [newMsg, ...messages]
      setMessages(updated)
      setUnreadMsgCount(prev => prev + 1)
      try {
        localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {}

      setIsSendingMsg(false)
      setIsNewMessageOpen(false)
      setMsgSubject("")
      setMsgContent("")
      toast.success(`Message transmis avec succès à : ${msgRecipient}`)
    }, 400)
  }

  // Marquer un message comme lu
  const handleMessageClick = (msg: RealMessage) => {
    const updated = messages.map(m => m.id === msg.id ? { ...m, read: true } : m)
    setMessages(updated)
    setUnreadMsgCount(updated.filter(m => !m.read).length)
    try {
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {}
    toast.info(`Message : ${msg.subject}`)
  }

  // Initiales de l'avatar et nom d'affichage (garantit Admin EGED)
  let displayName = "Admin EGED"
  let avatarInitials = "AE"

  if (currentUser) {
    const raw = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim()
    if (raw && !raw.includes("Marie") && !raw.includes("ADANDE")) {
      displayName = raw
      avatarInitials = `${currentUser.first_name?.[0] || "A"}${currentUser.last_name?.[0] || "E"}`.toUpperCase()
    }
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
      
      {/* 🟢 INDICATEUR SYNCHRONISATION MULTI-POSTES EN DIRECT */}
      <div 
        className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold select-none transition-all duration-300 ${
          syncPulsing 
            ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400 scale-105" 
            : "bg-black/20 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60"
        }`}
        title="Synchronisation instantanée multi-niveaux et multi-utilisateurs active (<50ms)"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <span className="tracking-wide">
          {syncPulsing ? "Synchronisé" : "En direct"}
        </span>
      </div>

      {/* 🌙 BASCULEUR DE MODE SOMBRE / CLAIR */}
      <ModeToggle />

      {/* 📷 BOUTON SCANNER DE CODE QR */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsScannerOpen(true)}
        className="text-white hover:text-white/80 transition-colors rounded-xl relative h-8 w-8 sm:h-9 sm:w-9 cursor-pointer"
        title="Scanner un QR Code"
      >
        <Scan className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-white" />
      </Button>

      {/* 🔔 BOUTON ET MENU DÉROULANT DES NOTIFICATIONS RÉELLES */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-white hover:text-white/80 transition-colors rounded-full h-8 w-8 sm:h-9 sm:w-9 cursor-pointer"
            title="Notifications réelles"
          >
            <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-white" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-full bg-red-600 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in-75">
                {unreadNotifsCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[calc(100vw-20px)] max-w-sm sm:w-96 p-0 rounded-2xl shadow-xl border-border">
          
          {/* EN-TÊTE DU MENU NOTIFICATIONS */}
          <div className="flex items-center justify-between p-3.5 border-b border-border/80 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-foreground">Notifications & Alertes</span>
              {unreadNotifsCount > 0 ? (
                <Badge className="bg-red-600 hover:bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2">
                  {unreadNotifsCount} active{unreadNotifsCount > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px]">
                  À jour
                </Badge>
              )}
            </div>
            {unreadNotifsCount > 0 && (
              <button 
                onClick={handleMarkAllNotifsRead}
                className="text-[11px] font-semibold text-[#1B5C2E] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* LISTE DES NOTIFICATIONS RÉELLES */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <Link 
                  key={n.id} 
                  href={n.href}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 hover:bg-muted/50 transition-colors flex items-start gap-3 cursor-pointer group block ${n.read ? "opacity-60" : "bg-card"}`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${
                    n.type === "reception" ? "bg-emerald-50 text-[#1B5C2E]" : 
                    n.type === "waste" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-600"
                  }`}>
                    {n.type === "reception" ? <Package className="h-4 w-4" /> : 
                     n.type === "waste" ? <Trash2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
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
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-1.5">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 mx-auto" />
                <p className="font-bold text-foreground">Aucune notification en attente</p>
                <p className="text-[11px] text-muted-foreground">
                  Toutes les réceptions, mouvements et alertes de la plateforme sont à jour.
                </p>
              </div>
            )}
          </div>

          {/* PIED DU MENU NOTIFICATIONS */}
          <div className="p-2 border-t border-border/80 text-center bg-muted/20">
            <Button 
              asChild 
              variant="ghost" 
              className="w-full text-xs font-semibold text-[#1B5C2E] hover:text-[#154824] hover:bg-muted h-8"
            >
              <Link href="/dashboard/alerts">
                Consulter le Centre d'Alertes <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>

        </DropdownMenuContent>
      </DropdownMenu>

      {/* ✉️ BOUTON ET MENU DÉROULANT DES MESSAGES RÉELS */}
      {/* ✉️ BOUTON ET MENU DÉROULANT DES MESSAGES RÉELS */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-white hover:text-white/80 transition-colors rounded-full h-8 w-8 sm:h-9 sm:w-9 cursor-pointer"
            title="Messages & Sollicitations"
          >
            <Mail className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-white" />
            {unreadMsgCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-full bg-emerald-600 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in-75">
                {unreadMsgCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[calc(100vw-20px)] max-w-sm sm:w-96 p-0 rounded-2xl shadow-xl border-border">
          
          {/* EN-TÊTE DU MENU MESSAGES */}
          <div className="flex items-center justify-between p-3.5 border-b border-border/80 bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-foreground">Messages & Assistance</span>
              {unreadMsgCount > 0 ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2">
                  {unreadMsgCount} non lu{unreadMsgCount > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[10px]">
                  0 non lu
                </Badge>
              )}
            </div>
            <button 
              onClick={() => setIsNewMessageOpen(true)}
              className="text-[11px] font-semibold text-[#1B5C2E] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouveau message
            </button>
          </div>

          {/* LISTE DES MESSAGES */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {messages.length > 0 ? (
              messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`p-3 hover:bg-muted/50 transition-colors flex items-start gap-3 cursor-pointer group ${!m.read ? "bg-emerald-50/20" : ""}`}
                  onClick={() => handleMessageClick(m)}
                >
                  <Avatar className="h-8 w-8 shrink-0 border border-emerald-600/30">
                    <AvatarFallback className="bg-[#1B5C2E] text-white text-[10px] font-bold">
                      {m.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-foreground truncate group-hover:text-[#1B5C2E] transition-colors">
                        {m.subject || m.sender}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{m.time}</span>
                    </div>
                    <span className="text-[10px] font-medium text-[#1B5C2E] block leading-none mt-0.5 truncate">
                      À : {m.recipient}
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-1 line-clamp-2">
                      {m.text}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-1.5">
                <Mail className="h-7 w-7 text-muted-foreground/50 mx-auto" />
                <p className="font-bold text-foreground">Aucun message pour le moment</p>
                <p className="text-[11px] text-muted-foreground">
                  Vos échanges avec le support et les équipes apparaîtront ici.
                </p>
              </div>
            )}
          </div>

          {/* PIED DU MENU MESSAGES */}
          <div className="p-2 border-t border-border/80 text-center bg-muted/20">
            <Button 
              onClick={() => setIsNewMessageOpen(true)}
              variant="ghost" 
              className="w-full text-xs font-semibold text-[#1B5C2E] hover:text-[#154824] hover:bg-muted h-8"
            >
              Envoyer une demande d'assistance <Plus className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="hidden sm:block h-6 bg-white/40 opacity-100 mx-0.5" />

      {/* 👤 PROFIL UTILISATEUR ET MENU DÉROULANT (Admin EGED) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto p-1 sm:p-1.5 flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-xl transition-colors text-white focus:outline-none focus-visible:ring-0">
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-white/40 group-hover:border-white transition-colors shadow-xs shrink-0">
              <AvatarImage src="/avatar.png" alt={displayName} />
              <AvatarFallback className="bg-white/20 text-white font-bold text-xs">
                {avatarInitials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold leading-tight text-white group-hover:text-white/90 transition-colors truncate max-w-[120px] md:max-w-[150px]">
                {displayName}
              </span>
              <span className="text-[11px] text-white/80 font-medium truncate max-w-[120px] md:max-w-[150px]">
                {currentUser?.role || "Administrateur Système"}
              </span>
            </div>
            <ChevronDown className="hidden sm:block h-4 w-4 text-white shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 sm:w-56 rounded-2xl shadow-xl border-border">
          {/* IDENTITÉ COMPACTE SUR MOBILE */}
          <div 
            onClick={() => setShowProfileModal(true)} 
            className="block sm:hidden px-3 py-2.5 border-b border-border/80 bg-muted/30 rounded-t-xl hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <p className="font-bold text-xs text-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{currentUser?.role || "Administrateur Système"}</p>
            <p className="text-[10px] text-muted-foreground/80 truncate">{currentUser?.email || email}</p>
          </div>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-bold text-xs px-3 py-2 hidden sm:block">Espace Administrateur eGED</DropdownMenuLabel>
            <DropdownMenuSeparator className="hidden sm:block" />
            <DropdownMenuItem 
              onClick={() => setShowProfileModal(true)}
              onSelect={() => setShowProfileModal(true)} 
              className="cursor-pointer text-xs font-semibold"
            >
              <User className="mr-2 h-4 w-4 text-[#1B5C2E]" />
              <span>Voir Mon Profil</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer text-xs">
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4 text-blue-600" />
                <span>Paramètres Système</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <form action={logout} onSubmit={() => {
            if (currentUser) {
              recordLoginLog(currentUser.username, "Déconnexion")
              recordAuditLog("Déconnexion", "Authentification", `Déconnexion de l'administrateur ${currentUser.first_name} ${currentUser.last_name}`, `${currentUser.first_name} ${currentUser.last_name}`)
            }
            setCurrentUser(null)
            if (typeof document !== "undefined") {
              document.cookie = "eged_user_logged=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
            }
          }}>
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

      {/* ✉️ MODALE CRÉATION DE NOUVEAU MESSAGE / ASSISTANCE */}
      <Dialog open={isNewMessageOpen} onOpenChange={setIsNewMessageOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <MessageSquare className="h-5 w-5 text-[#1B5C2E]" />
              Nouveau message d'assistance
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Transmettre une demande ou un signalement interne.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="font-semibold text-foreground">Destinataire</Label>
              <Select value={msgRecipient} onValueChange={(val) => setMsgRecipient(val || "Support Technique ABMed")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Sélectionnez un destinataire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Support Technique ABMed">Support Technique ABMed</SelectItem>
                  <SelectItem value="Direction de l'Assurance Qualité">Direction de l'Assurance Qualité</SelectItem>
                  <SelectItem value="Direction des Déchets Pharmaceutiques">Direction des Déchets Pharmaceutiques</SelectItem>
                  <SelectItem value="Direction des Systèmes d'Information">Direction des Systèmes d'Information</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-foreground">Objet</Label>
              <Input 
                value={msgSubject}
                onChange={e => setMsgSubject(e.target.value)}
                placeholder="Objet de la sollicitation"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-semibold text-foreground">Message</Label>
              <Textarea 
                value={msgContent}
                onChange={e => setMsgContent(e.target.value)}
                placeholder="Détaillez votre message ou observation..."
                rows={4}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsNewMessageOpen(false)}>
              Annuler
            </Button>
            <Button 
              size="sm" 
              onClick={handleSendMessage} 
              disabled={isSendingMsg || !msgSubject.trim() || !msgContent.trim()}
              className="bg-[#1B5C2E] hover:bg-[#154824] text-white gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              {isSendingMsg ? "Transmission..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 👤 MODALE PROFIL UTILISATEUR (Admin EGED) */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border/60 bg-muted/30">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-[#1B5C2E]" />
              Profil Administrateur — {displayName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Compte administrateur principal de la plateforme eGED ABMed.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/30 border border-border/60">
              <Avatar className="h-16 w-16 border-2 border-[#1B5C2E] shadow-xs">
                <AvatarImage src="/avatar.png" alt={displayName} />
                <AvatarFallback className="bg-[#1B5C2E] text-white font-bold text-lg">{avatarInitials}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <h4 className="text-base font-black text-foreground">{displayName}</h4>
                <p className="text-xs text-muted-foreground font-medium">{currentUser?.fonction || "Administrateur Système & Sécurité"}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">Compte Actif</Badge>
                  <Badge variant="outline" className="text-[10px] font-mono">Matricule : {currentUser?.matricule || "ABM-ADMIN-01"}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Adresse Email :</label>
                <Input 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-8 text-xs bg-background rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">Téléphone professionnel :</label>
                <Input 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="h-8 text-xs bg-background rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Service / Direction :</label>
                <div className="h-8 px-2.5 rounded-xl border bg-muted/20 text-xs flex items-center font-medium">Direction SI & Digitalisation</div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Rôle & Privilèges :</label>
                <div className="h-8 px-2.5 rounded-xl border bg-muted/20 text-xs flex items-center font-bold text-[#1B5C2E]">ADMIN_SYS (Accès Total)</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs flex justify-between items-center">
              <span>Dernière connexion : <strong>Aujourd'hui à 14:30</strong> (IP: 197.234.221.15)</span>
              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] font-semibold">MFA Activée</Badge>
            </div>
          </div>

          <DialogFooter className="p-3 bg-muted/20 border-t border-border/60 flex flex-row items-center justify-between sm:justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild 
              className="text-xs text-[#1B5C2E] hover:text-[#154824] hover:bg-emerald-50 font-semibold h-8 px-2.5 cursor-pointer"
            >
              <Link href="/dashboard/profile" onClick={() => setShowProfileModal(false)}>
                Consulter la page complète <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowProfileModal(false)} className="h-8 text-xs rounded-xl cursor-pointer">
                Fermer
              </Button>
              <Button 
                size="sm" 
                onClick={() => {
                  const updated = { ...currentUser, phone, email }
                  setCurrentUser(updated)
                  setCurrentUserLocal(updated)
                  setShowProfileModal(false)
                  toast.success("Informations du profil mises à jour avec succès !")
                }} 
                className="bg-[#1B5C2E] hover:bg-[#154824] text-white h-8 text-xs font-bold rounded-xl cursor-pointer"
              >
                Enregistrer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
