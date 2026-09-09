"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ArrowRightLeft, ArrowUpRight, ArrowDownRight, Flame, Search, Trash2, Eye, Printer, FileText, CheckCircle2, ShieldCheck } from "lucide-react"

const MOCK_WASTE_MOVEMENTS = [
  { id: '1', mvt_number: 'MVT-W-2026-001', date: '2026-01-20T14:30:00.000Z', type: 'Entrée au local déchet', batch: 'DEC-2026-73355', waste_type: 'Médicaments périmés', quantity: '150 Kg', operator: 'Jean DUPONT', destination: 'Local Déchets A1', origin: 'Quarantaine Échantillons', signature_hash: 'SIG-MVT-8821A' },
  { id: '2', mvt_number: 'MVT-W-2026-002', date: '2026-02-12T16:00:00.000Z', type: 'Transfert interne', batch: 'DEC-2026-88120', waste_type: 'Produits chimiques dangereux', quantity: '45 L', operator: 'Marie ADANDE', destination: 'Zone Quarantaine C2', origin: 'Laboratoire Contrôle Qualité', signature_hash: 'SIG-MVT-4412B' },
  { id: '3', mvt_number: 'MVT-W-2026-003', date: '2026-03-05T10:15:00.000Z', type: 'Sortie pour Incinération', batch: 'DEC-2026-11409', waste_type: 'Déchets infectieux (DASRI)', quantity: '230 Kg', operator: 'Chantal HOUENOU', destination: 'Centre d\'Incinération', origin: 'Local DASRI B', signature_hash: 'SIG-MVT-9920C' },
  { id: '4', mvt_number: 'MVT-W-2026-004', date: '2026-03-18T11:45:00.000Z', type: 'Entrée au local déchet', batch: 'DEC-2026-99201', waste_type: 'Flacons cassés', quantity: '12 Kg', operator: 'Jean DUPONT', destination: 'Local Déchets A2', origin: 'Magasin Central', signature_hash: 'SIG-MVT-1149D' },
  { id: '5', mvt_number: 'MVT-W-2026-005', date: '2026-03-25T15:00:00.000Z', type: 'Destruction effectuée', batch: 'DEC-2026-44021', waste_type: 'Emballages souillés', quantity: '80 Kg', operator: 'Paul AGOSSA', destination: 'Fosse Spécialisée', origin: 'Local Déchets A1', signature_hash: 'SIG-MVT-3301E' },
]

export default function WasteMovementsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedMovement, setSelectedMovement] = useState<any>(null)

  const filteredMovements = MOCK_WASTE_MOVEMENTS.filter(mvt => {
    const matchesSearch = 
      mvt.mvt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mvt.batch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mvt.waste_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mvt.operator.toLowerCase().includes(searchTerm.toLowerCase())
      
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
          <p className="text-muted-foreground text-xs">Historique et traçabilité des transferts, entrées et évacuations vers destruction.</p>
        </div>
      </div>

      {/* CARTE UNIQUE TABLEAU STATIQUE 1-ÉCRAN */}
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
                  placeholder="Rechercher lot, type, N°..."
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
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Quantité</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Opérateur</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-16 text-center text-xs text-muted-foreground">Aucun mouvement trouvé.</TableCell></TableRow>
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
                      </TableCell>
                      <TableCell className="py-2 text-right font-bold tabular-nums">{mvt.quantity}</TableCell>
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
        <DialogContent className="max-w-xl bg-card border-border/70 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <FileText className="h-4.5 w-4.5 text-red-600" />
              Bordereau de Suivi de Mouvement — {selectedMovement?.mvt_number}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Traçabilité du déplacement et transfert interne/externe sous protocole ABMed.
            </DialogDescription>
          </DialogHeader>

          {selectedMovement && (
            <div className="space-y-4 pt-3 border-t border-border/50 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl border border-border/50">
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Type d'opération</span>
                  <span className="font-bold text-foreground">{selectedMovement.type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Date & Heure</span>
                  <span className="font-medium text-foreground">{new Date(selectedMovement.date).toLocaleString("fr-FR")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Lot Déchet</span>
                  <span className="font-mono font-bold text-foreground">{selectedMovement.batch}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Quantité Transférée</span>
                  <span className="font-bold text-foreground">{selectedMovement.quantity}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Zone d'Origine</span>
                  <span className="text-foreground">{selectedMovement.origin || 'Stock Déchet Central'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Zone de Destination</span>
                  <span className="text-foreground font-semibold">{selectedMovement.destination}</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Signature Électronique Certifiée</span>
                  <p className="text-[11px] leading-relaxed">
                    Opération exécutée et signée par <strong>{selectedMovement.operator}</strong>.
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
