"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BellRing, AlertTriangle, Clock, CalendarX, FileWarning, CheckCircle2 } from "lucide-react"

export default function AlertsPage() {
  const alerts = [
    { title: "Expiration imminente", desc: "12 lots de vaccins anti-rabique expirent dans moins de 15 jours.", type: "critique", icon: CalendarX, time: "Il y a 2h" },
    { title: "Documents manquants", desc: "Le lot #X928 (Paracétamol) a été réceptionné sans certificat d'analyse.", type: "avertissement", icon: FileWarning, time: "Il y a 5h" },
    { title: "Écart d'inventaire", desc: "Une différence de 5 unités a été signalée dans la Zone A.", type: "critique", icon: AlertTriangle, time: "Hier" },
    { title: "Validation en attente", desc: "La destruction du lot #P001 nécessite la signature de l'Administrateur.", type: "info", icon: Clock, time: "Hier" },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Centre d'Alertes</h2>
          <p className="text-muted-foreground text-sm">Surveillance des anomalies et des échéances critiques.</p>
        </div>
        <Button variant="outline" className="shadow-sm"><CheckCircle2 className="mr-2 h-4 w-4" /> Tout marquer comme lu</Button>
      </div>

      <div className="grid gap-4">
        {alerts.map((alert, i) => (
          <Card key={i} className={`shadow-sm border-l-4 ${alert.type === 'critique' ? 'border-l-destructive' : alert.type === 'avertissement' ? 'border-l-warning' : 'border-l-primary'} border-y-border/50 border-r-border/50`}>
            <CardContent className="p-4 sm:p-6 flex items-start gap-4">
              <div className={`p-3 rounded-full shrink-0 ${alert.type === 'critique' ? 'bg-destructive/10 text-destructive' : alert.type === 'avertissement' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                <alert.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-foreground text-base">{alert.title}</h3>
                  <span className="text-xs text-muted-foreground font-medium">{alert.time}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{alert.desc}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant={alert.type === 'critique' ? 'destructive' : 'default'} className={alert.type === 'avertissement' ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : ''}>
                    Résoudre
                  </Button>
                  <Button size="sm" variant="outline">Détails</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
