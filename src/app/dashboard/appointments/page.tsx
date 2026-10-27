"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { 
  CalendarDays, Clock, MapPin, Plus, CheckCircle2, AlertCircle, 
  Search, Users, Building2, FileText, Download, Printer, XCircle, 
  ChevronRight, Calendar, ArrowRight, ShieldCheck, CheckSquare, Filter,
  Sparkles, RefreshCw, Layers
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { getCurrentUser, User as AdminUser } from "@/app/dashboard/admin/adminMockData"
import { 
  getRegisteredCentersSync, 
  getRegisteredCenters, 
  Center 
} from "@/utils/centers-storage"
import {
  ReceptionSchedule,
  Appointment,
  getReceptionSchedulesSync,
  getReceptionSchedules,
  saveReceptionSchedule,
  deleteReceptionSchedule,
  getAppointmentsSync,
  getAppointments,
  bookAppointment,
  cancelAppointment,
  updateAppointmentStatus
} from "@/utils/appointments-storage"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { exportToExcel } from "@/utils/exportUtils"

export default function AppointmentsPage() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [schedules, setSchedules] = useState<ReceptionSchedule[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [centers, setCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(true)

  // Filtres
  const [globalSearch, setGlobalSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"schedules" | "appointments" | "my-appointments">("schedules")

  // Modals ABMeD
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false)
  const [newScheduleDate, setNewScheduleDate] = useState("")
  const [newScheduleStartTime, setNewScheduleStartTime] = useState("08:30")
  const [newScheduleEndTime, setNewScheduleEndTime] = useState("15:30")
  const [newScheduleType, setNewScheduleType] = useState<"Échantillons pharmaceutiques" | "Déchets pharmaceutiques" | "Mixte (Échantillons & Déchets)">("Déchets pharmaceutiques")
  const [newScheduleCapacity, setNewScheduleCapacity] = useState(8)
  const [newScheduleLocation, setNewScheduleLocation] = useState("Magasin Central Déchets ABMed — Quai N°1")
  const [newScheduleInstructions, setNewScheduleInstructions] = useState("Bordereau de déclaration signé obligatoire. Conditionnement scellé.")

  // Modal Réservation (Centres ou Agents)
  const [isBookModalOpen, setIsBookModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<ReceptionSchedule | null>(null)
  const [bookType, setBookType] = useState<"Échantillons" | "Déchets" | "Mixte">("Déchets")
  const [bookEstimatedQty, setBookEstimatedQty] = useState("")
  const [bookDepositorName, setBookDepositorName] = useState("")
  const [bookDepositorPhone, setBookDepositorPhone] = useState("")
  const [bookObservations, setBookObservations] = useState("")
  const [selectedCenterForAgent, setSelectedCenterForAgent] = useState<string>("")

  // Modal Voir les centres inscrits sur une journée
  const [inspectedSchedule, setInspectedSchedule] = useState<ReceptionSchedule | null>(null)
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false)

  // Modal Récépissé imprimable
  const [ticketAppointment, setTicketAppointment] = useState<Appointment | null>(null)

  // Détection du type d'utilisateur
  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    if (user?.role === "Centre Apporteur" || user?.matricule?.startsWith("CTR-")) {
      setActiveTab("schedules")
    }
  }, [])

  const isCenterUser = useMemo(() => {
    return (
      currentUser?.role === "Centre Apporteur" ||
      currentUser?.matricule?.startsWith("CTR-") ||
      currentUser?.username?.startsWith("CTR-")
    )
  }, [currentUser])

  // Centre résolu pour l'utilisateur connecté
  const userCenter = useMemo(() => {
    if (!isCenterUser) return null
    const all = getRegisteredCentersSync()
    const code = currentUser?.matricule || currentUser?.username || ""
    return all.find(
      (c) =>
        c.center_code.toUpperCase() === code.toUpperCase() ||
        c.name.toUpperCase() === currentUser?.first_name?.toUpperCase()
    ) || null
  }, [isCenterUser, currentUser])

  // Chargement des données
  const loadData = useCallback(async () => {
    try {
      const [sList, aList, cList] = await Promise.all([
        getReceptionSchedules(),
        getAppointments(),
        getRegisteredCenters()
      ])
      setSchedules(sList)
      setAppointments(aList)
      setCenters(cList)
    } catch (e) {
      console.warn("Erreur chargement rendez-vous:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtimeSync({
    tables: ["waste_movements", "receptions"],
    onSync: loadData,
    pollIntervalMs: 6000
  })

  // Pré-remplissage du formulaire de réservation lorsque le centre ouvre le modal
  useEffect(() => {
    if (userCenter) {
      setBookDepositorName(userCenter.contact_person || "")
      setBookDepositorPhone(userCenter.phone || "")
    }
  }, [userCenter])

  // Filtrage des créneaux de réception
  const filteredSchedules = useMemo(() => {
    let list = schedules
    if (typeFilter !== "all") {
      list = list.filter((s) => s.reception_type.toLowerCase().includes(typeFilter.toLowerCase()))
    }
    if (statusFilter !== "all") {
      list = list.filter((s) => s.status.toLowerCase() === statusFilter.toLowerCase())
    }
    if (globalSearch.trim() !== "") {
      const q = globalSearch.toLowerCase()
      list = list.filter(
        (s) =>
          s.date.includes(q) ||
          s.reception_type.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q)
      )
    }
    return list
  }, [schedules, typeFilter, statusFilter, globalSearch])

  // Filtrage de tous les rendez-vous (vue ABMeD)
  const filteredAppointments = useMemo(() => {
    let list = appointments
    if (globalSearch.trim() !== "") {
      const q = globalSearch.toLowerCase()
      list = list.filter(
        (a) =>
          a.appointment_number.toLowerCase().includes(q) ||
          a.center_name.toLowerCase().includes(q) ||
          a.center_code.toLowerCase().includes(q) ||
          a.depositor_name.toLowerCase().includes(q) ||
          a.date.includes(q)
      )
    }
    return list
  }, [appointments, globalSearch])

  // Rendez-vous réservés par le centre connecté
  const myCenterAppointments = useMemo(() => {
    if (!userCenter && !currentUser) return []
    const centerCode = userCenter?.center_code || currentUser?.matricule || currentUser?.username || ""
    return appointments.filter(
      (a) => a.center_code.toUpperCase() === centerCode.toUpperCase()
    )
  }, [appointments, userCenter, currentUser])

  // CRÉATION D'UNE JOURNÉE PAR L'ABMED
  const handleCreateScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newScheduleDate) {
      toast.error("Veuillez sélectionner une date de réception.")
      return
    }
    if (newScheduleCapacity < 1) {
      toast.error("La capacité d'accueil doit être d'au moins 1 centre.")
      return
    }

    const newSched: ReceptionSchedule = {
      id: `sched-${newScheduleDate}-${Date.now().toString().slice(-4)}`,
      date: newScheduleDate,
      start_time: newScheduleStartTime,
      end_time: newScheduleEndTime,
      reception_type: newScheduleType,
      max_capacity: Number(newScheduleCapacity),
      booked_count: 0,
      location: newScheduleLocation.trim(),
      instructions: newScheduleInstructions.trim(),
      status: "Ouvert",
      created_by: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Agent ABMed",
      created_at: new Date().toISOString()
    }

    await saveReceptionSchedule(newSched)
    toast.success(`Journée de réception du ${newScheduleDate} créée avec succès (${newScheduleCapacity} places disponibles).`)
    setIsCreateScheduleOpen(false)
    loadData()
  }

  // SUPPRESSION D'UN CRÉNEAU PAR L'ABMED
  const handleDeleteSchedule = async (id: string, date: string) => {
    if (confirm(`Confirmez-vous la suppression de la journée de réception du ${date} ?`)) {
      await deleteReceptionSchedule(id)
      toast.success("Journée de réception supprimée.")
      loadData()
    }
  }

  // OUVERTURE MODAL RÉSERVATION
  const handleOpenBookModal = (schedule: ReceptionSchedule) => {
    setSelectedSchedule(schedule)
    if (schedule.reception_type.includes("Échantillon") && !schedule.reception_type.includes("Déchet")) {
      setBookType("Échantillons")
    } else if (schedule.reception_type.includes("Déchet") && !schedule.reception_type.includes("Échantillon")) {
      setBookType("Déchets")
    } else {
      setBookType("Mixte")
    }
    setIsBookModalOpen(true)
  }

  // CONFIRMATION DE RÉSERVATION
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSchedule) return

    let centerToBook: Center | null = null

    if (isCenterUser) {
      centerToBook = userCenter || {
        id: currentUser?.id || "ctr-curr",
        center_code: currentUser?.matricule || "CTR-2026-0001",
        name: currentUser?.first_name || "Établissement",
        center_type: currentUser?.fonction || "Officine de pharmacie",
        city: "Cotonou",
        created_at: new Date().toISOString()
      }
    } else {
      if (!selectedCenterForAgent) {
        toast.error("Veuillez sélectionner le centre apporteur.")
        return
      }
      centerToBook = centers.find((c) => c.center_code === selectedCenterForAgent) || null
    }

    if (!centerToBook) {
      toast.error("Impossible d'identifier le centre apporteur.")
      return
    }

    if (!bookDepositorName.trim()) {
      toast.error("Veuillez renseigner le nom de la personne qui effectuera le dépôt.")
      return
    }

    const res = await bookAppointment({
      schedule_id: selectedSchedule.id,
      center: centerToBook,
      type: bookType,
      time_slot: `${selectedSchedule.start_time} - ${selectedSchedule.end_time}`,
      estimated_quantity: bookEstimatedQty.trim(),
      depositor_name: bookDepositorName.trim(),
      depositor_id_card: "",
      observations: bookObservations.trim()
    })

    if (!res.success) {
      toast.error(res.error || "Échec de la réservation.")
      return
    }

    toast.success(`Rendez-vous ${res.appointment?.appointment_number} réservé avec succès !`)
    setIsBookModalOpen(false)
    setTicketAppointment(res.appointment || null)
    loadData()
  }

  // ANNULATION D'UN RENDEZ-VOUS
  const handleCancelApp = async (app: Appointment) => {
    if (confirm(`Confirmez-vous l'annulation du rendez-vous ${app.appointment_number} du ${app.date} ? La place sera restituée.`)) {
      await cancelAppointment(app.id)
      toast.success("Rendez-vous annulé. La place a été remise à disposition.")
      loadData()
    }
  }

  // CHANGEMENT DE STATUT PAR L'AGENT (EX: EFFECTUÉ)
  const handleUpdateStatus = async (appId: string, status: "Confirmé" | "Effectué" | "Annulé" | "Absent") => {
    const agent = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Agent ABMed"
    await updateAppointmentStatus(appId, status, agent)
    toast.success(`Statut du rendez-vous mis à jour : ${status}`)
    loadData()
  }

  // Export Excel des rendez-vous
  const handleExportExcel = () => {
    const dataToExport = filteredAppointments.map((a) => ({
      "N° Rendez-vous": a.appointment_number,
      "Date": a.date,
      "Créneau": a.time_slot,
      "Code Centre": a.center_code,
      "Nom Centre": a.center_name,
      "Type d'apport": a.type,
      "Volume Estimé": a.estimated_quantity || "-",
      "Dépositaire": a.depositor_name,
      "Téléphone": a.contact_phone || "-",
      "Statut": a.status,
      "Enregistré le": new Date(a.created_at).toLocaleDateString("fr-FR")
    }))
    const headers = [
      "N° Rendez-vous",
      "Date",
      "Créneau",
      "Code Centre",
      "Nom Centre",
      "Type d'apport",
      "Volume Estimé",
      "Dépositaire",
      "Téléphone",
      "Statut",
      "Enregistré le"
    ]
    exportToExcel(dataToExport, headers, "Rendez_Vous_Receptions_ABMed")
    toast.success("Fichier Excel exporté avec succès.")
  }

  // Statistiques KPIs
  const totalOpenSlots = useMemo(() => {
    return schedules
      .filter((s) => s.status === "Ouvert")
      .reduce((acc, s) => acc + Math.max(0, s.max_capacity - s.booked_count), 0)
  }, [schedules])

  const totalBookedAppointments = useMemo(() => {
    return appointments.filter((a) => a.status === "Confirmé").length
  }, [appointments])

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* ─── BANDEAU SUPÉRIEUR INSTITUTIONNEL ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/70 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isCenterUser ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}`}>
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-foreground">
                {isCenterUser ? "Portail de Prise de Rendez-vous" : "Module de Gestion des Rendez-vous & Réceptions"}
              </h1>
              {isCenterUser && userCenter && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono font-bold text-xs">
                  {userCenter.center_code}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isCenterUser
                ? `Bienvenue, ${userCenter?.name || currentUser?.first_name}. Choisissez votre date d'apport d'échantillons ou de déchets.`
                : "Planification des journées de réception, définition des jauges de centres attendus et suivi des passages."}
            </p>
          </div>
        </div>

        {/* ACTIONS DU BANDEAU */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          {!isCenterUser && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="text-xs font-semibold gap-1.5 h-8.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export Excel
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreateScheduleOpen(true)}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8.5 shadow-2xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Programmer une Journée
              </Button>
            </>
          )}

          {isCenterUser && (
            <Button
              size="sm"
              onClick={() => setActiveTab("schedules")}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8.5 shadow-2xs"
            >
              <Calendar className="h-4 w-4" />
              Voir les Dates Disponibles
            </Button>
          )}
        </div>
      </div>

      {/* ─── CARTES KPI SYNTHÉTIQUES ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-xl border border-border/60 shadow-2xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Créneaux Ouverts</span>
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-foreground mt-1">
            {schedules.filter((s) => s.status === "Ouvert").length}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Journées accessibles aux centres</p>
        </Card>

        <Card className="rounded-xl border border-border/60 shadow-2xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Places Restantes</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {totalOpenSlots} place{totalOpenSlots > 1 ? "s" : ""}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Capacité disponible cumulée</p>
        </Card>

        <Card className="rounded-xl border border-border/60 shadow-2xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isCenterUser ? "Mes RDV Réservés" : "Rendez-vous Confirmés"}
            </span>
            <CheckCircle2 className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-600 mt-1">
            {isCenterUser ? myCenterAppointments.length : totalBookedAppointments}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {isCenterUser ? "Passages programmés pour votre centre" : "Centres attendus prochainement"}
          </p>
        </Card>

        <Card className="rounded-xl border border-border/60 shadow-2xs p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Centres Enregistrés</span>
            <Building2 className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-foreground mt-1">
            {centers.length}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Structures avec code CTR actif</p>
        </Card>
      </div>

      {/* ─── ONGLET PRINCIPAL ─── */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/60 pb-2">
          <TabsList className="bg-muted/60 p-1 rounded-xl h-9">
            <TabsTrigger value="schedules" className="text-xs font-bold gap-1.5 px-3">
              <Calendar className="h-3.5 w-3.5" />
              {isCenterUser ? "1. Choisir une Date Disponible" : "Journées de Réception"}
            </TabsTrigger>

            {isCenterUser ? (
              <TabsTrigger value="my-appointments" className="text-xs font-bold gap-1.5 px-3">
                <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                2. Mes Rendez-vous ({myCenterAppointments.length})
              </TabsTrigger>
            ) : (
              <TabsTrigger value="appointments" className="text-xs font-bold gap-1.5 px-3">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                Rendez-vous Réservés ({appointments.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* BARRE DE RECHERCHE & FILTRE RAPIDE */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher date, centre, CTR..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="pl-8 text-xs h-8.5 rounded-lg"
              />
            </div>
            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
              <SelectTrigger className="text-xs h-8.5 w-36 rounded-lg">
                <SelectValue placeholder="Type d'apport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Tous types</SelectItem>
                <SelectItem value="déchet" className="text-xs">Déchets</SelectItem>
                <SelectItem value="échantillon" className="text-xs">Échantillons</SelectItem>
                <SelectItem value="mixte" className="text-xs">Mixte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ─── CONTENU ONGLET 1 : JOURNÉES & CRÉNEAUX ─── */}
        <TabsContent value="schedules" className="space-y-3 mt-0">
          {filteredSchedules.length === 0 ? (
            <Card className="p-8 text-center rounded-xl border border-dashed border-border/70">
              <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-bold text-foreground text-sm">Aucune journée de réception programmée</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isCenterUser
                  ? "L'ABMeD n'a pas encore ouvert de créneaux pour cette période. Veuillez revenir bientôt."
                  : "Cliquez sur « Programmer une Journée » pour ouvrir des créneaux aux centres apporteurs."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSchedules.map((sched) => {
                const remaining = Math.max(0, sched.max_capacity - sched.booked_count)
                const isFull = remaining === 0 || sched.status === "Complet"
                const pct = Math.round((sched.booked_count / sched.max_capacity) * 100)

                // Vérifier si le centre connecté a déjà réservé ce jour
                const alreadyBookedByMe = isCenterUser && myCenterAppointments.some(
                  (a) => a.schedule_id === sched.id && a.status !== "Annulé"
                )

                // Date formatée en français
                const dateObj = new Date(sched.date + "T00:00:00")
                const formattedDate = dateObj.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })

                const isWaste = sched.reception_type.includes("Déchet")
                const isSample = sched.reception_type.includes("Échantillon")

                return (
                  <Card 
                    key={sched.id} 
                    className={`rounded-xl border shadow-2xs transition-all overflow-hidden flex flex-col justify-between ${
                      alreadyBookedByMe
                        ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20"
                        : isFull
                        ? "border-border/60 bg-muted/10 opacity-80"
                        : "border-border/70 hover:border-primary/50"
                    }`}
                  >
                    <div>
                      {/* En-tête de la carte */}
                      <div className="p-3.5 border-b border-border/50 flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {formattedDate}
                          </span>
                          <div className="text-sm font-black text-foreground capitalize mt-0.5">
                            {sched.date}
                          </div>
                        </div>

                        <Badge 
                          variant="outline" 
                          className={`text-[10px] font-bold ${
                            isWaste && !isSample
                              ? "bg-red-50 text-red-700 border-red-200"
                              : isSample && !isWaste
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {sched.reception_type}
                        </Badge>
                      </div>

                      {/* Détails du créneau */}
                      <div className="p-3.5 space-y-2.5 text-xs">
                        {/* Horaires et Lieu */}
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span>{sched.start_time} — {sched.end_time}</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-1" title={sched.location}>{sched.location}</span>
                        </div>

                        {/* JAUGE DE PLACES RESTANTES */}
                        <div className="pt-1.5">
                          <div className="flex justify-between items-center text-[11px] font-bold mb-1">
                            <span className="text-muted-foreground">Jauge d'accueil :</span>
                            <span className={isFull ? "text-red-600" : "text-emerald-700 font-black"}>
                              {sched.booked_count} / {sched.max_capacity} centres
                            </span>
                          </div>

                          {/* Barre de progression */}
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/40">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                isFull ? "bg-red-600" : pct > 70 ? "bg-amber-500" : "bg-emerald-600"
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center mt-1 text-[11px]">
                            {isFull ? (
                              <Badge className="bg-red-100 text-red-800 border-0 text-[10px] font-bold">
                                Session Complète
                              </Badge>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                ● {remaining} place{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}
                              </span>
                            )}
                            <span className="text-muted-foreground text-[10px]">
                              {sched.status}
                            </span>
                          </div>
                        </div>

                        {sched.instructions && (
                          <p className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/40 italic line-clamp-2">
                            « {sched.instructions} »
                          </p>
                        )}
                      </div>
                    </div>

                    {/* PIED DE CARTE / ACTIONS */}
                    <div className="p-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2">
                      {isCenterUser ? (
                        alreadyBookedByMe ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                            <CheckCircle2 className="h-4 w-4" />
                            Place déjà réservée par votre centre
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isFull}
                            onClick={() => handleOpenBookModal(sched)}
                            className={`w-full text-xs font-bold gap-1.5 cursor-pointer ${
                              isFull
                                ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            }`}
                          >
                            <CalendarDays className="h-3.5 w-3.5" />
                            {isFull ? "Complet" : "Réserver pour mon Centre"}
                          </Button>
                        )
                      ) : (
                        <div className="flex items-center justify-between w-full gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setInspectedSchedule(sched)
                              setIsInspectModalOpen(true)
                            }}
                            className="text-xs h-7.5 px-2.5 font-semibold gap-1"
                          >
                            <Users className="h-3 w-3 text-blue-600" />
                            Inscrits ({sched.booked_count})
                          </Button>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isFull}
                              onClick={() => handleOpenBookModal(sched)}
                              className="text-xs h-7.5 px-2 font-bold text-emerald-700 hover:bg-emerald-50"
                              title="Inscrire manuellement un centre apporteur"
                            >
                              + Inscrire
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSchedule(sched.id, sched.date)}
                              className="text-xs h-7.5 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                              title="Supprimer ce créneau"
                            >
                              Suppr.
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── CONTENU ONGLET 2 (CENTRES) : MES RENDEZ-VOUS RÉSERVÉS ─── */}
        {isCenterUser && (
          <TabsContent value="my-appointments" className="space-y-3 mt-0">
            {myCenterAppointments.length === 0 ? (
              <Card className="p-8 text-center rounded-xl border border-dashed border-border/70">
                <CheckSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="font-bold text-foreground text-sm">Aucun rendez-vous réservé pour le moment</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Consultez l'onglet <strong>« 1. Choisir une Date Disponible »</strong> ci-dessus pour planifier votre prochain dépôt.
                </p>
                <Button 
                  size="sm" 
                  onClick={() => setActiveTab("schedules")} 
                  className="mt-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Prendre mon 1er Rendez-vous
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myCenterAppointments.map((app) => (
                  <Card key={app.id} className="rounded-xl border border-border/70 shadow-2xs overflow-hidden">
                    <div className="p-4 flex items-start justify-between border-b border-border/50 bg-muted/10">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-400">
                            {app.appointment_number}
                          </span>
                          <Badge 
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              app.status === "Confirmé" 
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : app.status === "Effectué"
                                ? "bg-blue-50 text-blue-800 border-blue-300"
                                : "bg-red-50 text-red-800 border-red-300"
                            }`}
                          >
                            {app.status}
                          </Badge>
                        </div>
                        <div className="text-xs font-bold text-foreground mt-1">
                          Passage prévu le {app.date} ({app.time_slot})
                        </div>
                      </div>

                      <Badge variant="outline" className="text-xs font-semibold">
                        {app.type}
                      </Badge>
                    </div>

                    <div className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Établissement :</span>
                        <span className="font-bold text-foreground">{app.center_name}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Apporteur / Transporteur :</span>
                        <span className="font-semibold text-foreground">{app.depositor_name}</span>
                      </div>
                      {app.estimated_quantity && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Quantité estimée :</span>
                          <span className="font-semibold text-foreground">{app.estimated_quantity}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Contact :</span>
                        <span className="font-mono text-foreground">{app.contact_phone}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTicketAppointment(app)}
                        className="text-xs font-semibold gap-1.5 h-8 text-blue-700 hover:bg-blue-50"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Récépissé Officiel
                      </Button>

                      {app.status === "Confirmé" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelApp(app)}
                          className="text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 h-8"
                        >
                          Annuler ce RDV
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* ─── CONTENU ONGLET 2 (AGENTS ABMED) : TOUS LES RENDEZ-VOUS PRIS ─── */}
        {!isCenterUser && (
          <TabsContent value="appointments" className="space-y-3 mt-0">
            <Card className="rounded-xl border border-border/60 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-muted-foreground h-9">N° RDV</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground h-9">Date & Créneau</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground h-9">Centre Apporteur</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground h-9">Type d'apport</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground h-9">Dépositaire</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground h-9 text-center">Statut</TableHead>
                      <TableHead className="text-xs font-bold text-muted-foreground h-9 text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                          Aucun rendez-vous trouvé selon vos critères de recherche.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAppointments.map((app) => (
                        <TableRow key={app.id} className="hover:bg-muted/30 transition-colors text-xs">
                          <TableCell className="py-2.5 font-mono font-bold text-blue-700 dark:text-blue-400">
                            {app.appointment_number}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="font-semibold text-foreground">{app.date}</div>
                            <div className="text-[10px] text-muted-foreground">{app.time_slot}</div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="font-bold text-foreground leading-tight">{app.center_name}</div>
                            <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                              {app.center_code}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge 
                              variant="outline"
                              className={`text-[10px] ${
                                app.type === "Déchets"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : app.type === "Échantillons"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {app.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="text-foreground font-medium">{app.depositor_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{app.contact_phone}</div>
                          </TableCell>
                          <TableCell className="py-2.5 text-center">
                            <Badge 
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                app.status === "Confirmé" 
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : app.status === "Effectué"
                                  ? "bg-blue-50 text-blue-800 border-blue-300"
                                  : "bg-red-50 text-red-800 border-red-300"
                              }`}
                            >
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 text-right pr-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTicketAppointment(app)}
                                className="h-7 text-xs px-2"
                                title="Voir le récépissé de rendez-vous"
                              >
                                <FileText className="h-3 w-3 text-blue-600" />
                              </Button>

                              {app.status === "Confirmé" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateStatus(app.id, "Effectué")}
                                    className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    title="Marquer comme Effectué (Réception validée)"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelApp(app)}
                                    className="h-7 text-xs px-2 text-red-600 hover:bg-red-50"
                                    title="Annuler le rendez-vous"
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ─── MODAL : PROGRAMMER UNE JOURNÉE DE RÉCEPTION (AGENTS ABMED) ─── */}
      <Dialog open={isCreateScheduleOpen} onOpenChange={setIsCreateScheduleOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Calendar className="h-5 w-5 text-blue-600" />
              Programmer une Journée de Réception
            </DialogTitle>
            <DialogDescription className="text-xs">
              Définissez la date, les types d'apports acceptés et la jauge maximale de centres attendus.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateScheduleSubmit} className="space-y-3.5 py-1 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Date de réception *</Label>
                <Input
                  type="date"
                  value={newScheduleDate}
                  onChange={(e) => setNewScheduleDate(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Capacité (Nombre max centres) *</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={newScheduleCapacity}
                  onChange={(e) => setNewScheduleCapacity(Number(e.target.value))}
                  className="mt-1 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Heure début</Label>
                <Input
                  type="time"
                  value={newScheduleStartTime}
                  onChange={(e) => setNewScheduleStartTime(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Heure fin</Label>
                <Input
                  type="time"
                  value={newScheduleEndTime}
                  onChange={(e) => setNewScheduleEndTime(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Type de réception admis *</Label>
              <Select 
                value={newScheduleType} 
                onValueChange={(val: any) => setNewScheduleType(val)}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Déchets pharmaceutiques" className="text-xs">
                    Déchets pharmaceutiques (médicaments périmés, réactifs...)
                  </SelectItem>
                  <SelectItem value="Échantillons pharmaceutiques" className="text-xs">
                    Échantillons pharmaceutiques (contrôle qualité LNC)
                  </SelectItem>
                  <SelectItem value="Mixte (Échantillons & Déchets)" className="text-xs">
                    Mixte (Échantillons & Déchets pharmaceutiques)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Lieu / Guichet de déchargement</Label>
              <Input
                value={newScheduleLocation}
                onChange={(e) => setNewScheduleLocation(e.target.value)}
                placeholder="Ex: Magasin Déchets ABMed — Quai N°1"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold">Consignes particulières pour les centres</Label>
              <Textarea
                value={newScheduleInstructions}
                onChange={(e) => setNewScheduleInstructions(e.target.value)}
                rows={2}
                placeholder="Bordereau signé, conditionnement exigé..."
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateScheduleOpen(false)} className="text-xs">
                Annuler
              </Button>
              <Button type="submit" size="sm" className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                Ouvrir ce Créneau
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL : RÉSERVER UN RENDEZ-VOUS (CENTRES OU AGENT SUR SITE) ─── */}
      <Dialog open={isBookModalOpen} onOpenChange={setIsBookModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <CheckSquare className="h-5 w-5 text-emerald-600" />
              Réserver votre Place de Réception
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedSchedule && (
                <span>
                  Journée du <strong>{selectedSchedule.date}</strong> ({selectedSchedule.start_time} - {selectedSchedule.end_time}).
                  Places restantes : <strong className="text-emerald-700 font-bold">{Math.max(0, selectedSchedule.max_capacity - selectedSchedule.booked_count)}</strong>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmBooking} className="space-y-3.5 py-1 text-xs">
            {/* Si c'est un agent ABMeD qui inscrit manuellement un centre */}
            {!isCenterUser && (
              <div>
                <Label className="text-xs font-bold">Sélectionner le Centre Apporteur *</Label>
                <Select value={selectedCenterForAgent} onValueChange={(val) => setSelectedCenterForAgent(val || "")}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Choisir un centre apporteur..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {centers.map((c) => (
                      <SelectItem key={c.id} value={c.center_code} className="text-xs">
                        {c.name} ({c.center_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isCenterUser && userCenter && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200 text-xs">
                <span className="text-muted-foreground text-[10px] uppercase font-bold">Votre Établissement :</span>
                <div className="font-bold text-foreground text-sm">{userCenter.name}</div>
                <div className="font-mono text-emerald-700 font-bold text-xs">{userCenter.center_code} — {userCenter.city}</div>
              </div>
            )}

            <div>
              <Label className="text-xs font-bold">Nature du dépôt apporté *</Label>
              <Select value={bookType} onValueChange={(val: any) => setBookType(val)}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Déchets" className="text-xs">Déchets pharmaceutiques (médicaments périmés)</SelectItem>
                  <SelectItem value="Échantillons" className="text-xs">Échantillons pharmaceutiques (analyse LNC)</SelectItem>
                  <SelectItem value="Mixte" className="text-xs">Dépôt mixte (Échantillons et Déchets)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Volume / Quantité estimée</Label>
              <Input
                value={bookEstimatedQty}
                onChange={(e) => setBookEstimatedQty(e.target.value)}
                placeholder="Ex: 3 cartons (~15 kg) ou 5 flacons"
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Nom du transporteur / livreur *</Label>
                <Input
                  value={bookDepositorName}
                  onChange={(e) => setBookDepositorName(e.target.value)}
                  placeholder="Ex: KOUTON Jean"
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Téléphone de contact *</Label>
                <Input
                  value={bookDepositorPhone}
                  onChange={(e) => setBookDepositorPhone(e.target.value)}
                  placeholder="Ex: 01 97 00 00 00"
                  className="mt-1 text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Observations ou précisions</Label>
              <Textarea
                value={bookObservations}
                onChange={(e) => setBookObservations(e.target.value)}
                rows={2}
                placeholder="Précisions éventuelles sur l'état des colis..."
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBookModalOpen(false)} className="text-xs">
                Annuler
              </Button>
              <Button type="submit" size="sm" className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                Confirmer la Réservation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL : VOIR LES CENTRES INSCRITS SUR UNE SESSION (ABMED) ─── */}
      <Dialog open={isInspectModalOpen} onOpenChange={setIsInspectModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Users className="h-5 w-5 text-blue-600" />
              Centres inscrits pour le {inspectedSchedule?.date}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Capacité : {inspectedSchedule?.booked_count} / {inspectedSchedule?.max_capacity} centres inscrits.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
            {inspectedSchedule && appointments.filter((a) => a.schedule_id === inspectedSchedule.id && a.status !== "Annulé").length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">
                Aucun centre n'a encore réservé sur cette journée.
              </p>
            ) : (
              inspectedSchedule && appointments
                .filter((a) => a.schedule_id === inspectedSchedule.id && a.status !== "Annulé")
                .map((a) => (
                  <div key={a.id} className="p-3 bg-muted/30 rounded-xl border border-border/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-foreground">{a.center_name}</div>
                      <div className="text-[10px] font-mono text-emerald-700 font-bold">{a.center_code}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Dépositaire : {a.depositor_name} ({a.contact_phone})
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {a.type}
                    </Badge>
                  </div>
                ))
            )}
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setIsInspectModalOpen(false)} className="text-xs">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL : TICKET / RÉCÉPISSÉ DE RENDEZ-VOUS IMPRIMABLE ─── */}
      <Dialog open={!!ticketAppointment} onOpenChange={(open) => !open && setTicketAppointment(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          {ticketAppointment && (
            <div className="space-y-4 py-1 text-xs">
              {/* Entête officielle */}
              <div className="text-center border-b border-border/60 pb-3">
                <div className="inline-flex p-2 rounded-full bg-emerald-100 text-emerald-800 mb-1.5">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="font-black text-sm text-foreground tracking-tight">
                  AGENCE BÉNINOISE DU MÉDICAMENT (ABMeD)
                </h3>
                <p className="text-[10px] font-bold text-emerald-700 uppercase">
                  Récépissé Officiel de Rendez-vous de Dépôt
                </p>
              </div>

              {/* N° et Date */}
              <div className="bg-muted/40 p-3 rounded-xl border border-border/60 space-y-1.5 text-center">
                <div className="text-[10px] text-muted-foreground uppercase font-bold">N° Rendez-vous</div>
                <div className="text-lg font-mono font-black text-blue-700 dark:text-blue-400">
                  {ticketAppointment.appointment_number}
                </div>
                <div className="text-xs font-bold text-foreground">
                  Date : {ticketAppointment.date} ({ticketAppointment.time_slot})
                </div>
              </div>

              {/* Détails du centre */}
              <div className="space-y-1.5 p-3 rounded-xl border border-border/50 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Centre :</span>
                  <span className="font-bold text-foreground">{ticketAppointment.center_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Identifiant Unique :</span>
                  <span className="font-mono font-bold text-emerald-700">{ticketAppointment.center_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nature de l'apport :</span>
                  <span className="font-semibold text-foreground">{ticketAppointment.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dépositaire mandaté :</span>
                  <span className="font-semibold text-foreground">{ticketAppointment.depositor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Téléphone :</span>
                  <span className="font-mono text-foreground">{ticketAppointment.contact_phone}</span>
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 text-[10px] text-amber-900 dark:text-amber-300">
                ⚠️ <strong>Consigne :</strong> Veuillez vous présenter muni de ce récépissé (ou sur smartphone) ainsi que de vos bordereaux de déclaration dûment signés.
              </div>

              <DialogFooter className="pt-2 flex justify-between gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.print()} 
                  className="text-xs font-bold gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimer ce Ticket
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => setTicketAppointment(null)} 
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Fermer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
