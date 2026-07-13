import { supabase } from "@/lib/supabase"
import AuditClient from "./AuditClient"

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  const { data: dbLogs } = await supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      entity_type,
      ip_address,
      created_at,
      users ( first_name, last_name, role )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  // Mock data si la table est vide pour démonstration
  const logs = dbLogs?.length ? dbLogs : [
    { id: '1', action: 'Connexion', entity_type: 'Système', ip_address: '192.168.1.45', created_at: new Date().toISOString(), users: { first_name: 'Kadia', last_name: 'Barry', role: 'Administrateur' } },
    { id: '2', action: 'Création', entity_type: 'Échantillon ECH-2026-004', ip_address: '192.168.1.12', created_at: new Date(Date.now() - 3600000).toISOString(), users: { first_name: 'Moussa', last_name: 'Traoré', role: 'Responsable' } },
    { id: '3', action: 'Suppression', entity_type: 'Document V1.pdf', ip_address: '10.0.0.5', created_at: new Date(Date.now() - 7200000).toISOString(), users: { first_name: 'Kadia', last_name: 'Barry', role: 'Administrateur' } },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Journal d'Audit</h2>
        <p className="text-muted-foreground mt-1">Traçabilité complète des actions effectuées sur la plateforme.</p>
      </div>

      <AuditClient initialLogs={logs} />
    </div>
  )
}
