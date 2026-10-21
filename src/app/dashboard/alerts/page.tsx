"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
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
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

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

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [resolvedCount, setResolvedCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const loadAlerts = useCallback(async (manual = false) => {
    if (typeof window === "undefined") return
    if (manual === true) setIsSyncing(true)

    const isWiped = localStorage.getItem('all_data_wiped') === 'true'
    let sampleOverrides: Record<string, any> = {}
    try {
      const ov = localStorage.getItem('local_sample_overrides')
      if (ov) sampleOverrides = JSON.parse(ov)
    } catch (e) {}

    const sampleMap = new Map<string, any>()
    const wasteMap = new Map<string, any>()
    const planMap = new Map<string, any>()

    if (!isWiped) {
      try {
        const localRecs = JSON.parse(localStorage.getItem('local_receptions_history') || '[]')
        if (Array.isArray(localRecs)) {
          localRecs.forEach((r: any) => {
            const sList = Array.isArray(r.samples) ? r.samples : (Array.isArray(r.samples_data) ? r.samples_data : [])
            sList.forEach((s: any, idx: number) => {
              const sid = s.sample_number || s.id || `${r.id}-${idx}`
              const ov = sampleOverrides[sid] || sampleOverrides[s.sample_number] || {}
              sampleMap.set(sid, {
                id: sid,
                sample_number: sid,
                commercial_name: s.commercial_name || "Échantillon",
                batch_number: s.batch_number || "N/A",
                status: ov.status || s.status || "Disponible",
                expiry_date: s.expiry_date || null,
              })
            })
          })
        }
        const localWaste = JSON.parse(localStorage.getItem('waste_batches_custom_v1') || '[]')
        if (Array.isArray(localWaste)) {
          localWaste.forEach((w: any) => {
            const k = w.batch_number || w.id
            if (k) wasteMap.set(k, w)
          })
        }
        const localPlans = JSON.parse(localStorage.getItem('destruction_plans_custom_v1') || '[]')
        if (Array.isArray(localPlans)) {
          localPlans.forEach((p: any) => {
            const k = p.plan_number || p.id
            if (k) planMap.set(k, p)
          })
        }
      } catch (e) {}
    }

    try {
      const supabase = createClient()
      const [sRes, rRes, wRes, dRes] = await Promise.all([
        supabase.from('samples').select('*'),
        supabase.from('receptions').select('*'),
        supabase.from('waste_batches').select('*'),
        supabase.from('destruction_plans').select('*'),
      ])

      if (rRes.data && rRes.data.length > 0) {
        rRes.data.forEach((r: any) => {
          if (Array.isArray(r.samples_data)) {
            r.samples_data.forEach((s: any, idx: number) => {
              const sid = s.sample_number || s.id || `${r.id}-${idx}`
              if (!sampleMap.has(sid)) {
                const ov = sampleOverrides[sid] || {}
                sampleMap.set(sid, {
                  id: sid,
                  sample_number: sid,
                  commercial_name: s.commercial_name || "Échantillon",
                  batch_number: s.batch_number || "N/A",
                  status: ov.status || s.status || "Disponible",
                  expiry_date: s.expiry_date || null,
                })
              }
            })
          }
        })
      }

      if (sRes.data && sRes.data.length > 0) {
        sRes.data.forEach((s: any) => {
          const sid = s.sample_number || s.id
          const ov = sampleOverrides[sid] || sampleOverrides[s.id] || {}
          sampleMap.set(sid, {
            ...s,
            status: ov.status || s.status || "Disponible",
          })
        })
      }

      if (wRes.data && wRes.data.length > 0) {
        wRes.data.forEach((w: any) => {
          const k = w.batch_number || w.id
          if (k) wasteMap.set(k, w)
        })
      }

      if (dRes.data && dRes.data.length > 0) {
        dRes.data.forEach((d: any) => {
          const k = d.plan_number || d.id
          if (k) planMap.set(k, d)
        })
      }
    } catch (err) {
      console.warn("Erreur chargement alertes:", err)
    }

    const allSamples = Array.from(sampleMap.values()).filter(s => s.status !== 'Détruit')
    const allWaste = Array.from(wasteMap.values())
    const allPlans = Array.from(planMap.values())

    const now = Date.now()
    const thirtyDaysLater = now + 30 * 24 * 60 * 60 * 1000
    const nextAlerts: AlertItem[] = []

    const expiredSamples = allSamples.filter(s => s.expiry_date && new Date(s.expiry_date).getTime() < now)
    expiredSamples.slice(0, 10).forEach(s => {
      nextAlerts.push({
        id: `exp-${s.id}`,
        severity: 'critique',
        icon: CalendarX,
        title: `Échantillon périmé : ${s.commercial_name}`,
        description: `Le lot N°${s.batch_number || 'N/A'} est périmé depuis le ${s.expiry_date} et doit être isolé.`,
        time: "Aujourd'hui",
        badgeLabel: 'Péremption',
        href: '/dashboard/samples'
      })
    })

    const expiringSamples = allSamples.filter(s => {
      if (!s.expiry_date) return false
      const t = new Date(s.expiry_date).getTime()
      return t >= now && t <= thirtyDaysLater
    })
    if (expiringSamples.length > 0) {
      nextAlerts.push({
        id: 'expiring-soon',
        severity: 'avertissement',
        icon: CalendarClock,
        title: `${expiringSamples.length} lot(s) arrivent à péremption sous 30 jours`,
        description: 'Veuillez planifier leur réévaluation ou mise en destruction prochaine.',
        time: "Aujourd'hui",
        badgeLabel: 'J-30',
        href: '/dashboard/samples'
      })
    }

    const quarantineSamples = allSamples.filter(s => (s.status || '').toLowerCase().includes('quarantaine'))
    if (quarantineSamples.length > 0) {
      nextAlerts.push({
        id: 'quarantine-active',
        severity: 'critique',
        icon: ShieldAlert,
        title: `${quarantineSamples.length} lot(s) d'échantillons placés en quarantaine`,
        description: 'En attente de libération ou décision du responsable qualité.',
        time: 'En cours',
        badgeLabel: 'Quarantaine',
        href: '/dashboard/samples'
      })
    }

    const pendingWaste = allWaste.filter(w => w.status !== 'Détruit' && w.status !== 'detruit')
    if (pendingWaste.length > 0) {
      nextAlerts.push({
        id: 'waste-pending',
        severity: 'info',
        icon: Trash2,
        title: `${pendingWaste.length} lot(s) de déchets en stockage`,
        description: 'En attente de planification ou d\'exécution de destruction.',
        time: 'En cours',
        badgeLabel: 'Déchets',
        href: '/dashboard/waste'
      })
    }

    const executedPlans = allPlans.filter(p => p.status === 'Exécuté' || p.status === 'execute').length
    setResolvedCount(executedPlans)
    setAlerts(nextAlerts)
    setIsSyncing(false)
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  useRealtimeSync({
    tables: ['samples', 'receptions', 'waste_batches', 'destruction_plans', 'movements'],
    onSync: loadAlerts,
    pollIntervalMs: 4000,
  })

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
        <Button variant="outline" size="sm" onClick={() => loadAlerts(true)} className="h-7 text-xs gap-1">
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
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
              <p className="text-[9px] font-bold uppercase text-muted-foreground">Destructions Exécutées</p>
              <h3 className="text-lg font-black text-foreground">{resolvedCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LISTE DES ALERTES (STATIQUE 1-ÉCRAN) */}
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <Card className="shadow-2xs border border-border/70 rounded-xl bg-card p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-bold text-foreground">Aucune alerte active</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Tous les indicateurs et stocks sont conformes aux exigences réglementaires.</p>
          </Card>
        ) : (
          alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        )}
      </div>

    </div>
  )
}

