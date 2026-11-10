"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { 
  Building2, ShieldCheck, MapPin, User, Phone, Mail, Lock, 
  Eye, EyeOff, CheckCircle2, ArrowRight, CalendarDays, AlertCircle, 
  HelpCircle, ChevronLeft, Sparkles, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  saveCenter, 
  generateNextCenterCode, 
  getRegisteredCenters, 
  CENTER_TYPES,
  Center
} from "@/utils/centers-storage"
import { 
  setCurrentUser, 
  User as AdminUser, 
  recordLoginLog, 
  recordAuditLog 
} from "@/app/dashboard/admin/adminMockData"

const BENIN_CITIES = [
  "Cotonou",
  "Porto-Novo",
  "Abomey-Calavi",
  "Parakou",
  "Ouidah",
  "Bohicon",
  "Abomey",
  "Natitingou",
  "Djougou",
  "Lokossa",
  "Kandi",
  "Allada",
  "Pobè",
  "Sèmè-Kpodji",
  "Comè",
  "Autre commune",
]

export default function RegisterPortalPage() {
  const router = useRouter()

  // Form states
  const [structureName, setStructureName] = useState("")
  const [centerType, setCenterType] = useState("")
  const [ifuNumber, setIfuNumber] = useState("")
  const [city, setCity] = useState("")
  const [customCity, setCustomCity] = useState("")
  const [address, setAddress] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(true)

  // Submission state
  const [loading, setLoading] = useState(false)
  const [createdCenter, setCreatedCenter] = useState<Center | null>(null)
  const [redirectCountdown, setRedirectCountdown] = useState(3)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!structureName.trim()) {
      toast.error("Veuillez renseigner le nom officiel de votre établissement.")
      return
    }

    if (!centerType) {
      toast.error("Veuillez sélectionner la catégorie d'établissement.")
      return
    }

    if (!city) {
      toast.error("Veuillez sélectionner la ville ou commune.")
      return
    }

    if (city === "Autre commune" && !customCity.trim()) {
      toast.error("Veuillez préciser le nom de votre commune.")
      return
    }

    if (!contactPerson.trim()) {
      toast.error("Veuillez renseigner le nom du responsable ou contact référent.")
      return
    }

    if (!phone.trim()) {
      toast.error("Veuillez indiquer un numéro de téléphone joignable (mobile / WhatsApp).")
      return
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Veuillez renseigner une adresse email valide.")
      return
    }

    if (!password || password.length < 6) {
      toast.error("Le mot de passe doit comporter au moins 6 caractères.")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe saisis ne sont pas identiques.")
      return
    }

    if (!acceptTerms) {
      toast.error("Veuillez accepter l'engagement de conformité pour continuer.")
      return
    }

    setLoading(true)

    try {
      const selectedCity = city === "Autre commune" ? (customCity.trim() || "Bénin") : city

      // 1. Enregistrement du nouveau centre
      const newCenterData: Partial<Center> = {
        name: structureName.trim(),
        center_type: centerType,
        ifu_number: ifuNumber.trim(),
        city: selectedCity,
        country: "Bénin",
        address: address.trim(),
        contact_person: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        account_status: "Actif",
      }

      const saved = await saveCenter(newCenterData)
      setCreatedCenter(saved)

      // 2. Création et connexion automatique de la session utilisateur
      const centerUser: AdminUser = {
        id: saved.id,
        first_name: saved.name,
        last_name: "",
        matricule: saved.center_code,
        fonction: `Responsable - ${saved.name}`,
        department_id: "dept-center-partner",
        role: "Centre Apporteur",
        phone: saved.phone || "",
        email: saved.email || "",
        username: saved.center_code,
        photo_url: "/avatar.png",
        status: "Actif",
        created_at: saved.created_at,
        last_login: new Date().toISOString(),
        mfa_enabled: false,
        login_attempts: 0,
        locked_until: null,
        must_change_password: false,
      }

      setCurrentUser(centerUser)

      // Cookie de session Next.js
      if (typeof document !== "undefined") {
        document.cookie = `eged_user_logged=true; path=/; max-age=86400; SameSite=Lax`
      }

      // Traces d'audit
      recordLoginLog(saved.center_code, "Connexion")
      recordAuditLog(
        "Inscription Centre",
        "Partenaires",
        `Enregistrement du centre ${saved.name} avec le code ${saved.center_code}`,
        saved.name
      )

      toast.success(`Établissement enregistré ! Code attribué : ${saved.center_code}`)

      // Lancement du compte à rebours de redirection
      let count = 3
      const interval = setInterval(() => {
        count -= 1
        setRedirectCountdown(count)
        if (count <= 0) {
          clearInterval(interval)
          router.push(`/dashboard/appointments?registered=true&code=${encodeURIComponent(saved.center_code)}`)
        }
      }, 1000)

    } catch (err: any) {
      console.error("Erreur enregistrement centre:", err)
      toast.error("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.")
      setLoading(false)
    }
  }

  const handleImmediateRedirect = () => {
    if (createdCenter) {
      router.push(`/dashboard/appointments?registered=true&code=${encodeURIComponent(createdCenter.center_code)}`)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-slate-100/60 to-emerald-50/20 dark:from-background dark:via-background dark:to-background text-foreground flex flex-col justify-between">
      
      {/* ─── EN-TÊTE INSTITUTIONNEL OFFICIEL ─── */}
      <header className="bg-[#003B5C] text-white border-b border-border/40 shadow-xs sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="bg-white rounded-lg p-1 px-2.5 flex items-center justify-center hover:opacity-95 transition-opacity">
              <Image 
                src="/logoeGED.png" 
                alt="Logo eGED - ABMeD" 
                width={130} 
                height={40} 
                className="h-8 w-auto object-contain"
                priority 
              />
            </Link>
            <div className="hidden md:flex flex-col border-l border-white/20 pl-3">
              <span className="text-xs font-bold tracking-tight text-white uppercase">
                Agence Béninoise du Médicament (ABMeD)
              </span>
              <span className="text-[10.5px] text-emerald-200 font-medium">
                Portail National de Dépôt d&apos;Échantillons &amp; Déchets Pharmaceutiques
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              href="/"
              className="text-xs font-semibold text-white/90 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Connexion classique</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── CONTENU PRINCIPAL ─── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 sm:py-10">
        
        {/* SUCCÈS & REDIRECTION IMMÉDIATE */}
        {createdCenter ? (
          <Card className="border-emerald-500/40 shadow-xl bg-card overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-emerald-600 to-[#1B5C2E] p-6 text-white text-center space-y-2">
              <div className="h-16 w-16 mx-auto rounded-full bg-white/20 flex items-center justify-center backdrop-blur-xs">
                <CheckCircle2 className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">
                Enregistrement Confirmé avec Succès !
              </h2>
              <p className="text-xs text-emerald-100 max-w-lg mx-auto">
                Votre structure est désormais officiellement enregistrée auprès de l&apos;ABMeD.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-center space-y-2">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Votre Code Identifiant Officiel
                </span>
                <div className="text-3xl sm:text-4xl font-mono font-black text-emerald-700 dark:text-emerald-400 tracking-wider">
                  {createdCenter.center_code}
                </div>
                <p className="text-xs text-muted-foreground font-medium pt-1">
                  Établissement : <strong className="text-foreground">{createdCenter.name}</strong> ({createdCenter.city})
                  {createdCenter.ifu_number && (
                    <span className="ml-2 font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                      — IFU : {createdCenter.ifu_number}
                    </span>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <User className="h-4 w-4 text-emerald-600" />
                    <span>Contact Référent</span>
                  </div>
                  <p className="text-muted-foreground">{createdCenter.contact_person}</p>
                  <p className="text-muted-foreground font-mono">{createdCenter.phone}</p>
                </div>

                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <Mail className="h-4 w-4 text-emerald-600" />
                    <span>Identifiant de Connexion</span>
                  </div>
                  <p className="font-mono text-foreground font-semibold">{createdCenter.center_code}</p>
                  <p className="text-muted-foreground">{createdCenter.email}</p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
                <CalendarDays className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Orientation automatique vers la Réservation de RDV</p>
                  <p className="text-[11.5px] text-blue-800 dark:text-blue-300 leading-relaxed">
                    Vous êtes redirigé vers le calendrier pour sélectionner votre date d&apos;accueil et réserver votre créneau de dépôt.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Redirection dans <strong>{redirectCountdown}s</strong>...
                </span>
                <Button 
                  onClick={handleImmediateRedirect}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 rounded-xl shadow-xs gap-2 text-xs cursor-pointer"
                >
                  <span>Accéder immédiatement aux Rendez-vous</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ─── FORMULAIRE D'ENREGISTREMENT ─── */
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* EN-TÊTE TITRE */}
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300 font-semibold px-3 py-1 text-xs">
                <Sparkles className="h-3 w-3 mr-1 text-emerald-600" />
                Accréditation &amp; Dépôt Officiel
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Enregistrement de votre Établissement
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Remplissez le formulaire ci-dessous pour créer votre profil apporteur. Après enregistrement, vous serez immédiatement orienté vers la réservation de votre créneau de rendez-vous auprès de l&apos;ABMeD.
              </p>
            </div>

            <Card className="border-border/80 shadow-lg bg-card">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Fiche d&apos;Identification de la Structure
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Toutes les informations restent strictement confidentielles et réservées aux services de l&apos;ABMeD.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-7">
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* BLOC 1 : IDENTITÉ DE L'ÉTABLISSEMENT */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                      1. Identité de l&apos;établissement
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* NOM DU CENTRE */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="structureName" className="text-xs font-bold">
                          Nom officiel de l&apos;établissement / Raison sociale <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="structureName"
                          value={structureName}
                          onChange={(e) => setStructureName(e.target.value)}
                          required
                          className="h-10 text-xs rounded-xl"
                        />
                      </div>

                      {/* TYPE D'ÉTABLISSEMENT */}
                      <div className="space-y-1.5">
                        <Label htmlFor="centerType" className="text-xs font-bold">
                          Catégorie d&apos;établissement <span className="text-red-500">*</span>
                        </Label>
                        <Select value={centerType} onValueChange={(v) => v && setCenterType(v)}>
                          <SelectTrigger id="centerType" className="h-10 text-xs rounded-xl">
                            <SelectValue placeholder="Sélectionnez la catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {CENTER_TYPES.map((t) => (
                              <SelectItem key={t} value={t} className="text-xs">
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* NUMÉRO IFU */}
                      <div className="space-y-1.5">
                        <Label htmlFor="ifuNumber" className="text-xs font-bold flex items-center justify-between">
                          <span>Numéro IFU de la structure</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Identifiant Fiscal Unique</span>
                        </Label>
                        <Input
                          id="ifuNumber"
                          value={ifuNumber}
                          onChange={(e) => setIfuNumber(e.target.value)}
                          placeholder="Ex : 0202112345678"
                          maxLength={25}
                          className="h-10 text-xs rounded-xl font-mono"
                        />
                      </div>

                      {/* VILLE / COMMUNE */}
                      <div className="space-y-1.5">
                        <Label htmlFor="city" className="text-xs font-bold">
                          Ville / Commune <span className="text-red-500">*</span>
                        </Label>
                        <Select value={city} onValueChange={(v) => v && setCity(v)}>
                          <SelectTrigger id="city" className="h-10 text-xs rounded-xl">
                            <SelectValue placeholder="Sélectionnez la ville" />
                          </SelectTrigger>
                          <SelectContent>
                            {BENIN_CITIES.map((c) => (
                              <SelectItem key={c} value={c} className="text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* COMMUNE PERSONNALISÉE SI AUTRE */}
                      {city === "Autre commune" && (
                        <div className="space-y-1.5 sm:col-span-2 animate-in fade-in duration-200">
                          <Label htmlFor="customCity" className="text-xs font-bold">
                            Précisez votre commune <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="customCity"
                            value={customCity}
                            onChange={(e) => setCustomCity(e.target.value)}
                            required
                            className="h-10 text-xs rounded-xl"
                          />
                        </div>
                      )}

                      {/* ADRESSE GÉOGRAPHIQUE */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="address" className="text-xs font-bold">
                          Adresse géographique précise / Quartier / Rue
                        </Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="pl-9 h-10 text-xs rounded-xl"
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* BLOC 2 : CONTACT & REPRÉSENTANT RÉFÉRENT */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                      <User className="h-3.5 w-3.5 text-emerald-600" />
                      2. Contact référent &amp; Coordonnées
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* RESPONSABLE */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="contactPerson" className="text-xs font-bold">
                          Nom &amp; Prénom du responsable / déposant habilité <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            id="contactPerson"
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.target.value)}
                            required
                            className="pl-9 h-10 text-xs rounded-xl"
                          />
                        </div>
                      </div>

                      {/* TÉLÉPHONE (WHATSAPP/SMS) */}
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-bold">
                          Téléphone mobile / WhatsApp <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            className="pl-9 h-10 text-xs rounded-xl"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Utilisé pour les confirmations de rendez-vous.
                        </span>
                      </div>

                      {/* EMAIL */}
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-bold">
                          Adresse Email officielle <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-9 h-10 text-xs rounded-xl"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Servira à recevoir vos récépissés et attestations.
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* BLOC 3 : MOT DE PASSE DE CONNEXION */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                      <Lock className="h-3.5 w-3.5 text-emerald-600" />
                      3. Sécurité de votre compte
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* MOT DE PASSE */}
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-xs font-bold">
                          Mot de passe <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disableUppercase
                            allowMixedCase
                            className="pl-9 pr-9 h-10 text-xs rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                          >
                            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* CONFIRMATION */}
                      <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-xs font-bold">
                          Confirmer le mot de passe <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disableUppercase
                            allowMixedCase
                            className="pl-9 pr-9 h-10 text-xs rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label={showConfirmPassword ? "Masquer la confirmation" : "Afficher la confirmation"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        {confirmPassword && (
                          <div className="flex items-center gap-1.5 text-[11px] pt-1">
                            <span className={`h-1.5 w-1.5 rounded-full ${password === confirmPassword ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            <span className={password === confirmPassword ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-red-600 font-medium'}>
                              {password === confirmPassword ? "Mots de passe identiques" : "Les mots de passe ne correspondent pas"}
                            </span>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* ENGAGEMENT & CONFORMITÉ */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span className="text-[11px] text-muted-foreground leading-relaxed">
                        Je certifie sur l&apos;honneur l&apos;exactitude des informations renseignées ci-dessus et m&apos;engage à respecter les consignes de conditionnement et de sécurité de l&apos;ABMeD lors du dépôt de nos échantillons ou déchets pharmaceutiques.
                      </span>
                    </label>
                  </div>

                  {/* BOUTON DE SOUMISSION */}
                  <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-muted-foreground">
                      Déjà enregistré ?{" "}
                      <Link href="/" className="font-bold text-emerald-600 hover:underline">
                        Se connecter
                      </Link>
                    </span>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto bg-[#1B5C2E] hover:bg-[#154824] text-white font-bold h-11 px-7 rounded-xl shadow-md gap-2 text-xs cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Enregistrement en cours...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          <span>Enregistrer mon établissement &amp; Réserver un RDV</span>
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>

                </form>
              </CardContent>
            </Card>

            {/* ASSISTANCE */}
            <div className="p-4 rounded-xl bg-card border border-border/70 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Une question sur votre accréditation ?</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Le secrétariat de l&apos;ABMeD vous accompagne du lundi au vendredi de 08h00 à 17h30.
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-4">
                <span className="font-semibold text-foreground">+229 21 30 00 00</span>
                <span>•</span>
                <span className="font-semibold text-foreground">support@abmed.bj</span>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ─── PIED DE PAGE INSTITUTIONNEL ─── */}
      <footer className="border-t border-border bg-white dark:bg-card/50 py-3.5 px-4 text-[11px] text-muted-foreground text-center">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} Agence Béninoise du Médicament (ABMeD) — République du Bénin
          </span>
          <span className="text-[#1B5C2E] font-bold">
            eGED - Portail National Établissements Partenaires
          </span>
        </div>
      </footer>

    </div>
  )
}
