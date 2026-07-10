"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { BarChart3, Download, FileText, FileSpreadsheet, Settings2 } from "lucide-react"

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Générateur de Rapports</h2>
        <p className="text-muted-foreground text-sm">Créez et exportez des rapports d'activité sur mesure.</p>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="bg-muted/20 pb-4 border-b border-border/50">
          <CardTitle className="text-base flex items-center"><Settings2 className="mr-2 h-5 w-5 text-primary" /> Configuration du Rapport</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Type de Rapport</Label>
              <Select defaultValue="etat_stock">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="etat_stock">État complet du stock</SelectItem>
                  <SelectItem value="mouvements">Historique des mouvements</SelectItem>
                  <SelectItem value="destructions">Rapport de destruction</SelectItem>
                  <SelectItem value="peremptions">Produits expirant bientôt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Période d'analyse</Label>
              <Select defaultValue="ce_mois">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7j">7 derniers jours</SelectItem>
                  <SelectItem value="ce_mois">Ce mois-ci</SelectItem>
                  <SelectItem value="trimestre">Ce trimestre</SelectItem>
                  <SelectItem value="annee">Cette année</SelectItem>
                  <SelectItem value="custom">Période personnalisée...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filtre par Laboratoire</Label>
              <Select defaultValue="tous">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les laboratoires</SelectItem>
                  <SelectItem value="sanofi">Sanofi Aventis</SelectItem>
                  <SelectItem value="pfizer">Pfizer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filtre par Catégorie</Label>
              <Select defaultValue="toutes">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">Toutes les catégories</SelectItem>
                  <SelectItem value="antibio">Antibiotiques</SelectItem>
                  <SelectItem value="vaccins">Vaccins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row justify-end gap-3">
            <Button variant="outline" className="shadow-sm"><FileSpreadsheet className="mr-2 h-4 w-4" /> Exporter en Excel</Button>
            <Button variant="outline" className="shadow-sm"><Download className="mr-2 h-4 w-4" /> Exporter en CSV</Button>
            <Button className="shadow-sm"><FileText className="mr-2 h-4 w-4" /> Générer PDF Officiel</Button>
          </div>

        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-border/50 bg-muted/10">
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h3 className="font-medium text-foreground">Aperçu indisponible</h3>
            <p className="text-sm text-muted-foreground mt-1">Générez un rapport pour afficher un aperçu des données.</p>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
