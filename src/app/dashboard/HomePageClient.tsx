"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ShieldCheck, Package, Trash2, BarChart3, 
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function HomePageClient() {
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* ─── BANDEAU SUPÉRIEUR D'ACCUEIL INSTITUTIONNEL (COMPATIBLE JOUR & NUIT) ─── */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 lg:p-5 shadow-2xs relative overflow-hidden bg-gradient-to-r from-card via-card to-[#1B5C2E]/10 dark:to-emerald-950/20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          
          {/* COLONNE GAUCHE : TEXTE & PRESENTATION eGED */}
          <div className="lg:col-span-8 space-y-2.5">

            <div className="space-y-1">
              <h1 className="text-xl lg:text-2xl font-black text-foreground tracking-tight leading-snug">
                Gestion électronique des échantillons et des déchets pharmaceutiques
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl font-normal">
                Une solution digitale sécurisée pour la traçabilité, la conservation et la gestion optimale des échantillons et des déchets pharmaceutiques.
              </p>
            </div>

            {/* BOUTONS ACCÈS RAPIDES DE LA PAGE D'ACCUEIL */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button asChild className="bg-[#1B5C2E] hover:bg-[#154824] text-white gap-2 h-8.5 px-4 rounded-lg shadow-2xs text-xs font-bold">
                <Link href="/dashboard/analytics">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Tableau de bord Échantillons
                </Link>
              </Button>
              <Button asChild className="bg-red-600 hover:bg-red-700 text-white gap-2 h-8.5 px-4 rounded-lg shadow-2xs text-xs font-bold border-0">
                <Link href="/dashboard/waste">
                  <Trash2 className="h-3.5 w-3.5 text-white" />
                  Tableau de bord Déchets
                </Link>
              </Button>
            </div>

          </div>

          {/* COLONNE DROITE : LOGO eGED AUX COULEURS D'ORIGINE (SUR FOND BLANC PROPRE) */}
          <div className="lg:col-span-4 flex items-center justify-center">
            <div className="relative rounded-2xl border border-border/80 shadow-2xs p-4 bg-white w-full flex items-center justify-center aspect-16/9 group hover:shadow-md transition-shadow">
              <Image 
                src="/logoeGED.png" 
                alt="eGED - Gestion des échantillons et déchets pharmaceutiques"
                width={360}
                height={140}
                className="h-28 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                priority
              />
            </div>
          </div>

        </div>
      </div>

      {/* ─── LES 4 PILIERS DE LA SOLUTION eGED (VERT = ÉCHANTILLONS, ROUGE = DÉCHETS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* PILIER 1 : TRAÇABILITÉ (ÉCHANTILLONS - VERT & BLANC) */}
          <Card className="shadow-xs border-0 rounded-xl bg-[#1B5C2E] text-white hover:shadow-md transition-shadow">
            <CardHeader className="p-3 pb-1">
              <div className="p-2 w-fit rounded-lg bg-white/20 text-white mb-1">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wide">TRAÇABILITÉ ÉCHANTILLONS</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-[11px] text-white/90 leading-relaxed">
                Suivi en temps réel de chaque échantillon, depuis sa réception jusqu'à son analyse.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-[11px] font-bold text-white hover:text-white/80 mt-2">
                <Link href="/dashboard/receptions">Consulter réceptions <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* PILIER 2 : GESTION OPTIMISÉE (ÉCHANTILLONS - VERT & BLANC) */}
          <Card className="shadow-xs border-0 rounded-xl bg-[#1B5C2E] text-white hover:shadow-md transition-shadow">
            <CardHeader className="p-3 pb-1">
              <div className="p-2 w-fit rounded-lg bg-white/20 text-white mb-1">
                <Package className="h-4 w-4" />
              </div>
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wide">GESTION OPTIMISÉE</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-[11px] text-white/90 leading-relaxed">
                Organisation efficace en armoires, zones et étagères dédiées avec cartographie complète.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-[11px] font-bold text-white hover:text-white/80 mt-2">
                <Link href="/dashboard/samples">Gérer emplacements <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* PILIER 3 : CONFORMITÉ DÉCHETS (DÉCHETS - ROUGE & BLANC) */}
          <Card className="shadow-xs border-0 rounded-xl bg-red-600 text-white hover:shadow-md transition-shadow">
            <CardHeader className="p-3 pb-1">
              <div className="p-2 w-fit rounded-lg bg-white/20 text-white mb-1">
                <Trash2 className="h-4 w-4" />
              </div>
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wide">CONFORMITÉ DÉCHETS</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-[11px] text-white/90 leading-relaxed">
                Respect strict des normes environnementales pour la destruction sécurisée des déchets.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-[11px] font-bold text-white hover:text-white/80 mt-2">
                <Link href="/dashboard/destructions">Planifier destructions <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* PILIER 4 : RAPPORTS ET STATISTIQUES (BLEU eGED #003B5C & BLANC) */}
          <Card className="shadow-xs border-0 rounded-xl bg-[#003B5C] text-white hover:shadow-md transition-shadow">
            <CardHeader className="p-3 pb-1">
              <div className="p-2 w-fit rounded-lg bg-white/20 text-white mb-1">
                <BarChart3 className="h-4 w-4" />
              </div>
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wide">RAPPORTS ET STATISTIQUES</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <p className="text-[11px] text-white/90 leading-relaxed">
                Indicateurs de performance, taux d'occupation des stocks et rapports d'audit en un clic.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-[11px] font-bold text-white hover:text-white/80 mt-2">
                <Link href="/dashboard/reports">Générer un rapport <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

        </div>

      {/* ─── BANDEAU INSTITUTIONNEL AU BAS DE L'ACCUEIL (NET JOUR ET NUIT) ─── */}
      <div className="p-3 rounded-xl bg-[#1B5C2E]/10 dark:bg-emerald-950/40 border border-[#1B5C2E]/30 dark:border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-[#1B5C2E] dark:text-emerald-400 shrink-0" />
          <span className="font-bold text-[#1B5C2E] dark:text-emerald-400 text-center sm:text-left text-[11px]">
            QUALITÉ • SÉCURITÉ • TRAÇABILITÉ AU SERVICE DE LA SANTÉ PUBLIQUE
          </span>
        </div>
        <span className="text-[10.5px] text-muted-foreground dark:text-slate-300 font-medium shrink-0">
          ABMed — République du Bénin
        </span>
      </div>

    </div>
  )
}
