import { createClient } from "@/utils/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertTriangle,
  CalendarX,
  CalendarClock,
  ShieldAlert,
  Trash2,
  CheckCircle2,
  Eye,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

type AlertSeverity = "critique" | "avertissement" | "info"

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

function severityConfig(severity: AlertSeverity) {
  switch (severity) {
    case "critique":
      return {
        border: "border-l-red-500",
        iconBg: "bg-red-50 text-red-600",
        badge: "bg-red-100 text-red-700 border-red-200",
      }
    case "avertissement":
      return {
        border: "border-l-amber-500",
        iconBg: "bg-amber-50 text-amber-600",
        badge: "bg-amber-100 text-amber-700 border-amber-200",
      }
    case "info":
      return {
        border: "border-l-blue-500",
        iconBg: "bg-blue-50 text-blue-600",
        badge: "bg-blue-100 text-blue-700 border-blue-200",
      }
  }
}

function AlertCard({ alert }: { alert: AlertItem }) {
  const cfg = severityConfig(alert.severity)
  const Icon = alert.icon

  return (
    <Card className={`shadow-2xs border border-border/70 border-l-4 ${cfg.border} rounded-xl bg-card`}>
      <CardContent className="p-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1 rounded-lg shrink-0 ${cfg.iconBg}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-foreground truncate">{alert.title}</span>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${cfg.badge}`}>
                {alert.badgeLabel}
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground truncate max-w-xl">{alert.description}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9.5px] text-muted-foreground hidden sm:inline">{alert.time}</span>
          <Button size="sm" variant="ghost" className="h-6 text-[11px] font-bold text-[#1B5C2E] hover:bg-[#1B5C2E]/10 px-1.5" asChild>
            <Link href={alert.href}>
              <Eye className="h-3 w-3 mr-0.5" /> Voir
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AlertsPage() {
  const supabase = await createClient()

  const alerts: AlertItem[] = [
    {
      id: 'a1',
      severity: 'critique',
      icon: CalendarX,
      title: 'Lot d\'échantillons expiré (Amoxicilline)',
      description: 'Le lot N°LOT-8832 a dépassé sa date de péremption et doit être isolé.',
      time: 'Il y a 10 min',
      badgeLabel: 'Péremption',
      href: '/dashboard/samples'
    },
    {
      id: 'a2',
      severity: 'avertissement',
      icon: CalendarClock,
      title: 'Expiration proche (30 jours)',
      description: '23 lots d\'échantillons en stock arrivent à péremption d\'ici la fin du mois.',
      time: 'Il y a 1h',
      badgeLabel: 'J-30',
      href: '/dashboard/samples'
    },
    {
      id: 'a3',
      severity: 'critique',
      icon: Trash2,
      title: 'Capacité local déchet à 78%',
      description: 'Le local de stockage temporaire des déchets atteint le seuil d\'alerte PSQIF.',
      time: 'Il y a 2h',
      badgeLabel: 'Capacité 78%',
      href: '/dashboard/waste'
    },
    {
      id: 'a4',
      severity: 'info',
      icon: ShieldAlert,
      title: 'Contrôle qualité de réception',
      description: 'Rapprochement d\'inventaire validé par la direction ABMed.',
      time: 'Hier',
      badgeLabel: 'Validation',
      href: '/dashboard/receptions'
    }
  ]

  const critiques = alerts.filter(a => a.severity === 'critique')
  const avertissements = alerts.filter(a => a.severity === 'avertissement')
  const infos = alerts.filter(a => a.severity === 'info')

  return (
    <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Centre d'Alertes & Notifications
          </h2>
          <p className="text-muted-foreground text-xs">Surveillance en temps réel des anomalies, échéances et non-conformités réglementaires.</p>
        </div>
      </div>

      {/* KPIS COMPACTS SANS SCROLL */}
      <div className="grid grid-cols-4 gap-2.5">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600"><AlertTriangle className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Alertes Critiques</p>
              <h3 className="text-lg font-black text-foreground">{critiques.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600"><CalendarClock className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Avertissements</p>
              <h3 className="text-lg font-black text-foreground">{avertissements.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600"><ShieldAlert className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Informations</p>
              <h3 className="text-lg font-black text-foreground">{infos.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-2.5 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Total Traitées</p>
              <h3 className="text-lg font-black text-foreground">18</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LISTE DES ALERTES (STATIQUE 1-ÉCRAN) */}
      <div className="space-y-2">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>

    </div>
  )
}
