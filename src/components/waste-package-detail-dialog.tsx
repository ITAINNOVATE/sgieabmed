"use client"

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Package, Boxes, Scale, MapPin, Printer, Download, 
  Trash2, Layers, CheckCircle2, Calendar, FileText, ArrowLeftRight 
} from "lucide-react"
import { GroupedWastePackage } from "./waste-grouping-dialog"

export interface WastePackageDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pkg: GroupedWastePackage | null
  onPrintLabel: (pkg: GroupedWastePackage) => void
  onUngroup: (pkg: GroupedWastePackage) => void
  onAssignLocation: (pkg: GroupedWastePackage) => void
}

export function WastePackageDetailDialog({
  open,
  onOpenChange,
  pkg,
  onPrintLabel,
  onUngroup,
  onAssignLocation
}: WastePackageDetailDialogProps) {
  if (!pkg) return null

  const items = pkg.items || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-red-600/10 text-red-600">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-black tracking-tight font-mono">
                    {pkg.package_number}
                  </DialogTitle>
                  <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200 font-bold">
                    Colis Groupé
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {pkg.package_name} • {pkg.package_type}
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 border-emerald-200 font-bold w-fit">
              ● {pkg.status || "En stock"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* CARTES RÉCAPITULATIVES DU COLIS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-muted/30 border border-border/60 rounded-xl">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Poids Total</span>
              <div className="text-lg font-black text-foreground mt-0.5">{pkg.total_weight} <span className="text-xs font-normal text-muted-foreground">{pkg.unit || "Kg"}</span></div>
            </div>

            <div className="p-3 bg-muted/30 border border-border/60 rounded-xl">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Contenu</span>
              <div className="text-lg font-black text-foreground mt-0.5">{items.length} <span className="text-xs font-normal text-muted-foreground">lot(s)</span></div>
            </div>

            <div className="p-3 bg-muted/30 border border-border/60 rounded-xl">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Emplacement</span>
              <div className="text-xs font-bold text-foreground mt-1 truncate" title={pkg.current_location}>
                {pkg.current_location || "Local Déchets Central"}
              </div>
            </div>

            <div className="p-3 bg-muted/30 border border-border/60 rounded-xl">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Date de création</span>
              <div className="text-xs font-bold text-foreground mt-1">
                {pkg.created_at ? new Date(pkg.created_at).toLocaleDateString("fr-FR") : "Récent"}
              </div>
            </div>
          </div>

          {pkg.observations && (
            <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs text-amber-900">
              <span className="font-bold">Observations : </span>
              {pkg.observations}
            </div>
          )}

          {/* TABLEAU DES ARTICLES / SOUS-LOTS INCLUS DANS LE COLIS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-red-600" /> Composition détaillée du colis ({items.length} lots)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Lots de déchets physiquement emballés dans ce sac/fût
              </span>
            </div>

            <div className="border border-border/70 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b text-[10px] uppercase font-bold text-muted-foreground sticky top-0">
                  <tr>
                    <th className="p-2.5">N° Lot Déchet</th>
                    <th className="p-2.5">Désignation & Classification</th>
                    <th className="p-2.5">Provenance</th>
                    <th className="p-2.5 text-right">Quantité / Poids</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-muted/20">
                      <td className="p-2.5 font-mono font-bold text-red-700 dark:text-red-400">
                        {item.batch_number}
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-foreground">{item.commercial_name || item.waste_type}</div>
                        <div className="text-[10px] text-muted-foreground">{item.waste_type} • Lot orig: {item.original_batch || "—"}</div>
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        <div>{item.source_structure || "Interne ABMed"}</div>
                        {item.depositor_name && <div className="text-[10px]">Apporteur: {item.depositor_name}</div>}
                      </td>
                      <td className="p-2.5 font-bold text-right tabular-nums text-foreground">
                        {item.quantity} {item.unit || "Kg"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUngroup(pkg)}
            className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer w-full sm:w-auto"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Dégrouper le colis (Dissocier les lots)
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAssignLocation(pkg)}
              className="text-xs cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Changer Emplacement
            </Button>

            <Button
              size="sm"
              onClick={() => onPrintLabel(pkg)}
              className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimer Fiche A4 Placard
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
