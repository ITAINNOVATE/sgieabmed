"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  ShieldCheck, Lock, User, Eye, EyeOff, QrCode, HelpCircle, 
  ChevronDown, Phone, Mail, Headphones, Shield, Package, Trash2, BarChart3
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
    <div className="flex flex-col lg:flex-row h-screen max-h-screen w-full bg-background overflow-hidden font-sans">
      
      {/* ─── CÔTÉ GAUCHE : PRÉSENTATION INSTITUTIONNELLE ABMED & eGED (STATIQUE 1-ÉCRAN) ─── */}
      <div className="lg:w-[58%] bg-white dark:bg-card p-4 lg:p-6 flex flex-col justify-between border-r border-border/60 relative overflow-y-auto lg:overflow-hidden">
        
        {/* LOGO OFFICIEL ABMED EN HAUT À GAUCHE */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 flex items-center justify-center">
            <Image 
              src="/logoABMeD.png" 
              alt="Logo ABMed" 
              width={40} 
              height={40} 
              className="h-10 w-10 object-contain" 
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-xl tracking-tight text-[#1B5C2E] dark:text-white leading-none">
              ABMed
            </span>
            <span className="text-[8.5px] font-bold uppercase text-muted-foreground tracking-wider leading-tight mt-0.5">
              AGENCE BÉNINOISE DU MÉDICAMENT ET DES AUTRES PRODUITS DE SANTÉ
            </span>
          </div>
        </div>

        {/* CONTENU CENTRAL : LOGO OFFICIEL eGED & PRÉSENTATION */}
        <div className="my-auto py-2 space-y-4">
          
          {/* LOGO eGED OFFICIEL */}
          <div className="space-y-1.5">
            <div className="h-12 w-auto flex items-center">
              <Image 
                src="/logoeGED.png" 
                alt="Logo eGED" 
                width={220} 
                height={70} 
                className="h-11 w-auto object-contain dark:brightness-0 dark:invert" 
                priority
              />
            </div>
            <h2 className="text-base lg:text-lg font-bold text-foreground leading-snug">
              Gestion électronique des échantillons et des déchets pharmaceutiques
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl font-normal">
              Une solution digitale sécurisée pour la traçabilité, la conservation et la gestion optimale des échantillons et des déchets pharmaceutiques.
            </p>
          </div>

          {/* GRILLE HÉRO & 4 PILIERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-1">
            
            {/* IMAGE DÉMO LABORATOIRE / ENTREPÔT */}
            <div className="relative rounded-xl overflow-hidden border border-border shadow-sm bg-slate-100 aspect-16/10">
              <Image 
                src="/abmed_hero.png" 
                alt="Gestion des échantillons et déchets ABMed"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-2 left-2.5 right-2.5 text-white text-[11px] font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#00A86B]" />
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
                  <p className="text-[10.5px] text-muted-foreground leading-tight">Suivi en temps réel de chaque échantillon</p>
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
                  <p className="text-[10.5px] text-muted-foreground leading-tight">Respect des normes et réglementations PSQIF</p>
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
            {searchParams?.error && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-2 text-xs font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 shrink-0 text-red-600" />
                <span>{Array.isArray(searchParams.error) ? searchParams.error[0] : searchParams.error}</span>
              </div>
            )}

            {/* FORMULAIRE DE CONNEXION */}
            <form action={login} className="space-y-3">
              
              {/* NOM D'UTILISATEUR */}
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">Nom d'utilisateur / Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    id="email" 
                    name="email" 
                    type="text" 
                    defaultValue="admin@sgie.com" 
                    placeholder="Nom d'utilisateur" 
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
                className="w-full bg-[#1B5C2E] hover:bg-[#154824] text-white font-bold h-9 rounded-lg shadow-2xs transition-all text-xs cursor-pointer"
              >
                Se connecter
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
