"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShieldCheck, Package, Trash2, BarChart3, FlaskConical, 
  ArrowRight, Sparkles
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function HomePageClient() {
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* ─── BANDEAU SUPÉRIEUR D'ACCUEIL INSTITUTIONNEL (ROUGE MOCKUP - STATIQUE) ─── */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-[#1B5C2E]/5 border border-border/80 rounded-2xl p-4 lg:p-5 shadow-2xs relative overflow-hidden">
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

          {/* COLONNE DROITE : VISUEL HÉRO LABORATOIRE */}
          <div className="lg:col-span-4">
            <div className="relative rounded-xl overflow-hidden border border-border shadow-md aspect-16/9 bg-slate-100 group">
              <Image 
                src="/abmed_hero.png" 
                alt="Gestion des échantillons et déchets ABMed"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              <div className="absolute bottom-3 left-3 flex items-center">
                <Image 
                  src="/logoeGED_white.png" 
                  alt="Logo eGED" 
                  width={160} 
                  height={45} 
                  className="h-8 w-auto object-contain drop-shadow-md" 
                />
              </div>
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

          {/* PILIER 4 : TABLEAUX DE BORD DÉCHETS & RAPPORTS (DÉCHETS - ROUGE & BLANC) */}
          <Card className="shadow-xs border-0 rounded-xl bg-red-600 text-white hover:shadow-md transition-shadow">
            <CardHeader className="p-3 pb-1">
              <div className="p-2 w-fit rounded-lg bg-white/20 text-white mb-1">
                <BarChart3 className="h-4 w-4" />
              </div>
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wide">RAPPORTS DÉCHETS</CardTitle>
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

      {/* ─── BANDEAU INSTITUTIONNEL AU BAS DE L'ACCUEIL ─── */}
      <div className="p-3 rounded-xl bg-[#1B5C2E]/10 border border-[#1B5C2E]/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-[#1B5C2E] shrink-0" />
          <span className="font-bold text-[#1B5C2E] text-center sm:text-left text-[11px]">
            QUALITÉ • SÉCURITÉ • TRAÇABILITÉ AU SERVICE DE LA SANTÉ PUBLIQUE
          </span>
        </div>
        <span className="text-[10.5px] text-muted-foreground font-medium shrink-0">
          ABMed — République du Bénin
        </span>
      </div>

    </div>
  )
}
