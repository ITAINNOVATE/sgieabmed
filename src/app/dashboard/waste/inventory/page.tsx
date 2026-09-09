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
import { ClipboardCheck, AlertTriangle, CheckCircle2, Search, Trash2, Plus, Eye, Printer, MapPin, Scale } from "lucide-react"
import { toast } from "sonner"

const MOCK_WASTE_INVENTORIES = [
  { id: '1', inv_number: 'INV-W-2026-001', date: '2026-01-15T08:00:00.000Z', location: 'Local Déchets A1', system_weight: 150, physical_weight: 148, diff: -2, status: 'Validé avec écart', items_count: 12, controller: 'Marie ADANDE', observations: 'Évaporation constatée sur 2 fûts de solvants HPLC mal refermés.' },
  { id: '2', inv_number: 'INV-W-2026-002', date: '2026-02-10T10:30:00.000Z', location: 'Zone Quarantaine C2', system_weight: 45, physical_weight: 45, diff: 0, status: 'Validé', items_count: 5, controller: 'Marie ADANDE', observations: 'Conforme. Étiquetage QR code vérifié.' },
  { id: '3', inv_number: 'INV-W-2026-003', date: '2026-03-01T09:00:00.000Z', location: 'Local DASRI B', system_weight: 230, physical_weight: 230, diff: 0, status: 'Validé', items_count: 18, controller: 'Marie ADANDE', observations: 'Sacs jaunes DASRI conformes aux normes de biosécurité.' },
  { id: '4', inv_number: 'INV-W-2026-004', date: '2026-03-20T14:15:00.000Z', location: 'Local Déchets A2', system_weight: 92, physical_weight: 90, diff: -2, status: 'En cours', items_count: 8, controller: 'Marie ADANDE', observations: 'Comptage physique en cours de consolidation par les équipes logistiques.' },
]

export default function WasteInventoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedInventory, setSelectedInventory] = useState<any>(null)
  const [isNewInventoryOpen, setIsNewInventoryOpen] = useState(false)

  const isWiped = typeof window !== 'undefined' && localStorage.getItem('all_data_wiped') === 'true'
  const list = isWiped ? [] : MOCK_WASTE_INVENTORIES

  const filteredInventories = list.filter(inv => {
    const matchesSearch = 
      inv.inv_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.location.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-red-600" />
            Inventaires & Contrôles des Déchets
          </h2>
          <p className="text-muted-foreground text-xs">Contrôle périodique des masses, contenants et décompte des lots du local déchet.</p>
        </div>
        <Button 
          size="sm" 
          onClick={() => setIsNewInventoryOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white shadow-2xs text-xs font-bold gap-1.5 h-8 px-3 border-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Lancer un inventaire déchet
        </Button>
      </div>

      {/* KPI METRIQUES INVENTAIRES DÉCHETS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-red-500/10 p-2 rounded-lg"><ClipboardCheck className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inventaires Déchets 2026</p>
              <h3 className="text-xl font-black text-foreground">4 Réalisés</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Taux de Conformité Masse</p>
              <h3 className="text-xl font-black text-foreground">98.8%</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Écarts Relevés (Pertes/Séchage)</p>
              <h3 className="text-xl font-black text-foreground">-4 Kg Total</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLEAU DES INVENTAIRES DÉCHETS (COMPACT 1-ÉCRAN) */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sessions d'Inventaires des Déchets ({filteredInventories.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par N°, zone..."
                  className="pl-8 bg-background h-8 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="h-8 w-36 text-xs bg-background">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="Validé">Validé</SelectItem>
                  <SelectItem value="Validé avec écart">Validé avec écart</SelectItem>
                  <SelectItem value="En cours">En cours</SelectItem>
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
                  <TableHead className="py-2 text-[11px] font-bold uppercase pl-4">N° Inventaire Déchet</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Date</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Zone Stockage Déchet</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Masse Système</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Masse Pesée</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right">Écart Masse</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Statut</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventories.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-16 text-center text-xs text-muted-foreground">Aucune session d'inventaire trouvée.</TableCell></TableRow>
                ) : (
                  filteredInventories.map((inv) => (
                    <TableRow key={inv.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="pl-4 font-bold text-foreground font-mono py-2">{inv.inv_number}</TableCell>
                      <TableCell className="py-2 text-muted-foreground">{new Date(inv.date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="py-2 font-semibold">{inv.location}</TableCell>
                      <TableCell className="py-2 text-right tabular-nums font-medium">{inv.system_weight} Kg</TableCell>
                      <TableCell className="py-2 text-right tabular-nums font-medium">{inv.physical_weight} Kg</TableCell>
                      <TableCell className="py-2 text-right tabular-nums font-bold">
                        <span className={inv.diff === 0 ? "text-emerald-700" : "text-red-600"}>
                          {inv.diff > 0 ? `+${inv.diff}` : inv.diff} Kg
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge className={`text-[10px] ${
                          inv.status === 'Validé' ? 'bg-emerald-100 text-emerald-800' :
                          inv.status === 'Validé avec écart' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right pr-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedInventory(inv)}
                          className="h-7 text-xs px-2 text-red-600 font-bold hover:bg-red-50 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Détail
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

      {/* DIALOG DÉTAIL D'UNE SESSION D'INVENTAIRE DÉCHET */}
      <Dialog open={!!selectedInventory} onOpenChange={(open) => !open && setSelectedInventory(null)}>
        <DialogContent className="max-w-2xl bg-card border-border/70 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <ClipboardCheck className="h-5 w-5 text-red-600" />
              Rapport de Contrôle d'Inventaire — {selectedInventory?.inv_number}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Vérification physique des contenants, pesée contradictoire et conformité du local déchet.
            </DialogDescription>
          </DialogHeader>

          {selectedInventory && (
            <div className="space-y-4 pt-3 border-t border-border/50 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/40 p-3 rounded-xl border border-border/50">
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Date Session</span>
                  <span className="font-semibold text-foreground">{new Date(selectedInventory.date).toLocaleDateString("fr-FR")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Zone Inspectée</span>
                  <span className="font-semibold text-foreground">{selectedInventory.location}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Contenants Vérifiés</span>
                  <span className="font-bold text-foreground">{selectedInventory.items_count} fûts/bacs</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">Opérateur Contrôle</span>
                  <span className="font-semibold text-foreground">{selectedInventory.controller || 'Marie ADANDE'}</span>
                </div>
              </div>

              {/* BILAN DE LA PESÉE */}
              <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-2">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 uppercase">
                  <Scale className="h-4 w-4 text-primary" /> Bilan Comparatif des Pesées
                </span>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <span className="text-[10px] text-muted-foreground block">Masse Théorique (Système)</span>
                    <span className="text-base font-bold text-foreground">{selectedInventory.system_weight} Kg</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <span className="text-[10px] text-muted-foreground block">Masse Réelle Pesée</span>
                    <span className="text-base font-bold text-foreground">{selectedInventory.physical_weight} Kg</span>
                  </div>
                  <div className={`p-2 rounded-lg ${selectedInventory.diff === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                    <span className="text-[10px] block opacity-80">Écart Détecté</span>
                    <span className="text-base font-black">
                      {selectedInventory.diff > 0 ? `+${selectedInventory.diff}` : selectedInventory.diff} Kg
                    </span>
                  </div>
                </div>
              </div>

              {selectedInventory.observations && (
                <div className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-1">
                  <span className="font-bold text-foreground block">Observations & Constats d'audit :</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{selectedInventory.observations}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedInventory(null)}>Fermer</Button>
                <Button size="sm" onClick={() => window.print()} className="bg-red-600 hover:bg-red-700 text-white gap-1.5">
                  <Printer className="h-3.5 w-3.5" /> Imprimer le rapport
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG NOUVELLE SESSION D'INVENTAIRE */}
      <Dialog open={isNewInventoryOpen} onOpenChange={setIsNewInventoryOpen}>
        <DialogContent className="max-w-md bg-card border-border/70 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Plus className="h-4 w-4 text-red-600" />
              Démarrer un Contrôle d'Inventaire Déchets
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Initialise une feuille de comptage et de pesée contradictoire pour le local déchet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="text-[11px] font-bold block mb-1">Zone de stockage à contrôler</label>
              <Select defaultValue="Local Déchets A1">
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Choisir la zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Local Déchets A1">Local Déchets A1</SelectItem>
                  <SelectItem value="Local Déchets A2">Local Déchets A2</SelectItem>
                  <SelectItem value="Zone Quarantaine C2">Zone Quarantaine C2</SelectItem>
                  <SelectItem value="Local DASRI B">Local DASRI B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">Responsable du contrôle</label>
              <Input defaultValue="Marie ADANDE" disabled className="h-8 text-xs bg-muted/50 font-medium" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsNewInventoryOpen(false)}>Annuler</Button>
              <Button size="sm" onClick={() => {
                toast.success("Session d'inventaire déchet initialisée avec succès !")
                setIsNewInventoryOpen(false)
              }} className="bg-red-600 hover:bg-red-700 text-white">
                Valider & Générer la feuille
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
