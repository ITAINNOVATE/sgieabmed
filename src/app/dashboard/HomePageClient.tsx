"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ShieldCheck, Package, Trash2, BarChart3, FlaskConical, Beaker, 
  ArrowRight, Box, Clock, ShieldAlert, CheckCircle2, ArrowRightLeft, FileText, Scan, Calendar, Sparkles
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function HomePageClient() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      
      {/* ─── BANDEAU SUPÉRIEUR D'ACCUEIL INSTITUTIONNEL (ROUGE MOCKUP) ─── */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-[#1B5C2E]/5 border border-border/80 rounded-3xl p-6 lg:p-8 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* COLONNE GAUCHE : TEXTE & PRESENTATION eGED */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#1B5C2E] flex items-center justify-center text-white shadow-md shrink-0">
                <FlaskConical className="h-5 w-5 text-emerald-300" strokeWidth={2.2} />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-[#1B5C2E] leading-none">
                  eGED
                </span>
                <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider leading-tight mt-0.5">
                  Solution Officielle ABMed
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight leading-snug">
                Gestion électronique des échantillons et des déchets pharmaceutiques
              </h1>
              <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed">
                Une solution digitale sécurisée pour la traçabilité, la conservation et la gestion optimale des échantillons et des déchets pharmaceutiques.
              </p>
            </div>

            {/* BOUTONS ACCÈS RAPIDES DE LA PAGE D'ACCUEIL */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild className="bg-[#1B5C2E] hover:bg-[#154824] text-white gap-2 h-10 px-5 rounded-xl shadow-md text-xs font-bold">
                <Link href="/dashboard/analytics">
                  <BarChart3 className="h-4 w-4" />
                  Tableau de bord Échantillons
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2 h-10 px-5 rounded-xl border-border text-xs font-semibold bg-card hover:bg-muted">
                <Link href="/dashboard/waste">
                  <Trash2 className="h-4 w-4 text-red-600" />
                  Tableau de bord Déchets
                </Link>
              </Button>
            </div>

          </div>

          {/* COLONNE DROITE : VISUEL HÉRO LABORATOIRE */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl aspect-16/10 bg-slate-100 group">
              <Image 
                src="/abmed_hero.png" 
                alt="Gestion des échantillons et déchets ABMed"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Conforme aux normes PSQIF
                </span>
                <Badge className="bg-[#1B5C2E] text-white text-[10px]">Système Actif</Badge>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── LES 4 PILIERS DE LA SOLUTION eGED ─── */}
      <div>
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#1B5C2E]" />
            Les 4 Piliers du Système eGED
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* PILIER 1 : TRAÇABILITÉ */}
          <Card className="shadow-2xs border border-border/70 rounded-2xl bg-card hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="p-2.5 w-fit rounded-xl bg-[#1B5C2E]/10 text-[#1B5C2E] mb-2">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground">TRAÇABILITÉ</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Suivi en temps réel de chaque échantillon, depuis sa réception au laboratoire jusqu'à son analyse ou son archivage.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-xs font-semibold text-[#1B5C2E] mt-3">
                <Link href="/dashboard/receptions">Consulter les réceptions <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* PILIER 2 : GESTION OPTIMISÉE */}
          <Card className="shadow-2xs border border-border/70 rounded-2xl bg-card hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="p-2.5 w-fit rounded-xl bg-blue-500/10 text-blue-600 mb-2">
                <Package className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground">GESTION OPTIMISÉE</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Organisation et conservation efficaces en salles, armoires, zones et étagères dédiées avec cartographie complète.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-xs font-semibold text-blue-600 mt-3">
                <Link href="/dashboard/samples">Gérer les emplacements <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* PILIER 3 : CONFORMITÉ */}
          <Card className="shadow-2xs border border-border/70 rounded-2xl bg-card hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="p-2.5 w-fit rounded-xl bg-red-500/10 text-red-600 mb-2">
                <Trash2 className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground">CONFORMITÉ DÉCHETS</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Respect strict des normes environnementales et réglementaires PSQIF pour la neutralisation et destruction des déchets.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-xs font-semibold text-red-600 mt-3">
                <Link href="/dashboard/destructions">Planifier destructions <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

          {/* PILIER 4 : TABLEAUX DE BORD */}
          <Card className="shadow-2xs border border-border/70 rounded-2xl bg-card hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-2">
              <div className="p-2.5 w-fit rounded-xl bg-purple-500/10 text-purple-600 mb-2">
                <BarChart3 className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground">TABLEAUX DE BORD</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Indicateurs de performance, taux d'occupation des stocks et rapports d'audit analytiques générés en un clic.
              </p>
              <Button asChild variant="link" className="p-0 h-auto text-xs font-semibold text-purple-600 mt-3">
                <Link href="/dashboard/reports">Générer un rapport <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ─── BANDEAU INSTITUTIONNEL AU BAS DE L'ACCUEIL ─── */}
      <div className="p-4 rounded-2xl bg-[#1B5C2E]/10 border border-[#1B5C2E]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[#1B5C2E] shrink-0" />
          <span className="font-bold text-[#1B5C2E] text-center sm:text-left">
            QUALITÉ • SÉCURITÉ • TRAÇABILITÉ AU SERVICE DE LA SANTÉ PUBLIQUE
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium shrink-0">
          ABMed — République du Bénin
        </span>
      </div>

    </div>
  )
}
