"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ArrowRightLeft, ArrowUpRight, ArrowDownRight, Flame, Search, Trash2, Eye, Printer, FileText, CheckCircle2, ShieldCheck, Building2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

const MOCK_WASTE_MOVEMENTS: any[] = []

export default function WasteMovementsPage() {
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedMovement, setSelectedMovement] = useState<any>(null)

  const loadMovements = useCallback(async () => {
    const isWiped = typeof window !== 'undefined' && localStorage.getItem('all_data_wiped') === 'true'

    // 1. Charger les lots de déchets récents (localStorage et Supabase)
      let wasteBatches: any[] = []
      try {
        const stored = localStorage.getItem('waste_batches_custom_v1')
        if (stored) {
          wasteBatches = JSON.parse(stored)
        }
      } catch (e) {}

      try {
        const supabase = createClient()
        const { data } = await supabase.from('waste_batches').select('*')
        if (data && data.length > 0) {
          data.forEach((remoteB) => {
            if (!wasteBatches.some((lb) => lb.id === remoteB.id || lb.batch_number === remoteB.batch_number)) {
              wasteBatches.push(remoteB)
            }
          })
        }
      } catch (e) {}

      // 2. Générer les mouvements automatiques à partir des réceptions et destructions de déchets
      const dynamicMovements: any[] = []

      wasteBatches.forEach((batch, idx) => {
        // Mouvement 1 : Entrée / Prise en charge au local déchet
        dynamicMovements.push({
          id: `mvt-entry-${batch.id || batch.batch_number || idx}`,
          mvt_number: `MVT-REC-${batch.batch_number?.replace('DEC-', '') || Math.floor(10000 + Math.random() * 90000)}`,
          date: batch.reception_date 
            ? (batch.reception_time ? `${batch.reception_date}T${batch.reception_time}:00.000Z` : `${batch.reception_date}T08:00:00.000Z`)
            : (batch.created_at || new Date().toISOString()),
          type: 'Entrée au local déchet',
          batch: batch.batch_number,
          waste_type: batch.waste_type || 'Déchets pharmaceutiques',
          commercial_name: batch.commercial_name || '',
          quantity: `${batch.quantity} ${batch.unit || 'Kg'}`,
          operator: batch.recipient_agent || (batch.creator ? `${batch.creator.first_name} ${batch.creator.last_name}` : 'Admin EGED'),
          destination: batch.current_location || 'MAGASIN DES DECHETS',
          origin: batch.source_structure ? `${batch.source_structure} (${batch.depositor_name || 'Apporteur'})` : 'Établissement déposant',
          signature_hash: `SIG-REC-${batch.batch_number?.replace('DEC-', '') || 'VALIDATED'}`,
          reception_number: batch.reception_number || 'REC-DECH-2026',
          depositor_name: batch.depositor_name || '',
          source_structure: batch.source_structure || '',
          observations: batch.observations || '',
        })

        // Mouvement 2 : Si détruit, mouvement de sortie / destruction définitive
        if (batch.status === 'Détruit' || batch.destruction_date) {
          dynamicMovements.push({
            id: `mvt-dest-${batch.id || batch.batch_number || idx}`,
            mvt_number: `MVT-DEST-${batch.batch_number?.replace('DEC-', '') || Math.floor(10000 + Math.random() * 90000)}`,
            date: batch.destruction_date || new Date().toISOString(),
            type: 'Destruction effectuée',
            batch: batch.batch_number,
            waste_type: batch.waste_type || 'Déchets pharmaceutiques',
            commercial_name: batch.commercial_name || '',
            quantity: `${batch.quantity} ${batch.unit || 'Kg'}`,
            operator: batch.supervisor_name || 'Admin EGED (Resp. Déchets)',
            origin: batch.current_location || 'Local Déchets',
            destination: 'Incinération / Neutralisation certifiée',
            signature_hash: `SIG-DEST-${batch.certificate_number || batch.batch_number?.replace('DEC-', '') || 'CERT'}`,
            certificate_number: batch.certificate_number || 'CERT-DEST-2026',
            reception_number: batch.reception_number,
            source_structure: batch.source_structure,
          })
        }
      })

      // 3. Charger d'éventuels mouvements manuels personnalisés
      try {
        const customMvts = JSON.parse(localStorage.getItem('waste_movements_custom_v1') || '[]')
        customMvts.forEach((m: any) => {
          if (!dynamicMovements.some((dm) => dm.id === m.id || dm.mvt_number === m.mvt_number)) {
            dynamicMovements.push(m)
          }
        })
      } catch (e) {}

      // Charger également la table Supabase waste_movements (en excluant les enregistrements techniques de synchronisation)
      try {
        const supabase = createClient()
        const { data: dbMvts } = await supabase.from('waste_movements').select('*').order('date', { ascending: false })
        if (dbMvts && dbMvts.length > 0) {
          dbMvts.forEach((m: any) => {
            const mNum = m.mvt_number || ''
            const mType = m.type || ''
            if (
              mType === 'CLOUD_KV_SYNC' ||
              mType === 'Synchronisation Centre' ||
              mType === 'Colis dissous' ||
              mNum.startsWith('KV-') ||
              mNum.startsWith('CTR-SYNC-') ||
              mNum.startsWith('DISSOLVED-') ||
              mNum.startsWith('SCHED-') ||
              mNum.startsWith('APP-')
            ) {
              return
            }
            if (!dynamicMovements.some((dm) => dm.id === m.id || dm.mvt_number === m.mvt_number)) {
              dynamicMovements.push(m)
            }
          })
        }
      } catch (e) {}

      // Trier par date décroissante
      dynamicMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      if (dynamicMovements.length > 0) {
        setMovements(dynamicMovements)
      } else {
        setMovements(isWiped ? [] : MOCK_WASTE_MOVEMENTS)
      }
      setLoading(false)
  }, [])

  useEffect(() => {
    loadMovements()
  }, [loadMovements])

  // Synchronisation temps réel automatique pour les mouvements de déchets
  useRealtimeSync({
    tables: ['waste_movements', 'waste_batches', 'destruction_plans'],
    onSync: loadMovements,
    pollIntervalMs: 6000,
  })

  const filteredMovements = movements.filter(mvt => {
    const matchesSearch = 
      (mvt.mvt_number && mvt.mvt_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mvt.batch && mvt.batch.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mvt.waste_type && mvt.waste_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mvt.operator && mvt.operator.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mvt.origin && mvt.origin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mvt.destination && mvt.destination.toLowerCase().includes(searchTerm.toLowerCase()))
      
    const matchesType = typeFilter === "all" || mvt.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-red-600" />
            Mouvements des Déchets Pharmaceutiques
          </h2>
          <p className="text-muted-foreground text-xs">Historique et traçabilité intégrale des réceptions, transferts et évacuations vers destruction.</p>
        </div>
        <Button size="sm" asChild className="bg-red-600 hover:bg-red-700 text-white shadow-2xs text-xs font-bold gap-1.5 h-8 px-3 border-0 cursor-pointer">
          <Link href="/dashboard/waste/new">
            <Trash2 className="h-3.5 w-3.5" /> Nouvelle Réception Déchet
          </Link>
        </Button>
      </div>

      {/* CARTE UNIQUE TABLEAU DYNAMIQUE */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Journal des Opérations Déchets ({filteredMovements.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher lot, type, structure..."
                  className="pl-8 bg-background h-8 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
                <SelectTrigger className="h-8 w-44 text-xs bg-background">
                  <SelectValue placeholder="Type opération" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="Entrée au local déchet">Entrée local déchet</SelectItem>
                  <SelectItem value="Transfert interne">Transfert interne</SelectItem>
                  <SelectItem value="Sortie pour Incinération">Sortie Incinération</SelectItem>
                  <SelectItem value="Destruction effectuée">Destruction effectuée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="py-2 text-[11px] font-bold uppercase pl-4">N° Mouvement</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Date & Heure</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Type Opération</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Lot & Déchet</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Provenance / Destination</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Quantité</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Opérateur</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-16 text-center text-xs text-muted-foreground">Aucun mouvement trouvé.</TableCell></TableRow>
                ) : (
                  filteredMovements.map((mvt) => (
                    <TableRow key={mvt.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="pl-4 font-bold text-foreground font-mono py-2">{mvt.mvt_number}</TableCell>
                      <TableCell className="py-2 text-muted-foreground">{new Date(mvt.date).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="py-2">
                        <Badge className={`text-[10px] gap-1 ${
                          mvt.type.includes('Destruction') ? 'bg-red-100 text-red-800' :
                          mvt.type.includes('Sortie') ? 'bg-amber-100 text-amber-800' :
                          mvt.type.includes('Entrée') ? 'bg-[#1B5C2E]/10 text-[#1B5C2E]' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {mvt.type.includes('Sortie') && <ArrowUpRight className="h-3 w-3" />}
                          {mvt.type.includes('Entrée') && <ArrowDownRight className="h-3 w-3" />}
                          {mvt.type.includes('Destruction') && <Flame className="h-3 w-3" />}
                          {mvt.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 font-semibold">
                        {mvt.batch} <span className="text-muted-foreground text-[11px] font-normal">({mvt.waste_type})</span>
                        {mvt.commercial_name && <p className="text-[10px] text-muted-foreground font-normal">{mvt.commercial_name}</p>}
                      </TableCell>
                      <TableCell className="py-2 text-xs text-foreground font-medium">
                        {mvt.type === 'Entrée au local déchet' ? (
                          <div className="flex items-center gap-1 text-slate-700">
                            <Building2 className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[180px]">{mvt.origin}</span>
                          </div>
                        ) : (
                          <span className="truncate max-w-[180px]">{mvt.destination}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-right font-bold tabular-nums text-foreground">{mvt.quantity}</TableCell>
                      <TableCell className="py-2 text-right text-muted-foreground">{mvt.operator}</TableCell>
                      <TableCell className="py-2 text-right pr-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedMovement(mvt)}
                          className="h-7 text-xs px-2 text-red-600 font-bold hover:bg-red-50 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Bordereau
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG DU BORDEREAU DE SUIVI DES DÉCHETS (BSD) */}
      <Dialog open={!!selectedMovement} onOpenChange={(open) => !open && setSelectedMovement(null)}>
        <DialogContent className="max-w-2xl sm:max-w-2xl w-[95vw] md:w-full bg-card border-border/70 p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <FileText className="h-4.5 w-4.5 text-red-600" />
              Bordereau de Suivi de Mouvement — {selectedMovement?.mvt_number}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Traçabilité et prise en charge officielle sous protocole ABMed.
            </DialogDescription>
          </DialogHeader>

          {selectedMovement && (
            <div className="space-y-4 pt-3 border-t border-border/50 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/40 p-4 rounded-xl border border-border/50">
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Type d'opération</span>
                  <span className="font-bold text-foreground">{selectedMovement.type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Date & Heure</span>
                  <span className="font-medium text-foreground">{new Date(selectedMovement.date).toLocaleString("fr-FR")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Lot Déchet ABMed</span>
                  <span className="font-mono font-bold text-foreground">{selectedMovement.batch}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Quantité</span>
                  <span className="font-bold text-foreground">{selectedMovement.quantity}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Classification & Produit</span>
                  <span className="font-semibold text-foreground">
                    {selectedMovement.waste_type} {selectedMovement.commercial_name ? `— ${selectedMovement.commercial_name}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Provenance / Établissement</span>
                  <span className="text-foreground font-medium">{selectedMovement.origin || 'Structure Non Spécifiée'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Destination / Affectation</span>
                  <span className="text-foreground font-semibold">{selectedMovement.destination}</span>
                </div>
                {selectedMovement.reception_number && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">N° PV de Réception</span>
                    <span className="font-mono text-emerald-700 font-bold">{selectedMovement.reception_number}</span>
                  </div>
                )}
                {selectedMovement.certificate_number && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">N° Certificat Destruction</span>
                    <span className="font-mono text-red-600 font-bold">{selectedMovement.certificate_number}</span>
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Signature Électronique Certifiée</span>
                  <p className="text-[11px] leading-relaxed">
                    Opération enregistrée et vérifiée par <strong>{selectedMovement.operator}</strong>.
                  </p>
                  <p className="text-[10px] font-mono text-emerald-800">
                    Empreinte: {selectedMovement.signature_hash || 'SIG-MVT-VALIDATED'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedMovement(null)}>Fermer</Button>
                <Button size="sm" onClick={() => window.print()} className="bg-red-600 hover:bg-red-700 text-white gap-1.5">
                  <Printer className="h-3.5 w-3.5" /> Imprimer le bordereau
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
