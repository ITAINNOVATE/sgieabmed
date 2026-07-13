import { createClient } from "@/utils/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  CalendarX,
  CalendarClock,
  ShieldAlert,
  MapPinOff,
  Trash2,
  ClipboardList,
  BellRing,
  BellOff,
  CheckCircle2,
  ExternalLink,
  Eye,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertSeverity = "critique" | "avertissement" | "info" | "resolue"

interface AlertItem {
  id: string
  severity: AlertSeverity
  icon: React.ElementType
  title: string
  description: string
  time: string
  badgeLabel: string
  href: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return "À l'instant"
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays === 1) return "Hier"
  if (diffDays < 30) return `Il y a ${diffDays} jours`
  return date.toLocaleDateString("fr-FR")
}

function severityConfig(severity: AlertSeverity) {
  switch (severity) {
    case "critique":
      return {
        border: "border-l-red-500",
        iconBg: "bg-red-50 dark:bg-red-950/40",
        iconColor: "text-red-600 dark:text-red-400",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
      }
    case "avertissement":
      return {
        border: "border-l-orange-400",
        iconBg: "bg-orange-50 dark:bg-orange-950/40",
        iconColor: "text-orange-600 dark:text-orange-400",
        badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      }
    case "info":
      return {
        border: "border-l-blue-400",
        iconBg: "bg-blue-50 dark:bg-blue-950/40",
        iconColor: "text-blue-600 dark:text-blue-400",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      }
    case "resolue":
      return {
        border: "border-l-emerald-400",
        iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      }
  }
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: AlertItem }) {
  const cfg = severityConfig(alert.severity)
  const Icon = alert.icon

  const severityLabel: Record<AlertSeverity, string> = {
    critique: "Critique",
    avertissement: "Avertissement",
    info: "Info",
    resolue: "Résolue",
  }

  return (
    <Card
      className={`shadow-sm border-border/50 border-l-4 ${cfg.border} rounded-2xl hover:shadow-md transition-shadow duration-200`}
    >
      <CardContent className="p-5 flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-xl shrink-0 ${cfg.iconBg}`}>
          <Icon className={`h-5 w-5 ${cfg.iconColor}`} strokeWidth={2} />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-sm leading-tight">
                {alert.title}
              </h3>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold px-2 py-0.5 ${cfg.badge}`}
              >
                {severityLabel[alert.severity]}
              </Badge>
              <Badge
                variant="outline"
                className="text-[10px] font-medium px-2 py-0.5 bg-muted/50 text-muted-foreground border-border/50"
              >
                {alert.badgeLabel}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              {alert.time}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {alert.description}
          </p>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 rounded-lg border-border/70 hover:bg-muted/50"
              disabled={alert.severity === "resolue"}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Marquer comme lu
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 rounded-lg border-border/70 hover:bg-muted/50"
              asChild
            >
              <Link href={alert.href}>
                <Eye className="h-3.5 w-3.5" />
                Voir détails
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="bg-muted/50 rounded-full p-5 mb-4">
        <BellOff className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        Aucune alerte {label}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Tout est en ordre dans cette catégorie. Les nouvelles alertes
        apparaîtront ici automatiquement.
      </p>
    </div>
  )
}

// ─── Alert List Section ───────────────────────────────────────────────────────

function AlertList({ alerts, emptyLabel }: { alerts: AlertItem[]; emptyLabel: string }) {
  if (alerts.length === 0) return <EmptyState label={emptyLabel} />
  return (
    <div className="grid gap-3">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  )
}

// ─── Summary Stats Bar ────────────────────────────────────────────────────────

function StatBadge({
  count,
  label,
  color,
}: {
  count: number
  label: string
  color: string
}) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${color}`}>
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs font-medium leading-tight opacity-80">{label}</span>
    </div>
  )
}

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function AlertsPage() {
  const supabase = await createClient()
  const now = new Date()
  const thirtyDaysLater = new Date(now)
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // ── Fetch samples ──────────────────────────────────────────────────────────
  let samples: any[] = []
  try {
    const { data, error } = await supabase
      .from("samples")
      .select("id, sample_number, commercial_name, dci, batch_number, quantity, status, expiry_date, current_location")
      .order("expiry_date", { ascending: true })

    if (!error && data) samples = data
  } catch {
    // Table may not exist yet — graceful fallback
  }

  // ── Fetch waste_batches ───────────────────────────────────────────────────
  let wasteBatches: any[] = []
  try {
    const { data, error } = await supabase
      .from("waste_batches")
      .select("id, batch_number, waste_type, quantity, unit, status, created_at")

    if (!error && data) wasteBatches = data
  } catch {
    // Table may not exist yet
  }

  // ── Fetch destruction_plans ───────────────────────────────────────────────
  let destructionPlans: any[] = []
  try {
    const { data, error } = await supabase
      .from("destruction_plans")
      .select("id, plan_number, planned_date, status, created_at")

    if (!error && data) destructionPlans = data
  } catch {
    // Table may not exist yet
  }

  // ── Build alert list ───────────────────────────────────────────────────────
  const alerts: AlertItem[] = []

  // 1. Expired samples
  const expiredSamples = samples.filter(
    (s) => s.expiry_date && new Date(s.expiry_date) < now
  )
  expiredSamples.forEach((s) => {
    const expDate = new Date(s.expiry_date)
    const daysExpired = Math.floor(
      (now.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    alerts.push({
      id: `expired-${s.id}`,
      severity: "critique",
      icon: CalendarX,
      title: `Lot expiré — ${s.commercial_name || s.dci || "Inconnu"}`,
      description: `Le lot N°${s.batch_number || s.sample_number} (${s.quantity ?? "?"} unité(s)) a expiré il y a ${daysExpired} jour(s). Il doit être isolé et orienté vers la filière de destruction.`,
      time: formatRelativeTime(expDate),
      badgeLabel: "Péremption dépassée",
      href: `/dashboard/samples/${s.id}`,
    })
  })

  // 2. Expiring soon (within 30 days)
  const expiringSoonSamples = samples.filter((s) => {
    if (!s.expiry_date) return false
    const expDate = new Date(s.expiry_date)
    return expDate >= now && expDate <= thirtyDaysLater
  })
  expiringSoonSamples.forEach((s) => {
    const expDate = new Date(s.expiry_date)
    const daysLeft = Math.ceil(
      (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    alerts.push({
      id: `expiring-${s.id}`,
      severity: daysLeft <= 10 ? "critique" : "avertissement",
      icon: CalendarClock,
      title: `Expiration imminente — ${s.commercial_name || s.dci || "Inconnu"}`,
      description: `Le lot N°${s.batch_number || s.sample_number} (${s.quantity ?? "?"} unité(s)) expire dans ${daysLeft} jour(s). Planifiez une inspection ou une destruction avant cette date.`,
      time: formatRelativeTime(expDate),
      badgeLabel: `J-${daysLeft}`,
      href: `/dashboard/samples/${s.id}`,
    })
  })

  // 3. Quarantine samples
  const quarantineSamples = samples.filter((s) => s.status === "En quarantaine")
  quarantineSamples.forEach((s) => {
    alerts.push({
      id: `quarantine-${s.id}`,
      severity: "avertissement",
      icon: ShieldAlert,
      title: `En quarantaine — ${s.commercial_name || s.dci || "Inconnu"}`,
      description: `Le lot N°${s.batch_number || s.sample_number} (${s.quantity ?? "?"} unité(s)) est actuellement en quarantaine${s.current_location ? ` — Emplacement : ${s.current_location}` : ""}. Une décision de libération ou de rejet est requise.`,
      time: formatRelativeTime(now),
      badgeLabel: "En quarantaine",
      href: `/dashboard/samples/${s.id}`,
    })
  })

  // 4. Samples "À localiser"
  const toLocateSamples = samples.filter((s) => s.status === "À localiser")
  toLocateSamples.forEach((s) => {
    alerts.push({
      id: `locate-${s.id}`,
      severity: "info",
      icon: MapPinOff,
      title: `Emplacement manquant — ${s.commercial_name || s.dci || "Inconnu"}`,
      description: `Le lot N°${s.batch_number || s.sample_number} (${s.quantity ?? "?"} unité(s)) n'a pas encore été affecté à un emplacement de stockage. Veuillez l'enregistrer dans le plan des locaux.`,
      time: formatRelativeTime(now),
      badgeLabel: "À localiser",
      href: `/dashboard/samples/${s.id}`,
    })
  })

  // 5. Waste batches declared but not processed for > 30 days
  const staleDeclaredBatches = wasteBatches.filter((wb) => {
    if (wb.status !== "Déclaré") return false
    const declaredAt = new Date(wb.created_at)
    return declaredAt < thirtyDaysAgo
  })
  staleDeclaredBatches.forEach((wb) => {
    const declaredAt = new Date(wb.created_at)
    const daysStale = Math.floor(
      (now.getTime() - declaredAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    alerts.push({
      id: `waste-${wb.id}`,
      severity: "avertissement",
      icon: Trash2,
      title: `Déchet non traité — Lot ${wb.batch_number}`,
      description: `Le lot de déchet N°${wb.batch_number} (${wb.quantity} ${wb.unit || "unité(s)"} — Type : ${wb.waste_type || "Non précisé"}) est déclaré depuis ${daysStale} jours sans avoir été intégré dans un plan de destruction.`,
      time: formatRelativeTime(declaredAt),
      badgeLabel: "Déclaré > 30j",
      href: `/dashboard/waste`,
    })
  })

  // 6. Destruction plans awaiting validation for > 7 days
  const stalePlans = destructionPlans.filter((dp) => {
    if (dp.status !== "En préparation") return false
    const createdAt = new Date(dp.created_at)
    return createdAt < sevenDaysAgo
  })
  stalePlans.forEach((dp) => {
    const createdAt = new Date(dp.created_at)
    const daysPending = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    alerts.push({
      id: `plan-${dp.id}`,
      severity: "info",
      icon: ClipboardList,
      title: `Plan de destruction en attente — ${dp.plan_number}`,
      description: `Le plan N°${dp.plan_number} est en cours de préparation depuis ${daysPending} jours sans avoir été soumis pour validation. Veuillez compléter ou soumettre ce plan.`,
      time: formatRelativeTime(createdAt),
      badgeLabel: "En préparation",
      href: `/dashboard/destructions`,
    })
  })

  // ── Sort: critiques first, then avertissements, then info ─────────────────
  const severityOrder: Record<AlertSeverity, number> = {
    critique: 0,
    avertissement: 1,
    info: 2,
    resolue: 3,
  }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // ── Filter helpers ─────────────────────────────────────────────────────────
  const critiques = alerts.filter((a) => a.severity === "critique")
  const avertissements = alerts.filter((a) => a.severity === "avertissement")
  const infos = alerts.filter((a) => a.severity === "info")
  const resolues: AlertItem[] = [] // Would come from a DB flag in production

  const criticalCount = critiques.length
  const totalCount = alerts.length

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Centre d&apos;Alertes
            </h2>
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                {criticalCount} critique{criticalCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Surveillance en temps réel des anomalies, échéances et non-conformités.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="shadow-sm gap-2 rounded-xl" disabled>
            <CheckCircle2 className="h-4 w-4" />
            Tout marquer comme lu
          </Button>
        </div>
      </div>

      {/* ── Stats Summary Bar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <StatBadge
          count={totalCount}
          label="Total alertes"
          color="bg-muted/60 text-foreground"
        />
        <StatBadge
          count={critiques.length}
          label="Critiques"
          color="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300"
        />
        <StatBadge
          count={avertissements.length}
          label="Avertissements"
          color="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300"
        />
        <StatBadge
          count={infos.length}
          label="Informations"
          color="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
        />
        <StatBadge
          count={resolues.length}
          label="Résolues"
          color="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="toutes" className="w-full">
        <TabsList className="flex overflow-x-auto h-auto p-1 bg-muted/60 rounded-xl w-full scrollbar-none whitespace-nowrap gap-1">
          <TabsTrigger
            value="toutes"
            className="rounded-lg text-sm shrink-0 flex-1 px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <BellRing className="h-3.5 w-3.5 mr-1.5" />
            Toutes
            <span className="ml-1.5 text-xs bg-foreground/10 px-1.5 py-0.5 rounded-full font-mono">
              {totalCount}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="critiques"
            className="rounded-lg text-sm shrink-0 flex-1 px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-red-500" />
            Critiques
            {critiques.length > 0 && (
              <span className="ml-1.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 rounded-full font-mono">
                {critiques.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="avertissements"
            className="rounded-lg text-sm shrink-0 flex-1 px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <CalendarClock className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
            Avertissements
            {avertissements.length > 0 && (
              <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-1.5 py-0.5 rounded-full font-mono">
                {avertissements.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="info"
            className="rounded-lg text-sm shrink-0 flex-1 px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <ClipboardList className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
            Info
            {infos.length > 0 && (
              <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-mono">
                {infos.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="resolues"
            className="rounded-lg text-sm shrink-0 flex-1 px-4 py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
            Résolues
            {resolues.length > 0 && (
              <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-mono">
                {resolues.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Toutes */}
        <TabsContent value="toutes" className="mt-6">
          <AlertList alerts={alerts} emptyLabel="pour le moment" />
        </TabsContent>

        {/* Critiques */}
        <TabsContent value="critiques" className="mt-6">
          <AlertList alerts={critiques} emptyLabel="critique" />
        </TabsContent>

        {/* Avertissements */}
        <TabsContent value="avertissements" className="mt-6">
          <AlertList alerts={avertissements} emptyLabel="d'avertissement" />
        </TabsContent>

        {/* Info */}
        <TabsContent value="info" className="mt-6">
          <AlertList alerts={infos} emptyLabel="d'information" />
        </TabsContent>

        {/* Résolues */}
        <TabsContent value="resolues" className="mt-6">
          <AlertList alerts={resolues} emptyLabel="résolue" />
        </TabsContent>
      </Tabs>

      {/* ── Footer note ───────────────────────────────────────────────────────── */}
      {totalCount > 0 && (
        <p className="text-xs text-muted-foreground text-center pt-2 pb-4">
          {totalCount} alerte{totalCount > 1 ? "s" : ""} générée{totalCount > 1 ? "s" : ""} automatiquement à partir des données en temps réel — Dernière analyse :{" "}
          {now.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  )
}
