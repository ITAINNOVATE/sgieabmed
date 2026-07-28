"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  ShieldCheck, Lock, User, Eye, EyeOff, QrCode, HelpCircle, 
  ChevronDown, Phone, Mail, Headphones, Shield, Package, Trash2, BarChart3, FlaskConical, Beaker
} from "lucide-react"
import { login } from "./actions/auth"
import Image from "next/image"
import dynamic from "next/dynamic"

const QRCodeScannerDialog = dynamic(
  () => import("@/components/qrcode-scanner-dialog").then((mod) => mod.QRCodeScannerDialog),
  { ssr: false }
)

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-background overflow-x-hidden font-sans">
      
      {/* ─── CÔTÉ GAUCHE (ROUGE MOCKUP) : PRÉSENTATION INSTITUTIONNELLE ABMED ─── */}
      <div className="lg:w-[58%] bg-white dark:bg-card p-6 lg:p-10 flex flex-col justify-between border-r border-border/60 relative">
        
        {/* LOGO ABMED EN HAUT À GAUCHE */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#003B5C] flex items-center justify-center text-white shadow-md shrink-0">
            <FlaskConical className="h-7 w-7 text-[#00A86B]" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-2xl tracking-tight text-[#003B5C] leading-none">
              ABMed
            </span>
            <span className="text-[9.5px] font-extrabold uppercase text-[#003B5C]/80 tracking-wider leading-tight mt-0.5">
              AGENCE BÉNINOISE DU MÉDICAMENT ET DES AUTRES PRODUITS DE SANTÉ
            </span>
          </div>
        </div>

        {/* CONTENU CENTRAL : TITRE eGED & CARACTÉRISTIQUES */}
        <div className="my-8 lg:my-10 space-y-6">
          
          {/* GRANDE EN-TÊTE eGED */}
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-foreground">
              <span className="text-[#1B5C2E]">eGED</span>
            </h1>
            <h2 className="text-lg lg:text-xl font-bold text-foreground/90 leading-snug">
              Gestion électronique des échantillons et des déchets pharmaceutiques
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl font-normal pt-1">
              Une solution digitale sécurisée pour la traçabilité, la conservation et la gestion optimale des échantillons et des déchets pharmaceutiques.
            </p>
          </div>

          {/* GRILLE : IMAGE HÉRO & 4 PILIERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
            
            {/* IMAGE DÉMO LABORATOIRE / ENTREPÔT */}
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-lg group bg-slate-100 aspect-4/3">
              <Image 
                src="/abmed_hero.png" 
                alt="Gestion des échantillons et déchets ABMed"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#00A86B]" />
                <span>Traçabilité & Stockage Securisé</span>
              </div>
            </div>

            {/* LISTE DES 4 CARACTÉRISTIQUES */}
            <div className="space-y-3">
              
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border/40">
                <div className="p-2 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E] shrink-0 mt-0.5">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">TRAÇABILITÉ</h4>
                  <p className="text-[11.5px] text-muted-foreground leading-snug">Suivi en temps réel de chaque échantillon</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border/40">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 shrink-0 mt-0.5">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">GESTION OPTIMISÉE</h4>
                  <p className="text-[11.5px] text-muted-foreground leading-snug">Organisation et conservation efficaces</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border/40">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-600 shrink-0 mt-0.5">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">CONFORMITÉ</h4>
                  <p className="text-[11.5px] text-muted-foreground leading-snug">Respect des normes et réglementations PSQIF</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-muted/40 border border-slate-100 dark:border-border/40">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 shrink-0 mt-0.5">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">TABLEAUX DE BORD</h4>
                  <p className="text-[11.5px] text-muted-foreground leading-snug">Indicateurs et rapports en temps réel</p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* PIED DE PAGE CÔTÉ INSTITUTIONNEL */}
        <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center text-[11px] text-muted-foreground gap-2">
          <div className="flex items-center gap-2 font-bold text-[#1B5C2E]">
            <ShieldCheck className="h-4 w-4" />
            <span>QUALITÉ • SÉCURITÉ • TRAÇABILITÉ AU SERVICE DE LA SANTÉ PUBLIQUE</span>
          </div>
          <span>© 2026 ABMed — Tous droits réservés</span>
        </div>

      </div>


      {/* ─── CÔTÉ DROIT (JAUNE MOCKUP) : FORMULAIRE DE CONNEXION ─── */}
      <div className="lg:w-[42%] bg-slate-50 dark:bg-background p-6 lg:p-12 flex flex-col justify-between items-center relative">
        
        {/* BANDEAU EN HAUT À DROIT (AIDE & LANGUE) */}
        <div className="w-full flex justify-end items-center gap-4 text-xs font-medium text-muted-foreground">
          <button className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer">
            <HelpCircle className="h-4 w-4" />
            <span>Aide</span>
          </button>
          <div className="flex items-center gap-1 bg-card border border-border px-2.5 py-1 rounded-lg text-foreground font-semibold cursor-pointer">
            <span>FR</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* CARTE DE CONNEXION PRINCIPALE */}
        <div className="w-full max-w-md my-auto py-8">
          
          <div className="bg-card border border-border/80 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6">
            
            {/* AVATAR D'EN-TÊTE */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-[#1B5C2E]/10 border-2 border-[#1B5C2E]/20 flex items-center justify-center text-[#1B5C2E] shadow-sm mb-1">
                <User className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tight">Bienvenue</h3>
              <p className="text-xs text-muted-foreground font-medium">
                Connectez-vous à votre espace <span className="font-bold text-foreground">eGED</span>
              </p>
            </div>

            {/* MESSAGE D'ERREUR EVENTUEL */}
            {searchParams?.error && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 text-xs font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0 text-red-600" />
                <span>{Array.isArray(searchParams.error) ? searchParams.error[0] : searchParams.error}</span>
              </div>
            )}

            {/* FORMULAIRE */}
            <form action={login} className="space-y-4">
              
              {/* NOM D'UTILISATEUR */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">Nom d'utilisateur / Email</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    name="email" 
                    type="text" 
                    defaultValue="admin@sgie.com" 
                    placeholder="Nom d'utilisateur" 
                    required 
                    className="pl-10 h-10 text-xs bg-background rounded-xl border-border focus-visible:ring-[#1B5C2E]" 
                  />
                </div>
              </div>

              {/* MOT DE PASSE */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-foreground">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-10 text-xs bg-background rounded-xl border-border focus-visible:ring-[#1B5C2E]" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* OPTION : SE SOUVENIR DE MOI & MOT DE PASSE OUBLIÉ */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" className="rounded-md" />
                  <label htmlFor="remember" className="font-medium text-muted-foreground leading-none cursor-pointer">
                    Se souvenir de moi
                  </label>
                </div>
                <a href="#" className="font-semibold text-[#1B5C2E] hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>

              {/* BOUTON SE CONNECTER (VERT FORET INSTITUTIONNEL) */}
              <Button 
                type="submit" 
                className="w-full bg-[#1B5C2E] hover:bg-[#154824] text-white font-bold h-11 rounded-xl shadow-md hover:shadow-lg transition-all text-sm mt-2 cursor-pointer"
              >
                Se connecter
              </Button>

            </form>

            {/* SEPARATEUR OU */}
            <div className="relative flex items-center justify-center my-4">
              <span className="w-full border-t border-border"></span>
              <span className="absolute bg-card px-3 text-[11px] font-bold text-muted-foreground uppercase">OU</span>
            </div>

            {/* BOUTON SCANNER QR CODE */}
            <Button 
              type="button"
              variant="outline"
              onClick={() => setIsScannerOpen(true)}
              className="w-full h-10 rounded-xl border-border text-xs font-semibold gap-2 bg-background hover:bg-muted cursor-pointer"
            >
              <QrCode className="h-4 w-4 text-[#1B5C2E]" />
              Scanner un QR code
            </Button>

          </div>

          {/* BOX BESOIN D'ASSISTANCE AU PIED DU FORMULAIRE */}
          <div className="mt-6 p-4 rounded-2xl bg-card border border-border/70 shadow-xs flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-[#1B5C2E]/10 text-[#1B5C2E] shrink-0">
                <Headphones className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground">Besoin d'assistance ?</span>
                <span className="text-[11px] text-muted-foreground">Contactez l'administrateur ou le support eGED.</span>
              </div>
            </div>
            <div className="flex flex-col text-[11px] text-right font-medium text-muted-foreground shrink-0 space-y-0.5">
              <span className="flex items-center gap-1 justify-end"><Phone className="h-3 w-3 text-[#1B5C2E]" /> +229 21 30 00 00</span>
              <span className="flex items-center gap-1 justify-end"><Mail className="h-3 w-3 text-[#1B5C2E]" /> support@abmed.bj</span>
            </div>
          </div>

        </div>

        {/* PIED DE PAGE DROIT */}
        <div className="w-full text-center text-[11px] text-muted-foreground flex items-center justify-center gap-2">
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
