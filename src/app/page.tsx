"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  ShieldCheck, Lock, User, Eye, EyeOff, QrCode, HelpCircle, 
  ChevronDown, Phone, Mail, Headphones, Shield, Package, Trash2, BarChart3,
  Key, ArrowRight, CheckCircle2, AlertCircle
} from "lucide-react"
import { login } from "./actions/auth"
import { 
  authenticateUser, updateUserPassword, setCurrentUser, 
  User as AdminUser 
} from "@/app/dashboard/admin/adminMockData"
import { toast } from "sonner"
import Image from "next/image"
import dynamic from "next/dynamic"
import { LOGO_ABMED_B64 } from "@/lib/logoabmed-b64"

const QRCodeScannerDialog = dynamic(
  () => import("@/components/qrcode-scanner-dialog").then((mod) => mod.QRCodeScannerDialog),
  { ssr: false }
)

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const router = useRouter()
  const [identifier, setIdentifier] = useState("admin@sgie.com")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Étape première connexion : modification du mot de passe obligatoire
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    try {
      const res = await authenticateUser(identifier, password)
      if (!res.success) {
        setErrorMsg(res.error || "Identifiants invalides.")
        setLoading(false)
        return
      }

      const user = res.user!

      if (res.mustChangePassword) {
        setPendingUser(user)
        setLoading(false)
        toast.info("Première connexion détectée : Veuillez définir votre mot de passe personnel.")
        return
      }

      setCurrentUser(user)
      if (typeof document !== "undefined") {
        document.cookie = `eged_user_logged=true; path=/; max-age=86400; SameSite=Lax`
      }
      toast.success(`Bienvenue, ${user.first_name} ${user.last_name} !`)
      router.push("/dashboard")
    } catch (err: any) {
      setErrorMsg("Une erreur est survenue lors de la connexion.")
      setLoading(false)
    }
  }

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingUser) return

    if (newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit comporter au moins 8 caractères.")
      return
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error("Le mot de passe doit contenir au moins une lettre majuscule et un chiffre.")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les deux mots de passe ne correspondent pas.")
      return
    }

    if (newPassword === password) {
      toast.error("Le nouveau mot de passe doit être différent du mot de passe initial.")
      return
    }

    setChangingPassword(true)

    try {
      await updateUserPassword(pendingUser.username, newPassword)

      const updatedUser: AdminUser = {
        ...pendingUser,
        must_change_password: false,
        password: newPassword,
        last_login: new Date().toISOString()
      }
      delete updatedUser.initial_password
      setCurrentUser(updatedUser)

      if (typeof document !== "undefined") {
        document.cookie = `eged_user_logged=true; path=/; max-age=86400; SameSite=Lax`
      }

      toast.success("Mot de passe enregistré avec succès ! Bienvenue sur eGED.")
      router.push("/dashboard")
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du mot de passe.")
      setChangingPassword(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen max-h-screen w-full bg-background overflow-hidden font-sans">
      
      {/* ─── CÔTÉ GAUCHE : PRÉSENTATION INSTITUTIONNELLE ABMED & eGED (STATIQUE 1-ÉCRAN) ─── */}
      <div className="lg:w-[58%] bg-white dark:bg-card p-4 lg:p-6 flex flex-col justify-between border-r border-border/60 relative overflow-y-auto lg:overflow-hidden">
        
        {/* LOGO OFFICIEL ABMED EN HAUT À GAUCHE */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={LOGO_ABMED_B64}
            alt="Logo ABMed - Agence béninoise du Médicament et des autres produits de Santé" 
            style={{ height: '48px', width: 'auto', maxWidth: '260px', objectFit: 'contain' }}
          />
        </div>

        {/* CONTENU CENTRAL : LOGO OFFICIEL eGED & PRÉSENTATION */}
        <div className="my-auto py-2 space-y-4">

          {/* GRILLE HÉRO & 4 PILIERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-1">
            
            {/* LOGO eGED REMPLAÇANT LA PHOTO */}
            <div className="relative rounded-2xl border border-border/80 shadow-2xs p-4 bg-white dark:bg-card w-full flex flex-col items-center justify-center aspect-16/10 group hover:shadow-md transition-shadow">
              <Image 
                src="/logoeGED.png" 
                alt="eGED - Gestion des échantillons et déchets pharmaceutiques"
                width={320}
                height={110}
                className="h-24 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                priority
              />
              <div className="mt-2 text-[10.5px] font-bold text-[#1B5C2E] dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Traçabilité & Stockage Sécurisé</span>
              </div>
            </div>

            {/* LISTE DES 4 CARACTÉRISTIQUES (COMPACTE) */}
            <div className="space-y-2">
              
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/40 border border-border/40">
                <div className="p-1.5 rounded-md bg-[#1B5C2E]/10 text-[#1B5C2E] shrink-0 mt-0.5">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wide">TRAÇABILITÉ</h4>
                  <p className="text-[10.5px] text-muted-foreground leading-tight">Suivi en temps réel des échantillons et déchets</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/40 border border-border/40">
                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 shrink-0 mt-0.5">
                  <Package className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wide">GESTION OPTIMISÉE</h4>
                  <p className="text-[10.5px] text-muted-foreground leading-tight">Organisation et conservation efficaces</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/40 border border-border/40">
                <div className="p-1.5 rounded-md bg-red-500/10 text-red-600 shrink-0 mt-0.5">
                  <Trash2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wide">CONFORMITÉ</h4>
                  <p className="text-[10.5px] text-muted-foreground leading-tight">Respect des normes et réglementations</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/40 border border-border/40">
                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 shrink-0 mt-0.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wide">TABLEAUX DE BORD</h4>
                  <p className="text-[10.5px] text-muted-foreground leading-tight">Indicateurs et rapports en temps réel</p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* PIED DE PAGE CÔTÉ INSTITUTIONNEL */}
        <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center text-[10.5px] text-muted-foreground gap-1">
          <div className="flex items-center gap-1.5 font-bold text-[#1B5C2E]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>QUALITÉ • SÉCURITÉ • TRAÇABILITÉ AU SERVICE DE LA SANTÉ PUBLIQUE</span>
          </div>
          <span>by SaniNova Consortium</span>
        </div>

      </div>


      {/* ─── CÔTÉ DROIT : FORMULAIRE DE CONNEXION (STATIQUE 1-ÉCRAN) ─── */}
      <div className="lg:w-[42%] bg-slate-50 dark:bg-background p-4 lg:p-6 flex flex-col justify-between items-center relative overflow-hidden">
        
        {/* BANDEAU EN HAUT À DROIT (AIDE & LANGUE) */}
        <div className="w-full flex justify-end items-center gap-3 text-xs font-medium text-muted-foreground">
          <button className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer text-xs">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Aide</span>
          </button>
          <div className="flex items-center gap-1 bg-card border border-border px-2 py-0.5 rounded-md text-foreground font-semibold cursor-pointer text-xs">
            <span>FR</span>
            <ChevronDown className="h-3 w-3" />
          </div>
        </div>

        {/* CARTE DE CONNEXION PRINCIPALE */}
        <div className="w-full max-w-sm my-auto py-2">
          
          <div className="bg-card border border-border/80 shadow-lg rounded-2xl p-5 space-y-4">
            
            {pendingUser ? (
              /* ─── VUE PREMIÈRE CONNEXION : MODIFICATION DU MOT DE PASSE OBLIGATOIRE ─── */
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-2xs mb-0.5">
                    <Key className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-foreground tracking-tight">Première Connexion</h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    Définition obligatoire de votre mot de passe
                  </p>
                </div>

                <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-xs space-y-1">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    Bonjour {pendingUser.first_name} {pendingUser.last_name},
                  </p>
                  <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
                    Votre compte a été initialisé avec un mot de passe temporaire. Vous devez obligatoirement définir votre mot de passe personnel pour accéder à votre espace sécurisé eGED.
                  </p>
                </div>

                <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                  {/* NOUVEAU MOT DE PASSE */}
                  <div className="space-y-1">
                    <Label htmlFor="newPassword" className="text-xs font-semibold text-foreground">
                      Nouveau mot de passe personnel
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        id="newPassword" 
                        type={showNewPassword ? "text" : "password"} 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Au moins 8 caractères"
                        required 
                        className="pl-9 pr-9 h-9 text-xs bg-background rounded-lg border-border focus-visible:ring-[#1B5C2E]" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* CONFIRMER LE MOT DE PASSE */}
                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                      Confirmer le mot de passe
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        id="confirmPassword" 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Répétez le nouveau mot de passe"
                        required 
                        className="pl-9 pr-9 h-9 text-xs bg-background rounded-lg border-border focus-visible:ring-[#1B5C2E]" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* CRITÈRES DE VALIDITÉ */}
                  <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60 text-[10.5px] space-y-1 text-muted-foreground">
                    <span className="font-semibold text-foreground block mb-0.5">Exigences de sécurité :</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}></span>
                      <span className={newPassword.length >= 8 ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>
                        Au moins 8 caractères ({newPassword.length}/8)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}></span>
                      <span className={/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'text-emerald-700 dark:text-emerald-400 font-medium' : ''}>
                        Au moins 1 majuscule et 1 chiffre
                      </span>
                    </div>
                    {confirmPassword && (
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${newPassword === confirmPassword ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <span className={newPassword === confirmPassword ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-red-600'}>
                          {newPassword === confirmPassword ? "Mots de passe identiques" : "Les mots de passe ne correspondent pas"}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    disabled={changingPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                    className="w-full bg-[#1B5C2E] hover:bg-[#154824] text-white font-bold h-9 rounded-lg shadow-2xs transition-all text-xs cursor-pointer"
                  >
                    {changingPassword ? "Enregistrement du mot de passe..." : "Enregistrer et accéder à eGED"}
                  </Button>

                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => { setPendingUser(null); setPassword(""); setNewPassword(""); setConfirmPassword("") }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer"
                  >
                    Retour à l'écran de connexion
                  </Button>
                </form>
              </div>
            ) : (
              /* ─── VUE CONNEXION STANDARD ─── */
              <>
                {/* AVATAR D'EN-TÊTE */}
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="h-12 w-12 rounded-full bg-[#1B5C2E]/10 border border-[#1B5C2E]/20 flex items-center justify-center text-[#1B5C2E] shadow-2xs mb-0.5">
                    <User className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-black text-foreground tracking-tight">Bienvenue</h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    Connectez-vous à votre espace <span className="font-bold text-foreground">eGED</span>
                  </p>
                </div>

                {/* MESSAGE D'ERREUR EVENTUEL */}
                {(errorMsg || searchParams?.error) && (
                  <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-2 text-xs font-medium flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 shrink-0 text-red-600" />
                    <span>{errorMsg || (Array.isArray(searchParams?.error) ? searchParams?.error[0] : searchParams?.error)}</span>
                  </div>
                )}

                {/* FORMULAIRE DE CONNEXION */}
                <form onSubmit={handleLoginSubmit} className="space-y-3">
                  
                  {/* NOM D'UTILISATEUR OU EMAIL */}
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-semibold text-foreground">Nom d'utilisateur / Email</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        id="email" 
                        name="email" 
                        type="text" 
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="ex: admin@sgie.com ou nom d'utilisateur" 
                        required 
                        className="pl-9 h-9 text-xs bg-background rounded-lg border-border focus-visible:ring-[#1B5C2E]" 
                      />
                    </div>
                  </div>

                  {/* MOT DE PASSE */}
                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-xs font-semibold text-foreground">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input 
                        id="password" 
                        name="password" 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                        placeholder="••••••••"
                        className="pl-9 pr-9 h-9 text-xs bg-background rounded-lg border-border focus-visible:ring-[#1B5C2E]" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* OPTION : SE SOUVENIR DE MOI & MOT DE PASSE OUBLIÉ */}
                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <div className="flex items-center space-x-1.5">
                      <Checkbox id="remember" className="rounded-sm h-3.5 w-3.5" />
                      <label htmlFor="remember" className="font-medium text-muted-foreground leading-none cursor-pointer">
                        Se souvenir de moi
                      </label>
                    </div>
                    <a href="#" className="font-semibold text-[#1B5C2E] hover:underline">
                      Mot de passe oublié ?
                    </a>
                  </div>

                  {/* BOUTON SE CONNECTER */}
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-[#1B5C2E] hover:bg-[#154824] text-white font-bold h-9 rounded-lg shadow-2xs transition-all text-xs cursor-pointer"
                  >
                    {loading ? "Vérification..." : "Se connecter"}
                  </Button>

                </form>

                {/* SEPARATEUR OU */}
                <div className="relative flex items-center justify-center my-2">
                  <span className="w-full border-t border-border"></span>
                  <span className="absolute bg-card px-2 text-[10px] font-bold text-muted-foreground uppercase">OU</span>
                </div>

                {/* BOUTON SCANNER QR CODE */}
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setIsScannerOpen(true)}
                  className="w-full h-8.5 rounded-lg border-border text-xs font-semibold gap-1.5 bg-background hover:bg-muted cursor-pointer"
                >
                  <QrCode className="h-3.5 w-3.5 text-[#1B5C2E]" />
                  Scanner un QR code
                </Button>
              </>
            )}

          </div>

          {/* BOX BESOIN D'ASSISTANCE AU PIED DU FORMULAIRE */}
          <div className="mt-3 p-3 rounded-xl bg-card border border-border/70 shadow-2xs flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-[#1B5C2E]/10 text-[#1B5C2E] shrink-0">
                <Headphones className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-[11px]">Besoin d'assistance ?</span>
                <span className="text-[10px] text-muted-foreground">Support eGED / ABMed</span>
              </div>
            </div>
            <div className="flex flex-col text-[10px] text-right font-medium text-muted-foreground shrink-0 space-y-0.5">
              <span className="flex items-center gap-1 justify-end"><Phone className="h-3 w-3 text-[#1B5C2E]" /> +229 21 30 00 00</span>
              <span className="flex items-center gap-1 justify-end"><Mail className="h-3 w-3 text-[#1B5C2E]" /> support@abmed.bj</span>
            </div>
          </div>

        </div>

        {/* PIED DE PAGE DROIT */}
        <div className="w-full text-center text-[10.5px] text-muted-foreground flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3 text-[#1B5C2E]" />
          <span>Accès sécurisé réservé aux utilisateurs autorisés ABMed</span>
        </div>

      </div>

      {/* BOÎTE SCANNER QR CODE */}
      <QRCodeScannerDialog 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />

    </div>
  )
}
