"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShieldCheck, Package, Trash2, BarChart3, 
  ArrowRight, CalendarDays, FileCheck, BookOpen, Building2, CheckCircle2
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { getCurrentUser } from "@/app/dashboard/admin/adminMockData"
import { getRegisteredCentersSync } from "@/utils/centers-storage"

export default function HomePageClient() {
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    setCurrentUser(getCurrentUser())
  }, [])

  const isCenterUser = 
    currentUser?.role === "Centre Apporteur" || 
    currentUser?.matricule?.startsWith("CTR-") || 
    currentUser?.username?.startsWith("CTR-")

  if (isCenterUser) {
    const centerCode = currentUser?.matricule || currentUser?.username || "CTR-XXXX"
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* BANDEAU ACCUEIL CENTRE */}
        <div className="bg-card border border-border/70 rounded-2xl p-4 lg:p-6 shadow-2xs relative overflow-hidden bg-gradient-to-r from-card via-card to-emerald-500/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-8 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-mono font-bold text-xs">
                  {centerCode}
                </Badge>
                <span className="text-xs font-semibold text-muted-foreground">Espace Dédié Partenaire Agréé</span>
              </div>
              <h1 className="text-xl lg:text-2xl font-black text-foreground tracking-tight">
                {currentUser?.first_name || "Établissement Apporteur"}
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Portail officiel de dépôt et traçabilité de vos échantillons et déchets pharmaceutiques auprès de l&apos;Agence Béninoise du Médicament (ABMeD).
              </p>
              
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-8.5 px-4 rounded-xl shadow-xs text-xs font-bold">
                  <Link href="/dashboard/appointments">
                    <CalendarDays className="h-4 w-4" />
                    Prendre un Rendez-vous de Dépôt
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2 h-8.5 px-4 rounded-xl text-xs font-bold">
                  <Link href="/dashboard/center-documents">
                    <FileCheck className="h-4 w-4 text-purple-600" />
                    Mes Attestations & Guides
                  </Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-4 flex items-center justify-center">
              <div className="rounded-2xl border border-border/80 shadow-2xs p-3 bg-white w-full flex items-center justify-center h-28">
                <Image 
                  src="/logoeGED.png" 
                  alt="eGED - Portail Partenaires ABMeD"
                  width={300}
                  height={100}
                  className="h-16 w-auto object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3 PILIERS D'ACCÈS CENTRE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <Card className="rounded-xl border border-border/70 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="space-y-2">
              <div className="p-2.5 w-fit rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Gestion des Rendez-vous</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Consultez en temps réel les journées de réception ouvertes par l&apos;ABMeD avec le nombre de places restantes, et choisissez votre créneau de dépôt.
              </p>
            </div>
            <Button asChild variant="link" className="p-0 h-auto text-xs font-bold text-emerald-700 hover:text-emerald-800 justify-start mt-3">
              <Link href="/dashboard/appointments" className="flex items-center gap-1">
                Accéder aux réservations <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </Card>

          <Card className="rounded-xl border border-border/70 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="space-y-2">
              <div className="p-2.5 w-fit rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40">
                <FileCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Attestations Officielles</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Téléchargez instantanément vos attestations de destruction certifiées par l&apos;ABMeD et vos bordereaux de prise en charge pour vos audits.
              </p>
            </div>
            <Button asChild variant="link" className="p-0 h-auto text-xs font-bold text-purple-700 hover:text-purple-800 justify-start mt-3">
              <Link href="/dashboard/center-documents" className="flex items-center gap-1">
                Consulter mes documents <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </Card>

          <Card className="rounded-xl border border-border/70 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
            <div className="space-y-2">
              <div className="p-2.5 w-fit rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Guides & Réglementation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Accédez aux protocoles nationaux de tri, aux guides OMS/ABMeD et aux formulaires officiels de déclaration préalable.
              </p>
            </div>
            <Button asChild variant="link" className="p-0 h-auto text-xs font-bold text-blue-700 hover:text-blue-800 justify-start mt-3">
              <Link href="/dashboard/center-documents" className="flex items-center gap-1">
                Lire les guides publics <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* ─── BANDEAU SUPÉRIEUR D'ACCUEIL INSTITUTIONNEL (COMPATIBLE JOUR & NUIT) ─── */}
      <div className="bg-card border border-border/70 rounded-2xl p-3 lg:p-3.5 shadow-2xs relative overflow-hidden bg-gradient-to-r from-card via-card to-[#1B5C2E]/10 dark:to-emerald-950/20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
          
          {/* COLONNE GAUCHE : TEXTE & PRESENTATION eGED */}
          <div className="lg:col-span-8 space-y-1.5">

            <div className="space-y-0.5">
              <h1 className="text-lg lg:text-xl font-black text-foreground tracking-tight leading-snug">
                Gestion électronique des échantillons et des déchets pharmaceutiques
              </h1>
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl font-normal">
                Une solution digitale sécurisée pour la traçabilité, la conservation et la gestion optimale des échantillons et des déchets pharmaceutiques.
              </p>
            </div>

            {/* BOUTONS ACCÈS RAPIDES DE LA PAGE D'ACCUEIL */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <Button asChild className="bg-[#1B5C2E] hover:bg-[#154824] text-white gap-1.5 h-7.5 px-3 rounded-lg shadow-2xs text-[11px] font-bold">
                <Link href="/dashboard/analytics">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Tableau de bord Échantillons
                </Link>
              </Button>
              <Button asChild className="bg-red-600 hover:bg-red-700 text-white gap-1.5 h-7.5 px-3 rounded-lg shadow-2xs text-[11px] font-bold border-0">
                <Link href="/dashboard/waste/analytics">
                  <Trash2 className="h-3.5 w-3.5 text-white" />
                  Tableau de bord Déchets
                </Link>
              </Button>
            </div>

          </div>

          {/* COLONNE DROITE : LOGO eGED AUX COULEURS D'ORIGINE (SUR FOND BLANC PROPRE) */}
          <div className="lg:col-span-4 flex items-center justify-center">
            <div className="relative rounded-xl border border-border/80 shadow-2xs p-2.5 bg-white w-full flex items-center justify-center h-22 group hover:shadow-md transition-shadow">
              <Image 
                src="/logoeGED.png" 
                alt="eGED - Gestion des échantillons et déchets pharmaceutiques"
                width={320}
                height={120}
                className="h-18 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                priority
              />
            </div>
          </div>

        </div>
      </div>

      {/* ─── LES 4 PILIERS DE LA SOLUTION eGED (VERT = ÉCHANTILLONS, ROUGE = DÉCHETS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          
          {/* PILIER 1 : TRAÇABILITÉ (ÉCHANTILLONS - VERT & BLANC) */}
          <Card className="shadow-xs border-0 rounded-xl bg-[#1B5C2E] text-white hover:shadow-md transition-shadow">
            <CardHeader className="p-2.5 pb-1">
              <div className="p-1.5 w-fit rounded-lg bg-white/20 text-white mb-0.5">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <CardTitle className="text-[11px] font-bold text-white uppercase tracking-wide">TRAÇABILITÉ ÉCHANTILLONS</CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-0">
              <p className="text-[10px] text-white/90 leading-tight">
                Suivi en temps réel de chaque échantillon, depuis sa réception jusqu'à son analyse.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-[10px] font-bold text-white hover:text-white/80 mt-1.5">
                <Link href="/dashboard/receptions">Consulter réceptions <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* PILIER 2 : GESTION OPTIMISÉE (ÉCHANTILLONS - VERT & BLANC) */}
          <Card className="shadow-xs border-0 rounded-xl bg-[#1B5C2E] text-white hover:shadow-md transition-shadow">
            <CardHeader className="p-2.5 pb-1">
              <div className="p-1.5 w-fit rounded-lg bg-white/20 text-white mb-0.5">
                <Package className="h-3.5 w-3.5" />
              </div>
              <CardTitle className="text-[11px] font-bold text-white uppercase tracking-wide">GESTION OPTIMISÉE</CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-0">
              <p className="text-[10px] text-white/90 leading-tight">
                Organisation efficace en armoires, zones et étagères dédiées avec cartographie complète.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-[10px] font-bold text-white hover:text-white/80 mt-1.5">
                <Link href="/dashboard/samples">Gérer emplacements <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* PILIER 3 : CONFORMITÉ DÉCHETS (DÉCHETS - ROUGE & BLANC) */}
          <Card className="shadow-xs border-0 rounded-xl bg-red-600 text-white hover:shadow-md transition-shadow">
            <CardHeader className="p-2.5 pb-1">
              <div className="p-1.5 w-fit rounded-lg bg-white/20 text-white mb-0.5">
                <Trash2 className="h-3.5 w-3.5" />
              </div>
              <CardTitle className="text-[11px] font-bold text-white uppercase tracking-wide">CONFORMITÉ DÉCHETS</CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-0">
              <p className="text-[10px] text-white/90 leading-tight">
                Respect strict des normes environnementales pour la destruction sécurisée des déchets.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-[10px] font-bold text-white hover:text-white/80 mt-1.5">
                <Link href="/dashboard/destructions">Planifier destructions <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* PILIER 4 : RAPPORTS ET STATISTIQUES (BLEU eGED #003B5C & BLANC) */}
          <Card className="shadow-xs border-0 rounded-xl bg-[#003B5C] text-white hover:shadow-md transition-shadow">
            <CardHeader className="p-2.5 pb-1">
              <div className="p-1.5 w-fit rounded-lg bg-white/20 text-white mb-0.5">
                <BarChart3 className="h-3.5 w-3.5" />
              </div>
              <CardTitle className="text-[11px] font-bold text-white uppercase tracking-wide">RAPPORTS ET STATISTIQUES</CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 pt-0">
              <p className="text-[10px] text-white/90 leading-tight">
                Indicateurs de performance, taux d'occupation des stocks et rapports en un clic.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-[10px] font-bold text-white hover:text-white/80 mt-1.5">
                <Link href="/dashboard/reports">Générer un rapport <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

        </div>

    </div>
  )
}
