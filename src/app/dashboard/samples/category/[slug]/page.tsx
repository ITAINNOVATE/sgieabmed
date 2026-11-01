"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  SAMPLE_CATEGORIES, 
  getSampleCategory, 
  matchesSampleCategory,
  SampleCategoryConfig 
} from "@/types/sample-types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Inbox, Plus, Package, ArrowLeftRight, ClipboardCheck, 
  MapPin, Folder, ShieldCheck, CheckCircle2, Clock, 
  AlertTriangle, ArrowRight, ExternalLink, Calendar, Building2,
  FileCheck, RefreshCw, SearchCheck
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

export default function SampleCategoryHubPage() {
  const params = useParams()
  const router = useRouter()
  const slug = typeof params?.slug === "string" ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : ""
  
  const category: SampleCategoryConfig | null = useMemo(() => {
    return getSampleCategory(slug)
  }, [slug])

  const [receptions, setReceptions] = useState<any[]>([])
  const [samples, setSamples] = useState<any[]>([])
  const [movementsCount, setMovementsCount] = useState<number>(0)
  const [documentsCount, setDocumentsCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const supabase = createClient()

  // Chargement des données filtrées pour cette catégorie
  const loadCategoryData = () => {
    if (!category) return

    try {
      const deletedIds = JSON.parse(localStorage.getItem('reception_deleted_ids') || '[]')
      const historyRecords = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
      
      // Récupérer toutes les réceptions locales
      const allRecs: any[] = [...historyRecords]
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('reception_draft_details_')) {
          try {
            const raw = localStorage.getItem(key)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (parsed?.formData?.rec_number && !allRecs.some(r => r.rec_number === parsed.formData.rec_number)) {
                allRecs.push({
                  ...parsed.formData,
                  status: parsed.status || parsed.formData.status || "En attente de validation"
                })
              }
            }
          } catch {}
        }
      }

      // Filtrer les réceptions par la catégorie actuelle
      const filteredRecs = allRecs.filter(r => {
        if (!r.rec_number || deletedIds.includes(r.rec_number) || deletedIds.includes(r.id)) return false
        return matchesSampleCategory(r.type_reception, category.slug)
      })
      setReceptions(filteredRecs)

      // Extraire les échantillons correspondants
      const categorySamples: any[] = []
      filteredRecs.forEach(rec => {
        const rawDetails = localStorage.getItem('reception_draft_details_' + rec.rec_number)
        let sampleList = rec.samples || []
        if (rawDetails) {
          try {
            const parsed = JSON.parse(rawDetails)
            if (parsed.formData?.samples && parsed.formData.samples.length > 0) {
              sampleList = parsed.formData.samples
            }
          } catch {}
        }

        sampleList.forEach((s: any, idx: number) => {
          if (s.commercial_name && s.commercial_name.trim() !== '') {
            categorySamples.push({
              id: `${rec.rec_number}-${idx}`,
              sample_number: `ECH-${rec.rec_number.replace('REC-', '')}-${idx + 1}`,
              reception_ref: rec.rec_number,
              commercial_name: s.commercial_name,
              dci: s.dci || "—",
              batch_number: s.batch || s.batch_number || "LOT-TEMP",
              quantity: Number(s.qty || s.quantity) || 1,
              status: rec.status === "Validée" ? "Disponible" : "À localiser",
              supplier: rec.supplier || "Demandeur non précisé",
              expiry_date: s.exp_date || "—"
            })
          }
        })
      })
      setSamples(categorySamples)

      // Calculer les mouvements
      const localMovements = JSON.parse(localStorage.getItem('local_movements_history') || '[]')
      const catMovements = localMovements.filter((m: any) => {
        return filteredRecs.some(r => r.rec_number === m.reference_document)
      })
      setMovementsCount(catMovements.length + categorySamples.length)

      // Documents
      setDocumentsCount(filteredRecs.length * 2) // Bordereaux + pièces jointes estimées
    } catch (e) {
      console.error("Erreur chargement catégorie:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategoryData()
  }, [category])

  useRealtimeSync({
    tables: ["receptions", "samples", "sample_movements", "documents"],
    onSync: loadCategoryData,
  })

  if (!category) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Sous-module introuvable</h2>
        <p className="text-muted-foreground text-sm">Le type d&apos;échantillon demandé n&apos;existe pas ou a été déplacé.</p>
        <Button onClick={() => router.push("/dashboard/samples")} className="bg-[#1B5C2E] text-white">
          Retour aux échantillons
        </Button>
      </div>
    )
  }

  const validatedCount = receptions.filter(r => ["Validée", "Finalisé", "Finalisée"].includes(r.status)).length
  const pendingCount = receptions.length - validatedCount
  const totalUnits = samples.reduce((acc, curr) => acc + (Number(curr.quantity) || 1), 0)

  // Liste des sous-modules internes
  const internalSubmodules = [
    {
      title: "Toutes les Réceptions",
      desc: "Historique et registre complet des réceptions pour ce type d'échantillon",
      icon: Inbox,
      href: `/dashboard/receptions?type=${category.slug}`,
      badge: `${receptions.length} réception(s)`,
      badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    },
    {
      title: "Nouvelle Réception",
      desc: `Formulaire d'enregistrement pré-rempli avec l'objet "${category.label}"`,
      icon: Plus,
      href: `/dashboard/receptions/new?type=${encodeURIComponent(category.label)}`,
      badge: "Formulaire dédié",
      badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      highlight: true
    },
    {
      title: "Stocks & Armoires",
      desc: "Inventaire des unités physiques en stock, numéros de lots et dates d'expiration",
      icon: Package,
      href: `/dashboard/samples?type=${category.slug}`,
      badge: `${samples.length} lot(s) (${totalUnits} unités)`,
      badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    },
    {
      title: "Mouvements & Traçabilité",
      desc: "Historique auditable de chaque transfert, entrée et sortie d'échantillon",
      icon: ArrowLeftRight,
      href: `/dashboard/movements?type=${category.slug}`,
      badge: `${movementsCount} flux tracés`,
      badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
    },
    {
      title: "Inventaires & Contrôles",
      desc: "Sessions de contrôle contradictoire et vérifications de conformité physique",
      icon: ClipboardCheck,
      href: `/dashboard/inventory?type=${category.slug}`,
      badge: "Contrôles périodiques",
      badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
    },
    {
      title: "Localisations & Armoires",
      desc: "Plan de stockage, étagères et zones réservées pour ces échantillons",
      icon: MapPin,
      href: `/dashboard/locations?type=${category.slug}`,
      badge: "Cartographie",
      badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
    },
    {
      title: "Documentation & Certificats",
      desc: "Bordereaux de réception officiels eGED, fiches techniques et pièces jointes",
      icon: Folder,
      href: `/dashboard/documents?type=${category.slug}`,
      badge: "Pièces & Attestations",
      badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
    }
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* En-tête officiel du sous-module */}
      <div className="rounded-xl border bg-card p-6 shadow-sm relative overflow-hidden">
        <div 
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: category.color }}
        />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span 
                className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-md uppercase"
                style={{ backgroundColor: `${category.color}20`, color: category.color, border: `1px solid ${category.color}40` }}
              >
                {category.code}
              </span>
              <h1 className="text-2xl font-black tracking-tight text-foreground">{category.label}</h1>
              <Badge variant="outline" className="text-xs font-semibold">
                Gestion & Traçabilité Dédiée
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              {category.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/dashboard/receptions/new?type=${encodeURIComponent(category.label)}`}>
              <Button className="bg-[#1B5C2E] hover:bg-[#154824] text-white font-bold text-xs shadow-sm h-9">
                <Plus className="mr-1.5 h-4 w-4" /> Nouvelle Réception ({category.shortLabel})
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cartes KPI synthétiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Réceptions Enregistrées</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{receptions.length}</h3>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">
                {receptions.length} réception{receptions.length > 1 ? "s" : ""} validée{receptions.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <Inbox className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Échantillons en Stock</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{samples.length}</h3>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">
                {totalUnits} unité{totalUnits > 1 ? "s" : ""} enregistrée{totalUnits > 1 ? "s" : ""}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Mouvements & Flux</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{movementsCount}</h3>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">
                Traçabilité 100% active
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Dossiers & Preuves</p>
              <h3 className="text-2xl font-black text-foreground mt-0.5">{documentsCount}</h3>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">
                Bordereaux eGED & pièces
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600">
              <Folder className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grille des sous-modules internes dédiés à ce type */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>Modules de Gestion Dédiés</span>
            <Badge variant="secondary" className="text-[11px] font-semibold">
              {category.shortLabel}
            </Badge>
          </h2>
          <span className="text-xs text-muted-foreground">
            Accès direct aux fonctionnalités filtrées sur ce sous-module
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {internalSubmodules.map((sub, idx) => {
            const Icon = sub.icon
            return (
              <Card 
                key={idx} 
                className={`group hover:shadow-md transition-all border-border/70 cursor-pointer relative overflow-hidden ${
                  sub.highlight ? "border-[#1B5C2E]/40 bg-[#1B5C2E]/[0.02]" : ""
                }`}
              >
                <Link href={sub.href} className="block p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-[#1B5C2E] group-hover:bg-[#1B5C2E] group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.badgeColor}`}>
                      {sub.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-[#1B5C2E] transition-colors flex items-center justify-between">
                    <span>{sub.title}</span>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#1B5C2E]" />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-snug line-clamp-2">
                    {sub.desc}
                  </p>
                </Link>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Tableaux récents : Réceptions et Échantillons de ce type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dernières réceptions de ce type */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Inbox className="h-4 w-4 text-[#1B5C2E]" />
                <span>Dernières Réceptions ({category.shortLabel})</span>
              </CardTitle>
              <CardDescription className="text-[11px]">
                Flux récents d&apos;entrée pour ce sous-module
              </CardDescription>
            </div>
            <Link href={`/dashboard/receptions?type=${category.slug}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-[#1B5C2E] font-semibold">
                Voir tout ({receptions.length})
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {receptions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Aucune réception enregistrée pour {category.label} pour l&apos;instant.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px]">
                    <TableHead>N° Réception</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receptions.slice(0, 5).map((rec, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell className="font-mono font-bold text-foreground">
                        {rec.rec_number}
                      </TableCell>
                      <TableCell className="truncate max-w-[140px] text-muted-foreground">
                        {rec.supplier || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        {rec.date_reception || rec.created_at?.split('T')[0] || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          className={`text-[10px] ${
                            ["Validée", "Finalisé", "Finalisée"].includes(rec.status)
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {rec.status || "En attente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Échantillons en stock pour ce type */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Package className="h-4 w-4 text-[#1B5C2E]" />
                <span>Échantillons en Stock ({category.shortLabel})</span>
              </CardTitle>
              <CardDescription className="text-[11px]">
                Produits et lots sous gestion exclusive
              </CardDescription>
            </div>
            <Link href={`/dashboard/samples?type=${category.slug}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-[#1B5C2E] font-semibold">
                Voir tout ({samples.length})
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {samples.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Aucun échantillon en stock pour {category.label}.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px]">
                    <TableHead>N° Échantillon</TableHead>
                    <TableHead>Produit / DCI</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {samples.slice(0, 5).map((s, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell className="font-mono font-bold text-foreground">
                        {s.sample_number}
                      </TableCell>
                      <TableCell className="truncate max-w-[140px]">
                        <span className="font-semibold block truncate">{s.commercial_name}</span>
                        <span className="text-[10px] text-muted-foreground block truncate">{s.dci}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-[11px]">
                        {s.batch_number}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#1B5C2E]">
                        {s.quantity}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
